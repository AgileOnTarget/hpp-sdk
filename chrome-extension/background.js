/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Agile On Target LLC
 *
 * This file is part of the Human Presence Protocol SDK
 * (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
 * License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
 * PATENT-POLICY.md for the scope of the patent grant. All trademarks
 * and patent rights reserved by Agile On Target LLC
 * (USPTO Customer No. 224891).
 */

/**
 * background.js
 * HPP Service Worker — central protocol orchestrator.
 *
 * Responsibilities:
 *   - Fetch and verify server-authoritative challenges
 *   - Receive WebAuthn assertions from content script
 *   - Submit assertions to HPP Attestation Server for countersigning
 *   - Verify returned hpp_server_sig before session issuance (INV-security)
 *   - Store Presence Certificates in chrome.storage.session only (INV-4)
 *   - Relay certificates to relying party backend (never to the page)
 *   - Enforce callbackUrl origin policy before relay
 *   - Manage alarm-based certificate expiry and config refresh
 *   - Recover inflight attestations after service worker restart
 *
 * CANONICAL ATTESTATION CONTRACT (v1):
 *
 *   Challenge  → { nonce, rp_id, server_timestamp, window_ms, purpose, server_sig }
 *   Attest req → { cert_id, nonce, rp_id, server_timestamp, client_timestamp,
 *                  credential_id, authenticator_data, assertion_sig, client_data_json }
 *   Certificate← { cert_id, nonce, rp_id, server_timestamp, credential_id,
 *                  authenticator_data, assertion_sig, expiry_ms, status, hpp_server_sig }
 *
 * The nonce binds every certificate to a specific single-use challenge.
 *
 * INTEGRATION MODEL (v1 — programmatic API only):
 *   Sites call HPP.requestPresence() via hpp-api.js.
 *   Form interception is NOT active in production builds.
 *   This extension does not intercept arbitrary forms.
 *
 * Spec references: Sections II, IV, VII.2, IX
 * Security invariants: INV-1 through INV-8
 */

'use strict';

import {
  verifyChallengeSignature,
  verifyServerSignature,
  evaluateChallengeFreshness,
  extractUVFlag,
  computeRpId,
  generateCertId,
} from './lib/hpp-crypto.js';

import {
  getSessionForTab, setSessionForTab, clearSessionForTab, getAllSessions,
  setInflight, getInflight, clearInflight, getAllInflight,
  getEnrolledSites, addEnrolledSite,
  removeEnrolledSiteByOrigin, removeEnrolledSiteByRpId,
  getEnrolledSiteByOrigin, getEnrolledSiteByRpId,
  getSettings, updateSettings,
  getServerConfig, setServerConfig, isServerConfigStale,
  purgeExpiredSessions, purgeStaleInflight,
  getPendingCallbackUrl, setPendingCallbackUrl, clearPendingCallbackUrl,
} from './lib/hpp-storage.js';

import { HPP_ERRORS, getDisplayMessage, isRetryable } from './lib/hpp-errors.js';
import { createLogger } from './lib/hpp-logger.js';

const log = createLogger('background');

// ── Dev mode ──────────────────────────────────────────────────────────────────
// DEV_LOCAL_ENROLLMENT: when true, enrollment is persisted locally even if the
// server registration call fails. Use only with the mock server for experimentation.
// In production builds this MUST be false — split-brain state is a security risk.
const DEV_LOCAL_ENROLLMENT = false;

// ── Server endpoint ───────────────────────────────────────────────────────────
const PROD_SERVER = 'https://attest.humanpresenceprotocol.com';

async function getServerBase() {
  const settings = await getSettings();
  return settings.server_endpoint_override ?? PROD_SERVER;
}

// ── Alarm names ───────────────────────────────────────────────────────────────
const ALARM_EXPIRY_CHECK   = 'hpp-expiry-check';
const ALARM_CONFIG_REFRESH = 'hpp-config-refresh';

// ── Startup and recovery ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  log.info('INSTALLED', { reason });
  await setupAlarms();
  await refreshServerConfig();
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  log.info('STARTUP');
  await setupAlarms();
  await recoverInflight();
  await refreshServerConfig();
});

self.addEventListener('activate', async () => {
  await recoverInflight();
});

async function recoverInflight() {
  const inflight = await getAllInflight();
  for (const [tabId, entry] of Object.entries(inflight)) {
    const ageMs = Date.now() - (entry.started_at ?? 0);
    if (ageMs > 120000) {
      log.info('INFLIGHT_ABANDONED', { tabId, age_ms: ageMs });
      await clearInflight(tabId);
    } else {
      log.info('INFLIGHT_RECOVERING', { tabId });
      try {
        await submitAttestation(parseInt(tabId), entry);
      } catch (e) {
        log.error('INFLIGHT_RECOVERY_FAILED', { tabId, error: e.message });
        await clearInflight(tabId);
      }
    }
  }
  await purgeStaleInflight();
}

async function setupAlarms() {
  await chrome.alarms.clearAll();
  chrome.alarms.create(ALARM_EXPIRY_CHECK,   { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_CONFIG_REFRESH, { periodInMinutes: 5 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_EXPIRY_CHECK)   { await purgeExpiredSessions(); await updateIconForAllTabs(); }
  if (alarm.name === ALARM_CONFIG_REFRESH) { await refreshServerConfig(); }
});

// ── Server config refresh ─────────────────────────────────────────────────────

async function refreshServerConfig() {
  try {
    const base = await getServerBase();
    const res  = await fetch(`${base}/v1/config`, {
      headers: { 'X-HPP-Extension-Version': chrome.runtime.getManifest().version },
    });
    if (!res.ok) throw new Error(`config fetch ${res.status}`);
    const config = await res.json();
    await setServerConfig(config);
    log.debug('CONFIG_REFRESHED', config);
  } catch (e) {
    log.warn('CONFIG_REFRESH_FAILED', { error: e.message });
  }
}

// ── Message handling ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => {
    log.error('MESSAGE_HANDLER_ERROR', { type: msg.type, error: err.message });
    sendResponse({ ok: false, error: 'HPP_SERVER_UNAVAILABLE' });
  });
  return true;
});

async function handleMessage(msg, sender) {
  // Prefer explicit tabId (from popup/options), fall back to sender.tab
  const tabId = msg.tabId ?? sender.tab?.id;

  switch (msg.type) {

    case 'CONTENT_SCRIPT_READY':
      return { ok: true };

    case 'HPP_SITE_DETECTED':
      return await onSiteDetected(msg, tabId);

    case 'VERIFY_PRESENCE':
      return await onVerifyPresence(msg.origin, msg.rpId, tabId);

    case 'ENROLL_REQUEST':
      return await onEnrollRequest(msg.origin, tabId);

    case 'GATE_DISMISSED':
      await updateIconForTab(tabId, 'default');
      return { ok: true };

    case 'GET_SESSION':
      return await onGetSession(tabId);

    case 'REVOKE_SITE':
      return await onRevokeSite(msg.origin);

    case 'GET_ENROLLED_SITES':
      return { ok: true, sites: await getEnrolledSites() };

    case 'GET_SETTINGS':
      return { ok: true, settings: await getSettings() };

    case 'UPDATE_SETTINGS':
      return { ok: true, settings: await updateSettings(msg.settings) };

    default:
      return { ok: false, error: 'UNKNOWN_MESSAGE_TYPE' };
  }
}

// ── Site detected ─────────────────────────────────────────────────────────────

async function onSiteDetected(msg, tabId) {
  const { origin, callbackUrl, siteName } = msg;
  const settings = await getSettings();
  if (!settings.hpp_active) return { ok: true, action: 'HPP_DISABLED' };

  // fix 2.1: resolve relative callbackUrls against page origin before validation
  if (callbackUrl) {
    const validatedCallback = validateCallbackUrl(callbackUrl, origin);
    if (validatedCallback) {
      await setPendingCallbackUrl(origin, validatedCallback);
    } else {
      log.warn('CALLBACK_URL_REJECTED', { callbackUrl, origin });
    }
  }

  const enrolled = await getEnrolledSiteByOrigin(origin);
  if (enrolled) {
    // If the site provides an updated callbackUrl, persist it
    if (callbackUrl) {
      const validated = validateCallbackUrl(callbackUrl, origin);
      if (validated && validated !== enrolled.callbackUrl) {
        await addEnrolledSite({ ...enrolled, callbackUrl: validated });
      }
    }

    const session = await getSessionForTab(tabId);
    if (session && session.expiry_ms > Date.now()) {
      await updateIconForTab(tabId, 'active');
      return { ok: true, action: 'SESSION_ACTIVE' };
    }
    await updateIconForTab(tabId, 'pending');
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_GATE', rp_id: enrolled.rp_id });
    return { ok: true, action: 'GATE_SHOWN' };
  }

  // Not enrolled — show enrollment prompt
  await updateIconForTab(tabId, 'enrollment');
  await chrome.tabs.sendMessage(tabId, { type: 'SHOW_ENROLL_PROMPT', siteName });
  return { ok: true, action: 'ENROLL_PROMPT_SHOWN' };
}

// ── Verify presence (login flow) ──────────────────────────────────────────────

async function onVerifyPresence(origin, rpId, tabId) {
  try {
    // Recompute rpId from origin — never trust an externally supplied value
    const computedRpId = computeRpId(origin);
    if (!computedRpId) {
      await showError(tabId, 'HPP_ORIGIN_MISMATCH');
      return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };
    }
    if (rpId && rpId !== computedRpId) {
      log.warn('RPID_MISMATCH', { provided: rpId, computed: computedRpId });
      await showError(tabId, 'HPP_ORIGIN_MISMATCH');
      return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };
    }
    const verifiedRpId = computedRpId;

    // Step 1: Fetch and verify challenge
    const challenge = await fetchChallenge(verifiedRpId, 'attest');
    if (!challenge.ok) {
      await showError(tabId, challenge.error);
      return challenge;
    }

    // Step 2: Look up enrolled credential id for this origin
    const enrolled = await getEnrolledSiteByOrigin(origin);
    if (!enrolled) {
      await showError(tabId, 'HPP_ORIGIN_MISMATCH');
      return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };
    }

    // Step 3: Invoke WebAuthn via content script, passing enrolledCredentialId
    const assertionResult = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, {
        type:                 'RUN_WEBAUTHN',
        challenge:            challenge.data,
        origin,
        rpId:                 verifiedRpId,
        enrolledCredentialId: enrolled.credential_id,
      }, resolve);
    });

    if (!assertionResult?.ok) {
      const errCode = assertionResult?.error ?? 'HPP_SERVER_UNAVAILABLE';
      await showError(tabId, errCode);
      return { ok: false, error: errCode };
    }

    const assertion = assertionResult.assertion;

    // Step 4: Belt-and-suspenders UV flag check (content script also verifies)
    if (!extractUVFlag(assertion.authenticator_data)) {
      await showError(tabId, 'HPP_UV_FLAG_MISSING');
      return { ok: false, error: 'HPP_UV_FLAG_MISSING' };
    }

    // Step 5: Store inflight and submit
    const cert_id       = generateCertId();
    const inflightEntry = { cert_id, challenge: challenge.data, assertion };
    await setInflight(tabId, inflightEntry);

    return await submitAttestation(tabId, inflightEntry);

  } catch (e) {
    log.error('VERIFY_PRESENCE_ERROR', { error: e.message, tabId });
    await showError(tabId, 'HPP_SERVER_UNAVAILABLE');
    return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
  }
}

// ── Challenge fetch ───────────────────────────────────────────────────────────
// Shared verified path for both login and enrollment.
// Always runs full signature + freshness verification.

async function fetchChallenge(rpId, purpose = 'attest') {
  const base     = await getServerBase();
  const manifest = chrome.runtime.getManifest();

  let res;
  try {
    res = await fetch(
      `${base}/v1/challenge?rp_id=${encodeURIComponent(rpId)}&purpose=${encodeURIComponent(purpose)}`,
      {
        headers: {
          'X-HPP-Extension-Version': manifest.version,
          'X-HPP-Extension-ID':      chrome.runtime.id,
        },
      }
    );
  } catch (e) {
    log.warn('CHALLENGE_FETCH_NETWORK_ERROR', { error: e.message });
    return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
  }

  if (res.status === 403) return { ok: false, error: 'HPP_UNKNOWN_EXTENSION_ID' };
  if (!res.ok)            return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };

  const challenge = await res.json();
  challenge.received_at = Date.now();

  const sigValid = await verifyChallengeSignature(challenge);
  if (!sigValid) {
    log.warn('CHALLENGE_SIG_INVALID', { rpId });
    return { ok: false, error: 'HPP_CHALLENGE_SIG_INVALID' };
  }

  const config    = await getServerConfig();
  const freshness = evaluateChallengeFreshness(challenge, config.max_clock_skew_ms);
  if (!freshness.fresh) return { ok: false, error: freshness.error };

  log.debug('CHALLENGE_FETCHED', { rpId, purpose, nonce: challenge.nonce?.substring(0,8) });
  return { ok: true, data: challenge };
}

// ── Attestation submission ────────────────────────────────────────────────────
// CANONICAL ATTEST PAYLOAD — this is the contract:
//   cert_id, nonce, rp_id, server_timestamp, client_timestamp,
//   credential_id, authenticator_data, assertion_sig, client_data_json
//
// The nonce binds this request to a specific single-use challenge.
// The server must verify nonce is unused and mark it consumed.

async function submitAttestation(tabId, inflightEntry) {
  const { cert_id, challenge, assertion } = inflightEntry;
  const base = await getServerBase();

  // fix 2.2: include nonce to bind certificate to this specific challenge
  // fix 2.3: include client_data_json for server-side WebAuthn verification
  const body = {
    cert_id,
    nonce:              challenge.nonce,         // challenge binding (fix 2.2)
    rp_id:              challenge.rp_id,
    server_timestamp:   challenge.server_timestamp,
    client_timestamp:   Date.now(),
    credential_id:      assertion.credential_id,
    authenticator_data: assertion.authenticator_data,
    assertion_sig:      assertion.assertion_sig,
    client_data_json:   assertion.client_data_json,  // fix 2.3
  };

  let res;
  try {
    res = await fetch(`${base}/v1/attest`, {
      method:  'POST',
      headers: {
        'Content-Type':            'application/json',
        'X-HPP-Extension-Version': chrome.runtime.getManifest().version,
        'X-HPP-Extension-ID':      chrome.runtime.id,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    log.warn('ATTEST_NETWORK_ERROR', { error: e.message });
    await clearInflight(tabId);
    return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
  }

  if (res.status === 408) { await clearInflight(tabId); return { ok: false, error: 'HPP_CHALLENGE_EXPIRED' }; }
  if (res.status === 401) {
    const data = await res.json();
    await clearInflight(tabId);
    if (data.error === 'CREDENTIAL_REVOKED') {
      await removeEnrolledSiteByRpId(challenge.rp_id);
    }
    return { ok: false, error: `HPP_${data.error}` };
  }
  if (!res.ok) { await clearInflight(tabId); return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' }; }

  const serverResp = await res.json();

  if (serverResp.status !== 'issued') {
    log.warn('ATTEST_STATUS_UNEXPECTED', { status: serverResp.status });
    await clearInflight(tabId);
    return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
  }

  // Build the canonical certificate — nonce is included in the signed payload
  const cert = {
    ...body,
    hpp_server_sig: serverResp.hpp_server_sig,
    expiry_ms:      serverResp.expiry_ms,
    status:         serverResp.status,
  };

  // Verify hpp_server_sig before trusting the certificate
  const sigResult = await verifyServerSignature(cert);
  if (!sigResult.valid) {
    log.warn('SERVER_SIG_INVALID_ON_CERT', { cert_id, error: sigResult.error });
    await clearInflight(tabId);
    await showError(tabId, sigResult.error);
    return { ok: false, error: sigResult.error };
  }

  await clearInflight(tabId);

  await setSessionForTab(tabId, {
    cert,
    rp_id:     challenge.rp_id,
    expiry_ms: cert.expiry_ms,
    issued_at: Date.now(),
  });

  await updateIconForTab(tabId, 'active');
  log.info('SESSION_ISSUED', { cert_id: cert_id.substring(0,8), rp_id: challenge.rp_id });

  // Relay full certificate to relying party backend (never to the page)
  const enrolled = await getEnrolledSiteByRpId(challenge.rp_id);
  if (enrolled?.callbackUrl) {
    await relayCertToRP(cert, enrolled.callbackUrl);
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      type:      'CERT_READY',
      cert_id:   cert.cert_id,
      expiry_ms: cert.expiry_ms,
      rp_id:     cert.rp_id,
    });
  } catch (_) {}

  return { ok: true, cert_id: cert.cert_id, expiry_ms: cert.expiry_ms };
}

// ── Certificate relay to RP backend ───────────────────────────────────────────

async function relayCertToRP(cert, callbackUrl) {
  try {
    const res = await fetch(callbackUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(cert),
    });
    if (!res.ok) log.warn('RELAY_FAILED', { status: res.status, callbackUrl });
    else         log.info('RELAY_SUCCESS', { cert_id: cert.cert_id.substring(0,8) });
  } catch (e) {
    log.warn('RELAY_NETWORK_ERROR', { error: e.message });
  }
}

// ── callbackUrl validation ────────────────────────────────────────────────────
// fix 2.1: resolve relative paths against pageOrigin before validation.
// This makes data-hpp-callback="/api/hpp" work correctly.
// Strict policy: resolved origin must match page origin exactly.
// HTTPS required except for localhost (dev).

function validateCallbackUrl(callbackUrl, pageOrigin) {
  if (!callbackUrl) return null;
  try {
    // Resolve relative URLs against the page origin — this is the key fix.
    // new URL("/api/hpp", "https://example.com") → "https://example.com/api/hpp"
    const cb   = new URL(callbackUrl, pageOrigin);
    const page = new URL(pageOrigin);

    const isLocalhost = cb.hostname === 'localhost' || cb.hostname === '127.0.0.1';
    if (cb.protocol !== 'https:' && !isLocalhost) {
      log.warn('CALLBACK_URL_NOT_HTTPS', { callbackUrl, resolved: cb.href });
      return null;
    }

    if (cb.origin !== page.origin) {
      log.warn('CALLBACK_URL_ORIGIN_MISMATCH', { resolved: cb.href, pageOrigin });
      return null;
    }

    return cb.href;  // return the fully resolved absolute URL
  } catch {
    log.warn('CALLBACK_URL_INVALID', { callbackUrl, pageOrigin });
    return null;
  }
}

// ── Enrollment flow ───────────────────────────────────────────────────────────
// fix 2.7: enrollment is NOT persisted locally until the server confirms success.
// In dev mode (mock server), server failure is logged and enrollment proceeds
// only if the server returns status: 'enrolled'. Split-brain is prevented.

async function onEnrollRequest(origin, tabId) {
  try {
    const rpId = computeRpId(origin);
    if (!rpId) return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };

    const challengeResult = await fetchChallenge(rpId, 'enrollment');
    if (!challengeResult.ok) return challengeResult;

    const enrollChallenge = { ...challengeResult.data, site_name: origin };

    const createResult = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'RUN_WEBAUTHN_CREATE', enrollChallenge, origin, rpId,
      }, resolve);
    });

    if (!createResult?.ok) {
      return { ok: false, error: createResult?.error ?? 'HPP_WEBAUTHN_CANCELLED' };
    }

    const credential = createResult.credential;

    if (credential.rp_id && credential.rp_id !== rpId) {
      log.warn('CREDENTIAL_RPID_MISMATCH', { credential_rp_id: credential.rp_id, computed: rpId });
      return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };
    }

    // fix 2.7: require server enrollment success before persisting locally
    let serverEnrollOk = false;
    try {
      const enrollRes = await fetch(`${await getServerBase()}/v1/enroll`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rp_id:              rpId,
          credential_id:      credential.credential_id,
          public_key_cbor:    credential.public_key_cbor,
          attestation_object: credential.attestation_object,
          client_data_json:   credential.client_data_json,
          enrollment_nonce:   enrollChallenge.nonce,  // fix 2.2: nonce in enrollment too
        }),
      });
      const enrollResp = await enrollRes.json();
      serverEnrollOk = enrollRes.ok && enrollResp.status === 'enrolled';
      if (!serverEnrollOk) {
        log.warn('ENROLL_SERVER_REJECTED', { status: enrollResp.status, error: enrollResp.error });
      }
    } catch (e) {
      log.warn('ENROLL_SERVER_NETWORK_ERROR', { error: e.message });
    }

    if (!serverEnrollOk) {
      if (DEV_LOCAL_ENROLLMENT) {
        log.warn('ENROLLMENT_SERVER_FAILED_DEV_MODE_CONTINUING', { origin, rpId });
        // Fall through — local enrollment proceeds despite server failure.
        // This mode exists only for mock server experimentation.
      } else {
        log.warn('ENROLLMENT_BLOCKED_BY_SERVER_FAILURE', { origin, rpId });
        return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
      }
    }

    // Server confirmed — safe to persist locally
    const pendingCallback = await getPendingCallbackUrl(origin);
    await clearPendingCallbackUrl(origin);

    await addEnrolledSite({
      origin,
      rp_id:         rpId,
      credential_id: credential.credential_id,
      callbackUrl:   pendingCallback ?? null,
    });

    await updateIconForTab(tabId, 'active');
    log.info('ENROLLED', { origin, rp_id: rpId });
    return { ok: true, enrolled: true, rp_id: rpId };

  } catch (e) {
    log.error('ENROLL_ERROR', { error: e.message });
    return { ok: false, error: 'HPP_SERVER_UNAVAILABLE' };
  }
}

// ── Get session ───────────────────────────────────────────────────────────────
// Returns the frozen SessionSummary shape:
//   { ok, active, cert_id, rp_id, issued_at, expiry_ms, remaining_ms }

async function onGetSession(tabId) {
  if (!tabId) return { ok: true, active: false };
  const session = await getSessionForTab(tabId);
  if (!session || session.expiry_ms < Date.now()) return { ok: true, active: false };
  return {
    ok:           true,
    active:       true,
    cert_id:      session.cert.cert_id,
    rp_id:        session.rp_id,
    issued_at:    session.issued_at,
    expiry_ms:    session.expiry_ms,
    remaining_ms: Math.max(0, session.expiry_ms - Date.now()),
  };
}

// ── Revoke site ───────────────────────────────────────────────────────────────

async function onRevokeSite(origin) {
  try {
    const enrolled = await getEnrolledSiteByOrigin(origin);
    if (!enrolled) return { ok: false, error: 'NOT_ENROLLED' };

    await fetch(`${await getServerBase()}/v1/credential`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ credential_id: enrolled.credential_id, rp_id: enrolled.rp_id }),
    }).catch(() => {});

    await removeEnrolledSiteByOrigin(origin);
    log.info('SITE_REVOKED', { origin });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Icon management ───────────────────────────────────────────────────────────

const ICON_STATES = {
  default:    { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP Browser Login',             badgeText: '',  badgeColor: '#666666' },
  active:     { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP Active — Session valid',    badgeText: '✓', badgeColor: '#1A6B3A' },
  pending:    { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP — Verifying presence...',   badgeText: '…', badgeColor: '#1B3A6B' },
  expiring:   { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP — Session expiring soon',   badgeText: '!', badgeColor: '#B8860B' },
  error:      { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP — Authentication error',    badgeText: '✗', badgeColor: '#8B1A1A' },
  enrollment: { path: { 16: 'icons/hpp-16.png', 32: 'icons/hpp-32.png' }, title: 'HPP — Enrollment available',    badgeText: '+', badgeColor: '#B8860B' },
};

async function updateIconForTab(tabId, state) {
  const s = ICON_STATES[state] ?? ICON_STATES.default;
  try {
    await chrome.action.setIcon({ tabId, path: s.path });
    await chrome.action.setTitle({ tabId, title: s.title });
    await chrome.action.setBadgeText({ tabId, text: s.badgeText });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: s.badgeColor });
  } catch (_) {}
}

async function updateIconForAllTabs() {
  const sessions = await getAllSessions();
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const session = sessions[String(tab.id)];
    if (!session) continue;
    const remaining = session.expiry_ms - Date.now();
    if (remaining < 0)                  await updateIconForTab(tab.id, 'default');
    else if (remaining < 5 * 60 * 1000) await updateIconForTab(tab.id, 'expiring');
    else                                await updateIconForTab(tab.id, 'active');
  }
}

// ── Error display ─────────────────────────────────────────────────────────────

async function showError(tabId, errorCode) {
  if (!tabId) return;
  await updateIconForTab(tabId, 'error');
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'HIDE_GATE' });
    await chrome.tabs.sendMessage(tabId, {
      type:    'SHOW_ERROR',
      message: getDisplayMessage(errorCode),
      code:    errorCode,
    });
  } catch (_) {}
}

// ── Tab lifecycle ─────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearSessionForTab(tabId);
  await clearInflight(tabId);
});

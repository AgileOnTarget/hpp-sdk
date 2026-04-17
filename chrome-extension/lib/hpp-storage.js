/**
 * hpp-storage.js  (lib/ copy — used by background.js service worker)
 * Typed wrappers around chrome.storage for all HPP state objects.
 * Spec reference: Section II.2 — State Management
 *
 * Storage areas:
 *   session — hpp_session_map, hpp_inflight_map, hpp_server_config,
 *             hpp_pending_callbacks
 *   sync    — hpp_enrolled_sites, hpp_settings
 *
 * INVARIANT (INV-4): Certificates are stored ONLY in chrome.storage.session.
 * Never written to localStorage, IndexedDB, cookies, or any page-accessible
 * storage.
 */

'use strict';

// ── Default values ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  hpp_active:               true,
  certificate_lifetime:     3600000,  // 1 hour in ms
  privacy_mode:             false,
  debug_logging:            false,
  server_endpoint_override: null,     // null = production; 'http://127.0.0.1:9443' for dev
  max_clock_skew_ms:        30000,
};

const DEFAULT_SERVER_CONFIG = {
  max_clock_skew_ms:             30000,
  window_ms_min:                 8000,
  window_ms_max:                 30000,
  h_constant:                    1,
  supported_attestation_formats: ['packed', 'tpm', 'android-key', 'apple'],
  fetched_at:                    0,
};

// ── Session map ───────────────────────────────────────────────────────────────
// Maps tab_id (string) -> { cert, rp_id, expiry_ms, issued_at }

export async function getSessionForTab(tabId) {
  const result = await chrome.storage.session.get('hpp_session_map');
  const map = result.hpp_session_map ?? {};
  return map[String(tabId)] ?? null;
}

export async function setSessionForTab(tabId, sessionData) {
  const result = await chrome.storage.session.get('hpp_session_map');
  const map = result.hpp_session_map ?? {};
  map[String(tabId)] = sessionData;
  await chrome.storage.session.set({ hpp_session_map: map });
}

export async function clearSessionForTab(tabId) {
  const result = await chrome.storage.session.get('hpp_session_map');
  const map = result.hpp_session_map ?? {};
  delete map[String(tabId)];
  await chrome.storage.session.set({ hpp_session_map: map });
}

export async function getAllSessions() {
  const result = await chrome.storage.session.get('hpp_session_map');
  return result.hpp_session_map ?? {};
}

// ── Inflight map ──────────────────────────────────────────────────────────────
// Maps tab_id (string) -> { cert_id, challenge, assertion, started_at }
// Written BEFORE POST /attest; cleared on success or error.
// Guards against service worker restart mid-attestation.

export async function setInflight(tabId, inflightData) {
  const result = await chrome.storage.session.get('hpp_inflight_map');
  const map = result.hpp_inflight_map ?? {};
  map[String(tabId)] = { ...inflightData, started_at: Date.now() };
  await chrome.storage.session.set({ hpp_inflight_map: map });
}

export async function getInflight(tabId) {
  const result = await chrome.storage.session.get('hpp_inflight_map');
  const map = result.hpp_inflight_map ?? {};
  return map[String(tabId)] ?? null;
}

export async function clearInflight(tabId) {
  const result = await chrome.storage.session.get('hpp_inflight_map');
  const map = result.hpp_inflight_map ?? {};
  delete map[String(tabId)];
  await chrome.storage.session.set({ hpp_inflight_map: map });
}

export async function getAllInflight() {
  const result = await chrome.storage.session.get('hpp_inflight_map');
  return result.hpp_inflight_map ?? {};
}

// ── Enrolled sites ────────────────────────────────────────────────────────────
// Array of { origin, rp_id, credential_id, callbackUrl, enrolled_at }

export async function getEnrolledSites() {
  const result = await chrome.storage.sync.get('hpp_enrolled_sites');
  return result.hpp_enrolled_sites ?? [];
}

export async function addEnrolledSite(siteData) {
  const sites = await getEnrolledSites();
  const existing = sites.findIndex(s => s.origin === siteData.origin);
  if (existing >= 0) sites.splice(existing, 1);
  sites.push({ ...siteData, enrolled_at: Date.now() });
  await chrome.storage.sync.set({ hpp_enrolled_sites: sites });
}

export async function getEnrolledSiteByOrigin(origin) {
  const sites = await getEnrolledSites();
  return sites.find(s => s.origin === origin) ?? null;
}

export async function getEnrolledSiteByRpId(rpId) {
  const sites = await getEnrolledSites();
  return sites.find(s => s.rp_id === rpId) ?? null;
}

export async function updateEnrolledSiteCallbackUrl(origin, callbackUrl) {
  const sites = await getEnrolledSites();
  const idx = sites.findIndex(s => s.origin === origin);
  if (idx >= 0) {
    sites[idx].callbackUrl = callbackUrl;
    await chrome.storage.sync.set({ hpp_enrolled_sites: sites });
  }
}

// ── Enrolled site removal — explicit by origin or rp_id (fix 6.1) ─────────────

/**
 * Remove an enrolled site by origin (used by onRevokeSite from UI).
 */
export async function removeEnrolledSiteByOrigin(origin) {
  const sites = await getEnrolledSites();
  const filtered = sites.filter(s => s.origin !== origin);
  await chrome.storage.sync.set({ hpp_enrolled_sites: filtered });
}

/**
 * Remove an enrolled site by rp_id (used when server reports CREDENTIAL_REVOKED).
 */
export async function removeEnrolledSiteByRpId(rpId) {
  const sites = await getEnrolledSites();
  const filtered = sites.filter(s => s.rp_id !== rpId);
  await chrome.storage.sync.set({ hpp_enrolled_sites: filtered });
}

// ── Pending callbackUrl cache (fix 2.2) ───────────────────────────────────────
// Temporarily holds callbackUrl keyed by origin between HPP_SITE_DETECTED and
// enrollment completion, so callbackUrl survives the full enrollment flow.

export async function getPendingCallbackUrl(origin) {
  const result = await chrome.storage.session.get('hpp_pending_callbacks');
  return (result.hpp_pending_callbacks ?? {})[origin] ?? null;
}

export async function setPendingCallbackUrl(origin, callbackUrl) {
  const result = await chrome.storage.session.get('hpp_pending_callbacks');
  const map = result.hpp_pending_callbacks ?? {};
  map[origin] = callbackUrl;
  await chrome.storage.session.set({ hpp_pending_callbacks: map });
}

export async function clearPendingCallbackUrl(origin) {
  const result = await chrome.storage.session.get('hpp_pending_callbacks');
  const map = result.hpp_pending_callbacks ?? {};
  delete map[origin];
  await chrome.storage.session.set({ hpp_pending_callbacks: map });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  const result = await chrome.storage.sync.get('hpp_settings');
  return { ...DEFAULT_SETTINGS, ...(result.hpp_settings ?? {}) };
}

export async function updateSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.sync.set({ hpp_settings: updated });
  return updated;
}

// ── Server config ─────────────────────────────────────────────────────────────
// Cached server configuration. Refreshed every 5 minutes.

export async function getServerConfig() {
  const result = await chrome.storage.session.get('hpp_server_config');
  return { ...DEFAULT_SERVER_CONFIG, ...(result.hpp_server_config ?? {}) };
}

export async function setServerConfig(config) {
  await chrome.storage.session.set({
    hpp_server_config: { ...config, fetched_at: Date.now() }
  });
}

export async function isServerConfigStale() {
  const config = await getServerConfig();
  const age = Date.now() - (config.fetched_at ?? 0);
  return age > 5 * 60 * 1000;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Purge all expired sessions from hpp_session_map.
 * Called periodically by the alarm handler.
 */
export async function purgeExpiredSessions() {
  const result = await chrome.storage.session.get('hpp_session_map');
  const map = result.hpp_session_map ?? {};
  const now = Date.now();
  let changed = false;
  for (const [tabId, session] of Object.entries(map)) {
    if (session.expiry_ms < now) {
      delete map[tabId];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({ hpp_session_map: map });
  return changed;
}

/**
 * Purge stale inflight entries (older than 2 minutes — they are dead).
 */
export async function purgeStaleInflight() {
  const result = await chrome.storage.session.get('hpp_inflight_map');
  const map = result.hpp_inflight_map ?? {};
  const cutoff = Date.now() - 2 * 60 * 1000;
  let changed = false;
  for (const [tabId, entry] of Object.entries(map)) {
    if ((entry.started_at ?? 0) < cutoff) {
      delete map[tabId];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({ hpp_inflight_map: map });
  return changed;
}

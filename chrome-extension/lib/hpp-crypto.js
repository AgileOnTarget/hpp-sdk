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
 * hpp-crypto.js
 * Certificate construction, signature verification, eTLD+1 computation,
 * and challenge freshness logic.
 *
 * Uses Web Crypto API (SubtleCrypto) — available in MV3 service workers.
 * Spec references:
 *   Section 4.1.1 — Challenge Freshness Rule
 *   Section 4.2   — WebAuthn rp.id (eTLD+1) Rules
 *   Section 4.5   — Certificate Construction
 *   Section 7.4   — Attestation Server Trust Anchor
 */

'use strict';

import { HPP_ERRORS } from './hpp-errors.js';
import { createLogger } from './hpp-logger.js';

const log = createLogger('hpp-crypto');

// ── Trust anchor ──────────────────────────────────────────────────────────────
// The pinned HPP Attestation Server public key, loaded once and cached.
// Spec INV: not fetched at runtime — bundled in package at lib/hpp-server-pubkey.pem.

let _pinnedPublicKey = null;  // CryptoKey, populated on first use

/**
 * Import the pinned server public key from the extension package.
 * The PEM file is fetched from the extension's own origin — not from the network.
 */
export async function getPinnedPublicKey() {
  if (_pinnedPublicKey) return _pinnedPublicKey;

  const pemUrl  = chrome.runtime.getURL('lib/hpp-server-pubkey.pem');
  const response = await fetch(pemUrl);
  const pem      = await response.text();

  const pemBody = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  _pinnedPublicKey = await crypto.subtle.importKey(
    'spki', der.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,  // not extractable
    ['verify']
  );
  return _pinnedPublicKey;
}

// ── Canonical signing ─────────────────────────────────────────────────────────

/**
 * Build the canonical payload object used for signing/verifying.
 * Keys are in alphabetical order — critical for deterministic JSON serialization.
 */
function buildCertPayload(cert) {
  return {
    assertion_sig:      cert.assertion_sig,
    authenticator_data: cert.authenticator_data,
    cert_id:            cert.cert_id,
    credential_id:      cert.credential_id,
    expiry_ms:          cert.expiry_ms,
    rp_id:              cert.rp_id,
    server_timestamp:   cert.server_timestamp,
  };
}

/**
 * Verify the HPP Attestation Server countersignature on a certificate.
 * Returns { valid: true } or { valid: false, error: HPP_ERROR_CODE }
 */
export async function verifyServerSignature(cert) {
  try {
    const pubKey  = await getPinnedPublicKey();
    const payload = buildCertPayload(cert);
    const data    = new TextEncoder().encode(JSON.stringify(payload));

    // The server signs with DER-encoded ECDSA — decode from base64url
    const sigBytes = base64urlToBuffer(cert.hpp_server_sig);

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey,
      sigBytes,
      data
    );

    if (!valid) {
      log.warn('SERVER_SIG_INVALID', { cert_id: cert.cert_id });
      return { valid: false, error: 'HPP_CHALLENGE_SIG_INVALID' };
    }
    return { valid: true };
  } catch (err) {
    log.error('SIG_VERIFY_EXCEPTION', { message: err.message });
    return { valid: false, error: 'HPP_CHALLENGE_SIG_INVALID' };
  }
}

/**
 * Verify a challenge's server_sig before using it.
 */
export async function verifyChallengeSignature(challenge) {
  try {
    const pubKey = await getPinnedPublicKey();
    const { server_sig, ...payload } = challenge;
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const sigBytes = base64urlToBuffer(server_sig);

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey,
      sigBytes,
      data
    );
    return valid;
  } catch (err) {
    log.error('CHALLENGE_SIG_VERIFY_EXCEPTION', { message: err.message });
    return false;
  }
}

// ── Challenge freshness ───────────────────────────────────────────────────────
// Spec Section 4.1.1: The Absolute Freshness Rule
// A challenge is valid iff:
//   1. estimated_server_time < server_timestamp + window_ms
//   2. |receipt_clock - server_timestamp| < max_clock_skew_ms

/**
 * Evaluate challenge freshness at time of use.
 * @param {object} challenge  - { server_timestamp, window_ms, received_at }
 * @param {number} maxClockSkewMs
 * @returns {{ fresh: boolean, error?: string }}
 */
export function evaluateChallengeFreshness(challenge, maxClockSkewMs = 30000) {
  const now = Date.now();
  const elapsed = now - challenge.received_at;
  const estimatedServerNow = challenge.server_timestamp + elapsed;

  // Condition 1: absolute expiry
  if (estimatedServerNow >= challenge.server_timestamp + challenge.window_ms) {
    log.debug('CHALLENGE_STALE', {
      age_ms: estimatedServerNow - challenge.server_timestamp,
      window_ms: challenge.window_ms,
    });
    return { fresh: false, error: 'HPP_CHALLENGE_EXPIRED' };
  }

  // Condition 2: clock skew at time of receipt
  const skew = Math.abs(challenge.received_at - challenge.server_timestamp);
  if (skew > maxClockSkewMs) {
    log.warn('CLOCK_SKEW_EXCEEDED', { skew_ms: skew, max: maxClockSkewMs });
    return { fresh: false, error: 'HPP_CLOCK_SKEW_ERROR' };
  }

  return { fresh: true };
}

// ── UV flag ───────────────────────────────────────────────────────────────────
// INV-3: UV flag must be set in authenticator data before certificate construction.

/**
 * Parse the UV flag from raw authenticator data (CBOR-like, but UV is at a fixed offset).
 * authenticatorData layout: rpIdHash (32) | flags (1) | signCount (4) | ...
 * flags bit 2 (0x04) = UV (User Verified)
 */
export function extractUVFlag(authenticatorDataB64) {
  const buf   = base64urlToBuffer(authenticatorDataB64);
  const flags = new Uint8Array(buf)[32];
  return (flags & 0x04) !== 0;  // bit 2 = UV
}

// ── eTLD+1 computation ────────────────────────────────────────────────────────
// Spec Section 4.2: rp_id must be eTLD+1, not full origin.
// Bundled PSL data for common TLDs; full PSL via vendor/psl.min.js at runtime.

const MULTI_PART_TLDS = new Set([
  'co.uk', 'co.jp', 'co.nz', 'co.za', 'co.in', 'co.kr',
  'com.au', 'com.br', 'com.mx', 'com.ar', 'com.cn',
  'org.uk', 'net.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'gov.au', 'edu.au', 'id.au',
  'ne.jp', 'or.jp', 'ac.jp',
]);

/**
 * Compute the eTLD+1 (registrable domain suffix) from an origin string.
 * Example: 'https://login.example.co.uk' → 'example.co.uk'
 * Uses bundled multi-part TLD list; for full PSL, vendor/psl.min.js is used
 * when loaded.
 */
export function computeRpId(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    // Try vendor PSL if available (injected by webauthn-bridge.js)
    if (typeof psl !== 'undefined' && psl.get) {
      return psl.get(hostname);
    }

    // Fallback: built-in multi-part TLD lookup
    const parts = hostname.split('.');
    if (parts.length < 2) return hostname;

    // Check for known 2-part TLDs (e.g., co.uk)
    if (parts.length >= 3) {
      const candidate = parts.slice(-2).join('.');
      if (MULTI_PART_TLDS.has(candidate)) {
        return parts.slice(-3).join('.');
      }
    }

    // Default: last two parts
    return parts.slice(-2).join('.');
  } catch {
    return null;
  }
}

// ── Certificate ID ────────────────────────────────────────────────────────────

export function generateCertId() {
  // UUID v4
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

// ── SHA-256 event hash ────────────────────────────────────────────────────────

export async function sha256(data) {
  const buf    = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return bufferToBase64url(digest);
}

// ── Buffer utilities ──────────────────────────────────────────────────────────

export function base64urlToBuffer(b64) {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary  = atob(padded);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToBase64url(buf) {
  const bytes  = new Uint8Array(buf);
  let binary   = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

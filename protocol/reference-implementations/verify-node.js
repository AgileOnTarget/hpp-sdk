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
 * hpp-verify.js — HPP Presence Certificate Verification Library (Node.js)
 *
 * Reference implementation for relying party servers.
 * Platform-agnostic — works with certificates from any HPP client
 * (browser extension, mobile SDK, native module).
 *
 * Usage:
 *   const { verifyPresenceCertificate, loadHppPublicKey } = require('./hpp-verify');
 *
 *   const publicKey = await loadHppPublicKey('./hpp-server-pubkey.pem');
 *
 *   app.post('/api/hpp', async (req, res) => {
 *     const result = await verifyPresenceCertificate(req.body, publicKey);
 *     if (!result.valid) return res.status(401).json({ error: result.error });
 *     req.session.hpp_cert_id = result.cert_id;
 *     res.json({ cert_id: result.cert_id, granted: true });
 *   });
 *
 * Verification steps (all required):
 *   1. hpp_server_sig — ECDSA P-256 over canonical payload
 *   2. rp_id — must match expected domain
 *   3. expiry_ms — must be in the future
 *   4. status — must be 'issued'
 *   5. UV flag — bit 2 of authenticator_data flags byte
 *   6. Replay prevention — cert_id uniqueness (caller responsibility)
 *
 * @version 1.0.0
 * @license Proprietary — Patent Pending
 * @author Agile On Target LLC
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Fields included in the canonical signing payload, in alphabetical order.
 * This MUST match the HPP Attestation Server's signing logic exactly.
 */
const SIGNED_FIELDS = [
  'assertion_sig',
  'authenticator_data',
  'cert_id',
  'client_data_json',
  'client_timestamp',
  'credential_id',
  'expiry_ms',
  'nonce',
  'rp_id',
  'server_timestamp',
];

/**
 * Required fields that must be present on every certificate.
 */
const REQUIRED_FIELDS = [
  'cert_id', 'nonce', 'rp_id', 'server_timestamp', 'client_timestamp',
  'credential_id', 'authenticator_data', 'assertion_sig', 'client_data_json',
  'expiry_ms', 'status', 'hpp_server_sig',
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Verify an HPP Presence Certificate.
 *
 * @param {object}       cert      — The full certificate object from the callback endpoint
 * @param {KeyObject}    publicKey — The HPP Attestation Server public key (from loadHppPublicKey)
 * @param {object}       [options]
 * @param {string}       [options.expectedRpId]  — Expected rp_id (eTLD+1 of your site)
 * @param {number}       [options.clockToleranceMs=5000] — Clock tolerance for expiry check
 *
 * @returns {object} { valid: boolean, cert_id?: string, error?: string, detail?: string }
 */
async function verifyPresenceCertificate(cert, publicKey, options = {}) {
  const { expectedRpId = null, clockToleranceMs = 5000 } = options;

  // ── Step 0: Structural validation ──────────────────────────────────────
  for (const field of REQUIRED_FIELDS) {
    if (cert[field] === undefined || cert[field] === null) {
      return { valid: false, error: 'MISSING_FIELD', detail: `Missing required field: ${field}` };
    }
  }

  // ── Step 1: Verify hpp_server_sig (ECDSA P-256 / SHA-256) ─────────────
  try {
    const payload = buildCanonicalPayload(cert);
    const sigBuffer = base64urlToBuffer(cert.hpp_server_sig);

    const isValid = crypto.createVerify('SHA256')
      .update(payload)
      .verify(publicKey, sigBuffer);

    if (!isValid) {
      return { valid: false, error: 'CERT_SIG_INVALID', detail: 'hpp_server_sig verification failed' };
    }
  } catch (e) {
    return { valid: false, error: 'CERT_SIG_INVALID', detail: `Signature verification error: ${e.message}` };
  }

  // ── Step 2: Verify rp_id ──────────────────────────────────────────────
  if (expectedRpId && cert.rp_id !== expectedRpId) {
    return {
      valid: false,
      error: 'RP_MISMATCH',
      detail: `Expected rp_id '${expectedRpId}', got '${cert.rp_id}'`,
    };
  }

  // ── Step 3: Verify expiry ─────────────────────────────────────────────
  const now = Date.now();
  if (cert.expiry_ms <= now - clockToleranceMs) {
    return {
      valid: false,
      error: 'CERT_EXPIRED',
      detail: `Certificate expired at ${cert.expiry_ms}, current time ${now}`,
    };
  }

  // ── Step 4: Verify status ─────────────────────────────────────────────
  if (cert.status !== 'issued') {
    return {
      valid: false,
      error: 'INVALID_STATUS',
      detail: `Expected status 'issued', got '${cert.status}'`,
    };
  }

  // ── Step 5: Verify UV flag ────────────────────────────────────────────
  try {
    const uvSet = extractUVFlag(cert.authenticator_data);
    if (!uvSet) {
      return { valid: false, error: 'UV_FLAG_MISSING', detail: 'UV bit (bit 2) not set in authenticator_data' };
    }
  } catch (e) {
    return { valid: false, error: 'UV_FLAG_MISSING', detail: `Failed to extract UV flag: ${e.message}` };
  }

  // ── Step 6: Replay prevention is caller responsibility ────────────────
  // The caller MUST check cert_id against a replay prevention store
  // and reject duplicates. TTL = max(0, cert.expiry_ms - Date.now()).

  // ── Step 7: action_scope (re-attestation only) ────────────────────────
  // If you are verifying a re-attestation certificate, check:
  //   cert.action_scope === expectedActionScope

  return {
    valid: true,
    cert_id: cert.cert_id,
    rp_id: cert.rp_id,
    credential_id: cert.credential_id,
    expiry_ms: cert.expiry_ms,
    server_timestamp: cert.server_timestamp,
  };
}

/**
 * Load the HPP Attestation Server public key from a PEM file.
 *
 * @param {string} pemPath — Path to the PEM-encoded ECDSA P-256 public key
 * @returns {KeyObject}
 */
function loadHppPublicKey(pemPath) {
  const pem = fs.readFileSync(pemPath, 'utf-8');
  return crypto.createPublicKey(pem);
}

/**
 * Load the HPP Attestation Server public key from a PEM string.
 *
 * @param {string} pemString — PEM-encoded ECDSA P-256 public key
 * @returns {KeyObject}
 */
function loadHppPublicKeyFromString(pemString) {
  return crypto.createPublicKey(pemString);
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Build the canonical signing payload from a certificate.
 * Keys are sorted alphabetically and serialized with no whitespace.
 */
function buildCanonicalPayload(cert) {
  const payload = {};
  for (const key of SIGNED_FIELDS) {
    if (cert[key] !== undefined) {
      payload[key] = cert[key];
    }
  }
  return JSON.stringify(payload);
}

/**
 * Decode a base64url string to a Buffer.
 */
function base64urlToBuffer(b64url) {
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return Buffer.from(padded, 'base64');
}

/**
 * Extract the UV (User Verified) flag from base64url-encoded authenticator data.
 * UV is bit 2 (0x04) of the flags byte at offset 32.
 *
 * @param {string} authDataB64 — base64url-encoded authenticatorData
 * @returns {boolean} true if UV flag is set
 */
function extractUVFlag(authDataB64) {
  const buf = base64urlToBuffer(authDataB64);
  if (buf.length < 33) {
    throw new Error(`authenticator_data too short: ${buf.length} bytes (need >= 33)`);
  }
  return (buf[32] & 0x04) !== 0;
}

/**
 * Extract the sign count from authenticator data.
 * Sign count is a 32-bit big-endian integer at offset 33-36.
 *
 * @param {string} authDataB64 — base64url-encoded authenticatorData
 * @returns {number}
 */
function extractSignCount(authDataB64) {
  const buf = base64urlToBuffer(authDataB64);
  if (buf.length < 37) {
    throw new Error(`authenticator_data too short for sign count: ${buf.length} bytes`);
  }
  return buf.readUInt32BE(33);
}

// ── Express Middleware Helper ─────────────────────────────────────────────────

/**
 * Express middleware factory for HPP certificate verification.
 *
 * Usage:
 *   const hppMiddleware = createHppMiddleware({
 *     publicKeyPath: './hpp-server-pubkey.pem',
 *     expectedRpId: 'example.com',
 *     replayStore: myRedisReplayStore,  // must implement has(id) and set(id, ttlMs)
 *   });
 *   app.post('/api/hpp', hppMiddleware, (req, res) => { ... });
 *
 * @param {object} config
 * @param {string} config.publicKeyPath — Path to HPP public key PEM
 * @param {string} config.expectedRpId — Your site's eTLD+1
 * @param {object} [config.replayStore] — Store with has(id) and set(id, ttlMs) methods
 */
function createHppMiddleware(config) {
  const publicKey = loadHppPublicKey(config.publicKeyPath);

  return async function hppVerify(req, res, next) {
    const cert = req.body;

    // Verify certificate
    const result = await verifyPresenceCertificate(cert, publicKey, {
      expectedRpId: config.expectedRpId,
    });

    if (!result.valid) {
      return res.status(401).json({ error: result.error, detail: result.detail });
    }

    // Replay check
    if (config.replayStore) {
      const used = await config.replayStore.has(cert.cert_id);
      if (used) {
        return res.status(401).json({ error: 'ALREADY_USED', detail: 'Certificate already consumed' });
      }
      const ttl = Math.max(0, cert.expiry_ms - Date.now());
      await config.replayStore.set(cert.cert_id, ttl);
    }

    // Attach verification result to request
    req.hppCert = result;
    next();
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  verifyPresenceCertificate,
  loadHppPublicKey,
  loadHppPublicKeyFromString,
  createHppMiddleware,
  buildCanonicalPayload,
  extractUVFlag,
  extractSignCount,
  base64urlToBuffer,
  SIGNED_FIELDS,
  REQUIRED_FIELDS,
};

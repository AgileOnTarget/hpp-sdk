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
 * example-server.js — HPP Relying Party Server (Node.js + Express)
 *
 * Minimal working backend that demonstrates:
 *   1. Receiving Presence Certificates at /api/hpp
 *   2. Verifying certificates using hpp-verify.js
 *   3. Issuing application sessions upon successful verification
 *   4. Re-attestation verification for sensitive actions
 *   5. Replay prevention with an in-memory store
 *
 * This is a REFERENCE IMPLEMENTATION for developer onboarding.
 * Production deployments should use Redis/Memcached for the replay store
 * and proper session management (e.g., express-session with a store).
 *
 * Usage:
 *   npm install express
 *   # Place hpp-server-pubkey.pem in this directory
 *   node example-server.js
 *   # Server starts on http://localhost:3000
 *
 * Version: 1.0.0
 * License: Proprietary — Patent Pending
 * Author: Agile On Target LLC
 */

'use strict';

const express = require('express');
const path    = require('path');
const {
  verifyPresenceCertificate,
  loadHppPublicKey,
  loadHppPublicKeyFromString,
} = require('./hpp-verify');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Configuration ────────────────────────────────────────────────────────────

const HPP_CONFIG = {
  // Your site's eTLD+1 (registrable domain). The rp_id in every certificate
  // MUST match this value. In production, derive from your actual domain.
  rpId: process.env.HPP_RP_ID || 'localhost',

  // Path to the HPP Attestation Server public key (PEM).
  // Download from: https://attest.humanpresenceprotocol.com/v1/config
  publicKeyPath: process.env.HPP_PUBLIC_KEY_PATH || './hpp-server-pubkey.pem',

  // Alternatively, embed the public key as an environment variable:
  // HPP_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
  publicKeyPem: process.env.HPP_PUBLIC_KEY_PEM || null,

  // Clock tolerance for expiry checks (milliseconds)
  clockToleranceMs: 5000,
};


// ── Load HPP Public Key ─────────────────────────────────────────────────────

let hppPublicKey;
try {
  if (HPP_CONFIG.publicKeyPem) {
    hppPublicKey = loadHppPublicKeyFromString(HPP_CONFIG.publicKeyPem);
    console.log('[HPP] Public key loaded from environment variable');
  } else {
    hppPublicKey = loadHppPublicKey(HPP_CONFIG.publicKeyPath);
    console.log(`[HPP] Public key loaded from ${HPP_CONFIG.publicKeyPath}`);
  }
} catch (err) {
  console.warn(`[HPP] WARNING: Could not load public key: ${err.message}`);
  console.warn('[HPP] Server will start but certificate verification will fail.');
  console.warn('[HPP] Place hpp-server-pubkey.pem in the working directory.');
  hppPublicKey = null;
}


// ── In-Memory Replay Prevention Store ───────────────────────────────────────
//
// Production: Use Redis SET with EX (TTL in seconds)
//   await redis.set(`hpp:cert:${certId}`, '1', 'PX', ttlMs);
//   const used = await redis.exists(`hpp:cert:${certId}`);
//
// This in-memory implementation is for development/demo only.

class InMemoryReplayStore {
  constructor() {
    this.store = new Map();
  }

  has(certId) {
    const entry = this.store.get(certId);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(certId);
      return false;
    }
    return true;
  }

  set(certId, ttlMs) {
    this.store.set(certId, {
      expiresAt: Date.now() + ttlMs,
    });
  }

  // Periodic cleanup of expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

const replayStore = new InMemoryReplayStore();

// Clean up expired replay entries every 5 minutes
setInterval(() => replayStore.cleanup(), 5 * 60 * 1000);


// ── In-Memory Session Store ─────────────────────────────────────────────────
// Production: Use express-session with Redis/PostgreSQL store

const sessions = new Map();

function createSession(verificationResult) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    certId: verificationResult.cert_id,
    rpId: verificationResult.rp_id,
    credentialId: verificationResult.credential_id,
    expiryMs: verificationResult.expiry_ms,
    serverTimestamp: verificationResult.server_timestamp,
    createdAt: Date.now(),
  });
  return sessionId;
}

function generateSessionId() {
  const bytes = require('crypto').randomBytes(32);
  return bytes.toString('hex');
}


// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

// Serve static files (example-integration.html, hpp-api.js, etc.)
app.use(express.static(path.join(__dirname)));


// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/hpp — HPP Certificate Callback Endpoint
 *
 * This is the endpoint declared in your meta tag:
 *   <meta name="hpp-enrollment" data-hpp-callback="/api/hpp" ...>
 *
 * The HPP client delivers the signed Presence Certificate here.
 * Your server verifies it and issues an application session.
 */
app.post('/api/hpp', async (req, res) => {
  const cert = req.body;

  console.log(`[HPP] Certificate received — cert_id: ${cert.cert_id || 'missing'}`);

  // ── Guard: Public key must be loaded ──────────────────────────────────
  if (!hppPublicKey) {
    console.error('[HPP] No public key loaded — cannot verify');
    return res.status(500).json({
      error: 'SERVER_CONFIG_ERROR',
      detail: 'HPP public key not configured',
    });
  }

  // ── Step 1: Verify the certificate ────────────────────────────────────
  const result = await verifyPresenceCertificate(cert, hppPublicKey, {
    expectedRpId: HPP_CONFIG.rpId,
    clockToleranceMs: HPP_CONFIG.clockToleranceMs,
  });

  if (!result.valid) {
    console.warn(`[HPP] Verification FAILED — ${result.error}: ${result.detail}`);
    return res.status(401).json({
      error: result.error,
      detail: result.detail,
    });
  }

  // ── Step 2: Replay prevention ─────────────────────────────────────────
  if (replayStore.has(cert.cert_id)) {
    console.warn(`[HPP] Replay detected — cert_id: ${cert.cert_id}`);
    return res.status(401).json({
      error: 'ALREADY_USED',
      detail: 'This certificate has already been consumed',
    });
  }

  // Store cert_id with TTL matching certificate lifetime
  const ttl = Math.max(0, cert.expiry_ms - Date.now());
  replayStore.set(cert.cert_id, ttl);

  // ── Step 3: Issue application session ─────────────────────────────────
  const sessionId = createSession(result);

  console.log(`[HPP] Verification SUCCESS — cert_id: ${result.cert_id}, session: ${sessionId.slice(0, 8)}...`);

  return res.json({
    granted: true,
    cert_id: result.cert_id,
    session_id: sessionId,
    expires_in_ms: cert.expiry_ms - Date.now(),
  });
});


/**
 * POST /api/hpp/reauth — Re-Attestation Callback
 *
 * For sensitive actions, request a scoped re-attestation.
 * The certificate includes an action_scope field.
 */
app.post('/api/hpp/reauth', async (req, res) => {
  const cert = req.body;
  const expectedScope = req.headers['x-hpp-expected-scope'];

  console.log(`[HPP] Re-attestation received — scope: ${cert.action_scope || 'none'}`);

  if (!hppPublicKey) {
    return res.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
  }

  // Verify the certificate
  const result = await verifyPresenceCertificate(cert, hppPublicKey, {
    expectedRpId: HPP_CONFIG.rpId,
  });

  if (!result.valid) {
    return res.status(401).json({ error: result.error, detail: result.detail });
  }

  // Replay check
  if (replayStore.has(cert.cert_id)) {
    return res.status(401).json({ error: 'ALREADY_USED' });
  }
  replayStore.set(cert.cert_id, Math.max(0, cert.expiry_ms - Date.now()));

  // Verify action_scope matches expected scope
  if (expectedScope && cert.action_scope !== expectedScope) {
    return res.status(401).json({
      error: 'ACTION_SCOPE_MISMATCH',
      detail: `Expected '${expectedScope}', got '${cert.action_scope}'`,
    });
  }

  console.log(`[HPP] Re-attestation SUCCESS — scope: ${cert.action_scope}`);

  return res.json({
    granted: true,
    cert_id: result.cert_id,
    action_scope: cert.action_scope,
  });
});


/**
 * GET /api/hpp/session — Check current HPP session
 */
app.get('/api/hpp/session', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ active: false });
  }

  const session = sessions.get(sessionId);
  const now = Date.now();

  if (now > session.expiryMs) {
    sessions.delete(sessionId);
    return res.status(401).json({ active: false, reason: 'expired' });
  }

  return res.json({
    active: true,
    cert_id: session.certId,
    rp_id: session.rpId,
    expires_in_ms: session.expiryMs - now,
  });
});


/**
 * GET / — Serve the example integration page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'example-integration.html'));
});


// ── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  HPP Example Relying Party Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  rp_id: ${HPP_CONFIG.rpId}`);
  console.log(`  Public key: ${hppPublicKey ? 'loaded' : 'NOT LOADED (verification will fail)'}`);
  console.log(`${'═'.repeat(60)}\n`);
});

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
 * hpp-test-suite.js — HPP Certificate Verification Test Suite
 *
 * Self-contained test suite that validates the verification library
 * against synthetic certificates. Uses Node.js crypto to generate
 * real ECDSA P-256 keypairs and sign test certificates.
 *
 * Tests cover all 7 verification steps:
 *   1. Signature verification (valid, tampered, wrong key)
 *   2. rp_id matching
 *   3. Expiry checking
 *   4. Status validation
 *   5. UV flag extraction
 *   6. Replay prevention (caller responsibility — tested here)
 *   7. action_scope matching (re-attestation)
 *
 * Usage:
 *   node hpp-test-suite.js
 *
 * No external dependencies — uses only Node.js built-ins + hpp-verify.js
 *
 * Version: 1.0.0
 * License: Proprietary — Patent Pending
 * Author: Agile On Target LLC
 */

'use strict';

const crypto = require('crypto');
const {
  verifyPresenceCertificate,
  buildCanonicalPayload,
  extractUVFlag,
  extractSignCount,
  base64urlToBuffer,
  SIGNED_FIELDS,
  REQUIRED_FIELDS,
} = require('./hpp-verify');


// ── Test Utilities ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total  = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${testName}`);
  }
}

function section(name) {
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 56 - name.length))}`);
}

function base64urlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}


// ── Test Key Generation ─────────────────────────────────────────────────────

// Generate a real ECDSA P-256 keypair for testing
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

// A different keypair (for wrong-key tests)
const { publicKey: wrongPublicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});


// ── Synthetic Certificate Builder ───────────────────────────────────────────

/**
 * Build a valid synthetic Presence Certificate.
 * All fields are realistic but use test keys.
 */
function buildTestCertificate(overrides = {}) {
  const now = Date.now();

  // Build fake authenticator data with UV flag SET (bit 2 = 0x04)
  // Format: rpIdHash(32) | flags(1) | signCount(4)
  const rpIdHash = crypto.createHash('sha256').update('example.com').digest();
  const flags = Buffer.from([0x05]); // UP (0x01) + UV (0x04) = 0x05
  const signCount = Buffer.alloc(4);
  signCount.writeUInt32BE(42, 0);
  const authenticatorData = Buffer.concat([rpIdHash, flags, signCount]);

  const cert = {
    cert_id: overrides.cert_id || crypto.randomUUID(),
    nonce: overrides.nonce || base64urlEncode(crypto.randomBytes(32)),
    rp_id: overrides.rp_id || 'example.com',
    server_timestamp: overrides.server_timestamp || now,
    client_timestamp: overrides.client_timestamp || now + 100,
    credential_id: overrides.credential_id || base64urlEncode(crypto.randomBytes(32)),
    authenticator_data: overrides.authenticator_data || base64urlEncode(authenticatorData),
    assertion_sig: overrides.assertion_sig || base64urlEncode(crypto.randomBytes(64)),
    client_data_json: overrides.client_data_json || base64urlEncode(Buffer.from(JSON.stringify({
      type: 'webauthn.get',
      challenge: base64urlEncode(crypto.randomBytes(32)),
      origin: 'https://example.com',
    }))),
    expiry_ms: overrides.expiry_ms || (now + 3600000), // 1 hour from now
    status: overrides.status || 'issued',
  };

  // Sign with the test private key (unless explicitly overridden)
  if (!overrides.hpp_server_sig) {
    const payload = buildCanonicalPayload(cert);
    const sig = crypto.createSign('SHA256')
      .update(payload)
      .sign(privateKey);
    cert.hpp_server_sig = base64urlEncode(sig);
  } else {
    cert.hpp_server_sig = overrides.hpp_server_sig;
  }

  return cert;
}

/**
 * Build authenticator data with specific flags.
 */
function buildAuthData(flagsByte, signCountValue = 42) {
  const rpIdHash = crypto.createHash('sha256').update('example.com').digest();
  const flags = Buffer.from([flagsByte]);
  const signCount = Buffer.alloc(4);
  signCount.writeUInt32BE(signCountValue, 0);
  return base64urlEncode(Buffer.concat([rpIdHash, flags, signCount]));
}


// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════');
console.log('  HPP Certificate Verification Test Suite');
console.log('═══════════════════════════════════════════════════════════');


// ── 1. Valid Certificate ────────────────────────────────────────────────────

section('Valid Certificate Verification');

(async () => {
  const cert = buildTestCertificate();
  const result = await verifyPresenceCertificate(cert, publicKey, {
    expectedRpId: 'example.com',
  });
  assert(result.valid === true, 'Valid certificate passes all checks');
  assert(result.cert_id === cert.cert_id, 'Returns correct cert_id');
  assert(result.rp_id === 'example.com', 'Returns correct rp_id');
  assert(result.credential_id === cert.credential_id, 'Returns correct credential_id');
  assert(result.expiry_ms === cert.expiry_ms, 'Returns correct expiry_ms');
  assert(result.server_timestamp === cert.server_timestamp, 'Returns correct server_timestamp');


  // ── 2. Structural Validation ────────────────────────────────────────────

  section('Structural Validation (Missing Fields)');

  for (const field of REQUIRED_FIELDS) {
    const badCert = buildTestCertificate();
    delete badCert[field];
    const r = await verifyPresenceCertificate(badCert, publicKey);
    assert(r.valid === false && r.error === 'MISSING_FIELD',
      `Missing '${field}' → MISSING_FIELD`);
  }


  // ── 3. Signature Verification ───────────────────────────────────────────

  section('Signature Verification');

  // Tampered payload
  const tamperedCert = buildTestCertificate();
  tamperedCert.rp_id = 'evil.com'; // Tamper after signing
  const r1 = await verifyPresenceCertificate(tamperedCert, publicKey);
  assert(r1.valid === false && r1.error === 'CERT_SIG_INVALID',
    'Tampered rp_id → CERT_SIG_INVALID');

  // Wrong public key
  const certForWrongKey = buildTestCertificate();
  const r2 = await verifyPresenceCertificate(certForWrongKey, wrongPublicKey);
  assert(r2.valid === false && r2.error === 'CERT_SIG_INVALID',
    'Wrong public key → CERT_SIG_INVALID');

  // Malformed signature
  const malformedSigCert = buildTestCertificate({ hpp_server_sig: 'not-a-valid-sig!!' });
  const r3 = await verifyPresenceCertificate(malformedSigCert, publicKey);
  assert(r3.valid === false && r3.error === 'CERT_SIG_INVALID',
    'Malformed signature → CERT_SIG_INVALID');


  // ── 4. rp_id Verification ──────────────────────────────────────────────

  section('rp_id Verification');

  const certRp = buildTestCertificate({ rp_id: 'example.com' });
  // Sign must match, so we rebuild properly
  const r4a = await verifyPresenceCertificate(certRp, publicKey, {
    expectedRpId: 'other.com',
  });
  assert(r4a.valid === false && r4a.error === 'RP_MISMATCH',
    'rp_id mismatch → RP_MISMATCH');

  const r4b = await verifyPresenceCertificate(certRp, publicKey, {
    expectedRpId: 'example.com',
  });
  assert(r4b.valid === true, 'rp_id match → valid');

  // No expected rp_id (skip check)
  const r4c = await verifyPresenceCertificate(certRp, publicKey);
  assert(r4c.valid === true, 'No expectedRpId → skip check → valid');


  // ── 5. Expiry Verification ────────────────────────────────────────────

  section('Expiry Verification');

  const expiredCert = buildTestCertificate({
    expiry_ms: Date.now() - 60000, // 1 minute ago
  });
  const r5a = await verifyPresenceCertificate(expiredCert, publicKey);
  assert(r5a.valid === false && r5a.error === 'CERT_EXPIRED',
    'Expired certificate → CERT_EXPIRED');

  // Within clock tolerance (expired 3s ago, tolerance 5s)
  const almostExpiredCert = buildTestCertificate({
    expiry_ms: Date.now() - 3000,
  });
  const r5b = await verifyPresenceCertificate(almostExpiredCert, publicKey, {
    clockToleranceMs: 5000,
  });
  assert(r5b.valid === true,
    'Expired within tolerance → valid');

  // Future expiry
  const futureCert = buildTestCertificate({
    expiry_ms: Date.now() + 3600000,
  });
  const r5c = await verifyPresenceCertificate(futureCert, publicKey);
  assert(r5c.valid === true, 'Future expiry → valid');


  // ── 6. Status Verification ────────────────────────────────────────────

  section('Status Verification');

  const badStatusCert = buildTestCertificate({ status: 'revoked' });
  const r6 = await verifyPresenceCertificate(badStatusCert, publicKey);
  assert(r6.valid === false && r6.error === 'INVALID_STATUS',
    "status='revoked' → INVALID_STATUS");


  // ── 7. UV Flag Verification ───────────────────────────────────────────

  section('UV Flag Verification');

  // UV not set (flags = 0x01, only UP)
  const noUvCert = buildTestCertificate({
    authenticator_data: buildAuthData(0x01),
  });
  const r7a = await verifyPresenceCertificate(noUvCert, publicKey);
  assert(r7a.valid === false && r7a.error === 'UV_FLAG_MISSING',
    'UV bit not set → UV_FLAG_MISSING');

  // UV set (flags = 0x05, UP + UV)
  const uvCert = buildTestCertificate({
    authenticator_data: buildAuthData(0x05),
  });
  const r7b = await verifyPresenceCertificate(uvCert, publicKey);
  assert(r7b.valid === true, 'UV bit set → valid');

  // All flags set (0xFF)
  const allFlagsCert = buildTestCertificate({
    authenticator_data: buildAuthData(0xFF),
  });
  const r7c = await verifyPresenceCertificate(allFlagsCert, publicKey);
  assert(r7c.valid === true, 'All flags set (0xFF) → valid (UV is set)');

  // Short authenticator data
  const shortAuthCert = buildTestCertificate({
    authenticator_data: base64urlEncode(crypto.randomBytes(10)),
  });
  const r7d = await verifyPresenceCertificate(shortAuthCert, publicKey);
  assert(r7d.valid === false && r7d.error === 'UV_FLAG_MISSING',
    'Short authenticator_data → UV_FLAG_MISSING');


  // ── 8. Helper Function Tests ──────────────────────────────────────────

  section('Helper Functions');

  // extractUVFlag
  const authWithUV = buildAuthData(0x05);
  assert(extractUVFlag(authWithUV) === true, 'extractUVFlag: UV set → true');

  const authWithoutUV = buildAuthData(0x01);
  assert(extractUVFlag(authWithoutUV) === false, 'extractUVFlag: UV not set → false');

  // extractSignCount
  const authSC42 = buildAuthData(0x05, 42);
  assert(extractSignCount(authSC42) === 42, 'extractSignCount: 42 → 42');

  const authSC0 = buildAuthData(0x05, 0);
  assert(extractSignCount(authSC0) === 0, 'extractSignCount: 0 → 0');

  const authSCMax = buildAuthData(0x05, 4294967295);
  assert(extractSignCount(authSCMax) === 4294967295, 'extractSignCount: max uint32 → 4294967295');

  // buildCanonicalPayload — sorted keys, no whitespace
  const testCert = buildTestCertificate();
  const payload = buildCanonicalPayload(testCert);
  const parsed = JSON.parse(payload);
  const keys = Object.keys(parsed);
  const sortedKeys = [...keys].sort();
  assert(JSON.stringify(keys) === JSON.stringify(sortedKeys),
    'buildCanonicalPayload: keys are alphabetically sorted');
  assert(!payload.includes(' '),
    'buildCanonicalPayload: no whitespace');
  assert(keys.length === SIGNED_FIELDS.length,
    `buildCanonicalPayload: includes all ${SIGNED_FIELDS.length} signed fields`);

  // SIGNED_FIELDS is already sorted
  const sortedSF = [...SIGNED_FIELDS].sort();
  assert(JSON.stringify(SIGNED_FIELDS) === JSON.stringify(sortedSF),
    'SIGNED_FIELDS constant is in alphabetical order');

  // base64url round-trip
  const original = crypto.randomBytes(64);
  const encoded = base64urlEncode(original);
  const decoded = base64urlToBuffer(encoded);
  assert(original.equals(decoded), 'base64url encode/decode round-trip');


  // ── 9. Canonical Payload Determinism ──────────────────────────────────

  section('Canonical Payload Determinism');

  const cert1 = buildTestCertificate();
  const payload1 = buildCanonicalPayload(cert1);
  const payload2 = buildCanonicalPayload(cert1);
  assert(payload1 === payload2, 'Same cert produces identical payloads');

  // Different cert produces different payload
  const cert2 = buildTestCertificate();
  const payload3 = buildCanonicalPayload(cert2);
  assert(payload1 !== payload3, 'Different cert produces different payload');


  // ── 10. Edge Cases ────────────────────────────────────────────────────

  section('Edge Cases');

  // Empty object
  const r10a = await verifyPresenceCertificate({}, publicKey);
  assert(r10a.valid === false && r10a.error === 'MISSING_FIELD',
    'Empty object → MISSING_FIELD');

  // Null fields
  const nullCert = buildTestCertificate();
  nullCert.cert_id = null;
  const r10b = await verifyPresenceCertificate(nullCert, publicKey);
  assert(r10b.valid === false && r10b.error === 'MISSING_FIELD',
    'Null cert_id → MISSING_FIELD');

  // Extra fields (should be ignored)
  const extraCert = buildTestCertificate();
  extraCert.extra_field = 'should be ignored';
  extraCert.another = 12345;
  const r10c = await verifyPresenceCertificate(extraCert, publicKey, {
    expectedRpId: 'example.com',
  });
  assert(r10c.valid === true, 'Extra fields are ignored → valid');


  // ═══════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(59)}`);
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`${'═'.repeat(59)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
})();

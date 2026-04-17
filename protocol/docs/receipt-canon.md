# Verifier Receipt Canonical String — Human Presence Protocol (HPP)

This document defines the canonical string representation for HPP verifier receipts.

**Purpose:**

- Produce a stable `receipt_hash` independent of JSON formatting
- Enable deterministic validation across SDKs
- Prevent cross-site replay by binding receipts to verifier and site origin
- Provide a compact, signed truth artifact usable as a ledger anchor

**This document is normative.**

---

## 1. Definitions

- **Receipt:** A signed verifier artifact proving that a specific event was verified and accepted or rejected under specific constraints and time windows.
- **Canonical Receipt String:** A deterministic, line-delimited string representation of a receipt, used for hashing and signature verification.
- **`receipt_hash`:** `SHA-256(canonical_receipt_string_bytes)`
- **`receipt_signature`:** A verifier signature over `receipt_hash` using a verifier signing key.

---

## 2. Required Receipt Fields

A verifier MUST include the following fields in every receipt:

- `receipt_version`
- `receipt_id`
- `receipt_type`
- `status`
- `device_public_key`
- `epoch_id`
- `nonce`
- `issued_at`
- `verifier_time`
- `verifier_base_url`
- `site_origin`
- `client_confirmed_at`
- `submit_received_at`
- `strict_window_seconds`
- `score_after`
- `credits_after`
- `delta_credits`
- `prev_receipt_hash`
- `receipt_hash`
- `receipt_signature`
- `verifier_key_id`

**Notes:**

- `client_confirmed_at` is set by the client at biometric confirmation time.
- `submit_received_at` is set by the verifier upon receipt of the submission.
- `verifier_time` is the verifier signing time.
- `prev_receipt_hash` links receipts into a verifier-side chain per device key. This is OPTIONAL but recommended for auditability.

---

## 3. Canonical Encoding Rules

To guarantee stability across languages:

- UTF-8 encoding
- LF line endings only (`\n`)
- Field order is fixed and MUST NOT change within a receipt version
- Key names are lowercase `snake_case`
- Values are rendered as:
  - **Integers:** base 10, no commas, no whitespace
  - **Booleans:** `true` or `false`
  - **Strings:** exact bytes, no JSON escaping
  - **Empty optional fields:** empty string
- No trailing whitespace on any line
- Final newline REQUIRED

---

## 4. Canonical Receipt String Format

The canonical receipt string for `receipt_version = 1` is:

```
hpp_receipt_v1
receipt_version=<receipt_version>
receipt_id=<receipt_id>
receipt_type=<receipt_type>
status=<status>
device_public_key=<device_public_key>
epoch_id=<epoch_id>
nonce=<nonce>
issued_at=<issued_at>
client_confirmed_at=<client_confirmed_at>
submit_received_at=<submit_received_at>
verifier_time=<verifier_time>
strict_window_seconds=<strict_window_seconds>
verifier_base_url=<verifier_base_url>
site_origin=<site_origin>
score_after=<score_after>
credits_after=<credits_after>
delta_credits=<delta_credits>
prev_receipt_hash=<prev_receipt_hash>
verifier_key_id=<verifier_key_id>
```

Then compute:

```
receipt_hash = SHA-256(UTF8(canonical_receipt_string))
receipt_signature = Sign(verifier_private_key, receipt_hash)
```

The verifier returns `receipt_hash` and `receipt_signature` alongside the human-readable JSON. The device computes the same canonical string and verifies both hash and signature.

---

## 5. Field Semantics

- **`receipt_type`:** Examples: `pulse_accept`, `pulse_reject`, `burn_accept`, `burn_reject`
- **`status`:** `accepted` or `rejected`
- **`epoch_id`:** A verifier-defined epoch identifier, e.g., `2026-02-06` in UTC
- **`nonce`:** Verifier-issued nonce bound to epoch. MUST be unique and non-replayable.
- **`issued_at`:** Client-side timestamp when the client formed the submission. Used for strict window evaluation.
- **`client_confirmed_at`:** Client-side timestamp at the moment biometric confirmation succeeded.
- **`submit_received_at`:** Verifier timestamp when request was received.

---

## 6. Relationship to CANONICAL_SIGNING_STRINGS.md

This document is a focused companion to CANONICAL_SIGNING_STRINGS.md. The receipt format defined here MUST match the `hpp_receipt_v1` format in that document.

If any discrepancy exists, CANONICAL_SIGNING_STRINGS.md is authoritative.

---

## 7. Verification Steps

Implementations MUST:

1. Reconstruct canonical receipt string from receipt fields
2. Compute `SHA-256` of canonical string
3. Compare with received `receipt_hash`
4. Verify `receipt_signature` using verifier public key for `verifier_key_id`
5. Validate `site_origin` matches expected origin
6. Validate `verifier_base_url` matches expected verifier

If any step fails, the receipt MUST be rejected.

---

## 8. Summary

Receipts are the truth artifacts of HPP.

Canonical encoding ensures they are verifiable, portable, and tamper-evident across any language, platform, or SDK.

# Canonical Signing Strings — Human Presence Protocol (HPP)

This document defines the canonical string encodings used for cryptographic hashing and signing in HPP.

**Purpose:**

- Guarantee deterministic hashes across languages and SDKs
- Prevent ambiguity in serialization
- Enable independent reimplementation
- Provide auditability and long-term stability

**This document is normative.**

---

## 1. Global Encoding Rules

All canonical strings MUST follow these rules:

1. UTF-8 encoding
2. LF line endings (`\n`)
3. Fixed field order per structure
4. Lowercase `snake_case` field names
5. No extra whitespace
6. Empty optional fields represented as empty string
7. Integers in base 10, no separators
8. Booleans as `true` or `false`
9. Final newline REQUIRED

---

## 2. Hash Function

Unless explicitly specified otherwise:

```
hash = SHA-256(UTF8(canonical_string))
```

---

## 3. Ledger Entry Canonical String (`hpp_ledger_v1`)

Used for local integrity-protected ledger entries.

### Canonical Format

```
hpp_ledger_v1
ledger_id=<ledger_id>
device_public_key=<device_public_key>
entry_version=<entry_version>
entry_index=<entry_index>
prev_entry_hash=<prev_entry_hash>
entry_time=<entry_time>
event_type=<event_type>
event_id=<event_id>
epoch_id=<epoch_id>
delta_credits=<delta_credits>
cached_credits_after=<cached_credits_after>
cached_score_after=<cached_score_after>
verifier_receipt_hash=<verifier_receipt_hash>
verifier_receipt_id=<verifier_receipt_id>
site_origin=<site_origin>
verifier_base_url=<verifier_base_url>
note=<note>
```

### Derived Fields

```
entry_hash = SHA-256(canonical_string)
device_signature = Sign(device_private_key, entry_hash)
```

---

## 4. Receipt Canonical String (`hpp_receipt_v1`)

Used for verifier receipts.

### Canonical Format

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

### Derived Fields

```
receipt_hash = SHA-256(canonical_string)
receipt_signature = Sign(verifier_private_key, receipt_hash)
```

---

## 5. Verification Requirements

### Ledger Entry Verification

Implementations MUST:

1. Recompute canonical string
2. Recompute `entry_hash`
3. Compare with stored `entry_hash`
4. Verify `device_signature`
5. Validate `prev_entry_hash` chaining
6. Validate arithmetic consistency

If any step fails, the ledger is tampered.

### Receipt Verification

Implementations MUST:

1. Recompute canonical string
2. Recompute `receipt_hash`
3. Compare with received `receipt_hash`
4. Verify `receipt_signature` using verifier public key for `verifier_key_id`

If any step fails, the receipt is invalid.

---

## 6. Field Immutability

Fields included in canonical strings MUST NOT be renamed, reordered, removed, or retyped within a version.

Any change requires a new version header:

```
hpp_ledger_v2
hpp_receipt_v2
```

---

## 7. Security Rationale

Canonical strings prevent:

- JSON canonicalization attacks
- Locale-dependent formatting differences
- Ambiguous whitespace attacks
- Field injection

They enable:

- Independent verification
- Long-term archival
- Deterministic audits

---

## 8. Implementation Checklist

- [ ] Hardcode field order
- [ ] Use exact header line
- [ ] Always include final newline
- [ ] Reject unknown or missing fields
- [ ] Fail closed

---

## 9. Summary

If two independent implementations generate the same canonical string, they will generate the same hash.

If they generate the same hash, they can verify the same signature.

This property is foundational to HPP.

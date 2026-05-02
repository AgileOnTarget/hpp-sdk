# Ledger Architecture — Human Presence Protocol (HPP)

This document defines a local, integrity-protected ledger format for cached score and credits on device.

The ledger is a cached view only. The verifier-signed receipt remains the truth artifact.

---

## 1. Design Goals

- **Integrity:** A user cannot increase cached credits or score without detection
- **Determinism:** The same inputs produce the same signing string
- **Minimalism:** Small surface area, easy to audit
- **Offline safe:** Device can render a cached balance and history without trusting app storage
- **Recovery aware:** If keys reset, the ledger resets cleanly

---

## 2. Threat Model for the Local Ledger

- We assume the app sandbox can be modified on jailbroken devices
- We assume the Secure Enclave private key is non-exportable
- We assume the verifier receipt is authoritative

The ledger prevents casual tampering and provides strong evidence of modification. It is not designed to defeat a nation-state with physical access.

---

## 3. Key Material

The ledger uses two distinct keys:

### Device Signing Key (Secure Enclave)

- **Purpose:** Sign each ledger entry
- Non-exportable
- Biometric gating optional for ledger signing (required for Pulse signing)

### Device Storage Key (Optional)

- **Purpose:** Encrypt the ledger blob at rest
- **Storage:** Keychain, ThisDeviceOnly
- Optional — integrity is the primary requirement, privacy is secondary since the ledger holds no biometrics

---

## 4. Ledger Object Model

The ledger is an append-only chain of entries. Each entry is individually signed and hash-chained.

### 4.1 Ledger Header

Stored once, updated only on epoch reset or migration.

**Fields:**

- `version`: integer
- `ledger_id`: random 16 bytes, base64
- `device_public_key`: base64
- `created_at`: unix seconds
- `epoch_reset_count`: integer
- `verifier_base_url`: string
- `site_binding_mode`: string (`none` or `per_site`)
- `last_entry_hash`: base64 (initially all zeros)
- `entry_count`: integer

### 4.2 Ledger Entry

Each entry records a state transition based on a local event plus optional verifier receipt.

**Fields:**

- `entry_version`: integer
- `entry_index`: integer (starting at 1)
- `prev_entry_hash`: base64
- `entry_time`: unix seconds
- `event_type`: string
- `event_id`: random 16 bytes, base64
- `epoch_id`: string
- `delta_credits`: integer (can be negative)
- `cached_credits_after`: integer (must be non-negative)
- `cached_score_after`: integer (must be non-negative)
- `verifier_receipt_hash`: base64 (optional)
- `verifier_receipt_id`: string (optional)
- `site_origin`: string (optional)
- `verifier_base_url`: string (optional)
- `note`: string (optional, length-limited)
- `entry_hash`: base64
- `device_signature`: base64

---

## 5. Event Types

- `pulse_submitted`
- `receipt_accepted`
- `receipt_rejected`
- `burn_initiated`
- `burn_receipt_accepted`
- `burn_receipt_rejected`
- `epoch_missed`
- `epoch_decay_applied`
- `epoch_cliff_reset`
- `manual_reset`

---

## 6. Canonicalization and Signing

Do not sign raw JSON. Sign a deterministic canonical string.

The canonical format is defined in CANONICAL_SIGNING_STRINGS.md under `hpp_ledger_v1`.

```
entry_hash = SHA-256(canonical_string)
device_signature = Sign(device_private_key, entry_hash)
```

---

## 7. Hash Chaining

Each entry includes `prev_entry_hash`, creating an append-only chain.

- Entry 1: `prev_entry_hash` = all zeros
- Entry N: `prev_entry_hash` = `entry_hash` of entry N-1

Breaking the chain is detectable by any verifier that replays the ledger.

---

## 8. Verification

To verify ledger integrity:

1. Start at entry 1
2. Recompute canonical string for each entry
3. Recompute `entry_hash`
4. Compare with stored `entry_hash`
5. Verify `device_signature`
6. Validate `prev_entry_hash` chaining
7. Validate arithmetic consistency (`cached_credits_after`, `cached_score_after`)

If any step fails, the ledger is tampered.

---

## 9. Arithmetic Invariants

For every entry:

```
cached_credits_after = previous_cached_credits_after + delta_credits
cached_credits_after >= 0
cached_score_after >= 0
```

These are enforced at write time and verified at audit time.

---

## 10. Storage Recommendations

### iOS

- Keychain for signing key reference
- File-based storage for ledger entries (JSON lines or SQLite)
- `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`

### Android

- Keystore for signing key
- EncryptedSharedPreferences or encrypted SQLite for entries

---

## 11. Reset Behavior

On device migration or epoch cliff reset:

- Ledger header `epoch_reset_count` increments
- New `ledger_id` is generated
- `last_entry_hash` resets to all zeros
- Previous ledger MAY be archived but is no longer active

---

## 12. Summary

The local ledger is a tamper-evident cache. It does not replace the verifier as truth source.

It exists so the device can:

- Show the user their score and credits offline
- Detect local tampering
- Provide audit evidence if questioned

The verifier receipt chain remains authoritative. The ledger is a mirror, not a master.

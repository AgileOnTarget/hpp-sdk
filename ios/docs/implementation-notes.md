# iOS Implementation Notes — Secure Enclave and Keychain Access Control

These notes describe how an HPP iOS client SHOULD store keys and state, and how it SHOULD enforce biometric-gated signing using Secure Enclave and Keychain access control.

**Goal:** The device can only produce a Pulse after successful local biometric verification, while keeping secrets non-exportable and minimizing privacy leakage.

---

## 1. Key Material Classes

HPP iOS client uses three distinct secret classes:

- **Secure Enclave private key** (non-exportable)
- **Device state secrets** (small blobs, integrity-protected)
- **Non-secret metadata** (public key, last epoch, cached status)

The only secret that must never be exportable is the private signing key.

---

## 2. Secure Enclave Key Pair

### Recommended Key Type

- Elliptic curve key generated in Secure Enclave
- Use `kSecAttrTokenIDSecureEnclave`
- EC key type suitable for signing (P-256 is typical)

### Access Control Requirements

Use `SecAccessControlCreateWithFlags` with flags that require user presence.

**Preferred flags:**

- `biometryCurrentSet`
- `privateKeyUsage`

**Meaning:**

- Biometric match required to use the key
- If enrolled biometrics change, access is invalidated and re-enrollment is required

This aligns strongly with HPP continuity integrity.

**Fallback if needed:**

- `biometryAny` + `privateKeyUsage`
- Only if you explicitly accept that biometric set changes do not force a reset

Do not use `userPresence` unless you are comfortable allowing passcode fallback. In HPP, passcode fallback is usually weaker than desired.

---

## 3. Keychain Accessibility Class

For HPP, you want a device-bound, non-migratable storage posture.

**Recommended:** `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`

**Meaning:**

- Requires device unlocked
- Cannot migrate to a new device via backups
- Prevents easy cloning through restore

This is consistent with one-primary-device semantics.

---

## 4. Creating Access Control Objects

**Recommended creation posture:**

- Accessibility: `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
- Flags: `biometryCurrentSet | privateKeyUsage`

**Operational implication:**

- The first signing attempt will trigger Face ID prompt automatically through Keychain
- If Face ID enrollment changes, the key becomes unusable and you force a re-enroll ceremony

This is desirable for resisting silent biometric changes.

---

## 5. Key Storage Strategy

### Private Key

Store as a Keychain item whose backing key is generated in Secure Enclave.

Store:

- Key reference
- Application tag
- Key type and size

Do not store raw key bytes.

### Public Key

Store as raw bytes or base64 string. Not sensitive, but should still be `ThisDeviceOnly` for cleanliness.

---

## 6. Non-Secret State

Items like `last_epoch_id`, `cached_score`, and `verifier_base_url` do not need Secure Enclave protection.

**Recommended storage:** `UserDefaults` or a local file, with integrity protection via the ledger hash chain (see [`../../protocol/docs/ledger-architecture.md`](../../protocol/docs/ledger-architecture.md)).

---

## 7. Biometric Gating Flow

For Pulse signing:

1. App requests Pulse generation
2. SDK calls Keychain sign operation with Secure Enclave key
3. System presents Face ID / Touch ID prompt
4. On success, Secure Enclave signs the canonical Pulse string
5. On failure, no signature is produced — Pulse attempt fails

The biometric prompt is triggered by the Keychain access control policy, not by the app calling `LAContext` directly. This is the preferred pattern because it ties biometric success directly to key use.

---

## 8. Error Handling

- **Biometric not enrolled:** Key creation fails at enrollment. App should guide user to Settings.
- **Biometric changed:** Key becomes unusable. App should detect and initiate re-enrollment.
- **Device locked:** Keychain access denied. Pulse attempt deferred.
- **Jailbroken device:** Key may still be secure in Secure Enclave, but app should detect jailbreak and flag status.

---

## 9. App Attest / DeviceCheck

**Recommended but optional in v1.**

If available:

- Generate App Attest key ID at enrollment
- Include attestation token in enrollment request to verifier
- Verifier can mark device as `attested` vs `unattested`

This provides an additional signal but is not required for core HPP operation.

---

## 10. Background Pulse Scheduling

iOS limits background execution. Recommended approach:

- Use `BGAppRefreshTask` for daily Pulse reminders
- User opens app → Pulse is generated immediately
- If app is not opened, background task prompts notification
- Do not rely on silent background execution for biometric operations — iOS requires foreground for Face ID

---

## 11. Summary

The iOS implementation leverages three Apple primitives:

- **Secure Enclave** for non-exportable key generation and signing
- **Keychain** for device-bound, biometric-gated access control
- **LocalAuthentication** (indirectly, via Keychain policy) for biometric verification

These map directly to HPP's core requirements: hardware-bound keys, biometric gating, and device-bound continuity.

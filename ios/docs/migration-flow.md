**HPP iOS DEVICE MIGRATION**

New Device Setup, Recovery, and Continuity Transfer


**1. Why Migration Matters**

HPP’s security model requires that the Secure Enclave private key is non-exportable and bound to a single device. When a user gets a new iPhone, the key does NOT transfer via iCloud Backup, iCloud Keychain, or Quick Start. This is by design — it enforces the one-primary-device constraint (Pro-D). But it means every iPhone upgrade requires an explicit migration ceremony.

This document defines the iOS-specific implementation of the migration protocol from 04A_14 (Device Recovery).

**2. iCloud Keychain Behavior — CRITICAL**

Secure Enclave keys created with kSecAttrAccessibleWhenUnlockedThisDeviceOnly and kSecAttrTokenIDSecureEnclave have two properties that prevent automatic migration:

— ThisDeviceOnly: The Keychain item is excluded from iCloud Keychain sync and device backups.

— SecureEnclave: The private key material physically cannot leave the chip. There is no API to export it.

This means: When a user sets up a new iPhone via Quick Start, iCloud Restore, or Mac backup restore, their HPP enrollment is NOT transferred. The new device has no signing key. The app will detect this on first launch and present the migration flow.

**3. Normal Migration (Old Device Available)**

This is the common case: user has both old and new iPhone during setup.

**Step 1: New device launches HPP**

App detects no Secure Enclave key exists. Generates a new P-256 key pair in Secure Enclave. Displays: “Welcome back. Let’s transfer your presence to this device.”

**Step 2: New device calls POST /v1/migration/start**

Sends new_device_public_key. Receives migration_id + challenge_token. Displays a QR code encoding the migration_id.

**Step 3: Old device scans QR**

User opens HPP on old device, taps “Transfer to New Device”, scans QR from new device. Old device displays: “Transfer your presence to \[new device model\]? This device will no longer be able to attest.”

**Step 4: Old device signs relinquish (biometric required)**

User authenticates with Face ID on old device. Old device signs the relinquish statement with its Secure Enclave key. Calls POST /v1/migration/relinquish. Old device displays: “Transfer complete. This device is no longer active.”

**Step 5: New device claims migration (biometric required)**

New device polls GET /v1/migration/status/{id} and detects status=relinquished. User authenticates with Face ID on new device. New device signs claim statement. Calls POST /v1/migration/claim. Receives: score_preserved, credits_preserved. New device displays: “Your presence has been transferred. Score: \[X\], Credits: \[Y\].”

Continuity impact: FULL PRESERVATION. Score and credits transfer without penalty.

**4. Recovery Migration (Old Device Unavailable)**

Old device is lost, stolen, broken, or trade-in wiped before migration.

**Step 1: New device launches HPP**

Same as normal migration Step 1. App detects no key, generates new key pair.

**Step 2: User selects “I don’t have my old device”**

App displays: “For security, recovery without your old device takes 7 days. During this time, if someone finds your old device and tries to use it, we’ll block them.”

**Step 3: New device initiates recovery**

Calls POST /v1/migration/start with recovery_mode: true. Verifier starts 7-day cooldown. Old device key is flagged — any Pulses from old device during cooldown are quarantined.

**Step 4: 7-day cooldown period**

New device cannot attest during cooldown. App displays countdown. User can check progress via GET /v1/migration/status/{id}.

**Step 5: After cooldown, new device claims**

Same as normal migration Step 5. Biometric required. Old device key permanently revoked.

Continuity impact: 50% SCORE PENALTY. Credits fully preserved. Score reduced to max(score/2, 0). This penalty prevents an attacker from quickly laundering a stolen device’s continuity.

**5. New Screens Required**

|  |  |  |
|----|----|----|
| **\#** | **Screen** | **Purpose** |
| 13 | MigrationStartView | Choice: 'I have my old device' vs 'I don’t have my old device' |
| 14 | MigrationQRView | Displays QR code for old device to scan (new device side) |
| 15 | MigrationRelinquishView | Old device: scan QR, confirm transfer, Face ID (old device side) |
| 16 | MigrationSuccessView | Transfer complete with score/credits display |
| 17 | RecoveryCooldownView | 7-day countdown timer with progress indicator |

**6. State Machine Additions**

Add to 04B_08 iOS Lifecycle State Machine:

— New state: MigrationPending (between Uninitialized and KeyGenerating)

— New state: RecoveryCooldown (between MigrationPending and Idle)

— Transition: Uninitialized → MigrationPending (on detecting no existing key + existing account)

— Transition: MigrationPending → Idle (on successful claim)

— Transition: MigrationPending → RecoveryCooldown (on recovery without old device)

— Transition: RecoveryCooldown → Idle (after cooldown + successful claim)

**7. Edge Cases**

— User starts migration but doesn’t complete: Migration expires after 10 minutes. No state change.

— Old device contests during recovery cooldown: Verifier sends push notification to new device. User must resolve dispute manually (contact support).

— User has multiple HPP-enrolled devices: NOT SUPPORTED. One device per identity. Second device must migrate from first.

— Biometric changed on new device before claim: Key still valid (biometryCurrentSet was set at key creation on NEW device). Claim proceeds.

— Biometric changed on old device before relinquish: Old key becomes unusable. User must use recovery flow instead.

**8. Cross-References**

— 04A_14: Device Recovery protocol (authoritative migration specification)

— 04B_04: iOS Platform Integration (Secure Enclave, Keychain behavior)

— 04B_08: iOS State Machine Diagrams (lifecycle states)

— 04B_25: iOS Implementation Notes (key storage, biometric gating)

— 04B_26: iOS Server Contract (migration endpoints)

— Pro-D: Single Device Atomic Migration (patent family)

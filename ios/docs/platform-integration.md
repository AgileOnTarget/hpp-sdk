**HUMAN PRESENCE PROTOCOL**

iOS Platform Integration Specification

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | OSI8_04B_04                              |
| **Version**        | 3.0                                      |
| **Date**           | April 2026                               |
| **Status**         | Canonical                                |
| **Scope**          | MVP / Production                         |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |
| **Owner**          | Agile On Target LLC                      |

**1. Purpose**

Define iOS operating system integration details, background execution behavior, framework usage, cryptographic constants, and platform constraints for the HPP iOS client. This document translates protocol intent into concrete iOS-specific implementation guidance.

This specification is normative. Deviations require protocol-level justification and must be documented in the change log.

**2. Supported Platforms**

|  |  |
|----|----|
| **Parameter** | **Requirement** |
| **Minimum iOS Version** | iOS 17.0+ |
| **Target iOS Version** | iOS 18.x (current stable) |
| **Hardware Requirement** | iPhone with Secure Enclave and Face ID or Touch ID |
| **Chip Requirement** | A11 Bionic or later (Secure Enclave v2+) |
| **iPad Support** | Out of scope for MVP |
| **Simulator Support** | Development only. Secure Enclave operations stubbed. |

Rationale: iOS 17+ ensures availability of modern CryptoKit APIs, BGTaskScheduler improvements, and current App Attest service stability. A11+ guarantees Secure Enclave with anti-replay memory protection.

**3. Core iOS Frameworks**

|  |  |  |
|----|----|----|
| **Framework** | **HPP Function** | **Import** |
| **LocalAuthentication** | Biometric-only policy enforcement | import LocalAuthentication |
| **CryptoKit** | Secure Enclave P-256 key generation, ECDSA signing, SHA-256 | import CryptoKit |
| **DeviceCheck** | App Attest key generation, attestation, assertion | import DeviceCheck |
| **Security** | Keychain Services, SecAccessControl, SecKey operations | import Security |
| **AVFoundation** | QR code scanning via AVCaptureSession | import AVFoundation |
| **BackgroundTasks** | BGTaskScheduler for daily pulse scheduling | import BackgroundTasks |
| **Network** | NWConnection, NWPathMonitor for connectivity | import Network |
| **OSLog** | Structured logging, no sensitive payloads | import os.log |
| **SwiftUI** | UI framework (native only, no cross-platform) | import SwiftUI |
| **UserNotifications** | Daily pulse reminders (optional, post-MVP) | import UserNotifications |

Cross-platform frameworks (React Native, Flutter) are prohibited. HPP requires direct Secure Enclave access with hardware-enforced biometric gating at the key level, not the UI level. This is a non-negotiable security boundary.

**4. Language & Architecture**

|                    |                                              |
|--------------------|----------------------------------------------|
| **Language**       | Swift 5.9+ (Swift 6 concurrency when stable) |
| **UI Framework**   | SwiftUI                                      |
| **Architecture**   | MVVM with protocol-oriented service layer    |
| **Concurrency**    | Swift async/await (structured concurrency)   |
| **Min Deployment** | iOS 17.0                                     |
| **Build System**   | Xcode 16+ / Swift Package Manager            |

**5. Cryptographic Constants**

|  |  |
|----|----|
| **Parameter** | **Value** |
| **Key Type** | kSecAttrKeyTypeECSECPrimeRandom |
| **Key Size** | 256 bits |
| **Curve** | P-256 / secp256r1 (native Secure Enclave curve) |
| **Signing Algorithm** | ECDSA with SHA-256 (ecdsaSignatureMessageX962SHA256) |
| **Hash Function** | SHA-256 (CryptoKit SHA256) |
| **Public Key Format** | SEC1 Compressed (33 bytes: prefix + X coordinate) |
| **Key Storage** | Secure Enclave wrapped, reference in Keychain |
| **Access Class** | kSecAttrAccessibleWhenUnlockedThisDeviceOnly |
| **Application Tag** | com.hpp.device.key |

Rationale: P-256 is the only elliptic curve natively supported by the Secure Enclave. This matches protocol-level requirements and provides optimal performance-to-security ratio for mobile devices. The Secure Enclave enforces that private keys never leave the hardware boundary.

**6. Secure Enclave Key Generation**

Key generation is a one-time operation during device registration (Genesis). The private key is created inside the Secure Enclave and is non-exportable by hardware design.

**6.1 Access Control Requirements**

|                 |                                              |
|-----------------|----------------------------------------------|
| **Protection**  | kSecAttrAccessibleWhenUnlockedThisDeviceOnly |
| **Flags**       | .privateKeyUsage, .biometryCurrentSet        |
| **Token ID**    | kSecAttrTokenIDSecureEnclave                 |
| **Persistence** | kSecAttrIsPermanent = true                   |

The .biometryCurrentSet flag ensures that if biometric enrollment changes (new face or fingerprint added), the key is invalidated. This prevents a scenario where an attacker adds their biometrics to a stolen device and signs attestations.

**6.2 Critical Implementation Note**

Biometric enforcement MUST be at the key access control level, not the UI level. A separate LAContext.evaluatePolicy() call before signing is cryptographically meaningless. The Secure Enclave must enforce biometric presence at the moment of key usage. Any signing operation against the private key automatically triggers the biometric prompt when access control is configured correctly.

**6.3 Public Key Extraction**

Public keys are extracted via SecKeyCopyExternalRepresentation() in X9.63 uncompressed format (65 bytes), then compressed to SEC1 format (33 bytes) for transmission to the verifier. Compression: prefix byte (0x02 if Y is even, 0x03 if Y is odd) concatenated with the 32-byte X coordinate.

**7. App Attest Integration (Hardware Provenance)**

App Attest provides cryptographic proof that the HPP client is an unmodified, Apple-signed binary running on genuine Apple hardware. This is a separate trust anchor from the Secure Enclave signing key.

**7.1 Registration Flow**

- Call DCAppAttestService.shared.generateKey() to create App Attest key pair in Secure Enclave.

- Store returned keyId alongside HPP public key in local storage manifest.

- Request challenge nonce from verifier server.

- Hash challenge with SHA-256, call attestKey(keyId, clientDataHash: nonceHash).

- Submit keyId, attestation object, and HPP public key to verifier during registration.

- Verifier validates attestation against Apple servers and stores keyId.

**7.2 Ongoing Assertion**

After initial attestation, each pulse submission includes an assertion generated via DCAppAttestService.shared.generateAssertion(keyId, clientDataHash:). The verifier uses the stored public key to validate assertions, proving the request originates from an unmodified app instance on the registered device.

**7.3 Known Constraints**

- App Attest requires network connectivity to Apple servers during initial attestation.

- Apple recommends gradual rollout (days to weeks for large user bases).

- Approximately 5% failure rate observed in production across the ecosystem.

- HPP must implement graceful fallback for attestation failures without breaking the pulse flow.

- Managed Device Attestation (iOS 16+) is a separate enterprise feature and does not replace App Attest for consumer apps.

**8. Biometric Integration**

|  |  |
|----|----|
| **Framework** | LocalAuthentication |
| **Policy** | deviceOwnerAuthenticationWithBiometrics (biometric-only) |
| **Passcode Fallback** | DISABLED. No fallback to device passcode. |
| **Reason String** | Confirm your presence to mint HPP attestation |

**8.1 Latency Requirements**

- On biometric failure, wait for LAError callback before updating UI.

- Do not present immediate retry button. Allow Secure Enclave attempt to complete.

- Rationale: Ensures Secure Enclave cryptographic operation completes before UI transitions.

**8.2 Failure Handling**

|  |  |
|----|----|
| **Error** | **Response** |
| **LAError.biometryNotAvailable** | Block. Device does not meet HPP hardware requirements. |
| **LAError.biometryNotEnrolled** | Prompt user to enroll Face ID / Touch ID in Settings. |
| **LAError.biometryLockout** | Inform user. Biometrics locked after too many failures. |
| **LAError.userCancel** | Return to app. Do not retry automatically. |
| **LAError.userFallback** | N/A. Passcode fallback is disabled. |

**9. Background Pulse Scheduling**

**9.1 BGTaskScheduler Configuration**

|                         |                                     |
|-------------------------|-------------------------------------|
| **Task Identifier**     | com.hpp.daily-pulse                 |
| **Task Type**           | BGAppRefreshTask                    |
| **Earliest Begin Date** | 24 hours from last successful pulse |
| **Requires Network**    | true (for submission)               |
| **Info.plist Key**      | BGTaskSchedulerPermittedIdentifiers |

BGTaskScheduler is advisory, not guaranteed. iOS determines actual execution timing based on device usage patterns, battery state, and system load. HPP must not depend on background execution for protocol correctness.

**9.2 Foreground Pulse Prompt**

- On first app open of day, check if pulse exists for current 24-hour epoch.

- If missing, prompt biometric flow immediately.

- If background task was deferred by system, foreground prompt is the primary mechanism.

- Record pulse timestamp in local encrypted storage.

**9.3 App Lifecycle Handling**

- On launch: check for incomplete burn submission. Resume Burn Processing flow automatically.

- On scenePhase change to .active: check pulse currency.

- On entering .background: schedule next BGTask if pulse was completed.

**10. Offline Queue Persistence**

|  |  |
|----|----|
| **Storage** | Keychain Services (kSecClassGenericPassword) |
| **Access Class** | kSecAttrAccessibleWhenUnlockedThisDeviceOnly |
| **Encryption** | Hardware-backed via Secure Enclave data protection |
| **Queue Behavior** | FIFO. Process when connectivity available. |
| **Max Queue Depth** | 7 entries (1 week of offline pulses) |
| **Expiration** | Queued items older than 7 days are discarded (protocol temporal window) |

Pulses, burns, and pending attestations are queued locally when offline. Queue is processed in order when NWPathMonitor reports satisfiedconnectivity. Failed submissions are retried with exponential backoff (max 3 attempts per item).

**11. Networking**

|  |  |
|----|----|
| **Parameter** | **Requirement** |
| **HTTP Client** | URLSession with ephemeral configuration |
| **TLS** | TLS 1.3 required. TLS 1.2 acceptable fallback. |
| **Certificate Pinning** | Required. Pin verifier server certificate. |
| **ATS** | App Transport Security enforced (default). No exceptions. |
| **Connectivity Monitor** | NWPathMonitor for online/offline state |
| **Timeout** | 30 seconds connection, 60 seconds resource |
| **Retry Policy** | Exponential backoff: 2s, 4s, 8s. Max 3 retries. |

Ephemeral URLSession configuration ensures no response caching, no cookie persistence, and no credential storage on disk. This aligns with HPP privacy guarantees.

**11.1 Post-Quantum Readiness**

iOS 26 (announced WWDC 2026) introduces quantum-secure key exchange with TLS 1.3. HPP networking layer should adopt PQC-ready TLS negotiation when available, with automatic fallback to conventional key exchange for servers that do not yet support quantum-safe algorithms. No client-side changes required beyond OS upgrade.

**12. QR Scanning**

|  |  |
|----|----|
| **Framework** | AVFoundation (AVCaptureSession) |
| **Metadata Type** | AVMetadataObject.ObjectType.qr |
| **Image Storage** | NONE. Frame data is transient, never persisted. |
| **Camera Permission** | NSCameraUsageDescription in Info.plist |
| **Output** | Extracted token payload passed to Burn Processing flow |

QR scanning is the primary mechanism for initiating token spend operations. The scanner reads a service provider QR code containing a challenge, triggers biometric confirmation, and initiates the burn flow. No images are stored at any point.

**13. Push Notifications (Post-MVP)**

|                  |                                                     |
|------------------|-----------------------------------------------------|
| **Status**       | Optional. Not required for MVP.                     |
| **Purpose**      | Remind user to mint daily pulse if app not opened   |
| **Framework**    | UserNotifications (UNUserNotificationCenter)        |
| **Trigger Type** | UNTimeIntervalNotificationTrigger (local, not push) |
| **Privacy**      | No user data transmitted to Apple Push servers      |

MVP relies on foreground pulse prompt and BGTaskScheduler. Local notifications are preferred over APNs to avoid sending device tokens to external servers.

**14. Battery & Performance**

- Background tasks must be minimal. No continuous background services.

- No persistent network connections (no WebSocket, no MQTT).

- Biometric + Secure Enclave signing: \<100ms typical latency.

- Network operations: ephemeral, short-lived, no polling.

- Target battery impact: \<1% daily under normal usage patterns.

- No GPS, no Bluetooth, no background location services.

**15. Logging**

|  |  |
|----|----|
| **Framework** | os.log (OSLog / Logger) |
| **Subsystem** | com.hpp.client |
| **Categories** | crypto, network, attestation, lifecycle |
| **Sensitive Data** | NEVER logged. No keys, tokens, biometric data, or signatures. |
| **Log Levels** | debug (dev only), info (lifecycle), error (failures) |
| **Production** | info and error only. debug stripped in release builds. |

**16. Build Configuration**

|  |  |  |
|----|----|----|
| **Scheme** | **Verifier URL** | **Notes** |
| **Dev** | localhost / staging | Secure Enclave stubbed in simulator. Full crypto on device. |
| **Test** | test.hpp.network | TestFlight. Full Secure Enclave. Sandbox App Attest. |
| **Prod** | api.hpp.network | App Store release. Production App Attest. Certificate pinned. |

- Each scheme uses distinct bundle identifiers and provisioning profiles.

- Feature flags managed via build configuration, not runtime toggles.

- Signing: automatic with Apple Developer team. Manual signing for production distribution.

**17. App Store Compliance**

**17.1 Required Info.plist Declarations**

|  |  |
|----|----|
| **Key** | **Value / Purpose** |
| **NSFaceIDUsageDescription** | Confirm your presence to create HPP attestation |
| **NSCameraUsageDescription** | Scan QR codes to spend HPP tokens |
| **BGTaskSchedulerPermittedIdentifiers** | com.hpp.daily-pulse |
| **ITSAppUsesNonExemptEncryption** | YES (ECDSA P-256 signing) |

**17.2 Compliance Notes**

- No tracking permission required (no ATT / App Tracking Transparency).

- No third-party analytics SDKs. No advertising identifiers.

- Encryption export compliance: ECDSA for authentication, not content encryption. File annual self-classification report with BIS.

- Privacy Nutrition Label: Collects no user data. No data linked to identity.

- App Review: biometric and camera usage strings must be user-friendly and accurate.

**18. Security Hardening**

- Jailbreak detection: check for Cydia, unauthorized file system access, writable system paths.

- Debugger detection: sysctl check for P_TRACED flag.

- Code integrity: App Attest validates binary has not been modified.

- No WebViews. No JavaScript execution contexts.

- No dynamic library loading. All frameworks statically linked or Apple system frameworks.

- Keychain items marked kSecAttrAccessibleWhenUnlockedThisDeviceOnly. No iCloud Keychain sync.

- Memory: sensitive data (signatures, nonces) zeroed after use via withUnsafeMutableBytes.

**19. Data Protection**

|  |  |
|----|----|
| **Data at Rest** | iOS Data Protection (Complete Protection class) |
| **Data in Transit** | TLS 1.3 with certificate pinning |
| **Key Material** | Secure Enclave. Non-exportable. Hardware boundary. |
| **User PII** | NONE collected. No names, emails, phone numbers. |
| **Biometric Data** | Never leaves Secure Enclave. Never accessed by HPP code. |
| **Telemetry** | NONE. No analytics, no crash reporting to third parties. |

**20. Acceptance Criteria**

MVP release requires all of the following to pass:

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Secure Enclave P-256 key generated successfully on device | Unit test + device test |
| Biometric gating enforced at key level, not UI level | Security review |
| App Attest keyId stored and registered with verifier | Integration test |
| Daily pulse reliably prompted (foreground fallback) | Functional test |
| QR scan functional and triggers burn flow | End-to-end test |
| Background tasks execute when system permits | Device test (48hr soak) |
| Offline queue persists and drains correctly | Network simulation test |
| No sensitive data in logs or on-disk storage | Security audit |
| Certificate pinning validated | MITM test |
| App passes App Store review | Submission |

**21. VDR Cross-References**

|             |                                |                  |
|-------------|--------------------------------|------------------|
| **Doc ID**  | **Title**                      | **Relationship** |
| OSI8_02A_01 | HPP Core Whitepaper            | Protocol spec    |
| OSI8_03A_01 | MVP Feature Set                | Feature scope    |
| OSI8_04B_02 | Client Architecture            | Component design |
| OSI8_04B_03 | Attestation Flow Specification | Flow detail      |
| OSI8_05A_01 | Threat Model                   | Attack vectors   |
| OSI8_05A_03 | Failure Taxonomy               | Error handling   |

**22. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 1.0 | 2026 | Initial draft. iOS 16+ baseline. |
| 1.1 | 2026 | Canonical status. Framework list finalized. |
| 3.0 | April 2026 | Updated to iOS 17+/18.x baseline. Added: language & architecture section, biometric failure handling, App Attest assertion flow, offline queue specs, security hardening, data protection, PQC readiness note, acceptance criteria verification methods, VDR cross-references. Expanded all sections to institutional documentation standard. |

END OF DOCUMENT

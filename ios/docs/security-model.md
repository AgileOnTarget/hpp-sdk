**ATTORNEY WORK PRODUCT — PRIVILEGED & CONFIDENTIAL**

**HPP iOS CLIENT**

**SECURITY MODEL**

Trust Boundaries, Key Custody, Attack Surface, and Mitigations

|  |  |
|----|----|
| **Document ID** | OSI8_04B_03_SEC_iOS_Client_Security_Model_v2_0 |
| **Version** | 2.0 |
| **Date** | April 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |
| **Section** | 03 — Product & MVP |
| **Cross-References** | OSI8_04B_01 (iOS PRD: SEC-01–06), OSI8_04B_02 (UX Flows), OSI8_02B_02 (Secure Enclave Binding), OSI8_02B_03 (Liveness Challenge), OSI8_02B_06 (Failure Modes), OSI8_02B_08 (STRIDE Threat Model), OSI8_02B_10 (Error Code Registry), OSI8_02B_09 (Primitive Registry), OSI8_05A_02 (Biometric Data Handling) |
| **Audience** | Security reviewers, penetration testers, acquirer security diligence teams, iOS engineers |

*This document reflects inventor-led protocol specification and is not a substitute for independent outside counsel opinion or independent security audit.*

**1. PURPOSE**

This document defines the security architecture of the HPP iOS client: trust boundaries, key custody model, storage protections, attack surface, and mitigations. It specifies how the client enforces hardware-bound key custody, biometric-gated signing, local credit integrity, crash-safe burn semantics, hardware provenance attestation, and privacy preservation.

**Security philosophy:** The client trusts the Secure Enclave. It trusts Apple’s attestation services. It trusts the iOS kernel for Keychain encryption. It trusts nothing else. The application process is untrusted — it is an orchestrator that requests operations from trusted subsystems, never a custodian of secrets.

**2. SECURITY OBJECTIVES**

|  |  |  |  |
|----|----|----|----|
| **\#** | **Objective** | **Primitive** | **PRD Requirement** |
| **SO-1** | Private keys never leave Secure Enclave | P2 (Hardware Binding) | SEC-01 |
| **SO-2** | Key generation proven on genuine Apple hardware | P2 | SEC-04 |
| **SO-3** | Biometric authentication gates all sensitive operations | P5 (Non-Transferable Presence Credit) | SEC-02 |
| **SO-4** | Presence credits cannot be duplicated or replayed | P8, P9, P14 | SEC-03 |
| **SO-5** | Burns are atomic and crash-safe | P9 (Trust Bridging Assertion) | FR-23, FR-24 |
| **SO-6** | Client stores no biometric templates | P5 | SEC-02, PRV-04 |
| **SO-7** | Default-deny on all error paths | INV-13 (Fail-Safe) | FR-32 |
| **SO-8** | No PII collection, storage, or transmission | P7 (Atomic Migration) | PRV-01–05 |

**3. TRUST BOUNDARIES**

The client operates across five trust zones. Security properties degrade as you move outward from the Secure Enclave:

|  |  |  |  |  |
|----|----|----|----|----|
| **Zone** | **Boundary** | **Trust Level** | **What Lives Here** | **Security Properties** |
| **Z1** | **Secure Enclave** | Hardware-trusted | P-256 private key, biometric matcher, secure counter | Non-exportable keys. Hardware-isolated execution. Tamper-resistant. Not accessible to application process. |
| **Z2** | **iOS Kernel / Keychain** | OS-trusted | Encrypted storage, Keychain items, file protection | AES-256 encryption at rest. Access control policies. Not included in iCloud backup (ThisDeviceOnly). |
| **Z3** | **Application Process** | Untrusted orchestrator | App logic, UI, network stack, telemetry | Sandboxed but vulnerable to RE, debugging, injection. Never custodian of secrets. Requests operations from Z1/Z2. |
| **Z4** | **Apple Attestation** | Vendor-trusted | App Attest / DeviceCheck token validation | Apple validates device hardware genuineness. Token submitted to Verifier during enrollment. Proves key from real silicon, not emulator. |
| **Z5** | **Network / Verifier** | Authenticated remote | TLS channel to HPP Verifier | Certificate pinning enforced. All payloads signed. Replay prevented by nonce. Man-in-the-middle mitigated. |

**Key principle:** Secrets exist only in Z1 (Secure Enclave). Everything outside Z1 handles only public keys, signatures, and encrypted blobs. A compromise of Z3 (application process) does not compromise identity.

**4. KEY CUSTODY MODEL**

**4.1 Key Generation**

|  |  |
|----|----|
| **Property** | **Specification** |
| **Algorithm** | ECDSA P-256 (secp256r1) |
| **Generation location** | Secure Enclave (Z1). Key created via SecKeyCreateRandomKey with kSecAttrTokenIDSecureEnclave. |
| **Exportability** | Private key: non-exportable. No API call can extract private key bytes. Public key: exportable for registration with Verifier. |
| **Persistence** | kSecAttrIsPermanent = true. Key persists across app restarts. Destroyed only by explicit deletion or device wipe. |
| **Hardware provenance** | App Attest token obtained during enrollment proves key generated on genuine Apple silicon. Verifier validates token with Apple. Blocks emulator and simulator key generation. |
| **Patent coverage** | Patent A (Time-Anchored Hardware-Bound Biometric Attestation), Claims 2 and 4. |
| **Error codes** | HPP-AUTH-002 (Enclave unavailable), HPP-AUTH-005 (App Attest fail), HPP-AUTH-006 (key gen fail) |

**4.2 Key Usage**

|  |  |  |
|----|----|----|
| **Operation** | **Signing Context** | **Biometric Required** |
| **Daily attestation (Pulse)** | Sign canonical string: nonce \|\| epochId \|\| timestamp \|\| pubKeyHash | Yes — Face ID / Touch ID via LAContext |
| **Credit burn** | Sign burn record: burnId \|\| creditAmount \|\| timestamp \|\| relyingParty | Yes — biometric re-confirmation required |
| **Device migration** | Sign migration challenge (old device authorization) | Yes — biometric on old device to authorize |

No other signing operations exist. The key has exactly three uses. All require biometric gating. No signing occurs without explicit biological human presence.

**5. LOCAL STORAGE PROTECTIONS**

**5.1 Keychain Policy**

|  |  |
|----|----|
| **Property** | **Specification** |
| **Access class** | kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly |
| **Encryption** | AES-256 at rest, managed by iOS Data Protection |
| **iCloud backup** | Excluded (ThisDeviceOnly). Keys and credentials are not recoverable from backup. |
| **Cross-device transfer** | Prohibited. No AirDrop, no Keychain sharing, no iCloud sync for HPP items. |
| **Availability** | Available after first device unlock. Not available in BFU (Before First Unlock) state. |

**5.2 Stored Objects**

|  |  |  |  |
|----|----|----|----|
| **Object** | **Storage** | **Integrity** | **Primitive** |
| **Device public key** | Keychain | Enclave-generated | P2 (Hardware Binding) |
| **Device identifier** | Keychain | SHA-256 of public key | — |
| **Credit ledger** | Encrypted CoreData | Monotonic counter; signed updates | P8 (Deferred Attestation Settlement) |
| **Attestation queue** | Encrypted CoreData | Append-only, hash-chained | P10 (API-Mediated Verification) |
| **Burn hash chain** | Encrypted CoreData | H_n = SHA-256(burn_n \|\| H\_{n-1}) | P9, P14 (Burn, Ledger) |
| **Receipts** | Encrypted CoreData | Server-signed, read-only | P14 (Anti-Sybil Presence Accumulation) |

**5.3 Burn Micro-Ledger (Hash Chain)**

Each burn record contains: burnId, credits burned, timestamp, relying party, previous burn hash, and current burn hash. Properties:

|  |  |
|----|----|
| **Property** | **Enforcement** |
| **Append-only** | New records appended only. No deletion API. No modification API. |
| **Hash-chained integrity** | H_n = SHA-256(burn_n \|\| H\_{n-1}). Modifying any record breaks chain from that point forward. |
| **Selective deletion prevention** | Deleting a burn record to “restore” credits breaks chain integrity. Verifier detects chain break on settlement. |
| **Crash safety** | Atomic write: credit decrement + burn record + chain update committed in single Core Data save context. Either all succeed or none. |
| **Patent coverage** | Patent K (Tamper-Evident Hash-Chained Ledger), Patent J (Non-Transferable Credits) |

**5.4 Trust Bridging Assertion Semantics**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Operation** | **Reversible?** | **On Failure** |
| **1** | Biometric authentication (Face ID / Touch ID) | Yes — no state change yet | Return to Burn Preview |
| **2** | Decrement credits in local ledger | Part of atomic commit | Abort entire commit |
| **3** | Create burn record with idempotency key | Part of atomic commit | Abort entire commit |
| **4** | Append burn record to hash chain | Part of atomic commit | Abort entire commit |
| **5** | Persist updated ledger + chain (Core Data save) | **Committed. Irreversible.** | — |
| **6** | Submit burn record to Verifier | Network operation | Queue for retry |

**Crash recovery:** If app crashes after step 5 but before step 6, the burn is locally committed. On next launch, app detects unsubmitted burn and resumes at step 6. Idempotency key prevents double-spend on retry.

**6. ATTACK SURFACE ANALYSIS**

Each threat is mapped to the trust boundary it targets, the specific mitigation, the primitive that enforces it, and the error code triggered on detection:

|  |  |  |  |  |
|----|----|----|----|----|
| **Threat** | **Boundary** | **Mitigation** | **Primitive** | **Error Code** |
| Emulator key generation | Z1/Z4 | App Attest token proves genuine Apple hardware. Verifier rejects attestation from unattested keys. | P2 | HPP-AUTH-005 |
| Private key extraction | Z1 | Secure Enclave enforces non-exportability. No API exists. Physical chip extraction out of MVP scope. | P2 | HPP-AUTH-006 |
| Jailbreak / root access | Z2/Z3 | Device integrity check via App Attest on enrollment and periodic re-validation. Jailbroken devices flagged. | P2 | HPP-AUTH-005 |
| Biometric bypass | Z1 | LAContext.evaluatePolicy gates all signing. No fallback to passcode for HPP operations. Progressive cooldown. | P5 | HPP-AUTH-001, HPP-AUTH-004 |
| UI automation (fake taps) | Z3 | Biometric prompt is system-level (not app-controlled). Cannot be simulated by accessibility or automation frameworks. | P5 | HPP-AUTH-001 |
| Local storage tampering | Z2 | Keychain encryption + hash-chained burn ledger. Tampered chain detected on read. Tampered credits detected on settlement. | P14 | HPP-RCPT-004, HPP-LEDG-001 |
| Credit inflation | Z2/Z3 | Credits incremented only via valid attestation response from Verifier. Monotonic counter signed. Local-only inflation detected on settlement. | P8 | HPP-BURN-003 |
| Replay attack (pulse) | Z5 | Each attestation includes fresh server nonce with 5-minute TTL. Verifier rejects reused nonces. | P4 | HPP-ATTEST-002 |
| Replay attack (burn) | Z5 | Each burn has unique idempotency key. Verifier rejects duplicate burns with HPP-BURN-002 (idempotent success). | P9 | HPP-BURN-002 |
| Man-in-the-middle | Z5 | TLS certificate pinning. HPP-NET-003 on handshake failure. No HTTP fallback. | — | HPP-NET-003 |
| Network interception | Z5 | All payloads signed with Enclave key. Intercepted payloads useless without private key. | P1, P2 | — |
| Selective burn deletion | Z2 | Burn hash chain. Deleting any record breaks chain integrity. Verifier detects on deferred settlement. | P14 | HPP-RCPT-004 |
| Double-spend (crash) | Z3 | Atomic commit: credits + burn record + chain update in single save. Idempotency key on retry. | P9 | HPP-BURN-002 |
| App reverse engineering | Z3 | No secrets in application binary. All secrets in Z1. RE reveals only orchestration logic, not keys. | P2 | — |

**7. THREAT MODEL SCOPE**

|  |  |
|----|----|
| **In Scope (MVP)** | **Out of Scope (Acknowledged)** |
| Jailbroken device with root access | Nation-state hardware backdoors (e.g., TEE bypass via silicon-level attack) |
| App reverse engineering and binary analysis | Physical invasive chip extraction (decap, FIB, etc.) |
| Local storage tampering (file system access) | Apple Secure Enclave firmware vulnerability (zero-day) |
| Network interception and MITM | Coerced biometric (physical compulsion) |
| Replay attacks on pulse and burn | Side-channel attacks on TEE (power analysis, EM emanation) |
| Emulator / simulator key generation | Supply-chain compromise of Apple attestation services |
| UI automation and accessibility exploit | Compromised iOS kernel (kernel-level jailbreak) |

*Out-of-scope threats are documented for completeness and acknowledged in the acquirer security diligence context. They are addressed in OSI8_02B_08 (STRIDE Threat Model) and 05-04 (Out-of-Scope Threat Acknowledgment).*

**8. PRIVACY POSTURE**

|  |  |  |
|----|----|----|
| **Property** | **Enforcement** | **Verification** |
| **No PII collected** | No name, email, phone fields | Static analysis confirms no PII APIs invoked |
| **No login or account system** | Identity = Secure Enclave key | No OAuth, SSO, or credential storage code paths |
| **No location tracking** | No CoreLocation import | Info.plist contains no location usage description |
| **Biometric data stays on device** | LAContext evaluation only | No biometric data in network payloads (packet capture) |
| **No analytics identifiers** | No IDFA, no IDFV in telemetry | Telemetry payload schema review |
| **GDPR right-to-deletion** | Local wipe + server ledger severing | Delete Identity in Settings triggers full cleanup (OSI8_05A_03) |

**9. FAILURE MODE SUMMARY**

|  |  |  |  |
|----|----|----|----|
| **Failure** | **Security Impact** | **State Change** | **Recovery** |
| **Biometric failure** | Signing blocked. No attestation or burn possible. | None. Pre-operation state preserved. | User retries. Cooldown after 3 failures. |
| **Storage write failure** | Atomic commit aborted. No partial state. | None. Transaction rolled back. | User retries. Disk space check. |
| **Network failure** | Attestation or burn queued locally. | Queue updated. Offline badge shown. | Auto-sync on reconnection (P10). |
| **Chain integrity break** | Tamper detected. Queue rejected. | Queue discarded. User notified. | Fresh attestation from clean state. |
| **Secure Enclave unavailable** | Cannot sign. Protocol inoperable. | FATAL state. | Device restart or replacement. |
| **Unrecognized error** | Default-deny. No access granted. | HPP-SYS-001 (FATAL). | INV-13 enforced. Investigate. |

**10. DOCUMENT RELATIONSHIPS**

|  |  |  |
|----|----|----|
| **Topic** | **VDR Document** | **Relationship** |
| iOS PRD security requirements | OSI8_04B_01 | SEC-01–06, PRV-01–05 defined there; this doc provides architecture |
| UX crash safety | OSI8_04B_02 | Atomic burn UX flow backed by this security model |
| Secure Enclave binding spec | OSI8_02B_02 | Authoritative specification for key generation and signing |
| STRIDE threat model | OSI8_02B_08 | Protocol-level threats; this doc addresses client-specific surface |
| Failure modes & recovery | OSI8_02B_06 | System-wide failure categories; this doc specifies client subset |
| Error code registry | OSI8_02B_10 | All error codes in attack surface table defined there |
| Biometric data handling | OSI8_05A_02 | Compliance-level biometric handling policy |

**11. ACCEPTANCE CRITERIA**

|  |  |
|----|----|
| **☐** | Private key confirmed non-exportable (simulator test fails key generation) |
| **☐** | Public key registration requires valid App Attest token (emulator blocked) |
| **☐** | Attestations cannot be generated without biometric authentication |
| **☐** | Burns cannot be executed without biometric authentication |
| **☐** | App crash during burn does not lose or duplicate credits |
| **☐** | Burn hash chain integrity verifiable end-to-end |
| **☐** | No PII, biometric data, or private keys in any network payload or telemetry |
| **☐** | Static analysis clean (no hardcoded secrets, no deprecated APIs) |
| **☐** | Unrecognized errors treated as HPP-SYS-001 (FATAL, default-deny) |

**12. CONCLUSION**

The HPP iOS client security model is defined by one principle: the application process is an untrusted orchestrator. Secrets live in the Secure Enclave. Integrity lives in hash chains. Authenticity lives in biometrics. Everything else is disposable.

***If you compromise the app, you get orchestration logic. If you compromise the storage, you break the chain and get caught. If you bypass biometrics, you bypass Apple. The security model is the silicon.***

**— END OF iOS CLIENT SECURITY MODEL —**

*Version 2.0 updates: Document ID converted to OSI8 naming (OSI8_04B_03); all VDR cross-references updated to OSI8 naming; primitive names corrected to canonical registry; date updated to April 2026. Version 1.1 history: Rebuilt from RTF to institutional .docx, added formal trust boundary zones (Z1–Z5) with security properties, added attack surface analysis (14 threats with primitive and error code mappings), added atomic burn step table with crash recovery, added security objective traceability to PRD requirements and primitives, added in-scope/out-of-scope threat delineation, expanded stored objects table with primitive mappings, added privacy posture verification methods. This document reflects inventor-led protocol specification and is not a substitute for independent outside counsel opinion.*


**HPP iOS CLIENT**

**SECURITY REVIEW CHECKLIST**

*Human Presence Protocol*

|  |  |
|----|----|
| **Document ID** | 03-31 |
| **Title** | HPP iOS Client Security Review Checklist |
| **Version** | 1.0 |
| **Status** | Canonical |
| **Scope** | MVP iOS Client — Security Review for Internal or Third-Party Audit |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose and Usage**

This document defines a deterministic checklist for security review of the HPP iOS client MVP. It is designed for use by internal engineering, acquirer technical diligence teams, or independent third-party security auditors.

Every check maps to a specific Protocol Invariant, has an unambiguous pass/fail criterion, specifies the evidence required to demonstrate compliance, and is classified by severity. A failed Critical check is a release-blocking finding. A failed High check requires documented risk acceptance. Medium checks are tracked for remediation.

|  |
|----|
| **Review Protocol:** Work through each section in order. Record Pass, Fail, or N/A for each check. For any Fail, record the finding number and cross-reference to the relevant VDR document. The reviewer must have access to the Xcode project, a physical test device (not Simulator), and the verifier logs. |

**1.1 Severity Definitions**

|  |  |
|----|----|
| **Severity** | **Definition** |
| **Critical** | Protocol invariant violation. Release-blocking. No deployment until resolved. Any single Critical failure invalidates the security review. |
| **High** | Significant security weakness. Must be resolved or formally accepted with documented risk rationale before deployment. |
| **Medium** | Defense-in-depth gap. Tracked for remediation. Does not block release. |

**1.2 Summary Scorecard**

Complete this scorecard after all sections are reviewed.

|                       |            |          |          |         |              |
|-----------------------|------------|----------|----------|---------|--------------|
| **Domain**            | **Checks** | **Pass** | **Fail** | **N/A** | **Reviewer** |
| **Key Management**    |            |          |          |         |              |
| **Biometrics**        |            |          |          |         |              |
| **Network Security**  |            |          |          |         |              |
| **Storage Integrity** |            |          |          |         |              |
| **Input Validation**  |            |          |          |         |              |
| **Replay Protection** |            |          |          |         |              |
| **PII Containment**   |            |          |          |         |              |
| **App Integrity**     |            |          |          |         |              |
| **Time Authority**    |            |          |          |         |              |
| **Error Handling**    |            |          |          |         |              |
| **TOTAL**             |            |          |          |         |              |

**2. Key Management**

The Secure Enclave is the root of trust for all HPP cryptographic operations. Every check in this section verifies that key material is generated, stored, and used exclusively within hardware isolation.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **KM-01** | Private keys generated inside Secure Enclave | SecKeyCreateRandomKey called with kSecAttrTokenIDSecureEnclave. No software key fallback path exists. | I-1 | Code review of key generation. Grep for kSecAttrTokenID. | **Critical** |
| **KM-02** | Private keys are non-exportable | No call to SecKeyCopyExternalRepresentation for SE keys. No serialization of private key material anywhere in codebase. | I-1 | Code review. Static analysis for SecKeyCopy\*. | **Critical** |
| **KM-03** | Keychain access class is correct | SE key references stored with kSecAttrAccessibleWhenUnlockedThisDeviceOnly. Not backed up. Not synced via iCloud Keychain. | I-1 | Code review of Keychain queries. Verify kSecAttrSynchronizable = false. | **Critical** |
| **KM-04** | Key generation requires biometric gate | SecAccessControlCreateWithFlags includes .biometryCurrentSet or .biometryAny. Key cannot be used without biometric. | I-1, I-2 | Code review of SecAccessControl flags. | **Critical** |
| **KM-05** | No hardcoded keys or secrets | No API keys, shared secrets, or cryptographic material in source code, Info.plist, or bundled resources. | I-1 | Static analysis. Grep for Base64, hex patterns, common key prefixes. | **High** |
| **KM-06** | App Attest key generated and registered | DCAppAttestService.shared.generateKey called at registration. Attestation object sent to verifier. | I-1 | Code review of registration flow. | **Critical** |

**3. Biometrics**

HPP uses biometrics as a gate, not as an identifier. The app must never access, store, process, or transmit biometric template data.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **BIO-01** | Only OS biometric APIs used | LAContext.evaluatePolicy is the sole biometric entry point. No third-party biometric SDK. No custom camera-based liveness. | I-2 | Code review. Search for import LocalAuthentication. No other biometric imports. | **Critical** |
| **BIO-02** | No biometric template storage | No code reads, writes, or processes biometric template data. LAContext returns success/failure only. | I-2, I-11 | Code review. Verify LAContext usage returns Bool only. | **Critical** |
| **BIO-03** | Biometric required before every signing operation | Every call to SecKeyCreateSignature is preceded by a successful biometric gate. No bypass path. | I-2 | Code flow analysis. Trace all paths from user action to SE sign. | **Critical** |
| **BIO-04** | Biometric failure does not expose error details | Failed biometric returns a generic error to the user. No LAError domain details leak to UI or telemetry. | I-2, I-12 | Code review of error handling in biometric flow. | **Medium** |
| **BIO-05** | Biometric policy is .deviceOwnerAuthenticationWithBiometrics | Not .deviceOwnerAuthentication (which allows passcode fallback). Passcode fallback is not acceptable for HPP. | I-2 | Code review. Verify LAPolicy enum value. | **High** |

**4. Network Security**

All communication between the HPP client and the verifier must be encrypted in transit. Optional certificate pinning provides defense-in-depth.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **NET-01** | TLS enforced for all connections | App Transport Security (ATS) is enabled. No NSAllowsArbitraryLoads exception. All URLs use https://. | I-3 | Info.plist review. Network traffic capture. | **Critical** |
| **NET-02** | Certificate pinning implemented (optional but recommended) | URLSession delegate validates server certificate against pinned public key or CA. Pinning failure aborts connection. | — | Code review of URLSessionDelegate. If not implemented, document as accepted risk. | **Medium** |
| **NET-03** | HPP-Version header present on all requests | Every HTTP request to the verifier includes HPP-Version header with protocol version string. | — | Network traffic capture. Verify header presence. | **Medium** |
| **NET-04** | No sensitive data in URL query parameters | device_id, signatures, and tokens are never in URL paths or query strings. Always in POST body. | I-12 | Code review. Network traffic capture. | **High** |
| **NET-05** | Request/response bodies are not logged in release builds | Network logging is DEBUG-only. Release builds do not log request or response content. | I-12 | Code review. Verify preprocessor guards on network logging. | **High** |
| **NET-06** | Timeout and retry configuration is bounded | Connection timeout ≤ 10s. Request timeout ≤ 15s. Max retries = 2. Exponential backoff. | — | Code review of URLSession configuration. | **Medium** |

**5. Storage Integrity**

The local ledger stores credit balances, pulse history, burn records, and receipts. All storage must be tamper-evident and must not expose protocol state to unauthorized access.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **STR-01** | Credit balance is not a raw mutable integer | Balance is derived from the signed ledger, not stored as an independent mutable value. Direct modification of balance is not possible. | I-4, I-5 | Code review. Verify balance is computed from ledger, not stored separately. | **Critical** |
| **STR-02** | Ledger is HMAC-signed | Every ledger entry is HMAC-signed with a device-specific key. Tampering is detectable on read. | I-6 | Code review. Verify HMAC computation and verification on read. | **Critical** |
| **STR-03** | Burn records are hash-chained | Each burn record includes a hash of the previous burn. Chain integrity is verified before any new burn. | I-7 | Code review. Verify hash chain computation and validation. | **Critical** |
| **STR-04** | Burn write and balance deduction are atomic | Burn record creation and balance deduction occur in a single atomic transaction. Crash between them triggers recovery. | I-6 | Code review. Verify transaction boundary or write-ahead pattern. | **Critical** |
| **STR-05** | Local storage is encrypted at rest | Data protection class is NSFileProtectionCompleteUntilFirstUserAuthentication or higher. | — | Code review. Verify file protection attributes. | **High** |
| **STR-06** | Receipt store is append-only | Receipts are written once and never modified. No update or delete path exists for receipt records. | I-7 | Code review. Verify receipt storage API exposes write-only. | **High** |
| **STR-07** | Queue entries have bounded lifetime | Offline queue entries older than 7 days are pruned on read. No unbounded queue growth. | I-10 | Code review. Verify expiration check in queue drain. | **Medium** |

**6. Input Validation**

All external input — QR payloads, verifier responses, and user actions — must be validated before processing. Invalid input must be rejected deterministically.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **INP-01** | QR payload schema validated before processing | JSON parse + schema validation: verifier_url, session_id, required_credits (integer ≥ 1), rp_id, callback_url all present and correctly typed. | I-6 | Code review. Verify validation logic. See 03-28 §6.3 for invalid payloads. | **Critical** |
| **INP-02** | verifier_url validated against allowlist | Only pre-configured verifier URLs accepted. Arbitrary URLs in QR payloads are rejected. | — | Code review. Verify URL allowlist check. | **Critical** |
| **INP-03** | Session ID format validated | session_id must match expected format (non-empty string, bounded length). Injection characters rejected. | I-7 | Code review. Verify input sanitization. | **High** |
| **INP-04** | required_credits range validated | Must be integer ≥ 1 and ≤ reasonable maximum. Zero and negative values rejected. | I-5 | Code review. See 03-28 §6.3 for negative test cases. | **High** |
| **INP-05** | Verifier response schema validated | All verifier responses validated for expected fields and types before processing. | — | Code review. Verify response parsing includes type checks. | **High** |
| **INP-06** | Receipt signature verified before storage | verifier_signature in receipt validated against verifier public key before receipt is persisted. | I-7 | Code review. Verify signature verification in burn response handler. | **Critical** |

**7. Replay Protection**

Replay attacks are the primary threat to the burn flow. Every mechanism that prevents replay must be verified independently.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **RPL-01** | Receipt age enforced | Client rejects receipts where (now − issued_at) \> max_receipt_age_seconds. Default 300 seconds. | I-7, I-3 | Code review. Verify age check before receipt acceptance. | **Critical** |
| **RPL-02** | Burn idempotency enforced (client-side) | Client generates a unique burn_id (UUID v4) for each burn. Same burn_id never submitted twice from client. | I-7 | Code review. Verify UUID generation and local dedup check. | **Critical** |
| **RPL-03** | Burn idempotency enforced (server-side) | Verifier returns 409 for duplicate burn_id. Client handles 409 correctly (does not deduct credits twice). | I-7 | Integration test. Submit same burn_id twice. Verify 409 and correct client behavior. | **Critical** |
| **RPL-04** | Nonce is CSPRNG-generated and unique per operation | Every pulse and burn includes a nonce generated via SecRandomCopyBytes or equivalent CSPRNG. Nonce is never reused. | I-8 | Code review. Verify CSPRNG usage and non-reuse. | **Critical** |
| **RPL-05** | Session ID single-use | Each QR session_id is consumed on first successful burn. Client does not retry a consumed session. | — | Code review. Verify session state tracking. | **High** |

**8. PII Containment**

HPP collects, stores, and transmits zero personally identifiable information. Any PII detection is a zero-tolerance Critical finding.

|  |
|----|
| **Zero Tolerance:** Any confirmed PII in telemetry, logs, network payloads, or local storage is a Critical finding that blocks release. There is no acceptable threshold. See 03-26 §10 for the PII audit procedure. |

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **PII-01** | No email addresses in any output | Grep all logs, telemetry, and network captures for email patterns. Zero matches. | I-11, I-12 | PII audit per 03-26 §10. Automated pattern scan. | **Critical** |
| **PII-02** | No phone numbers in any output | Grep for phone number patterns. Zero matches. | I-11, I-12 | PII audit per 03-26 §10. | **Critical** |
| **PII-03** | No Apple ID or IDFA/IDFV in any output | No calls to ASIdentifierManager. No Apple ID strings in any payload. | I-11, I-12 | Code review. Static analysis for identifier APIs. PII audit. | **Critical** |
| **PII-04** | No geolocation data in any output | No CoreLocation imports. No latitude/longitude in any payload. | I-11, I-12 | Code review. Verify no location framework usage. | **Critical** |
| **PII-05** | No user names in any output | No calls to PersonNameComponents, CNContact, or similar APIs. | I-11, I-12 | Code review. Static analysis. | **Critical** |
| **PII-06** | device_id is random UUID, not linked to Apple account | device_id generated via UUID() at registration. Not derived from identifierForVendor or any Apple identifier. | I-11 | Code review. Verify UUID generation source. | **Critical** |
| **PII-07** | Telemetry contains no device_id or payload content | Debug telemetry events contain only: event type, timestamp, success/failure, error code. No device_id. | I-12 | Telemetry schema review per 03-14. Network capture of telemetry events. | **High** |

**9. App Integrity**

App integrity checks verify that the build, signing, and distribution chain have not been compromised.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **APP-01** | App Attest validation at registration | DCAppAttestService generates attestation object. Verifier validates attestation against Apple’s App Attest root CA. | I-1 | Code review of registration. Verifier-side validation logs. | **Critical** |
| **APP-02** | Debug code stripped from release builds | HPP_DEBUG preprocessor flag gates all debug features. Release configuration does not define HPP_DEBUG. | — | Build configuration review. Verify scheme settings. | **High** |
| **APP-03** | No dynamic library injection paths | App does not load plugins, dynamic libraries at runtime, or execute arbitrary code. | — | Code review. Verify no dlopen, NSBundle.load, or similar calls. | **High** |
| **APP-04** | Entitlements are minimal | Only required entitlements: Keychain access group, App Attest, camera (for QR). No unnecessary capabilities. | — | Entitlements file review. | **Medium** |
| **APP-05** | No custom URL schemes that accept sensitive data | If custom URL schemes are used, they do not accept device_id, signatures, or tokens as parameters. | I-12 | Info.plist review. Code review of URL handling. | **Medium** |

**10. Time Authority**

Server-authoritative time is the mechanism that prevents timestamp manipulation. Every time-dependent operation must use the verifier’s clock, not the device clock.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **TIME-01** | Pulse timestamp comes from /time endpoint | Pulse attestation payload uses timestamp from verifier /time response. Not Date() or CFAbsoluteTimeGetCurrent(). | I-3 | Code review. Trace timestamp source in pulse flow. | **Critical** |
| **TIME-02** | Clock skew tolerance enforced | Client rejects if \|device_time − server_time\| \> max_clock_skew_seconds (default 30s). | I-3 | Code review. Verify skew check. | **High** |
| **TIME-03** | Device clock is never used as authoritative source | No protocol operation (pulse, burn, receipt validation) uses the device clock for its canonical timestamp. | I-3 | Code review. Grep for Date(), CFAbsoluteTime in protocol paths. | **Critical** |
| **TIME-04** | Cached server time has bounded staleness | If /time result is cached, cache validity is ≤ 60 seconds. Stale cache triggers re-fetch. | I-3 | Code review. Verify cache TTL. | **High** |

**11. Error Handling**

Errors must be handled safely: no sensitive data in error messages, no fail-open paths, and deterministic recovery from all failure states.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **ID** | **Check** | **Pass Criteria** | **Inv.** | **Evidence Required** | **Severity** |
| **ERR-01** | No sensitive data in user-facing error messages | Error messages shown to user contain only generic descriptions. No device_id, signatures, server URLs, or internal state. | I-12 | UI review. Code review of error presentation. | **High** |
| **ERR-02** | All protocol operations fail closed | If any step fails (biometric, SE sign, network, validation), the entire operation fails. No partial completion. | I-6 | Code review. Verify fail-closed logic in pulse and burn flows. | **Critical** |
| **ERR-03** | Crash recovery restores consistent state | After crash during burn, relaunch detects pending state and recovers atomically per 03-26 §7. | I-6 | Test: kill app mid-burn. Verify recovery on relaunch. | **Critical** |
| **ERR-04** | Error codes do not leak implementation details | Error codes in telemetry and logs are enumerated HPP codes (REG\_\*, PLS\_\*, BRN\_\*). No raw system errors. | — | Code review. Verify error code mapping. | **Medium** |
| **ERR-05** | Uncaught exceptions do not corrupt protocol state | Exception handlers and signal handlers do not write partial data. Storage operations are transactional. | I-6 | Code review. Verify exception safety of storage writes. | **High** |

**12. Review Sign-Off**

|                        |                               |
|------------------------|-------------------------------|
| **Reviewer Name**      |                               |
| **Organization**       |                               |
| **Review Date**        |                               |
| **Total Checks**       | 50                            |
| **Critical Checks**    | 28                            |
| **High Checks**        | 15                            |
| **Medium Checks**      | 7                             |
| **Passed**             |                               |
| **Failed**             |                               |
| **Overall Result**     | **PASS / FAIL / CONDITIONAL** |
| **Reviewer Signature** |                               |

|  |
|----|
| **Pass Criteria:** All Critical checks must pass. All High checks must pass or have documented risk acceptance. CONDITIONAL means High checks are accepted with documented rationale. FAIL means any Critical check failed. |

**13. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-02** | Protocol Invariants Specification | All 14 invariants grounding every checklist item |
| **03-06** | iOS Platform Integration | SE, App Attest, LAContext implementation details |
| **03-08** | iOS Client Acceptance Tests | Test suite validating checks programmatically |
| **03-14** | Telemetry Events | Telemetry schema for PII containment verification |
| **03-18** | MVP Threat Model | Threat scenarios that checklist items mitigate |
| **03-25** | Post-Release Monitoring Plan | Production monitoring of security-relevant metrics |
| **03-26** | iOS Debugging Guide | PII audit procedure (§10) and error codes |
| **03-27** | iOS Performance Budgets | Timeout and retry configuration values |
| **03-28** | iOS Test Data Pack | Invalid QR payloads for input validation testing |
| **03-29** | iOS Client FAQ | Security rationale for key design decisions |
| **03-30** | iOS Known Limitations | Intentional security trade-offs documented |
| **05-07** | HPP Privacy Architecture | PII constraints governing containment checks |

**END OF DOCUMENT**

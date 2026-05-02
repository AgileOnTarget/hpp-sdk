**HPP iOS CLIENT**

**DEBUGGING GUIDE**

*Human Presence Protocol*

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | 03-26                                    |
| **Title**          | HPP iOS Client Debugging Guide           |
| **Version**        | 1.0                                      |
| **Status**         | Canonical                                |
| **Scope**          | MVP iOS Client — Diagnostic Procedures   |
| **Date**           | February 2026                            |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose and Scope**

This document provides deterministic debugging procedures for engineers diagnosing issues in the HPP iOS client MVP. Every diagnostic path maps to a specific failure mode, relevant telemetry events, Protocol Invariants under test, and a resolution or escalation action.

This guide is structured by failure domain. Each section contains a diagnostic checklist, relevant log events, invariant mapping, and step-by-step resolution procedures. Engineers should follow steps in order and not skip ahead.

|  |
|----|
| **Prerequisite:** All debugging must occur on devices running iOS 17.0+ with Secure Enclave hardware. Simulator-only issues are not covered here — the Secure Enclave is not available in the iOS Simulator. See 03-30 (Known Limitations) for simulator-specific constraints. |

**2. Enabling Debug Mode**

Debug mode enables verbose logging, telemetry console output, and extended error reporting. It is available only in DEBUG build configurations and is stripped from release builds.

**2.1 Build Configuration**

|  |  |
|----|----|
| **Setting** | **Value** |
| **Build Configuration** | DEBUG |
| **Preprocessor Flag** | HPP_DEBUG=1 |
| **Verbose Logging** | Enabled (all subsystems) |
| **Telemetry Console** | Visible in Xcode console output |
| **Network Logging** | Request/response headers and status codes (no body in release) |

**2.2 Log Subsystems**

The HPP iOS client uses structured logging with the following subsystems. Filter Xcode console by subsystem to isolate specific domains.

|  |  |  |
|----|----|----|
| **Subsystem** | **Covers** | **Key Events** |
| com.hpp.registration | Device registration, SE key generation, App Attest | registration_start, registration_success, registration_failure |
| com.hpp.pulse | Attestation cycle, biometric gate, clock sync | pulse_attempt, pulse_success, pulse_sign_failure, time_sync_failure |
| com.hpp.burn | Credit spend, QR parsing, receipt verification | burn_attempt, burn_success, burn_submit_failure, burn_rollback |
| com.hpp.queue | Offline queue, background submission | queue_enqueue, queue_drain_start, queue_drain_complete, queue_stall |
| com.hpp.security | SE operations, biometric auth, nonce generation | se_key_generate, se_key_sign, biometric_success, biometric_failure |

**3. Registration Failures**

Registration creates the device’s identity: a Secure Enclave key pair, an App Attest token, and a server-side device record. Failure at any stage prevents all subsequent protocol operations.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-1** | Hardware-bound key: every credential must be generated inside and never leave the Secure Enclave. |
| **I-2** | Biometric gate: the human must authenticate biometrically before any signing operation. |

**3.1 Diagnostic Steps**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Confirm device has Secure Enclave (iPhone 5s or later, not Simulator) | Device recognized as SE-capable | Use physical device. See 03-30 for simulator constraints. |
| **2** | Check App Attest availability: DCAppAttestService.shared.isSupported | Returns true | Device or iOS version does not support App Attest. Minimum iOS 14.0. Check device model. |
| **3** | Verify network connectivity to verifier /register endpoint | HTTP 200 or 201 on POST | Check verifier URL in Config.plist. Check DNS. Check TLS certificate validity. |
| **4** | Check Xcode console for registration_failure event | No failure events logged | Capture error_code from event payload. Cross-reference with error table below. |
| **5** | Verify device_id was persisted to Keychain | Non-nil UUID in Keychain query | Keychain access group mismatch or entitlements issue. Check signing profile. |

**3.2 Error Codes**

|  |  |  |
|----|----|----|
| **Error Code** | **Meaning** | **Resolution** |
| REG_SE_UNAVAIL | Secure Enclave not available on this device | Use physical SE-capable device |
| REG_ATTEST_FAIL | App Attest token generation failed | Check Apple Developer System Status. Retry after 60s. |
| REG_NET_TIMEOUT | Verifier /register endpoint unreachable or timed out | Check network, verifier URL, TLS cert |
| REG_DUPLICATE | Device already registered (device_id exists server-side) | Expected on re-install. Verify Keychain state. |
| REG_KEY_GEN_FAIL | SE key pair generation failed | Rare. Check device storage. Restart device. |

**4. Pulse Failures**

A pulse is the daily attestation that proves a registered human was biometrically present at a specific point in server-authoritative time. Pulse failures break the continuity chain and prevent credit accumulation.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-1** | Hardware-bound key: pulse signature must originate from SE private key. |
| **I-2** | Biometric gate: FaceID/TouchID must succeed before signing. |
| **I-3** | Server-authoritative time: pulse timestamp comes from /time endpoint, not device clock. |

**4.1 Diagnostic Steps**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Check /time endpoint reachability | HTTP 200 with server timestamp in response body | All pulse operations will fail. Backend issue. Check verifier status. |
| **2** | Compute clock skew: \|device_time − server_time\| | Skew \< 30 seconds | Large skew triggers rejection. Device clock may be wrong. NTP sync issue. |
| **3** | Trigger biometric prompt manually | FaceID/TouchID succeeds, LAContext returns .success | Check device biometric enrollment. User may have disabled FaceID. See 03-06. |
| **4** | Check pulse_attempt and pulse_sign_failure in console | pulse_attempt logged, no pulse_sign_failure | Capture error_code. SE signing failure or biometric cancellation. |
| **5** | Verify pulse was submitted to /pulse endpoint | HTTP 200 with pulse_id in response | Network failure or verifier rejection. Check response body for error. |
| **6** | Check offline queue if device was offline | pulse_attempt queued, queue_drain_complete after reconnect | Queue stall. See Section 9 (Offline Queue Debugging). |

**4.2 Error Codes**

|  |  |  |
|----|----|----|
| **Error Code** | **Meaning** | **Resolution** |
| PLS_TIME_UNREACHABLE | /time endpoint not reachable | Backend issue. Check verifier. |
| PLS_CLOCK_SKEW | Device-server clock skew exceeds tolerance | Force NTP sync. Check airplane mode history. |
| PLS_BIO_CANCEL | User cancelled biometric prompt | Expected user behavior. Not a bug. |
| PLS_BIO_FAIL | Biometric authentication failed (no match) | User retry. If persistent, check LAContext error domain. |
| PLS_SIGN_FAIL | SE signing operation failed | Check SE key availability. Key may need re-registration. |
| PLS_SUBMIT_FAIL | Verifier rejected pulse submission | Check response body. Epoch expired or nonce issue. |

**5. Burn Failures**

A burn is an atomic credit-spend operation. The client scans a QR code from a Relying Party, verifies the payload, confirms sufficient balance, obtains biometric authorization, signs the burn request, and submits it to the verifier. Failure at any stage must result in either complete success or complete rollback — no partial burns.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-4** | Credits are non-transferable: burn must originate from the device that earned the credits. |
| **I-5** | Credits have bounded lifetime: expired credits cannot be burned. |
| **I-6** | Burns are atomic: complete success or complete rollback, no partial state. |
| **I-7** | Idempotency: a burn_id can only be processed once. Replay is rejected. |

**5.1 Diagnostic Steps**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Scan QR code and inspect parsed payload in console | Valid JSON with session_id, rp_id, required_credits, callback_url | QR encoding error or RP-side generation bug. Check 03-12. |
| **2** | Verify required_credits ≤ current balance | Balance sufficient | Insufficient credits. Expected behavior. Not a bug. |
| **3** | Trigger biometric prompt | FaceID/TouchID succeeds | User cancelled or failed. Same handling as pulse biometric. |
| **4** | Check burn_attempt log event | Event logged with burn_id, session_id, amount | Client did not reach burn submission. Check earlier failure. |
| **5** | Verify verifier response to /burn endpoint | HTTP 200 with receipt in response body | Check error response. Session expired, idempotency conflict, or server error. |
| **6** | Confirm receipt stored locally | Receipt persisted to local storage with burn_id | Storage write failure. Check device storage capacity. |
| **7** | Verify RP callback received unlock confirmation | Website shows unlocked state | Polling timeout or callback failure. RP-side issue. Check 03-12. |

**5.2 Error Codes**

|  |  |  |
|----|----|----|
| **Error Code** | **Meaning** | **Resolution** |
| BRN_QR_INVALID | QR payload failed validation (missing fields or bad format) | RP-side QR generation issue. Check 03-12. |
| BRN_INSUFFICIENT | Balance \< required_credits | Expected. User needs more credits. |
| BRN_SESSION_EXPIRED | QR session_id has expired on verifier side | RP must generate fresh QR. Check session TTL. |
| BRN_IDEMPOTENCY | burn_id already processed (duplicate submission) | Zero-tolerance. Escalate immediately per 03-25 PB-04. |
| BRN_ROLLBACK | Atomic rollback triggered during burn | Check burn state machine logs. See Section 7. |
| BRN_RECEIPT_AGE | Receipt timestamp exceeds max_receipt_age_seconds | Check Config.plist value. May need adjustment. |
| BRN_SESSION_MISMATCH | session_id in burn request does not match active RP session | QR caching on RP side. Not a client bug. |

**6. Receipt Issues**

After a successful burn, the verifier returns a cryptographic receipt. The client stores this receipt and the Relying Party uses it to confirm the burn. Receipt issues can manifest as valid burns that fail to unlock RP content.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-7** | Idempotency: receipt tied to unique burn_id. No duplicate receipts. |
| **I-3** | Server-authoritative time: receipt timestamp must fall within valid epoch window. |

**6.1 Diagnostic Steps**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Check receipt_invalid log event for error details | No receipt_invalid events | Capture error_code and receipt fields from payload. |
| **2** | Verify receipt age: \|now − receipt_timestamp\| \< max_receipt_age_seconds | Within bounds | Receipt too old. Check latency between burn and RP verification. |
| **3** | Verify session_id in receipt matches RP’s active session | Match | Session mismatch. RP may have regenerated QR. Not a client bug. |
| **4** | Confirm receipt signature validates against verifier public key | Signature valid | Receipt tampering or key rotation issue. Escalate. |

**7. Crash During Burn (Atomicity Recovery)**

If the app crashes or is terminated mid-burn, the state machine must recover to a consistent state on relaunch. This section covers the recovery procedure and how to verify atomicity was preserved.

|  |
|----|
| **Invariant I-6:** Burns are atomic. If a crash occurs between balance deduction and verifier confirmation, the client must detect the incomplete state and recover. Credits must not be lost to a failed burn. |

**7.1 Recovery Procedure**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Relaunch app after crash | App starts normally, no immediate crash loop | Crash loop. See 03-25 PB-03. |
| **2** | Check for pending burn records in local storage | Pending record found with burn_id and state | No pending record → crash occurred before state was written. No recovery needed. |
| **3** | Query verifier /burn/status/{burn_id} | Verifier returns burn status: completed or not_found | Network failure. Retry query. |
| **4** | If verifier says completed → mark local record as complete, store receipt | Local state matches server state | State reconciliation failure. Log and escalate. |
| **5** | If verifier says not_found → roll back local balance deduction | Balance restored to pre-burn value | Rollback failure. Critical. Escalate per 03-25 PB-01. |

**7.2 Verifying Atomicity**

After recovery, confirm the following conditions hold:

|  |  |
|----|----|
| **Condition** | **How to Verify** |
| **Local balance is correct** | Balance equals pre-burn value (if rolled back) or pre-burn minus burn amount (if completed) |
| **No orphaned pending records** | Local pending burn store is empty after recovery |
| **Receipt exists if burn completed** | Receipt with matching burn_id stored locally |
| **No duplicate burn_id on verifier** | Single burn record for this burn_id in verifier logs |

**8. Secure Enclave and App Attest Debugging**

SE and App Attest are the hardware trust anchors for HPP. Failures in this domain affect all protocol operations because every signing operation requires SE access.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-1** | Hardware-bound key: all cryptographic operations must execute inside the SE. |

**8.1 Common SE Issues**

|  |  |  |
|----|----|----|
| **Issue** | **Symptoms** | **Resolution** |
| **Key not found after app reinstall** | se_key_sign fails with errSecItemNotFound. Registration succeeds but subsequent operations fail. | SE keys survive app deletion on some iOS versions. Check Keychain for stale entries. Force re-registration. |
| **App Attest service outage** | REG_ATTEST_FAIL on new registrations. Existing devices unaffected. | Check Apple Developer System Status. Transient. Retry with exponential backoff. |
| **iOS version SE behavior change** | Operations fail on specific iOS version but succeed on others. | Document in 03-30 (Known Limitations). Check 03-06 for version-specific notes. |
| **SE resource exhaustion** | Key generation succeeds but signing intermittently fails. | Rare. Restart device to clear SE state. If persistent, hardware issue. |

**9. Offline Queue Debugging**

When the device is offline, pulse attestations are queued locally and submitted when connectivity returns. Queue issues manifest as growing queue depth or stalled drain operations.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-10** | Offline tolerance: queued attestations must be submitted within the epoch validity window or pruned. |

**9.1 Diagnostic Steps**

|  |  |  |  |
|----|----|----|----|
| **Step** | **Action** | **Expected Result** | **If Fails** |
| **1** | Check pulse_queue_depth in telemetry console | Queue depth is 0 (online) or growing slowly (offline) | Queue depth growing while online → submission path blocked. |
| **2** | Verify network connectivity | Device has active network connection | If offline, queue behavior is expected. Wait for reconnect. |
| **3** | Check queue_drain_start and queue_drain_complete events | Both events present after reconnect, drain_time \< 30s | queue_drain_start without queue_drain_complete → drain stalled. |
| **4** | Check for expired entries (\> 7 days old) | No entries older than 7 days | Expired entries should auto-prune. Check expiration logic. |
| **5** | Verify BGTaskScheduler execution (iOS 18) | Background task executed within expected window | iOS 18 throttles aggressively. See 03-17 R16. |

**10. PII Audit Procedure**

HPP is designed to emit zero PII in any telemetry, log, or network payload. This section defines the manual audit procedure to verify PII containment. Run this audit during the 72-hour post-release window (03-25 Section 7) and after any code change that modifies logging or network calls.

|  |
|----|
| **Invariants I-11, I-12:** No PII is collected, stored, or transmitted. Any PII detection is a zero-tolerance Critical event (03-25 PB-05). There is no acceptable threshold for PII leakage. |

**10.1 Search Patterns**

Search all logs, telemetry payloads, and captured network traffic for the following patterns:

|  |  |  |
|----|----|----|
| **Pattern** | **What It Catches** | **Expected Result** |
| email | Any email address in any field | Zero matches |
| phone | Phone numbers in any format | Zero matches |
| apple_id | Apple ID identifiers | Zero matches |
| name (first\|last\|full) | User name fields | Zero matches |
| @.\*\\com | Email-like patterns in any string | Zero matches |
| location\|latitude\|longitude | Geolocation data | Zero matches |
| IDFA\|IDFV\|advertisingIdentifier | Apple advertising or vendor identifiers | Zero matches |

**10.2 Network Traffic Audit**

During the 72-hour monitoring window, run a network proxy (Charles Proxy or mitmproxy) on test devices. Capture all HTTP/HTTPS traffic between the HPP client and the verifier. Run automated pattern matching against captured payloads. Any match is a Critical event.

|  |
|----|
| **Note:** Network captures are run on test devices only. Capture data is stored ephemerally and deleted after the audit window closes. The audit itself must not create a PII risk. |

**11. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-02** | Protocol Invariants Specification | Defines all 14 invariants referenced throughout this guide |
| **03-06** | iOS Platform Integration | SE behavior, App Attest, iOS version-specific notes |
| **03-08** | iOS Client Acceptance Tests | Pre-release test suite that should catch issues before debugging is needed |
| **03-12** | Demo Website Security Model | QR generation, polling, session management on RP side |
| **03-14** | Telemetry Events | Complete telemetry schema defining all log events referenced here |
| **03-17** | iOS Implementation Risk Register | Known risks including iOS 18 background task throttling (R16) |
| **03-25** | Post-Release Monitoring Plan | Monitoring thresholds and triage playbooks for production issues |
| **03-30** | iOS Known Limitations | Device-specific and simulator constraints |
| **05-07** | HPP Privacy Architecture | PII constraints governing the audit procedure in Section 10 |

**END OF DOCUMENT**

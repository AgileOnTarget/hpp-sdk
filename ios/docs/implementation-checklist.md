**HUMAN PRESENCE PROTOCOL**

iOS Client Implementation Plan Checklist

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | OSI8_04B_09                              |
| **Version**        | 3.0                                      |
| **Date**           | April 2026                               |
| **Status**         | Canonical                                |
| **Scope**          | MVP                                      |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |
| **Owner**          | Agile On Target LLC                      |

**1. Purpose**

Define an ordered, verifiable, step-by-step implementation checklist for building the HPP iOS client. This checklist is intended to be followed sequentially by an engineer. No step should be skipped. Each step has explicit acceptance criteria that must pass before proceeding to the next step.

Stop rule: No step proceeds until the previous step passes its acceptance criteria. Deviations from this checklist require a documentation update to this document before proceeding.

**1.1 How to Use This Document**

- Work through sections 1-13 in order.

- Within each section, complete tasks top-to-bottom.

- Check the ☐ box when a task is complete and its acceptance criteria pass.

- If a task cannot be completed as specified, stop and update this document before proceeding.

- Cross-reference the VDR Ref column for detailed specifications.

**2. Section 1: Repository and Guardrails**

Establish the project structure, configuration loading, and error handling before writing any feature code.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Create repository structure** | /HPPApp, /HPPAppTests, /HPPAppUITests, /Docs. Standard Xcode project. Swift 5.9+. iOS 17.0 minimum deployment. | OSI8_04B_25 | Builds clean |
| **☐** | **Add .gitignore** | Ignore: Config.plist, \*.xcuserdata, DerivedData, .env, \*.ipa, Pods/ |  | git status clean |
| **☐** | **Add Config.plist template** | Config-Example.plist checked in. Config.plist in .gitignore. Keys: HPP_VERIFIER_URL, HPP_API_TIMEOUT_MS, HPP_MAX_RECEIPT_AGE_S, HPP_PULSE_INTERVAL_S, HPP_LOG_LEVEL, HPP_APP_ATTEST_ENV, HPP_SE_KEY_TAG. | OSI8_04A_13 | Config loads |
| **☐** | **Create Xcode schemes** | HPP-Dev (Config-Dev.plist, Debug), HPP-Staging (Config-Staging.plist, Release), HPP-Prod (Config-Prod.plist, Release). | OSI8_04A_13 | 3 schemes build |
| **☐** | **Startup config validation** | Validate all required Config.plist keys at launch. fatalError on missing or invalid. Validate URL format, numeric ranges. | OSI8_04A_13 | Bad config = crash |
| **☐** | **Implement ErrorCode enum** | Shared enum mapping to OSI8_02B_10 Error Code Registry. Every error modal displays diagnostic code. Codes are structured strings, not free-text. | OSI8_02B_10 | Codes display |
| **☐** | **Implement telemetry stub** | HPPTelemetry class with emitEvent(). Uses os_log. Respects HPP_LOG_LEVEL. No-op if telemetry disabled. | OSI8_03C_14 | Events in Console |
| **☐** | **Zero third-party dependencies** | No CocoaPods, no SPM external packages. All code is first-party. Verify with swift package dump-package. |  | 0 externals |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| App builds on all 3 schemes without warnings | xcodebuild clean build |
| Config loads from correct plist per scheme | Print config at launch per scheme |
| Missing config key causes fatalError at launch | Remove key, build, launch |
| ErrorCode enum covers all codes in OSI8_02B_10 | Diff enum cases vs. registry |

**3. Section 2: Device Identity and Key Material**

Generate the cryptographic identity that persists for the device's lifetime. This is the foundation of hardware-bound presence.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Generate device UUID** | crypto.randomUUID() on first launch. Stored in Keychain with kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly. Non-PII pseudonym. | OSI8_04B_25 | UUID persists |
| **☐** | **Generate SE keypair** | kSecAttrKeyTypeECSECPrimeRandom, 256-bit. kSecAttrTokenIDSecureEnclave. Private key non-exportable. Store key tag from Config.plist. | OSI8_04B_25 | Key in Keychain |
| **☐** | **Biometric access control** | SecAccessControlCreateWithFlags: .privateKeyUsage, .biometryCurrentSet. No passcode fallback. | OSI8_04B_25 | Face ID required |
| **☐** | **Export public key** | SEC1 compressed format. This is the only key material that ever leaves the device. | OSI8_04B_25 | Base64 exports |
| **☐** | **Generate App Attest key** | DCAppAttestService.shared.generateKey(). Store keyId in Keychain. | OSI8_04B_25 | keyId stored |
| **☐** | **Attest key with Apple** | DCAppAttestService.shared.attestKey(). Store attestation object. | OSI8_04B_25 | Attestation OK |
| **☐** | **Register with verifier** | POST /register: send public key (SEC1), device UUID, App Attest attestation. Receive registration acknowledgement. | OSI8_04B_25 | Verifier confirms |
| **☐** | **Handle SE unavailable** | Check SecureEnclave.isAvailable at launch. If false: show "This device does not support HPP" and disable all features. | OSI8_04B_08 | Graceful message |
| **☐** | **Handle biometric change** | Detect .biometryCurrentSet invalidation. Invalidate SE key. Force re-registration. | OSI8_04B_08 | Key invalidated |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| SE key persists across app restarts | Kill app, relaunch, verify key tag |
| SE key does NOT persist to new device (no iCloud sync) | Restore backup to new device |
| Verifier confirms key registered | Check verifier key registry |
| Biometric enrollment change invalidates key | Add fingerprint, verify key gone |
| Public key exports in SEC1 compressed format | Verify 33-byte output |

**4. Section 3: Time Synchronization**

Establish server-time authority. Client clocks are never trusted.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Implement /time call** | GET /time to verifier. Response: { server_time: ISO8601 }. Called at app launch and every pulse_interval. | OSI8_04B_25 | Offset stored |
| **☐** | **Compute server offset** | offset = server_time - device_time. Store in memory. Update on each /time response. |  | Offset \< 30s |
| **☐** | **Apply offset to all timestamps** | Every timestamp sent to verifier uses device_time + offset. Never raw device clock. |  | Timestamps adjusted |
| **☐** | **Enforce skew window** | If abs(offset) \> max_pulse_skew_seconds from Config.plist, reject pulse locally with error_code: time_skew_exceeded. | OSI8_04A_13 | Pulse rejected |
| **☐** | **Handle /time failure** | If /time call fails, use last known offset. If no offset exists (first launch), block pulse generation until sync succeeds. |  | Graceful degrade |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Server offset stored and applied to pulse timestamps | Compare pulse timestamp vs. device clock |
| Pulse rejected when skew exceeds max_pulse_skew_seconds | Set device clock +60s, attempt pulse |

**5. Section 4: Pulse Minting**

Implement the core biological-time-to-digital-credits conversion. Each pulse is one biometric confirmation that mints presence credits.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Define Pulse struct** | Fields: device_id (UUID), timestamp (ISO8601, server-adjusted), public_key_id (key tag), nonce (random 32 bytes), signature (ECDSA P-256). | OSI8_04B_25 | Struct compiles |
| **☐** | **Biometric gate** | LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics). .biometryCurrentSet only. No passcode fallback. | OSI8_04B_25 | Biometric required |
| **☐** | **Quiet failure** | If biometric fails or user cancels: emit ios.pulse.biometric_cancel. No error modal. Return to Idle silently. | OSI8_04B_08 | Silent return |
| **☐** | **Sign pulse** | ECDSA P-256 sign over serialized payload using SE private key. Signature in DER format. | OSI8_04B_25 | Signature valid |
| **☐** | **Enforce pulse interval** | Minimum pulse_interval_s between pulses. If user attempts too soon, show countdown. Do not prompt biometric. | OSI8_04A_13 | Interval enforced |
| **☐** | **Submit pulse to verifier** | POST /pulse with JSON body. Include App Attest assertion. Timeout: api_timeout_ms from Config.plist. | OSI8_04B_25 | HTTP 200 |
| **☐** | **Handle pulse response** | On success: update credit balance. On failure: emit ios.pulse.failed with error_code. Show error with diagnostic code. | OSI8_03C_14 | Balance updates |
| **☐** | **Queue if offline** | If network unavailable, add pulse to offline queue (Section 5). Emit ios.queue.enqueued. | OSI8_03C_14 | Queued indicator |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Pulse created only after biometric success | Attempt without biometric |
| Pulse signed with SE key (verifiable by verifier) | Submit, check verifier validation |
| Pulse delivered to verifier or queued offline | Test online and airplane mode |
| Pulse interval enforced (cannot spam) | Attempt 2 pulses within interval |

**6. Section 5: Offline Queue and Sync**

Handle network interruptions gracefully. Pulses and receipts generated offline are queued and synced when connectivity returns.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Persistent queue storage** | FileManager JSON file in Application Support. Not in Documents (no user visibility). Not in Caches (survives purge). |  | Persists restart |
| **☐** | **Queue limits** | Max queue depth: offline_queue_max from Config.plist. Max item age: offline_queue_ttl_days. Prune expired items on each sync attempt. | OSI8_04A_13 | Limits enforced |
| **☐** | **Network monitor** | NWPathMonitor. On path.status == .satisfied, trigger sync. On .unsatisfied, switch to queue mode. |  | Auto-detects |
| **☐** | **Sync on restore** | On network restore: submit oldest queued items first (FIFO). One at a time. Stop on first failure. Emit ios.queue.synced on completion. | OSI8_03C_14 | FIFO sync |
| **☐** | **Syncing UI indicator** | Home screen shows syncing badge when queue depth \> 0. Badge shows count. Disappears when queue empty. |  | Badge visible |
| **☐** | **Queue expiration** | Items older than offline_queue_ttl_days are pruned without submission. Emit ios.queue.expired with items_expired count. | OSI8_03C_14 | Expired pruned |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Offline pulses eventually submit when network returns | Airplane mode \> pulse \> restore |
| Queue persists across app restart | Queue item \> kill app \> relaunch \> check queue |
| User sees syncing indicator when queue non-empty | Visual check |
| Expired items pruned, not submitted | Set TTL to 1s, wait, verify no submission |

**7. Section 6: Credits Ledger**

Maintain an accurate, device-bound credit balance. Credits are minted by pulses and consumed by burns.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Ledger data structure** | Array of ledger entries. Each entry: { type: mint\|burn, amount, timestamp, nonce, previous_hash }. Hash chain for tamper evidence. |  | Chain valid |
| **☐** | **Device-bound storage** | Keychain with kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly. Does not sync to iCloud. Does not migrate to new device. | OSI8_04B_25 | No cloud sync |
| **☐** | **Credit after verifier confirmation** | Credits added only after verifier returns acknowledgement for pulse. Never optimistic. Never client-side only. |  | Server-confirmed |
| **☐** | **Debit before burn** | Credits decremented atomically with burn initiation. If burn fails, credits restored. |  | Atomic debit |
| **☐** | **Balance display** | Home screen shows current balance as integer. Updated immediately after pulse confirmation or burn. |  | Balance correct |
| **☐** | **Negative balance prevention** | If credits \< required for burn, show "Insufficient credits" and block burn flow. Do not prompt biometric. | OSI8_04B_08 | Burn blocked |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Credit balance updates only after server confirmation | Monitor balance vs. network responses |
| Balance cannot go negative | Attempt burn with 0 credits |
| Ledger hash chain is tamper-evident | Modify entry, verify chain breaks |

**8. Section 7: Burn Flow**

Implement the QR-scan-to-receipt flow. This is the user-facing transaction that proves human presence to a relying party.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Camera + QR scanning** | AVCaptureSession with AVMetadataObjectTypeQRCode. Request camera permission. Handle denial gracefully. | OSI8_04B_25 | QR scans |
| **☐** | **Parse QR payload** | JSON: { session_id, callback_url, credits_required, service_name }. Validate all fields. Reject malformed with ios.burn.requested error. | OSI8_03C_11 | Fields parsed |
| **☐** | **Validate session_id format** | UUID v4 regex. If invalid, show error with diagnostic code. Do not proceed to biometric. | OSI8_03C_12 | Bad UUID rejected |
| **☐** | **Validate callback_url** | Must be HTTPS. Must parse as valid URL. Reject HTTP, reject malformed. | OSI8_03C_12 | HTTP rejected |
| **☐** | **Check credit balance** | If credits \< credits_required, show "Insufficient credits. Need N, have M." Do not prompt biometric. | OSI8_04B_08 | Balance checked |
| **☐** | **Biometric gate burn** | LAContext with .biometryCurrentSet. On success: transition to BurnProcessing. On cancel: transition to BurnCancelled (silent). | OSI8_04B_08 | Biometric gates |
| **☐** | **Atomic state transition** | Transition from BurnAuth to BurnProcessing is atomic. No interleaving. Lock prevents concurrent burns. | OSI8_04B_08 | No interleave |
| **☐** | **Create burn_id** | UUID v4. Unique per burn attempt. Used for idempotency. |  | Unique per burn |
| **☐** | **Create burn record** | Fields: burn_id, session_id, timestamp (server-adjusted), credits_burned, nonce (32 bytes random), previous_burn_hash. |  | Record created |
| **☐** | **Hash chain to previous burn** | SHA-256(previous_burn_record). First burn uses genesis hash. Append to ledger. |  | Chain extends |
| **☐** | **Sign burn record** | ECDSA P-256 sign over burn record using SE key. Include App Attest assertion. | OSI8_04B_25 | Signed |
| **☐** | **Submit to callback_url** | POST to callback_url from QR. Body: burn record + signature + App Attest assertion. Timeout: api_timeout_ms. |  | HTTP 200 |
| **☐** | **Enforce timing window** | Burn must complete within max_receipt_age_s. If exceeded, abort and restore credits. | OSI8_04A_13 | Timeout aborts |
| **☐** | **Idempotency on burn_id** | If same burn_id submitted twice, verifier returns same receipt. Client handles gracefully. |  | Idempotent |
| **☐** | **Receive and store receipt** | On success: store receipt locally (Section 8). Update balance. Transition to BurnSuccess. | OSI8_04B_08 | Receipt stored |
| **☐** | **Handle burn failure** | On failure: restore credits. Emit ios.burn.failed. Show error with diagnostic code. Transition to BurnFailed. | OSI8_04B_08 | Credits restored |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| QR scans and parses valid payloads | Scan test QR |
| Malformed QR rejected with error code | Scan bad QR |
| Credits decrement exactly once per successful burn | Monitor balance across burn |
| Failed burn restores credits to pre-burn balance | Force network failure mid-burn |
| Receipt returned and stored locally | Check local storage after burn |
| Burn state machine matches OSI8_04B_08 transitions | Trace states during burn |

**9. Section 8: Receipt Handling**

Validate, store, and display receipts returned from successful burns.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Validate receipt age** | Receipt timestamp must be within max_receipt_age_s. If stale, discard and show warning. | OSI8_04A_13 | Stale rejected |
| **☐** | **Store last receipt** | Keychain storage. One receipt per session_id. Overwrite on re-burn (idempotent). Prune receipts older than 24 hours. |  | Stored + pruned |
| **☐** | **Display receipt confirmation** | Burn success screen shows: service_name, credits_burned, timestamp, session_id (last 6 chars). Animated checkmark. | OSI8_04B_08 | UI displays |
| **☐** | **Receipt never logged** | Receipt body and signature must never appear in os_log at any log level. | OSI8_03C_14 | Log audit clean |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Valid receipts stored and displayed | Complete burn flow, verify UI |
| Stale receipts rejected | Delay receipt delivery beyond max age |
| No receipt content in logs at debug level | Enable debug logging, check Console.app |

**10. Section 9: UI Screens**

Implement all user-facing screens. Minimal, institutional, no consumer-app aesthetics.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Install + Register screen** | First launch only. Shows: generating keys, registering with verifier. Progress indicator. Transitions to Home on success. | OSI8_04B_08 | One-time flow |
| **☐** | **Home screen** | Shows: credit balance (large), member since date, syncing badge (if queue non-empty), pulse button, scan button. |  | All elements |
| **☐** | **Pulse screen** | Biometric prompt. On success: brief animation, return to Home with updated balance. On cancel: silent return. | OSI8_04B_08 | Smooth flow |
| **☐** | **Scan QR screen** | Full-screen camera viewfinder. QR detection overlay. Haptic on successful scan. Auto-transition to burn confirmation. | OSI8_04B_25 | Camera + haptic |
| **☐** | **Burn confirmation** | Shows: service_name, credits_required, current balance. "Confirm" triggers biometric. "Cancel" returns to Home. |  | Clear info |
| **☐** | **Burn processing** | Spinner. "Processing..." text. No user interaction allowed. Timeout after max_receipt_age_s. | OSI8_04B_08 | Locked UI |
| **☐** | **Receipt confirmation** | Animated checkmark. Service name, timestamp, session stub. Auto-dismiss after 3 seconds or tap to dismiss. |  | Auto-dismiss |
| **☐** | **Error modal** | Every error shows: error title, plain-English description, diagnostic code (from ErrorCode enum), "OK" button. | OSI8_02B_10 | Code displayed |
| **☐** | **No-SE device screen** | "This device does not support HPP. A device with Secure Enclave is required." No further interaction possible. |  | Dead end |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| All screens reachable and display correctly | Manual walkthrough |
| Every error modal includes diagnostic code | Trigger each error, check modal |
| State machine transitions match OSI8_04B_08 | Trace screen transitions |

**11. Section 10: Telemetry**

Emit structured telemetry events at every state transition per OSI8_03C_14.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Emit all iOS events from OSI8_03C_14** | 20 events defined in OSI8_03C_14 Section 4. Every state transition emits its corresponding event. | OSI8_03C_14 | All 20 emitted |
| **☐** | **Common schema compliance** | Every event conforms to the JSON schema from OSI8_03C_14 Section 3: event, timestamp, component, version, session_id, result, duration_ms, error_code, metadata. | OSI8_03C_14 | Schema validates |
| **☐** | **No PII in any event** | No biometric data, no user name, no Apple ID, no IDFA, no device name, no full IP, no GPS. Only categorical values and structured codes. | OSI8_03C_14 | PII audit clean |
| **☐** | **Log level filtering** | Debug events suppressed at info level. Info events suppressed at error level. Matches log_level from Config.plist. | OSI8_04A_13 | Levels respected |
| **☐** | **Disable without side effects** | If telemetry disabled in config, all emitEvent() calls are no-ops. No crashes, no performance impact. |  | Disabled works |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| End-to-end trace produces events 1-4 from OSI8_03C_14 Section 7 | Complete burn, check Console.app |
| No PII in any event at debug log level | Enable debug, search for PII patterns |
| Telemetry can be disabled without affecting operation | Disable, run full flow |

**12. Section 11: Acceptance Tests**

Implement automated tests covering every acceptance criterion in the VDR.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **Import tests from OSI8_04B_07 including migration tests T24-T30** | Implement all test cases from the iOS Client Test Runbook. Map each test to its VDR criterion. | OSI8_04B_07 | All cases pass |
| **☐** | **Idempotent burn test** | Submit same burn_id twice. Verify same receipt returned. Verify credits decremented once. |  | Idempotent |
| **☐** | **No PII network test** | Capture all outbound HTTP requests. Verify no PII in any request body, header, or URL parameter. | OSI8_03C_14 | Network clean |
| **☐** | **Crash recovery around burn** | Force-kill app during BurnProcessing. Relaunch. Verify: credits consistent, no orphaned state, app recovers to Idle. | OSI8_04B_08 | Recovers clean |
| **☐** | **Biometric enrollment change** | Add new fingerprint/face. Verify SE key invalidated. Verify app transitions to re-registration. | OSI8_04B_08 | Re-registers |
| **☐** | **Offline queue round-trip** | Queue pulse offline. Restore network. Verify submission. Verify balance update. |  | Full round-trip |
| **☐** | **Config validation tests** | Remove each required Config.plist key individually. Verify fatalError on each. | OSI8_04A_13 | Each key fatal |
| **☐** | **State machine coverage** | Verify every legal transition in OSI8_04B_08 is exercised. Verify every illegal transition is unreachable. | OSI8_04B_08 | 100% coverage |

|  |  |
|----|----|
| **Criterion** | **Verification** |
| All tests from OSI8_04B_07 pass | XCTest suite run |
| All state machine transitions exercised | Code coverage report |
| No test requires network access (mock verifier) | Run tests in airplane mode |

**13. Section 12: Device Migration**

Implement the device migration feature. Supports two paths: Normal Migration (old device physically available) and Recovery Migration (old device lost, stolen, or destroyed). Both paths atomically revoke the old key and bind a new SE keypair. Patent D (Single Primary Device) mandates the atomic handoff. Patent F (Device Churn Throttling) enforces the 7-day recovery cooldown. State machine defined in OSI8_04B_08 Section 3.4. Test cases T24-T30 in OSI8_04B_06. Runbook procedures in OSI8_04B_07.

**12.1 Migration Entry Point**

|  |  |  |  |  |
|----|----|----|----|----|
|  | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| ☐ Migration entry in Settings |  | Settings screen exposes "Device Migration" option. Tapping it presents MigrationChoice screen. Show two clearly labelled paths: "I have my old device" and "I don't have my old device." | OSI8_04B_08 | Choice visible |
| ☐ Churn throttle check on entry |  | Before showing MigrationChoice, query verifier GET /v1/migration/eligibility. If churn throttle active, show "Migration available in N days" with next_eligible_ts. Do not allow entry until server confirms eligibility. | OSI8_04B_08 | Throttle blocks |
| ☐ Migration state persists across restart |  | If migration is in progress when app is killed, relaunch must resume at the correct state (QRDisplayed, CooldownWait, etc.). Store migration state in Keychain, not UserDefaults. | OSI8_04B_08 | Resumes correctly |

**12.2 Normal Migration Path (Old Device Available)**

Requires two physical devices. Old device generates the migration capsule; new device scans it and completes the handoff.

|  |  |  |  |  |
|----|----|----|----|----|
|  | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| ☐ Biometric on old device |  | On old device: LAContext.evaluatePolicy(.biometryCurrentSet). On success: generate signed migration capsule: { identity_root, score, credits, epoch, old_device_sig, timestamp, ttl: 600 }. capsule_sig = ECDSA P-256 sign(capsule_payload) using old SE key. | OSI8_04B_08 | Capsule signed |
| ☐ Display migration QR on old device |  | Encode capsule as base64. Display as QR code with 10-minute countdown timer. If timer expires, return to MigrationChoice with "Migration expired" message. No key change occurs. | OSI8_04B_08 | QR visible; timer works |
| ☐ New device scans migration QR |  | AVCaptureSession on new device. Decode base64 capsule. Validate capsule_sig against old device public key (fetch from verifier if not cached). Validate TTL not expired. If invalid: show error, return to MigrationChoice. | OSI8_04B_08 | Capsule validated |
| ☐ Biometric on new device |  | LAContext.evaluatePolicy(.biometryCurrentSet) on new device. On success: generate new SE keypair (kSecAttrTokenIDSecureEnclave, .biometryCurrentSet). On fail/cancel: return to MigrationChoice. Old key still valid. | OSI8_04B_08 | New SE key created |
| ☐ Submit rotation to verifier |  | POST /v1/migration/rotate: { old_key_id, new_public_key, capsule, old_device_sig, new_device_sig, app_attest_assertion }. Verifier atomically: validates both sigs, revokes old key, registers new key, transfers score/credits. | OSI8_04B_08 | HTTP 200 from verifier |
| ☐ Old device enters revoked state |  | After successful rotation, old device shows "This device is no longer active." on any protocol operation. Verifier returns HTTP 401 for all old-key requests. Client clears local state. | OSI8_04B_06 | Old device 401s |
| ☐ Score and credits fully preserved |  | After rotation: new device continuity score == old device score. Credits balance identical. No penalty on normal path. Verify via verifier admin endpoint. | OSI8_04B_06 | Score preserved |

**12.3 Recovery Migration Path (Old Device Unavailable)**

Old device is gone. New device initiates recovery. Verifier enforces 7-day cooldown before completing rotation. Score penalty: 50% reduction. Credits preserved.

|  |  |  |  |  |
|----|----|----|----|----|
|  | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| ☐ Recovery initiation biometric |  | LAContext on new device. On success: POST /v1/migration/recovery/initiate with new_public_key and app_attest_assertion. Server responds with cooldown_expires_at timestamp. Store in Keychain. | OSI8_04B_08 | Initiation accepted |
| ☐ Cooldown display screen |  | CooldownWait screen: shows days remaining, "Your old device has been flagged for recovery." countdown updates on each app launch (recompute from stored cooldown_expires_at). T30: close and reopen app, verify countdown updates. | OSI8_04B_08 | Countdown visible |
| ☐ Block pulse on both devices during cooldown |  | While recovery is pending, verifier returns HTTP 423 (Locked) for pulse and burn on old device identity. New device cannot pulse until rotation complete. App shows recovery pending indicator. | OSI8_04B_08 | Pulse blocked |
| ☐ Recovery claim after cooldown |  | After cooldown_expires_at: show "Claim Recovery" button. POST /v1/migration/recovery/claim with new_device_sig. Verifier atomically: revokes old key, registers new key, transfers score \* 0.5 (floor), transfers full credits. | OSI8_04B_08 | Claim succeeds |
| ☐ Apply 50% score penalty |  | After recovery rotation: local score display == floor(old_score \* 0.5). Tier recalculated from new score. Show "Recovery complete. Score adjusted." Credits balance unchanged. | OSI8_04B_06 | Penalty applied |
| ☐ Churn throttle enforcement |  | If identity has migrated within last 7 days, POST /v1/migration/recovery/initiate returns HTTP 429 with next_eligible_ts. Show cooldown message. Block entry to recovery path. | OSI8_04B_08 | 429 on throttle |

**12.4 Migration Failure Handling**

|  |  |  |  |  |
|----|----|----|----|----|
|  | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| ☐ RotationFailed — no partial state |  | If POST /v1/migration/rotate returns 4xx/5xx, neither key is revoked. Old device remains active. New device has an unregistered keypair. Show error with diagnostic code. Return to MigrationChoice. Allow retry. | OSI8_04B_08 | Old key still valid |
| ☐ Network failure during rotation |  | If network drops during rotation POST: detect timeout, show "Migration paused. Old device still active. Retry when connected." Queue rotation for retry on reconnect. Do NOT create a partially-rotated state. | OSI8_04B_08 | Retryable; no partial |
| ☐ T25: Old device rejects (cancel biometric) |  | If old-device biometric is cancelled: migration stays in QRDisplayed pending state on new device. New device shows "Waiting for old device." No state change to either device. | OSI8_04B_06 | Pending state correct |
| ☐ T26: Migration timeout (10 min) |  | If new device does not scan QR within 10 minutes: migration expires automatically. New device returns to MigrationChoice. No key change. Old device remains active. | OSI8_04B_06 | Expiry correct |

**12.5 Migration Acceptance Criteria**

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Normal migration completes end-to-end (T24) | Two-device test: complete full normal migration flow |
| Old device 401s after successful migration (T29) | Attempt pulse on old device post-migration |
| Score fully preserved on normal path | Compare score before/after migration via verifier admin |
| Old device rejects flow when biometric cancelled (T25) | Cancel old-device biometric, verify new device stays pending |
| Migration expires after 10 minutes (T26) | Wait 10+ min without scanning, verify expiry UI |
| Recovery initiation accepted (T27 steps 1-3) | Initiate recovery, verify cooldown screen appears |
| Recovery cooldown countdown visible on relaunch (T30) | Close and reopen app during cooldown |
| Recovery 50% score penalty applied (T27 full) | Complete recovery, verify score = floor(old \* 0.5) |
| Churn throttle blocks re-migration within 7 days | Migrate, immediately attempt again, verify 429 |
| RotationFailed leaves no partial state | Simulate rotation server error, verify old key still valid |
| Migration state persists across app restart | Kill app during CooldownWait, relaunch, verify state resumes |

**14. Section 13: Build and Distribution**

Configure signing, build pipelines, and distribution for all environments.

|  |  |  |  |  |
|----|----|----|----|----|
| **☐** | **Task** | **Implementation Detail** | **VDR Ref** | **Acceptance** |
| **☐** | **App signing configured** | Apple Developer account. Provisioning profiles for Dev, Staging (Ad Hoc), Prod (App Store). Automatic signing for Dev only. |  | All profiles |
| **☐** | **App Attest entitlement** | com.apple.developer.devicecheck.appattest-environment entitlement. Development for Dev scheme, production for Staging/Prod. |  | Entitlement set |
| **☐** | **Config injection per scheme** | Each Xcode scheme loads its corresponding Config.plist. Verify at build time. | OSI8_04A_13 | Correct config |
| **☐** | **TestFlight build** | Archive HPP-Staging scheme. Upload to App Store Connect. Distribute via TestFlight. |  | TF installable |
| **☐** | **Build number automation** | Build number auto-increments. Version number manually controlled. Format: {version} ({build}). |  | Auto-increment |
| **☐** | **No debug code in release** | Assert no print(), no debugPrint(), no \#if DEBUG code that bypasses security, no Charles Proxy allowance in Staging/Prod. | OSI8_04A_13 | Audit clean |

|                                                   |                         |
|---------------------------------------------------|-------------------------|
| **Criterion**                                     | **Verification**        |
| Dev build runs on physical device with debugger   | Xcode run               |
| TestFlight build installs and runs on test device | TF install + smoke test |
| No debug artifacts in Staging/Prod builds         | Binary audit            |

**15. Section 14: Stop Rules**

Non-negotiable rules that govern how this checklist is used.

|  |  |
|----|----|
| **Rule** | **Enforcement** |
| No step proceeds until previous step passes acceptance | Review acceptance criteria with Protocol Architect before proceeding. |
| Deviations require document update first | If implementation differs from checklist, update this document before writing code. |
| No shortcuts on security steps | SE key generation, biometric gating, and App Attest are not optional. Cannot be deferred. |
| No PII at any layer, ever | If any step introduces PII risk, stop and escalate. PII is a protocol violation. |
| Tests before features | Write the test case before implementing the feature. Test-first for all security-critical code. |
| One engineer, one device, one branch | MVP is built by one developer. No parallel feature branches. Linear commits. |

**16. Progress Tracker**

Summary view of completion status across all sections.

|  |  |  |  |  |
|----|----|----|----|----|
| **\#** | **Section** | **Tasks** | **Status** | **Date Complete** |
| **1** | Repository and Guardrails | 8 | ☐ |  |
| **2** | Device Identity and Key Material | 9 | ☐ |  |
| **3** | Time Synchronization | 5 | ☐ |  |
| **4** | Pulse Minting | 8 | ☐ |  |
| **5** | Offline Queue and Sync | 6 | ☐ |  |
| **6** | Credits Ledger | 6 | ☐ |  |
| **7** | Burn Flow | 16 | ☐ |  |
| **8** | Receipt Handling | 4 | ☐ |  |
| **9** | UI Screens | 9 | ☐ |  |
| **10** | Telemetry | 5 | ☐ |  |
| **11** | Acceptance Tests | 8 | ☐ |  |
| **12** | Device Migration | 12 | ☐ |  |
| **13** | Build and Distribution | 6 | ☐ |  |
|  | **TOTAL** | **102** |  |  |

**17. VDR Cross-References**

|             |                                  |                        |
|-------------|----------------------------------|------------------------|
| **Doc ID**  | **Title**                        | **Usage**              |
| OSI8_02B_10 | Error Code Registry              | ErrorCode enum         |
| OSI8_04B_25 | iOS Client Architecture          | SE, biometric, network |
| OSI8_04B_07 | iOS Client Test Runbook          | Test cases             |
| OSI8_03C_11 | Demo Website UX Flows            | QR payload format      |
| OSI8_03C_12 | Demo Website Security Model      | Validation rules       |
| OSI8_04A_13 | Environment Configuration Matrix | Config values          |
| OSI8_03C_14 | Telemetry Events                 | Event catalog          |
| OSI8_04B_08 | State Machine Diagrams           | State transitions      |

**18. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 1.0 | 2025 | Initial draft. 13 sections with checkbox tasks and basic acceptance criteria. |
| 3.0 | April 2026 | Complete rewrite. Expanded from ~35 tasks to 90 tasks. Every task now has: implementation detail, VDR cross-reference, and inline acceptance. Added per-section acceptance criteria tables. Added Section 2 expansion (biometric change handling, SE unavailable, public key export format). Added Section 3 expansion (offset computation, /time failure handling). Added Section 7 expansion (16-step burn flow with QR validation, state transitions, hash chaining, idempotency). Added progress tracker with section totals. Added stop rules. All tasks traceable to VDR documents. |

END OF DOCUMENT

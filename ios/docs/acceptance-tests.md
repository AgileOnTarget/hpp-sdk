**HUMAN PRESENCE PROTOCOL**

iOS Client Acceptance Tests

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | OSI8_04B_06                              |
| **Version**        | 3.0                                      |
| **Date**           | April 2026                               |
| **Status**         | Canonical                                |
| **Scope**          | MVP / Production                         |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |
| **Owner**          | Agile On Target LLC                      |

**1. Purpose**

Define black-box acceptance tests that verify the HPP iOS client satisfies functional, security, reliability, and privacy requirements. Tests validate externally observable behavior only. Internal implementation details are not tested here.

Each test is assigned a priority: P0 (ship-blocking, must pass before any release), P1 (must pass before production release), or P2 (should pass, tracked as known issues if deferred).

**2. Test Environment**

|  |  |
|----|----|
| **Parameter** | **Requirement** |
| **Device** | iPhone with Secure Enclave (A11 Bionic or later) |
| **iOS Version** | iOS 17+ (target iOS 18.x) |
| **Biometrics** | Face ID or Touch ID enrolled |
| **Network** | Wi-Fi or cellular connectivity available (unless testing offline) |
| **Jailbreak** | Device must NOT be jailbroken (except T18) |
| **Build** | HPP-Test scheme (com.hpp.test) via TestFlight |
| **Verifier** | Test verifier at test.hpp.network |
| **Tools** | Charles Proxy or mitmproxy for network inspection (T20-T22) |

**3. Test Summary**

|                          |        |        |        |           |
|--------------------------|--------|--------|--------|-----------|
| **Category**             | **P0** | **P1** | **P2** | **Total** |
| **Installation & Setup** | 2      |        |        |           |
| **Installation & Setup** | 2      | 1      | 0      | 3         |
| **Daily Pulse**          | 2      | 2      | 0      | 4         |
| **Burn Flow**            | 2      | 1      | 0      | 3         |
| **Offline Operation**    | 1      | 2      | 0      | 3         |
| **Crash Recovery**       | 1      | 1      | 0      | 2         |
| **Security Enforcement** | 2      | 2      | 1      | 5         |
| **Privacy Guarantees**   | 1      | 2      | 0      | 3         |
| **TOTAL**                | **11** | **11** | **1**  | **30**    |

**4. Installation & Setup**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T01</strong></td>
<td>Fresh Install Generates SE Key</td>
<td><p>1. Install app via TestFlight</p>
<p>2. Launch app</p>
<p>3. Complete setup flow</p></td>
<td><p>Public key created and displayed</p>
<p>Private key non-exportable (SE-bound)</p>
<p>Key reference persisted in Keychain</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T02</strong></td>
<td>App Attest Registration</td>
<td><p>1. Launch app on fresh install</p>
<p>2. Proceed through registration</p></td>
<td><p>App Attest keyId generated</p>
<p>keyId stored locally</p>
<p>Attestation object sent to verifier</p>
<p>Verifier accepts registration</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T03</strong></td>
<td>Reinstall Generates New Key</td>
<td><p>1. Delete app</p>
<p>2. Reinstall via TestFlight</p>
<p>3. Launch and register</p></td>
<td><p>New SE key pair generated</p>
<p>New App Attest keyId created</p>
<p>Old registration invalid on verifier</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**5. Daily Pulse**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T04</strong></td>
<td>Pulse Requires Biometrics</td>
<td><p>1. Open app</p>
<p>2. Trigger pulse</p></td>
<td><p>Face ID or Touch ID prompt appears</p>
<p>No passcode fallback offered</p>
<p>Pulse cannot complete without biometric</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T05</strong></td>
<td>Successful Pulse Increments Credits</td>
<td><p>1. Authenticate biometric</p>
<p>2. Observe credit display</p></td>
<td><p>Credit balance increments per formula</p>
<p>Pulse timestamp recorded locally</p>
<p>Verifier confirms pulse receipt</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T06</strong></td>
<td>Duplicate Pulse Rejected</td>
<td><p>1. Complete pulse</p>
<p>2. Attempt second pulse same day</p></td>
<td><p>Second pulse blocked or ignored</p>
<p>Credit balance unchanged</p>
<p>No duplicate submission to verifier</p></td>
<td><strong>P1</strong></td>
</tr>
<tr>
<td><strong>T07</strong></td>
<td>Foreground Prompt on Missed Pulse</td>
<td><p>1. Do not open app for 24+ hours</p>
<p>2. Open app</p></td>
<td><p>Pulse prompt appears immediately</p>
<p>User can complete pulse</p>
<p>Background miss does not break protocol</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**6. Burn Flow**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T08</strong></td>
<td>Burn Requires Biometrics</td>
<td><p>1. Scan provider QR code</p>
<p>2. Initiate burn</p></td>
<td><p>Biometric prompt appears</p>
<p>Burn cannot complete without biometric</p>
<p>No passcode fallback</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T09</strong></td>
<td>Burn Decrements Credits (Idempotent)</td>
<td><p>1. Scan QR, authenticate burn</p>
<p>2. Simulate network failure</p>
<p>3. Retry submission of same burn</p></td>
<td><p>Credits decremented exactly once</p>
<p>Verifier returns idempotent success</p>
<p>No additional decrement on retry</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T10</strong></td>
<td>Burn Receipt Issued</td>
<td><p>1. Complete burn successfully</p>
<p>2. Inspect local storage</p></td>
<td><p>Receipt stored locally</p>
<p>Receipt contains: timestamp, service ID, burn hash</p>
<p>Receipt retrievable for user review</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**7. Offline Operation**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T11</strong></td>
<td>Offline Pulse Queued</td>
<td><p>1. Enable airplane mode</p>
<p>2. Open app, complete biometric</p>
<p>3. Trigger pulse</p></td>
<td><p>Pulse signed and queued locally</p>
<p>User sees pending status</p>
<p>No error displayed</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T12</strong></td>
<td>Online Sync Drains Queue</td>
<td><p>1. From T11, disable airplane mode</p>
<p>2. Wait for connectivity</p></td>
<td><p>Queued pulses submitted in FIFO order</p>
<p>Verifier accepts queued pulses</p>
<p>Queue empty after sync</p></td>
<td><strong>P1</strong></td>
</tr>
<tr>
<td><strong>T13</strong></td>
<td>Expired Queue Items Discarded</td>
<td><p>1. Queue pulse while offline</p>
<p>2. Remain offline for 7+ days</p>
<p>3. Restore connectivity</p></td>
<td><p>Expired items (&gt;7 days) discarded</p>
<p>Non-expired items submitted</p>
<p>User notified of expired items</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**8. Crash Recovery**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T14</strong></td>
<td>Crash During Burn Resumes</td>
<td><p>1. Initiate burn, authenticate</p>
<p>2. Force-kill app before submission</p>
<p>3. Relaunch app</p></td>
<td><p>App detects incomplete burn</p>
<p>Burn resumes automatically</p>
<p>No duplicate or lost credits</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T15</strong></td>
<td>Crash During Pulse Recovers</td>
<td><p>1. Trigger pulse, authenticate</p>
<p>2. Force-kill app mid-flow</p>
<p>3. Relaunch app</p></td>
<td><p>Incomplete pulse detected on launch</p>
<p>Pulse re-attempted or re-prompted</p>
<p>No duplicate pulse to verifier</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**9. Security Enforcement**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T16</strong></td>
<td>Private Key Non-Exportable</td>
<td>1. Attempt to extract private key via SecKeyCopyExternalRepresentation</td>
<td><p>Operation fails</p>
<p>Secure Enclave rejects export</p>
<p>Only wrapped data representation available</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T17</strong></td>
<td>Biometric Change Invalidates Key</td>
<td><p>1. Register device</p>
<p>2. Add new Face ID / fingerprint in Settings</p>
<p>3. Attempt pulse</p></td>
<td><p>Key access denied (.biometryCurrentSet)</p>
<p>User must re-register (new Genesis)</p>
<p>Old key unusable</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T18</strong></td>
<td>Jailbreak Detection</td>
<td>1. Run app on jailbroken device (or simulated jailbreak indicators)</td>
<td><p>App displays warning or blocks</p>
<p>No attestation operations permitted</p>
<p>State logged for audit</p></td>
<td><strong>P1</strong></td>
</tr>
<tr>
<td><strong>T19</strong></td>
<td>App Attest Assertion on Each Request</td>
<td><p>1. Complete burn flow</p>
<p>2. Inspect network request to verifier</p></td>
<td><p>Assertion object included in request</p>
<p>Assertion validates against registered keyId</p>
<p>Request rejected without valid assertion</p></td>
<td><strong>P1</strong></td>
</tr>
<tr>
<td><strong>T20</strong></td>
<td>Certificate Pinning Enforced</td>
<td><p>1. Configure proxy with untrusted certificate</p>
<p>2. Attempt network request</p></td>
<td><p>Connection refused</p>
<p>No data transmitted to proxy</p>
<p>TLS error logged (not exposed to user)</p></td>
<td><strong>P2</strong></td>
</tr>
</tbody>
</table>

**10. Privacy Guarantees**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 19%" />
<col style="width: 27%" />
<col style="width: 31%" />
<col style="width: 13%" />
</colgroup>
<tbody>
<tr>
<td><strong>ID</strong></td>
<td><strong>Test</strong></td>
<td><strong>Steps</strong></td>
<td><strong>Expected Result</strong></td>
<td><strong>Priority</strong></td>
</tr>
<tr>
<td><strong>T21</strong></td>
<td>No PII in Network Requests</td>
<td><p>1. Proxy all outbound requests</p>
<p>2. Inspect headers and payloads</p></td>
<td><p>No Apple ID, email, phone number, name</p>
<p>No advertising identifiers (IDFA/IDFV)</p>
<p>Device identity is non-PII public key only</p></td>
<td><strong>P0</strong></td>
</tr>
<tr>
<td><strong>T22</strong></td>
<td>No PII in Local Storage</td>
<td><p>1. Inspect Keychain items</p>
<p>2. Inspect UserDefaults</p>
<p>3. Inspect app sandbox files</p></td>
<td><p>No PII stored anywhere on device</p>
<p>Only: key references, pulse timestamps, receipts, queue items</p>
<p>No analytics or tracking data</p></td>
<td><strong>P1</strong></td>
</tr>
<tr>
<td><strong>T23</strong></td>
<td>No Sensitive Data in Logs</td>
<td><p>1. Run app with Console.app attached</p>
<p>2. Complete full pulse and burn flow</p>
<p>3. Inspect all os_log output</p></td>
<td><p>No private keys, signatures, or nonces logged</p>
<p>No biometric data referenced</p>
<p>Log entries contain only flow state and errors</p></td>
<td><strong>P1</strong></td>
</tr>
</tbody>
</table>

**11. Test Execution Protocol**

|  |  |
|----|----|
| **Execution Order** | P0 tests first. All P0 must pass before P1 execution. |
| **Device Reset** | Fresh install for T01-T03. Existing install for all others. |
| **Network Control** | Airplane mode toggle for T11-T13. Proxy for T20-T23. |
| **Failure Handling** | Any P0 failure blocks release. P1 failures require documented waiver. |
| **Re-Test** | Failed tests re-run after fix. Full regression on P0 suite before release. |
| **Evidence** | Screenshots or screen recordings for each test. Attach to test report. |

**12. Traceability to Protocol Requirements**

|  |  |  |
|----|----|----|
| **Test(s)** | **Protocol Requirement** | **Invariant** |
| T01, T16 | Hardware-bound key, non-exportable | Key Binding Invariant |
| T04, T08 | Biometric gating at key level | Presence Invariant |
| T17 | Biometric enrollment change invalidates key | Identity Binding Invariant |
| T02, T19 | App Attest hardware provenance | Provenance Invariant |
| T05, T06 | One pulse per epoch, no speculative increments | Temporal Invariant |
| T09 | Burn idempotency, single decrement | Burn Invariant |
| T11, T12, T13 | Offline queue with temporal expiration | Queue Invariant |
| T14, T15 | Crash recovery without data loss | Durability Invariant |
| T21, T22, T23 | Zero PII collection | Privacy Invariant |

**13. Acceptance Criteria**

Release is authorized when:

- All 11 P0 tests pass with evidence.

- All 11 P1 tests pass, or failures have documented waivers with remediation timeline.

- P2 tests tracked as known issues if deferred.

- Test report signed by Protocol Architect.

- No open P0 regressions from prior release.

**14. VDR Cross-References**

|             |                                |                        |
|-------------|--------------------------------|------------------------|
| **Doc ID**  | **Title**                      | **Relationship**       |
| OSI8_02A_01 | HPP Core Whitepaper            | Protocol requirements  |
| OSI8_02A_02 | Protocol Invariants            | Invariant traceability |
| OSI8_04B_04 | iOS Platform Integration       | Platform constraints   |
| OSI8_04B_05 | iOS Build & Distribution Guide | Test environment       |
| OSI8_05A_03 | Failure Taxonomy               | Error handling tests   |

**15. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 1.0 | 2025 | Initial draft. 13 tests across 8 categories. |
| 1.1 | 2025 | Canonical status. |
| 3.0 | April 2026 | Updated to iOS 17+/18.x baseline. Expanded from 13 to 30 tests. Added: priority levels (P0/P1/P2), test summary matrix, duplicate pulse test, foreground prompt test, biometric change invalidation test, App Attest assertion test, certificate pinning test, local storage privacy audit, log inspection test, expired queue test, crash-during-pulse test. Added: test execution protocol, traceability to protocol invariants, evidence requirements. VDR cross-references. |

END OF DOCUMENT

**9. Device Migration**

Tests for normal migration (old device available) and recovery migration (old device unavailable). Requires two physical iOS devices for normal migration tests.

|  |  |  |  |  |
|----|----|----|----|----|
| **ID** | **Test Case** | **Steps** | **Expected Result** | **Pri** |
| T24 | Normal Migration — Happy Path | 1\. Install HPP on new device. 2. Select “I have my old device.” 3. Scan QR on old device. 4. Authenticate Face ID on old device. 5. Authenticate Face ID on new device. | Migration complete. Score fully preserved. Old device deactivated. New device can Pulse. | **P0** |
| T25 | Normal Migration — Old Device Rejects | 1\. Start migration on new device. 2. On old device, scan QR but cancel biometric. 3. Observe new device status. | Migration stays pending. New device shows “Waiting for old device.” No state change on either device. | **P0** |
| T26 | Migration Timeout | 1\. Start migration on new device. 2. Do NOT scan on old device. 3. Wait 10+ minutes. | Migration expires. New device returns to migration choice screen. No state change. | **P1** |
| T27 | Recovery Migration — Happy Path | 1\. Install HPP on new device. 2. Select “I don’t have my old device.” 3. Authenticate Face ID. 4. Wait 7-day cooldown (simulate with server override). 5. Claim migration. | Recovery complete. Score reduced by 50%. Credits preserved. Old device key permanently revoked. | **P0** |
| T28 | Post-Migration Pulse on New Device | 1\. Complete normal migration (T24). 2. On new device, trigger daily Pulse. 3. Verify receipt. | Pulse accepted. Score incremented. New device key used for signing. Receipt valid. | **P0** |
| T29 | Post-Migration Pulse on Old Device | 1\. Complete normal migration (T24). 2. On old device, attempt to trigger Pulse. | Pulse rejected. Old device shows “This device is no longer active.” HTTP 401 from verifier. | **P0** |
| T30 | Recovery Cooldown Display | 1\. Initiate recovery migration (T27 step 1-3). 2. Close and reopen app. 3. Verify cooldown UI. | App shows recovery cooldown screen with days remaining. Countdown updates on each launch. | **P1** |

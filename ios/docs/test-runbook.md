**HUMAN PRESENCE PROTOCOL**

iOS Client Acceptance Test Runbook

|  |  |
|----|----|
| **Document ID** | OSI8_04B_07 |
| **Version** | 2.0 |
| **Date** | April 2026 |
| **Status** | Canonical |
| **Scope** | MVP / Production |
| **Companion** | OSI8_04B_06 iOS Client Acceptance Tests (defines WHAT to test) |
| **This Document** | Defines HOW to test. Executable procedures. |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |
| **Owner** | Agile On Target LLC |

**1. Purpose**

This runbook provides step-by-step executable procedures for every acceptance test defined in OSI8_04B_06. A competent iOS developer should be able to execute all 30 tests without asking questions. Each procedure specifies preconditions, exact tools, numbered steps, binary pass/fail criteria, expected log output, and failure reproduction notes.

This document exists because a test list without execution procedures is a checkbox exercise, not a test plan.

**2. Test Lab Setup**

**2.1 Required Hardware**

|  |  |
|----|----|
| **Primary Device** | iPhone 12 or later (A14+, Face ID) |
| **Secondary Device** | iPhone SE 3 or later (A15+, Touch ID) for Touch ID path coverage |
| **Mac** | macOS 14+ with Xcode 16+ and Console.app |
| **Network** | Wi-Fi with internet access to test.hpp.network |

**2.2 Required Software**

|                      |                                                |
|----------------------|------------------------------------------------|
| **Xcode**            | 16+ with iOS 17+ SDK                           |
| **Console.app**      | For os_log monitoring (built into macOS)       |
| **Charles Proxy**    | v4.6+ with SSL Proxying enabled (for T20-T23)  |
| **TestFlight**       | HPP-Test build (com.hpp.test) installed        |
| **Keychain Access**  | For post-test inspection of stored items       |
| **Screen Recording** | iOS built-in or QuickTime for evidence capture |

**2.3 Test Verifier Configuration**

|  |  |
|----|----|
| **Endpoint** | https://test.hpp.network |
| **State** | Clean. No prior registrations for test device. |
| **Reset Command** | curl -X POST https://test.hpp.network/admin/reset -H "Authorization: Bearer \$TEST_TOKEN" |
| **Verify Health** | curl https://test.hpp.network/health returns {"status":"ok"} |

**2.4 Charles Proxy Configuration (for Network Tests)**

1.  Install Charles Proxy root certificate on test device: Settings \> General \> About \> Certificate Trust Settings.

2.  In Charles: Proxy \> SSL Proxying Settings \> Add: test.hpp.network:443

3.  In Charles: Proxy \> macOS Proxy disabled (use only iOS proxy).

4.  On device: Settings \> Wi-Fi \> HTTP Proxy \> Manual. Server: Mac IP. Port: 8888.

5.  Verify: open Safari on device, visit https://test.hpp.network/health. Charles should show the request.

For T20 (certificate pinning test), remove the Charles root certificate from the device trust store but keep the proxy configured. This creates an untrusted MITM that the app must reject.

**2.5 Test QR Codes**

Generate test QR codes via the test verifier admin endpoint:

|  |  |
|----|----|
| **Standard Burn QR** | curl https://test.hpp.network/admin/qr/generate -H "Auth: Bearer \$TOKEN" \> burn_qr.png |
| **Expired QR** | curl https://test.hpp.network/admin/qr/generate?ttl=0 \> expired_qr.png |
| **Display** | Print QR codes or display on secondary screen. Do not display on test device. |

**3. Execution Order**

Tests MUST be executed in this order. P0 tests gate P1 execution. A P0 failure halts the run.

|  |  |  |  |
|----|----|----|----|
| **Order** | **Test** | **Name** | **Gate** |
| 1 | **T01** | Fresh Install Generates SE Key | P0 - blocks all |
| 2 | **T02** | App Attest Registration | P0 - blocks all |
| 3 | **T16** | Private Key Non-Exportable | P0 - security gate |
| 4 | **T04** | Pulse Requires Biometrics | P0 - blocks pulse tests |
| 5 | **T05** | Successful Pulse Increments Credits | P0 - blocks burn tests |
| 6 | **T08** | Burn Requires Biometrics | P0 - blocks burn tests |
| 7 | **T09** | Burn Decrements Credits (Idempotent) | P0 - protocol critical |
| 8 | **T11** | Offline Pulse Queued | P0 - offline path |
| 9 | **T14** | Crash During Burn Resumes | P0 - data integrity |
| 10 | **T17** | Biometric Change Invalidates Key | P0 - security gate |
| 11 | **T21** | No PII in Network Requests | P0 - privacy gate |
| 12-22 | **P1s** | T03, T06, T07, T10, T12, T13, T15, T18, T19, T22, T23 | P1 - release gate |
| 23 | **T20** | Certificate Pinning Enforced | P2 - tracked |
| 24 | **T24** | Normal Migration — Happy Path | P0 - migration gate |
| 25 | **T25** | Normal Migration — Old Device Rejects | P0 - migration gate |
| 26 | **T26** | Migration Timeout | P1 - release gate |
| 27 | **T27** | Recovery Migration — Happy Path | P0 - migration gate |
| 28 | **T28** | Post-Migration Pulse on New Device | P0 - migration gate |
| 29 | **T29** | Post-Migration Pulse on Old Device | P0 - migration gate |
| 30 | **T30** | Recovery Cooldown Display | P1 - release gate |

**4. Test Procedures**

Each procedure follows this format: preconditions, tools, numbered steps, binary pass/fail table, expected log output, and notes.

**5. Installation & Setup**

**T01: Fresh Install Generates Secure Enclave Key**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device has no prior HPP installation (delete app if present).

- Face ID or Touch ID enrolled.

- Device connected to Wi-Fi.

- Console.app open on Mac, filtered to com.hpp.client subsystem.

Tools Required:

- Console.app (macOS)

- Screen recording enabled on device

Procedure:

6.  Delete HPP app if installed. Confirm via Settings \> General \> iPhone Storage.

7.  Install HPP-Test via TestFlight.

8.  Launch app. Observe setup screen.

9.  App prompts for biometric enrollment confirmation. Authenticate with Face ID / Touch ID.

10. Observe Console.app for key generation log entry.

11. In app, navigate to device info screen. Confirm public key is displayed (33-byte hex string starting with 02 or 03).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Public key displayed: 66 hex chars (33 bytes) starting with 02 or 03</p>
<p>Console shows: [crypto] SE key generated, tag: com.hpp.device.key</p>
<p>No error dialogs during setup</p>
<p>Keychain query for com.hpp.device.key returns non-nil</p></td>
<td><p>Blank or missing public key on device info screen</p>
<p>Console shows: [crypto] ERROR: SecKeyCreateRandomKey failed</p>
<p>Error dialog: "This device does not support HPP"</p>
<p>Setup flow hangs or crashes</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:crypto] SE key generated, tag: com.hpp.device.key</p>
<p>[com.hpp.client:crypto] Public key: 02a1b2c3... (66 hex chars)</p>
<p>[com.hpp.client:lifecycle] Setup complete, transitioning to registration</p></td>
</tr>
</tbody>
</table>

Notes: If test fails on a device that previously had HPP installed, the Keychain may retain stale entries. Reset all Keychain items: Settings \> General \> Transfer or Reset \> Reset All Settings. This does NOT erase data but clears Keychain.

**T02: App Attest Registration**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T01 passed. App is in post-setup, pre-registration state.

- Device has internet connectivity.

- Test verifier is healthy (curl health check).

Tools Required:

- Console.app

- Terminal (for verifier state inspection)

Procedure:

12. From T01 completion, app proceeds to registration flow.

13. App generates App Attest key (observe Console for DCAppAttestService log).

14. App requests challenge from test verifier.

15. App calls attestKey(keyId, clientDataHash:) with challenge hash.

16. App submits attestation object + HPP public key to verifier.

17. Verify registration on server: curl https://test.hpp.network/admin/devices \| grep \<public_key_prefix\>

18. App transitions to main screen showing registered status.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Console: [attestation] App Attest keyId generated: &lt;44 char string&gt;</p>
<p>Console: [attestation] Attestation object received from Apple</p>
<p>Console: [network] POST /v1/register 200 OK</p>
<p>Verifier /admin/devices lists device with matching public key</p>
<p>App shows registered state</p></td>
<td><p>Console: [attestation] ERROR: DCError.serverUnavailable</p>
<p>Console: [network] POST /v1/register 4xx/5xx</p>
<p>App stuck on registration screen</p>
<p>Verifier /admin/devices does not list device</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:attestation] App Attest keyId generated: abc123...</p>
<p>[com.hpp.client:attestation] Challenge received, hashing with SHA-256</p>
<p>[com.hpp.client:attestation] attestKey called, awaiting Apple response</p>
<p>[com.hpp.client:attestation] Attestation object received (N bytes)</p>
<p>[com.hpp.client:network] POST /v1/register 200 OK</p></td>
</tr>
</tbody>
</table>

Notes: App Attest requires Apple server connectivity. If DCError.serverUnavailable occurs, retry after 60 seconds. Apple recommends gradual rollout for large deployments. This is an Apple infrastructure dependency, not an HPP bug.

**T03: Reinstall Generates New Key**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T02 passed. Device is registered.

- Record current public key from device info screen.

Tools Required:

- Console.app

- Terminal

Procedure:

19. Record current public key (screenshot or copy).

20. Delete HPP app from device.

21. Reinstall via TestFlight.

22. Launch and complete setup + registration flow (repeat T01 + T02 steps).

23. Compare new public key to recorded old key.

24. Query verifier: curl https://test.hpp.network/admin/devices to confirm new registration.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>New public key differs from old public key</p>
<p>New App Attest keyId differs from old keyId</p>
<p>Verifier shows new registration</p>
<p>Old public key no longer valid for attestation</p></td>
<td><p>Same public key after reinstall (SE key survived deletion)</p>
<p>Registration reuses old keyId</p>
<p>Verifier still associates old key with device</p></td>
</tr>
</tbody>
</table>

Notes: iOS should delete Keychain items marked ThisDeviceOnly on app deletion, but behavior varies by iOS version. If the old key persists, this indicates a Keychain access class issue.

**6. Daily Pulse**

**T04: Pulse Requires Biometrics**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered (T02 passed).

- App in foreground.

- No pulse minted today.

Tools Required:

- Console.app

Procedure:

25. Open app. Pulse prompt should appear (first open of day with no pulse).

26. Observe that Face ID / Touch ID prompt appears. Do NOT authenticate yet.

27. Verify: no passcode fallback option is shown in the biometric dialog.

28. Cancel the biometric prompt (tap Cancel or look away).

29. Verify: pulse is NOT minted. Credit balance unchanged.

30. Re-trigger pulse. Authenticate with biometric.

31. Verify: pulse succeeds only after biometric authentication.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Biometric prompt appears with no passcode fallback</p>
<p>Cancelled biometric = no pulse minted</p>
<p>Successful biometric = pulse minted</p>
<p>Console: [crypto] Signing with SE key (biometric required)</p></td>
<td><p>Passcode fallback appears in dialog</p>
<p>Pulse mints without biometric prompt</p>
<p>Pulse mints after cancel (race condition)</p>
<p>No biometric prompt at all</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:lifecycle] Pulse check: no pulse for current epoch</p>
<p>[com.hpp.client:crypto] Requesting SE signature (biometric gate)</p>
<p>[com.hpp.client:crypto] Biometric cancelled by user</p>
<p>[com.hpp.client:lifecycle] Pulse aborted: biometric not provided</p></td>
</tr>
</tbody>
</table>

Notes: The biometric dialog is rendered by iOS, not the app. If passcode fallback appears, the LAPolicy is misconfigured (using deviceOwnerAuthentication instead of deviceOwnerAuthenticationWithBiometrics). This is a P0 security failure.

**T05: Successful Pulse Increments Credits**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T04 passed. No pulse for current epoch.

- Record current credit balance.

Tools Required:

- Console.app

Procedure:

32. Note current credit balance on main screen.

33. Trigger pulse flow. Authenticate with biometric.

34. Observe credit balance updates.

35. Verify new balance = old balance + increment per token formula.

36. Verify on server: curl https://test.hpp.network/admin/device/\<pubkey\>/pulses returns new pulse entry with server timestamp.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Credit balance incremented correctly</p>
<p>Pulse timestamp recorded locally</p>
<p>Verifier confirms pulse with server-authoritative timestamp</p>
<p>Console: [network] POST /v1/attest 200 OK</p></td>
<td><p>Credit balance unchanged after successful biometric</p>
<p>Credit balance incremented by wrong amount</p>
<p>Verifier rejects pulse</p>
<p>Local timestamp differs from server timestamp by &gt;5 seconds</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:crypto] SE signature generated (N bytes)</p>
<p>[com.hpp.client:network] POST /v1/attest 200 OK</p>
<p>[com.hpp.client:attestation] Pulse confirmed, epoch: &lt;N&gt;, credits: &lt;N&gt;</p></td>
</tr>
</tbody>
</table>

Notes: The credit increment follows the formula: tokens_issued = 1 + floor(log2(streak + 1)). For first pulse, expect +1 credit.

**T06: Duplicate Pulse Rejected**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T05 passed. Pulse already minted for current epoch.

Tools Required:

- Console.app

Procedure:

37. With pulse already completed for today, attempt to trigger another pulse.

38. If app UI prevents re-triggering (no button), verify UI correctly hides pulse option. PASS.

39. If pulse can be triggered programmatically or via edge case, verify verifier rejects with 409 Conflict.

40. Confirm credit balance unchanged.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>UI hides pulse trigger after completion, OR</p>
<p>Verifier returns 409 Conflict on duplicate</p>
<p>Credit balance unchanged</p>
<p>Console: [attestation] Pulse already exists for epoch &lt;N&gt;</p></td>
<td><p>Second pulse accepted and credits double-incremented</p>
<p>Verifier accepts duplicate with 200 OK</p>
<p>No client-side or server-side deduplication</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

|  |
|----|
| \[com.hpp.client:attestation\] Pulse already exists for epoch \<N\>, skipping |

Notes: Deduplication must exist on BOTH client and server. Client-side only is insufficient (client state can be manipulated). Server-side is the authoritative guard.

**T07: Foreground Prompt on Missed Pulse**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered. Last pulse was 24+ hours ago.

- Background task did NOT fire (simulate by not opening app for 24h, or reset last pulse timestamp via debug menu).

Tools Required:

- Console.app

- Device clock (do NOT manipulate system clock)

Procedure:

41. Ensure no pulse for 24+ hours (wait or use test verifier admin to set last_pulse to yesterday).

42. Open app.

43. Observe: pulse prompt appears immediately.

44. Complete biometric. Verify pulse succeeds.

45. Verify: app does not crash or show error about missed background tasks.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Pulse prompt appears on first foreground open</p>
<p>Pulse succeeds normally</p>
<p>No error about missed background task</p>
<p>Credit balance increments correctly</p></td>
<td><p>App opens to main screen with no pulse prompt</p>
<p>App shows error about background scheduling</p>
<p>Pulse prompt appears but fails</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:lifecycle] App foregrounded, checking pulse currency</p>
<p>[com.hpp.client:lifecycle] No pulse for current epoch, prompting user</p></td>
</tr>
</tbody>
</table>

Notes: BGTaskScheduler is advisory. This test verifies the foreground fallback works correctly when the background path is unavailable. This is the primary pulse mechanism for most users.

**7. Burn Flow**

**T08: Burn Requires Biometrics**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered with credits \> 0.

- Test QR code printed or on secondary screen.

Tools Required:

- Console.app

- Test QR code (from Section 2.5)

Procedure:

46. Open app. Navigate to scan / spend screen.

47. Point camera at test QR code. App reads QR.

48. Biometric prompt appears. Do NOT authenticate.

49. Cancel biometric.

50. Verify: burn does NOT complete. Credits unchanged.

51. Re-scan QR. Authenticate with biometric.

52. Verify: burn completes only after biometric.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Biometric prompt on burn with no passcode fallback</p>
<p>Cancel = no burn, credits unchanged</p>
<p>Authenticate = burn completes</p>
<p>Console: [crypto] Burn signature requested (biometric gate)</p></td>
<td><p>Burn completes without biometric</p>
<p>Passcode fallback offered</p>
<p>Credits decremented before biometric confirmation</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:attestation] QR parsed, service: &lt;service_id&gt;</p>
<p>[com.hpp.client:crypto] Burn signature requested (biometric gate)</p>
<p>[com.hpp.client:crypto] Biometric cancelled, burn aborted</p></td>
</tr>
</tbody>
</table>

**T09: Burn Decrements Credits (Idempotent)**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Credits \> 0. Burn QR available.

- Charles Proxy configured (to simulate network failure).

Tools Required:

- Console.app

- Charles Proxy (breakpoints feature)

- Test QR code

Procedure:

53. In Charles, set breakpoint on POST to /v1/spend.

54. Scan QR, authenticate biometric. App attempts burn submission.

55. Charles catches request at breakpoint. Observe request payload.

56. In Charles, abort the request (simulate network failure).

57. App should show pending/retry state. Credits may show tentative decrement.

58. In Charles, remove breakpoint. App retries automatically.

59. Verify: credits decremented exactly once.

60. Verify on server: curl https://test.hpp.network/admin/device/\<pubkey\>/burns shows exactly one burn entry.

61. Attempt to replay the same burn request (copy from Charles, replay via curl).

62. Verify: server returns idempotent success, no additional decrement.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Credits decremented exactly once after retry</p>
<p>Server shows single burn entry</p>
<p>Replayed request returns success but no second decrement</p>
<p>Console: [network] POST /v1/spend retry 1, then 200 OK</p></td>
<td><p>Credits decremented on first attempt AND on retry (double spend)</p>
<p>Credits never decremented (burn lost)</p>
<p>Replayed request creates second burn entry</p>
<p>Inconsistent credit balance between client and server</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:network] POST /v1/spend failed: network error</p>
<p>[com.hpp.client:network] Retry 1/3, backoff 2s</p>
<p>[com.hpp.client:network] POST /v1/spend 200 OK</p>
<p>[com.hpp.client:attestation] Burn confirmed, credits: &lt;N&gt;</p></td>
</tr>
</tbody>
</table>

Notes: Idempotency key is the burn hash. The server must deduplicate on this key. If double-spend occurs, this is a server-side bug in burn table enforcement, not a client bug.

**T10: Burn Receipt Issued**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T09 passed. Burn completed successfully.

Tools Required:

- Console.app

Procedure:

63. After successful burn, navigate to transaction history / receipts screen.

64. Verify receipt is displayed with: timestamp, service name/ID, burn hash.

65. Verify receipt persists after app restart (kill and relaunch).

66. Verify receipt data matches server record: curl https://test.hpp.network/admin/device/\<pubkey\>/burns

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Receipt visible in app UI</p>
<p>Receipt contains: timestamp, service ID, burn hash</p>
<p>Receipt persists across app restart</p>
<p>Receipt matches server record</p></td>
<td><p>No receipt shown after burn</p>
<p>Receipt missing fields</p>
<p>Receipt disappears on restart</p>
<p>Receipt data mismatches server</p></td>
</tr>
</tbody>
</table>

**8. Offline Operation**

**T11: Offline Pulse Queued**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered. No pulse for current epoch.

- Wi-Fi and cellular available (will be disabled).

Tools Required:

- Console.app

Procedure:

67. Enable Airplane Mode on device. Confirm no connectivity (Wi-Fi icon gone, no cellular bars).

68. Open app. Pulse prompt appears.

69. Authenticate with biometric.

70. Verify: app shows pending/queued status (not error).

71. Verify Console: pulse signed and queued, not submitted.

72. Verify: no network request attempted (no timeout errors).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Biometric succeeds offline</p>
<p>Pulse signed and stored in offline queue</p>
<p>App shows pending status, not error</p>
<p>Console: [attestation] Pulse queued (offline), queue depth: 1</p>
<p>No network timeout errors</p></td>
<td><p>Biometric fails offline (should never happen - SE is local)</p>
<p>App shows error instead of queuing</p>
<p>App crashes on network unavailability</p>
<p>App attempts network request and hangs</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:network] NWPathMonitor: unsatisfied</p>
<p>[com.hpp.client:crypto] SE signature generated (offline)</p>
<p>[com.hpp.client:attestation] Pulse queued (offline), queue depth: 1</p></td>
</tr>
</tbody>
</table>

Notes: Biometric + SE signing is entirely local. No network required for signing. This test validates the offline queue path, not the crypto path.

**T12: Online Sync Drains Queue**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- T11 passed. One or more pulses in offline queue.

- Airplane Mode still enabled.

Tools Required:

- Console.app

Procedure:

73. Disable Airplane Mode. Wait for connectivity (Wi-Fi icon appears).

74. Observe Console for queue drain activity.

75. Verify: queued pulses submitted to verifier in FIFO order.

76. Verify: app status changes from pending to confirmed.

77. Verify on server: curl https://test.hpp.network/admin/device/\<pubkey\>/pulses shows queued pulse(s).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Queue drains automatically on connectivity</p>
<p>Pulses submitted in FIFO order</p>
<p>App status updates to confirmed</p>
<p>Server shows pulse entries with correct timestamps</p>
<p>Console: [network] Queue drain: 1/1 submitted, 200 OK</p></td>
<td><p>Queue does not drain (stays pending)</p>
<p>Pulses submitted out of order</p>
<p>Network error on queue drain with no retry</p>
<p>Server rejects queued pulses</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:network] NWPathMonitor: satisfied</p>
<p>[com.hpp.client:network] Queue drain starting, depth: 1</p>
<p>[com.hpp.client:network] POST /v1/attest 200 OK (queued item 1/1)</p>
<p>[com.hpp.client:network] Queue drain complete, depth: 0</p></td>
</tr>
</tbody>
</table>

**T13: Expired Queue Items Discarded**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Pulse queued offline. Need to simulate 7+ day expiration.

- Test verifier admin access.

Tools Required:

- Console.app

- Terminal (verifier admin)

Procedure:

78. Queue a pulse offline (repeat T11).

79. Use test verifier admin to backdate the queued pulse timestamp: curl -X POST https://test.hpp.network/admin/device/\<pubkey\>/queue/backdate?days=8

80. Alternatively, use debug build with adjustable clock (do NOT change system clock).

81. Restore connectivity.

82. Observe queue drain behavior.

83. Verify: expired item (\>7 days) is discarded, not submitted.

84. Verify: user is notified of expired item (UI indicator or log).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Expired items discarded (not submitted to verifier)</p>
<p>Non-expired items submitted normally</p>
<p>Console: [attestation] Queue item expired (8 days &gt; 7 day limit), discarding</p>
<p>User notification of missed pulse</p></td>
<td><p>Expired item submitted and accepted</p>
<p>Expired item submitted and rejected with server error</p>
<p>All items discarded regardless of age</p>
<p>No notification of lost pulse</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:attestation] Queue item expired (8 days &gt; 7 day limit), discarding</p>
<p>[com.hpp.client:lifecycle] User notification: 1 pulse expired while offline</p></td>
</tr>
</tbody>
</table>

Notes: The 7-day window is a protocol constraint. Pulses older than 7 days have no temporal validity. This is by design, not a bug.

**9. Crash Recovery**

**T14: Crash During Burn Resumes**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Credits \> 0. Burn QR available.

- Know how to force-kill app (swipe up from app switcher).

Tools Required:

- Console.app

- Test QR code

Procedure:

85. Scan QR code. Authenticate biometric.

86. IMMEDIATELY after biometric succeeds (within 1 second), force-kill the app by swiping up from the app switcher.

87. Wait 5 seconds.

88. Relaunch app.

89. Observe: app detects incomplete burn on launch.

90. App should automatically resume burn submission.

91. Verify: credits decremented exactly once (not zero, not twice).

92. Verify on server: exactly one burn entry for this transaction.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>App detects incomplete burn on relaunch</p>
<p>Burn resumes automatically</p>
<p>Credits decremented exactly once</p>
<p>Server shows exactly one burn entry</p>
<p>Console: [lifecycle] Incomplete burn detected, resuming</p></td>
<td><p>Burn lost (credits not decremented, no server record)</p>
<p>Double burn (credits decremented twice)</p>
<p>App does not detect incomplete burn</p>
<p>App crashes on relaunch</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:lifecycle] Launch: checking for incomplete transactions</p>
<p>[com.hpp.client:lifecycle] Incomplete burn detected, resuming</p>
<p>[com.hpp.client:network] POST /v1/spend 200 OK (resumed)</p>
<p>[com.hpp.client:attestation] Burn confirmed (resumed), credits: &lt;N&gt;</p></td>
</tr>
</tbody>
</table>

Notes: Timing is critical. Kill the app AFTER biometric but BEFORE network submission. The window is approximately 0.5-2 seconds. Multiple attempts may be needed. The pre-submission state must be persisted to Keychain before the network call.

**T15: Crash During Pulse Recovers**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- No pulse for current epoch. Console.app monitoring.

Tools Required:

- Console.app

Procedure:

93. Trigger pulse. Authenticate biometric.

94. Force-kill app immediately after biometric (same technique as T14).

95. Relaunch app.

96. Verify: app detects incomplete pulse.

97. App re-prompts for pulse or auto-submits queued pulse.

98. Verify: no duplicate pulse on verifier.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Incomplete pulse detected on relaunch</p>
<p>Pulse completed or re-prompted</p>
<p>No duplicate on verifier</p>
<p>Console: [lifecycle] Incomplete pulse detected</p></td>
<td><p>Pulse lost silently</p>
<p>Duplicate pulse created</p>
<p>App ignores incomplete state</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

|                                                                    |
|--------------------------------------------------------------------|
| \[com.hpp.client:lifecycle\] Incomplete pulse detected, recovering |

**10. Security Enforcement**

**T16: Private Key Non-Exportable**

|              |     |                |                   |
|--------------|-----|----------------|-------------------|
| **Priority** | P0  | **Automation** | XCTest / XCUITest |

Preconditions:

- Device registered (T02 passed).

Tools Required:

- Xcode (for running test code on device)

Procedure:

99. On device via Xcode debug session, execute: SecKeyCopyExternalRepresentation(privateKey, &error)

100. Alternatively, run XCTest that attempts private key export.

101. Verify: operation returns errSecInvalidKeyRef or nil.

102. Verify: only the wrapped data representation is available (opaque blob, not raw key bytes).

103. Attempt to use wrapped representation on a different device. Verify: fails.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>SecKeyCopyExternalRepresentation fails for SE private key</p>
<p>Only wrapped (opaque) representation available</p>
<p>Wrapped representation unusable on different device</p>
<p>Console: [crypto] Key export attempt: denied by SE</p></td>
<td><p>Raw private key bytes returned</p>
<p>Key representation usable on another device</p>
<p>No error on export attempt</p></td>
</tr>
</tbody>
</table>

Notes: This is a hardware guarantee enforced by the Secure Enclave, not application code. The test validates that key generation correctly targeted the SE (kSecAttrTokenIDSecureEnclave was set).

**T17: Biometric Change Invalidates Key**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered (T02 passed). Pulse working (T05 passed).

Tools Required:

- Console.app

- Access to device Settings \> Face ID & Passcode

Procedure:

104. Confirm pulse works (complete one pulse successfully).

105. Go to Settings \> Face ID & Passcode. Set up an Alternative Appearance (or add a fingerprint for Touch ID).

106. Return to HPP app. Attempt pulse.

107. Verify: SE key access is denied. Biometric prompt may appear but signing fails.

108. Verify: app detects key invalidation and prompts for re-registration (new Genesis).

109. Complete re-registration. Verify: new key pair generated, new App Attest keyId.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>SE key access denied after biometric change</p>
<p>App detects invalidation (.biometryCurrentSet flag)</p>
<p>App prompts for re-registration</p>
<p>New key pair and App Attest keyId generated</p>
<p>Console: [crypto] SE key access denied: biometry changed</p></td>
<td><p>Old key still works after biometric change</p>
<p>App does not detect biometric enrollment change</p>
<p>App crashes instead of prompting re-registration</p>
<p>Old and new key both valid simultaneously</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:crypto] SE key access denied: biometry changed</p>
<p>[com.hpp.client:lifecycle] Key invalidated, initiating re-registration</p></td>
</tr>
</tbody>
</table>

Notes: The .biometryCurrentSet access control flag is the mechanism. If key survives biometric change, the flag was not set during key generation. This is a P0 security failure.

**T18: Jailbreak Detection**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Jailbroken device OR simulated jailbreak indicators.

Tools Required:

- Jailbroken test device (if available)

- Or: debug build with jailbreak simulation flag

Procedure:

110. On jailbroken device: install and launch HPP app.

111. On non-jailbroken device with debug build: enable jailbreak simulation flag.

112. Verify: app displays warning or blocks functionality.

113. Verify: no attestation operations (pulse, burn) are permitted.

114. Verify: jailbreak detection logged.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>App warns or blocks on jailbroken device</p>
<p>No attestation operations permitted</p>
<p>Console: [security] Jailbreak detected, blocking operations</p></td>
<td><p>App runs normally on jailbroken device</p>
<p>Attestation operations succeed on compromised device</p>
<p>No detection or logging</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:security] Jailbreak check: POSITIVE</p>
<p>[com.hpp.client:security] Operations blocked: compromised environment</p></td>
</tr>
</tbody>
</table>

Notes: Jailbreak detection checks: Cydia URL scheme, writable /private, fork() behavior, suspicious dylibs. Detection is defense-in-depth; App Attest provides the primary hardware integrity guarantee.

**T19: App Attest Assertion on Each Request**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered. Charles Proxy configured.

Tools Required:

- Console.app

- Charles Proxy (SSL Proxying enabled for test.hpp.network)

Procedure:

115. Configure Charles to capture requests to test.hpp.network.

116. Complete a pulse flow.

117. In Charles, inspect the POST /v1/attest request body.

118. Verify: request includes an assertion field (CBOR-encoded blob).

119. Complete a burn flow. Inspect POST /v1/spend.

120. Verify: burn request also includes assertion field.

121. Verify assertion is unique per request (compare two assertions byte-by-byte).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Every verifier request includes assertion field</p>
<p>Assertion is CBOR-encoded (starts with specific byte pattern)</p>
<p>Each assertion is unique (no reuse)</p>
<p>Console: [attestation] Assertion generated for request</p></td>
<td><p>Request sent without assertion</p>
<p>Same assertion reused across requests</p>
<p>Assertion field present but empty or malformed</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:attestation] Generating assertion for /v1/attest</p>
<p>[com.hpp.client:attestation] Assertion generated (N bytes)</p></td>
</tr>
</tbody>
</table>

**T20: Certificate Pinning Enforced**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P2 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Charles Proxy configured as MITM proxy.

- Charles root certificate NOT trusted on device (removed from trust store).

Tools Required:

- Charles Proxy

- Console.app

Procedure:

122. Ensure Charles root certificate is NOT in device trust store (Settings \> General \> About \> Certificate Trust Settings).

123. Ensure proxy is still configured (Settings \> Wi-Fi \> HTTP Proxy).

124. Open HPP app. Attempt any network operation (pulse or burn).

125. Verify: connection refused by app. No data reaches Charles.

126. Verify: Charles shows connection attempt but SSL handshake failure.

127. Verify: app shows appropriate offline/retry state (not a crash).

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>Connection refused, no data transmitted</p>
<p>Charles shows SSL handshake failure</p>
<p>App shows retry/offline state gracefully</p>
<p>Console: [network] TLS error: certificate not pinned</p></td>
<td><p>Request succeeds through untrusted proxy</p>
<p>Data visible in Charles despite untrusted cert</p>
<p>App crashes on TLS failure</p></td>
</tr>
</tbody>
</table>

Expected os_log Output:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>[com.hpp.client:network] TLS validation failed: certificate not pinned</p>
<p>[com.hpp.client:network] Connection refused, will retry</p></td>
</tr>
</tbody>
</table>

Notes: After testing, remove proxy configuration from device Wi-Fi settings to restore normal connectivity.

**11. Privacy Guarantees**

**T21: No PII in Network Requests**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P0 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Charles Proxy configured with SSL Proxying for test.hpp.network.

- Device registered.

Tools Required:

- Charles Proxy

Procedure:

128. Complete full flow: registration, pulse, burn.

129. In Charles, inspect EVERY request to test.hpp.network.

130. For each request, examine: headers, URL parameters, request body, response body.

131. Search all captured traffic for: any email pattern (@), phone number pattern, Apple ID, IDFA/IDFV, device name, user name.

132. Verify: device identity is public key only (SEC1 compressed, 33 bytes hex).

133. Verify: no User-Agent string contains device owner name.

134. Export Charles session for evidence.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>No email addresses in any request</p>
<p>No phone numbers in any request</p>
<p>No Apple ID or account identifiers</p>
<p>No IDFA, IDFV, or advertising identifiers</p>
<p>No device name or owner name in headers</p>
<p>Device identified solely by public key</p>
<p>Charles session export attached to test report</p></td>
<td><p>Any PII found in any request field</p>
<p>IDFA or IDFV present in headers or body</p>
<p>Device name leaked in User-Agent</p>
<p>Any Apple account identifier present</p></td>
</tr>
</tbody>
</table>

Notes: This is a protocol-level privacy guarantee. Any PII leakage is a ship-blocking defect regardless of where it appears.

**T22: No PII in Local Storage**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Device registered with completed pulses and burns.

Tools Required:

- Xcode (device file browser)

- Keychain Access or security command-line tool

Procedure:

135. Connect device to Mac. Open Xcode \> Devices and Simulators.

136. Select HPP app. Download Container.

137. Inspect all files in app sandbox: Documents, Library, tmp.

138. Search all files for: email patterns, phone patterns, names, Apple ID.

139. Inspect Keychain items for com.hpp.\* entries.

140. Verify Keychain contains only: key references, pulse timestamps, queue items, receipts.

141. Verify UserDefaults contains only: non-PII configuration flags.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>No PII in app sandbox files</p>
<p>No PII in Keychain entries</p>
<p>No PII in UserDefaults</p>
<p>Only protocol data stored: key refs, timestamps, hashes</p></td>
<td><p>Any PII found in any storage location</p>
<p>Analytics data present</p>
<p>Tracking identifiers stored locally</p></td>
</tr>
</tbody>
</table>

**T23: No Sensitive Data in Logs**

|  |  |  |  |
|----|----|----|----|
| **Priority** | P1 | **Automation** | Manual (requires physical device + biometric) |

Preconditions:

- Console.app connected to device.

- Subsystem filter: com.hpp.client

Tools Required:

- Console.app (macOS)

Procedure:

142. Clear Console.app output.

143. Set Console filter to subsystem: com.hpp.client.

144. Complete full flow: launch, pulse, burn, offline queue, online sync.

145. Search Console output for: private key bytes (long hex strings \> 64 chars that are NOT public keys), signature bytes, nonce values, biometric data references.

146. Verify: log entries contain only flow state, error codes, and non-sensitive metadata.

147. Export Console log for evidence.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr>
<td><strong>PASS Criteria (all must hold)</strong></td>
<td><strong>FAIL Indicators</strong></td>
</tr>
<tr>
<td><p>No private key material in logs</p>
<p>No signature bytes in logs</p>
<p>No nonce values in logs</p>
<p>No biometric data references</p>
<p>Logs contain only: state transitions, error codes, non-sensitive counts</p>
<p>Console export attached to test report</p></td>
<td><p>Any cryptographic material in log output</p>
<p>Signature or nonce values logged</p>
<p>Biometric success/failure details beyond boolean</p></td>
</tr>
</tbody>
</table>

Notes: In debug builds, additional logging may be present. This test MUST run on a release/TestFlight build where debug logging is stripped.

**12. Test Report Template**

After execution, complete the following for each test:

|  |  |  |  |  |
|----|----|----|----|----|
| **Test ID** | **Result** | **Date** | **Device** | **Evidence** |
| T01 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T24 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T25 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T26 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T27 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T28 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T29 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T30 | PASS / FAIL / BLOCKED | YYYY-MM-DD | iPhone XX | Screenshot / recording filename |
| T02 |  |  |  |  |
| ... |  |  |  |  |
| T23 |  |  |  |  |

Sign-off: Protocol Architect reviews report, verifies all P0 PASS, confirms release authorization.

**13. VDR Cross-References**

|             |                                |                         |
|-------------|--------------------------------|-------------------------|
| **Doc ID**  | **Title**                      | **Relationship**        |
| OSI8_04B_06 | iOS Client Acceptance Tests    | Test definitions (WHAT) |
| OSI8_04B_04 | iOS Platform Integration       | Platform constraints    |
| OSI8_04B_05 | iOS Build & Distribution Guide | Build environment       |
| OSI8_05A_03 | Failure Taxonomy               | Error handling          |

**14. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 2.0 | April 2026 | Initial release. Full execution procedures for all 30 tests defined in OSI8_04B_06. Includes: lab setup, tool configuration, Charles Proxy procedures, numbered steps with exact commands, binary pass/fail criteria, expected os_log output, failure reproduction notes, execution order with gating, test report template. |

END OF DOCUMENT

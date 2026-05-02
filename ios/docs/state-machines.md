**HUMAN PRESENCE PROTOCOL**

MVP State Machine Diagrams

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | OSI8_04B_08                              |
| **Version**        | 3.0                                      |
| **Date**           | April 2026                               |
| **Status**         | Canonical                                |
| **Scope**          | MVP                                      |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |
| **Owner**          | Agile On Target LLC                      |

**1. Purpose**

Define authoritative state machines for every component in the HPP MVP stack. Each state machine is the single source of truth for what states exist, what transitions are legal, what triggers each transition, and what side effects occur. If a transition is not in this document, it is not permitted. If a state is not in this document, it does not exist.

These state machines eliminate ambiguous behavior. A developer implementing any component reads this document and knows exactly what the code must do at every decision point. A tester reads this document and knows every path that must be exercised.

**2. Conventions**

|  |  |
|----|----|
| **Convention** | **Meaning** |
| **Initial** | Entry state. System starts here. Exactly one per state machine. |
| **Steady** | Normal operating state. System spends most time here. |
| **Transient** | Processing state. System passes through; does not rest here. |
| **Terminal** | End state for a flow. May reset to a steady state. |
| **Error** | Failure state. Always has a recovery path back to a steady or initial state. |
| **→** | Transition. Arrow direction indicates the only legal direction. |
| **\[guard\]** | Condition that must be true for the transition to fire. |

Invariant: No state machine has dead-end states. Every state has at least one outbound transition (except terminal states that reset to a steady state). Every error state recovers.

**3. iOS Client State Machine**

The iOS client has two concurrent state machines: the Lifecycle state machine (app-level, runs once from install through normal operation) and the Burn state machine (per-transaction, runs each time the user scans a QR code). They share the Idle state as the handoff point.

**3.1 Lifecycle State Machine**

Governs app initialization, key generation, and readiness. Runs once per install (or per biometric re-enrollment).

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>+================+</p>
<p>| Uninitialized | [app first launch]</p>
<p>+================+</p>
<p>|</p>
<p>| generateKey()</p>
<p>v</p>
<p>+================+ +============+</p>
<p>| KeyGenerating |----&gt;| KeyFailed |</p>
<p>+================+ +============+</p>
<p>| |</p>
<p>| [SE key created] | retry / reinstall</p>
<p>v |</p>
<p>+================+ |</p>
<p>| Attesting |&lt;----------+</p>
<p>+================+</p>
<p>|</p>
<p>| [App Attest OK]</p>
<p>v</p>
<p>+================+ +===============+</p>
<p>| Idle |&lt;---&gt;| BiometricLost |</p>
<p>+================+ +===============+</p>
<p>| ^ [enrollment changed]</p>
<p>| |</p>
<p>| (burn) | (burn complete)</p>
<p>v |</p>
<p>[Burn State Machine]</p></td>
</tr>
</tbody>
</table>

|  |  |  |
|----|----|----|
| **State** | **Type** | **Description** |
| Uninitialized | **Initial** | App installed, no SE key exists. Entry point. |
| KeyGenerating | **Transient** | SE P-256 key pair being created. Biometric prompt shown. |
| KeyFailed | **Error** | SE key generation failed (no SE, user denied, hardware error). |
| Attesting | **Transient** | App Attest key being registered with Apple. |
| Idle | **Steady** | Ready for operation. SE key exists. App Attest registered. Waiting for user action. |
| BiometricLost | **Error** | Biometric enrollment changed. SE key invalidated. Must regenerate. |

|  |  |  |  |
|----|----|----|----|
| **From** | **To** | **Trigger** | **Action / Side Effect** |
| Uninitialized | KeyGenerating | App first launch | Check SE availability. Prompt biometric. |
| KeyGenerating | Attesting | SE key created | Store key tag in Keychain. Begin App Attest. |
| KeyGenerating | KeyFailed | SE error or user denied | Log error_code. Show retry UI. |
| KeyFailed | KeyGenerating | User taps retry | Re-attempt key generation. |
| Attesting | Idle | App Attest registered | Log attest_env. Enable scanning. |
| Attesting | KeyFailed | Attest registration fails | Log error_code. Same recovery as KeyFailed. |
| Idle | BiometricLost | Enrollment changed | Invalidate SE key. Log biometric.changed. |
| BiometricLost | Uninitialized | User acknowledges | Clear key tag. Restart lifecycle. |

**3.2 Burn State Machine**

Per-transaction state machine. Enters from Idle when user scans a QR code. Returns to Idle on completion or failure. This is the core user-facing flow.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>+========+</p>
<p>| Idle | [user scans QR]</p>
<p>+========+</p>
<p>|</p>
<p>| parseQR(payload)</p>
<p>v</p>
<p>+=============+ +=============+</p>
<p>| QRValidating|----&gt;| QRInvalid |----&gt; [Idle]</p>
<p>+=============+ +=============+</p>
<p>|</p>
<p>| [valid session_id + callback_url]</p>
<p>v</p>
<p>+=============+</p>
<p>| BurnAuth | [biometric prompt]</p>
<p>+=============+</p>
<p>| |</p>
<p>| +------&gt; +===============+</p>
<p>| | BurnCancelled |----&gt; [Idle]</p>
<p>| [biometric OK] +===============+</p>
<p>v</p>
<p>+================+</p>
<p>| BurnProcessing | [decrement credits, sign receipt]</p>
<p>+================+</p>
<p>| |</p>
<p>| +----&gt; +=============+</p>
<p>| | BurnFailed |----&gt; [Idle]</p>
<p>| [receipt signed] +=============+</p>
<p>v</p>
<p>+================+</p>
<p>| Submitting | [POST receipt to callback_url]</p>
<p>+================+</p>
<p>| |</p>
<p>| +----&gt; +==============+</p>
<p>| | SubmitFailed |----&gt; [QueueOrIdle]</p>
<p>| [HTTP 200] +==============+</p>
<p>v</p>
<p>+================+</p>
<p>| BurnSuccess |----&gt; [Idle]</p>
<p>+================+</p></td>
</tr>
</tbody>
</table>

|  |  |  |
|----|----|----|
| **State** | **Type** | **Description** |
| Idle | **Steady** | Waiting for QR scan. Camera active. Credits visible. |
| QRValidating | **Transient** | Parsing QR payload. Checking session_id format and callback_url. |
| QRInvalid | **Error** | QR payload malformed or missing required fields. |
| BurnAuth | **Transient** | Biometric prompt displayed. Waiting for Face ID / Touch ID. |
| BurnCancelled | **Terminal** | User cancelled biometric prompt. Not an error. |
| BurnProcessing | **Transient** | Credits being decremented. Receipt being signed by SE. |
| BurnFailed | **Error** | Insufficient credits, SE signing error, or internal failure. |
| Submitting | **Transient** | Receipt being POSTed to callback_url from QR payload. |
| SubmitFailed | **Error** | Network error. Receipt may be enqueued for offline sync. |
| BurnSuccess | **Terminal** | Receipt accepted by relying party. Flow complete. |

|  |  |  |  |
|----|----|----|----|
| **From** | **To** | **Trigger** | **Action / Side Effect** |
| Idle | QRValidating | QR code scanned | Parse JSON payload. Extract session_id, callback_url. |
| QRValidating | BurnAuth | Payload valid | Display burn confirmation. Show credits required. |
| QRValidating | QRInvalid | Payload malformed | Log error. Show "Invalid QR code" message. |
| QRInvalid | Idle | User dismisses | Clear scanner. Resume camera. |
| BurnAuth | BurnProcessing | Biometric success | Emit ios.pulse.biometric_ok. Begin credit decrement. |
| BurnAuth | BurnCancelled | User cancels / fails | Emit ios.pulse.biometric_cancel. No error logged. |
| BurnCancelled | Idle | Automatic | Resume camera. No state change to user. |
| BurnProcessing | Submitting | Receipt signed | ECDSA sign(payload) in SE. Emit ios.burn.success. |
| BurnProcessing | BurnFailed | Signing fails | Emit ios.burn.failed with error_code. |
| BurnFailed | Idle | User dismisses | Show error message. Resume camera. |
| Submitting | BurnSuccess | HTTP 200 received | Emit ios.receipt.submitted. Show success UI. |
| Submitting | SubmitFailed | Network error | Emit ios.receipt.submit_failed. |
| SubmitFailed | Idle | \[queue disabled\] | Show error. User retries manually. |
| SubmitFailed | Idle | \[queue enabled\] | Enqueue receipt. Emit ios.queue.enqueued. Show queued indicator. |
| BurnSuccess | Idle | Auto (2s delay) | Clear success UI. Resume camera. |

**3.3 Guard Conditions**

|  |  |
|----|----|
| **Guard** | **Condition** |
| \[SE available\] | SecureEnclave.isAvailable == true. Device has hardware SE. |
| \[credits \>= N\] | Wallet balance \>= credits_required from QR payload. |
| \[biometric enrolled\] | LAContext.canEvaluatePolicy(.biometryCurrentSet) == true. |
| \[receipt age \< max\] | Receipt timestamp within max_receipt_age_s from Config.plist. |
| \[queue not full\] | Offline queue depth \< offline_queue_max from Config.plist. |

**3.4 Migration State Machine**

Per-migration state machine. Entered from Idle when the user selects Device Migration in Settings. Handles two paths: Normal Migration (old device physically available) and Recovery Migration (old device lost, stolen, or destroyed). Both paths atomically revoke the old key and bind the new hardware. Patent D (Single Primary Device) enforces that no moment exists where two devices hold valid keys simultaneously. Patent F (Device Churn Throttling) enforces the 7-day recovery cooldown.

+=========+

\| Idle \| \[user selects Device Migration in Settings\]

+=========+

\|

\| present migration choice screen

v

+================+

\| MigrationChoice\| \[Normal: I have old device \| Recovery: I do not\]

+================+

\| \|

\[Normal path\] \[Recovery path\]

\| \|

v v

+===========+ +================+

\| OldLiveness\| \| RecoveryAuth \| \[biometric on new device\]

+===========+ +================+

\| \|

\[biometric OK\] \[biometric OK\]

\| \|

v v

+============+ +================+

\| QRDisplayed\| \| CooldownWait \| \[7-day server-enforced cooldown\]

+============+ +================+

\| \|

\[new device scans\] \[cooldown elapsed\]

\| \|

v \|

+============+ \|

\| NewLiveness\| \|

+============+ \|

\| \|

\[biometric OK\] \|

\| \|

+--------------------+

\|

v

+=================+ +================+

\| KeyRotating \|----\>\| RotationFailed \|----\> \[MigrationChoice\]

+=================+ +================+

\|

\[old key revoked, new key bound\]

v

+=================+

\| MigrationComplete\|----\> \[Idle\]

+=================+

|  |  |  |  |  |
|----|----|----|----|----|
| **State** | **Type** | **Path** | **Description** | **Patents / Primitives** |
| MigrationChoice | Steady | Both | User presented with Normal vs Recovery options. Awaiting selection. | D (P6, P12, P13) |
| OldLiveness | Transient | Normal | Biometric prompt on old device. Confirms owner authorizes migration. App Attest assertion generated. | A, D (P4, P5, P6) |
| QRDisplayed | Steady | Normal | Signed migration capsule displayed as QR on old device. New device must scan within 10-minute window. | D (P6, P12) |
| NewLiveness | Transient | Normal | Biometric on new device binds to new hardware. New SE keypair generated inside new Secure Enclave. | A, D (P2, P4, P5) |
| RecoveryAuth | Transient | Recovery | Biometric on new device. Initiates recovery request to verifier. Triggers cooldown period. | A, D (P4, P5) |
| CooldownWait | Steady | Recovery | 7-day server-enforced cooldown. App shows countdown. Old device key not yet revoked. User cannot pulse on either device. | F (P12, P13) |
| KeyRotating | Transient | Both | Atomic: old key revoked, new key registered, continuity score transferred. Score penalty applied for recovery path (50% reduction). | D, F, K (P6, P12, P14) |
| RotationFailed | Error | Both | Server-side key rotation failed (network error, duplicate migration attempt, churn throttle). Retry or return to choice. | F (P6, P13) |
| MigrationComplete | Terminal | Both | Old device revoked. New device is presence anchor. Score and credits preserved (minus penalty if recovery). Returns to Idle. | D, F, E, K (P6, P12, P14) |

|                   |                   |                                      |
|-------------------|-------------------|--------------------------------------|
| **From**          | **To**            | **Trigger**                          |
| Idle              | MigrationChoice   | User selects Device Migration        |
| MigrationChoice   | OldLiveness       | User selects Normal path             |
| MigrationChoice   | RecoveryAuth      | User selects Recovery path           |
| MigrationChoice   | Idle              | User cancels                         |
| OldLiveness       | QRDisplayed       | Biometric success on old device      |
| OldLiveness       | MigrationChoice   | Biometric fails / user cancels       |
| QRDisplayed       | NewLiveness       | New device scans QR                  |
| QRDisplayed       | MigrationChoice   | TTL expires (10 min)                 |
| NewLiveness       | KeyRotating       | Biometric success on new device      |
| NewLiveness       | MigrationChoice   | Biometric fails / user cancels       |
| RecoveryAuth      | CooldownWait      | Verifier accepts recovery initiation |
| RecoveryAuth      | MigrationChoice   | Verifier rejects (churn throttle)    |
| CooldownWait      | KeyRotating       | Cooldown elapsed + user claims       |
| KeyRotating       | MigrationComplete | Server confirms rotation             |
| KeyRotating       | RotationFailed    | Server error or churn throttle       |
| RotationFailed    | MigrationChoice   | User retries / dismisses             |
| MigrationComplete | Idle              | Automatic (2s display)               |

**3.5 Migration Guard Conditions**

|  |  |  |
|----|----|----|
| **Guard** | **Condition** | **Failure Behavior** |
| \[churn window OK\] | Last migration \> 7 days ago (server-enforced) | Return to MigrationChoice with next_eligible_ts displayed |
| \[migration capsule valid\] | Capsule signature valid + TTL not expired | Return to QRDisplayed (expired) or MigrationChoice (invalid) |
| \[old key not revoked\] | Old device key still active at rotation start | RotationFailed — idempotent: safe to retry |
| \[new SE available\] | New device has Secure Enclave (A11+) | MigrationChoice — device does not meet hardware requirements |
| \[single rotation\] | No concurrent rotation in progress for this identity | RotationFailed (409 Conflict from verifier) |

**4. Verifier Service State Machine**

The verifier operates as a request-response state machine. Each inbound receipt triggers an independent validation pipeline. The verifier processes requests concurrently — each request has its own state machine instance. There is no shared mutable state between requests (nonce registry is append-only with atomic check-and-insert).

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>+=========+</p>
<p>| Ready | [POST /receipt/verify received]</p>
<p>+=========+</p>
<p>|</p>
<p>| parse request body</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| ParseReceipt |----&gt;| RejectMalformed |----&gt; [Ready] (400)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [fields present + format valid]</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| VerifySignature|----&gt;| RejectInvalid |----&gt; [Ready] (403)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [ECDSA valid]</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| CheckNonce |----&gt;| RejectReplay |----&gt; [Ready] (403)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [nonce unique, inserted]</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| CheckEpoch |----&gt;| RejectExpired |----&gt; [Ready] (403)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [timestamp within epoch window]</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| CheckAttest |----&gt;| RejectAttest |----&gt; [Ready] (403)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [App Attest valid]</p>
<p>v</p>
<p>+================+ +=================+</p>
<p>| CheckKey |----&gt;| RejectUnknown |----&gt; [Ready] (403)</p>
<p>+================+ +=================+</p>
<p>|</p>
<p>| [public key registered + not revoked]</p>
<p>v</p>
<p>+=================+</p>
<p>| Validated |----&gt; [Ready] (200, {human: true})</p>
<p>+=================+</p></td>
</tr>
</tbody>
</table>

|  |  |  |
|----|----|----|
| **State** | **Type** | **Description** |
| Ready | **Steady** | Listening for inbound verification requests. |
| ParseReceipt | **Transient** | Validate Content-Type, payload size, required fields, JSON format. |
| VerifySignature | **Transient** | ECDSA P-256 signature verification against device public key. |
| CheckNonce | **Transient** | Atomic check-and-insert in nonce registry. Prevents replay. |
| CheckEpoch | **Transient** | Verify receipt timestamp falls within server-authoritative epoch. |
| CheckAttest | **Transient** | Validate App Attest assertion against Apple root CA. |
| CheckKey | **Transient** | Verify public key is registered and not revoked. |
| Validated | **Terminal** | All checks passed. Return {human: true}. |
| RejectMalformed | **Error** | 400\. Payload format or required fields invalid. |
| RejectInvalid | **Error** | 403\. Signature verification failed. |
| RejectReplay | **Error** | 403\. Nonce already consumed. |
| RejectExpired | **Error** | 403\. Receipt outside epoch window. |
| RejectAttest | **Error** | 403\. App Attest assertion invalid. |
| RejectUnknown | **Error** | 403\. Public key not registered or revoked. |

**4.1 Fail-Fast Chain**

The verifier processes checks in strict order. On first failure, it stops and returns the rejection. It does not continue checking subsequent conditions. This is deliberate: it minimizes computation on invalid input and prevents information leakage about which checks would have passed.

|  |  |  |  |  |
|----|----|----|----|----|
| **\#** | **Check** | **Fail Code** | **HTTP** | **Telemetry Event** |
| **1** | Content-Type = application/json | format_invalid | 415 | verifier.receipt.rejected |
| **2** | Payload size \< 4KB | payload_too_large | 413 | verifier.receipt.rejected |
| **3** | Required fields present | fields_missing | 400 | verifier.receipt.rejected |
| **4** | ECDSA signature valid | signature_invalid | 403 | verifier.sig.invalid |
| **5** | Nonce unique | nonce_duplicate | 403 | verifier.nonce.duplicate |
| **6** | Timestamp in epoch | epoch_expired | 403 | verifier.epoch.expired |
| **7** | App Attest valid | attest_invalid | 403 | verifier.attest.invalid |
| **8** | Public key registered | key_unknown | 403 | verifier.key.unknown |

**5. Demo Website State Machine**

The demo website has two concurrent state machines: the Session state machine (server-side, manages session lifecycle in the in-memory map) and the UI state machine (client-side, manages what the user sees). They communicate via the polling endpoint.

**5.1 Session State Machine (Server-Side)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>+=============+</p>
<p>| Created | [GET / — page load]</p>
<p>+=============+</p>
<p>|</p>
<p>| session_id generated, stored in map</p>
<p>|</p>
<p>+-------&gt; +=============+</p>
<p>| | Expired | [TTL reached, pruned]</p>
<p>| +=============+</p>
<p>|</p>
<p>| [POST /api/receipt with matching session_id]</p>
<p>v</p>
<p>+=============+ +=============+</p>
<p>| Validating |----&gt;| Rejected | [pre-validation or verifier reject]</p>
<p>+=============+ +=============+</p>
<p>|</p>
<p>| [verifier returns {human: true}]</p>
<p>v</p>
<p>+=============+</p>
<p>| Verified | [session.verified = true]</p>
<p>+=============+</p>
<p>|</p>
<p>| [GET /api/status/:id returns verified]</p>
<p>v</p>
<p>+=============+</p>
<p>| Consumed | [content served, session complete]</p>
<p>+=============+</p></td>
</tr>
</tbody>
</table>

|  |  |  |
|----|----|----|
| **State** | **Type** | **Description** |
| Created | **Initial** | Session ID generated. QR code contains this ID. Stored in memory map. |
| Validating | **Transient** | Receipt received. Being forwarded to verifier. Session locked during validation. |
| Verified | **Transient** | Verifier returned true. Session marked verified. Awaiting content delivery. |
| Consumed | **Terminal** | Content served. Session complete. Will be pruned at next TTL sweep. |
| Rejected | **Error** | Pre-validation failed or verifier rejected. Session remains in Created state for retry. |
| Expired | **Terminal** | TTL reached without verification. Pruned from map. User must refresh. |

|  |  |  |  |
|----|----|----|----|
| **From** | **To** | **Trigger** | **Action / Side Effect** |
| Created | Validating | Receipt POST received | Lock session. Forward receipt to verifier. |
| Created | Expired | TTL (5 min) reached | Prune from map. Emit website.session.expired. |
| Validating | Verified | Verifier returns true | Set session.verified = true. Emit website.session.verified. |
| Validating | Rejected | Pre-validation or verifier rejects | Emit website.receipt.rejected with error_code. Unlock session. |
| Rejected | Created | Automatic | Session returns to Created. Can accept another receipt attempt. |
| Verified | Consumed | Status polled + content served | Serve content via /api/content/:id. Emit website.content.unlocked. |
| Consumed | Expired | TTL reached | Prune from map. Normal lifecycle end. |

**5.2 UI State Machine (Client-Side)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>+=========+</p>
<p>| LOCKED | [page load]</p>
<p>+=========+</p>
<p>|</p>
<p>| auto (1s delay)</p>
<p>v</p>
<p>+===========+</p>
<p>| POLLING |-----+------&gt; +===========+</p>
<p>+===========+ | | TIMEOUT | [60 polls, 2 min]</p>
<p>| | +===========+</p>
<p>| |</p>
<p>| +------&gt; +===========+</p>
<p>| | ERROR |</p>
<p>| +===========+</p>
<p>| | |</p>
<p>| [status = verified] | |</p>
<p>v | v</p>
<p>+============+ (retry) | +=============+</p>
<p>| UNLOCKED | &lt;--------+ | FATAL_ERROR |</p>
<p>+============+ +=============+</p></td>
</tr>
</tbody>
</table>

|  |  |  |
|----|----|----|
| **State** | **Type** | **Description** |
| LOCKED | **Initial** | QR code displayed. Status: "Waiting for scan". Content hidden. |
| POLLING | **Steady** | GET /api/status/:id every 2s. QR visible. Status: "Waiting for scan" until receipt arrives, then "Verifying presence..." |
| UNLOCKED | **Terminal** | Presence verified. Protected content displayed. Timing shown. "What just happened?" expandable. |
| TIMEOUT | **Terminal** | 60 polls without verification. "Session Timed Out" displayed. Refresh to retry. |
| ERROR | **Error** | Network error during polling. Retrying with exponential backoff (2s, 4s, 8s, 16s, 32s). Shows retry count. |
| FATAL_ERROR | **Terminal** | 5 retries exhausted or non-retryable error (session_not_found, session_consumed). "Start Over" button. |

|  |  |  |  |
|----|----|----|----|
| **From** | **To** | **Trigger** | **Action / Side Effect** |
| LOCKED | POLLING | Auto after 1s | Start polling interval. Initialize poll counter. |
| POLLING | UNLOCKED | Status = verified | Fade QR (300ms). Show content. Display timing. Emit unlock analytics. |
| POLLING | TIMEOUT | poll_count \>= 60 | Stop polling. Show timeout message with refresh link. |
| POLLING | ERROR | Network error | Start backoff timer. Show retry UI with counter. |
| ERROR | POLLING | Retry succeeds | Resume normal polling. Reset backoff. |
| ERROR | FATAL_ERROR | 5 retries exhausted | Stop retrying. Show "Start Over" button. |
| POLLING | FATAL_ERROR | Non-retryable error | Session gone. Show error reason + "Start Over". |

**6. Cross-Machine Coordination**

The three state machines interact at defined integration points. This section maps those interactions.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>iOS Client Demo Website (Server) Demo Website (UI) Verifier</p>
<p>========= ===================== ================ ========</p>
<p>Created -----------------&gt; LOCKED</p>
<p>POLLING</p>
<p>QRValidating</p>
<p>BurnAuth</p>
<p>BurnProcessing</p>
<p>Submitting ------------&gt; Validating</p>
<p>(forward) ----------------------------------------&gt; ParseReceipt</p>
<p>VerifySignature</p>
<p>CheckNonce</p>
<p>CheckEpoch</p>
<p>CheckAttest</p>
<p>CheckKey</p>
<p>Verified &lt;----------------------------------------- Validated</p>
<p>BurnSuccess UNLOCKED</p>
<p>Consumed</p></td>
</tr>
</tbody>
</table>

**6.1 Integration Points**

|  |  |  |
|----|----|----|
| **From → To** | **Mechanism** | **Failure Handling** |
| **iOS → Website** | POST to callback_url from QR payload. Receipt in body. | iOS: SubmitFailed → queue. Website: never sees it. |
| **Website → Verifier** | POST /receipt/verify. Bearer token auth. 5s timeout. | Website: fail closed. Return 502 to client. Emit error.network. |
| **Verifier → Website** | HTTP response: 200 + {human: true} or 403 + error_code. | Website: map verifier HTTP code to session state. |
| **Website → Browser** | GET /api/status/:id returns {verified: bool}. | Browser: POLLING continues until verified or timeout. |

**7. Explicitly Illegal Transitions**

The following transitions are specifically prohibited. A developer encountering any of these in code or testing has found a bug.

|  |  |  |
|----|----|----|
| **From** | **To** | **Why It Is Illegal** |
| BurnProcessing | BurnAuth | Cannot re-prompt biometric mid-burn. Receipt signing is atomic. |
| Submitting | BurnProcessing | Cannot re-sign a receipt. Submission failure doesn't invalidate the receipt. |
| BurnSuccess | BurnProcessing | Completed burns cannot be reversed or re-processed. |
| Verified | Created | Verified sessions cannot be unverified. One-way transition. |
| Consumed | Verified | Consumed sessions cannot serve content again. Single-use. |
| UNLOCKED | POLLING | Unlock is terminal for the UI. Cannot re-lock after verification. |
| UNLOCKED | LOCKED | Content, once revealed, cannot be hidden. Refresh = new session. |
| Validated | CheckNonce | Verifier cannot re-check a validated receipt. Pipeline is one-pass. |

**8. Acceptance Criteria**

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Every state in Sections 3-5 is reachable via documented transitions | State reachability analysis |
| No undocumented transitions exist in code | Code review against tables |
| All error states have recovery paths back to Idle/Ready/Created | Trace from each error state |
| Illegal transitions (Section 7) are unreachable in code | Negative test cases |
| Verifier fail-fast chain (Section 4.1) processes in strict order | Ordered failure injection |
| Every transition emits the correct telemetry event from OSI8_03C_14 | Event trace validation |
| iOS lifecycle handles biometric re-enrollment correctly. Migration state machine (Section 3.4) reaches all terminal states via documented paths | Change biometric test |
| Website session expires at TTL, not before | Clock test |
| UI state machine matches wireframes in OSI8_03C_11 | Visual comparison |
| Cross-machine integration points (Section 6) work end-to-end | Integration test |
| State machines match PRD (OSI8_03C_09) requirements | Requirement trace |

**9. VDR Cross-References**

|             |                                |                          |
|-------------|--------------------------------|--------------------------|
| **Doc ID**  | **Title**                      | **Relationship**         |
| OSI8_04B_25 | iOS Client Architecture        | iOS states + SE flow     |
| OSI8_04B_06 | iOS Client Acceptance Criteria | Test paths per state     |
| OSI8_03C_09 | Demo Website PRD               | Feature → state mapping  |
| OSI8_03C_10 | Demo Website Platform Spec     | Backend session map      |
| OSI8_03C_11 | Demo Website UX Flows          | UI state wireframes      |
| OSI8_03C_12 | Demo Website Security Model    | Verification chain order |
| OSI8_03C_14 | Telemetry Events               | Event per transition     |

**10. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 1.0 | 2025 | Initial draft. Three state machines with states and transitions listed. |
| 3.0 | April 2026 | Complete rewrite. Split iOS into Lifecycle + Burn state machines. Split website into Session (server) + UI (client) state machines. Added ASCII state diagrams for all 5 machines. Added state definition tables with type classification (Initial/Steady/Transient/Terminal/Error). Added complete transition tables with triggers and side effects. Added guard conditions for iOS. Added verifier fail-fast chain with HTTP codes and telemetry events. Added cross-machine coordination diagram and integration point table. Added explicitly illegal transitions (9 prohibited paths). Expanded acceptance criteria. All sections to institutional documentation standard. |

END OF DOCUMENT

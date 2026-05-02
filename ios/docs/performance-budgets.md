**HPP iOS CLIENT**

**PERFORMANCE BUDGETS**

*Human Presence Protocol*

|  |  |
|:---|:---|
| **Document ID** | 03-27 |
| **Title** | HPP iOS Client Performance Budgets |
| **Version** | 1.0 |
| **Status** | Canonical |
| **Scope** | MVP iOS Client — Latency, Resource, and Responsiveness Targets |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose**

This document defines the maximum acceptable latency, resource consumption, and responsiveness targets for every measurable operation in the HPP iOS client MVP. Performance budgets exist to preserve two things: usability (the user perceives the app as instant and responsive) and cryptographic integrity (time-sensitive operations complete within their protocol-defined windows).

Every budget has a target (the value the team designs toward, measured at p50) and a maximum (the hard ceiling, measured at p99). Exceeding a target is a performance investigation. Exceeding a maximum is a release-blocking defect.

|  |
|----|
| **Design Principle:** HPP’s user experience is tap → FaceID → done. Every operation that touches the user must feel instant. The performance budgets enforce this by setting hard ceilings derived from human perception thresholds (100ms for “instant,” 1000ms for “responsive,” 10s for “attention maintained”). |

**2. Budget Summary**

The following table provides the complete budget at a glance. Detailed breakdowns, measurement methodology, and escalation rules follow in subsequent sections.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **Category** |
| **Biometric authentication** | \< 500 ms | 1,500 ms | I-2 | User-facing |
| **SE signing (ECDSA P-256)** | \< 20 ms | 100 ms | I-1 | Cryptographic |
| **Pulse creation (end-to-end)** | \< 200 ms | 500 ms | I-1, I-2, I-3 | Protocol |
| **Burn: QR scan to record** | \< 300 ms | 800 ms | I-4, I-6 | Protocol |
| **Burn: submit to receipt** | \< 500 ms | 2,000 ms | I-6, I-7 | Protocol + Network |
| **App launch (cold start)** | \< 800 ms | 2,000 ms | — | User-facing |
| **Ledger read** | \< 10 ms | 50 ms | — | Storage |
| **Single API call (round-trip)** | \< 300 ms | 1,500 ms | I-3 | Network |
| **Offline queue drain** | \< 5 s | 30 s | I-10 | Background |
| **Memory footprint (active)** | \< 30 MB | 60 MB | — | Resource |
| **Battery per daily pulse** | \< 0.1% | 0.5% | — | Resource |

**3. Biometric Operations**

Biometric authentication is the user-visible gate for every protocol operation. It is the only operation the user actively waits for. The budget must account for FaceID (typical 200–400ms) and TouchID (typical 300–600ms) hardware variance across device generations.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **FaceID authentication** | \< 400 ms | 1,200 ms | I-2 | Profile LAContext. Check device model. |
| **TouchID authentication** | \< 500 ms | 1,500 ms | I-2 | Sensor hardware variance. Not actionable below max. |
| **Biometric prompt display** | \< 100 ms | 300 ms | I-2 | UI thread blocking. Check main thread work. |

**3.1 Measurement Method**

Measure from LAContext.evaluatePolicy() call to completion handler invocation. Use os_signpost for Instruments profiling. Exclude user decision time (time between prompt display and user looking at camera or placing finger).

|  |
|----|
| **Note:** Biometric latency is largely hardware-determined. The budget captures the combined system time (prompt render + sensor capture + matching). If p99 exceeds max, check for main thread contention before blaming hardware. |

**4. Secure Enclave Signing**

Every pulse and burn requires an ECDSA P-256 signature generated inside the Secure Enclave. This is the fastest operation in the protocol stack and must stay fast — it is on the critical path for both pulse creation and burn submission.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **SE key generation (one-time)** | \< 50 ms | 200 ms | I-1 | One-time at registration. Not recurring. |
| **SE ECDSA P-256 sign** | \< 20 ms | 100 ms | I-1 | If \> 100ms, check SE resource contention. Restart device. |
| **SE key retrieval (Keychain)** | \< 5 ms | 20 ms | I-1 | Keychain query overhead. Check access group. |

**4.1 Measurement Method**

Measure from SecKeyCreateSignature() call to return. The SE executes the signing operation in hardware; software overhead is the Keychain lookup preceding it. Profile both independently.

|  |
|----|
| **Protocol Constraint:** SE signing time directly affects the epoch validity window. If signing takes too long, the pulse timestamp may drift outside the server’s acceptance window. The 100ms max provides a 5x safety margin against the /time endpoint’s typical 30-second tolerance. |

**5. Pulse Creation**

A pulse is the end-to-end attestation cycle: fetch server time, authenticate biometrically, sign the attestation payload in the SE, and submit to the verifier. This is the composite operation the user experiences as a single tap.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **Fetch server time (/time)** | \< 50 ms | 300 ms | I-3 | Network-dependent. See Section 9. |
| **Biometric gate** | \< 500 ms | 1,500 ms | I-2 | See Section 3. |
| **SE sign attestation** | \< 20 ms | 100 ms | I-1 | See Section 4. |
| **Submit to verifier (/pulse)** | \< 200 ms | 500 ms | I-3 | Network-dependent. See Section 9. |
| **End-to-end pulse** | \< 200 ms | 500 ms | I-1, I-2, I-3 | Composite. Excludes user biometric decision time. |

**5.1 Budget Breakdown**

The end-to-end target of 200ms assumes the /time call is cached or pre-fetched, biometric prompt is pre-warmed, and the SE sign completes in \< 20ms. The 500ms max is the hard ceiling including network round-trips. If both the /time fetch and /pulse submit hit their maximums simultaneously (300ms + 500ms = 800ms), the operation exceeds budget — this is why pre-fetching server time is required.

|  |
|----|
| **Design Rule:** The /time endpoint must be called before the biometric prompt appears, not after. This overlaps network latency with user decision time and keeps the perceived operation within budget. |

**6. Burn Flow**

The burn flow has two phases: local (QR scan to burn record creation) and remote (burn submission to receipt). The local phase must feel instant. The remote phase includes a network round-trip that the user must wait for because the RP needs confirmation before unlocking content.

**6.1 Local Phase: QR Scan to Record**

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **QR decode and payload parse** | \< 50 ms | 150 ms | — | Camera framework latency. Not actionable. |
| **Payload validation** | \< 10 ms | 30 ms | — | JSON parse + schema check. |
| **Balance check** | \< 10 ms | 50 ms | I-5 | Ledger read. See Section 8. |
| **Biometric gate** | \< 500 ms | 1,500 ms | I-2 | See Section 3. |
| **SE sign burn request** | \< 20 ms | 100 ms | I-1 | See Section 4. |
| **Create local burn record** | \< 10 ms | 50 ms | I-6 | Storage write. Atomic. |
| **Total local phase** | \< 300 ms | 800 ms | I-4, I-6 | Composite. Excludes biometric decision time. |

**6.2 Remote Phase: Submit to Receipt**

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **Submit burn to verifier (/burn)** | \< 300 ms | 1,500 ms | I-6, I-7 | Network round-trip. Includes server processing. |
| **Receive and validate receipt** | \< 50 ms | 200 ms | I-7 | Receipt signature verification. |
| **Persist receipt locally** | \< 10 ms | 50 ms | I-6 | Storage write. Atomic. |
| **RP callback confirmation** | \< 200 ms | 500 ms | I-14 | RP polling. Not client-controlled. |
| **Total remote phase** | \< 500 ms | 2,000 ms | I-6, I-7 | Network-dominated. Show spinner after 500ms. |

|  |
|----|
| **UX Rule:** If the remote phase exceeds 500ms, display a progress indicator. The user must never see a frozen screen during a burn. If the remote phase exceeds 2,000ms, show an explicit timeout message and offer retry. |

**7. App Launch**

Cold start is the time from the user tapping the app icon to the first interactive screen. HPP must launch fast because a daily-use app that feels sluggish loses user trust. The MVP has minimal UI complexity, so the budget is achievable.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **Pre-main (dylib loading)** | \< 200 ms | 400 ms | — | Minimize frameworks. Avoid dynamic linking bloat. |
| **App init (didFinishLaunching)** | \< 200 ms | 500 ms | — | Defer non-critical init. No network calls. |
| **First frame rendered** | \< 400 ms | 1,000 ms | — | UI must be visible. Data can load async. |
| **Total cold start** | \< 800 ms | 2,000 ms | — | Measure with MetricKit or Instruments. |

**7.1 Launch Rules**

No network calls during launch. No Keychain reads on the main thread during launch. No SE operations during launch. The app must render its first frame before initiating any protocol operation. Background tasks (queue drain, time sync) start after first frame.

**8. Storage**

The HPP client stores the local ledger (credit balance, pulse history, burn receipts), the device identity (Keychain), and the offline queue. All storage operations must be fast enough to never block the main thread.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **Ledger read (balance query)** | \< 10 ms | 50 ms | — | SQLite or UserDefaults. Index on device_id. |
| **Ledger write (pulse append)** | \< 15 ms | 50 ms | — | Append-only. No full-table rewrite. |
| **Burn record write (atomic)** | \< 15 ms | 50 ms | I-6 | Must be atomic with balance deduction. |
| **Receipt persist** | \< 10 ms | 50 ms | I-7 | Write-once. Immutable after creation. |
| **Queue enqueue** | \< 5 ms | 20 ms | I-10 | Offline pulse queued for later submission. |
| **Queue read (drain batch)** | \< 20 ms | 100 ms | I-10 | Read all pending entries for batch submit. |
| **Keychain read (device key ref)** | \< 5 ms | 20 ms | I-1 | SE key reference lookup. |

|  |
|----|
| **Atomicity Constraint:** Burn record write and balance deduction must be a single atomic transaction. If the storage engine does not support transactions (e.g., UserDefaults), use a write-ahead pattern: write the pending record first, then deduct, then mark complete. See 03-26 Section 7 for crash recovery. |

**9. Network**

Network operations are the least controllable component of the performance budget. The budgets below assume a typical LTE or WiFi connection. Degraded network conditions (3G, high-latency satellite) will exceed maximums — the client must handle this gracefully.

|  |  |  |  |  |
|----|----|----|----|----|
| **Operation** | **Target (p50)** | **Max (p99)** | **Invariant** | **If Exceeded** |
| **GET /time** | \< 50 ms | 300 ms | I-3 | Pre-fetch before biometric prompt. |
| **POST /register** | \< 300 ms | 1,500 ms | I-1 | One-time. Includes App Attest relay. |
| **POST /pulse** | \< 200 ms | 500 ms | I-3 | Daily operation. Most latency-sensitive. |
| **POST /burn** | \< 300 ms | 1,500 ms | I-6, I-7 | Includes server-side idempotency check. |
| **GET /burn/status/{id}** | \< 100 ms | 500 ms | I-6 | Recovery query. See 03-26 Section 7. |
| **DNS resolution (cold)** | \< 50 ms | 200 ms | — | First request only. Cached thereafter. |
| **TLS handshake (cold)** | \< 100 ms | 400 ms | — | First connection. Session resumption after. |

**9.1 Timeout Configuration**

|  |  |  |
|----|----|----|
| **Parameter** | **Value** | **Rationale** |
| **Connection timeout** | 10 seconds | Allows for degraded networks without blocking indefinitely. |
| **Request timeout** | 15 seconds | Covers slow server responses. Triggers retry or queue. |
| **Retry count** | 2 retries | Three total attempts (1 initial + 2 retries) with exponential backoff. |
| **Backoff base** | 1 second | 1s, 2s, 4s. Total worst-case: ~37 seconds before failure. |

**9.2 Degraded Network Behavior**

When network operations exceed their maximums, the client must not block the UI or lose data. The following rules apply:

|  |  |
|----|----|
| **Condition** | **Client Behavior** |
| **/time unreachable** | Use cached server time if \< 60s old. Otherwise, pulse fails gracefully and is queued. |
| **/pulse timeout** | Queue the attestation for background submission. User sees success (queued indicator). |
| **/burn timeout** | Do NOT queue burns. Show error and offer retry. Burn must confirm atomically. |
| **Complete offline** | Pulse queued. Burn disabled (requires real-time confirmation). UI indicates offline state. |

**10. Resource Budgets**

Resource budgets cover memory, battery, disk, and background execution. HPP is a lightweight protocol client — it must stay lightweight. The daily interaction is a single tap. Resource consumption must be proportional.

|  |  |  |  |
|----|----|----|----|
| **Resource** | **Target** | **Max** | **Notes** |
| **Memory (active)** | \< 30 MB | 60 MB | Profile with Instruments Allocations. No image caching needed for MVP. |
| **Memory (background)** | \< 10 MB | 25 MB | Background queue drain only. Terminate if memory warning received. |
| **Battery per daily pulse** | \< 0.1% | 0.5% | One biometric + one SE sign + one network call. Negligible. |
| **Disk (app binary)** | \< 5 MB | 15 MB | No embedded assets. No ML models. Minimal frameworks. |
| **Disk (user data)** | \< 1 MB | 5 MB | Ledger + receipts + queue. Prune entries older than 90 days. |
| **Background task duration** | \< 5 s | 30 s | BGTaskScheduler allocation. iOS may terminate earlier. |

**11. Measurement and Enforcement**

**11.1 Instrumentation**

All budgeted operations must be instrumented with os_signpost intervals in DEBUG builds. This enables Instruments profiling during development and TestFlight builds. Signpost intervals map 1:1 to the operations in the budget tables above.

**11.2 Automated Checks**

The acceptance test suite (03-08) includes performance assertions for every budgeted operation. Tests run on physical hardware (not Simulator). Any test exceeding the maximum threshold fails the build.

**11.3 Escalation Rules**

|  |  |
|----|----|
| **Condition** | **Action** |
| **p50 exceeds target** | Performance investigation. File defect. Not release-blocking. |
| **p99 exceeds target** | Performance investigation. May indicate regression on specific device models. |
| **p50 exceeds max** | Release-blocking defect. Systemic issue. Root cause required before release. |
| **p99 exceeds max** | Release-blocking defect. Even tail latency must stay within budget. |
| **Network-caused exceedance** | Not release-blocking if client handles gracefully (timeout, retry, queue). Document in 03-30. |

**12. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-02** | Protocol Invariants Specification | Invariants mapped to every performance budget |
| **03-06** | iOS Platform Integration | SE performance characteristics by device generation |
| **03-08** | iOS Client Acceptance Tests | Performance assertions enforcing budgets |
| **03-14** | Telemetry Events | Telemetry events used for production performance monitoring |
| **03-25** | Post-Release Monitoring Plan | Production latency thresholds derived from these budgets |
| **03-26** | iOS Debugging Guide | Diagnostic procedures when operations exceed budgets |
| **03-30** | iOS Known Limitations | Device-specific performance constraints |

**END OF DOCUMENT**

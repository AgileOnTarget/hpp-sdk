**ATTORNEY WORK PRODUCT — PRIVILEGED & CONFIDENTIAL**

**HPP iOS CLIENT**

**UX FLOWS & WIREFRAMES**

Screen Structure, Navigation Model, and State Transitions for MVP

|  |  |
|----|----|
| **Document ID** | OSI8_04B_02_UX_iOS_Client_Flows_and_Wireframes_v2_0 |
| **Version** | 2.0 |
| **Date** | April 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |
| **Section** | 03 — Product & MVP |
| **Cross-References** | OSI8_04B_01 (iOS PRD), OSI8_03A_01 (MVP Delivery Definition), OSI8_02B_10 (Error Code Registry), OSI8_02B_06 (Failure Modes & Recovery), OSI8_02B_09 (Primitive Registry), OSI8_02A_07 (Technical Stack), OSI8_04B_25 (iOS Implementation Notes) |
| **Audience** | iOS engineers, UX designers, product evaluators, acquirer diligence teams |

*This document reflects inventor-led protocol specification and is not a substitute for independent outside counsel opinion or independent security audit.*

**1. PURPOSE**

This document defines the screen structure, navigation model, and state transitions for the HPP iOS client MVP. It specifies layout skeletons and interaction flows. It does not define visual styling or branding.

**Scope:** 12 screens, 10 flows, 1 global error modal. Every screen maps to PRD requirements (OSI8_04B_01). Every sensitive action is gated by biometrics. Every transactional flow is crash-safe.

**2. DESIGN PRINCIPLES**

|  |  |
|----|----|
| **Principle** | **Specification** |
| **Single navigation stack** | Home as root. No tab bar. Modal overlays for burn confirmation, errors, and receipts. |
| **Minimal screen count** | 12 screens total. Each screen has one primary purpose. No multi-purpose views. |
| **No keyboard input** | All interactions are tap, scan, or biometric. No text fields in any flow. |
| **Biometric gating** | All sensitive actions (attestation, burn) require biometric confirmation. Maps to P5 (Entropy). |
| **Crash-safe transactions** | Burns use atomic local commit before network submission. App restart resumes from last committed state. |
| **System state visibility** | User can always see: credit balance, connectivity status, sync status, last attestation time. |
| **Default-deny posture** | All errors surface via error modal. Unknown errors treated as HPP-SYS-001 (FATAL). INV-13. |

**3. SCREEN INVENTORY**

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **\#** | **Screen** | **Flow** | **PRD Reqs** | **Primitives** | **Stack Layer** |
| 1 | **Welcome** | Setup | FR-02 | — | — |
| 2 | **Biometric Permission** | Setup | FR-02 | P5 | Layer 2 |
| 3 | **Key Generation** | Setup | FR-03, FR-05–06 | P2 | Layer 1 |
| 4 | **Setup Complete** | Setup | FR-07 | — | — |
| 5 | **Home** | Home | FR-12, FR-18, FR-36 | P3, P8 | Layer 3, 5 |
| 6 | **Mint Pulse** | Attestation | FR-09–11 | P1, P4, P5 | Layer 1–3 |
| 7 | **Pulse Result** | Attestation | FR-12, FR-16 | P3, P8 | Layer 3, 5 |
| 8 | **Scan QR** | Burn | FR-20 | P9 | Layer 5 |
| 9 | **Burn Preview** | Burn | FR-21 | P9 | Layer 5 |
| 10 | **Burn Authorization** | Burn | FR-22–24 | P5, P9, P14 | Layer 2, 5 |
| 11 | **Burn Result / Receipt** | Burn | FR-26–29 | P14 | Layer 4 |
| 12 | **Settings** | Settings | — | — | — |
| — | **Error Modal (global)** | All flows | FR-30–33 | P13 | Layer 5 |

**4. FLOW SPECIFICATIONS**

**Flow 1: First Launch and Setup (FR-01–07)**

*Executed once on first launch. Generates identity. No account creation.*

**SCREEN: Welcome**

|                      |                                          |
|----------------------|------------------------------------------|
| **Fields**           | App name, one-sentence purpose statement |
| **Primary Action**   | Continue                                 |
| **Transitions**      | Continue → Biometric Permission          |
| **PRD Requirements** | FR-02                                    |
| **Error Codes**      | None (no protocol operations)            |

**SCREEN: Biometric Permission**

|  |  |
|----|----|
| **Fields** | Explanation: “HPP uses Face ID / Touch ID to prove you are a real human. Your biometric data never leaves this device.” |
| **Primary Action** | Enable Biometrics → iOS system permission dialog |
| **Secondary Action** | Exit App (user cannot proceed without biometrics) |
| **Transitions** | Permission granted → Key Generation. Permission denied → Exit App. |
| **Primitives** | P5 (Non-Transferable Presence Credit) |
| **Error Codes** | HPP-AUTH-003 (user cancelled biometric prompt) |

**SCREEN: Key Generation (Loading)**

|  |  |
|----|----|
| **Fields** | Spinner, status text (“Creating your identity...”, “Registering with verifier...”) |
| **Operations** | 1\) Generate P-256 keypair in Secure Enclave (P2). 2) Generate device ID (SHA-256 of public key). 3) Validate device integrity via App Attest (P2). 4) Register public key with Verifier (P2). |
| **Transitions** | All succeed → Setup Complete. Any failure → Error Modal. |
| **PRD Requirements** | FR-03, FR-04, FR-05, FR-06 |
| **Primitives** | P2 (Hardware Binding) |
| **Error Codes** | HPP-AUTH-002 (Secure Enclave unavailable), HPP-AUTH-005 (App Attest failed), HPP-AUTH-006 (key gen failed), HPP-NET-001 (verifier unreachable) |

**SCREEN: Setup Complete**

|  |  |
|----|----|
| **Fields** | Success icon, confirmation text (“Your identity is ready. You are the key.”) |
| **Primary Action** | Go to Home |
| **Transitions** | Go to Home → Home |
| **PRD Requirements** | FR-07 (enrollment \< 60 seconds) |

**Flow 2: Home (FR-12, FR-18, FR-36)**

*Root screen. Always shows current system state.*

**SCREEN: Home**

|  |  |
|----|----|
| **Fields** | Presence credit balance (large, prominent). Continuity score and tier badge. Last attestation timestamp. Connectivity status indicator (Online \| Offline). Sync status (Idle \| Syncing \| Synced \| Error). Next attestation window indicator. |
| **Primary Actions** | Mint Pulse (daily attestation button). Scan QR (burn initiation button). |
| **Secondary Actions** | View Last Receipt. Settings. |
| **Transitions** | Mint Pulse → Mint Pulse screen. Scan QR → Scan QR screen. View Last Receipt → Receipt screen. Settings → Settings screen. |
| **Primitives** | P3 (Continuity Score display), P8 (Credit balance display) |
| **State Logic** | Mint Pulse button disabled if attestation already completed for current epoch (HPP-ATTEST-001). Offline badge shown when Verifier unreachable (HPP-NET-001). Sync status transitions: connectivity restored → Syncing → Synced (or Error). |

**Flow 3: Daily Attestation (FR-08–15)**

*Core protocol operation. Biometric → sign → submit → score increment.*

**SCREEN: Mint Pulse**

|  |  |
|----|----|
| **Fields** | Instruction text: “Authenticate to record your presence.” |
| **Primary Action** | Authenticate (triggers Face ID / Touch ID) |
| **Operations** | 1\) Request server challenge with fresh nonce (P4, FR-08). 2) Biometric liveness check (P5, FR-09). 3) Sign canonical attestation string in Secure Enclave (P1, P2, FR-10). 4) Submit signed attestation to Verifier (FR-11). 5) If offline: queue in encrypted local store (P10, FR-14). |
| **Transitions** | Auth success + server accepts → Pulse Result. Auth success + offline → Pulse Result (queued indicator). Auth failure → Error Modal. Server rejection → Error Modal. |
| **Primitives** | P1 (Lived Time), P2 (Hardware Binding), P4 (Uncompressibility), P5 (Entropy), P10 (API-Mediated Verification) |
| **Error Codes** | HPP-AUTH-001 (bio fail), HPP-AUTH-004 (lockout), HPP-ATTEST-001 (duplicate epoch), HPP-ATTEST-002 (nonce expired), HPP-ATTEST-003 (signature fail), HPP-NET-001 (offline) |

**SCREEN: Pulse Result**

|  |  |
|----|----|
| **Fields** | Success message. Updated continuity score and tier. Updated credit balance. If queued: “Your attestation is saved and will sync when you’re online.” |
| **Primary Action** | Return Home |
| **Transitions** | Return Home → Home |
| **PRD Requirements** | FR-12 (score display), FR-16 (credit increment) |

**Flows 4–8: QR Burn Sequence (FR-20–29)**

*Five-screen atomic transaction: Scan → Preview → Authorize → Process → Result.*

**SCREEN: Scan QR**

|  |  |
|----|----|
| **Fields** | Camera preview with framing guide |
| **Primary Action** | Cancel → Home |
| **Transitions** | QR detected → Burn Preview. Cancel → Home. |
| **QR Payload** | Verifier endpoint, challenge token, requested credit amount, relying party domain (FR-20) |
| **Primitives** | P9 (Trust Bridging Assertion) |

**SCREEN: Burn Preview**

|  |  |
|----|----|
| **Fields** | Relying party domain (bold). Requested credits (prominent). Current balance. Remaining balance after burn. |
| **Primary Action** | Confirm Burn → Burn Authorization |
| **Secondary Action** | Cancel → Home |
| **Validation** | If requested \> balance: Confirm button disabled, show “Insufficient credits” (HPP-BURN-001) |
| **PRD Requirements** | FR-21 |

**SCREEN: Burn Authorization (ATOMIC)**

|  |  |
|----|----|
| **Fields** | Biometric prompt only (Face ID / Touch ID) |
| **On Success (Atomic)** | 1\) Decrement credits locally. 2) Create burn record with idempotency key. 3) Persist burn record to encrypted storage. 4) Transition to Burn Processing. All three steps commit atomically. If any step fails, none commit. |
| **On Failure** | Return to Burn Preview (no state change) |
| **Crash Safety** | If app crashes after local commit but before network submission: on next launch, app detects uncommitted burn record and resumes at Burn Processing. Credits already decremented locally. No double-spend possible. |
| **Primitives** | P5 (biometric gate), P9 (atomic burn), P14 (ledger record) |
| **Error Codes** | HPP-AUTH-001 (bio fail), HPP-BURN-003 (record invalid) |
| **PRD Requirements** | FR-22, FR-23, FR-24 |

**SCREEN: Burn Processing**

|  |  |
|----|----|
| **Fields** | Spinner. Status text (“Submitting to verifier...”) |
| **Operations** | Submit burn record to Verifier. Receive signed receipt. If offline: queue for deferred submission (FR-25). |
| **Transitions** | Success → Burn Result. Failure → Error Modal (burn record persisted; retry on next launch). |
| **Error Codes** | HPP-BURN-002 (idempotent duplicate), HPP-BURN-005 (receipt sig fail), HPP-NET-001 (offline) |

**SCREEN: Burn Result / Receipt**

|  |  |
|----|----|
| **Fields** | Success message. Receipt ID. Timestamp. Relying party domain. Credits burned. Updated balance. |
| **Primary Actions** | Share Receipt (iOS share sheet). Return Home. |
| **Transitions** | Share → iOS share sheet. Return Home → Home. |
| **PRD Requirements** | FR-26, FR-27, FR-28, FR-29 |
| **Primitives** | P14 (Anti-Sybil Presence Accumulation — receipt in ledger) |

**Flow 9: Settings**

**SCREEN: Settings**

|  |  |
|----|----|
| **Fields** | Device ID (truncated). Public key fingerprint. Continuity score and tier. App version. Telemetry toggle (TEL-04). |
| **Primary Actions** | Export Diagnostics (generates debug log without secrets). Delete Identity (GDPR, PRV-05). |
| **Secondary Action** | Back → Home |
| **Delete Identity** | Requires biometric confirmation. Deletes local keys, credits, receipts. Requests server-side ledger severing (OSI8_05A_03). Transitions to Welcome screen. |

**Global: Error Modal**

**MODAL: Error (overlays any screen)**

|  |  |
|----|----|
| **Fields** | Localized error message (user-friendly). Diagnostic code (canonical HPP error code from OSI8_02B_10). Expandable technical detail (hidden by default). |
| **Primary Actions** | Retry (for WARN and recoverable ERROR codes). Dismiss (returns to previous screen). |
| **Behavior by Severity** | FATAL: Retry disabled. Only Dismiss available. May require app restart. ERROR: Retry available if user action can resolve. WARN: Auto-retry with backoff (FR-31); modal shown only after max retries exhausted. INFO: No modal displayed. |
| **Default-Deny** | Unrecognized error codes treated as HPP-SYS-001 (FATAL). No access granted. INV-13 enforced. |
| **PRD Requirements** | FR-30, FR-31, FR-32, FR-33 |
| **Primitives** | P13 (Replay-Resistant Attestation Windows) |

**5. STATE MACHINE SUMMARY**

The complete state machine for the iOS client. Every state is a screen. Every transition is user action, system event, or error:

|  |  |  |  |
|----|----|----|----|
| **From** | **Action / Event** | **To** | **Condition** |
| App Launch (first) | Auto | Welcome | No keypair exists |
| App Launch (returning) | Auto | Home | Keypair exists |
| App Launch (interrupted) | Auto | Burn Processing | Uncommitted burn found |
| Welcome | Continue | Biometric Permission | — |
| Biometric Permission | Grant | Key Generation | — |
| Key Generation | Success | Setup Complete | All operations pass |
| Key Generation | Failure | Error Modal | Any operation fails |
| Setup Complete | Go to Home | Home | — |
| Home | Mint Pulse | Mint Pulse | Epoch not yet attested |
| Home | Scan QR | Scan QR | Balance \> 0 |
| Mint Pulse | Auth success + online | Pulse Result | Server accepts |
| Mint Pulse | Auth success + offline | Pulse Result (queued) | Offline mode (P10) |
| Mint Pulse | Auth failure | Error Modal | HPP-AUTH-001/004 |
| Scan QR | QR detected | Burn Preview | Valid QR payload |
| Burn Preview | Confirm | Burn Authorization | Balance ≥ requested |
| Burn Authorization | Auth success | Burn Processing | Local commit succeeds |
| Burn Processing | Server success | Burn Result | Receipt received |
| Burn Processing | Offline | Burn Result (queued) | Burn queued (P10) |
| Any screen | Error | Error Modal | Error severity ≥ ERROR |
| Error Modal | Retry / Dismiss | Previous screen | — |

**No orphan states.** Every screen has at least one exit path. Every error is handled. Every crash point has a recovery path.

**6. CRASH SAFETY ANALYSIS**

|  |  |  |
|----|----|----|
| **Crash Point** | **State on Restart** | **Recovery** |
| During setup | No keypair exists | App launches to Welcome. User restarts setup. |
| During attestation | Attestation unsigned or unsubmitted | No state change. User re-attempts attestation. |
| After local burn commit, before submission | Burn record persisted, credits decremented | App detects uncommitted burn on launch. Resumes at Burn Processing. Submits to verifier. |
| During burn submission | Burn record persisted | Same as above. Idempotency key prevents double-spend on retry. |
| During offline sync | Queue intact | Sync resumes on next connectivity event. Hash chain validates queue integrity. |

**7. DOCUMENT RELATIONSHIPS**

|  |  |  |
|----|----|----|
| **Topic** | **VDR Document** | **Relationship** |
| iOS PRD (functional reqs) | OSI8_04B_01 | This UX doc implements the screen flows for each PRD requirement |
| MVP delivery definition | OSI8_03A_01 | Screen recordings of these flows satisfy MVP evidence requirements |
| Error code registry | OSI8_02B_10 | All error codes displayed in Error Modal defined there |
| Failure modes & recovery | OSI8_02B_06 | Crash safety analysis aligns with failure mode categories |
| iOS implementation notes | OSI8_04B_25 | Technical implementation of these screen flows |

**8. ACCEPTANCE CRITERIA**

|  |  |
|----|----|
| **☐** | All 12 screens implemented with specified fields and actions |
| **☐** | Every PRD functional requirement (FR-01–38) has a corresponding screen |
| **☐** | No orphan states in navigation graph |
| **☐** | Burn flow is crash-safe (tested by force-killing app during burn) |
| **☐** | Error Modal surfaces canonical HPP error codes from OSI8_02B_10 |
| **☐** | User can determine system state (balance, connectivity, sync) from Home screen at all times |

***12 screens. 21 state transitions. Zero orphan states. Crash-safe transactions. Every flow traceable to a PRD requirement.***

**— END OF iOS CLIENT UX FLOWS & WIREFRAMES —**

*Version 2.0 updates: Document ID converted to OSI8 naming (OSI8_04B_02); all VDR cross-references updated to OSI8 naming; primitive names corrected to canonical registry; date updated to April 2026. Version 1.1 history: Rebuilt from RTF to institutional .docx, added PRD requirement mapping per screen, added primitive/layer traceability, added HPP error codes per screen from OSI8_02B_10, added screen inventory table, added formal state machine table (21 transitions), added crash safety analysis table, added design principles, corrected error code registry reference from 02-14 to 02-17. This document reflects inventor-led protocol specification and is not a substitute for independent outside counsel opinion.*


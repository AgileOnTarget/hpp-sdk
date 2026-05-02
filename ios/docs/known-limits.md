**HPP iOS CLIENT**

**KNOWN LIMITATIONS**

*Human Presence Protocol*

|                    |                                                        |
|--------------------|--------------------------------------------------------|
| **Document ID**    | 03-30                                                  |
| **Title**          | HPP iOS Client Known Limitations                       |
| **Version**        | 1.0                                                    |
| **Status**         | Canonical                                              |
| **Scope**          | MVP iOS Client — Intentional Limitations and Non-Goals |
| **Date**           | February 2026                                          |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward               |

**CONFIDENTIAL**

**1. Purpose**

This document catalogues every intentional limitation and non-goal of the HPP iOS client MVP. Every item listed here is a deliberate architectural decision, not an oversight. Each limitation exists because it either preserves a Protocol Invariant, reduces MVP scope without compromising protocol integrity, or defers engineering complexity to the acquirer’s build-out phase.

For acquisition diligence teams: this document is the honest accounting of what the MVP does not do. Nothing here is hidden. Everything here has a rationale, an invariant justification, and a clear statement of whether the limitation is permanent (by protocol design) or temporary (resolvable by engineering effort).

|  |
|----|
| **Reading Guide:** Each limitation is classified as **Permanent** (enforced by protocol design — cannot be removed without breaking invariants), **Deferred** (engineering work within acquirer scope), or **Roadmap** (requires protocol extension, covered by patent families). |

**2. Limitation Summary**

|  |  |  |  |  |
|----|----|----|----|----|
| **ID** | **Limitation** | **Category** | **Classification** | **Invariant** |
| **L-01** | Single device only, no account recovery | Identity | **Permanent** | I-1, I-4 |
| **L-02** | No multi-verifier federation | Architecture | **Deferred** | I-3 |
| **L-03** | No ZK proofs in MVP | Cryptography | **Roadmap** | I-13 |
| **L-04** | No background continuous pulsing | UX | **Permanent** | I-2 |
| **L-05** | No offline burn verification | Protocol | **Permanent** | I-6, I-7 |
| **L-06** | No analytics dashboard | Operations | **Deferred** | — |
| **L-07** | No web login (mobile-only) | Platform | **Deferred** | I-1 |
| **L-08** | iOS-only (no Android) | Platform | **Deferred** | I-1 |
| **L-09** | Simulator-only validation (no physical device deployment) | Deployment | **Deferred** | — |
| **L-10** | No multi-credit burn pricing | Protocol | **Deferred** | I-5, I-6 |
| **L-11** | No credential revocation mechanism | Security | **Roadmap** | I-1 |
| **L-12** | No rate-limiting at client layer | Security | **Deferred** | I-8 |

**3. Permanent Limitations**

These limitations are enforced by protocol design. Removing them would break one or more Protocol Invariants. They are features, not bugs.

|          |                                              |
|:--------:|----------------------------------------------|
| **L-01** | **Single Device Only — No Account Recovery** |

Each device generates a unique Secure Enclave key pair at registration. This key cannot be exported, backed up, migrated, or cloned. If the user loses their device, changes phones, or factory resets, their identity and accumulated credits are permanently lost. There is no account system, no cloud backup, and no recovery mechanism.

**Why this is permanent:** Any recovery mechanism requires transferring or reconstructing the device’s private key on a new device. This would mean the key exists outside the SE — violating I-1. Any migration path would become an attack vector for identity cloning. The protocol accepts credit loss on device change as the cost of hardware-bound trust.

|  |  |
|----|----|
| **Rationale** | Preserves hardware-bound identity. Migration would require key export, which destroys the non-extractability guarantee that the entire protocol depends on. |
| **Category** | Permanent — Protocol-enforced |
| **Invariants** | I-1 (Hardware-bound key), I-4 (Non-transferable credits) |
| **Acquirer Scope** | None. This limitation cannot be removed without breaking the protocol. Acquirer may build a credit expiration notification UX to manage user expectations. |
| **References** | 03-06 (iOS Platform Integration), 03-29 (FAQ Q9), 02-02 (Protocol Invariants) |

|          |                                      |
|:--------:|--------------------------------------|
| **L-04** | **No Background Continuous Pulsing** |

Pulses are user-initiated only. The user must open the app and actively trigger the daily attestation with a biometric authentication. There is no automatic background pulsing, no scheduled attestation, and no silent daily check-in.

**Why this is permanent:** Invariant I-2 requires that a human is biometrically present at the moment of attestation. Background pulsing would mean the app signs attestations without the human actively participating. This would reduce presence proof to device possession proof — a much weaker guarantee that any bot with physical access to a device could satisfy.

|  |  |
|----|----|
| **Rationale** | The biometric gate is the human presence proof. Removing the requirement for active user participation would make the protocol equivalent to a device attestation system, not a human presence system. |
| **Category** | Permanent — Protocol-enforced |
| **Invariants** | I-2 (Biometric gate) |
| **Acquirer Scope** | None. This is a protocol-level constraint, not a UX shortcut. Acquirer may add push notification reminders to prompt the daily pulse. |
| **References** | 02-02 (Protocol Invariants), 03-29 (FAQ Q8) |

|          |                                  |
|:--------:|----------------------------------|
| **L-05** | **No Offline Burn Verification** |

Burns require real-time network connectivity to the verifier. If the device is offline, burns are disabled and the UI indicates the offline state. There is no offline burn queue, no delayed burn processing, and no optimistic unlock.

**Why this is permanent:** Burns are atomic (I-6) and idempotent (I-7). The verifier must confirm that the burn_id has not been processed before and that the balance is sufficient before the credits are deducted. Without real-time verification, the client could spend credits that have already been spent (double-spend) or spend credits against a stale balance.

|  |  |
|----|----|
| **Rationale** | Atomicity and idempotency require server-side validation. Offline burn would create a double-spend window that fundamentally breaks the credit system. |
| **Category** | Permanent — Protocol-enforced |
| **Invariants** | I-6 (Atomic burns), I-7 (Idempotency) |
| **Acquirer Scope** | None. This cannot be solved with local logic. The verifier is the single source of truth for balance and burn state. |
| **References** | 03-26 (Debugging Guide §9.2), 03-27 (Performance Budgets §9.2), 03-29 (FAQ Q11) |

**4. Deferred Limitations**

These limitations are engineering scope items that can be resolved without protocol changes. They are explicitly within the acquirer’s build-out phase.

|          |                                  |
|:--------:|----------------------------------|
| **L-02** | **No Multi-Verifier Federation** |

The MVP client connects to a single verifier instance. There is no verifier discovery, no federation protocol, and no ability to register with multiple verifiers or transfer attestation history between verifiers.

|  |  |
|----|----|
| **Rationale** | MVP scope reduction. The protocol specification (02-01) does not prohibit multi-verifier architectures, but the MVP validates the protocol with a single verifier to minimize moving parts. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | I-3 (Server-authoritative time — single time authority simplifies clock coherence) |
| **Acquirer Scope** | Acquirer can implement verifier federation by adding a verifier discovery endpoint and cross-verifier attestation relay. Protocol invariants hold per-verifier. Patent Family D covers federation primitives. |
| **References** | 02-01 (Protocol Specification), 01-09 (Patent Architecture) |

|          |                            |
|:--------:|----------------------------|
| **L-06** | **No Analytics Dashboard** |

The MVP produces raw telemetry events (defined in 03-14) but does not include a monitoring dashboard, alerting UI, or metrics visualization. Monitoring during the 72-hour post-release window is performed via raw log inspection and manual threshold checking.

|  |  |
|----|----|
| **Rationale** | MVP scope reduction. The telemetry schema is complete and the thresholds are defined (03-25). The missing piece is visualization and automated alerting, which are operational infrastructure tasks. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | — (operational, not protocol-level) |
| **Acquirer Scope** | Standard observability stack: Grafana, Datadog, or equivalent. Ingest telemetry events per 03-14 schema, build dashboards per 03-25 thresholds. Estimated effort: 1–2 engineering weeks. |
| **References** | 03-14 (Telemetry Events), 03-25 (Post-Release Monitoring Plan) |

|          |                                |
|:--------:|--------------------------------|
| **L-07** | **No Web Login (Mobile Only)** |

The HPP client is a native iOS app. There is no web-based login, no browser extension, and no desktop client. All protocol operations require the native app with SE access.

|  |  |
|----|----|
| **Rationale** | Web browsers do not have access to Secure Enclave hardware. A web-based client would require WebAuthn or a similar browser-mediated API, which adds architectural complexity without adding to the MVP’s proof-of-protocol goals. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | I-1 (Hardware-bound key — requires native SE access) |
| **Acquirer Scope** | WebAuthn bridge or companion app pattern. The mobile app performs the SE operation and relays the result to the browser session. Patent Family F covers cross-platform attestation relay. |
| **References** | 03-06 (iOS Platform Integration), 01-09 (Patent Architecture) |

|          |                           |
|:--------:|---------------------------|
| **L-08** | **iOS Only (No Android)** |

The MVP is implemented exclusively for iOS. There is no Android client. The protocol specification is platform-agnostic, but the MVP implementation targets the most consistent hardware platform to minimize variables during protocol validation.

|  |  |
|----|----|
| **Rationale** | iOS provides the most uniform SE + biometric + attestation stack across its device range. Android’s StrongBox, BiometricPrompt, and Play Integrity provide equivalent capabilities but with greater fragmentation across OEMs and OS versions. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | I-1 (Hardware-bound key — SE equivalent required on target platform) |
| **Acquirer Scope** | Android implementation using StrongBox (SE equivalent), BiometricPrompt (LAContext equivalent), and Play Integrity (App Attest equivalent). Same protocol, different hardware APIs. Estimated effort: 3–6 engineering months. |
| **References** | 03-29 (FAQ Q17), 02-01 (Protocol Specification) |

|          |                                                               |
|:--------:|---------------------------------------------------------------|
| **L-09** | **Simulator-Only Validation (No Physical Device Deployment)** |

The MVP has been validated in Xcode Simulator with 7 iOS user flows and 3 web flows. It has not been deployed to physical hardware via TestFlight or the App Store. SE operations are mocked in Simulator because the Simulator does not have a Secure Enclave.

|  |  |
|----|----|
| **Rationale** | Simulator validation proves protocol logic, state machine correctness, API contracts, and UI flows. Physical deployment proves hardware integration. The MVP delivers the former; the latter is a deployment task, not a protocol design task. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | — (deployment, not protocol-level) |
| **Acquirer Scope** | TestFlight deployment with physical device acceptance testing per 03-08. SE operations will execute on real hardware. Estimated effort: 1–2 engineering weeks for deployment, 1 week for hardware-specific regression. |
| **References** | 03-08 (Acceptance Tests), 03-09 (MVP Scope Boundaries) |

|          |                                  |
|:--------:|----------------------------------|
| **L-10** | **No Multi-Credit Burn Pricing** |

The MVP supports burns of 1 or more credits, but there is no pricing differentiation, tiered access, or dynamic credit cost. Every RP unlock costs a fixed number of credits defined in the QR payload.

|  |  |
|----|----|
| **Rationale** | Pricing and access tiers are business logic, not protocol logic. The protocol supports variable credit amounts (the required_credits field in the QR payload accepts any positive integer). The MVP simply does not implement dynamic pricing rules. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | I-5 (Bounded lifetime), I-6 (Atomic burns) |
| **Acquirer Scope** | Implement pricing rules on the RP side. The QR payload already supports required_credits \> 1. No protocol changes needed. |
| **References** | 03-12 (Demo Website Security Model), 03-28 (Test Data Pack §4.2) |

|          |                                      |
|:--------:|--------------------------------------|
| **L-12** | **No Rate-Limiting at Client Layer** |

The MVP client does not enforce client-side rate limits on API calls. Rate limiting is enforced server-side by the verifier. A compromised or modified client could attempt rapid-fire pulse or burn submissions.

|  |  |
|----|----|
| **Rationale** | Server-side rate limiting is the authoritative control. Client-side rate limiting is a defense-in-depth measure that improves resilience but is not protocol-critical because the verifier rejects out-of-band requests regardless. |
| **Category** | Deferred — Engineering scope |
| **Invariants** | I-8 (Replay resistance — server-side nonce registry is the primary control) |
| **Acquirer Scope** | Add client-side request throttling and exponential backoff. Standard URLSession configuration. Estimated effort: 1–2 engineering days. |
| **References** | 03-18 (Threat Model), 03-27 (Performance Budgets §9.1) |

**5. Roadmap Limitations**

These limitations require protocol extensions that go beyond the MVP scope. They are covered by existing patent families and are part of the protocol’s long-term architecture.

|          |                         |
|:--------:|-------------------------|
| **L-03** | **No ZK Proofs in MVP** |

The MVP does not implement zero-knowledge proofs for any protocol operation. Attestations are standard ECDSA signatures verified by the server. The verifier can see the device_id and attestation history.

**ZK proofs are a planned protocol extension** that would allow a device to prove “I have N days of continuous attestation” without revealing which device_id or which specific days. This enables privacy-preserving reputation without linkability.

|  |  |
|----|----|
| **Rationale** | ZK proofs add significant cryptographic complexity (circuit design, proving time, verification overhead) without changing the core protocol’s security properties. The MVP validates the underlying attestation chain first. ZK is a layer on top. |
| **Category** | Roadmap — Requires protocol extension |
| **Invariants** | I-13 (ZK of Human Continuity — roadmap primitive) |
| **Acquirer Scope** | Patent Family G covers ZK of Human Continuity. Implementation requires ZK circuit design for the attestation chain, client-side proving (computationally expensive on mobile), and verifier-side proof verification. Estimated effort: 6–12 engineering months with ZK expertise. |
| **References** | 01-09 (Patent Architecture), 02-02 (Protocol Invariants — I-13) |

|          |                                        |
|:--------:|----------------------------------------|
| **L-11** | **No Credential Revocation Mechanism** |

The MVP does not include a mechanism to revoke a device’s registration. Once registered, a device_id remains valid indefinitely (subject to credit expiration). There is no way to remotely disable a compromised device.

|  |  |
|----|----|
| **Rationale** | Revocation requires a revocation list or revocation status protocol, which adds server-side infrastructure and client-side revocation checking on every operation. The MVP prioritizes proving the attestation chain; revocation is an operational security layer. |
| **Category** | Roadmap — Requires protocol extension |
| **Invariants** | I-1 (Hardware-bound key — revocation would invalidate an otherwise-valid SE credential) |
| **Acquirer Scope** | Implement a device revocation registry on the verifier. Client checks revocation status at pulse/burn time. Patent Family E covers revocation and credential lifecycle. Estimated effort: 2–4 engineering months. |
| **References** | 01-09 (Patent Architecture), 03-18 (Threat Model) |

**6. Classification Summary**

|  |  |  |
|----|----|----|
| **Classification** | **Count** | **Significance** |
| **Permanent** | **3** | Protocol-enforced. Cannot be removed. These are the constraints that make HPP’s proof of presence meaningful rather than ceremonial. |
| **Deferred** | **7** | Engineering scope. Resolvable by the acquirer without protocol changes. Estimated total: 6–12 engineering months for all deferred items. |
| **Roadmap** | **2** | Protocol extensions. Covered by patent families. Require ZK or revocation expertise. 8–16 months for both. |

|  |
|----|
| **Bottom Line:** Three limitations are permanent because they are the protocol. Seven are engineering tasks. Two are covered by patents. Nothing in this list is a surprise, a hidden risk, or a design flaw. |

**7. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **01-09** | Three-Ring Patent Architecture | Patent families covering roadmap extensions |
| **02-01** | Protocol Specification | Platform-agnostic protocol definition |
| **02-02** | Protocol Invariants Specification | All 14 invariants justifying permanent limitations |
| **03-06** | iOS Platform Integration | SE, App Attest, platform-specific details |
| **03-08** | iOS Client Acceptance Tests | Test suite for physical device validation |
| **03-09** | MVP Scope Boundaries | Formal scope definition for the MVP |
| **03-12** | Demo Website Security Model | RP integration and QR payload format |
| **03-14** | Telemetry Events | Telemetry schema for monitoring |
| **03-18** | MVP Threat Model | Threat scenarios relevant to limitations |
| **03-25** | Post-Release Monitoring Plan | Monitoring thresholds and dashboards |
| **03-26** | iOS Debugging Guide | Diagnostic procedures referencing limitations |
| **03-27** | iOS Performance Budgets | Network timeout and degraded behavior |
| **03-28** | iOS Test Data Pack | Test fixtures for edge case testing |
| **03-29** | iOS Client FAQ | FAQ answers referencing specific limitations |

**END OF DOCUMENT**

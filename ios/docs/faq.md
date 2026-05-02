**HPP iOS CLIENT**

**FREQUENTLY ASKED QUESTIONS**

*Human Presence Protocol*

|  |  |
|----|----|
| **Document ID** | 03-29 |
| **Title** | HPP iOS Client FAQ |
| **Version** | 1.0 |
| **Status** | Canonical |
| **Scope** | MVP iOS Client — Engineering, Security, and Product Questions |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose**

This document answers the questions that engineers, security reviewers, product evaluators ask most frequently about the HPP iOS client MVP. Every answer is grounded in a specific Protocol Invariant or architectural decision. Every answer includes a cross-reference to the VDR document where the full rationale lives.

The questions are organized by domain: Security and Cryptography, Protocol Design, User Experience, Privacy, Operations, and Deployment Roadmap. If your question is not here, the answer is almost certainly in one of the cross-referenced documents.

*This document exists to collapse common evaluation questions into invariant-grounded answers.*

**2. Quick Reference Index**

|  |  |  |
|----|----|----|
| **\#** | **Question** | **Domain** |
| **Q1** | Why Secure Enclave only and no software keys? | Security |
| **Q2** | Why no biometric template storage? | Security |
| **Q3** | Why is App Attest required? | Security |
| **Q4** | Can pulses be forged? | Security |
| **Q5** | Why are credits non-transferable? | Protocol Design |
| **Q6** | Why do receipts expire? | Protocol Design |
| **Q7** | Why is server time authoritative instead of device time? | Protocol Design |
| **Q8** | Why one credit per day maximum? | Protocol Design |
| **Q9** | What happens if a user changes their phone? | User Experience |
| **Q10** | What happens if the app crashes during a burn? | User Experience |
| **Q11** | What happens when the user is offline? | User Experience |
| **Q12** | Does the app collect PII? | Privacy |
| **Q13** | What data leaves the device? | Privacy |
| **Q14** | Can the verifier identify the user? | Privacy |
| **Q15** | How is the app monitored in production? | Operations |
| **Q16** | What triggers a rollback? | Operations |
| **Q17** | Why is the MVP iOS-only? | Acquisition |
| **Q18** | What does the acquirer need to build? | Acquisition |

**3. Security and Cryptography**

|                                                       |
|-------------------------------------------------------|
| **Q1. Why Secure Enclave only and no software keys?** |

The Secure Enclave is a hardware-isolated coprocessor with its own encrypted memory, secure boot chain, and hardware random number generator. Private keys generated inside the SE cannot be extracted, copied, exported, or backed up — not by the app, not by the OS, not by a jailbreak tool, and not by Apple.

Software keys, by contrast, exist in process memory. They can be read by a debugger, extracted from a backup, copied between devices, or cloned by malware. A protocol that accepts software keys cannot prove that a credential is bound to a specific physical device. Without that proof, there is no hardware-bound presence — and without hardware-bound presence, bots can scale at near-zero marginal cost.

**This is not a preference. It is a protocol invariant.** HPP’s core thesis is that any protocol lacking hardware-bound keys permits bot scaling at near-zero marginal cost. The SE requirement is what makes the constraint binding.

**Invariants:** I-1 (Hardware-bound key) \| **See:** 02-02 (Protocol Invariants), 03-06 (iOS Platform Integration)

|                                            |
|--------------------------------------------|
| **Q2. Why no biometric template storage?** |

HPP never sees, stores, or transmits biometric data. The app calls Apple’s LocalAuthentication framework (LAContext), which returns exactly one bit of information: success or failure. The biometric template (face geometry, fingerprint minutiae) never leaves the Secure Enclave’s biometric coprocessor.

This is by design, not by limitation. Storing biometric templates would create a honeypot — a centralized repository of biometric data that could be breached. It would also create a regulatory burden under BIPA, GDPR Article 9, and equivalent statutes. HPP avoids both problems by never touching the biometric data in the first place.

The protocol only needs to know that the human was present. It does not need to know which human.

**Invariants:** I-2 (Biometric gate), I-11 (No PII collection), I-12 (No PII transmission) \| **See:** 03-06 (iOS Platform Integration), 05-07 (Privacy Architecture)

|                                     |
|-------------------------------------|
| **Q3. Why is App Attest required?** |

App Attest is Apple’s hardware attestation service that proves a key was generated on genuine Apple hardware running a legitimate copy of the app. Without it, an attacker could generate SE-like keys in an emulator or modified runtime and register fake devices.

App Attest closes the gap between “key was generated in a Secure Enclave” and “key was generated in the Secure Enclave of a real device running the real app.” The first statement alone is insufficient because SE emulation exists in research environments.

The App Attest token is verified at registration only. It does not add latency to daily pulse or burn operations.

**Invariants:** I-1 (Hardware-bound key) \| **See:** 03-06 (iOS Platform Integration), 03-18 (Threat Model)

|                               |
|-------------------------------|
| **Q4. Can pulses be forged?** |

No. A pulse requires three things simultaneously: a valid ECDSA P-256 signature from a Secure Enclave private key that never leaves the hardware, a biometric authentication that occurred within the current session, and a server-authoritative timestamp from the /time endpoint.

To forge a pulse, an attacker would need to extract the SE private key (not possible without physical decapping of the chip), bypass FaceID/TouchID at the OS level (not possible without OS-level compromise), and manipulate the server’s timestamp (not possible without compromising the verifier).

All three would need to happen simultaneously for the same device. The attack cost scales linearly with the number of fake identities — which is exactly the economic constraint HPP is designed to enforce.

**Invariants:** I-1 (Hardware-bound key), I-2 (Biometric gate), I-3 (Server-authoritative time) \| **See:** 02-02 (Protocol Invariants), 03-18 (Threat Model)

**4. Protocol Design**

|                                           |
|-------------------------------------------|
| **Q5. Why are credits non-transferable?** |

Credits represent proven human time — one biological day of presence, attested by hardware and biometrics. If credits were transferable, they would become a tradeable commodity. Secondary markets would form. Bots would buy credits from humans willing to sell them. The price of a credit would converge to zero, and the protocol’s proof of presence would become meaningless.

Non-transferability preserves time equality: every human earns at the same rate (one credit per day, maximum), and no human can earn faster by paying someone else. This is the economic constraint that makes HPP’s proof of presence meaningful rather than ceremonial.

Credits are bound to the device_id that earned them. The burn operation verifies that the spending device is the earning device. There is no transfer endpoint, no delegation mechanism, and no way to move credits between devices.

**Invariants:** I-4 (Non-transferable credits), I-5 (Bounded lifetime) \| **See:** 02-02 (Protocol Invariants), 02-01 (Protocol Specification)

|                                 |
|---------------------------------|
| **Q6. Why do receipts expire?** |

Receipt expiration prevents replay attacks. If receipts never expired, an attacker could capture a valid receipt and replay it indefinitely to unlock RP content without spending additional credits. The max_receipt_age_seconds window (default 300 seconds) ensures that a receipt is only valid for a short time after issuance.

The RP must verify the receipt within this window. After expiration, the receipt is cryptographically valid but temporally invalid — the RP should reject it. This forces a fresh burn for each access.

The expiration window is intentionally short (5 minutes) to minimize the replay window while allowing reasonable network latency between the client, verifier, and RP.

**Invariants:** I-7 (Idempotency), I-3 (Server-authoritative time) \| **See:** 03-12 (Demo Website Security Model), 03-28 (Test Data Pack)

|                                                                  |
|------------------------------------------------------------------|
| **Q7. Why is server time authoritative instead of device time?** |

Device clocks are user-controlled. A user can set their device clock forward to generate pulses for future days, backward to re-use expired epochs, or to any arbitrary value. If the protocol trusted device time, the entire attestation chain would be meaningless because time manipulation would allow unlimited credit generation.

Server-authoritative time means the verifier’s /time endpoint provides the canonical timestamp for every pulse. The client must fetch this timestamp before signing. The server then validates that the pulse timestamp falls within the current epoch window. This makes time manipulation a server compromise problem rather than a client manipulation problem.

The cost of this design is a network dependency: the client must reach the /time endpoint to pulse. HPP mitigates this with offline queue tolerance (I-10) — queued pulses are submitted when connectivity returns, and the server determines if they fall within a valid epoch.

**Invariants:** I-3 (Server-authoritative time) \| **See:** 02-02 (Protocol Invariants), 03-26 (Debugging Guide §4)

|                                         |
|-----------------------------------------|
| **Q8. Why one credit per day maximum?** |

The one-credit-per-day rate is the physical constraint that makes biological time a scarce digital resource. A human can only be biometrically present once per epoch (one day). No amount of money, compute, or automation can make a single human earn faster than one credit per day.

This rate creates a hard economic floor: the minimum cost of a bot identity is one physical device, one biological human, one biometric authentication, per day, for as many days as credits are needed. At scale, this cost is linear — there is no economy of scale for bots. This is the constraint that separates HPP from detection-based anti-bot systems, which bots can eventually learn to evade.

The epoch boundary is server-defined. The protocol does not prevent the server from defining shorter or longer epochs in future versions, but the MVP uses 24-hour epochs aligned to UTC midnight.

**Invariants:** I-3 (Server-authoritative time), I-5 (Bounded lifetime) \| **See:** 02-01 (Protocol Specification), 00-04 (The Case for a Level 8 Protocol)

**5. User Experience**

|                                                     |
|-----------------------------------------------------|
| **Q9. What happens if a user changes their phone?** |

The user starts fresh. A new device generates a new Secure Enclave key pair, obtains a new App Attest token, and registers as a new device with the verifier. The previous device’s credits remain on the previous device and cannot be transferred.

This is an intentional design decision, not a limitation. If credits could migrate between devices, the migration mechanism would become an attack vector — a way to clone or transfer identities. HPP’s security model requires that device identity is physically bound to hardware. When the hardware changes, the identity changes.

From the user’s perspective, this means they lose their accumulated balance when they switch phones. The protocol accepts this trade-off because the alternative (transferable identity) would undermine the entire trust model. For a daily-use app where credits accumulate one per day, the maximum loss is bounded by the credit validity window (90 days).

**Invariants:** I-1 (Hardware-bound key), I-4 (Non-transferable credits) \| **See:** 03-06 (iOS Platform Integration), 03-30 (Known Limitations)

|                                                         |
|---------------------------------------------------------|
| **Q10. What happens if the app crashes during a burn?** |

The burn state machine recovers atomically on relaunch. Burns are designed with a write-ahead pattern: the client writes a pending burn record before submitting to the verifier. On relaunch, the client checks for pending records, queries the verifier for the burn’s status, and either completes the burn (if the verifier processed it) or rolls back the balance deduction (if the verifier never received it).

No credits are lost to a failed burn. This is Invariant I-6: burns are atomic. The user either gets the unlock and loses the credits, or keeps the credits and gets no unlock. There is no intermediate state where credits disappear without a receipt.

The full crash recovery procedure is documented in 03-26 Section 7, with the corresponding test fixtures in 03-28 Section 4.2 (crash recovery variant).

**Invariants:** I-6 (Atomic burns) \| **See:** 03-26 (Debugging Guide §7), 03-28 (Test Data Pack §4.2)

|                                                 |
|-------------------------------------------------|
| **Q11. What happens when the user is offline?** |

Pulses are queued locally and submitted when connectivity returns. The offline queue stores attestation payloads with their server timestamps (fetched before going offline or cached from the last successful /time call). When the device reconnects, the queue drains automatically via background task.

Burns are not queued. A burn requires real-time confirmation from the verifier to ensure atomicity and idempotency. If the device is offline, burns are disabled and the UI indicates the offline state. The user must have network connectivity to spend credits.

Queued pulses older than 7 days are expired and pruned — the server will reject them anyway because the epoch window has passed. This bounds the queue depth and prevents stale data accumulation.

**Invariants:** I-10 (Offline tolerance), I-6 (Atomic burns) \| **See:** 03-26 (Debugging Guide §9), 03-27 (Performance Budgets §9.2)

**6. Privacy**

|                                    |
|------------------------------------|
| **Q12. Does the app collect PII?** |

No. The HPP iOS client collects, stores, and transmits zero personally identifiable information. No name, no email, no phone number, no Apple ID, no location, no advertising identifiers, no biometric templates, no device serial numbers.

The only identifier is a random UUID (device_id) generated at registration. This UUID is not linked to any Apple account, phone number, or real-world identity. The verifier cannot determine who owns the device — only that the device exists, has a valid SE key, and has been biometrically attested.

This is enforced by design (the code never calls APIs that access PII), by testing (PII audit procedure in 03-26 Section 10), and by monitoring (PII detection is a zero-tolerance metric in 03-25 Section 4.3).

**Invariants:** I-11 (No PII collection), I-12 (No PII transmission) \| **See:** 05-07 (Privacy Architecture), 05-08 (Data Processing Impact Assessment)

|                                       |
|---------------------------------------|
| **Q13. What data leaves the device?** |

The following data is transmitted to the verifier during normal protocol operations: device_id (random UUID), public_key (ECDSA P-256, generated in SE), pulse payloads (device_id + timestamp + nonce + signature), burn payloads (device_id + session_id + credits + timestamp + signature), and App Attest token (at registration only).

The following data never leaves the device: private key (SE-bound, non-exportable), biometric template (OS-bound, never accessible to app), Apple ID, phone number, email, location, and any other PII.

Telemetry events emitted in debug/TestFlight builds contain only: event type, timestamp, success/failure boolean, and error code. No device_id, no payload content, no PII. The telemetry schema is defined in 03-14.

**Invariants:** I-11 (No PII collection), I-12 (No PII transmission) \| **See:** 03-14 (Telemetry Events), 05-07 (Privacy Architecture)

|                                              |
|----------------------------------------------|
| **Q14. Can the verifier identify the user?** |

No. The verifier knows a device_id (random UUID), a public key, and a history of pulses and burns. It does not know the user’s name, face, phone number, Apple ID, or any other identifying information. The device_id cannot be reverse-mapped to a real identity because it was generated randomly and is not linked to any Apple account.

The verifier can determine that device_id X has been biometrically attested on N days and has burned M credits. It cannot determine who the human is. This is the privacy-preserving property of HPP: proof of human presence without proof of human identity.

The Relying Party (demo website) knows even less. It receives a receipt confirming that a burn occurred for a given session_id. It does not receive the device_id. The RP cannot correlate sessions across visits unless it implements its own tracking (which is outside HPP’s scope and explicitly not part of the protocol).

**Invariants:** I-11 (No PII collection), I-12 (No PII transmission) \| **See:** 05-07 (Privacy Architecture), 03-12 (Demo Website Security Model)

**7. Operations**

|                                                  |
|--------------------------------------------------|
| **Q15. How is the app monitored in production?** |

The Post-Release Monitoring Plan (03-25) defines the complete monitoring framework. Every protocol operation emits telemetry events (defined in 03-14) that are tracked against performance budgets (03-27) and health thresholds.

Eight monitoring objectives cover burn integrity, pulse health, replay resistance, clock coherence, hardware health, PII containment, stability, and RP integration. Each objective maps to specific Protocol Invariants. Four metric severity levels (Critical, High, Medium, Low) trigger escalation through deterministic triage playbooks.

The 72-hour critical monitoring window is a release gate. A release is not complete until all metrics are within thresholds for 72 consecutive hours. After the critical window, monitoring continues with weekly reviews.

**Invariants:** — (operational framework) \| **See:** 03-25 (Post-Release Monitoring Plan), 03-14 (Telemetry Events)

|                                    |
|------------------------------------|
| **Q16. What triggers a rollback?** |

Five conditions trigger an immediate rollback per the Release Runbook (03-21 Section 11): burn success rate below 95% for more than 30 minutes, crash-free sessions below 98% for more than 1 hour, any PII detected in any telemetry or log, any confirmed nonce collision (CSPRNG failure), or any confirmed idempotency violation.

The first three are operational health thresholds. The last two are zero-tolerance protocol integrity violations — a single confirmed instance triggers rollback regardless of duration.

Rollback restores the previous TestFlight/App Store build. The rollback procedure is deterministic: stop the current build, re-deploy the previous build, restart the 72-hour monitoring window. Root cause analysis is required before the next release.

**Invariants:** — (operational framework) \| **See:** 03-21 (Release Runbook §11), 03-25 (Post-Release Monitoring Plan §6)

**8. Deployment Roadmap**

|                                   |
|-----------------------------------|
| **Q17. Why is the MVP iOS-only?** |

iOS provides the three hardware primitives HPP requires in a single, tightly integrated stack: Secure Enclave (hardware-isolated key generation and signing), FaceID/TouchID via LocalAuthentication (biometric gate with no template exposure), and App Attest (hardware attestation proving genuine device and app).

Android’s equivalent stack (StrongBox, BiometricPrompt, Play Integrity) provides similar capabilities but with greater fragmentation across device manufacturers and OS versions. The MVP targets iOS to prove the protocol on the most consistent hardware platform. Android support is an engineering task within the acquirer’s build-out scope, not a protocol design risk.

The protocol specification (02-01) is platform-agnostic. The iOS client is one implementation. The invariants, API contracts, and cryptographic requirements are identical across platforms.

**Invariants:** I-1 (Hardware-bound key) \| **See:** 03-06 (iOS Platform Integration), 02-01 (Protocol Specification)

|                                                |
|------------------------------------------------|
| **Q18. What does the acquirer need to build?** |

The MVP delivers a complete protocol stack validated in Xcode Simulator with 7 iOS user flows and 3 web flows. The acquirer’s engineering scope is deployment and scale, not protocol design:

**Production verifier infrastructure** — the verifier logic is specified (02-01, 02-03); the acquirer deploys it on their cloud infrastructure with their scaling, redundancy, and monitoring.

**Physical device deployment** — TestFlight and App Store submission. The app is built; it needs to be signed with the acquirer’s distribution certificate and submitted.

**Production web frontend** — the demo website (03-12) is a functional proof-of-concept. The acquirer replaces it with their production RP integration.

**Android client** — same protocol, different hardware APIs. StrongBox replaces SE, BiometricPrompt replaces LAContext, Play Integrity replaces App Attest.

None of these tasks require changes to the protocol. The invariants hold. The patent coverage applies. The acquirer is buying the protocol, the IP, and the proven architecture — not a finished SaaS product.

**Invariants:** — (acquisition scope) \| **See:** 03-09 (MVP Scope Boundaries), 00-03 (Executive Summary)

**9. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-01** | Protocol Specification | Canonical protocol definition referenced throughout |
| **02-02** | Protocol Invariants Specification | All 14 invariants grounding every FAQ answer |
| **03-06** | iOS Platform Integration | SE, App Attest, and LAContext implementation details |
| **03-12** | Demo Website Security Model | RP integration, QR, session management |
| **03-14** | Telemetry Events | Telemetry schema governing monitoring |
| **03-18** | MVP Threat Model | Attack scenarios and mitigations |
| **03-21** | iOS Release Runbook | Rollback triggers and release gates |
| **03-25** | Post-Release Monitoring Plan | Production monitoring framework |
| **03-26** | iOS Debugging Guide | Diagnostic procedures for failure modes |
| **03-27** | iOS Performance Budgets | Latency and resource targets |
| **03-28** | iOS Test Data Pack | Deterministic test fixtures |
| **03-30** | iOS Known Limitations | Device-specific constraints and trade-offs |
| **05-07** | HPP Privacy Architecture | Privacy-by-design framework |
| **05-08** | Data Processing Impact Assessment | GDPR/BIPA compliance analysis |

**END OF DOCUMENT**

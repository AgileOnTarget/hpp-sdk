**HPP OVER SIP**

**ANTI-ROBOCALL INTEGRATION GUIDE**

Human Presence Protocol — Telecom Infrastructure Extension

|  |  |
|----|----|
| **Document ID** | 04-02 |
| **Title** | HPP over SIP — Anti-Robocall Integration Guide |
| **Version** | 2.0 |
| **Status** | Canonical |
| **Scope** | SIP Header Extension, Call Admission Gating, Carrier Integration |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

|  |
|----|
| **Purpose:** This document defines how the Human Presence Protocol is integrated into SIP-based telephony systems to cryptographically gate call initiation on verified human presence. It demonstrates how carriers, VoIP providers, and communications platforms can require a valid HPP attestation before allowing call origination, thereby preventing large-scale robocalling, call-farming, and synthetic voice attack campaigns. |

|  |
|----|
| **Acquisition Context:** This guide provides a concrete relying-party integration pattern proving that HPP operates as a protocol-level human verification layer for real-time communications infrastructure — extending beyond web and application environments into telecom networks. The robocall problem represents billions in annual consumer harm and carrier cost. HPP’s constraint-based approach is structurally different from STIR/SHAKEN, which verifies identity but not humanity. |

**CONFIDENTIAL**

**1. Abstract**

HPP-over-SIP introduces a Human-in-the-Loop (HITL) call admission extension for the Session Initiation Protocol. The extension uses additional SIP headers and challenge-response semantics during INVITE processing to require a cryptographically verifiable Human Presence Attestation before a call is permitted to ring.

By imposing a biological and temporal cost on call initiation, the extension renders large-scale automated robocalling economically nonviable. A robocaller producing 10,000 calls per hour would require 10,000 physical devices, each performing a biometric attestation for every call. The economics of bulk dialing collapse.

|  |
|----|
| **Core Thesis:** HPP does not try to detect robocalls. It makes them economically impossible to scale. STIR/SHAKEN verifies that a caller identity is not spoofed. HPP verifies that a biological human is present at the moment of call initiation. These are complementary but fundamentally different guarantees. STIR/SHAKEN answers “who is calling?” HPP answers “is a human calling?” |

> **STIR/SHAKEN verifies the Phone Number. HPP verifies the Human at the other end. This document defines the bridge.**

**Rosetta Stone Alignment:** This integration exercises two primitives directly. P-001 (Lived Time): because each SIP INVITE requires a unique, uncompressible pulse, a robocaller cannot mass-produce invites—the cost of a call becomes the cost of human existence. P-013 (Settlement Gravity): carriers can charge a fraction of a Presence Credit for the invite, creating a massive economic deterrent for spam at the carrier settlement layer.

**2. Audience**

|  |  |
|----|----|
| **Role** | **Focus Areas** |
| **Telecom platform engineers** | SIP header specification, call flow integration, proxy configuration, 488/403 response handling. |
| **VoIP / SIP infrastructure architects** | Architectural overview, challenge-response semantics, out-of-band attestation retrieval, interoperability with existing SIP stacks. |
| **Relying party integration teams** | Integration flow, API endpoints, continuity-based admission policies, SDK reference (see 04-01). |
| **Security and anti-fraud engineers** | Security model, STIR/SHAKEN comparison, economic analysis, patent alignment. |
| **M&A technical diligence** | Market impact, patent coverage, competitive differentiation, addressable market sizing. |

**3. Architectural Overview**

HPP-over-SIP does not modify the SIP INVITE method itself. It extends SIP call establishment behavior using experimental headers and policy enforcement at the proxy or User Agent Server (UAS) layer. This is a non-invasive extension — SIP stacks that do not recognize the header pass it through transparently per RFC 3261 §8.2.2.

|  |  |
|----|----|
| **Property** | **Value** |
| **SIP method modified** | None. Extension operates via headers on existing INVITE flow. |
| **Header type** | Experimental (P- prefix per historical private-header conventions; see RFC 3261 extensibility model). P-Human-Presence. |
| **Enforcement point** | Receiving UAS, SIP proxy, or SBC (Session Border Controller). Configurable per call-admission policy. The SBC acts as the Enforcement Point; the HPP Verifier acts as the Policy Decision Point. |
| **Challenge mechanism** | 488 Not Acceptable Here with Reason-Phrase: Human Presence Required and Require: hpp-presence header. Alternatively, 421 Extension Required may be used per RFC 3261. Caller UAC triggers biometric and re-INVITEs. |
| **Attestation transport** | Compact reference in P-Human-Presence header. Full attestation payload retrieved out-of-band by verifying service via HTTPS. |
| **Backward compatibility** | Non-HPP-aware proxies pass the header transparently. Non-HPP-aware endpoints ignore it. No breakage. |
| **STIR/SHAKEN relationship** | Complementary. STIR/SHAKEN verifies caller identity. HPP verifies caller humanity. Both headers can coexist on the same INVITE. |

**Design Principle:** A receiving UAS or proxy may require proof of human presence before returning a 180 Ringing response. Calls that do not satisfy this requirement are challenged prior to ringing. The phone never rings for an unverified caller.

**4. SIP Header Specification**

**4.1 P-Human-Presence Header**

During the experimental phase, the extension uses a private SIP header per historical private-header conventions (see RFC 3261 extensibility model). Header name is case-insensitive per SIP; canonical form: P-Human-Presence.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>P-Human-Presence: ref="&lt;Opaque_Attestation_Reference&gt;";</p>
<p>streak=&lt;Int&gt;;</p>
<p>epoch=&lt;Int&gt;;</p>
<p>tier="&lt;Tier_Name&gt;";</p>
<p>ts=&lt;Unix_Epoch&gt;</p></td>
</tr>
</tbody>
</table>

**4.2 Header Fields**

|  |  |  |
|----|----|----|
| **Field** | **Type** | **Description** |
| **ref** | String | Opaque reference or truncated SHA-256 hash corresponding to a hardware-bound biometric attestation generated by the calling device. The verifying service uses this reference to retrieve the full attestation payload out-of-band via HTTPS. |
| **streak** | Integer | Human Continuity Score. Consecutive days of verified human presence on the calling device. Maps directly to HPP tier thresholds: ≥1 (TIER_0), ≥7 (TIER_1), ≥30 (TIER_2), ≥365 (TIER_3). |
| **epoch** | Integer | Device epoch value indicating the current primary device generation. Increments on device migration (Patent D). A recent epoch change signals a new or rotated device — call-admission policies may treat low-epoch callers with caution. |
| **tier** | String | Trust tier classification: TIER_0, TIER_1, TIER_2, or TIER_3. Derived from streak value by the HPP Verifier. Convenience field for policy evaluation. |
| **ts** | Integer | Unix epoch timestamp assigned by the HPP Verifier at attestation issuance. The calling device cannot set or backdate this value. The verifying proxy checks that ts is within an acceptable recency window (default: 60 seconds) to prevent stale attestation replay. |

The streak header field is the header-level projection of the continuity_score value contained in the full attestation payload. Both represent the same underlying value; streak is the compact form for SIP header transport.

**4.3 Out-of-Band Attestation Retrieval**

The P-Human-Presence header carries a compact reference, not the full attestation payload. SIP headers have practical size constraints. The full JWS attestation (JSON Web Signature) — including the ECDSA P-256 signature, device binding proof, and hash-chain reference — is retrieved by the verifying service via HTTPS:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>GET /v1/attestations/{ref}</p>
<p>Host: verifier.hpp.example</p>
<p>Authorization: Bearer {carrier_api_key}</p>
<p>Response:</p>
<p>{</p>
<p>"ref": "att_7f3a...c21d",</p>
<p>"pseudonym": "ps_caller_8f3a...d41f",</p>
<p>"continuity_score": 42,</p>
<p>"tier": "TIER_2",</p>
<p>"epoch": 3,</p>
<p>"device_signature": "ECDSA_P-256(...)",</p>
<p>"verifier_signature": "ECDSA_P-256(...)",</p>
<p>"ts": 1760000000,</p>
<p>"hash_chain_ref": "sha256:abc123...def456"</p>
<p>}</p></td>
</tr>
</tbody>
</table>

**5. Call Flow: Pre-Ring Gate**

The following sequence describes the challenge-response flow when a receiving UAS or proxy enforces HPP presence requirements:

**5.1 Sequence Diagram**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>Caller UAC SIP Proxy / UAS HPP Verifier</p>
<p>| | |</p>
<p>| INVITE (no HPP hdr) | |</p>
<p>|------------------------&gt;| |</p>
<p>| | |</p>
<p>| 488 Not Acceptable | |</p>
<p>| Reason: Human Presence | |</p>
<p>| Required | |</p>
<p>|&lt;------------------------| |</p>
<p>| | |</p>
<p>| [Biometric prompt] | |</p>
<p>| [Secure Enclave generates JWS] | |</p>
<p>| | |</p>
<p>| INVITE + P-Human- | |</p>
<p>| Presence header | |</p>
<p>|------------------------&gt;| |</p>
<p>| | GET /attestation/{ref} |</p>
<p>| |------------------------&gt;|</p>
<p>| | |</p>
<p>| | 200 OK (full JWS) |</p>
<p>| |&lt;------------------------|</p>
<p>| | |</p>
<p>| | [Verify signature] |</p>
<p>| | [Check streak &gt;= min] |</p>
<p>| | [Check ts recency] |</p>
<p>| | |</p>
<p>| 180 Ringing | |</p>
<p>|&lt;------------------------| |</p>
<p>| | |</p>
<p>| 200 OK (call setup) | |</p>
<p>|&lt;------------------------| |</p></td>
</tr>
</tbody>
</table>

**FIG. 1:** *HPP-over-SIP pre-ring gate sequence. The phone never rings for an unverified caller. Control-plane only; no production UI implied. All connections use authenticated, encrypted channels.*

**5.2 Step-by-Step Flow**

|  |  |
|----|----|
| **\#** | **Description** |
| **1** | Caller UAC sends INVITE without P-Human-Presence header. This is the normal SIP INVITE — no modification required from the caller’s SIP stack. |
| **2** | Receiving UAS or proxy evaluates call-admission policy. If human presence is required for this destination (configurable per number, per trunk, per carrier policy), the server issues a challenge. |
| **3** | Server responds: 488 Not Acceptable Here, Reason-Phrase: Human Presence Required. This is a standard SIP response code indicating the request cannot be fulfilled as-is. |
| **4** | Calling UAC triggers an operating-system-level biometric prompt. The user authenticates via FaceID / TouchID. The HPP app on the device handles the attestation flow. Implementation note: to avoid SIP T1 timer expiry (typically 500ms), the HPP pulse SHOULD be pre-cached by the dialer app the moment the user taps a contact, before the INVITE is sent. This ensures the attestation is ready for the header without adding call-setup delay. |
| **5** | Hardware Secure Enclave generates a JWS attestation: device signature (ECDSA P-256), continuity score, epoch, timestamp. The attestation reference (truncated hash) is formatted for the P-Human-Presence header. |
| **6** | UAC re-sends INVITE including P-Human-Presence header with the attestation reference, streak, epoch, tier, and timestamp fields. |
| **7** | Server retrieves the full attestation via HTTPS from the HPP Verifier (GET /v1/attestations/{ref}). Verifies ECDSA signature, checks streak against policy threshold, validates timestamp recency (≤60 seconds), and confirms epoch is not on a revocation list. |
| **8** | If valid: server returns 180 Ringing. Normal SIP call setup proceeds. If streak is below threshold: server returns 403 Forbidden, Reason-Phrase: Continuity Insufficient. If attestation is stale or invalid: server returns 403 Forbidden, Reason-Phrase: Attestation Invalid. Note: 488 is used only for challenge (attestation not yet provided). 403 is used only after an attestation is provided and fails policy. |

**6. Continuity-Based Call Admission Policies**

Recipients and carriers may configure call-admission policy based on continuity thresholds. The streak value in the P-Human-Presence header enables graduated trust:

|  |  |  |
|----|----|----|
| **Policy Rule** | **Streak Req.** | **Behavior** |
| **Ring immediately** | **streak ≥ 10** | Caller has demonstrated 10+ days of continuous human presence. Call proceeds to ringing without delay. |
| **Ring with caution** | **streak ≥ 1** | Caller is verified human but is newly enrolled. Call rings but recipient sees a “New HPP identity” indicator. Low-trust visual cue. |
| **Direct to voicemail** | **streak \< 10** | Caller has insufficient continuity. Call does not ring — sent directly to voicemail with a message: “This caller has not yet established sufficient presence history.” |
| **Block call** | **No header** | Caller did not provide any HPP attestation. Call is rejected with 488 challenge or dropped per carrier policy. Applies to robocall infrastructure that cannot produce attestations. |
| **Block recent migration** | **epoch last_changed \< 7 days** | Caller’s device epoch changed within the last 7 days — indicating device migration or identity rotation. Block or send to voicemail. Prevents rapid device-swap farming. |
| **Premium trust** | **streak ≥ 365** | Caller has one year of verified presence. Bypass all screening. Display “HPP Foundational” badge to recipient. Highest-trust calls. |

|  |
|----|
| **Carrier Configurability:** All thresholds are configurable per carrier, per trunk, per destination number, or per subscriber preference. A business subscriber might set ring threshold to streak ≥ 30 (TIER_2). A consumer might accept streak ≥ 1 (any verified human). The framework supports per-number policy without protocol changes. |

**7. Economic Analysis: Why This Disrupts Robocalling**

Robocalling depends on two properties: extremely low per-call marginal cost and high parallelism. HPP-over-SIP eliminates both.

|  |  |  |
|----|----|----|
| **Property** | **Without HPP** | **With HPP-over-SIP** |
| **Cost per call** | Near zero. VoIP origination at \$0.001–\$0.005 per call. No human involvement. | One biometric attestation per call. Requires a physical device with a hardware Secure Enclave and a live human face. Cost: one human-second per call. |
| **Parallelism** | Unlimited. Software can originate thousands of simultaneous calls from a single server. | One call per human per attestation. To originate 10,000 simultaneous calls requires 10,000 humans on 10,000 devices. |
| **Identity cost** | Near zero. Caller ID is trivially spoofable. SIP accounts are created programmatically. | One device + one human + N days of daily biometric attestation per identity. TIER_2 identity costs 30 human-days to create. |
| **Scaling economics** | Linear in compute. More servers = more calls. Marginal cost approaches zero. | Linear in biology. More calls = more humans. Marginal cost approaches the cost of employing a human being. |
| **Detection evasion** | Arms race. Robocallers adapt to heuristic detection. AI-generated voices bypass voice-analysis. | No detection to evade. HPP is constraint-based, not detection-based. The constraint is physics, not software. |

|  |
|----|
| **HPP does not claim to make fraud impossible.** It changes unit economics by converting calling from a near-zero-cost digital operation into a biologically rate-limited process. A human making 50 calls per day is a call center employee. A bot making 50,000 calls per day is a robocaller. HPP makes the second case require 1,000 call center employees — at which point the economics of the scam collapse. |

**8. Security Model**

HPP-over-SIP replaces reliance on spoofable caller identity with verification of biological presence over time.

|  |  |  |
|----|----|----|
| **Property** | **Traditional SIP / STIR/SHAKEN** | **HPP-over-SIP** |
| **What is verified** | Caller identity (Caller ID, certificate chain). Confirms who is calling. | Caller humanity. Confirms a live human on authentic hardware performed a biometric attestation at call time. |
| **Spoofing resistance** | STIR/SHAKEN prevents Caller ID spoofing. Does not prevent legitimate SIP accounts from being used by bots. | Attestation requires hardware Secure Enclave + live biometric. Cannot be spoofed without possessing the physical device AND the enrolled human. |
| **Scalability of fraud** | One legitimate SIP trunk can originate thousands of automated calls. Identity is verified; humanity is not. | One legitimate device can originate one call per attestation. Scaling fraud requires scaling biology. |
| **Synthetic voice attacks** | STIR/SHAKEN does not address voice content. A verified caller identity can deliver AI-generated voice. | HPP verifies human presence at call initiation. The content of the call is orthogonal — but the initiator is provably human. |
| **Trust accumulation** | Binary: valid certificate or not. No history of trust. A newly created SIP account has the same trust as a 10-year account. | Graduated: streak value reflects days of continuous verified presence. Newly created identities have low trust. Trust accumulates biologically. |
| **Biometric data exposure** | N/A (no biometric involved). | None. Biometric stays on device, processed by OS. HPP server, carrier, and recipient never see biometric data. P-Human-Presence header contains no stable cross-domain identifier. |

**Key insight:** Identity strings (Caller ID) are informational. Presence attestations are cryptographically verifiable. Call admission is based on presence, not asserted identity. STIR/SHAKEN and HPP-over-SIP are complementary layers — an INVITE can carry both a STIR/SHAKEN Identity header and a P-Human-Presence header simultaneously.

**9. STIR/SHAKEN Comparison**

For acquirer diligence, the following table clarifies how HPP-over-SIP relates to the existing STIR/SHAKEN framework mandated by the FCC:

|  |  |  |
|----|----|----|
| **Dimension** | **STIR/SHAKEN** | **HPP-over-SIP** |
| **Core question** | Is this caller who they claim to be? | Is this caller a living human? |
| **Verification target** | Caller ID authenticity | Caller biological presence |
| **Standard** | RFC 8224 / RFC 8226. FCC mandated (June 2021). | Experimental SIP extension (P- header). Candidate for future standards-track submission. |
| **Attestation levels** | A (full), B (partial), C (gateway). Based on carrier knowledge of caller. | TIER_0 through TIER_3. Based on biologically accumulated human presence. |
| **Bot prevention** | No. A verified identity can operate bots. STIR/SHAKEN Full Attestation (A) only means the carrier knows the caller. | **Yes. Each call requires a live biometric on authentic hardware. Bots cannot produce attestations.** |
| **Deployment model** | Carrier infrastructure (STI-CA, STI-SP). Certificate-based. Requires carrier participation. | Device-level. Attestation generated on user’s phone. Carrier validates header. Lower infrastructure burden. |
| **Complementary?** | Yes — can coexist with HPP | Yes — can coexist with STIR/SHAKEN |

|  |
|----|
| **Acquisition Note:** STIR/SHAKEN is necessary but insufficient. It prevents Caller ID spoofing but does not prevent legitimate accounts from being weaponized by bots. HPP-over-SIP closes this gap. An acquirer in the telecom space gains the only patented protocol-level human verification for voice calls. |

**10. Patent Alignment**

This embodiment implements and demonstrates the following patent families:

|  |  |  |
|----|----|----|
| **ID** | **Patent Family** | **Application in HPP-over-SIP** |
| **A** | **Hardware-Bound Presence Attestation** | Every call requires a hardware-bound biometric attestation from the calling device’s Secure Enclave. The attestation reference in the P-Human-Presence header is the cryptographic proof. |
| **D** | **Single Primary Device / Atomic Migration** | The epoch field detects device migration. Call-admission policies can block or flag calls from recently migrated devices, preventing rapid device-swap farming. |
| **E** | **Human Continuity Score** | The streak field carries the continuity score. Graduated call admission (ring immediately, voicemail, block) is a direct application of the tier system. |
| **G** | **Server-Time Authoritative Epochs** | The ts field and attestation timestamp are server-authoritative. The calling device cannot backdate an attestation. The verifying proxy enforces recency. |
| **H** | **Cross-Platform Attestation Bridging** | HPP attestations generated for web/app contexts bridge into the SIP domain via the P-Human-Presence header. Same trust infrastructure, new consumption surface. |
| **K** | **Tamper-Evident Attestation Ledger** | The hash_chain_ref in the full attestation payload anchors the call attestation to the device’s tamper-evident receipt chain. Audit trail from enrollment to this call. |

|  |
|----|
| **Six patent families exercised.** Any competitor implementing a human-presence-gated SIP extension infringes on multiple families simultaneously. The patents protect not just the header format but the underlying constraint architecture: hardware-bound biometric attestation (A), continuity scoring (E), server-time authority (G), and cross-platform bridging (H). |

**Appendix A: Implementation Roadmap**

|  |  |  |  |
|----|----|----|----|
| **Phase** | **Deliverable** | **Dependency** | **Timeline** |
| **1** | P-Human-Presence header specification (this document) | HPP MVP (VDR Section 03) | **Complete** |
| **2** | SIP proxy reference implementation | Kamailio or OpenSIPS plugin development | 3–6 months post-acquisition |
| **3** | Carrier pilot (single trunk) | Carrier partner agreement. FCC experimental license if needed. | 6–9 months |
| **4** | IETF Internet-Draft submission | Pilot data, interoperability testing | 9–12 months |
| **5** | SBC vendor integration (Ribbon, Oracle, AudioCodes) | Vendor SDK partnerships | 12–18 months |
| **6** | Standards-track RFC progression | IETF working group adoption | 18–36 months |

**11. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **01-02** | Patent Portfolio Summary | Patent families A, D, E, G, H, K exercised in this integration |
| **02-02** | Protocol Invariants Specification | Invariants I-1, I-2, I-3, I-5 enforced at call initiation |
| **02-05** | H-Constant Paper | Mathematical proof that constraint-based verification is necessary |
| **03-42** | J4 Relying Party Proof Simulator | Threshold verification flow demonstrated interactively |
| **04-01** | Relying Party Implementation Guide | General RP integration patterns; HPP-over-SIP is a specialized instance |

**END OF DOCUMENT**

*CONFIDENTIAL — For Internal M&A / CorpDev / Technical Diligence Only*

**HUMAN PRESENCE PROTOCOL**

**Privacy-Preserving Age Verification**

*via Zero-Knowledge Attestation of Externally Verified Attributes*

CIP Extension to Patent Family B

|  |  |
|----|----|
| **Document ID** | 03-55 |
| **Title** | Privacy-Preserving Age Verification via ZKP |
| **Version** | 1.1 |
| **Owner** | Protocol Architecture (HPP) |
| **Scope** | Externally Attested Attribute Framework — CIP Extension to Patent Family B |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

|  |  |
|----|----|
| **Version** | **Changes** |
| **1.0** | Initial draft — architecture, ZKP extension, patent claims, competitive analysis |
| **1.1** | CIP framing, VP trust levels, regulatory mapping, VAR versioning, terminology standardization, institutional formatting |

**CONFIDENTIAL**

**1. The Problem**

HPP’s existing zero-knowledge proof system (Patent B) proves that a user’s Human Continuity Score satisfies a Relying Party’s threshold without revealing the actual score. The site asks “Is this user’s score at least 30?” and receives a boolean TRUE or FALSE. The proof is mathematically verifiable. The raw score never leaves the device. This is proven, specified, and demonstrated in the J8.1 and J8.2 simulators.

The J8.3 simulator demonstrates a natural extension of this capability: zero-knowledge age verification, where a site asks “Is this user at least 18?” and receives the same boolean TRUE/FALSE without learning the user’s actual age, birthdate, or any other identifying information.

**The critical question is:** how does HPP know the user’s age in the first place?

The continuity score is self-generating. HPP computes it from daily attestation data that the protocol itself produces. No external input is required. Age is different. A user’s age is a fact about the physical world that must enter the system from an external source. The ZKP machinery can prove age satisfies a threshold, but only if the age attribute has been trustworthily established on the device.

Age verification is an instance of the externally attested attribute framework, not a special-case system. This paper specifies how externally verified attributes — starting with age, but extensible to residency, accreditation, and other compliance-relevant properties — enter the HPP system, are stored on-device, and are proven via zero-knowledge proof without ever being transmitted to the HPP server, the Relying Party, or any third party.

|  |
|----|
| **Core Thesis:** The ZKP machinery is the same whether proving ‘score ≥ 30’ or ‘age ≥ 18.’ The mathematical proof system does not change. What changes is the source of the attribute: self-generated (continuity score) versus externally attested (age). This paper specifies the attestation bridge that connects external verification events to the on-device ZKP engine. |

|  |
|----|
| **Cross-Reference:** The interactive simulator VDR 03-54 (SIM_J8_3_Private_KYC.html) demonstrates this architecture end-to-end. The simulator generates real Pedersen commitments, computes range proofs on the P-256 curve, and produces verifiable SHA-256 receipt hashes. A technical auditor can run the simulator alongside this paper and confirm that every claim in the architecture diagrams maps to an observable protocol event in the running code. |

**2. Architecture**

**2.1 Two Classes of ZKP-Provable Attributes**

|  |  |  |
|----|----|----|
| **Property** | **Class 1: Self-Generated** | **Class 2: Externally Attested** |
| **Source** | HPP protocol computes from attestation history | External authority verifies from real-world evidence |
| **Example** | Continuity Score (45 days) | Age (24 years), Residency (US) |
| **Trust Root** | Device key + server epoch + hash chain | Verified credential from Verification Provider (VP) |
| **Key Binding** | Derived from device key | Bound to device key at ingestion |
| **Update Freq.** | Daily (each attestation) | Rare (age changes annually; residency changes infrequently) |
| **On-Device Storage** | Computed in real-time from attestation log | Stored as signed attribute in hardware secure enclave |
| **ZKP Mechanism** | Patent B as specified | Patent B extended (this paper) |
| **Server Knowledge** | Server knows score (computes it) | **Server does NOT know attribute (never receives it)** |
| **Patent Coverage** | Patent B (existing) | Patent B CIP (this paper) |

**2.2 The Attestation Bridge**

The attestation bridge is the mechanism by which an externally verified attribute enters the HPP device and becomes available for zero-knowledge proof. The bridge has three requirements:

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 74%" />
</colgroup>
<tbody>
<tr>
<td><strong>Requirement</strong></td>
<td><strong>Specification</strong></td>
</tr>
<tr>
<td><strong>1. One-Time Verification</strong></td>
<td>The user proves the attribute once to a trusted Verification Provider (VP). This is the only moment when raw attribute data (birthdate, ID scan, etc.) is exposed to any party. After verification, the raw data is discarded.</td>
</tr>
<tr>
<td><strong>2. On-Device Storage</strong></td>
<td><p>The verified attribute is stored as a signed, encrypted record inside the device’s hardware secure enclave. The credential flows directly from the VP into the enclave via the operating system’s credential API (Apple IdentityCredential, Android IdentityCredential). The HPP application mediates the request but the raw attribute data is sealed into enclave-protected storage before any network operation occurs.</p>
<p><strong>The operating system, not the HPP app, performs the final sealing into enclave storage.</strong></p>
<p>The attribute never transits to the HPP server — not during verification, not during storage, not during subsequent ZKP proofs. No API endpoint exists on the HPP server to receive, store, or query externally attested attributes. The absence is architectural, not procedural.</p></td>
</tr>
<tr>
<td><strong>3. ZKP Availability</strong></td>
<td>Once stored, the attribute is available to the existing Patent B ZKP engine. When a Relying Party requests a range proof (“Is age ≥ 18?”), the device retrieves the stored attribute, computes the proof locally, and returns the boolean result. The raw value never leaves the hardware secure enclave.</td>
</tr>
</tbody>
</table>

**2.3 System Architecture**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>┌──────────────────────────────────────────────────────┐</p>
<p>│ PHASE 1: ONE-TIME VERIFICATION │</p>
<p>│ │</p>
<p>│ User's ID ────→ Verification Provider (VP) │</p>
<p>│ (raw data) Verify age, sign result │</p>
<p>│ │ │</p>
<p>│ signed_attr (age = 24) │</p>
<p>│ │ │</p>
<p>│ v │</p>
<p>│ SECURE ENCLAVE │</p>
<p>│ ┌──────────────────┐ │</p>
<p>│ │ Device Key │ │</p>
<p>│ │ Score: 45 │ │</p>
<p>│ │ Age: 24 │ │</p>
<p>│ │ (ext. attested) │ │</p>
<p>│ │ VP_sig: ... │ │</p>
<p>│ └──────────────────┘ │</p>
<p>│ │</p>
<p>│ RAW DATA DESTROYED — ID scan deleted from VP + device│</p>
<p>└──────────────────────────────────────────────────────┘</p>
<p>┌──────────────────────────────────────────────────────┐</p>
<p>│ PHASE 2: ONGOING ZKP USAGE │</p>
<p>│ │</p>
<p>│ Relying Party "Is user &gt;= 18?" HPP Device │</p>
<p>│ (Website) ────────────────→ Retrieve age │</p>
<p>│ from enclave │</p>
<p>│ Compute ZKP: │</p>
<p>│ 24 &gt;= 18? TRUE │</p>
<p>│ ────────────────← ZKP proof │</p>
<p>│ (TRUE + math proof) │</p>
<p>│ │</p>
<p>│ NEVER RECEIVES: age, birthdate, ID, name │</p>
<p>│ HPP SERVER NEVER INVOLVED — device-to-RP direct │</p>
<p>└──────────────────────────────────────────────────────┘</p></td>
</tr>
</tbody>
</table>

**FIG. 1:** *Two-phase architecture. Phase 1 (top): one-time verification with external provider. Phase 2 (bottom): unlimited ZKP proofs to Relying Parties. Raw attribute data exists only during Phase 1 and is destroyed after. The HPP server is never involved in either phase. Control-plane only; no production UI implied. All arrows represent authenticated, encrypted channels.*

**3. Verification Providers**

A Verification Provider (VP) is any trusted authority capable of verifying a real-world attribute and issuing a signed attestation. HPP does not operate as a VP. HPP consumes VP attestations. This separation is architecturally critical: HPP never possesses the raw data, and VPs never interact with Relying Parties.

**HPP does not curate, approve, or certify VPs; trust stores are managed by the operating system and platform ecosystem.**

**3.1 VP Types**

|  |  |  |  |  |
|----|----|----|----|----|
| **VP Type** | **Mechanism** | **Attributes** | **Trust** | **Adoption Path** |
| **Government Digital ID** | eIDAS, mDL, REAL ID | Age, residency, citizenship | **Highest** | EU 2024+, US state pilots |
| **Mobile Wallet Credential** | Apple/Google Wallet ID | Age, name, DL number | High | iOS 16+, select US states |
| **Credit Card Verification** | FTC-approved method | Age (18+ if card holder) | Medium | Immediate (COPPA compliant) |
| **Video Call Verification** | Live agent reviews ID | Age, identity | High | Immediate (manual) |
| **Federated Identity Provider** | OAuth/OIDC with age claim | Age (if provider has DOB) | Medium | Google, Apple, bank IDP |
| **Enterprise HR Attestation** | Corporate directory / HRIS | Employment status | Medium | Enterprise integrations |
| **Biometric Age Estimation** | On-device ML model | Approximate age range | Low | Future (accuracy improves) |

**3.2 VP Attestation Format — Verified Attribute Record (VAR)**

Regardless of VP type, the output is a standardized signed attestation stored on-device:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>┌──────────────────────────────────────────────┐</p>
<p>│ HPP Verified Attribute Record (VAR) │</p>
<p>│ │</p>
<p>│ var_version: 1 │</p>
<p>│ attribute_type: age │</p>
<p>│ attribute_value: 24 ← PRIVATE │</p>
<p>│ verification_method: gov_mdl │</p>
<p>│ vp_identity: us_nc_dmv │</p>
<p>│ vp_trust_level: high │</p>
<p>│ vp_signature: ECDSA_P-256(...) │</p>
<p>│ verified_at: 2026-01-15T14:30:00Z │</p>
<p>│ expires_at: 2027-01-15T00:00:00Z │</p>
<p>│ device_key_binding: SHA-256(device_pub) │</p>
<p>│ storage: SECURE_ENCLAVE_ONLY │</p>
<p>│ exportable: FALSE │</p>
<p>│ server_copy: NONE │</p>
<p>└──────────────────────────────────────────────┘</p></td>
</tr>
</tbody>
</table>

**FIG. 2:** *Verified Attribute Record (VAR). The attribute_value field (24) is the private datum. It is stored exclusively in the hardware secure enclave, bound to the device key, non-exportable, and never transmitted. VAR is versioned (var_version) to allow forward-compatible extensions.*

**3.3 VP Trust Model**

The VP signature establishes a chain of trust: the device trusts the VP’s attestation because the VP’s public key is in a trust store (similar to TLS certificate authorities). The Relying Party trusts the ZKP because the proof is signed by the device’s enclave key, which is registered with the HPP protocol. The VP never communicates with the RP. The HPP server never sees the attribute.

VP trust levels map to the existing Patent E tier system. A government-issued digital ID attestation could automatically qualify the attribute for Tier 3 trust. A credit card verification might qualify for Tier 2. An on-device age estimation might qualify for Tier 1 only. The RP specifies the minimum trust level alongside the attribute query.

**4. On-Device Verification Flow**

**4.1 Enrollment-Time Attribute Verification**

The attribute verification flow occurs once, either during HPP enrollment or at any point afterward. It is a standalone interaction between the user, the Verification Provider (VP), and the device. The HPP server is not involved.

|  |  |  |
|----|----|----|
| **Step** | **Phase** | **Details** |
| **1** | **User initiates** | User initiates attribute verification in HPP app. App presents list of supported verification methods. |
| **2** | **User selects VP** | User selects VP (e.g., Mobile Driver’s License). App triggers OS-level credential presentation (iOS: IdentityCredential API / Android: IdentityCredential). |
| **3** | **OS presents credential** | App receives ONLY the requested fields: age_over_18: TRUE, date_of_birth: 2001-09-14. App does NOT receive: name, address, photo, DL number. Selective disclosure per ISO 18013-5. |
| **4** | **Construct VAR** | Stores date_of_birth encrypted and sealed in hardware secure enclave. Computes age = current_date − date_of_birth. Binds VAR to device key (non-exportable). Temporary buffers are zeroed after enclave write. Deletes raw credential data from memory. |
| **5** | **Confirm to user** | User sees: “Age verified. Your birthdate is stored securely on this device. It will never be shared.” COMPLETE. No data sent to HPP server. No data retained by VP. |

**4.2 Selective Disclosure**

Modern digital credential standards (ISO 18013-5 for mobile driver’s licenses, EU eIDAS 2.0 for European digital identity) support selective disclosure: the credential holder can release specific fields without exposing the entire credential. When HPP requests age verification, it requests only the date_of_birth field. The user’s name, address, photo, driver’s license number, and all other fields remain in the wallet. The VP (credential issuer) does not learn which RP triggered the request or that the verification occurred. This is not a future capability — selective disclosure is shipping in iOS 16+ and is mandated by eIDAS 2.0.

**4.3 Device Migration**

When a user migrates to a new device (Patent D), Verified Attribute Records migrate as part of the identity transfer. The VAR is re-encrypted under the new device’s hardware secure enclave key during the atomic migration handshake. If the VP signature has expired, the user must re-verify the attribute on the new device. If the VP signature is still valid, the VAR transfers intact. The migration does not require re-presenting the physical ID.

**5. ZKP Extension for Externally Attested Attributes**

**5.1 Proof Structure**

**No new cryptographic primitives are introduced by this extension.** Patent B specifies a zero-knowledge range proof using Pedersen commitments on the P-256 curve. The existing proof demonstrates that a committed value (the continuity score) satisfies an inequality (score ≥ threshold) without revealing the value. The extension is structurally identical:

|  |  |  |
|----|----|----|
| **Component** | **Score ZKP (Patent B)** | **Age ZKP (CIP Extension)** |
| **Committed Value** | Human Continuity Score (integer) | Age in years (integer, derived from DOB) |
| **Commitment** | Pedersen commitment on P-256 | Pedersen commitment on P-256 (same) |
| **Proof Type** | Range proof: score ≥ T | Range proof: age ≥ T (same structure) |
| **Blinding Factor** | Random scalar per proof | Random scalar per proof (same) |
| **Challenge** | Fiat-Shamir heuristic (SHA-256) | Fiat-Shamir heuristic (SHA-256) (same) |
| **Signature** | Device enclave key (ECDSA P-256) | Device enclave key (ECDSA P-256) (same) |
| **Value Source** | Computed by protocol engine | Retrieved from hardware secure enclave VAR |
| **Trust Anchor** | Server epoch + hash chain | VP signature + device key binding |
| **Proof Output** | Boolean + math proof | Boolean + math proof + VP trust level |

**5.2 Proof Protocol**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>RP → Device: ATTRIBUTE_REQUEST {</p>
<p>attribute: 'age',</p>
<p>operator: 'gte',</p>
<p>threshold: 18,</p>
<p>min_trust_level: 'high',</p>
<p>nonce: 0x7f3a...c21d</p>
<p>}</p>
<p>Device (local):</p>
<p>1. Retrieve VAR from hardware secure enclave</p>
<p>2. Check: VAR.vp_trust_level &gt;= min_trust_level</p>
<p>3. Check: VAR.expires_at &gt; now()</p>
<p>4. Compute: age = floor((now - VAR.dob) / 365.25)</p>
<p>5. Compute Pedersen commitment: C = age*G + r*H</p>
<p>6. Compute range proof: age &gt;= 18</p>
<p>7. Sign proof with device enclave key</p>
<p>Device → RP: ZKP_ATTESTATION {</p>
<p>query: 'age_gte_18',</p>
<p>result: TRUE,</p>
<p>proof: { commitment, challenge, response },</p>
<p>vp_trust_level: 'high',</p>
<p>vp_method: 'gov_mdl',</p>
<p>pseudonym: 'ps_8f3a...c21d',</p>
<p>device_signature: ECDSA(...),</p>
<p>nonce: 0x7f3a...c21d</p>
<p>}</p>
<p>RP (local):</p>
<p>1. Verify device_signature against registered key</p>
<p>2. Verify nonce matches request</p>
<p>3. Verify ZKP math (commitment, proof)</p>
<p>4. Check vp_trust_level &gt;= required</p>
<p>5. Accept or reject</p>
<p>6. Verify vp_signature against trusted VP key</p>
<p>NEVER TRANSMITTED: age (24), birthdate (2001-09-14), name, ID</p></td>
</tr>
</tbody>
</table>

**FIG. 3:** *Full proof protocol. The device acts as a cryptographic intermediary: it retrieves the private attribute from the enclave, computes the mathematical proof locally, and transmits only the boolean result with a verifiable proof to the RP. The HPP server is not in the communication path. Control-plane only; no production UI implied. All arrows represent authenticated, encrypted channels.*

**6. Information Disclosure Analysis**

For acquirer due diligence, it is critical to specify exactly what each party in the system learns, at each phase:

|  |  |  |  |
|----|----|----|----|
| **Party** | **During Verification (Once)** | **During ZKP Usage (Ongoing)** | **On Breach** |
| **User** | Presents ID to VP | Authorizes each proof via biometric | N/A (data is theirs) |
| **Verification Provider** | Sees raw ID + DOB for verification | **Learns NOTHING (not contacted)** | VP data policy governs; HPP not implicated |
| **Apple/Google OS** | Mediates credential transfer only | Does not retain attribute | OS trust boundary assumed equivalent to SE threat model\* |
| **User’s Device** | Stores DOB in hardware secure enclave | Computes proof locally, returns boolean | Enclave data non-exportable; device wipe destroys |
| **HPP Server** | **Learns NOTHING (not involved)** | **Learns NOTHING (proof is device-to-RP)** | **Cannot leak what it never possessed** |
| **Relying Party** | N/A (not involved in verification) | Receives: TRUE/FALSE + trust level + pseudonym | Attacker gets boolean + pseudonym; no PII |
| **Network Observer** | Sees encrypted VP-to-device traffic | Sees encrypted device-to-RP traffic | TLS protects all transit |

|  |
|----|
| **Double-Blind Architecture:** The VP that verified the attribute does not know which RPs will consume it, and the RPs that consume the proof do not know which VP issued the underlying credential. The HPP server is blind to both sides. A complete compromise of the HPP server — root access, full database dump, all encryption keys — cannot reveal a single user’s age, because the data was never present in any form the server could access. |

**7. Extensible Attribute Framework**

Age is the first externally attested attribute, but the architecture supports any attribute that can be expressed as an integer or boolean and verified by a trusted authority:

|  |  |  |  |  |
|----|----|----|----|----|
| **Attribute** | **Query Example** | **VP Source** | **ZKP Type** | **Use Case** |
| **Age** | age ≥ 18 | mDL, eIDAS, credit card | Range proof | Age-restricted content, gambling, alcohol |
| **Residency** | country == US | mDL, utility bill, eIDAS | Equality proof | Geo-restricted services, sanctions screening |
| **Accreditation** | accredited_investor == TRUE | Broker-dealer attestation | Boolean proof | SEC Reg D compliance |
| **Humanity Duration** | account_age_days ≥ 90 | HPP native (already built) | Range proof | Anti-fraud, anti-bot |
| **Credit Capacity** | credits ≥ 5 | HPP native (already built) | Range proof | Scarcity gating |
| **Professional License** | medical_license == TRUE | State licensing board | Boolean proof | Professional verification |
| **Education** | degree_year ≥ 2020 | University registrar | Range proof | Employment verification |

Each attribute follows the same architecture: verified once by a VP, stored on-device, proven unlimited times via ZKP. The Verified Attribute Record format is attribute-agnostic. Adding a new attribute type requires only a new VP integration and a new query type in the RP API — no changes to the ZKP engine, device storage, or protocol architecture.

**8. Regulatory Alignment**

**HPP eliminates the need for RPs to become custodians of age data.** The regulatory advantage is that HPP’s age verification is simultaneously stronger (cryptographic proof from a government credential) and more private (no PII retention) than any existing approach.

|  |  |  |  |
|----|----|----|----|
| **Regulation** | **Requirement** | **HPP Status** | **How** |
| **COPPA (US)** | Verifiable parental consent under 13 | **Compliant** | VP-attested age; parental consent flow (VDR 05-07) |
| **KOSA (US)** | Reasonable age verification for minors | **Compliant** | ZKP age proof without data collection |
| **UK Online Safety Act** | Highly effective age assurance | **Compliant** | Cryptographic proof; no PII retention |
| **EU eIDAS 2.0** | Selective disclosure from digital wallet | **Native** | HPP consumes eIDAS credentials directly |
| **EU Digital Services Act** | Age-appropriate design for minors | **Compliant** | ZKP boolean satisfies DSA “reasonable measures” standard |
| **Australia (proposed 16+)** | Age verification for social media | **Compliant** | ZKP boolean; no birthdate stored by RP |
| **GDPR Art. 25** | Privacy by design and default | **Compliant** | No PII processed; ZKP is data minimization |
| **CCPA/CPRA** | No sale of personal information | **Compliant** | No PI collected, stored, or shared |
| **IL BIPA** | Biometric consent for minors | **Compliant** | VDR 05-07 parental consent framework |

**9. Competitive Comparison**

|  |  |  |  |  |
|----|----|----|----|----|
| **Property** | **ID Upload** | **Credit Card** | **Self-Declare** | **HPP ZKP** |
| **PII collected by site** | Full ID scan, DOB, name, photo | Card number, billing address | None (honor system) | **NONE** |
| **Data stored by provider** | ID image, extracted data | Transaction record | None | **NONE** |
| **Breach exposure** | Complete identity theft | Financial data | None (no data) | **Boolean + pseudonym** |
| **Accuracy** | High (document) | Medium (age proxy) | Zero (unverified) | **High (VP-attested)** |
| **User friction** | High (upload, wait) | Medium (enter card) | Low (click checkbox) | **Low (biometric + proof)** |
| **Repeat verification** | Each site, each time | Each site, each time | Each site, each time | **Verify once, prove everywhere** |
| **Cross-site tracking** | Same ID → linkable | Same card → linkable | None | **Per-RP pseudonym → unlinkable** |
| **Minor protection on denial** | Site learns user is under 18 | N/A | N/A | **Site learns FALSE only** |
| **Cryptographic verifiability** | No | No | No | **Yes — mathematically verifiable ZKP** |
| **Server ever sees DOB?** | Yes | No (proxy only) | No | **No — architectural impossibility** |
| **GDPR compliance** | Requires extensive DPA | Requires payment data DPA | Compliant (no data) | **Compliant by architecture** |

**10. Patent Strategy: CIP Extension**

**10.1 Continuation-in-Part Basis**

This specification constitutes new matter suitable for a Continuation-in-Part (CIP) application filed off Patent Family B (Zero-Knowledge Proof of Human Continuity Tier). The CIP claims priority to the Patent B provisional filing date (January 2026) for the ZKP range proof mechanism, and receives the CIP filing date for the new matter: externally attested attributes, Verified Attribute Records, the attestation bridge, and VP trust level integration.

**CIP claims are drafted to be primitive-level, not application-specific.** See Patent Family B summary in VDR 01-02 for the parent application.

**10.2 New Claims**

|  |  |
|----|----|
| **Claim** | **Description** |
| **B-CIP-1** | A method for privacy-preserving attribute verification comprising: (a) receiving a signed attestation of a user attribute from an external Verification Provider (VP); (b) storing the attested attribute exclusively in a hardware secure enclave bound to a device-specific cryptographic key; (c) upon request from a relying party, computing a zero-knowledge proof that the stored attribute satisfies a threshold condition; and (d) transmitting only the boolean result and mathematical proof to the relying party, without transmitting the attribute value, the user’s identity, or any personally identifiable information. |
| **B-CIP-2** | The method of Claim B-CIP-1, wherein the zero-knowledge proof further includes a trust level indicator derived from the Verification Provider’s identity, enabling the relying party to evaluate the strength of the underlying verification without learning the attribute value. |
| **B-CIP-3** | A system for attribute verification comprising: a device with a hardware secure enclave storing a Verified Attribute Record containing an encrypted attribute value, a VP signature, and a device key binding; and a zero-knowledge proof engine that retrieves the attribute from the enclave, computes a range or equality proof against a relying party’s query, and outputs a cryptographically signed boolean attestation; wherein the attribute value is never transmitted to any party other than the device’s secure enclave. |
| **B-CIP-4** | The method of Claim B-CIP-1, wherein the attribute is age derived from a date of birth, the threshold condition is a minimum age requirement, and the zero-knowledge proof is a Pedersen commitment-based range proof on the NIST P-256 curve using the Fiat-Shamir heuristic for non-interactive verification. |

**10.3 Prior Art Differentiation**

|  |  |
|----|----|
| **Differentiator** | **Details** |
| **No PII transmission** | Existing systems (Jumio, Yoti, AgeChecked) verify age by collecting and processing identity documents server-side. HPP never transmits the attribute to any server. The computation occurs entirely in the hardware secure enclave. |
| **Hardware binding** | The Verified Attribute Record is non-exportable from the hardware secure enclave and bound to the device’s cryptographic key. It cannot be copied, backed up, transferred to another device (except via the atomic migration protocol, Patent D), or extracted by the operating system. |
| **Presence protocol integration** | The age ZKP is not a standalone system — it is an extension of the Human Presence Protocol’s existing trust infrastructure. The proof includes the user’s per-RP pseudonym (Patent H), is gated by biometric liveness (Patent A), and is logged to the tamper-evident hash chain (Patent K). A standalone age verification system cannot provide these properties. |

**11. Implementation Roadmap**

**Phase 1 requires CIP filing before public demo.** Phases 2–5 are parallelizable and can proceed concurrently once the CIP is filed.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **Phase** | **Deliverable** | **VP Source** | **Dependency** | **Parallel?** | **Timeline** |
| **0 (Current)** | Score-based ZKP (Patent B) | Self-generated | None | — | Specified |
| **1** | mDL age verification (iOS) | Apple IdentityCredential API | iOS 16+, state mDL adoption | Sequential | CIP filing + 6 months |
| **2** | Credit card age proxy | FTC-approved transaction | Payment processor | **Yes** | CIP filing + 9 months |
| **3** | eIDAS 2.0 wallet | EU Digital Identity Wallet | eIDAS 2.0 rollout (2026–2027) | **Yes** | 12–18 months |
| **4** | Federated IDP age claims | Google/Apple/bank IDP | OAuth/OIDC age claim support | **Yes** | 12–18 months |
| **5** | Extended attributes (residency, etc.) | Multiple VPs | Per-attribute VP integration | **Yes** | Ongoing |

**12. Bottom Line**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>For the Acquirer</strong></p>
<p>HPP’s existing ZKP (Patent B) already proves attributes without revealing values. The math works. The simulators demonstrate it.</p>
<p>Age verification is not a new capability — it is a new data source plugged into the same proof engine. The user verifies once with a government credential. The birthdate enters the hardware secure enclave and never leaves. From that point forward, every site that asks “Is this user 18+?” gets a cryptographic TRUE backed by a government-grade attestation — without the site ever learning the user’s age, birthdate, or identity.</p>
<p>The CIP extension covers the attestation bridge (how external attributes enter the system) and the VP trust level integration (how RPs evaluate verification strength). Four independent claims. Clean differentiation from prior art.</p>
<p>This is not a feature request. It is a documented extension path with a specified architecture, a clear patent strategy, and an implementation roadmap tied to shipping platform APIs (Apple IdentityCredential, eIDAS 2.0). The acquirer inherits both the existing ZKP engine and the specified extension that makes it commercially transformative for the multi-billion-dollar global age-assurance market.</p>
<p><strong>This extension demonstrates how HPP converts regulatory requirements into cryptographic invariants.</strong></p></td>
</tr>
</tbody>
</table>

**VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **01-02** | Patent Portfolio Summary | Patent Family B parent application |
| **02-02** | Protocol Invariants Specification | Invariants preserved by ZKP extension |
| **03-42** | J4 Relying Party Proof Simulator | Score-based threshold verification (Class 1) |
| **03-54** | J8.3 Private KYC Simulator | Interactive age ZKP demonstration (Class 2) |
| **05-07** | HPP Privacy Architecture | Parental consent framework for COPPA/KOSA |

**END OF DOCUMENT**

*CONFIDENTIAL — For Internal M&A / CorpDev / Technical Diligence Only*

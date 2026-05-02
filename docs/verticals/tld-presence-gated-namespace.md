<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-10</p>
<p><strong>HPP TLD Presence-Gated Namespace</strong></p>
<p><em>Layer 8 Domain Architecture — The TLD Land Grab</em></p></td>
</tr>
</tbody>
</table>

|  |  |
|----|----|
| **Field** | **Value** |
| **Document ID** | 04D-10_IMP_TLD_Presence_Gated_Namespace_v1 |
| **Status** | Canonical — v1.0 |
| **Patent Coverage** | Layer 8 TLD Patents (01F) · Presence-Gated Namespace Architecture |
| **Author** | Agile On Target LLC |
| **Date** | March 2026 |

**1. Purpose**

This specification defines the integration architecture for HPP's Presence-Gated Top-Level Domain (TLD) namespace — a new class of internet domains where every interaction requires cryptographic proof of human presence. Unlike conventional TLDs where bots and automated systems freely access content, a presence-gated TLD enforces the H-Constant at the DNS resolution layer, creating an entire namespace guaranteed to be human-occupied.

This represents the most ambitious application of HPP: not gating individual pages or transactions, but gating entire domain namespaces. It is the "land grab" — the first-mover opportunity to define how the human-verified internet operates at the infrastructure level.

**2. Strategic Context**

**2.1 The Namespace Opportunity**

The current TLD landscape (ICANN gTLDs and ccTLDs) makes no distinction between human and automated traffic. Every .com, .org, and .io domain serves bots and humans identically. HPP-gated TLDs create a new tier:

- .human (or equivalent): every page request requires presence attestation

- .safe: child-safe namespace with age verification at the DNS layer

- .verified: commerce namespace where every participant is biometrically confirmed

- .presence: developer-focused namespace for presence-aware applications

The entity that controls the registry for these TLDs controls the economic gateway to the human-verified internet.

**2.2 Competitive Moat**

- Patent protection: Layer 8 TLD architecture is covered by dedicated patent filings (01F)

- Protocol lock-in: TLD resolution depends on HPP Attestation Server infrastructure

- Network effects: as more sites adopt presence-gated TLDs, the value of the namespace grows exponentially

- Regulatory alignment: presence-gated TLDs preemptively satisfy age verification and bot prevention mandates

**3. Architecture**

**3.1 DNS Resolution with Presence Gate**

Standard DNS resolution is extended with a presence verification step:

1.  User navigates to site.human (or site.verified, etc.).

2.  DNS resolver returns A/AAAA records as normal.

3.  Browser connects to server. Server responds with HPP challenge (integrated into TLS handshake or initial HTTP exchange).

4.  HPP client on user's device completes biometric attestation.

5.  Presence Certificate delivered to the site. Site verifies and serves content.

6.  Without valid presence attestation, the site returns a presence-gate interstitial — content is not accessible.

This is not DNS-level blocking — the domain resolves normally. The gate operates at the application layer (Layer 7/8), but the TLD namespace signals that presence verification is an integral requirement.

**3.2 Registry Architecture**

The presence-gated TLD registry operates as:

- Registry operator: Agile On Target LLC (or designated entity)

- Registrar integration: standard EPP protocol with HPP enrollment requirement for registrants

- Zone file: standard DNS zone with additional HPP policy records

- Policy enforcement: registrants must implement HPP meta tag on all pages within the namespace

- Compliance monitoring: automated presence verification testing of registered domains

**3.3 HPP Policy DNS Records**

Domains within the presence-gated TLD publish HPP policy via DNS TXT records:

- \_hpp.site.human TXT "v=hpp1; callback=/api/hpp; min-tier=1; age-tier=0"

- v=hpp1: HPP policy version

- callback: HPP callback path

- min-tier: minimum continuity tier required (0–3)

- age-tier: minimum age tier required (0–5, 0 = no age requirement)

**4. Namespace Categories**

|  |  |  |  |
|----|----|----|----|
| **TLD Candidate** | **Purpose** | **Gate Requirements** | **Target Market** |
| .human | General human-verified web | Presence attestation | All sites wanting bot-free guarantee |
| .safe | Child-safe content | Age verification (Tier 2+) | Educational, children's media |
| .verified | Verified commerce | Presence + payment gating | E-commerce, financial services |
| .presence | Developer sandbox | HPP enrollment | HPP SDK developers, testing |
| .trust | High-trust services | Presence + enhanced vetting | Government, healthcare, legal |

**5. ICANN Application Strategy**

Securing a new gTLD requires an ICANN application during the next gTLD application round:

7.  Pre-application: assemble technical, financial, and legal documentation package.

8.  Application submission: \$185,000 application fee per TLD string.

9.  Technical evaluation: demonstrate registry infrastructure, DNS operations, abuse prevention.

10. Community priority: if contested, demonstrate community benefit of presence-gated namespace.

11. Registry agreement: execute registry agreement with ICANN upon approval.

12. Delegation: TLD delegated in root zone. Registry operational.

**5.1 Differentiation from Existing TLDs**

The presence-gated TLD application must demonstrate that it creates new value not available through existing TLDs:

- Technical differentiation: HPP integration at the namespace level (no existing TLD does this)

- Community benefit: bot-free internet spaces, child safety, fraud prevention

- Policy innovation: first TLD with cryptographic presence requirements in registry policy

- Patent backing: protected technology prevents commoditization of the concept

**6. Developer Integration**

**6.1 Registrant Requirements**

Domain registrants within the presence-gated TLD must:

- Implement HPP meta tag on all pages served under the domain

- Configure HPP callback endpoint for presence certificate delivery

- Maintain valid HPP Attestation Server relationship

- Pass quarterly compliance verification (automated presence testing)

**6.2 Visitor Experience**

For visitors, presence-gated domains work like any other website with one addition:

- First visit: HPP client prompts for enrollment (one-time biometric registration)

- Subsequent visits: presence attestation takes \< 5 seconds (biometric tap)

- Session maintenance: once verified, browsing within the TLD requires no additional attestation until session expires

- Cross-domain: presence verified on one .human site applies within the namespace (single attestation per session)

**7. Economic Model**

**7.1 Registry Revenue**

- Domain registration fees: annual registration at premium pricing (presence guarantee has value)

- Attestation volume: per-attestation fee or included in registration

- Compliance certification: annual compliance verification fee

- Enterprise tiers: bulk registration for organizations wanting namespace presence

**7.2 Value Proposition**

- For site operators: guaranteed bot-free traffic, premium ad inventory, regulatory compliance by default

- For users: every site in the namespace is verified human-only; no CAPTCHA, no bot farms, no synthetic interactions

- For advertisers: 100% verified human impression rate within the namespace

- For regulators: age verification and bot prevention built into infrastructure, not bolted on

**8. Security Invariants Enforced**

- All 8 invariants (INV-1 through INV-8) enforced at the namespace level

- H-Constant: every interaction within the TLD carries minimum biological cost

- Registry-level enforcement: non-compliant registrants can be suspended

- Cross-domain attestation: single presence proof valid across the namespace (reduces user friction)

- Patent protection: namespace architecture covered by 01F TLD patent filings

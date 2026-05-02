<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-05</p>
<p><strong>HPP Ad Tech Integration</strong></p>
<p><em>Human Impression Validation, Bot-Free Inventory &amp; Presence-Tiered CPM</em></p></td>
</tr>
</tbody>
</table>

|                     |                                                  |
|---------------------|--------------------------------------------------|
| **Field**           | **Value**                                        |
| **Document ID**     | 04D-05_IMP_Ad_Tech_Impression_Validation_v1      |
| **Status**          | Canonical — v1.0                                 |
| **Patent Coverage** | Pro-T (Ad Impression Human Presence Attestation) |
| **Author**          | Agile On Target LLC                              |
| **Date**            | March 2026                                       |

**1. Purpose**

This specification defines how ad exchanges, publishers, and advertisers integrate HPP to cryptographically verify that ad impressions are viewed by biometrically confirmed humans. HPP replaces probabilistic bot detection (CAPTCHA, behavioral heuristics, IP reputation) with deterministic presence proof.

The global digital advertising market loses an estimated \$84 billion annually to ad fraud (Juniper Research, 2024). HPP eliminates the economic incentive for impression fraud by enforcing a biological cost floor per impression through the H-Constant.

**2. Market Context**

- Video Advertising (YouTube-class): \$300M–\$1.25B addressable impact

- Social Advertising (Meta/Facebook-class): \$5.6B–\$14B addressable impact

- Real-Time Social (X/Twitter-class): \$375M–\$750M addressable impact

- Streaming Media (Spotify-class): €380M–€550M addressable impact

- Commerce Advertising (Amazon-class): \$300M–\$1B addressable impact

**3. Presence-Tiered Impression Model**

**3.1 Continuity Tiers**

HPP introduces four continuity tiers based on accumulated verified presence duration. Higher tiers command premium CPM multipliers because they represent sustained, verified human attention:

|  |  |  |  |
|----|----|----|----|
| **Tier** | **Presence Duration** | **CPM Multiplier** | **Description** |
| Tier 0 | None (unattested) | 1.0x | Baseline — no presence receipt available |
| Tier 1 | 0–300 seconds (0–5 min) | 1.5x | Low continuity — recently verified |
| Tier 2 | 300–3,600 seconds (5–60 min) | 2.5x | Medium continuity — sustained session |
| Tier 3 | \> 3,600 seconds (\> 1 hour) | 4.0x | High continuity — extended engagement |

**3.2 Burn-Per-View Credits**

Premium ad placements require presence credit expenditure, creating a cryptographic cost of attention:

|  |  |  |
|----|----|----|
| **Placement Class** | **Credits Per Impression** | **Use Case** |
| Standard | 0 (uses accumulated) | Display ads, sidebar inventory |
| Premium | 5 credits | Video pre-roll, interstitial |
| Exclusive | 10 credits | Sponsorship, takeover |
| Ultra-Exclusive | 20 credits | Live event, limited audience |

Where 1 credit = 30 seconds of server-authoritative presence. A user accumulates credits through normal biometric attestations and "spends" them on premium content views.

**4. Integration Architecture**

**4.1 Publisher Integration**

1.  Publisher embeds HPP meta tag on ad-serving pages: \<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="Publisher"\>

2.  When ad slot renders, publisher backend checks HPP session for active presence certificate.

3.  If present: attach continuity_tier and presence_receipt_hash to ad request sent to exchange.

4.  If absent: serve unattested inventory at Tier 0 rates.

**4.2 Ad Exchange Integration (OpenRTB Extension)**

HPP extends the OpenRTB bid request with presence attestation fields:

- hpp.continuity_tier: integer (0–3)

- hpp.presence_duration: integer (seconds of accumulated presence)

- hpp.biometric_attested: boolean

- hpp.cert_hash: SHA-256 hash of the Presence Certificate (not the cert itself)

- hpp.publisher_verified: boolean (publisher has verified certificate)

Demand-side platforms (DSPs) can bid higher for attested inventory, creating a market premium for verified human attention.

**4.3 Hash-Chained Impression Ledger**

Every impression generates a tamper-evident ledger entry:

- entry_id: monotonic sequence number

- timestamp: verifier-signed Unix epoch

- device_id: hardware-bound identifier (never PII)

- impression_hash: SHA-256(placement_id \|\| creative_id \|\| timestamp)

- previous_hash: hash of prior ledger entry (chain integrity)

- credit_delta: credits burned (negative) or accumulated (positive)

- entry_hash: SHA-256(previous_hash \|\| timestamp \|\| impression_hash \|\| credit_delta)

Advertisers can independently verify the complete impression chain by recomputing hashes from genesis, providing cryptographic proof of delivery without trusting any intermediary.

**5. Advertiser Dashboard Metrics**

- Impressions by tier: Tier 0/1/2/3 breakdown with percentage splits

- Average CPM by tier: actual vs. estimated baseline

- Verified human impression rate: attested / total impressions

- Credit burn patterns: peak demand hours, average burn per session

- Device enrollment velocity: new devices per day (fraud detection signal)

- Hash chain integrity: percentage of ledger entries independently verified

**6. Fraud Prevention Mechanisms**

- H-Constant enforcement: minimum biological cost per impression prevents bot farms from scaling

- Enrollment rate limit: 3 new devices per IP per 24-hour window

- Credit burn atomicity: deduction and receipt issuance in single transaction (no double-spend)

- Origin binding: impression receipt cryptographically tied to publisher origin (same-origin policy)

- Non-transferability: presence credits bound to device, cannot be pooled or transferred

- Ledger immutability: hash-chained entries prevent retroactive modification

**7. Security Invariants Enforced**

- INV-1/INV-2: UV flag required and independently verified

- INV-3: Attestation Server signature verification

- INV-5: Certificate delivery via callback, never page JS

- INV-6: Same-origin callback enforcement

- INV-7: Nonce single-use (each impression is a unique attestation event)

- H-Constant: Biological cost floor makes impression fraud economically irrational

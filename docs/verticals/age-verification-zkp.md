<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-06</p>
<p><strong>HPP Age Verification Integration</strong></p>
<p><em>Zero-Knowledge Age Attestation Without Identity Disclosure</em></p></td>
</tr>
</tbody>
</table>

|                     |                                                 |
|---------------------|-------------------------------------------------|
| **Field**           | **Value**                                       |
| **Document ID**     | 04D-06_IMP_Age_Verification_ZKP_Integration_v1  |
| **Status**          | Canonical — v1.0                                |
| **Patent Coverage** | Pro-P (Age Verification) · 03-55 (ZKP Age Gate) |
| **Author**          | Agile On Target LLC                             |
| **Date**            | March 2026                                      |

**1. Purpose**

This specification defines how Relying Parties integrate HPP to verify that a user meets a minimum age threshold without learning or storing the user's actual age, date of birth, or identity. HPP's age verification produces a cryptographic Boolean: "this device holder is at or above age X" — nothing more.

This satisfies UK Online Safety Act 2023, EU Digital Services Act (DSA), and US state-level age verification mandates without creating honeypot databases of minors' personal information.

**2. Regulatory Landscape**

- UK Online Safety Act 2023: age verification required for services likely accessed by children

- EU Digital Services Act (DSA): platforms must assess and mitigate risks to minors

- US State Laws: Utah, Virginia, Louisiana, Texas, and 15+ states with enacted or pending age verification statutes

- Australia Online Safety Act: age assurance for restricted content

- COPPA (Children's Online Privacy Protection Act): parental consent required under age 13

**3. Age Gate Tiers**

|  |  |  |  |
|----|----|----|----|
| **Tier** | **Minimum Age** | **Use Case** | **Regulatory Driver** |
| Tier 1 | No requirement | Public content | None |
| Tier 2 | 13+ | Social media, user-generated content | COPPA boundary |
| Tier 3 | 16+ | Data processing consent (GDPR) | GDPR Article 8 |
| Tier 4 | 18+ | Adult content, gambling, tobacco | UK OSA / State laws |
| Tier 5 | 21+ | Alcohol, cannabis (US jurisdiction) | US federal/state |

**4. Zero-Knowledge Proof Architecture**

**4.1 Verification Age Record (VAR)**

The VAR is a signed, privacy-preserving credential issued by an approved age verification provider. It contains:

- device_id: hardware-bound identifier (TEE/Secure Enclave)

- age_threshold_met: Boolean (true = user is at or above the verified age)

- verification_tier: integer (2–5, corresponding to age gate tier)

- issuer_id: verification provider identifier

- issuance_timestamp: when the VAR was created

- expiry: credential lifetime (typically 90 days)

- zkp_proof: zero-knowledge proof blob

- issuer_sig: ECDSA P-256 signature over the VAR

Critically, the VAR does NOT contain: date of birth, actual age, name, government ID number, photo, or any personally identifying information.

**4.2 Verification Flow**

1.  User visits age-gated site. Site's HPP meta tag includes data-hpp-age-tier="4" (for 18+ content).

2.  HPP client checks local VAR store for a valid VAR at the required tier.

3.  If no valid VAR exists: user is redirected to an approved age verification provider (Tier 1–3 provider, per regulation).

4.  Provider verifies age (document scan, database check, or existing credential) and issues a VAR.

5.  VAR is stored in the device's secure storage (TEE/Keychain). No data leaves the device except the Boolean proof.

6.  HPP client presents VAR + biometric attestation to the site's callback.

7.  Site backend verifies: (a) VAR issuer signature valid, (b) VAR not expired, (c) age tier meets requirement, (d) HPP presence certificate valid (human is present now).

**4.3 Privacy Properties**

- Zero knowledge: site learns ONLY "age \>= X" — never actual age or DOB

- No central database: VAR stored on-device only; no server-side age registry

- Unlinkability: different sites receive different proof instances; cannot correlate users across sites

- Revocability: VAR can be revoked by issuer without revealing identity

- Minimal disclosure: even the verification provider doesn't learn which sites the user visits

**5. API Integration**

**5.1 Site Meta Tag Extension**

Sites declare their age requirement in the HPP meta tag:

**Meta tag:** \<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="Site" data-hpp-age-tier="4"\>

The data-hpp-age-tier attribute triggers the age verification flow before standard presence attestation.

**5.2 Certificate Extension**

When age verification is active, the Presence Certificate includes additional fields:

- age_verified: Boolean (true)

- age_tier_met: integer (tier that was verified)

- var_issuer_id: identifier of the VAR issuer

- var_expiry: when the underlying VAR expires

The site's backend verifies these fields alongside standard certificate verification.

**6. Device Migration**

When a user migrates to a new device, the VAR must be re-established. HPP supports three migration paths:

- Provider re-verification: user re-verifies age with the original provider (most common)

- Credential transfer: encrypted VAR transfer via provider-mediated key exchange (requires biometric on both devices)

- Institutional vouching: enterprise/institutional identity asserts age tier (e.g., university, employer)

**7. Compliance Mapping**

|                                    |                              |            |
|------------------------------------|------------------------------|------------|
| **Requirement**                    | **HPP Implementation**       | **Status** |
| UK OSA: effective age verification | VAR + biometric attestation  | Compliant  |
| GDPR: data minimization            | Boolean only, no PII stored  | Compliant  |
| COPPA: parental consent \< 13      | Guardian delegation flow     | Compliant  |
| EU DSA: risk mitigation for minors | Tier-based gating            | Compliant  |
| No honeypot risk                   | On-device VAR, no central DB | Compliant  |

**8. Security Invariants Enforced**

- INV-1/INV-2: Biometric UV required — proves a human is present NOW (not just age-verified once)

- INV-5: VAR and certificate never exposed to page JavaScript

- INV-7: Nonce single-use prevents replay of age verification across sessions

- H-Constant: Biological cost floor prevents automated age verification farming

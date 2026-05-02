<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-07</p>
<p><strong>HPP Child Safety Integration</strong></p>
<p><em>Cryptographic Safe Zones, Guardian Delegation &amp; COPPA Compliance</em></p></td>
</tr>
</tbody>
</table>

|                     |                                              |
|---------------------|----------------------------------------------|
| **Field**           | **Value**                                    |
| **Document ID**     | 04D-07_IMP_Child_Safety_Integration_v1       |
| **Status**          | Canonical — v1.0                             |
| **Patent Coverage** | Pro-M (Child Safety Cryptographic Exclusion) |
| **Author**          | Agile On Target LLC                          |
| **Date**            | March 2026                                   |

**1. Purpose**

This specification defines how platforms integrate HPP to create cryptographically enforced Safe Zones that exclude underage users from restricted content without collecting or storing children's personal data. The system also enables guardian delegation — a parent/guardian can cryptographically authorize a minor's access to specific content tiers.

**2. Regulatory Requirements**

- COPPA (US): verifiable parental consent required for children under 13

- KOSA (Kids Online Safety Act): platforms must prevent harm to minors

- UK Age Appropriate Design Code: best interests of child must be primary consideration

- EU Digital Services Act: systemic risk assessment for impact on minors

- Australia Online Safety Act: online safety expectations for children

**3. Safe Zone Architecture**

**3.1 Content Classification**

Platforms classify content into zones. Each zone specifies a minimum age tier (from the Age Verification vertical) and optional guardian delegation permissions:

|             |             |                         |                            |
|-------------|-------------|-------------------------|----------------------------|
| **Zone**    | **Min Age** | **Guardian Override**   | **Example Content**        |
| Open        | None        | N/A                     | Public educational content |
| Teen        | 13+         | Parent can grant access | Social media, messaging    |
| Young Adult | 16+         | Parent can grant access | Marketplace, data consent  |
| Adult       | 18+         | No override permitted   | Gambling, adult content    |
| Restricted  | 21+         | No override permitted   | Regulated substances       |

**3.2 Exclusion Event Protocol**

When a user attempts to access age-restricted content:

1.  Platform checks HPP session for active age verification at required tier.

2.  If age_tier_met \>= zone requirement: access granted with standard presence attestation.

3.  If age_tier_met \< zone requirement: access denied. Exclusion event logged.

4.  If no age verification present: platform may offer verification flow or deny access.

5.  Exclusion events generate cryptographic receipts (auditable but privacy-preserving).

**4. Guardian Delegation**

**4.1 Delegation Flow**

A parent or guardian can authorize a minor's device to access specific content tiers:

6.  Guardian completes full HPP enrollment on their own device (adult age tier verified).

7.  Guardian initiates delegation request specifying: child's device_id, permitted content tier, and expiry.

8.  Guardian completes biometric attestation to authorize the delegation (proves human guardian is present).

9.  Attestation Server issues a Delegation Certificate binding guardian_device_id to child_device_id with scoped permissions.

10. Child's device can now access content up to the delegated tier without its own age verification.

**4.2 Delegation Certificate Fields**

- delegation_id: unique identifier

- guardian_device_id: hardware-bound ID of guardian's device

- child_device_id: hardware-bound ID of child's device

- permitted_tier: maximum content tier the child may access (2 or 3 only)

- expiry: delegation expiration (recommended: 30 days)

- guardian_cert_id: the Presence Certificate that authorized this delegation

- hpp_server_sig: Attestation Server signature over the delegation

**4.3 Revocation**

Guardians can revoke delegation at any time via HPP.invalidateSession() on their own device, which triggers revocation of the linked Delegation Certificate. Revocation is immediate and does not require the child's device to be online.

**5. COPPA Compliance Architecture**

HPP satisfies COPPA's verifiable parental consent requirement through the guardian delegation mechanism:

- Consent is cryptographic: guardian's biometric attestation serves as verifiable consent

- No child PII collected: device_id is hardware-bound, not personally identifiable

- Consent is revocable: guardian can revoke at any time

- Consent is scoped: limited to specific content tiers, not blanket access

- Consent is auditable: delegation certificates provide cryptographic audit trail

**6. API Integration**

**6.1 Zone Declaration**

Platforms declare Safe Zones in their HPP meta tag:

**Meta tag:** \<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="Platform" data-hpp-safe-zone="teen"\>

**6.2 Delegation Endpoint**

**Endpoint:** POST /v1/delegate

- guardian_cert_id: active guardian Presence Certificate

- child_device_id: target device identifier

- permitted_tier: maximum tier to delegate (2 or 3)

- expiry_days: delegation lifetime in days

**7. Security Invariants Enforced**

- INV-1: Guardian must complete biometric attestation to authorize delegation

- INV-5: Delegation certificates not exposed to page JavaScript

- INV-7: Each delegation is a unique nonce-bound event

- H-Constant: Automated guardian consent farming is economically unviable

- Adult tiers (4, 5) cannot be delegated — no override permitted

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-04</p>
<p><strong>HPP Financial Services Integration</strong></p>
<p><em>Payment Gating, High-Risk Transaction Escalation &amp; Wire Transfer Verification</em></p></td>
</tr>
</tbody>
</table>

|                     |                                                     |
|---------------------|-----------------------------------------------------|
| **Field**           | **Value**                                           |
| **Document ID**     | 04D-04_IMP_Financial_Services_Integration_v1        |
| **Status**          | Canonical — v1.0                                    |
| **Patent Coverage** | Pro-N (Payment Gate) · Pro-O (Financial Escalation) |
| **Author**          | Agile On Target LLC                                 |
| **Date**            | March 2026                                          |

**1. Purpose**

This specification defines how Relying Parties in financial services integrate HPP to gate payment authorization, high-risk transaction escalation, and wire transfer verification on cryptographically verified human presence. HPP replaces probabilistic fraud scoring with deterministic presence proof: either a biometrically verified human approved the transaction, or the transaction does not proceed.

Unlike behavioral analytics or device fingerprinting, HPP provides a non-parallelizable biological cost floor (H-Constant) that makes automated fraud economically unviable regardless of the attacker's computational resources.

**2. Applicable Standards & Regulations**

- PSD2 Strong Customer Authentication (SCA) — EU Payment Services Directive

- FIDO2/WebAuthn Level 2 — W3C/FIDO Alliance

- ISO 27001 / SOC 2 Type II — Information security management

- PCI DSS v4.0 — Payment Card Industry Data Security Standard

- FinCEN / BSA — Bank Secrecy Act (US wire transfer reporting)

- FCA Consumer Duty — UK Financial Conduct Authority

**3. Architecture**

**3.1 Payment Verification Flow**

The payment flow adds HPP presence verification between the merchant checkout and payment processor authorization:

1.  Customer initiates payment at merchant checkout (cart → pay).

2.  Merchant backend requests HPP challenge from Attestation Server with transaction_amount and merchant_id bound to the nonce.

3.  HPP client prompts biometric verification on customer device (UV required per INV-1).

4.  Attestation Server issues Presence Certificate with transaction binding.

5.  Certificate delivered to merchant callback (INV-5: never exposed to page JS).

6.  Merchant backend verifies certificate (7-step verification) and forwards payment_authorization_token to processor.

7.  Payment processor accepts token as device-authenticated human approval.

**3.2 Transaction Binding**

Every payment Presence Certificate includes a transaction_binding field computed as SHA-256(device_id \|\| amount \|\| merchant_id \|\| currency \|\| nonce). This cryptographically ties the biometric attestation to the specific transaction, preventing certificate replay across different purchases.

**4. Risk-Based Escalation Tiers**

HPP implements a four-tier escalation model based on composite risk scoring. Each tier adds additional verification requirements proportional to risk:

|  |  |  |  |
|----|----|----|----|
| **Risk Score** | **Tier** | **Requirements** | **Processing Time** |
| 0–25 | Tier 1: Standard | Presence receipt only | Immediate |
| 26–50 | Tier 2: Enhanced | Biometric confirmation required | 30–90 seconds |
| 51–75 | Tier 3: Elevated | Biometric + device attestation + time window (60s) | 90–180 seconds |
| 76–100 | Tier 4: Manual | Underwriter review + full escalation | 15–60 minutes |

**4.1 Risk Scoring Factors**

The composite risk score (0–100) is computed from eight weighted factors:

- Transaction amount: +0 to +30 points (scaled logarithmically)

- Account velocity: transactions/hour, +5 to +25 points

- Novel device enrollment: +20 immediately, decays -1/day as device ages

- Geolocation change: +0.5 per km from last transaction, capped at +25

- Time-of-day anomaly: unusual hour for account pattern, +5 to +15

- Payment method novelty: first use of card/account, +10 to +20

- Cross-border transaction: +10 flat

- High-risk merchant category: +5 to +15 by MCC code

**4.2 Threshold-Based Amount Escalation**

Independent of risk score, transaction amount triggers minimum escalation floors:

- \< \$100: Standard verification (presence receipt + device signature)

- \$100–\$1,000: Biometric confirmation required

- \$1,000–\$10,000: Biometric + device attestation review

- \> \$10,000: Manual underwriter review + full escalation flow

**5. Wire Transfer Verification Protocol**

Wire transfers above the BSA reporting threshold (\$3,000 international / \$10,000 domestic) require enhanced HPP verification:

8.  Initiating bank requests HPP challenge with purpose: "wire_transfer" and amount binding.

9.  Customer completes biometric attestation on enrolled device.

10. Certificate includes wire_transfer_binding: SHA-256(sender_account \|\| recipient_account \|\| amount \|\| routing \|\| nonce).

11. Bank verifies certificate, stores in audit trail for BSA/FinCEN compliance.

12. Beneficiary manipulation attacks fail: changing any wire detail invalidates the binding hash.

**6. API Integration**

**6.1 Payment Challenge Request**

Merchant backend calls the HPP Attestation Server to initiate a payment-bound challenge:

**Endpoint:** POST /v1/challenge

- rp_id: merchant domain (eTLD+1)

- purpose: "payment_verification"

- transaction_binding: SHA-256 hash of transaction details

- escalation_tier: computed risk tier (1–4)

- amount: transaction amount in minor currency units

**6.2 Payment Authorization Token**

Upon successful certificate verification, the merchant backend issues a payment_authorization_token (JWT) to the payment processor:

- cert_id: HPP certificate ID

- transaction_binding: matching hash from challenge

- risk_score: computed composite score

- escalation_tier: tier that was satisfied

- exp: token expiry (15 minutes from issuance)

**7. PSD2 SCA Compliance Mapping**

HPP satisfies all three PSD2 Strong Customer Authentication pillars:

- Knowledge: Not required — HPP does not use passwords or PINs

- Possession: Device-bound credential in TEE/Secure Enclave (something the user has)

- Inherence: Biometric verification with UV flag enforcement (something the user is)

HPP provides two of three SCA factors (possession + inherence) in a single interaction, satisfying PSD2 Article 97 requirements without passwords or SMS OTP.

**8. Audit Trail & Compliance**

Every escalation event generates an immutable audit record:

- challenge_id, risk_score, all 8 risk factor values

- Device state: enrollment age, attestation status, sign count

- All challenge responses and biometric confirmation timestamps

- Final authorization or decline reason

- Verifier-signed timestamp (server-authoritative, NTP-synchronized)

Audit records are retained per institution policy (minimum 5 years for BSA compliance) and are independently verifiable via the certificate's hpp_server_sig.

**9. Security Invariants Enforced**

- INV-1: UV (User Verified) flag required on every financial attestation

- INV-2: UV double-check — authenticator_data bit 2 independently verified

- INV-3: Server signature verified against HPP Attestation Server public key

- INV-5: Certificate never exposed to page JavaScript (prevents XSS exfiltration)

- INV-7: Nonce single-use — prevents transaction replay

- H-Constant: Minimum wall-clock cost per attestation makes automated fraud economically unviable

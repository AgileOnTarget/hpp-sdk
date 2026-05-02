HUMAN PRESENCE PROTOCOL

**HPP over SMTP – Human Presence Gated Email Submission**

|  |  |
|----|----|
| **Document ID:** | 04‑03_IMP_hpp_over_smtp_email_gating_v1.0 |
| **Version:** | 1.0 |
| **Status:** | Canonical |
| **Classification:** | Implementation Guide / Email Infrastructure Integration |

**Normative Language**

This document uses RFC 2119 key words to indicate requirement levels. The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119. These terms appear in uppercase throughout this specification when used in their normative sense.

**Versioning**

This specification follows semantic versioning for the HPP‑over‑SMTP integration surface:

- Backward‑compatible additions are allowed within v1.x releases.

- Breaking changes to header format, EHLO capability, or MAIL FROM parameter semantics require a v2.0 release.

- Deprecated fields MUST remain supported for at least one major version.

**1. Purpose**

This document defines how the Human Presence Protocol (HPP) integrates with SMTP mail submission infrastructure to cryptographically gate email origination on verified human presence. It specifies a standards‑compatible mechanism whereby a Mail Submission Agent (MSA) requires a valid HPP verifier‑signed receipt before accepting message submission, and carries that receipt as a message header for downstream consumption.

The goal is to enable email ecosystems to distinguish human‑authored messages from automated or synthetic traffic without introducing new SMTP verbs, without storing biometric data, and without breaking existing MTA‑to‑MTA interoperability.

**2. Audience**

- Email infrastructure architects

- Mail server and MSA developers

- Relying‑party integration teams

- Security and anti‑abuse engineers

This specification applies HPP as a trust‑gating layer at the Mail Submission Agent (MSA), producing a verifier‑signed receipt that is carried as a message header and validated by downstream systems.

**3. Design Principles**

- No new SMTP verbs

- No modification to message body

- No biometric data leaves the device

- All trust derived from verifier‑signed receipts

- Works with existing SMTP and submission flows

- Enforcement occurs at submission, not relay

HPP functions as an API‑mediated human verification layer parallel to SMTP, not a replacement for SMTP.

**4. Capability Advertisement**

During EHLO, the MSA advertises support:

> EHLO example.com
>
> 250-XHPP

XHPP indicates the server supports HPP‑gated submission.

**5. Submission Parameter**

The MAIL FROM command MAY include a short receipt reference:

> MAIL FROM:user@example.com XHPP=\<short_receipt_hash\>

The short hash is an index only. It is not sufficient by itself for validation.

**6. Message Header**

The full verifier‑signed receipt is placed in a message header during DATA:

> X-HPP-Receipt: \<base64url encoded verifier-signed receipt\>

**6.1 Header Grammar**

> X-HPP-Receipt = base64url(verifier_signed_receipt_bytes)

The header value MUST be a single base64url‑encoded string with no line folding. Receivers MUST decode the value and parse the receipt structure to extract individual fields.

This header contains the following fields:

| **Field**                | **Description**                               |
|--------------------------|-----------------------------------------------|
| receipt_id               | Unique identifier for this receipt            |
| verifier_base_url        | URL of the issuing HPP verifier               |
| site_origin / msa_origin | Bound origin for this receipt                 |
| continuity_score         | Sender’s current human continuity score       |
| tier                     | Trust tier derived from continuity score      |
| issued_at                | Unix timestamp of receipt issuance (seconds)  |
| expires_at               | Unix timestamp of receipt expiry (see §6.2)   |
| strict_window_seconds    | Maximum validity window in seconds (see §6.2) |
| signature                | Verifier Ed25519 signature over receipt hash  |

**6.2 Receipt Expiry Semantics**

The relationship between receipt timestamps is defined as:

> expires_at = issued_at + strict_window_seconds

The strict_window_seconds field is the canonical TTL. The expires_at field is a convenience value derived from it. Validators MUST verify that the current server time is less than expires_at. If both fields are present and inconsistent, the receipt MUST be rejected.

**6.3 Receipt Canonicalization**

Receipt signature verification follows the canonicalization rules defined in 04‑04_TEST_VECTORS.json. All canonical strings use UTF‑8, LF newlines, fixed field order, and include a final newline. Signatures are computed over the SHA‑256 digest of the canonical string bytes, not over the raw string.

The header is opaque to SMTP. It is consumed only by HPP‑aware systems.

**7. Submission Flow**

> **Step 1** Mail client (MUA) connects to MSA.
>
> **Step 2** Client issues MAIL FROM.
>
> **Step 3** If no valid HPP receipt is present, MSA responds:
>
> 451 4.7.1 HPP_REQUIRED Human Presence Required
>
> **Step 4** MUA invokes OS‑level biometric prompt.
>
> **Step 5** Device performs HPP Pulse and Burn locally.
>
> **Step 6** Device submits burn to HPP Verifier.
>
> **Step 7** Verifier returns signed receipt.
>
> **Step 8** MUA resubmits MAIL FROM with XHPP parameter and includes X‑HPP‑Receipt header.
>
> **Step 9** MSA validates receipt signature and TTL.
>
> **Step 10** If valid, message is accepted and processed normally.
>
> **Result:** The email enters the mail ecosystem already stamped with a verifier‑signed human presence receipt.

**7.1 Sequence Diagram**

> MUA MSA Verifier
>
> \|--- MAIL FROM --\>\| \|
>
> \|\<-- 451 HPP_REQ -\| \|
>
> \| \| \|
>
> \|--- biometric ---\| \|
>
> \|--- burn --------\|-----------------\>\|
>
> \|\<-- receipt ------\|-----------------\|
>
> \| \| \|
>
> \|--- MAIL FROM --\>\| \|
>
> \| + X-HPP-Rcpt \| \|
>
> \|\<-- 250 OK ------\| \|

**8. Submission Error Codes**

MSAs MUST use the following enhanced status codes for HPP‑related submission failures:

| **Code** | **Keyword** | **Meaning** |
|----|----|----|
| 451 4.7.1 | HPP_REQUIRED | No HPP receipt presented; human presence required |
| 451 4.7.2 | HPP_INVALID_RECEIPT | Receipt signature verification failed |
| 451 4.7.3 | HPP_EXPIRED | Receipt TTL exceeded (current time ≥ expires_at) |
| 451 4.7.4 | HPP_TIER_TOO_LOW | Sender continuity tier below MSA policy threshold |
| 451 4.7.5 | HPP_REPLAY | Receipt ID already consumed within TTL window |
| 451 4.7.6 | HPP_VERIFIER_UNAVAIL | Verifier unreachable; temporary failure (see §8.1) |

All HPP error codes use the 451 temporary failure class. MSAs MUST NOT issue permanent 5xx rejections for HPP failures, as the client can retry after obtaining a fresh receipt.

**8.1 Replay Protection**

MSAs MUST reject any receipt whose receipt_id has been previously accepted within the receipt’s TTL window (strict_window_seconds). Implementations SHOULD maintain a receipt_id replay cache keyed by receipt_id with entries expiring at expires_at. After TTL expiry, replay entries MAY be evicted.

**8.2 Verifier Unavailability**

If the HPP verifier is unreachable at the time of receipt validation, the MSA MUST respond with a temporary 451 4.7.6 HPP_VERIFIER_UNAVAIL error. The MSA MUST NOT issue a permanent rejection. Clients SHOULD retry after a reasonable backoff interval.

**9. Relay Behavior**

MTA‑to‑MTA relays do not perform HPP challenges.

They MAY optionally validate receipts for local policy decisions (spam scoring, throttling, priority routing), but MUST NOT require HPP for relay acceptance.

This preserves SMTP compatibility.

**10. Validation Logic (MSA or Optional MTA)**

- Verify signature against verifier public key

- Verify receipt not expired (current server time \< expires_at)

- Verify continuity tier meets local policy

- Verify receipt bound to msa_origin

- Verify receipt_id not replayed within TTL window

No biometric material is processed.

**11. Trust Tiers for Email**

| **Tier** | **Score Range** | **Description** | **Policy Guidance** |
|----|----|----|----|
| Newborn | 0–9 | Human‑authored, low friction mail | Basic gating; new sender warm‑up |
| Verified | 10–49 | Human with multi‑day continuity | Standard throughput; reduced spam scoring |
| Citizen | 50–199 | High‑trust sender | Reduced throttling; priority routing |
| Foundational | 200+ | Enterprise or governance mail | Maximum throughput; institutional trust |

Relying parties choose policy thresholds. Score ranges are inclusive lower bounds.

**12. Verifier Discovery**

MUAs and MSAs discover HPP verifiers through one of the following methods:

- Well‑known endpoint: The verifier publishes keys and metadata at /.well‑known/hpp‑verifier on its base URL.

- Static enterprise configuration: The MSA operator configures a trusted verifier_base_url and pre‑loads the verifier’s public signing keys.

- DNS record: A TXT record at \_hpp.\<domain\> contains the verifier_base_url. Example: \_hpp.example.com TXT "v=hpp1; url=https://hpp.example.com"

Implementations MUST support static configuration. Support for well‑known endpoint and DNS discovery is RECOMMENDED.

**13. Operational Deployment Modes**

| **Mode** | **Description** |
|----|----|
| Consumer ISP | MSA gates outbound mail for consumer accounts. Receipt validation at submission. Transparent to downstream MTAs. |
| Enterprise Mail Gateway | Corporate mail gateway requires HPP receipt before accepting internal‑to‑external submission. Policy thresholds set by enterprise security team. |
| SaaS Mail Provider | Platform‑level integration where the SaaS provider’s MSA validates HPP receipts on behalf of tenant domains. Supports multi‑tenant verifier configuration. |

All deployment modes use the same protocol surface. Differences are limited to policy configuration and verifier discovery method.

**14. Privacy Posture**

- No biometric templates transmitted

- No device identifiers transmitted

- Receipts contain only cryptographic assertions

- Server cannot reconstruct biometric data

**15. Threat Resistance**

- Botnets cannot generate receipts

- Mule farms incur real human time cost

- Replay prevented by TTL, binding, and receipt_id cache

- Identity cloning prevented by device‑bound keys

HPP converts spam from a computational problem into an economic problem.

**16. Economic Reality**

HPP is not a perfect spam eliminator.

It is an economic lever. By requiring a real human action per submission, cost per message increases from near‑zero to human labor cost, collapsing large‑scale spam profitability.

**17. Relationship to Primitives**

| **Primitive** | **Name**                                           |
|---------------|----------------------------------------------------|
| P‑001         | Time‑Anchored Hardware‑Bound Biometric Attestation |
| P‑004         | Human Continuity Score                             |
| P‑007         | Server‑Time‑Authoritative Daily Boundary           |
| P‑008         | Human Continuity Trust Bridging                    |
| P‑009         | API‑Mediated Human Verification Layer              |
| P‑010         | Non‑Transferable Human Time Credits                |
| P‑014         | Anti‑Sybil Presence Accumulation Mechanism         |

**18. Patent Figure Guidance (Textual)**

***Figure A – Atomic Biometric Gate***

> Application requests signature.
>
> Secure enclave releases signature only after biometric success.
>
> Private key never leaves enclave.

***Figure B – Server Time Boundary***

> Server accepts only one burn per device per window.

***Figure C – Atomic Migration***

> Device A revoked.
>
> Device B activated.
>
> Continuity resets.

These figures demonstrate hardware‑to‑server dependency and non‑software‑only enforcement.

**19. Strategic Positioning**

HPP over SMTP does not replace SPF, DKIM, or DMARC.

It adds a new dimension: Did a human live this email.

This creates a universal human signal usable by inbox providers, enterprises, and platforms without central biometric databases.

*End of Document*

HUMAN PRESENCE PROTOCOL

**HPP Website Integration Guide**

|                     |                                            |
|---------------------|--------------------------------------------|
| **Document ID:**    | 04‑06_IMP_HPP_Website_Integration_Guide_v1 |
| **Version:**        | 1.1                                        |
| **Status:**         | Canonical                                  |
| **Scope:**          | MVP                                        |
| **Classification:** | Implementation Guide / Website Integration |
| **Date:**           | February 2026                              |

**Normative Language**

This document uses RFC 2119 key words to indicate requirement levels. The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119. These terms appear in uppercase throughout this specification when used in their normative sense.

**Versioning**

This specification follows semantic versioning for the HPP website integration surface. Backward‑compatible additions are allowed within v1.x releases. Breaking changes to the verification endpoint, QR payload schema, or receipt handling semantics require a v2.0 release.

**1. Purpose**

This document provides step‑by‑step technical guidance for integrating a website with the HPP Verifier to gate content access using Human Presence receipts.

This guide assumes no identity, no accounts, and no persistent user sessions. The integration relies solely on cryptographic receipts issued by the HPP Verifier in response to a biometric attestation performed on the user’s device.

**2. Architecture**

The integration follows a three‑tier model:

> Website Frontend → Website Backend → HPP Verifier

| **Component** | **Responsibility** |
|----|----|
| Website Frontend | Renders QR payload, polls backend for receipt status, unlocks content on success |
| Website Backend | Generates session ID, receives receipt from iOS app, pre‑validates, forwards to HPP Verifier, returns result |
| HPP Verifier | Validates receipt signature, enforces TTL, confirms continuity tier, returns pass/fail |

**3. Prerequisites**

- Backend service capable of HTTPS (TLS required for all HPP communication)

- Access to HPP Verifier base URL (environment‑specific; see Section 11)

- Environment configuration per 03‑12_TEC_Environment_Configuration_Matrix

- No user accounts, authentication tokens, or session cookies required

**4. Integration Flow**

The integration proceeds through seven sequential steps. Each step must complete before the next begins.

**Step 1 – Generate Session ID**

The backend generates a cryptographically random UUID (v4) to serve as the session identifier for this verification request. This ID is ephemeral and must not be persisted after the verification completes.

> const session_id = crypto.randomUUID();

**Step 2 – Render QR Payload**

The frontend renders a QR code containing a JSON payload that the iOS HPP app will scan:

> {
>
> "verifier_url": "https://verifier.hpp.example",
>
> "session_id": "\<uuid\>",
>
> "required_credits": 1
>
> }

The QR encodes the verifier URL, the session ID, and the number of credits required to unlock the content. The iOS app reads this payload, performs the biometric attestation, and submits the resulting receipt to the backend.

The QR code SHOULD expire after 120 seconds and require regeneration. Expired QR payloads MUST NOT be accepted by the backend.

**Step 3 – Receive Receipt**

The iOS app performs the HPP Pulse and Burn sequence locally, obtains a verifier‑signed receipt, and submits it to the website backend via HTTPS POST, keyed to the session_id from the QR payload.

**Step 4 – Pre‑Validate**

Before forwarding to the HPP Verifier, the backend performs lightweight pre‑validation:

- Session ID format: must be a valid UUID v4

- Timestamp present: receipt must contain an issued_at field

- Timestamp recency: issued_at must be within 5 minutes of current server time

- TTL present: receipt MUST contain strict_window_seconds or expires_at (or both)

- TTL validity: reject if current server time ≥ expires_at

If any check fails, the backend rejects immediately with HTTP 400 without contacting the verifier.

**Step 5 – Verify with HPP Verifier**

The backend forwards the receipt to the HPP Verifier for cryptographic validation:

> POST /receipt/verify HTTP/1.1
>
> Host: verifier.hpp.example
>
> Content-Type: application/json
>
> HPP-Version: 1.0
>
> {
>
> "receipt": "\<base64url_encoded_receipt\>",
>
> "session_id": "\<uuid\>"
>
> }

The verifier validates the receipt signature against its public key, confirms the receipt has not expired, and returns a structured response indicating pass or fail.

**Verifier Response Schema:**

> {
>
> "valid": boolean,
>
> "tier": number,
>
> "receipt_id": string,
>
> "expires_at": number
>
> }

Receipt signature verification follows the canonicalization rules defined in 04‑04_TEST_VECTORS.json. All canonical strings use UTF‑8, LF newlines, fixed field order, and include a final newline.

**Step 6 – Polling Behavior**

If the receipt has not yet been submitted by the iOS app, the frontend polls the backend at a fixed interval:

- Backend returns HTTP 404 or JSON status: "PENDING" if no receipt has arrived

- Frontend polls every 2 seconds

- Polling stops on receipt of a definitive result (valid or rejected)

- Frontend should implement a timeout (recommended: 120 seconds) and display an expiry message

**Step 7 – Unlock Content**

If the verifier returns a valid response, the backend signals the frontend to unlock the gated content. No user token is issued. No session is created. The unlock is a one‑time event tied to the ephemeral session ID.

> **Principle:** Every content unlock traces back to a verifier‑signed receipt anchored to a real biometric attestation. No shortcuts exist.

**5. Sequence Diagram**

> Frontend Backend iOS App Verifier
>
> \| \| \| \|
>
> 1 \|-- session ------\>\| \| \|
>
> 2 \|-- render QR ----\>\| \| \|
>
> \| \| \| \|
>
> \| \|\<-- scan QR -----\| \|
>
> \| \| \|-- biometric ---\>\|
>
> \| \| \|\<-- receipt -----\|
>
> 3 \| \|\<-- POST receipt-\| \|
>
> \| \| \| \|
>
> 6 \|-- poll ---------\>\| \| \|
>
> 5 \| \|-- POST verify --\|----------------\>\|
>
> \| \|\<-- result ------\|-----------------\|
>
> 7 \|\<-- unlock -------\| \| \|

**6. HTTP Status Codes**

The backend uses the following response codes for the verification endpoint:

| **Code** | **Status** | **Meaning** |
|----|----|----|
| 200 | OK | Receipt verified successfully; content unlocked |
| 400 | Bad Request | Pre‑validation failed (bad session ID, missing timestamp, stale receipt) |
| 404 | Not Found / Pending | No receipt submitted yet for this session; continue polling |
| 422 | Unprocessable | Verifier rejected receipt (invalid signature, expired, tier too low) |
| 502 | Bad Gateway | HPP Verifier unreachable; client should retry |
| 504 | Gateway Timeout | HPP Verifier did not respond within timeout; client should retry |

**7. Replay Protection**

The backend MUST reject any receipt whose receipt_id has been previously accepted within the receipt’s TTL window (strict_window_seconds). Implementations SHOULD maintain a receipt_id replay cache keyed by receipt_id with entries expiring at expires_at. After TTL expiry, replay entries MAY be evicted.

If the backend detects a replayed receipt_id, it MUST return HTTP 422 with error code REPLAY_DETECTED. The frontend SHOULD prompt the user to re‑scan the QR code and obtain a fresh receipt.

**Security Considerations**

The following sections address security posture, error handling, and operational resilience for HPP website integrations.

**8. Security Notes**

- TLS required for all communication between frontend, backend, and verifier

- Do not store receipts after verification completes; receipts are single‑use

- Do not persist session IDs; they are ephemeral per‑request identifiers

- Rate‑limit the verification endpoint to prevent polling abuse (recommended: 30 requests/minute per IP)

- Do not log receipt contents; receipts contain cryptographic assertions, not PII, but logging is unnecessary

- Do not expose the verifier base URL to the frontend; all verifier communication goes through the backend

- Validate Content‑Type headers on all incoming requests

- Enforce CORS policy: only allow requests from your own domain origin

- Backend SHOULD pin verifier public keys or cache them via a trusted registry to prevent key substitution attacks

**9. Error Handling**

| **Condition** | **Behavior** |
|----|----|
| Verifier unreachable | Return 502; frontend displays “Verification temporarily unavailable”; retry after backoff |
| Verifier timeout | Return 504; frontend retries automatically |
| Receipt signature invalid | Return 422; frontend displays “Verification failed”; user may retry with fresh receipt |
| Receipt expired | Return 422; frontend prompts user to re‑scan QR |
| Tier too low | Return 422; frontend displays minimum tier requirement |
| Unexpected verifier response | Log error server‑side; return 500; do not expose verifier internals to frontend |

**10. Sample Node.js Implementation**

The following pseudocode demonstrates a minimal integration:

> const express = require("express");
>
> const crypto = require("crypto");
>
> const app = express();
>
> app.use(express.json());
>
> const VERIFIER_URL = process.env.HPP_VERIFIER_URL;
>
> // Step 1: Generate session
>
> app.post("/session", (req, res) =\> {
>
> const session_id = crypto.randomUUID();
>
> res.json({
>
> session_id,
>
> verifier_url: VERIFIER_URL,
>
> required_credits: 1
>
> });
>
> });
>
> // Steps 3-7: Receive and verify receipt
>
> app.post("/verify-receipt", async (req, res) =\> {
>
> const { receipt, session_id } = req.body;
>
> // Step 4: Pre-validate
>
> if (!validUUID(session_id))
>
> return res.status(400).json({ error: "INVALID_SESSION" });
>
> if (!receipt)
>
> return res.status(404).json({ status: "PENDING" });
>
> // Step 5: Verify with HPP Verifier
>
> const result = await fetch(VERIFIER_URL + "/receipt/verify", {
>
> method: "POST",
>
> headers: {
>
> "Content-Type": "application/json",
>
> "HPP-Version": "1.0"
>
> },
>
> body: JSON.stringify({ receipt, session_id })
>
> });
>
> if (!result.ok)
>
> return res.status(422).json({ error: "VERIFICATION_FAILED" });
>
> // Step 7: Return unlock signal
>
> const data = await result.json();
>
> res.json({ status: "UNLOCKED", tier: data.tier });
>
> });

**11. Environment Configuration**

| **Environment** | **Configuration** |
|----|----|
| Development | Use Dev verifier_url; mock receipts permitted; relaxed rate limits |
| Staging | Use Staging verifier_url; real receipts required; production‑equivalent rate limits |
| Production | Use Prod verifier_url; real receipts required; strict rate limits enforced |

Environment switching is performed via configuration (environment variables), not code changes. See 03‑12_TEC_Environment_Configuration_Matrix for authoritative environment URLs.

**12. Relationship to Primitives**

| **Primitive** | **Name**                                           |
|---------------|----------------------------------------------------|
| P‑001         | Time‑Anchored Hardware‑Bound Biometric Attestation |
| P‑004         | Human Continuity Score                             |
| P‑009         | API‑Mediated Human Verification Layer              |
| P‑010         | Non‑Transferable Human Time Credits                |

**13. Acceptance Criteria**

- Valid receipt from HPP Verifier unlocks gated content

- Invalid receipt (bad signature, expired, wrong tier) is rejected with appropriate error code

- Pending state (no receipt yet) returns PENDING or 404; frontend continues polling

- No receipt, session ID, or user data persisted after verification completes

- All communication uses TLS

- Rate limiting active on verification endpoint

- Environment switching works via configuration without code changes

**14. Cross‑References**

- 03‑12_TEC_Environment_Configuration_Matrix — Verifier URLs per environment

- 04‑04_TEST_VECTORS.json — Receipt canonicalization and signature verification

- 04‑05_HPP_VERIFIER_OPENAPI.yaml — Verifier API contract

- 02‑02_Protocol_Invariants — HPP protocol invariants governing receipt validity

*End of Document*

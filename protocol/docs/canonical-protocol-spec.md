# Canonical Protocol Reference — Human Presence Protocol

*Platform-Agnostic Specification (Frozen v2.0)*

---

**1. Abstract**

The Human Presence Protocol (HPP) is a constraint system that cryptographically proves biological human presence at the time of a digital action. It is not a detection system — it does not attempt to distinguish humans from bots through behavioral analysis. Instead, it enforces structural constraints (hardware-bound biometric verification, server-authoritative time gating, single-use challenge binding) that make the cost of producing a valid certificate without a genuine human interaction prohibitively high.

This document is the platform-agnostic protocol specification. It defines the wire format, message flow, cryptographic requirements, and verification procedures that any conforming implementation must follow — regardless of whether the client is a browser extension, mobile SDK, native OS module, or hardware appliance.

**2. Design Goals**

- Provide cryptographic proof that a human performed a digital action.

- Bind presence verification to hardware-backed platform authenticators (Secure Enclave, TPM 2.0, Android Strongbox).

- Enforce a minimum biological time cost per certificate — the H-Constant — that cannot be parallelized by computational scaling.

- Prevent exposure of full Presence Certificates to untrusted execution contexts (page JavaScript, WebView, etc.).

- Enable simple developer integration: one meta tag, one API call, one server verification function.

- Allow relying party servers to independently verify certificates without contacting the HPP Attestation Server.

- Remain compatible with existing FIDO2/WebAuthn platform authenticators — use WebAuthn as the biometric transport, add enforcement above it.

**3. Protocol Flow**

The HPP protocol consists of six phases executed in strict sequence. Each phase has defined inputs, outputs, and failure modes.

**Phase 1: Site Declaration**

The relying party declares HPP support by including a meta tag in the page HTML:

\<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="My Site"\>

The client detects this tag and activates HPP for the page origin. The data-hpp-callback attribute specifies the endpoint that will receive the full Presence Certificate. The data-hpp-site-name attribute is displayed in the verification prompt.

**Phase 2: Challenge Issuance**

The client requests a signed challenge from the HPP Attestation Server: GET /v1/challenge?rp_id={eTLD+1}&purpose=attest

The server returns a ChallengeResponse containing: nonce (32 bytes, base64url, single-use), rp_id, server_timestamp (Unix ms, authoritative), window_ms (H-Constant enforcement period), purpose, server_sig (ECDSA P-256 over canonical payload).

The client MUST verify server_sig against the pinned server public key and check freshness (server_timestamp within max_clock_skew_ms of local time) before proceeding.

**Phase 3: Biometric Verification**

The client invokes the platform authenticator via WebAuthn navigator.credentials.get() with: challenge set to the decoded nonce, rpId set to the challenge rp_id, userVerification set to 'required' (INV-1), and timeout set to window_ms.

The user completes a biometric gesture (Touch ID, Face ID, Windows Hello, fingerprint). The authenticator produces a signed assertion bound to the challenge nonce, with the UV flag set in authenticatorData.

**Phase 4: Attestation Submission**

The client submits the assertion to the HPP Attestation Server: POST /v1/attest

The AttestRequest contains: cert_id (UUID v4, client-generated), nonce, rp_id, server_timestamp, client_timestamp, credential_id, authenticator_data, assertion_sig, client_data_json.

The server validates the nonce (single-use), verifies the assertion signature against the enrolled public key, checks the UV flag, and verifies submission timing against window_ms.

**Phase 5: Certificate Issuance**

If validation passes, the server constructs a Presence Certificate by combining the attestation payload with expiry_ms, status ('issued'), and hpp_server_sig (ECDSA P-256 countersignature over the canonical payload with keys in alphabetical order).

The server returns: cert_id, hpp_server_sig, expiry_ms, status. The client verifies hpp_server_sig before proceeding (INV-3).

**Phase 6: Certificate Delivery**

The client delivers the full Presence Certificate to the relying party backend via the callbackUrl declared in the meta tag. The callback MUST be same-origin and HTTPS (INV-6). Page JavaScript receives only cert_id and session metadata (INV-5).

The relying party server executes the 7-step verification procedure defined in the Presence Certificate Schema before granting access.

**4. Canonical Schemas**

All message formats are defined as JSON Schema files included in this SDK:

- hpp-challenge-schema.json — Challenge response format

- hpp-attest-request-schema.json — Attestation request format

- hpp-presence-certificate-schema.json — Certificate format with verification procedure

- hpp-error-codes.json — Complete error code registry

- hpp-openapi.yaml — OpenAPI 3.0 specification for all server endpoints

**5. Cryptographic Requirements**

**Signing Algorithm**

All signatures use ECDSA with the P-256 curve (secp256r1) and SHA-256 hash. This applies to: server_sig on challenges, hpp_server_sig on certificates, and assertion_sig from the WebAuthn authenticator.

**Canonical Payload Construction**

When verifying hpp_server_sig, the canonical payload is constructed by: (1) selecting only the signed fields from the certificate, (2) sorting keys alphabetically, (3) serializing with JSON.stringify using no whitespace (no spaces, no newlines), (4) UTF-8 encoding the result.

Signed fields (in order): assertion_sig, authenticator_data, cert_id, client_data_json, client_timestamp, credential_id, expiry_ms, nonce, rp_id, server_timestamp.

**Key Management**

The HPP Attestation Server public key MUST be pinned in the client implementation. Key rotation follows a published schedule. The server private key MUST be stored in an HSM or equivalent secure key storage.

**6. H-Constant and NPHT**

The H-Constant (H) is the minimum wall-clock time required to complete one genuine biometric interaction on a compliant platform authenticator. The server enforces this through window_ms: window_ms \>= H_min, where H_min is derived from platform authenticator benchmarks (TPM 2.0 floor: ~800ms; Secure Enclave floor: ~600ms).

Non-Parallelizable Human Time (NPHT): Unlike computational proofs of work, biological time cannot be parallelized. For any adversary with m computing devices and b biological agents, the maximum rate of valid certificate production is bounded by b/H certificates per second, independent of m. This is the fundamental property that distinguishes HPP from all computational proof systems.

**7. Server Endpoints**

The HPP Attestation Server exposes five endpoints, fully specified in hpp-openapi.yaml:

|                       |            |                                       |
|-----------------------|------------|---------------------------------------|
| **Endpoint**          | **Method** | **Purpose**                           |
| GET /v1/challenge     | GET        | Issue a signed verification challenge |
| POST /v1/attest       | POST       | Submit assertion, receive certificate |
| POST /v1/enroll       | POST       | Register a new device credential      |
| DELETE /v1/credential | DELETE     | Revoke an enrolled credential         |
| GET /v1/config        | GET        | Retrieve server configuration         |

**8. Verification Libraries**

Reference verification implementations are provided in this SDK:

- hpp-verify.js — Node.js reference implementation with Express middleware

- hpp_verify.py — Python reference implementation with Flask decorator

Both implement the 7-step verification procedure defined in the Presence Certificate Schema. Relying parties may implement verification in any language using the canonical signing payload specification.

**9. Security Invariants**

All conforming implementations MUST enforce INV-1 through INV-8 as defined in the Security Invariants Reference (OSI8_04A_27_SEC_Security_Invariants_Reference_v1_0.docx). See that document for the formal definition, rationale, and conformance tests for each invariant.

**10. Versioning**

This is protocol version 1.0. The version is not currently encoded in the wire format. Future versions will include a protocol version field in the challenge response and certificate. Backward compatibility will be maintained where possible through version negotiation.

*Human Presence Protocol \| Canonical Protocol Reference \| Agile On Target LLC \| April 2026 \| v2.0*

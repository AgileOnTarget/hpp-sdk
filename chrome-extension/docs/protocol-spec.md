# 1. Purpose

The Human Presence Protocol defines a standardized method for proving that a real human was present at the time a digital action occurred.

The protocol combines biometric verification, hardware bound authentication, and server signed presence certificates to provide cryptographic proof of human participation.

The goal of the protocol is to replace passwords, CAPTCHA systems, and heuristic bot detection with a verifiable human presence primitive.

# 2. Design Goals

Provide cryptographic proof that a human performed a digital action.

Bind presence verification to hardware backed authenticators.

Prevent exposure of full presence certificates to page level JavaScript.

Enable simple developer integration through a minimal SDK interface.

Allow relying party servers to independently verify presence certificates.

Remain compatible with existing WebAuthn platform authenticators.

Enforce a minimum time cost per certificate that is bounded below by the biological sequentiality of human biometric interaction (the H-Constant constraint).

# 3. System Components

Browser Verifier Extension responsible for biometric verification and certificate delivery.

Website Integration Library allowing applications to request presence verification.

Verifier Server responsible for issuing challenges and signing certificates.

Relying Party Server responsible for verifying presence certificates.

# 4. High Level Protocol Flow

1\. A website requests human presence verification.

2\. The browser extension requests a challenge from the verifier server.

3\. The user performs biometric verification using a WebAuthn platform authenticator.

4\. The authenticator produces a signed assertion bound to the challenge.

5\. The verifier server validates the assertion and issues a signed presence certificate.

6\. The certificate is delivered to the relying party backend via a secure callback.

7\. The relying party verifies the certificate and authorizes the requested action.

# 5. Challenge Issuance

The verifier server issues a challenge to initiate presence verification.

The challenge must contain a unique challenge identifier.

The challenge must include a timestamp and expiration value.

The challenge must be signed by the verifier server.

The window_ms field is not an arbitrary timeout. It is the server-enforced minimum biological cost window derived from the H-Constant constraint: the minimum wall-clock time required to complete one genuine biometric interaction on a compliant platform authenticator. The server sets window_ms \>= H_min, where H_min is derived from platform authenticator benchmarks (TPM 2.0 and Secure Enclave minimum latency floors). Unlike computational proofs of work, this biological time cost cannot be parallelized — a farm of 1,000 machines cannot produce 1,000 certificates per genuine human second.

# Challenge Fields

nonce – base64url, 32 bytes, single-use challenge identifier

rp_id

server_timestamp

window_ms

server_sig

# 6. Biometric Verification

The browser extension performs biometric verification using WebAuthn.

The authenticator must require user verification.

The authenticator must produce an assertion bound to the challenge.

# WebAuthn Requirements

User verification must be required.

Platform authenticators are recommended.

Assertions must include authenticator data and a signature.

# 7. Attestation Submission

After biometric verification the extension submits the assertion to the verifier server.

The verifier server validates the assertion and challenge binding.

# Attestation Payload Fields

challenge_id

credential_id

authenticator_data

client_data_json

assertion_sig

client_data_json

cert_id

nonce

rp_id

server_timestamp

client_timestamp

# 8. Presence Certificate Issuance

If the assertion is valid the verifier server issues a presence certificate.

The certificate represents proof that a human completed verification.

# Presence Certificate Fields

cert_id

rp_id

credential_id

authenticator_data

assertion_sig

challenge_id

server_timestamp

expiry_ms

status

hpp_server_sig

# 9. Certificate Delivery

The full certificate must be delivered directly to the relying party backend.

The browser page receives only a certificate identifier and session summary.

This prevents token theft through page script compromise.

# 10. Server Side Verification

The relying party server verifies the certificate before authorizing the action.

# Verification Steps

Verify the verifier server signature.

Verify the relying party identifier matches the expected origin.

Verify the certificate has not expired.

Verify the certificate status is valid.

Verify the challenge identifier has not been replayed.

# 11. Session Model

After successful verification the extension maintains a local session.

Subsequent presence checks may reuse the session until expiry.

The relying party server may enforce its own session policies.

# 12. Security Properties

Human presence is verified through biometric interaction.

Assertions are bound to hardware backed authenticators.

Certificates are signed by a trusted verifier server.

Certificates are not exposed to page JavaScript.

Replay attacks are mitigated through challenge identifiers and expiry.

# 13. Deployment Model

The verifier server may be operated by a platform provider.

Relying party servers verify certificates independently.

Browser extensions provide a deployable client until native browser support is available.

# 14. Versioning

The protocol version must be included in future certificate formats.

Backward compatibility should be maintained where possible.

# 15. Future Extensions

Support for native browser integration.

Support for mobile platform authenticators.

Expanded certificate claims for specialized verification scenarios.

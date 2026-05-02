# 1 Purpose

This document provides a detailed end-to-end walkthrough of the Human Presence Protocol verification flow.

It traces every step in the protocol from the moment a website requests human presence verification through certificate issuance and server validation.

# 2 Actors in the System

User interacting with the application.

Web application requesting human presence verification.

Browser extension performing verification.

Verifier server issuing challenges and signing certificates.

Relying party backend validating the certificate.

# 3 Initial State

The user navigates to a website that requires proof of human presence.

The page includes the HPP integration SDK and site declaration metadata.

The browser extension detects that the site supports HPP.

# 4 Step 1 – Presence Request

The web application calls the SDK function requestPresence().

The SDK dispatches a request event to the browser extension.

The extension begins the verification process.

# 5 Step 2 – Challenge Request

The extension sends a request to the verifier server challenge endpoint.

The verifier server generates a unique challenge.

The server signs the challenge payload and returns it to the extension.

# 6 Step 3 – Biometric Verification

The extension invokes the platform authenticator using WebAuthn.

The user performs biometric verification such as fingerprint or face recognition.

The authenticator produces a signed assertion bound to the challenge.

# 7 Step 4 – Attestation Submission

The extension sends the signed assertion and nonce to the verifier server.

The verifier server validates the assertion against the authenticator public key.

# 8 Step 5 – Presence Certificate Creation

After successful validation the verifier server constructs a presence certificate.

The certificate includes identifiers, timestamps, and verification data.

The certificate is signed using the verifier server signing key.

# 9 Step 6 – Certificate Delivery

The full presence certificate is delivered directly to the relying party backend via a configured callback endpoint.

The browser page receives only a confirmation event and certificate identifier.

# 10 Step 7 – Server Verification

The relying party server receives the certificate payload.

The server verifies the signature of the verifier server.

The server checks the certificate expiration and status.

The server validates the nonce to prevent replay.

# 11 Step 8 – Authorization

If the certificate passes verification the relying party authorizes the requested action.

The application proceeds with the protected operation.

# 12 Session Establishment

The extension stores a short lived session derived from the certificate.

Subsequent verification requests may reuse the session until expiration.

# 13 Error Handling

If verification fails the extension emits an error event.

The web application can handle the error and request retry.

# 14 Security Observations

Full certificates are not exposed to page level JavaScript.

Verification relies on hardware bound authenticators.

Replay attacks are mitigated through unique nonces.

# 15 Example Message Trace

Client → Verifier: POST /challenge

Verifier → Client: Signed challenge

Client → Authenticator: WebAuthn request

Authenticator → Client: Signed assertion

Client → Verifier: POST /attest

Verifier → Client: Signed presence certificate

Verifier → Relying Party: Certificate callback

Note: The extension verifies hpp_server_sig (ECDSA P-256 countersignature from the HPP Attestation Server) before issuing a local session. The relying party must independently verify hpp_server_sig against the pinned HPP Attestation Server public key before granting access.

Relying Party → Application: Verification success

# 16 Summary

This walkthrough demonstrates how the Human Presence Protocol provides verifiable proof of human interaction while isolating sensitive verification artifacts from page level scripts.

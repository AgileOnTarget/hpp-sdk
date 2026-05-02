# 1. Purpose

This document provides a practical guide for running the Human Presence Protocol reference implementation and demonstrating the full presence verification flow.

It is intended for developers, security engineers, and platform reviewers who want to see HPP operate end to end.

# 2. Demo Architecture Overview

The demo environment includes four primary components.

A browser extension acting as the verifier client.

A reference verifier server issuing challenges and signing certificates.

A demonstration website requesting presence verification.

A relying party backend verifying presence certificates.

# 3. Required Components

HPP Browser Verifier Extension.

HPP Web SDK or page integration script.

Reference Verifier Server.

Demo Website.

Relying Party Verification Library.

# 4. Environment Requirements

Modern Chromium based browser.

Node.js runtime for the reference verifier server.

HTTPS enabled local development environment.

Developer mode enabled in the browser for extension loading.

# 5. Installing the Browser Extension

Open the browser extensions page.

Enable developer mode.

Click 'Load Unpacked'.

Select the HPP browser extension directory.

Confirm the extension icon appears in the toolbar.

# 6. Running the Reference Verifier Server

Navigate to the reference verifier server directory.

Install dependencies using the package manager.

Start the server using the provided start script.

Confirm that the challenge endpoint is reachable.

**Verifier Server API Reference**

GET /v1/challenge?rp_id={rp_id}&purpose={attest\|enrollment} — Returns a signed challenge containing: nonce (base64url, 32 bytes, single-use), rp_id, server_timestamp (Unix ms), window_ms (NPHT enforcement window in ms), purpose, server_sig (ECDSA P-256 over challenge payload). The extension verifies server_sig and challenge freshness before use.

POST /v1/attest — Accepts: cert_id, nonce, rp_id, server_timestamp, client_timestamp, credential_id, authenticator_data, assertion_sig, client_data_json. Returns: cert_id, hpp_server_sig (ECDSA P-256 countersignature), expiry_ms, status. Error codes: 401 NONCE_ALREADY_USED, 401 CREDENTIAL_REVOKED, 408 CHALLENGE_EXPIRED.

DELETE /v1/credential — Accepts: credential_id, rp_id. Revokes an enrolled credential. Returns: 200 OK on success.

POST /v1/enroll — Accepts: rp_id, credential_id, public_key_cbor, attestation_object, client_data_json, enrollment_nonce. Returns: status ('enrolled' on success).

GET /v1/config — Returns server configuration including max_clock_skew_ms and supported features.

Required configuration: signing key path (ECDSA P-256 private key), certificate lifetime (default 3600000ms), allowed rp_id list, max_clock_skew_ms.

Docker quick start: docker-compose up from the Docker mock client directory. The mock server runs on http://127.0.0.1:9443.

# 7. Demo Website Setup

Add the HPP site declaration meta tags to the page.

Include the HPP SDK script.

Add a button or action that triggers HPP.requestPresence().

# 8. Example HTML Setup

\<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="HPP Demo"\>

# 9. Example Client Integration

\<script src="hpp-api.js"\>\</script\>

await HPP.requestPresence()

const session = await HPP.getSession()

console.log(session)

# 10. Presence Verification Demo Flow

User visits the demo page.

The website requests presence verification.

The extension retrieves a challenge from the verifier server.

The user performs biometric verification.

The extension submits the assertion to the verifier server.

The verifier server issues a presence certificate.

The certificate is delivered to the relying party backend.

# 11. Server Verification Example

The relying party backend receives the certificate payload.

The backend verifies the certificate signature and fields.

If verification succeeds the protected action is allowed.

# 12. Expected Output

The extension icon indicates an active session.

The demo page receives a presence confirmation event.

The server logs show certificate verification success.

# 13. Troubleshooting

Ensure the extension is installed and enabled.

Verify the verifier server is running.

Check browser developer console for errors.

Confirm that HTTPS is used for all endpoints.

# 14. Demonstration Scenarios

Basic presence verification.

Session reuse without repeated biometric prompts.

Certificate verification by the relying party server.

Handling expired sessions.

# 15. Demo Summary

The reference implementation demonstrates that HPP can provide verifiable proof of human presence using existing browser and authentication infrastructure.

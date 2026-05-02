**Human Presence Protocol**

Relying Party Integration Guide

*How to Add HPP Login to Your Site*

Version 1.0 \| March 2026 \| Agile On Target LLC

This guide is for developers adding HPP Browser Login to a web application. It covers everything from server-side setup to the meta tag that signals HPP support, the backend callback endpoint, certificate verification, and the re-attestation pattern for high-value actions.

By the end of this guide you will have a working HPP login flow: a user with the HPP Chrome Extension installed will be able to authenticate to your site using hardware-bound proof of human presence — no password, no CAPTCHA.

*Audience: Backend engineers, frontend engineers, and security architects integrating HPP into a web application.*

**I. Why an Attestation Server Is Required**

The most direct question security engineers ask when reviewing HPP is this: why does the protocol require a dedicated attestation server? Could the relying party verify presence events directly, using standard WebAuthn?

The answer is precise. A standard WebAuthn relying party can verify that a user authenticated with a registered hardware key. What it cannot do is enforce the time-authoritative constraints that make HPP's guarantee hold. Specifically, a standalone relying party cannot:

- Issue challenges stamped with a time that is authoritative by construction — not local-machine time, which is trivially spoofable.

- Enforce a server-controlled validity window (window_ms) that prevents challenges from being warehoused and replayed. Without a central time authority, an adversary can accumulate challenges during off-peak hours and use them later.

- Guarantee consistent enforcement of the Non-Parallelizable Human Time (NPHT) constraint across a large deployment. Relying parties implementing the protocol independently would do so inconsistently — different window sizes, different clock skew tolerances, different UV enforcement rigor — and the economic bound that makes HPP durable would collapse.

The HPP Attestation Server is not an identity provider. It does not know who your users are. It holds no PII, no email addresses, no names. It is a time authority and protocol enforcement service that performs three functions: it issues signed challenges with authoritative timestamps; it validates WebAuthn assertion responses with consistent UV flag enforcement; and it countersigns certificates, giving your backend a single, verifiable proof of compliance with the HPP protocol invariants.

> *Your backend trusts the HPP Attestation Server's countersignature the same way your backend trusts a certificate authority's signature on a TLS certificate. You verify the signature, confirm the certificate is within its validity window, and proceed. You do not need to re-implement the protocol logic.*

This is the design that makes HPP deployable at web scale without requiring every relying party to become a security protocol implementor.

**II. Integration Overview**

Integrating HPP login requires four things on the relying party side:

|  |  |  |
|----|----|----|
| **Step** | **What** | **Description** |
| **1** | Meta tag | Add a single \<meta\> tag to your login page. This signals to the HPP Chrome Extension that your site supports HPP enrollment and authentication. |
| **2** | Callback endpoint | Implement one HTTPS POST endpoint on your backend that receives a Presence Certificate from the HPP extension and exchanges it for a session. This is where your existing session issuance logic lives. |
| **3** | Certificate verification | Verify the Presence Certificate using the HPP Server SDK (or manually, per the verification spec in Section V). This is a local operation — it does not require a network call to the HPP Attestation Server at verification time. |
| **4** | Optional: re-attestation | For high-value actions within an authenticated session, return the hpp-reauth: required response header. The extension will prompt the user for a fresh presence event before the action proceeds. |

> *The HPP Chrome Extension handles all client-side protocol logic. You do not write any client-side JavaScript to implement HPP. Your integration is entirely server-side, with one meta tag on the login page.*

**III. Step 1 — The HPP Meta Tag**

The HPP meta tag is the signal that tells the HPP Chrome Extension that your site supports HPP authentication. When the extension's content script detects this tag on a page, it activates the HPP enrollment and authentication flow.

**3.1 Enrollment Declaration**

Add this tag to the \<head\> of your login page to invite users with the HPP extension to enroll your site:

> \<meta name="hpp-enrollment" content="request"\>

When a user with the HPP extension visits your login page and this tag is present, the extension displays an enrollment prompt. The user completes a one-time biometric enrollment that binds a hardware credential to your site's domain. After enrollment, every subsequent login is presence-verified without a password.

**3.2 Enrollment with Callback Declaration**

To tell the extension where to deliver Presence Certificates after authentication, include the callback URL in the meta tag:

> \<meta name="hpp-enrollment" content="request" data-hpp-callback="https://yourdomain.com/auth/hpp/callback"\>

If you omit data-hpp-callback, the extension will attempt to deliver the certificate to the standard path /auth/hpp/callback on your origin. Specifying it explicitly is recommended.

**3.3 Optional: Site Display Name**

The extension displays your site name in the enrollment prompt and in the user's enrolled sites list. By default it uses your domain. To set a custom display name:

> \<meta name="hpp-enrollment" content="request"
>
> data-hpp-callback="https://yourdomain.com/auth/hpp/callback"
>
> data-hpp-site-name="Acme Corp Login"\>

**3.4 Placement Requirements**

- The meta tag must be in the \<head\> element of your login page.

- The tag must be present on page load — dynamically injected tags are not detected.

- The tag should only appear on pages where HPP authentication is appropriate (login pages, authentication checkpoints). Placing it on every page of your site is not harmful but is unnecessary.

> *The data-hpp-callback URL must be an HTTPS endpoint on the same eTLD+1 as your login page. Callbacks to a different domain will be rejected by the extension's origin binding check.*

**IV. Step 2 — The Callback Endpoint**

The callback endpoint is the single server-side route that receives a Presence Certificate from the HPP extension and issues a session in return. The extension's service worker makes a POST request to this endpoint directly — the certificate does not pass through your frontend JavaScript.

**4.1 Endpoint Specification**

|  |  |
|----|----|
| **Field** | **Value** |
| Method | POST |
| Path | /auth/hpp/callback (or your declared data-hpp-callback path) |
| Content-Type | application/json |
| Request body | { cert_id, rp_id, server_timestamp, expiry_ms, hpp_server_sig, credential_id, authenticator_data, assertion_sig, action_scope? } |
| Success response | HTTP 200 { status: 'SESSION_ISSUED', session_token: '...' } |
| Failure response | HTTP 401 { error: 'CERT_INVALID' \| 'CERT_EXPIRED' \| 'RP_MISMATCH' \| 'ALREADY_USED' } |
| Idempotency | The cert_id field is a UUID that uniquely identifies each certificate. Your backend must record used cert_ids and reject reuse (see Section 4.3). |

**4.2 Request Body Fields**

|  |  |  |
|----|----|----|
| **Field** | **Type** | **Description** |
| cert_id | string (UUID v4) | Unique certificate identifier. Store this and reject any second request with the same cert_id within the certificate's validity window. |
| rp_id | string | The eTLD+1 of your site as declared in the certificate. Verify this matches your own domain before accepting. |
| server_timestamp | number (Unix ms) | Server-authoritative issuance time from the HPP Attestation Server. Anchor for replay prevention. |
| expiry_ms | number (Unix ms) | Certificate expiry time. Reject any certificate where expiry_ms \< Date.now() at the time of your callback. |
| hpp_server_sig | string (base64url) | ECDSA P-256 countersignature from the HPP Attestation Server. This is what you verify. A valid signature proves the certificate was issued by the HPP Attestation Server for your rp_id. |
| credential_id | string (base64url) | The enrolled platform authenticator credential. Identifies which device authenticated. Store this if you want per-device session management. |
| authenticator_data | string (base64url) | Raw WebAuthn authenticator data. Contains the UV flag, sign count, and AAGUID. Included for auditing and advanced validation. |
| assertion_sig | string (base64url) | ECDSA P-256 hardware signature over the challenge and authenticator data. The HPP SDK verifies this. You do not need to verify it directly unless doing manual verification (Section V). |
| action_scope | string \| null | Present only on re-attestation certificates (Section VII). Contains the action identifier your backend sent in the hpp-reauth header. Null on standard login certificates. |

**4.3 Replay Prevention — Required**

Every Presence Certificate carries a cert_id. Your backend must implement a replay prevention store that records accepted cert_ids and rejects any second submission of the same cert_id within the certificate's validity window.

The recommended implementation is a key-value store (Redis, DynamoDB, or equivalent) with TTL-based expiry set to the certificate's expiry_ms. On receipt of a callback:

1.  Check the replay store for the cert_id. If present: return HTTP 401 with error ALREADY_USED.

2.  Proceed with certificate verification (Section V).

3.  On successful verification: write the cert_id to the replay store with TTL = expiry_ms - Date.now(). Issue your session.

> *Skipping replay prevention means a captured HPP certificate could be replayed to create multiple sessions within its validity window. The extension's per-issuance cert_id makes prevention straightforward — there is no reason to omit it.*

**4.4 Session Issuance**

After successful certificate verification, issue a session using your existing session management system. HPP does not define session format. Your session can be a JWT, a cookie, an opaque token — whatever your application already uses.

The certificate's expiry_ms does not need to match your session lifetime. The certificate is the authentication proof; your session lifetime is your application's policy. Most relying parties set session lifetime independently (e.g., 24 hours or until browser close) and use HPP's re-attestation pattern (Section VII) for sensitive actions within the session.

**V. Step 3 — Certificate Verification**

Certificate verification is a local operation. At verification time you do not make a network request to the HPP Attestation Server. You verify the hpp_server_sig using the HPP Attestation Server's public key, which you install once at deployment time.

**5.1 HPP Server SDK (Recommended)**

The HPP Server SDK handles all verification logic. Install it once and call verify() in your callback handler.

> // Node.js
>
> const { HppVerifier } = require('@hpp/server-sdk');
>
> const verifier = new HppVerifier({
>
> rpId: 'yourdomain.com', // your eTLD+1
>
> publicKeyPath: './hpp-attest-pubkey.pem' // HPP Attestation Server public key
>
> });
>
> // In your callback route handler:
>
> app.post('/auth/hpp/callback', async (req, res) =\> {
>
> const cert = req.body;
>
> // Step 1: Check replay store
>
> if (await replayStore.exists(cert.cert_id)) {
>
> return res.status(401).json({ error: 'ALREADY_USED' });
>
> }
>
> // Step 2: Verify the certificate
>
> const result = await verifier.verify(cert);
>
> if (!result.valid) {
>
> return res.status(401).json({ error: result.error });
>
> }
>
> // Step 3: Record cert_id to prevent replay
>
> await replayStore.set(cert.cert_id, true, { ttl: cert.expiry_ms - Date.now() });
>
> // Step 4: Issue your session
>
> const sessionToken = await issueSession({ credentialId: cert.credential_id });
>
> return res.json({ status: 'SESSION_ISSUED', session_token: sessionToken });
>
> });

**5.2 What the SDK Verifies**

The SDK performs the following checks in sequence. All must pass for result.valid to be true:

|  |  |  |
|----|----|----|
| **\#** | **Check** | **Failure Code** |
| **1** | hpp_server_sig is a valid ECDSA P-256 signature over the certificate fields using the pinned HPP Attestation Server public key. | CERT_SIG_INVALID |
| **2** | rp_id in the certificate exactly matches the rpId configured in the HppVerifier constructor. | RP_MISMATCH |
| **3** | expiry_ms \> current server time. Certificate has not expired. | CERT_EXPIRED |
| **4** | The UV (User Verification) flag is set in authenticator_data. Confirms biometric verification occurred. | UV_FLAG_MISSING |
| **5** | assertion_sig is a valid ECDSA P-256 signature over the challenge and authenticator_data, verifiable against the enrolled credential's public key. | ASSERTION_SIG_INVALID |
| **6** | server_timestamp is within a reasonable historical window (not from the future, not older than max certificate lifetime). | TIMESTAMP_OUT_OF_RANGE |

**5.3 Installing the HPP Attestation Server Public Key**

Download the HPP Attestation Server public key from the HPP Developer Portal at agileontarget.com/developers and store it as a PEM file in your server's configuration directory. Pass its path to the HppVerifier constructor as shown above.

The public key is rotated on a minimum 12-month schedule. The HPP Developer Portal publishes rotation announcements at least 30 days in advance. During the rotation window, both the current and next keys are valid. The SDK accepts either when both are configured:

> const verifier = new HppVerifier({
>
> rpId: 'yourdomain.com',
>
> publicKeyPath: './hpp-attest-pubkey.pem',
>
> nextKeyPath: './hpp-attest-pubkey-next.pem' // optional, for rotation window
>
> });

**5.4 Manual Verification (Without the SDK)**

If you are not using the SDK, you can verify certificates manually. The hpp_server_sig field is an ECDSA P-256 signature over the following concatenated fields, encoded as a canonical JSON string with keys in alphabetical order:

> const payload = JSON.stringify({
>
> assertion_sig: cert.assertion_sig,
>
> authenticator_data: cert.authenticator_data,
>
> cert_id: cert.cert_id,
>
> credential_id: cert.credential_id,
>
> expiry_ms: cert.expiry_ms,
>
> rp_id: cert.rp_id,
>
> server_timestamp: cert.server_timestamp
>
> }); // Keys sorted alphabetically — canonical form
>
> const isValid = await crypto.subtle.verify(
>
> { name: 'ECDSA', hash: 'SHA-256' },
>
> hppPublicKey, // CryptoKey from the PEM file
>
> base64urlDecode(cert.hpp_server_sig), // signature bytes
>
> new TextEncoder().encode(payload) // signed data
>
> );
>
> *Manual verification requires you to implement all six checks in Section 5.2, not just the signature check. Verifying only the signature and skipping the expiry or UV flag checks leaves your application open to certificate replay and hardware bypass attacks.*

**VI. Enrollment Backend Requirements**

Most of the enrollment flow is handled by the HPP Chrome Extension and the HPP Attestation Server. Your backend has two lightweight responsibilities during enrollment.

**6.1 Credential Registration Notification**

When a user completes enrollment on your site, the HPP Attestation Server notifies your backend via a POST to your registered enrollment webhook. This is optional but recommended — it allows you to associate the enrolled credential with a user account in your database.

> // Enrollment webhook — POST /auth/hpp/enrolled
>
> // Body: { credential_id, rp_id, enrolled_at, user_agent_hint }
>
> app.post('/auth/hpp/enrolled', async (req, res) =\> {
>
> const { credential_id, enrolled_at } = req.body;
>
> // Associate credential with the authenticated user session
>
> // (user must be logged in via another method for first enrollment)
>
> const userId = req.session?.userId;
>
> if (userId) {
>
> await db.hppCredentials.insert({ userId, credential_id, enrolled_at });
>
> }
>
> return res.json({ status: 'ACK' });
>
> });

**6.2 First Enrollment and Account Linking**

The first time a user enrolls your site with HPP, they will not yet have an HPP credential associated with their account. The recommended enrollment flow is:

4.  User logs in with their existing credentials (password, SSO, or whatever your application uses).

5.  After successful login, your application detects that the user does not have an HPP credential on record.

6.  Your application presents an 'Enable Passwordless Login' prompt.

7.  The HPP meta tag on the account settings page triggers the enrollment flow.

8.  On enrollment confirmation from the webhook, you record the credential_id against the user's account.

9.  On all subsequent logins, the HPP callback flow uses the cert's credential_id to identify the user — no username required.

> *Once HPP is enrolled, your login page does not need to display a username field for HPP users. The credential_id in the certificate is sufficient to identify the user account. You may still show the standard form for non-HPP users.*

**6.3 Multiple Device Support**

A user can enroll multiple devices. Each device produces a distinct credential_id. Your database should associate multiple credential_ids with a single user account. The callback flow is identical regardless of which enrolled device the user authenticates from.

**VII. Re-Attestation for High-Value Actions**

HPP's session presence reuse window (one hour by default) is appropriate for normal authenticated navigation. For actions where the security stakes are higher — payment authorization, changing account credentials, accessing sensitive records, confirming a large transaction — you can require a fresh presence event before the action proceeds.

**7.1 Triggering Re-Attestation**

To request fresh presence verification before a specific action, include the following header in your API response for that action:

> HTTP/1.1 402 Payment Required
>
> hpp-reauth: required
>
> hpp-reauth-action: payment-confirm
>
> hpp-reauth-display: 'Verify your presence to confirm this payment'

The extension intercepts this response, presents a fresh Presence Gate to the user, and retries the original request with a new short-lifetime certificate appended to the request headers:

> X-HPP-Cert: \<base64url-encoded re-attestation certificate\>

Your backend verifies this certificate using the same HppVerifier as the login flow, with one additional check: the action_scope field in the certificate must match the hpp-reauth-action value you sent in the trigger response.

**7.2 Re-Attestation Certificate Properties**

|  |  |
|----|----|
| **Property** | **Value** |
| Lifetime | 120 seconds (2 minutes). Configurable per action via hpp-reauth-lifetime header. |
| action_scope | Populated with the value of hpp-reauth-action. Verify this matches your expected action before authorizing. |
| credential_id | Same as the login certificate — bound to the same device. Verify it matches the enrolled credential for the authenticated user. |
| Replay prevention | Same cert_id replay prevention applies. A 120-second TTL in your replay store is sufficient. |

**7.3 Re-Attestation Verification Example**

> // In your payment confirmation route:
>
> app.post('/payments/confirm', async (req, res) =\> {
>
> const hppCertHeader = req.headers\['x-hpp-cert'\];
>
> // No HPP cert present — trigger re-attestation
>
> if (!hppCertHeader) {
>
> return res.status(402)
>
> .set('hpp-reauth', 'required')
>
> .set('hpp-reauth-action', 'payment-confirm')
>
> .set('hpp-reauth-display', 'Verify your presence to confirm this payment')
>
> .json({ error: 'PRESENCE_REQUIRED' });
>
> }
>
> // HPP cert present — verify it
>
> const cert = JSON.parse(Buffer.from(hppCertHeader, 'base64url').toString());
>
> const result = await verifier.verify(cert);
>
> if (!result.valid) {
>
> return res.status(401).json({ error: result.error });
>
> }
>
> // Verify action scope matches what we requested
>
> if (cert.action_scope !== 'payment-confirm') {
>
> return res.status(401).json({ error: 'ACTION_SCOPE_MISMATCH' });
>
> }
>
> // Replay prevention
>
> if (await replayStore.exists(cert.cert_id)) {
>
> return res.status(401).json({ error: 'ALREADY_USED' });
>
> }
>
> await replayStore.set(cert.cert_id, true, { ttl: 120000 });
>
> // Proceed with payment
>
> await processPayment(req.body);
>
> return res.json({ status: 'CONFIRMED' });
>
> });

**VIII. Relying Party Security Checklist**

Before enabling HPP login in production, verify each item on this checklist. Items marked Required must be implemented. Items marked Recommended are strongly advised.

|  |  |  |
|----|----|----|
| **\#** | **Check** | **Classification** |
| 1 | hpp_server_sig is verified against the HPP Attestation Server public key on every callback. | **Required** |
| 2 | rp_id in the certificate is verified against your own eTLD+1 before accepting. | **Required** |
| 3 | expiry_ms \> Date.now() is checked on every certificate before acceptance. | **Required** |
| 4 | Replay prevention store is implemented and cert_id is checked before every session issuance. | **Required** |
| 5 | UV flag presence is verified in authenticator_data before accepting any certificate. | **Required** |
| 6 | Callback endpoint is HTTPS only. HTTP callbacks are never accepted. | **Required** |
| 7 | action_scope is verified on re-attestation certificates before authorizing high-value actions. | **Required (if using reauth)** |
| 8 | credential_id from the certificate is verified against the enrolled credential on record for the user account. | **Recommended** |
| 9 | HPP public key rotation schedule is tracked. Key rotation announcements from agileontarget.com/developers are subscribed to. | **Recommended** |
| 10 | HPP callback endpoint is rate-limited to prevent certificate stuffing attempts. | **Recommended** |
| 11 | Enrollment webhook (Section VI) is implemented to associate credential_id with user accounts. | **Recommended** |

**IX. Quick Start — Minimal Working Integration**

The following is the minimum code required for a working HPP login integration in a Node.js/Express application. This can be adapted to any server-side framework.

**9.1 Install the SDK**

> npm install @hpp/server-sdk

**9.2 Download the HPP Attestation Server Public Key**

> \# Download from HPP Developer Portal
>
> curl -o ./config/hpp-attest-pubkey.pem \\
>
> https://agileontarget.com/developers/keys/hpp-attest-pubkey.pem

**9.3 Add the Meta Tag to Your Login Page**

> \<!-- In \<head\> of your login page --\>
>
> \<meta name="hpp-enrollment" content="request"
>
> data-hpp-callback="https://yourdomain.com/auth/hpp/callback"
>
> data-hpp-site-name="Your App Name"\>

**9.4 Implement the Callback Endpoint**

> const express = require('express');
>
> const { HppVerifier } = require('@hpp/server-sdk');
>
> const redis = require('redis'); // or any key-value store
>
> const app = express();
>
> const replay = redis.createClient();
>
> const verifier = new HppVerifier({
>
> rpId: 'yourdomain.com',
>
> publicKeyPath: './config/hpp-attest-pubkey.pem'
>
> });
>
> app.post('/auth/hpp/callback', express.json(), async (req, res) =\> {
>
> const cert = req.body;
>
> // Replay check
>
> if (await replay.get(cert.cert_id)) {
>
> return res.status(401).json({ error: 'ALREADY_USED' });
>
> }
>
> // Verify certificate
>
> const result = await verifier.verify(cert);
>
> if (!result.valid) {
>
> return res.status(401).json({ error: result.error });
>
> }
>
> // Record cert_id — TTL matches certificate expiry
>
> const ttl = Math.max(0, cert.expiry_ms - Date.now());
>
> await replay.set(cert.cert_id, '1', { PX: ttl });
>
> // Identify user by credential_id
>
> const user = await db.users.findByHppCredential(cert.credential_id);
>
> if (!user) {
>
> return res.status(401).json({ error: 'CREDENTIAL_NOT_ENROLLED' });
>
> }
>
> // Issue session
>
> const token = await issueSessionToken(user.id);
>
> return res.json({ status: 'SESSION_ISSUED', session_token: token });
>
> });
>
> *This minimal implementation handles the happy path. For production, add rate limiting to the callback endpoint, structured logging with cert_id and credential_id for audit, and an error monitoring integration that alerts on repeated CERT_SIG_INVALID errors (which may indicate a key rotation event or an attack).*

**X. Demo Environment**

HPP provides a hosted demo environment at login.hpp-demo.com where developers can experience the full enrollment and authentication flow before implementing it on their own site.

**10.1 What the Demo Provides**

- A live login page with the HPP meta tag installed.

- A working enrollment flow: install the HPP Chrome Extension, visit the demo, enroll with your device biometric.

- A working authentication flow: return to the demo after enrollment, tap 'Verify Your Presence', observe the authenticated session.

- A certificate inspector: after authentication, the demo page displays the full Presence Certificate payload so you can see exactly what your callback endpoint will receive.

- A re-attestation demo: the demo includes a 'High Value Action' button that triggers the hpp-reauth flow so you can see the re-attestation gate in action.

**10.2 Test Credentials for SDK Development**

The HPP Developer Portal at agileontarget.com/developers provides a sandbox Attestation Server endpoint and a sandbox public key for use in development and CI environments. Sandbox certificates are issued with a different public key than production certificates and are explicitly marked sandbox: true in the payload — they will be rejected by production HppVerifier instances configured with the production public key.

> // Sandbox verifier — for development only
>
> const sandboxVerifier = new HppVerifier({
>
> rpId: 'localhost',
>
> publicKeyPath: './config/hpp-attest-sandbox-pubkey.pem',
>
> sandbox: true // accepts sandbox certificates, rejects production
>
> });
>
> *Never deploy a sandbox verifier in production. Sandbox certificates are not protected by the HPP Attestation Server's production security controls. Using a sandbox verifier in production would accept certificates that were not issued by the production HPP Attestation Server.*

**XI. Regulatory and Compliance Notes**

HPP Browser Login is designed to support compliance with the following regulatory frameworks. This section describes how the protocol's properties map to specific requirements.

**11.1 UK Online Safety Act / EU Digital Services Act**

Both the UK Online Safety Act and the EU Digital Services Act include provisions requiring age verification and identity assurance for access to certain categories of content. HPP's Presence Certificate architecture provides the following relevant properties:

- Proof of human presence: the certificate proves a biological human completed a hardware-verified interaction. Automated agents cannot obtain a valid certificate.

- Continuity guarantee: certificates are hardware-bound and non-transferable between devices. A single physical human corresponds to a single enrolled device.

- Privacy-preserving: no PII is transmitted to HPP infrastructure. Compliance can be demonstrated without creating a central database of user identities.

HPP's age verification extension (documented separately as the Pro-M architecture) builds on the base presence protocol to add age predicate proofs. For DSA and Online Safety Act compliance purposes, consult the HPP Age Verification Integration Guide.

**11.2 FIDO2 / WebAuthn Compatibility**

HPP Browser Login is built on the WebAuthn API and is fully compatible with FIDO2 infrastructure. Sites already deploying WebAuthn passkeys can add HPP support as a transparent extension — the hardware binding, UV enforcement, and credential management are shared between the two protocols.

**11.3 Data Minimization (GDPR / CCPA)**

HPP is data minimization by design. The HPP Attestation Server receives credential IDs and challenge nonces. It does not receive email addresses, names, IP addresses correlated to identity, or any biometric data. Your implementation should document this in your privacy policy as evidence of data minimization compliance.

**11.4 Audit Logging Recommendations**

For regulated industries, HPP's certificate fields provide a natural audit record. For each authenticated event, log:

- cert_id — unique event identifier.

- credential_id — identifies the device used.

- server_timestamp — HPP Attestation Server-authoritative time of the authentication event.

- rp_id — confirms the site the user authenticated to.

- action_scope (if present) — identifies the high-value action the re-attestation was for.

These fields together provide a tamper-evident, non-repudiable record that a human being on a specific device authenticated to a specific site at a specific server-authoritative time.

**XII. Common Integration Issues**

|  |  |  |
|----|----|----|
| **Symptom** | **Likely Cause** | **Resolution** |
| Extension does not show enrollment prompt | Meta tag missing or in \<body\> instead of \<head\>. Tag dynamically injected after page load. | Move tag to \<head\>. Confirm it is present in the initial HTML response, not added by JavaScript. |
| Callback receives RP_MISMATCH error | rpId in HppVerifier constructor does not match the eTLD+1 of the site the user enrolled on. | Verify rpId matches your domain exactly. Check for www prefix or subdomain mismatch. |
| Callback receives CERT_EXPIRED | Network latency between extension certificate issuance and your callback handler caused the certificate to expire in transit. | For very short default certificate lifetimes, check your server clock sync. Consider allowing max_clock_skew_ms headroom. Contact HPP support to adjust certificate lifetime defaults. |
| Replay store TTL too short — ALREADY_USED on first use | Replay store TTL calculation underflows if expiry_ms - Date.now() returns a negative value due to clock skew. | Use Math.max(0, cert.expiry_ms - Date.now()) when setting TTL. A negative TTL in most stores sets the key to expire immediately. |
| Re-attestation loop — page triggers reauth repeatedly | Backend is sending hpp-reauth: required on the retry request even when a valid X-HPP-Cert header is present. | Check for X-HPP-Cert header before sending the 402 re-attestation trigger. The guard should be: if (!req.headers\['x-hpp-cert'\]) { return 402; } |
| CERT_SIG_INVALID on all callbacks | Installed public key file is corrupted, is the sandbox key in production, or the key has been rotated and the new key is not installed. | Re-download the public key from agileontarget.com/developers. Verify the PEM fingerprint matches the published fingerprint. Check rotation announcements. |

**Human Presence Protocol \| Relying Party Integration Guide v1.0**

Developer support and SDK downloads: agileontarget.com/developers


**Human Presence Protocol**

Demo Site Specification

*Engineering Specification for demo.humanpresenceprotocol.com*

Version 1.0 \| March 2026 \| Agile On Target LLC

The HPP Demo Site is a publicly accessible web application at demo.humanpresenceprotocol.com that demonstrates a complete Human Presence Protocol authentication flow. It serves three audiences simultaneously: end users who want to experience passwordless login before enrolling their own applications; developers building HPP integrations who need a working reference implementation; and security reviewers evaluating the protocol's properties before adoption.

This specification covers everything required to build and deploy the demo site: page structure and content, backend route definitions, certificate verification logic, session management, the three optional demonstration scenarios, infrastructure requirements, and the developer-facing certificate inspector.

*Audience: Full-stack engineers building the HPP demo environment.*

**I. Objectives and Success Criteria**

The demo site has four primary objectives:

- Prove the complete HPP flow end-to-end in a public environment — enrollment, presence verification, certificate relay, session establishment — without any user account or password.

- Serve as a safe sandbox for security reviewers and developers to inspect the protocol in action before committing to an integration.

- Demonstrate the three optional HPP scenarios — age verification predicate, bot exclusion contrast, and high-value action re-attestation — so reviewers can evaluate HPP's breadth of application.

- Provide a developer-facing certificate inspector that exposes the full Presence Certificate payload, making the protocol transparent and reviewable.

The demo is considered successful when the following conditions can be demonstrated without assistance:

1.  A user installs the HPP Chrome Extension, visits the demo login page, and completes enrollment using their device biometric in under 60 seconds.

2.  On all subsequent visits, the same user is authenticated via presence verification in under 5 seconds with no password prompt.

3.  The authenticated dashboard displays the full Presence Certificate payload including cert_id, server_timestamp, credential_id (truncated), expiry countdown, and UV flag confirmation.

4.  The re-attestation demo triggers a fresh presence gate on a high-value action and completes successfully.

5.  A developer can copy the certificate payload from the inspector, paste it into the HPP SDK verification method, and receive a valid result.

**II. Domain and Infrastructure**

**2.1 Domain**

Primary domain: demo.humanpresenceprotocol.com. This is the canonical demo domain and should be treated as the production demo environment.

The eTLD+1 for WebAuthn rp.id purposes is humanpresenceprotocol.com. All HPP credentials enrolled on this demo will be scoped to humanpresenceprotocol.com and will be valid on all subdomains (demo., login., www., etc.) — consistent with the WebAuthn rp.id rules specified in the HPP Chrome Extension Design Specification Section 4.2.

|  |  |
|----|----|
| **Property** | **Value** |
| Primary domain | demo.humanpresenceprotocol.com |
| WebAuthn rp.id | humanpresenceprotocol.com |
| TLS minimum | TLS 1.3. Required by WebAuthn specification — no fallback. |
| HTTPS enforcement | All HTTP requests redirect to HTTPS with 301. HSTS header with max-age=31536000. |
| Certificate authority | Let's Encrypt or equivalent. Auto-renewal required. |
| HPP Attestation Server | https://attest.humanpresenceprotocol.com |
| HPP callback path | /hpp/callback |

**2.2 Infrastructure Requirements**

- Runtime: Node.js 20 LTS. Express 4.x for routing.

- Session storage: Redis. Used for session tokens and cert_id replay prevention store.

- Hosting: Any cloud provider supporting HTTPS and persistent process management (AWS, GCP, Fly.io, Railway, Render, or equivalent). The demo does not require a database — all session state is in Redis with TTL-based expiry.

- Process management: PM2 or equivalent. The demo must survive process restarts without losing active sessions (Redis-backed sessions are persistent across restarts).

- Environment variables: HPP_ATTEST_PUBKEY_PATH, SESSION_SECRET, REDIS_URL, PORT, NODE_ENV. No other secrets required.

- Logging: structured JSON to stdout. Include cert_id, credential_id (truncated to 8 chars), rp_id, and event type on all HPP events. No PII in logs.

**2.3 Security Headers**

Every response from the demo site must include the following HTTP security headers:

|  |  |
|----|----|
| **Header** | **Value** |
| Content-Security-Policy | default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src https://attest.humanpresenceprotocol.com |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-Frame-Options | DENY — prevents iframe embedding of login page |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | publickey-credentials-get=\* — required to allow WebAuthn on all paths |

**III. Site Structure and Page Inventory**

|  |  |  |
|----|----|----|
| **Route** | **Page Name** | **Purpose** |
| / | Landing Page | Explains HPP, provides extension install link, invites developers and security reviewers to explore. |
| /login | Login Page | HPP-enabled authentication page. Contains the enrollment meta tag. Entry point for both first-time enrollment and returning presence-verified login. |
| /dashboard | Authenticated Dashboard | Protected page. Displays session status, full Presence Certificate payload, credential details, and links to the three optional demonstration scenarios. |
| /demo/age | Age Verification Demo | Demonstrates the HPP age predicate gate. Shows how access to age-restricted content can be controlled by presence-bound age proof without disclosing identity. |
| /demo/bot | Bot Exclusion Demo | Side-by-side contrast: a standard CAPTCHA flow vs. an HPP presence gate. Demonstrates the architectural difference between detection-based and constraint-based bot exclusion. |
| /demo/reauth | Re-Attestation Demo | Demonstrates the hpp-reauth: required pattern. A simulated high-value action (fund transfer) triggers a fresh presence gate before the action is authorized. |
| /hpp/callback | Certificate Callback | Backend POST endpoint. Receives Presence Certificates from the HPP Chrome Extension, verifies them, and issues session tokens. Not a rendered page. |
| /hpp/enrolled | Enrollment Webhook | Backend POST endpoint. Receives enrollment notifications from the HPP Attestation Server when a user enrolls the demo site. |
| /api/session | Session Status API | GET endpoint. Returns current session state and certificate summary for the authenticated dashboard's live countdown display. |
| /api/transfer | Transfer API | POST endpoint used by the re-attestation demo. Returns 402 with hpp-reauth: required on first call; accepts re-attestation certificate on retry. |

**IV. Page Specifications**

**4.1 Landing Page ( / )**

The landing page explains HPP in plain language and routes three distinct visitor types to the right next step.

**Content Sections**

- Hero block: HPP wordmark, tagline — 'The web's first proof of human presence.' One-sentence explanation. Two CTAs: 'Try the Demo' (→ /login) and 'Read the Docs' (→ agileontarget.com/developers).

- How it works: Three-column explainer. Column 1: 'Your hardware verifies you' — biometric on your device, private key never leaves the chip. Column 2: 'A certificate proves it' — time-anchored, hardware-bound, server-countersigned. Column 3: 'The site trusts the proof' — no password, no CAPTCHA, no account required.

- For security reviewers: Callout block with links to the HPP Chrome Extension Design Specification, the Relying Party Integration Guide, and the patent portfolio overview at agileontarget.com.

- For developers: Code snippet showing the three-line integration: meta tag, npm install, verifier.verify(cert). Link to the full integration guide.


**Technical Requirements**

- Static HTML. No JavaScript required to render. JS is optional for CTA animation only.

- Fully accessible: semantic HTML, ARIA labels, keyboard navigation.

- No HPP meta tag on the landing page — enrollment is triggered only on /login.

**4.2 Login Page ( /login )**

The login page is the HPP integration surface. It is intentionally minimal — the HPP extension handles all authentication UI. The page's only job is to declare HPP support, display the pre-authentication state, and transition to the dashboard on success.

**HPP Meta Tag (Required)**

> \<head\>
>
> \<meta name="hpp-enrollment" content="request"
>
> data-data-data-hpp-callback="https://demo.humanpresenceprotocol.com/hpp/callback"
>
> data-hpp-site-name="HPP Demo Site"\>
>
> \</head\>

**Pre-Authentication State**

- HPP logo centered, 200px wide.

- Heading: 'Sign in with Human Presence'

- Body text: 'If you have the HPP extension installed, touch the button below to verify your presence. No password required.'

- Primary button: 'Verify Presence' — 280px wide, 52px tall, navy fill, white text. This button is a visual affordance only; the actual gate is triggered by the HPP extension's Presence Gate overlay. Clicking the button without the extension installed shows the 'Get Extension' prompt.

- Secondary link: 'Don't have the extension?' → opens Chrome Web Store listing in new tab.

- No username field. No password field. No CAPTCHA.

**Extension Detection**

The login page includes a small detection script that checks for the HPP extension's presence by listening for the hpp-extension-ready custom event dispatched by the content script on load:

> document.addEventListener('hpp-extension-ready', () =\> {
>
> document.getElementById('verify-btn').textContent = 'Verify Your Presence';
>
> document.getElementById('install-hint').style.display = 'none';
>
> });
>
> // After 1.5s with no extension signal, show install prompt
>
> setTimeout(() =\> {
>
> if (!window.hppExtensionDetected) {
>
> document.getElementById('install-hint').style.display = 'block';
>
> }
>
> }, 1500);

**Post-Authentication Redirect**

After the HPP extension delivers a valid certificate and the backend issues a session, the page is redirected to /dashboard. The redirect is initiated by the page's hpp-cert-ready event listener:

> document.addEventListener('hpp-cert-ready', (e) =\> {
>
> // cert_id is available in e.detail — the full cert
>
> // has already been delivered to /hpp/callback by the extension
>
> window.location.href = '/dashboard';
>
> });
>
> *The login page must never display a username or password field alongside the HPP button. The presence of a password field would train users to expect it and undermine the demonstration's core message. Non-HPP fallback authentication, if needed for the demo, should be on a separate /login/password page.*

**4.3 Authenticated Dashboard ( /dashboard )**

The dashboard is the destination after successful authentication. It serves two purposes: confirming the session to the user and exposing the full Presence Certificate payload for developer inspection.

**Session Confirmation Block**

- Green checkmark icon with text: 'Session Active — Human Presence Verified'

- Credential summary: 'Authenticated on \[device name or AAGUID description\] at \[server_timestamp formatted as local time\]'

- Certificate ID: first 8 characters of cert_id, displayed in monospace with a copy-to-clipboard button.

- Expiry countdown: live countdown in MM:SS format showing time remaining until certificate expiry. Implemented with a JavaScript setInterval calling GET /api/session every 30 seconds to refresh.

**Certificate Inspector**

The certificate inspector is the developer-facing component of the dashboard. It displays the full Presence Certificate payload in a formatted, syntax-highlighted JSON block:

> {
>
> "cert_id": "a3f8b2c1-...",
>
> "rp_id": "humanpresenceprotocol.com",
>
> "server_timestamp": 1743100800000,
>
> "expiry_ms": 1743104400000,
>
> "credential_id": "a1b2c3d4...",
>
> "authenticator_data":"SZYN5Yo...",
>
> "assertion_sig": "MEYCIQDx...",
>
> "hpp_server_sig": "MEUCIQD...",
>
> "uv_flag": true,
>
> "sign_count": 42
>
> }

- 'Copy Certificate' button: copies full JSON to clipboard. Used by developers testing the HPP SDK.

- 'Verify with SDK' tab: shows a Node.js code snippet using the HPP SDK to verify the certificate. The cert values are populated with the actual live certificate data.

- 'View Raw Headers' tab: shows the HTTP headers the extension sent to /hpp/callback for this authentication event.

**Demonstration Links**

- 'Try Age Verification' → /demo/age

- 'See Bot Exclusion vs CAPTCHA' → /demo/bot

- 'Try Re-Attestation (High-Value Action)' → /demo/reauth

**Sign Out**

- 'Sign Out' button clears the session cookie and redirects to /login.

**V. Backend Route Specifications**

**5.1 POST /hpp/callback — Certificate Receiver**

This is the core HPP integration endpoint. The HPP Chrome Extension service worker POSTs the full Presence Certificate to this endpoint after attestation server countersigning. This request originates from the extension, not from page JavaScript.

|  |  |
|----|----|
| **Field** | **Specification** |
| Method | POST |
| Auth | None. The certificate is self-verifying via hpp_server_sig. |
| Rate limit | 10 requests per minute per IP. Return 429 on excess. |
| Request body | { cert_id, rp_id, server_timestamp, expiry_ms, hpp_server_sig, credential_id, authenticator_data, assertion_sig } |
| Success | HTTP 200 { status: 'SESSION_ISSUED', redirect: '/dashboard' } |
| Failure | HTTP 401 { error: 'CERT_INVALID' \| 'CERT_EXPIRED' \| 'RP_MISMATCH' \| 'ALREADY_USED' \| 'UV_MISSING' } |

Full callback handler implementation:

> const { HppVerifier } = require('@hpp/server-sdk');
>
> const verifier = new HppVerifier({
>
> rpId: 'humanpresenceprotocol.com',
>
> publicKeyPath: process.env.HPP_ATTEST_PUBKEY_PATH
>
> });
>
> app.post('/hpp/callback', express.json(), rateLimit({ max:10, windowMs:60000 }), async (req, res) =\> {
>
> const cert = req.body;
>
> // 1. Replay check
>
> if (await redis.get(\`cert:\${cert.cert_id}\`)) {
>
> log.warn({ event:'REPLAY_ATTEMPT', cert_id:cert.cert_id });
>
> return res.status(401).json({ error:'ALREADY_USED' });
>
> }
>
> // 2. Verify certificate (signature, rp_id, expiry, UV flag)
>
> const result = await verifier.verify(cert);
>
> if (!result.valid) {
>
> log.warn({ event:'CERT_INVALID', reason:result.error, cert_id:cert.cert_id });
>
> return res.status(401).json({ error: result.error });
>
> }
>
> // 3. Record cert_id with TTL to prevent replay
>
> const ttl = Math.max(0, cert.expiry_ms - Date.now());
>
> await redis.set(\`cert:\${cert.cert_id}\`, '1', { PX: ttl });
>
> // 4. Establish session — store full cert for inspector
>
> const sessionId = crypto.randomUUID();
>
> await redis.set(\`session:\${sessionId}\`, JSON.stringify({
>
> cert, authenticatedAt: Date.now()
>
> }), { PX: cert.expiry_ms - Date.now() });
>
> // 5. Set session cookie and return
>
> res.cookie('hpp_session', sessionId, {
>
> httpOnly: true, secure: true, sameSite: 'Strict',
>
> maxAge: cert.expiry_ms - Date.now()
>
> });
>
> log.info({ event:'SESSION_ISSUED', cert_id:cert.cert_id,
>
> credential_id: cert.credential_id.substring(0,8) });
>
> return res.json({ status:'SESSION_ISSUED', redirect:'/dashboard' });
>
> });

**5.2 POST /hpp/enrolled — Enrollment Webhook**

The HPP Attestation Server calls this endpoint when a user enrolls the demo site. For the demo, this is used only for logging — there are no user accounts to link credentials to.

> app.post('/hpp/enrolled', express.json(), async (req, res) =\> {
>
> const { credential_id, rp_id, enrolled_at } = req.body;
>
> log.info({ event:'CREDENTIAL_ENROLLED',
>
> credential_id: credential_id.substring(0,8),
>
> rp_id, enrolled_at });
>
> return res.json({ status:'ACK' });
>
> });

**5.3 GET /api/session — Session Status**

Called by the dashboard's live countdown JavaScript to refresh session state without a full page reload.

> app.get('/api/session', requireSession, async (req, res) =\> {
>
> const session = await redis.get(\`session:\${req.sessionId}\`);
>
> const data = JSON.parse(session);
>
> return res.json({
>
> active: true,
>
> cert_id: data.cert.cert_id.substring(0, 8) + '...',
>
> expiry_ms: data.cert.expiry_ms,
>
> server_timestamp: data.cert.server_timestamp,
>
> credential_id: data.cert.credential_id.substring(0, 8) + '...',
>
> uv_flag: true,
>
> full_cert: data.cert // for the certificate inspector
>
> });
>
> });

**5.4 POST /api/transfer — Re-Attestation Demo Endpoint**

Used by the /demo/reauth page. Returns 402 on first call to trigger the re-attestation flow; accepts a re-attestation certificate on retry.

> app.post('/api/transfer', requireSession, express.json(), async (req, res) =\> {
>
> const hppCertHeader = req.headers\['x-hpp-cert'\];
>
> // No re-attestation cert — trigger the flow
>
> if (!hppCertHeader) {
>
> return res.status(402)
>
> .set('hpp-reauth', 'required')
>
> .set('hpp-reauth-action', 'transfer-confirm')
>
> .set('hpp-reauth-display', 'Verify your presence to confirm this transfer')
>
> .json({ error:'PRESENCE_REQUIRED' });
>
> }
>
> // Re-attestation cert present — verify it
>
> const cert = JSON.parse(Buffer.from(hppCertHeader, 'base64url').toString());
>
> if (await redis.get(\`cert:\${cert.cert_id}\`)) {
>
> return res.status(401).json({ error:'ALREADY_USED' });
>
> }
>
> const result = await verifier.verify(cert);
>
> if (!result.valid) return res.status(401).json({ error: result.error });
>
> if (cert.action_scope !== 'transfer-confirm') {
>
> return res.status(401).json({ error:'ACTION_SCOPE_MISMATCH' });
>
> }
>
> await redis.set(\`cert:\${cert.cert_id}\`, '1', { PX: 120000 });
>
> log.info({ event:'TRANSFER_AUTHORIZED', cert_id: cert.cert_id.substring(0,8) });
>
> return res.json({ status:'TRANSFER_AUTHORIZED', amount: req.body.amount });
>
> });

**5.5 Session Middleware**

All protected routes use the requireSession middleware, which validates the session cookie against the Redis session store:

> async function requireSession(req, res, next) {
>
> const sessionId = req.cookies?.hpp_session;
>
> if (!sessionId) return res.redirect('/login');
>
> const session = await redis.get(\`session:\${sessionId}\`);
>
> if (!session) return res.redirect('/login');
>
> req.sessionId = sessionId;
>
> req.sessionData = JSON.parse(session);
>
> next();
>
> }

**VI. Optional Demonstration Scenarios**

**6.1 Age Verification Demo ( /demo/age )**

This demo illustrates HPP's age predicate gate — the ability to prove that a user meets an age threshold without disclosing their actual age or identity.

**User Experience**

6.  User arrives at /demo/age while authenticated (session active from /login flow).

7.  Page displays a simulated age-restricted content area with a lock icon and the message: 'This content requires proof of age 18+. No ID required — your presence certificate carries the age predicate.'

8.  User clicks 'Unlock Content'. The page calls GET /api/demo/age-gate.

9.  The backend evaluates the age_predicate field in the session certificate (demo: always true for enrolled devices in the sandbox). If the predicate is satisfied, the content is unlocked.

10. The unlocked content section displays the age predicate proof: 'Age 18+ confirmed. Proof type: HPP age predicate. Your actual age was not disclosed.'

**Certificate Inspector Extension**

The age demo displays an extended certificate inspector showing the age_predicate field alongside the standard cert fields, demonstrating how the predicate is carried inside the HPP certificate structure.

**Backend Route**

> app.get('/api/demo/age-gate', requireSession, async (req, res) =\> {
>
> const { cert } = req.sessionData;
>
> // In demo: age_predicate is always true for enrolled sandbox devices
>
> // In production: evaluated by HPP Attestation Server at cert issuance
>
> const predicate = cert.age_predicate ?? { satisfied: true, threshold: 18 };
>
> if (!predicate.satisfied) {
>
> return res.status(403).json({ error: 'AGE_PREDICATE_NOT_MET' });
>
> }
>
> log.info({ event:'AGE_GATE_PASSED', cert_id: cert.cert_id.substring(0,8) });
>
> return res.json({ unlocked: true, predicate });
>
> });

**Explainer Panel**

The page includes a side panel explaining why this approach is privacy-preserving: the site learns only that the age threshold was met, not the user's actual age, date of birth, government ID number, or any other identity attribute. The predicate is evaluated by the HPP Attestation Server at certificate issuance and is cryptographically bound to the certificate — it cannot be forged.

**6.2 Bot Exclusion Demo ( /demo/bot )**

This demo makes the architectural difference between detection-based and constraint-based bot exclusion visceral and observable.

**Side-by-Side Layout**

The page is divided into two equal columns:

- Left column — 'Detection-Based (CAPTCHA)': Shows a live reCAPTCHA v2 challenge. User must select traffic lights, crosswalks, or bicycles. Below it: a counter showing the number of attempts required and the elapsed time. Below that: a facts panel — 'AI systems solve this challenge with 99%+ accuracy. CAPTCHA farms solve it for \$0.001 per solve.'

- Right column — 'Constraint-Based (HPP)': Shows the HPP Presence Gate. User taps 'Verify Presence', biometric fires, gate passes. Below it: the same attempt counter (always 1) and elapsed time (under 2 seconds). Below that: a facts panel — 'HPP does not distinguish humans from bots by behavior. It makes bot behavior physically expensive. Each attempt consumes one non-parallelizable time slot on real hardware.'

**Contrast Panel**

Below both columns, a full-width callout summarizes the architectural difference: 'Detection asks: does this entity behave like a human? Constraint asks: did a human pay the physical cost of this action? The first question has an answer that degrades with AI. The second question is grounded in physics.'

**Bot Simulation Button**

A 'Simulate Bot Attack' button (clearly labeled as a simulation) sends 10 rapid requests to the demo's HPP endpoint. The UI displays each attempt as it is rejected in real time, showing the ALREADY_USED or CHALLENGE_EXPIRED error codes. This makes the replay prevention and time-warehousing resistance properties observable.

> // Simulate bot attack — client-side demo only
>
> document.getElementById('simulate-bot').addEventListener('click', async () =\> {
>
> const log = document.getElementById('attack-log');
>
> for (let i = 0; i \< 10; i++) {
>
> const res = await fetch('/api/demo/bot-attempt', { method:'POST',
>
> body: JSON.stringify({ attempt: i }),
>
> headers: { 'Content-Type':'application/json' } });
>
> const data = await res.json();
>
> log.innerHTML += \`\<div\>Attempt \${i+1}: \${data.error} (\${res.status})\</div\>\`;
>
> }
>
> });
>
> // Backend — reject all bot simulation attempts
>
> app.post('/api/demo/bot-attempt', (req, res) =\> {
>
> // All attempts fail — no valid hardware assertion
>
> return res.status(401).json({
>
> error: 'NO_VALID_ASSERTION',
>
> message: 'Bot simulation: no hardware-bound credential presented.'
>
> });
>
> });

**6.3 Re-Attestation Demo ( /demo/reauth )**

This demo shows the high-value action re-attestation pattern — the ability to require a fresh presence event for a sensitive operation within an already-authenticated session.

**Scenario**

The page simulates a bank transfer interface. The user is already authenticated from the main login flow. The demo presents a pre-filled transfer form: 'Transfer \$10,000 to Account 8472.' A 'Confirm Transfer' button is the trigger.

**Flow**

11. User clicks 'Confirm Transfer'. The page POSTs to /api/transfer with the transfer details but no re-attestation certificate.

12. The backend returns HTTP 402 with hpp-reauth: required, hpp-reauth-action: transfer-confirm, and hpp-reauth-display: 'Verify your presence to confirm this transfer'.

13. The HPP extension intercepts the 402 response and presents a fresh Presence Gate overlay with the display message from the hpp-reauth-display header.

14. User completes biometric. The extension retries the POST to /api/transfer with the re-attestation certificate in the X-HPP-Cert header.

15. Backend verifies the re-attestation certificate, confirms action_scope: transfer-confirm, and returns HTTP 200 with status: TRANSFER_AUTHORIZED.

16. Page displays: 'Transfer authorized. Re-attestation certificate issued at \[timestamp\]. Certificate lifetime: 120 seconds. Action scope: transfer-confirm.'

**Certificate Inspector Extension**

After completion, the page displays the re-attestation certificate in the inspector, with the action_scope field highlighted. The inspector notes: 'This certificate is not your login certificate. It was issued specifically for this action, with a 120-second lifetime. It cannot authorize any other action.'

**Timeline Display**

The page shows a visual timeline of the full re-attestation event: original request → 402 trigger → fresh biometric → re-attestation certificate issued → certificate presented → action authorized. Timestamps from the certificate fields are used to populate the timeline with real data.

**VII. Application File Structure**

> hpp-demo-site/
>
> ├── server.js \# Express app entry point
>
> ├── package.json
>
> ├── .env.example \# Required environment variables
>
> ├── config/
>
> │ └── hpp-attest-pubkey.pem \# HPP Attestation Server public key
>
> ├── middleware/
>
> │ ├── requireSession.js \# Session validation middleware
>
> │ ├── rateLimit.js \# Rate limiting configuration
>
> │ └── securityHeaders.js \# CSP and security header middleware
>
> ├── routes/
>
> │ ├── hpp.js \# /hpp/callback and /hpp/enrolled
>
> │ ├── api.js \# /api/session, /api/transfer, /api/demo/\*
>
> │ └── pages.js \# All page routes (GET handlers)
>
> ├── lib/
>
> │ ├── verifier.js \# HppVerifier instance (singleton)
>
> │ └── logger.js \# Structured JSON logger
>
> ├── public/
>
> │ ├── css/
>
> │ │ └── hpp-demo.css \# Site styles — navy/gold palette
>
> │ ├── js/
>
> │ │ ├── login.js \# Extension detection, cert-ready listener
>
> │ │ ├── dashboard.js \# Certificate inspector, countdown timer
>
> │ │ ├── demo-bot.js \# Bot simulation UI
>
> │ │ └── demo-reauth.js \# Re-attestation flow UI
>
> │ └── icons/ \# HPP logo and favicon
>
> └── views/
>
> ├── layout.html \# Base template with security headers
>
> ├── index.html \# Landing page
>
> ├── login.html \# Login page with HPP meta tag
>
> ├── dashboard.html \# Authenticated dashboard
>
> ├── demo-age.html \# Age verification demo
>
> ├── demo-bot.html \# Bot exclusion demo
>
> └── demo-reauth.html \# Re-attestation demo

**VIII. Environment Variables and Deployment**

**8.1 Required Environment Variables**

|  |  |  |
|----|----|----|
| **Variable** | **Example Value** | **Description** |
| NODE_ENV | production | Set to production before deployment. Enables HTTPS enforcement and secure cookie flags. |
| PORT | 3000 | Port the Express server listens on. |
| SESSION_SECRET | (64-char random hex) | Secret for signing session IDs. Generate with: openssl rand -hex 32 |
| REDIS_URL | redis://localhost:6379 | Redis connection string for session and replay store. |
| HPP_ATTEST_PUBKEY_PATH | ./config/hpp-attest-pubkey.pem | Path to the HPP Attestation Server public key PEM file. |
| LOG_LEVEL | info | Logging verbosity. Use debug for development, info for production. |

**8.2 Deployment Checklist**

Before making the demo publicly accessible, verify each item:

|  |  |  |
|----|----|----|
| **\#** | **Check** | **Status** |
| 1 | TLS certificate installed and auto-renewal configured. | \[ \] Done |
| 2 | HPP Attestation Server public key installed at HPP_ATTEST_PUBKEY_PATH. Fingerprint verified against agileontarget.com/developers. | \[ \] Done |
| 3 | All environment variables set in production environment. No .env file committed to version control. | \[ \] Done |
| 4 | Redis connection confirmed. Replay store TTL behavior tested (SET with PX option). | \[ \] Done |
| 5 | All security headers present in responses. Verified with securityheaders.com. | \[ \] Done |
| 6 | Rate limiting on /hpp/callback verified: 11th request within 60 seconds returns 429. | \[ \] Done |
| 7 | X-Frame-Options: DENY confirmed — login page cannot be embedded in an iframe. | \[ \] Done |
| 8 | Full enrollment and authentication flow tested end-to-end with the HPP Chrome Extension on macOS Touch ID and Windows Hello. | \[ \] Done |
| 9 | Certificate inspector displays correct data on the dashboard. 'Copy Certificate' button works. SDK snippet is accurate. | \[ \] Done |
| 10 | All three optional demo scenarios tested end-to-end. | \[ \] Done |
| 11 | Structured logs emitting to stdout with no PII. Log entries include cert_id, credential_id (truncated), event type. | \[ \] Done |
| 12 | Uptime monitoring configured. Alert on /hpp/callback returning \>1% error rate. | \[ \] Done |

**IX. Developer Notes and Design Constraints**

**9.1 No User Accounts Required**

The demo site has no user account system, no registration flow, no email addresses, and no passwords. Authentication is entirely via HPP Presence Certificates. User identity is represented solely by the credential_id in the certificate — a hardware-bound identifier that distinguishes one enrolled device from another.

The session store in Redis associates a session token with a Presence Certificate. When the session expires (matching the certificate's expiry_ms), the session is gone. There is nothing to log in to, nothing to recover, and nothing to delete. This is the data minimization property of HPP in its simplest form.

**9.2 Console Logging for Developers**

The demo site logs all HPP events to the server console in structured JSON for developer debugging:

> // Example log entries
>
> { "event":"SESSION_ISSUED", "cert_id":"a3f8b2c1", "credential_id":"d4e5f6a7" }
>
> { "event":"CERT_INVALID", "reason":"CERT_EXPIRED", "cert_id":"b1c2d3e4" }
>
> { "event":"REPLAY_ATTEMPT", "cert_id":"a3f8b2c1" }
>
> { "event":"TRANSFER_AUTHORIZED","cert_id":"f7g8h9i0" }
>
> { "event":"AGE_GATE_PASSED", "cert_id":"j1k2l3m4" }
>
> { "event":"CREDENTIAL_ENROLLED","credential_id":"n5o6p7q8" }

No full certificate payloads are logged. credential_id values are truncated to 8 characters. No IP addresses, user agents, or behavioral data are logged.

**9.3 Session Cookie Specification**

|  |  |
|----|----|
| **Cookie Property** | **Value and Rationale** |
| Name | hpp_session |
| Value | UUID v4 session ID. The session payload (including the full certificate) lives in Redis, not in the cookie. |
| httpOnly | true — prevents JavaScript access to the session cookie. |
| secure | true — transmitted only over HTTPS. |
| sameSite | 'Strict' — prevents CSRF attacks. Compatible with the HPP flow because the callback POST comes from the extension, not a cross-site redirect. |
| maxAge | cert.expiry_ms - Date.now(). Session lifetime matches the certificate lifetime. Default 1 hour. |

**9.4 What the Demo Does Not Implement**

The following are explicitly out of scope for the demo and must not be added without a specification revision:

- User registration or account management — there are no accounts.

- Email or SMS verification flows — HPP is the only authentication method.

- Analytics or behavioral tracking — the demo collects no data beyond what is logged for debugging.

- Third-party authentication (Google, GitHub, Apple SSO) — the demo is exclusively HPP to maintain clarity of purpose.

- A password fallback on the /login page — the demo must demonstrate a world without passwords.

> *Adding a password field to the demo login page, even as a fallback, fundamentally undermines the demonstration. If a non-HPP authentication path is needed for demo maintenance access, it must be on a separate, unlisted admin route that is not linked from any public page.*

**Human Presence Protocol \| Demo Site Specification \| v1.0**

Live demo: demo.humanpresenceprotocol.com \| Developers: agileontarget.com/developers


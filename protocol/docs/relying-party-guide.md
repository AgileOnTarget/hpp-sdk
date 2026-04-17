**RELYING PARTY**

**IMPLEMENTATION GUIDE**

Human Presence Protocol --- External Platform Integration

  ----------------------- ---------------------------------------------------------
  **Document ID**         OSI8_04A_01_IMP_Relying_Party_Implementation_Guide_v4_0

  **Title**               Relying Party Implementation Guide

  **Version**             4.0

  **Status**              Canonical

  **Scope**               REST API Integration, JWT Validation, Trust Tiering, SDK
                          Reference

  **Date**                April 2026

  **Author**              Tom Friend, Protocol Architect & Steward

  **Classification**      Confidential --- M&A Diligence
  ----------------------- ---------------------------------------------------------

  -----------------------------------------------------------------------
  **Purpose:** Technical manual for external platforms (Relying Parties)
  to integrate the Human Presence Protocol as a trust-gating mechanism.
  Covers API specification, JWT schema, trust tiering, code examples,
  error handling, security requirements, and testing procedures.

  -----------------------------------------------------------------------

**CONFIDENTIAL**

**1. Overview**

A Relying Party (RP) is any service --- social network, financial
platform, marketplace, AI interface, or content provider --- that
consumes HPP attestations to authorize user actions. Integration is
designed to be lightweight: standard REST patterns, JWT validation, and
a single public key. No biometric data, no user PII, and no HPP-specific
infrastructure is required on the RP side.

**1.1 Integration Model**

The RP interacts exclusively with the HPP Verifier API. The RP never
communicates with the user's device directly for protocol operations,
never receives biometric data, and never stores continuity scores. The
RP receives a cryptographically signed assertion --- a JWT --- that
answers a single question: does this user meet the required trust
threshold?

  ------------------------ ----------------------------------------------
  **Property**             **Value**

  **Transport**            HTTPS (TLS 1.3 minimum). All API calls
                           encrypted in transit.

  **Authentication**       API key issued at RP registration. Bearer
                           token in Authorization header.

  **Data format**          JSON request/response. JWT (ES256 / ECDSA
                           P-256) for signed attestations.

  **Verifier public key**  ECDSA P-256. Published at
                           /.well-known/hpp-verifier-key. Rotated
                           annually with 30-day overlap.

  **Rate limit**           1,000 verification requests per minute per RP.
                           Burst: 100/second. HTTP 429 on exceed.

  **Biometric data         **NONE. The RP never sees, processes, or
  received**               stores biometric data under any
                           circumstance.**

  **PII received**         **NONE. The RP receives a per-RP pseudonym
                           (unlinkable across RPs), a boolean tier
                           result, and a continuity score integer. No
                           name, email, phone, or device identifier.**
  ------------------------ ----------------------------------------------

**1.2 What the RP Receives**

For every verification request, the RP receives exactly:

  ---------------------- ----------------------------------------------------
  **Field**              **Description**

  **receipt_id**         Unique receipt identifier. UUID v4. One per
                         verification event.

  **pseudonym**          Per-RP pseudonym derived from a hardware-bound
                         identity root using a one-way domain-scoped hash.
                         Different for every RP. Cannot be used to link users
                         across services. The RP cannot reproduce or
                         reverse-engineer the derivation.

  **continuity_score**   Integer. Number of consecutive days of verified
                         human presence. Monotonically increasing when
                         pulsing daily.

  **tier**               Trust tier classification: TIER_0 (Newborn), TIER_1
                         (Verified), TIER_2 (Citizen), TIER_3 (Foundational).

  **timestamp**          Unix epoch seconds. Server-authoritative. When the
                         verification was performed.

  **credits_burned**     Integer. Number of presence credits consumed for
                         this verification (0 for threshold-only checks, ≥1
                         for burn-gated actions).

  **signature**          ECDSA P-256 signature over the receipt payload.
                         Verifiable against the HPP Verifier public key.
  ---------------------- ----------------------------------------------------

  -----------------------------------------------------------------------
  **Privacy Guarantee:** The RP never receives the user's name, email,
  phone number, device identifier, biometric data, Apple ID, or any
  personally identifiable information. The pseudonym is cryptographically
  derived per-RP, meaning two RPs receiving verifications from the same
  user cannot correlate them. HPP imposes zero GDPR/CCPA data-processing
  obligations on the RP.

  -----------------------------------------------------------------------

**2. Trust Tiering Model**

RPs do not need to manage raw continuity math. They request a specific
Trust Tier based on their risk profile. The tier system maps directly to
the Human Continuity Score (Patent E) and is enforced by the HPP
Verifier --- not the client.

  ------------ --------- ------------------ -------------------------------------
  **Tier**     **Min.    **Tier Name**      **Use Cases**
               Days**                       

  **TIER_0**   **1**     **Newborn**        Bot-resistant sign-up, comment
                                            posting, basic account creation.
                                            Proves a real human on real hardware
                                            performed a biometric attestation.

  **TIER_1**   **7**     **Verified**       Messaging, marketplace listing,
                                            voting in polls, content uploads.
                                            Proves 7 consecutive days of verified
                                            human presence.

  **TIER_2**   **30**    **Citizen**        High-value transactions, content
                                            promotion, financial operations, P2P
                                            transfers. Proves 30 days of
                                            sustained human presence.

  **TIER_3**   **365**   **Foundational**   Governance participation, advanced
                                            API access, administrative roles,
                                            moderator privileges. Proves one year
                                            of continuous verified presence.
  ------------ --------- ------------------ -------------------------------------

  -----------------------------------------------------------------------
  **Custom Thresholds:** RPs are not limited to the four standard tiers.
  The API accepts any integer threshold via the min_continuity_days
  parameter. An RP requiring exactly 14 days can specify 14 directly.
  Tier names are convenience labels --- the verifier evaluates the raw
  score.

  -----------------------------------------------------------------------

**2.1 Tier Selection Guidance**

  ------------------ --------------- ----------------------------------------
  **RP Category**    **Recommended   **Rationale**
                     Tier**          

  **Social media     **TIER_0**      Eliminates bot-driven content at the
  (posting)**                        lowest friction point. Users can post
                                     immediately after enrollment.

  **Marketplace      **TIER_1**      7-day presence requirement filters spam
  (listing)**                        accounts and drop-ship bots without
                                     deterring legitimate sellers.

  **Financial        **TIER_2**      30-day presence satisfies KYC risk
  services**                         frameworks. Combined with burn-gated
                                     transactions, prevents synthetic account
                                     farming.

  **Governance /     **TIER_2 or     High-stakes democratic actions require
  voting**           TIER_3**        sustained presence. TIER_3 for
                                     platform-wide governance; TIER_2 for
                                     community polls.

  **AI/LLM access**  **TIER_1**      Rate-limits AI abuse while remaining
                                     accessible. Burn-gating premium API
                                     calls adds economic friction.

  **Age-restricted   **TIER_0 + Age  Combine presence verification with ZKP
  content**          ZKP**           age attestation (OSI8_03A_55). No age
                                     data collected by RP.
  ------------------ --------------- ----------------------------------------

**3. Integration Flow**

Integration follows a four-step sequence. Two variants exist: Threshold
Check (does the user meet a tier requirement?) and Burn and Unlock (does
the user meet the tier AND is willing to spend credits?).

**3.1 Threshold Check (Read-Only)**

The RP verifies whether a user meets a continuity threshold. No credits
are consumed. Suitable for access control, feature gating, and trust
evaluation.

  -------- ---------------- -------------------------------------------------
  **\#**   **Step**         **Details**

  **1**    **RP requests    RP displays an HPP-generated QR code or redirects
           verification**   the user to the HPP app via deep link. The
                            request includes: rp_domain, min_continuity_days,
                            nonce (UUID v4, generated by RP, single-use).

  **2**    **User performs  User authenticates via FaceID/TouchID on their
           biometric**      device. The HPP app sends the attestation to the
                            Verifier, which evaluates the continuity score
                            against the RP's threshold.

  **3**    **User submits   The signed HPP-JWT is returned to the user's
           receipt**        device, which submits it to the RP's callback
                            URL. Alternatively, the RP polls the Verifier API
                            with the nonce.

  **4**    **RP validates   RP verifies the JWT signature against the HPP
           JWT**            Verifier public key, checks the nonce matches,
                            confirms the tier meets the requirement, and
                            validates the timestamp is within the TTL window
                            (300 seconds).
  -------- ---------------- -------------------------------------------------

  -----------------------------------------------------------------------
  **Replay Prevention --- Critical:** The nonce is the RP's primary
  defense against replay attacks. The RP generates a cryptographically
  random nonce (UUID v4) at request time, embeds it in the verification
  request, and the HPP Verifier wraps it into the signed JWT. On receipt,
  the RP MUST verify that the returned nonce matches the one it issued
  for this specific session. Without this check, an attacker could replay
  a valid "Human" assertion from a different session. Nonce validation
  must occur server-side within the TTL window (±30 seconds of clock skew
  permitted). Each nonce MUST be consumed exactly once and then
  permanently recorded as spent.

  -----------------------------------------------------------------------

**3.2 Burn and Unlock (Credit Consumption)**

The RP requires the user to spend presence credits to perform an action.
This adds economic friction --- the user is provably investing
biological time. Suitable for high-stakes actions, scarcity-gated
access, and anti-abuse.

  -------- ---------------- -------------------------------------------------
  **\#**   **Step**         **Details**

  **1**    **RP requests    RP generates a burn request containing:
           burn**           rp_domain, credits_required (integer),
                            min_continuity_days, nonce, merchant_label
                            (display name for the user). Encoded as QR or
                            deep link.

  **2**    **User           User sees the burn request details (merchant,
           authorizes       credit cost, current balance). User explicitly
           burn**           authorizes via biometric. The HPP app submits the
                            burn to the Verifier.

  **3**    **Verifier       Verifier atomically deducts credits, generates a
           executes burn**  burn receipt with cryptographic proof of
                            destruction, and signs the HPP-JWT. Credits are
                            irreversibly destroyed (INV-6, INV-7).

  **4**    **RP validates   Same JWT validation as threshold check, plus:
           receipt**        confirm credits_burned \>= credits_required. The
                            burn receipt provides scarcity provenance ---
                            cryptographic proof that biological time was
                            consumed.
  -------- ---------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **Burn Idempotency (Invariants INV-6, INV-7):** The POST              |
| /v1/verify/burn endpoint is idempotent on the nonce. If a network     |
| failure occurs during the burn, the RP can safely retry the same      |
| request with the same nonce. The Verifier guarantees exactly-once     |
| credit destruction: if the burn was already executed for that nonce,  |
| the Verifier returns the original burn receipt (HTTP 200) rather than |
| deducting credits a second time. If the burn was not executed, the    |
| Verifier processes it normally. The RP can determine burn state at    |
| any time by polling GET /v1/verify/status/{nonce}. States are:        |
|                                                                       |
| **pending** (user has not yet authorized), **completed** (credits     |
| destroyed, receipt available), **expired** (TTL elapsed, no credits   |
| consumed). This eliminates ambiguity during network flickers: the     |
| user's lived time is never double-consumed and never lost.            |
+-----------------------------------------------------------------------+

**4. API Specification**

**4.1 Endpoints**

  ------------ ----------------------------------- -------------------------------------------
  **Method**   **Endpoint**                        **Description**

  **POST**     **/v1/verify/threshold**            Request a threshold-only verification.
                                                   Returns a signed JWT if the user's score
                                                   meets the specified minimum.

  **POST**     **/v1/verify/burn**                 Request a credit-burn verification.
                                                   Atomically deducts credits and returns a
                                                   burn receipt JWT.

  **GET**      **/v1/verify/status/{nonce}**       Poll for verification result by nonce.
                                                   Returns pending, completed (with JWT), or
                                                   expired.

  **GET**      **/v1/receipt/{receipt_id}**        Retrieve a previously issued receipt by ID.
                                                   For audit and replay verification.

  **GET**      **/.well-known/hpp-verifier-key**   Public key endpoint. Returns the current
                                                   ECDSA P-256 verifier public key in JWK
                                                   format. Cache for 24 hours.
  ------------ ----------------------------------- -------------------------------------------

**4.2 Threshold Verification Request**

+-----------------------------------------------------------------------+
| POST /v1/verify/threshold                                             |
|                                                                       |
| Authorization: Bearer {rp_api_key}                                    |
|                                                                       |
| Content-Type: application/json                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"rp_domain\": \"acme-bank.com\",                                     |
|                                                                       |
| \"min_continuity_days\": 30,                                          |
|                                                                       |
| \"nonce\": \"550e8400-e29b-41d4-a716-446655440000\",                  |
|                                                                       |
| \"callback_url\": \"https://acme-bank.com/hpp/callback\",             |
|                                                                       |
| \"ttl_seconds\": 300                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**4.3 Burn Request**

+-----------------------------------------------------------------------+
| POST /v1/verify/burn                                                  |
|                                                                       |
| Authorization: Bearer {rp_api_key}                                    |
|                                                                       |
| Content-Type: application/json                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"rp_domain\": \"sunset-coffee.com\",                                 |
|                                                                       |
| \"credits_required\": 3,                                              |
|                                                                       |
| \"min_continuity_days\": 1,                                           |
|                                                                       |
| \"merchant_label\": \"Sunset Coffee --- Premium Roast\",              |
|                                                                       |
| \"nonce\": \"6ba7b810-9dad-11d1-80b4-00c04fd430c8\",                  |
|                                                                       |
| \"callback_url\": \"https://sunset-coffee.com/hpp/callback\",         |
|                                                                       |
| \"ttl_seconds\": 300                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**4.4 HPP-JWT Response Schema**

The signed JWT returned to the RP contains the following claims:

+-----------------------------------------------------------------------+
| // JWT Header                                                         |
|                                                                       |
| { \"alg\": \"ES256\", \"typ\": \"JWT\", \"kid\":                      |
| \"hpp-verifier-2026-01\" }                                            |
|                                                                       |
| // JWT Payload                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"receipt_id\": \"rcpt_550e8400-e29b-41d4-a716-446655440000\",        |
|                                                                       |
| \"pseudonym\": \"ps_8f3a\...c21d\",                                   |
|                                                                       |
| \"continuity_score\": 42,                                             |
|                                                                       |
| \"tier\": \"TIER_2\",                                                 |
|                                                                       |
| \"credits_burned\": 0,                                                |
|                                                                       |
| \"rp_domain\": \"acme-bank.com\",                                     |
|                                                                       |
| \"nonce\": \"550e8400-e29b-41d4-a716-446655440000\",                  |
|                                                                       |
| \"iat\": 1760000000,                                                  |
|                                                                       |
| \"exp\": 1760000300,                                                  |
|                                                                       |
| \"iss\": \"hpp-verifier.example.com\"                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  ---------------------- ----------------------------------------------------
  **Claim**              **Validation Rule**

  **receipt_id**         Store for audit. Must be unique per verification
                         event.

  **pseudonym**          Per-RP. Use for returning-user identification
                         without PII. Do not attempt to correlate across RPs.

  **continuity_score**   Must be \>= your min_continuity_days. Integer, never
                         negative, never exceeds account age.

  **tier**               Derived from score. TIER_0 (≥1), TIER_1 (≥7), TIER_2
                         (≥30), TIER_3 (≥365).

  **credits_burned**     For burn requests: must be \>= credits_required. For
                         threshold checks: always 0.

  **nonce**              Must match the nonce sent in the request.
                         Single-use. Prevents replay.

  **exp**                Must be \> current time. Default TTL: 300 seconds.
                         Reject expired tokens.

  **iss**                Must match expected verifier domain. Reject if
                         unexpected issuer.
  ---------------------- ----------------------------------------------------

**5. Code Examples**

**5.1 Node.js / Express**

+-----------------------------------------------------------------------+
| const { hppVerifier } = require(\'@hpp/sdk-node\');                   |
|                                                                       |
| app.post(\'/api/action-gate\', async (req, res) =\> {                 |
|                                                                       |
| const { receiptToken } = req.body;                                    |
|                                                                       |
| const validation = await hppVerifier.verifyReceipt(receiptToken, {    |
|                                                                       |
| minContinuityDays: 30,                                                |
|                                                                       |
| requiredTier: \'TIER_2\'                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (validation.isValid) {                                             |
|                                                                       |
| // Proceed with high-value action                                     |
|                                                                       |
| return proceedWithAction(req.user);                                   |
|                                                                       |
| } else {                                                              |
|                                                                       |
| return res.status(403).json({                                         |
|                                                                       |
| error: validation.errorCode,                                          |
|                                                                       |
| detail: validation.errorMessage                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**5.2 Python / Flask**

+-----------------------------------------------------------------------+
| from hpp_sdk import HppVerifier                                       |
|                                                                       |
| verifier = HppVerifier(api_key=os.environ\[\'HPP_API_KEY\'\])         |
|                                                                       |
| \@app.route(\'/api/action-gate\', methods=\[\'POST\'\])               |
|                                                                       |
| def action_gate():                                                    |
|                                                                       |
| receipt_token = request.json.get(\'receipt_token\')                   |
|                                                                       |
| result = verifier.verify_receipt(                                     |
|                                                                       |
| token=receipt_token,                                                  |
|                                                                       |
| min_continuity_days=30,                                               |
|                                                                       |
| required_tier=\'TIER_2\'                                              |
|                                                                       |
| )                                                                     |
|                                                                       |
| if result.is_valid:                                                   |
|                                                                       |
| return proceed_with_action(current_user)                              |
|                                                                       |
| else:                                                                 |
|                                                                       |
| return jsonify({                                                      |
|                                                                       |
| \'error\': result.error_code,                                         |
|                                                                       |
| \'detail\': result.error_message                                      |
|                                                                       |
| }), 403                                                               |
+-----------------------------------------------------------------------+

**5.3 Manual JWT Verification (No SDK)**

RPs that prefer not to use the SDK can verify the JWT directly using any
standard JWT library:

+-----------------------------------------------------------------------+
| // 1. Fetch the HPP Verifier public key                               |
|                                                                       |
| const jwk = await                                                     |
| fetch(\'https://verifier.hpp.example/.well-known/hpp-verifier-key\')  |
|                                                                       |
| .then(r =\> r.json());                                                |
|                                                                       |
| // 2. Verify JWT signature (ES256 = ECDSA P-256 + SHA-256)            |
|                                                                       |
| const payload = jwt.verify(receiptToken, jwk, { algorithms:           |
| \[\'ES256\'\] });                                                     |
|                                                                       |
| // 3. Validate claims                                                 |
|                                                                       |
| assert(payload.nonce === expectedNonce, \'Nonce mismatch\');          |
|                                                                       |
| assert(payload.rp_domain === \'your.domain\', \'Domain mismatch\');   |
|                                                                       |
| assert(payload.continuity_score \>= 30, \'Score insufficient\');      |
|                                                                       |
| assert(payload.exp \> Date.now() / 1000, \'Token expired\');          |
|                                                                       |
| assert(payload.iss === \'hpp-verifier.example.com\', \'Unknown        |
| issuer\');                                                            |
+-----------------------------------------------------------------------+

**6. Error Handling**

The HPP Verifier returns structured error responses. RPs must handle
each error code appropriately:

  ------------------------------ ---------- ------------------ ---------------------------------
  **Error Code**                 **HTTP**   **Meaning**        **RP Action**

  **ERR_SCORE_INSUFFICIENT**     **403**    User is human but  Display: "You need X more days of
                                            lacks required     verified presence. Keep pulsing
                                            continuity.        daily." Do not reveal exact
                                                               score.

  **ERR_CREDITS_INSUFFICIENT**   **403**    User has           Display: "Insufficient presence
                                            insufficient       credits. Continue daily
                                            credits for the    attestation to earn more."
                                            burn.              

  **ERR_RECEIPT_EXPIRED**        **410**    Receipt was not    Request a new verification. Do
                                            used within the    not retry the same nonce.
                                            TTL (300s          
                                            default).          

  **ERR_NONCE_REPLAY**           **409**    This nonce has     Generate a new nonce and retry.
                                            already been       Possible replay attack.
                                            consumed.          

  **ERR_SIGNATURE_INVALID**      **401**    JWT signature      Reject unconditionally. May
                                            verification       indicate tampering or key
                                            failed.            rotation. Refresh public key and
                                                               retry once.

  **ERR_IDENTITY_BANNED**        **403**    Associated         Deny access. Do not reveal the
                                            hardware is on the reason is a hardware ban.
                                            revocation list.   

  **ERR_IDENTITY_SUSPENDED**     **403**    Identity           Display: "Your HPP presence is
                                            temporarily        currently suspended. Please check
                                            suspended (cliff   the HPP app."
                                            decay, migration   
                                            in progress).      

  **ERR_RP_UNAUTHORIZED**        **401**    RP API key is      Check API key configuration.
                                            invalid or         Contact HPP support.
                                            expired.           

  **ERR_RATE_LIMITED**           **429**    RP has exceeded    Implement exponential backoff.
                                            verification rate  Check Retry-After header.
                                            limit.             

  **ERR_CLIENT_OUTDATED**        **426**    User's HPP client  Display: "Please update your HPP
                                            version is below   app." Per OSI8_03A_33 EOL Policy.
                                            minimum supported. 
  ------------------------------ ---------- ------------------ ---------------------------------

**6.1 Developer Best Practices: Graceful Failure Paths**

Error handling must preserve user experience while maintaining security
posture. The following rules govern graceful degradation:

  ---------------------------- ----------------------------------------------------
  **Error Class**              **Best Practice**

  **ERR_SCORE_INSUFFICIENT /   Do not block the user permanently. Display a
  ERR_CREDITS_INSUFFICIENT**   constructive message explaining the gap and redirect
                               them to the HPP app to continue daily Pulse
                               attestation (J2). Example: "You need 12 more days of
                               verified presence. Open HPP to continue building
                               trust." The goal is re-engagement, not rejection.

  **ERR_SIGNATURE_INVALID**    This is a security event, not a UX issue. If
                               verification fails after a public-key refresh, flag
                               the account for immediate manual review. Log the
                               full JWT payload (it contains no PII), the
                               requesting IP, and the timestamp. Do not display
                               technical details to the user.

  **ERR_IDENTITY_BANNED /      Deny access but do not reveal the specific reason. A
  ERR_IDENTITY_SUSPENDED**     generic "Verification failed" message prevents
                               information leakage about the ban/suspension status.
                               For banned identities, the denial is permanent. For
                               suspended, direct the user to the HPP app.

  **ERR_RECEIPT_EXPIRED /      These are recoverable. Generate a fresh nonce and
  ERR_NONCE_REPLAY**           prompt the user to re-verify. If ERR_NONCE_REPLAY
                               occurs without a corresponding legitimate request,
                               treat as a potential replay attack and log a
                               security event.

  **ERR_RATE_LIMITED**         Implement exponential backoff with jitter. Display:
                               "Verification temporarily unavailable. Please try
                               again in a moment." Never expose rate-limit details
                               to the user.
  ---------------------------- ----------------------------------------------------

**7. Security Requirements for RPs**

RPs integrating HPP must adhere to the following security requirements.
These are non-negotiable for maintaining the integrity of the trust
chain.

  -------- ------------------------ ------------------------------------------
  **\#**   **Requirement**          **Details**

  **1**    **Validate JWT signature Never trust a receipt without verifying
           on every request**       the ECDSA P-256 signature against the HPP
                                    Verifier public key. Client-side-only
                                    validation is insufficient --- perform
                                    server-side verification.

  **2**    **Enforce nonce          Generate a cryptographically random nonce
           uniqueness**             (UUID v4) for every verification request.
                                    Store consumed nonces for the TTL window.
                                    Reject any receipt with a previously
                                    consumed nonce.

  **3**    **Validate the rp_domain The JWT's rp_domain must match your
           claim**                  registered domain. Reject mismatched
                                    domains --- this prevents receipt
                                    forwarding attacks.

  **4**    **Enforce TTL            Reject any JWT where exp \< current time.
           expiration**             Default TTL is 300 seconds. Do not extend
                                    or override. RPs SHOULD allow ±30 seconds
                                    of clock skew when validating exp to
                                    accommodate minor time-synchronization
                                    differences.

  **5**    **Cache the verifier     Fetch from /.well-known/hpp-verifier-key.
           public key responsibly** Cache for 24 hours. On signature failure,
                                    refresh the key once before rejecting. If
                                    verification fails after refresh, treat as
                                    tampering and log a security event.

  **6**    **Never store raw        The continuity_score in the JWT is
           continuity scores**      point-in-time and MUST NOT be treated as
                                    durable identity state. Do not build local
                                    score databases or cache scores for fraud
                                    scoring. Query HPP for each action that
                                    requires verification.

  **7**    **Never attempt to       Pseudonyms are per-RP by design. Any
           correlate pseudonyms     attempt to reverse-engineer the pseudonym
           across RPs**             derivation or correlate across domains
                                    violates the HPP Terms of Service and may
                                    constitute a privacy violation.

  **8**    **Protect the RP API     Store in environment variables or a
           key**                    secrets manager. Never embed in
                                    client-side code, URLs, or version
                                    control. Rotate annually.
  -------- ------------------------ ------------------------------------------

**8. Testing and Sandbox**

  ------------------ ------------------------------------------------------------
  **Environment**    **Details**

  **Sandbox API**    Full-featured test environment at
                     sandbox.verifier.hpp.example. Accepts test API keys. Returns
                     deterministic responses for test pseudonyms.

  **Test fixtures**  Pre-configured test identities at every tier level: TIER_0
                     (score=1), TIER_1 (score=10), TIER_2 (score=45), TIER_3
                     (score=400). Test identity with 0 credits for
                     insufficient-credit testing.

  **Error            Sandbox supports X-HPP-Simulate-Error header. Pass any error
  simulation**       code to simulate that response. Allows RP to test all
                     error-handling paths without real protocol state.

  **Rate limit       Sandbox rate limit: 100 requests/minute (lower than
  testing**          production) to allow RPs to test backoff logic.

  **JWT validation   Sandbox issues JWTs signed with a test key. Test public key
  testing**          available at
                     sandbox.verifier.hpp.example/.well-known/hpp-verifier-key.
                     Never use test keys in production.

  **Synthetic data   Sandbox continuity scores are synthetic and do not reflect
  notice**           biological time. Sandbox pseudonyms are deterministic for
                     test reproducibility. Neither should be used for security
                     evaluation or compliance demonstration.
  ------------------ ------------------------------------------------------------

**8.1 Integration Checklist**

  -------- --------------------------------- ---------------------------------
  **\#**   **Checkpoint**                    **Acceptance Criteria**

  **1**    **RP registered and API key       Register at the HPP developer
           obtained**                        portal. Receive sandbox and
                                             production API keys.

  **2**    **Sandbox integration complete**  All four endpoints called
                                             successfully. JWT validation
                                             passing. Error codes handled.

  **3**    **Nonce generation and storage    UUID v4 nonces generated
           implemented**                     server-side. Consumed nonces
                                             tracked for TTL window.

  **4**    **JWT signature verification      Not client-side-only. ECDSA P-256
           server-side**                     verification against cached
                                             public key.

  **5**    **Error handling for all 10 error User-facing messages for each
           codes**                           error. No internal error codes
                                             exposed to users.

  **6**    **Rate limiting and backoff       Exponential backoff on HTTP 429.
           implemented**                     Retry-After header respected.

  **7**    **Production key rotated from     Production API key deployed via
           sandbox key**                     secrets manager. Sandbox key
                                             disabled in production.

  **8**    **Privacy review complete**       Confirmed: no biometric data
                                             stored, no PII collected,
                                             pseudonym correlation not
                                             attempted.
  -------- --------------------------------- ---------------------------------

**9. Strategic Advantage for Relying Parties**

  ------------------ ----------------------------------------------------
  **Advantage**      **Details**

  **Zero biometric   The RP never sees, processes, or stores biometric
  liability**        data. No BIPA exposure. No GDPR biometric processing
                     obligations. The biometric stays on the user's
                     device, processed by the OS, never by the RP.

  **Zero PII         The RP receives a pseudonym and a score. No name,
  liability**        email, phone, or address. No data-breach
                     notification obligations for HPP data because no PII
                     is collected.

  **Sybil defense at HPP ensures one human = one device = one identity.
  protocol level**   The RP does not need to build or maintain Sybil
                     detection. Bot farms face the full cost of
                     biological time per identity.

  **Infrastructure   Replaces expensive, reactive AI bot-detection
  cost reduction**   systems with a proactive, cryptographic gate. No ML
                     model training, no adversarial retraining, no
                     false-positive management.

  **Regulatory       HPP's privacy-by-architecture design satisfies GDPR
  readiness**        Art. 25, CCPA, COPPA, and emerging age-verification
                     mandates without the RP collecting regulated data.

  **Economic         Credit burns provide a provably scarce gating
  scarcity           mechanism. Unlike CAPTCHAs or rate limits, burned
  primitive**        credits represent irreversible biological time
                     investment. Fraud economics collapse.
  ------------------ ----------------------------------------------------

**10. VDR Cross-Reference Index**

  ----------------- --------------------------- ---------------------------------
  **Doc ID**        **Document**                **Relationship**

  **OSI8_02A_02**   Protocol Invariants         INV-6 (Atomic Burns), INV-7
                    Specification               (Idempotent), INV-8 (Nonce
                                                Freshness) enforced in RP flow

  **OSI8_02B_10**   Error Code Registry         Canonical error codes referenced
                                                in Section 6

  **OSI8_03A_33**   iOS End of Life Policy      ERR_CLIENT_OUTDATED (HTTP 426)
                                                enforcement

  **OSI8_03A_42**   J4 Relying Party Proof      Interactive demonstration of
                    Simulator                   threshold verification flow

  **OSI8_03A_43**   J5 Credit Burn Simulator    Interactive demonstration of
                                                burn-and-unlock flow

  **OSI8_03A_47**   Journey Rosetta Stone       Screen-to-patent mapping for J4
                                                and J5

  **OSI8_03A_55**   Age Verification ZKP        ZKP age attestation extension for
                                                age-restricted RP use cases

  **OSI8_05A_07**   HPP Privacy Architecture    Privacy guarantees underlying the
                                                zero-PII RP model
  ----------------- --------------------------- ---------------------------------

**END OF DOCUMENT**

*CONFIDENTIAL --- For Internal M&A / CorpDev / Technical Diligence Only*

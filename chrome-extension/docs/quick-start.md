# 1. Overview

The Human Presence Protocol (HPP) allows applications to require cryptographic proof that a real human was present at the time of a digital action.

HPP replaces traditional mechanisms such as passwords, CAPTCHAs, and bot detection heuristics with a biometric verification event tied to a hardware-bound authenticator.

The result of verification is a signed Presence Certificate that can be validated by the relying party server.

# 2. System Architecture

HPP Browser Extension performs biometric verification using WebAuthn platform authenticators.

HPP Web SDK provides a simple interface for applications to request human presence verification.

The Verifier Server issues challenges and signs Presence Certificates.

The Relying Party Server validates Presence Certificates before allowing protected actions.

# 3. Quick Start Steps

Install the HPP Browser Extension.

Add the HPP Web SDK to your site.

Declare your site using HPP meta tags.

Trigger verification using the SDK.

Verify Presence Certificates on the server.

# 4. Installing the Browser Extension

Load the HPP extension into Chrome using Developer Mode.

Navigate to chrome://extensions.

Enable Developer Mode.

Select 'Load Unpacked' and choose the extension folder.

Confirm the extension icon appears in the browser toolbar.

# 5. Declaring Your Site as HPP Enabled

Add the following meta tags to your HTML document:

\<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="Example Site"\>

The hpp-enrollment meta tag declares your site as HPP-enabled. The data-hpp-callback attribute specifies the endpoint that receives the signed Presence Certificate. The data-hpp-site-name attribute is displayed in the verification prompt.

# 6. Using the HPP Web SDK

Include the HPP SDK script in your application.

Use the requestPresence function to trigger verification.

Use getSession to check whether a valid session already exists.

# 7. Example Client Code

Include hpp-api.js via script tag: \<script src="hpp-api.js"\>\</script\>

Note: The @humanpresence/sdk npm package is forthcoming. For now, include hpp-api.js as a plain script tag. No bundler is required.

await HPP.requestPresence()

const session = await HPP.getSession()

console.log('Session valid until:', session.expiry_ms)

# 8. Server Verification

The Presence Certificate is delivered directly to the relying party backend via the configured callback endpoint.

Your server must verify the certificate signature and fields before allowing access.

# 9. Example Server Verification (Node)

const { verifyPresenceCertificate } = require('./hpp-verify');\
\
app.post('/api/hpp', async (req, res) =\> {\
const result = await verifyPresenceCertificate(req.body, HPP_PUBLIC_KEY);\
// Checks: (1) hpp_server_sig via ECDSA P-256, (2) expiry_ms \> Date.now(),\
// (3) status === 'issued', (4) rp_id matches expected value\
if (!result.valid) return res.status(401).json({ error: result.error });\
req.session.hpp_cert_id = result.cert_id;\
res.json({ cert_id: result.cert_id, granted: true });\
});

if (!result.valid) {

}

# 10. Presence Certificate Fields

cert_id – unique identifier for the presence certificate

rp_id – relying party identifier

credential_id – WebAuthn credential used for verification

authenticator_data – authenticator metadata

assertion_sig – WebAuthn assertion signature

nonce – single-use challenge nonce binding the certificate to a specific challenge

server_timestamp – time certificate was issued

expiry_ms – certificate expiration time

status – certificate status flag

hpp_server_sig – verifier signature

# 11. Security Model

Biometric verification ensures human presence.

WebAuthn platform authenticators ensure hardware binding.

Certificates are signed by the verifier server.

Full certificates are never exposed to page-level JavaScript.

Verification always occurs on the server.

# 12. Error Handling

The SDK emits 'hpp-error' events when verification fails.

Applications should listen for these events and handle them appropriately.

# 13. Example Error Handling

document.addEventListener('hpp-error', (e) =\> {

console.error('HPP verification failed:', e.detail)

})

# 14. Session Handling

Once a presence certificate is issued, the extension maintains a local session.

Subsequent verification requests can reuse the active session until expiry.

# 15. Local Development

Use the reference verifier server provided with the SDK.

Run the verifier using Docker or Node.

Configure your callback endpoint to receive certificate payloads.

# 16. Deployment

Deploy the verifier server.

Publish the HPP SDK to your package registry.

Provide browser extension installation instructions for users.

Ensure HTTPS is enabled for all HPP endpoints.

# 17. Troubleshooting

If verification does not trigger, confirm the extension is installed.

Verify the site meta tags are present.

Check the browser console for HPP errors.

Confirm the verifier server is reachable.

# 18. Next Steps

Review the full Human Presence Protocol specification.

Integrate server-side verification libraries.

Explore advanced use cases such as transaction authorization and age verification.

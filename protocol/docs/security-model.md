# 1. Purpose

The purpose of this document is to define the security model and threat assumptions for the Human Presence Protocol (HPP).

HPP provides cryptographic proof that a human was present during a digital action by combining biometric verification, hardware bound authentication, and server signed presence certificates.

# 2. Security Objectives

Ensure that automated systems cannot produce valid presence certificates.

Bind presence verification to a real biometric interaction.

Prevent theft or replay of presence certificates.

Ensure relying party servers can independently verify certificates.

Prevent exposure of full certificates to page level JavaScript.

# 3. Trust Boundaries

Browser Page Context – untrusted JavaScript environment.

Browser Extension – trusted execution environment for verification.

Verifier Server – trusted authority that signs presence certificates.

Relying Party Server – entity validating certificates before authorizing actions.

# 4. Threat Model Assumptions

Attackers may control page level JavaScript.

Attackers may attempt automated verification through bots.

Attackers may attempt replay of previously issued certificates.

Attackers may attempt interception of network traffic.

Attackers may attempt credential theft.

# 5. Primary Threat Classes

Automated bot interaction.

Replay attacks.

Certificate theft.

Credential spoofing.

Challenge manipulation.

Verifier impersonation.

# 6. Bot Automation Resistance

HPP requires biometric interaction through WebAuthn platform authenticators.

Each verification consumes human interaction time.

Automated scripts cannot produce authenticator signatures without biometric approval.

Biometric Spoofing Resistance: HPP inherits the biometric liveness guarantees of the platform authenticator. Apple Secure Enclave and TPM 2.0 modules perform their own biometric liveness detection before producing any assertion — HPP does not need to independently solve biometric liveness because the TEE provides this guarantee as part of its certification.

The attack surface for biometric spoofing against a Secure Enclave is bounded by the cost of attacking the secure enclave itself. Creating a synthetic fingerprint or face model that defeats Face ID or Touch ID requires physical access to the device, specialized materials, and often destructive reverse engineering of the TEE — orders of magnitude harder and more expensive than defeating a CAPTCHA. At scale, this cost makes bot-farm spoofing economically infeasible: each spoofed device requires a separate physical attack on a separate TEE.

# 7. Replay Attack Mitigation

Each verification requires a unique server issued challenge.

Challenges include expiration timestamps.

Challenge identifiers must be single use.

Relying party servers should reject reused challenge identifiers.

# 8. Certificate Theft Protection

Full certificates are delivered directly to the relying party backend.

Page JavaScript receives only minimal session metadata.

This prevents extraction through cross site scripting.

# 9. Hardware Binding

Presence verification relies on WebAuthn platform authenticators.

Authenticators protect private keys inside secure hardware.

Assertions are cryptographically bound to the authenticator.

# 10. Challenge Integrity

Challenges are signed by the verifier server.

Extensions must verify challenge signatures before performing verification.

Expired or invalid challenges must be rejected.

# 11. Verifier Authenticity

Presence certificates are signed by the verifier server.

Relying party servers must verify the server signature before accepting certificates.

# 12. Certificate Expiration

Certificates include an explicit expiration timestamp.

Extensions and relying parties must enforce expiration limits.

# 13. Network Security

All protocol communication must occur over HTTPS.

Certificate delivery endpoints must use TLS.

# 14. Extension Security

The extension isolates verification logic from page scripts.

Sensitive certificate data is stored in extension context only.

# 15. Remaining Risks

Compromise of verifier server signing keys.

Compromise of device hardware security modules.

User level coercion or social engineering.

Note: The biometric liveness assumption is explicitly delegated to the platform authenticator's own hardware certification (Apple CryptoKit Secure Enclave Attestation, Android Key Attestation, Windows TPM 2.0 Platform Credential). HPP enforces userVerification: 'required' (INV-1) and verifies the UV flag in both the content script and service worker (INV-2), ensuring that the platform authenticator has confirmed a genuine biometric interaction before any assertion reaches the verifier server.

# 16. Mitigation Strategies

Implement strong verifier key management.

Rotate verifier signing keys periodically.

Monitor verification volume for anomaly detection.

Provide revocation mechanisms for compromised credentials.

# 17. Security Summary

HPP provides strong resistance against automated interaction, replay attacks, and credential theft by requiring real biometric interaction and issuing signed presence certificates.

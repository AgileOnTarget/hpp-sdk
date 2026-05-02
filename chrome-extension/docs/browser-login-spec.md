# Author

Agile On Target LLC\
Human Presence Protocol Initiative

# 1. Abstract

Current web authentication and anti automation systems rely primarily on passwords, behavioral inference, and challenge response systems such as CAPTCHAs. These approaches attempt to infer human activity but remain probabilistic and increasingly vulnerable to automation, labor farms, and machine learning.

Human Presence Protocol (HPP) introduces a cryptographic mechanism for verifying that a human biometric event occurred and was consumed to authorize a digital action. Instead of inferring whether an actor is human, the relying party verifies a signed presence receipt produced by a verifier service.

This document describes a deployment model in which a browser extension enables websites to use HPP as a login and access control mechanism. The extension allows websites to require verifier signed proof of recent human presence before granting access to protected content, actions, or APIs.

# 2. Problem Statement

Modern websites face two persistent security challenges.

First, automated systems can perform actions at machine scale, enabling credential stuffing, spam, scraping, and fraud.

Second, user authentication systems place the burden of security on secret management, typically passwords or stored credentials.

CAPTCHAs and behavioral detection attempt to distinguish humans from automated systems but have three weaknesses.

They are probabilistic rather than deterministic.\
They impose cognitive burden on legitimate users.\
They can be bypassed through automation or labor outsourcing.

A deterministic verification of human presence would provide a stronger primitive for both login and abuse prevention.

# 3. System Overview

Human Presence Protocol introduces a new verification artifact called a Presence Receipt. The receipt is a signed cryptographic object confirming that a biometric event occurred on a hardware bound device and that the event was consumed to authorize a digital action within a defined time window.

In the browser extension deployment model, the components are:

Client Device\
A hardware bound device capable of biometric verification and non exportable signing operations.

HPP Verifier\
A service that issues challenges, validates device attestations, and produces signed presence receipts.

Browser Extension\
A Chrome extension that mediates the interaction between protected websites and the HPP verification process.

Relying Party Website\
A website or service that requires proof of human presence before granting access.

# 4. Presence Receipt Artifact

The Presence Receipt is the core verification object of the system. It is designed to function similarly to a signed authentication artifact such as a WebAuthn assertion.

A receipt contains:

receipt identifier\
challenge reference\
timestamp of issuance\
site origin binding\
attestation reference hash\
verifier signature

The receipt is signed by the verifier and can be validated independently by the relying party using the verifier public key.

# 5. Browser Extension Role

The browser extension provides a standardized mechanism for websites to request and receive proof of human presence.

The extension performs the following functions.

Detection of HPP requirement

A webpage signals that HPP verification is required using a header, API call, or page metadata.

Challenge mediation

The extension requests a challenge from the verifier and presents a verification prompt to the user.

Receipt delivery

After verification, the extension delivers the signed Presence Receipt to the relying party.

The extension does not store biometric data or device identifiers.

# 6. Authentication Flow

The HPP browser login flow proceeds as follows.

Step 1\
User navigates to a protected webpage.

Step 2\
The site indicates that HPP verification is required.

Step 3\
The browser extension requests a challenge from the verifier.

Step 4\
The extension prompts the user to confirm presence using a registered biometric device.

Step 5\
The device signs the challenge using a hardware bound private key.

Step 6\
The verifier validates the attestation and issues a signed Presence Receipt.

Step 7\
The browser extension delivers the receipt to the relying party.

Step 8\
The relying party verifies the receipt signature and grants access.

# 7. Security Properties

The architecture provides several security properties relevant to both authentication and abuse prevention.

Each accepted digital action corresponds to a biometric event that actually occurred.

Automation cannot produce valid receipts without triggering biometric verification on hardware bound devices.

Receipts are signed artifacts and can be verified independently by the relying party.

Replay attacks are prevented through challenge binding and time constrained receipt validity.

The system removes the need for passwords and reduces the attack surface associated with credential storage.

# 8. Privacy Properties

The design minimizes disclosure of personal information.

The relying party receives proof that a human event occurred but does not receive biometric data, device identifiers, or persistent identity attributes.

The verifier does not disclose user identity to the relying party.

The browser extension acts only as a mediator for receipt exchange and does not persist sensitive user data.

# 9. Threat Model

The system is designed to resist the following attack classes.

Automated bot activity attempting to perform actions without human presence.

Replay attacks using previously issued receipts.

Credential theft attacks relying on compromised passwords.

Script based automation attempting to simulate human interaction.

The system assumes that biometric verification and key protection on client devices are enforced by trusted hardware.

# 10. Deployment Model

The browser extension model allows incremental adoption.

Websites can require HPP verification for specific pages, actions, or APIs without modifying existing authentication systems.

Example deployment scenarios include:

login without passwords\
posting or commenting permissions\
rate limited API access\
premium content gating\
age restricted content access

# 11. Chrome Extension Considerations

The extension can be implemented using the standard Chrome extension architecture.

Key considerations include:

secure communication with verifier endpoints\
strict origin binding between receipt and requesting website\
minimal permissions to reduce attack surface\
clear user consent prompts during verification

The extension should avoid persistent identifiers and should minimize storage of sensitive information.

# 12. Relationship to Existing Standards

HPP complements rather than replaces existing web authentication systems.

WebAuthn provides device bound authentication.\
TLS secures network communication.\
HPP introduces a primitive for verifying recent human presence.

In practice, HPP may be deployed alongside WebAuthn or other authentication mechanisms.

# 13. Security and Abuse Analysis

Bot Farms\
Bot farms rely on automated scripts or human labor solving CAPTCHAs at scale. HPP forces each accepted action to consume a biometric event on a hardware bound device. This makes industrial scale automation economically expensive and operationally slow.

CAPTCHA Solving Services\
Traditional CAPTCHA solving services outsource the challenge to low cost human labor. HPP removes the challenge solving step entirely and instead requires a biometric gated signing event tied to a secure hardware device, preventing remote solution outsourcing.

AI Automation\
Machine learning systems can simulate user interaction but cannot generate hardware bound biometric attestations without access to the device and biometric confirmation. This constrains AI automation to the rate of real human interaction.

Device Theft\
If a device is stolen, biometric verification and secure enclave protections remain required for signing operations. Systems may also implement device revocation and key rotation through the verifier service.

Receipt Replay\
Presence Receipts are bound to challenges and constrained by issuance time windows. Relying parties verify freshness and challenge linkage, preventing reuse of receipts outside their intended session.

The combined effect is that each accepted action requires real human time expenditure, transforming large scale automated abuse from a computational problem into a biological throughput problem.

# 14. Conclusion

The browser extension model provides a practical mechanism for introducing deterministic proof of human presence into the web authentication ecosystem.

By replacing probabilistic bot detection and password based authentication with verifier signed presence receipts, Human Presence Protocol enables websites to require cryptographically verifiable human activity before granting access to protected resources.

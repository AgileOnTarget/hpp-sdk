# 1 Purpose

This document outlines the formal cryptographic model for the Human Presence Protocol and provides the structure of a security proof approach suitable for academic and standards review.

The goal is to define the security properties that HPP claims and the adversarial model under which those properties are evaluated.

# 2 Security Objective

The core objective of HPP is to guarantee that each accepted presence certificate corresponds to a real human biometric verification event.

The protocol must prevent an adversary from generating more valid certificates than the number of genuine biometric interactions performed.

# 3 Participants

Client verifier running inside a browser extension or native browser component.

Verifier server responsible for challenge issuance and certificate signing.

Relying party server verifying presence certificates.

Human user interacting with a biometric authenticator.

# 4 Cryptographic Primitives Used

Public key digital signatures.

Hardware bound authentication keys stored inside WebAuthn authenticators.

Secure hash functions for message integrity.

TLS for transport security.

# 5 Security Game Definition

The adversary interacts with the verifier server and client interface attempting to produce valid presence certificates.

The adversary wins the security game if the verifier accepts more presence certificates than the number of biometric events that actually occurred.

**Formal Game Structure**

Setup Phase: The challenger generates the verifier server signing key pair (sk_v, pk_v), the platform authenticator key pair (sk_a, pk_a) bound to the TEE, and publishes pk_v and pk_a. The adversary receives pk_v and pk_a.

Query Phase: The adversary has oracle access to: (1) Challenge Oracle — may request challenges for any rp_id, receiving (nonce, server_timestamp, window_ms, server_sig); (2) Observation Oracle — may observe all network messages between client and server; (3) Page Script Oracle — may execute arbitrary JavaScript in the page context. The adversary does NOT have access to: the TEE internal state, the platform authenticator private key sk_a, the verifier server private key sk_v, or the chrome.storage.session contents.

Challenge Phase: The adversary outputs a set of k attestation submissions to /v1/attest, each containing a valid nonce from a previously obtained challenge.

Win Condition: The adversary wins if the verifier server issues k valid presence certificates where k exceeds the number of genuine biometric verification events that occurred on any compliant platform authenticator during the game.

Interaction Model: The game is played in the standard model (not the random oracle model). The adversary controls the network between page and extension (but not the TLS channel to the verifier server). The adversary does not have access to a signing oracle for either sk_v or sk_a.

# 6 Adversary Capabilities

The adversary may control page level JavaScript.

The adversary may attempt replay of previous certificates.

The adversary may attempt automated verification attempts.

The adversary may intercept and replay network traffic.

# 7 System Constraints

Each biometric verification event requires physical user interaction.

Authenticators enforce user verification before producing signatures.

Challenges issued by the verifier server are unique and short lived.

# 8 Core Security Property

The number of accepted presence certificates must be bounded by the number of genuine biometric verification events.

# 9 Informal Security Bound

The H-Constant (H) is formally defined as the minimum wall-clock time required to complete one genuine biometric interaction on a compliant platform authenticator. This includes TEE activation latency, biometric sensor read time, and cryptographic signing within the secure enclave. If n represents the number of accepted certificates, the adversary must expend at least n × H units of irreducible human time. The server enforces this bound through the window_ms parameter: the server sets window_ms ≥ H_min, where H_min is derived from platform authenticator benchmarks (TPM 2.0 floor: ~800ms; Secure Enclave floor: ~600ms).

**Non-Parallelizable Human Time (NPHT)**

Unlike computational proofs of work, biological time cannot be parallelized. A proof-of-work system defending against bots can be defeated by an adversary who deploys more GPUs or ASICs — the cost function is computational and scales linearly with hardware investment. The H-Constant introduces a fundamentally different constraint: each presence certificate requires a sequential, physical biometric interaction that occupies exactly one human for at least H seconds.

Formally: for any adversary A with access to m computing devices and b biological agents, the maximum rate of valid certificate production is bounded by b/H certificates per second, independent of m. No amount of computational parallelism can increase this rate because the bottleneck is biological, not computational.

This property — Non-Parallelizable Human Time — is the core differentiator between HPP and all computational proof systems. The companion H-Constant paper provides the full formal treatment; this document is the engineering instantiation of that proof.

Connection to window_ms: The verifier server enforces NPHT by setting window_ms in each challenge response. Any attestation submission arriving before server_timestamp + window_ms must have been initiated before the challenge was issued (clock skew notwithstanding, bounded by max_clock_skew_ms from server config). This creates an auditable, server-authoritative enforcement of the biological time floor.

# 10 Certificate Integrity

Presence certificates are signed by the verifier server using a private signing key.

Relying party servers verify this signature before accepting certificates.

# 11 Replay Resistance

Each verification challenge contains a unique identifier.

Relying parties must reject certificates derived from reused challenges.

# 12 Session Handling

The extension may cache short lived sessions derived from presence certificates.

Session reuse must respect certificate expiration.

# 13 Proof Strategy Outline

Define a security game between an adversary and the verification system.

Show that any successful adversary must produce authenticator signatures bound to unique challenges.

Demonstrate that producing those signatures requires genuine biometric interactions.

# 14 Security Reduction

If an adversary can generate valid presence certificates without performing biometric verification, then either the authenticator security model or the digital signature scheme must be broken.

# 15 Limitations

The protocol assumes secure authenticators that enforce biometric verification.

The protocol assumes verifier signing keys are protected.

# 16 Future Work

Formalizing the security game in a peer reviewed cryptographic model.

Independent analysis by security researchers.

Possible inclusion of time bound resource proofs.

# 17 Summary

The Human Presence Protocol attempts to formalize a security property not currently provided by internet protocols: cryptographic proof that a human interaction occurred.

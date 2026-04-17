# Architecture — Human Presence Protocol (HPP)

This document describes the high-level architecture of the Human Presence Protocol (HPP) and the relationships between its components.

HPP is designed as a minimal, layered system that introduces verifiable human presence as a first-class network primitive.

---

## Architectural Overview

HPP consists of three primary logical components:

- Client Device
- Verifier Service
- Relying Party

These components interact to produce and consume verifiable attestations of biological presence.

HPP does not define application logic. HPP defines presence.

---

## Component Roles

### Client Device

The client device is responsible for:

- Generating a device-bound cryptographic key pair inside secure hardware
- Requesting biometric verification from the operating system
- Producing signed Pulse attestations

The private key never leaves secure hardware.

### Verifier Service

The Verifier Service is responsible for:

- Issuing epoch-bound nonces
- Verifying Pulse signatures
- Enforcing one Pulse per Epoch
- Maintaining continuity state
- Answering continuity queries

The Verifier Service does not learn biometric data.

### Relying Party

The Relying Party is any application or service that:

- Queries continuity assertions
- Uses continuity thresholds for gating actions

Relying Parties never receive Pulses or biometric information.

---

## Data Flow

1. Device enrolls and registers public key
2. Device requests epoch nonce
3. User performs biometric authentication
4. Secure hardware signs Pulse
5. Device submits Pulse to Verifier
6. Verifier updates continuity state
7. Relying Party queries continuity

---

## Layering

HPP is orthogonal to existing layers.

```
Applications
Application Protocols (HTTP, SMTP, SIP, etc.)
HPP (Layer 8: Presence)
Transport (TCP/UDP)
Internet (IP)
Link
Physical
```

HPP does not replace identity, authentication, or authorization systems. It supplements them.

---

## State Model

Continuity state per device consists of:

- Device public key
- Last Pulse epoch
- Continuity Score
- Grace state
- Bleed state

Minimal persistent state is intentional.

---

## Trust Boundaries

- Secure hardware boundary (TEE)
- Verifier Service boundary
- Relying Party boundary

No component fully trusts another. Each verifies independently.

---

## Failure Modes

- Device offline → no Pulse → decay
- Verifier unavailable → Pulse submission fails → decay
- Clock skew → nonce rejection

Failures bias toward loss of continuity rather than false continuity.

---

## Scalability

HPP scales horizontally:

- Stateless nonce issuance
- Sharded continuity storage
- Read-heavy query paths

Design goal: billions of devices.

---

## Privacy Posture

- No raw biometrics
- Pseudonymous keys
- Presence only

Identity systems remain external.

---

## Extensibility

Future extensions may add:

- Zero-knowledge threshold proofs
- Multi-device continuity
- Federated verifiers

Core architecture remains stable.

---

## Architectural Philosophy

Small core. Hard edges. Slow evolution.

HPP is designed to survive adversarial pressure and decades of technological change.

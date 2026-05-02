# Verifier Keys & Genesis Epoch — Human Presence Protocol (HPP)

This document defines how verifier signing keys are created, published, rotated, and how the Genesis Epoch of an HPP network is established.

It establishes the initial root of trust for an HPP deployment.

---

## 1. Purpose

HPP relies on verifier-signed receipts and assertions. All such signatures must chain to a known verifier public key.

This document defines:

- How the first verifier public key is published
- How the Genesis Epoch is timestamped
- How additional keys are rotated and announced

---

## 2. Terminology

- **Genesis Verifier Key:** The first public signing key trusted by an HPP network.
- **Genesis Epoch:** The first epoch for which Pulses and receipts are considered valid.
- **Key Manifest:** A signed document listing active verifier public keys.

---

## 3. Genesis Verifier Key Generation

At network launch:

1. Generate an asymmetric signing key pair using a modern scheme (Ed25519 recommended).
2. Store private key inside an HSM or cloud KMS.
3. Derive public key.

The private key MUST never leave protected hardware.

---

## 4. Genesis Key Publication

The Genesis Verifier Public Key MUST be published in at least three independent locations:

1. In the GitHub repository as `GENESIS_KEY.txt`
2. On the official project website
3. Embedded in the first release of reference verifier software

The published file format:

```
hpp_genesis_key_v1
verifier_key_id=vkey_2026_01
algorithm=ed25519
public_key_base64=BASE64KEY...
created_at=2026-02-06T00:00:00Z
```

This file MUST be immutable.

---

## 5. Genesis Epoch Definition

The Genesis Epoch is defined as the first UTC day after public release of the Genesis Key.

Example:

- Genesis Key published: 2026-02-06T00:00:00Z
- Genesis Epoch start: 2026-02-07T00:00:00Z
- epoch_id: `2026-02-07`

All Pulses before Genesis Epoch MUST be rejected.

---

## 6. Trust Bootstrap Rule

Clients and relying parties MUST:

- Trust only receipts signed by keys listed in a valid Key Manifest
- Trust the Genesis Key implicitly for bootstrapping

---

## 7. Key Manifest

A Key Manifest is a signed list of active verifier keys.

Filename: `KEY_MANIFEST.json`

Format:

```json
{
  "manifest_version": 1,
  "verifier_base_url": "https://api.hpp.example",
  "generated_at": 1760142328,
  "keys": [
    {
      "verifier_key_id": "vkey_2026_01",
      "alg": "ed25519",
      "public_key_base64": "BASE64...",
      "status": "active",
      "not_before": 1760142328,
      "not_after": 1791678328
    }
  ],
  "manifest_signature": {
    "verifier_key_id": "vkey_2026_01",
    "signature_base64": "BASE64..."
  }
}
```

The manifest is signed using an active verifier key.

---

## 8. Key Rotation

When rotating keys:

1. Generate new key pair.
2. Add new key to Key Manifest with status `active`.
3. Sign manifest with an existing active key.
4. Publish updated manifest.
5. Begin issuing receipts with new key.
6. Retain old key as `active` until all clients have updated.

Receipts MUST include `verifier_key_id`.

---

## 9. Key Revocation

If a key is compromised:

1. Publish new manifest marking compromised key as `revoked`.
2. Sign manifest with an uncompromised active key.
3. Clients MUST reject receipts signed by revoked keys.

If Genesis Key is compromised: a new genesis must be declared publicly. This is catastrophic but survivable with transparent disclosure.

---

## 10. Client Behavior

Clients MUST:

- Cache latest Key Manifest
- Verify manifest signature
- Use manifest to select public key for receipt verification
- Fail closed if no trusted key is available

---

## 11. Security Considerations

- Genesis Key publication must be highly visible and verifiable
- Operators should use hardware-backed key storage
- Short-lived operational keys reduce blast radius

---

## 12. Summary

Genesis Key establishes trust.
Genesis Epoch establishes time.

Together they form the root of the HPP universe.

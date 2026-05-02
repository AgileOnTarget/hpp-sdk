# Migration and Recovery Specification — Human Presence Protocol (HPP)

**Version 1**

---

## Scope

This document defines how a user migrates Human Presence Protocol continuity and credits from an old primary device to a new primary device while preserving the one-human-one-device constraint and resisting Sybil scaling.

This document covers:

- Normal migration when the old device is available
- Recovery when the old device is unavailable
- Revocation and theft response
- Attack resistance and operational expectations

---

## Definitions

- **Primary Device:** The single device public key currently authorized to generate Pulses for a given continuity record.
- **Continuity Record:** Verifier-maintained state keyed by a stable pseudonymous identifier representing a single human continuity timeline.
- **Migration:** A controlled transfer of Primary Device status from old device public key to new device public key.
- **Epoch Reset:** A verifier-enforced event that changes the Primary Device and starts a new continuity epoch context for the same continuity record.
- **Recovery:** A controlled re-establishment of Primary Device status without the old device signature.
- **Cooldown Window:** A verifier-enforced delay between recovery initiation and activation to deter rapid farming and theft.
- **Challenge Token:** A verifier-issued, short-lived, single-use token bound to a site origin and verifier base URL.

---

## Design Goals

- Preserve the one-device-per-human constraint
- Make migration easy when the user possesses the old device
- Make recovery possible when the user does not possess the old device, but slow and expensive enough to deter abuse
- Prevent replay and receipt resale across sites by binding to site origin and verifier base URL
- Provide deterministic audit artifacts via receipts

---

## Threat Model Summary

This spec assumes adversaries may:

- Farm many devices with coerced or paid biometrics
- Steal a device and attempt to keep continuity alive
- Try to migrate continuity to launder a farmed score
- Attempt parallel ownership by keeping old and new devices active

This spec does not attempt to solve coercion. It attempts to make scaling expensive and to provide crisp fail states.

---

## 5. Normal Migration Flow

### 5.1 Preconditions

- Old device is unlocked and can satisfy biometric prompt
- New device supports TEE and biometric prompt
- Both devices can reach the verifier during the migration window

### 5.2 Overview

Normal migration is a two-party atomic handoff:

1. Old device relinquishes
2. New device claims
3. Verifier commits the change atomically and issues a migration receipt

### 5.3 Endpoints

```
POST /v1/migration/start
POST /v1/migration/relinquish
POST /v1/migration/claim
GET  /v1/migration/status/{migration_id}
```

### 5.4 Start Migration

Client on new device requests a migration session.

**Request:**

```json
{
  "migration_version": 1,
  "continuity_record_hint": "optional string",
  "new_device_public_key": "BASE64...",
  "site_origin": "*",
  "issued_at": 1760142600
}
```

**Response:**

```json
{
  "migration_id": "mig_01HPP...",
  "challenge_token": "BASE64...",
  "challenge_expires_at": 1760142660,
  "verifier_time": 1760142602,
  "strict_window_seconds": 60,
  "verifier_base_url": "https://api.hpp.example",
  "site_origin": "*"
}
```

**Rules:**

- `challenge_token` MUST be single-use
- `challenge_token` MUST be bound to `site_origin` and `verifier_base_url`
- `challenge_token` MUST expire quickly (recommended: 60 seconds)

### 5.5 Relinquish on Old Device

Old device signs a relinquish statement under biometric confirmation.

**Request:**

```json
{
  "migration_version": 1,
  "migration_id": "mig_01HPP...",
  "old_device_public_key": "BASE64...",
  "new_device_public_key": "BASE64...",
  "challenge_token": "BASE64...",
  "client_confirmed_at": 1760142610,
  "issued_at": 1760142612,
  "biometric_success": true
}
```

Signed by old device private key.

### 5.6 Claim on New Device

New device signs a claim statement under biometric confirmation.

### 5.7 Verifier Commit

Verifier validates both signatures, atomically transfers Primary Device status, and issues a migration receipt.

---

## 6. Recovery Without Old Device

### 6.1 When Recovery Applies

- Old device is lost, stolen, or destroyed
- User cannot produce old device signature

### 6.2 Recovery Flow

1. New device initiates recovery request with biometric proof
2. Verifier imposes a cooldown window (recommended: 7 days minimum)
3. During cooldown, old device can contest the recovery
4. After cooldown, new device becomes Primary Device
5. Continuity Score is reduced (recommended: 50% penalty)

### 6.3 Rationale

The cooldown window and score penalty make recovery usable for legitimate users but expensive for attackers trying to launder farmed continuity.

---

## 7. Revocation and Theft Response

If a device is stolen:

1. User initiates recovery from a new device
2. Cooldown begins
3. Old device is immediately flagged — Pulses from old device during cooldown are quarantined
4. After cooldown, old device key is revoked

---

## 8. Security Properties

- Normal migration preserves full continuity (no penalty)
- Recovery imposes time delay and score penalty
- Parallel ownership is prevented — only one Primary Device at any time
- All migration and recovery events produce signed receipts for audit

---

## 9. Anti-Farming Properties

- Migration requires biometric on both devices
- Recovery requires cooldown (minimum 7 days)
- Score penalty on recovery prevents laundering farmed scores cheaply
- Device churn throttling (see Patent Family F) limits rapid cycling

---

## 10. Summary

Migration is easy when you have both devices.
Recovery is possible when you don't, but it costs you.

This is the correct tradeoff: convenience for honest users, friction for attackers.

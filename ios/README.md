# HPP iOS SDK

Swift Package for embedding [Human Presence Protocol](https://github.com/AgileOnTarget/hpp-sdk) attestation directly in your iOS app.

The SDK manages a Secure Enclave–backed P-256 key, runs the biometric fallback chain (Face ID → Touch ID → passcode), assembles the canonical HPP-Proof JWT, and submits it to your verifier of choice. You get back a `session_token` and `receipt_id` you can hand to your backend.

- **Platforms:** iOS 17+
- **Language:** Swift 5.9+
- **License:** Apache 2.0 (see repo root)
- **Patents:** USPTO Customer No. 224891 — see [`PATENT-NOTICE.md`](../PATENT-NOTICE.md) and [`PATENT-POLICY.md`](../PATENT-POLICY.md) at the repo root.

## Install

In Xcode: **File → Add Package Dependencies…** and paste:

```
https://github.com/AgileOnTarget/hpp-sdk
```

When prompted, set the package's source path to `ios/` (this is a multi-language monorepo; the Swift Package manifest lives at `ios/Package.swift`).

Or, in your own `Package.swift`:

```swift
.package(url: "https://github.com/AgileOnTarget/hpp-sdk", branch: "main"),
```

with a target dependency:

```swift
.product(name: "HPP", package: "hpp-sdk"),
```

## Usage

```swift
import HPP

let client = HPPClient(configuration: HPPConfiguration(
    verifierURL: URL(string: "https://hpp-verifier.onrender.com")!,
    site: "example.com"
))

do {
    let result = try await client.attest(reason: "Verify your presence to log in")
    // result.sessionToken — send to your backend
    // result.receiptId   — UUID of the on-chain receipt
    // result.assurance   — .faceID / .touchID / .passcode
    // result.publicKeyFingerprint — stable per-device id
} catch HPPError.biometricCancelled {
    // user dismissed Face ID
} catch HPPError.verifierColdStart {
    // verifier is warming up — retry after a few seconds
} catch HPPError.verificationRejected(let code, let reason) {
    // structured rejection from /verify (NONCE_USED, REPLAY_DETECTED, etc.)
    print("\(code): \(reason)")
}
```

### Browser-relay flow

If your relying party rendered an HPP welcome gate (the verifier's `GET /qr?relay_id=...` flow), pass the relay ID along after a successful attestation so the browser's poll picks it up:

```swift
let result = try await client.attest(reason: "Unlock site")
try await client.depositToRelay(result, relayId: scannedRelayId)
```

`depositToRelay` is best-effort: it returns silently on a 404 (relay expired) or 401 (token rejected) so the user-facing flow stays unbroken.

### Working with the device key

```swift
// Has a key already been generated on this device?
let exists = await client.keyExists

// Public key, base64url, X9.63 — for backend pre-registration.
let pubKey = try await client.publicKeyB64URL()

// Compact 8-character fingerprint, stable across attestations.
let fp = try await client.publicKeyFingerprint()

// Forget the key (e.g. on sign-out). Next attest() generates a fresh one.
await client.deleteKey()
```

## Requirements

- A physical iPhone or iPad with a Secure Enclave (iPhone 5s and later). The Simulator does **not** have one and `attest(...)` will throw `HPPError.secureEnclaveUnavailable`.
- Face ID, Touch ID, or a device passcode enrolled.
- Your `Info.plist` must include `NSFaceIDUsageDescription` if your device has Face ID.

## What this SDK does NOT do

- It does not display any UI. Bring your own SwiftUI / UIKit screens; the SDK only runs the system biometric prompt.
- It does not validate the verifier's session token — that is your backend's job, against the verifier's public chain (`GET /receipt/:receipt_id`).
- It does not poll relays, render QR codes, or implement the browser-side gate. Those live in the [`website/`](../website/) drop-in and the verifier itself.

## Wire compatibility

The SDK targets the shipping HPP verifier API:

| Step | Method, path | Notes |
|---|---|---|
| 1 | `POST /challenge` | body `{ "hpp_ver": "1.0" }` → `{ nonce, epoch, site, challenge_id }` |
| 2 | `POST /verify` | `Authorization: Bearer <ES256 HPP-Proof JWT>`, body `{}` → `{ session_token, receipt_id }` |
| 3 | `POST /relay/:id` | best-effort, body `{ session_token }` → 200 / 401 / 404 |

The proof JWT carries `hpp_ver: "2.0"` in its payload — that's a fixed protocol constant.

## Tests

```sh
xcodebuild -scheme HPP \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  test
```

Pure-logic tests run in the Simulator (Base64URL, JWT structure, configuration). Secure Enclave + biometric tests require a physical device and live in the demo app, not in this package.

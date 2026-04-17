# iOS SDK — Phase 2

The iOS SDK is the **HPP-CORE Services layer extracted as a Swift Package**, so that any iOS app can add hardware-bound presence attestation with a few lines of code.

> **Status: Phase 2 (planned).** The reference implementation already runs in production as part of the `HPPDemo` app. The package extraction has not yet shipped. This README documents what's coming and what to use in the meantime.

---

## What the package will contain

| Module | Purpose | Currently lives in |
|---|---|---|
| `HPPCore.SecureEnclaveKeyManager` | P-256 key generation in the Secure Enclave + signing API + diagnostic non-exportability check | `HPPDemo/Services/SecureEnclaveKeyManager.swift` |
| `HPPCore.BiometricAuthManager` | Face ID → Touch ID → Passcode three-tier fallback | `HPPDemo/Services/BiometricAuthManager.swift` |
| `HPPCore.AttestationService` | Orchestrator: POST /challenge → biometric → SE sign → POST /verify → session token | `HPPDemo/Services/AttestationService.swift` |
| `HPPCore.AgePredicateStore` | On-device DOB persistence + age-predicate evaluator (raw DOB never leaves device) | `HPPDemo/Services/AgePredicateStore.swift` |
| `HPPCore.SessionStore` | Multi-session state machine with TTL and disconnect | `HPPDemo/Services/SessionStore.swift` |
| `HPPSchemas.AttestationPayload` | Codable model for the signed JWT payload | `HPPDemo/Models/AttestationPayload.swift` |
| `HPPSchemas.ReceiptSummary` | Codable model for receipts returned by `GET /receipts/:pubkey` | `HPPDemo/ReceiptHistoryView.swift` (`ReceiptSummary`) |

The package will follow the **Swift Package Manager** convention — drop-in via `Package.swift`:

```swift
// Package.swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    dependencies: [
        .package(url: "https://github.com/AgileOnTarget/hpp-sdk", from: "0.2.0"),
    ],
    targets: [
        .target(name: "MyApp", dependencies: [
            .product(name: "HPPCore", package: "hpp-sdk"),
            .product(name: "HPPSchemas", package: "hpp-sdk"),
        ]),
    ]
)
```

---

## Quick-start (anticipated v0.2.0 API)

```swift
import HPPCore

// 1. Get the SE key (created on first call)
let manager = SecureEnclaveKeyManager()
let key = try manager.getOrCreateKey()

// 2. Run the protocol — orchestrator handles biometric prompt + signing + relay
let attestation = AttestationService(verifier: URL(string: "https://hpp-verifier.onrender.com")!)
let token = try await attestation.attest(
    site: "example.com",
    relayId: "your-relay-id-from-the-challenge-step"
)
print("Session token:", token.value)
print("Receipt id:", token.receiptID)
```

---

## Until Phase 2 ships

The reference implementation is the live `HPPDemo` app in the parent project. The `Services/` folder there is the source of truth for the SDK's behaviour; it just hasn't been extracted into a redistributable package yet.

If you want to integrate HPP into your iOS app today:

1. **Read the reference implementation** in [`HPPDemo/Services/`](https://github.com/AgileOnTarget/hpp-verifier) (currently part of the parent monorepo)
2. **Inspect the live key non-exportability diagnostic** in the `HPPDemo` app: Settings → About HPP → Inside HPP → Key Proof tab. The diagnostic shows the public key, the opaque private-key handle, and a live signature — proves the surface works on a physical iPhone with a Secure Enclave
3. **Talk to the verifier** using the canonical OpenAPI spec at [`../protocol/openapi.yaml`](../protocol/openapi.yaml) (or directly against the production reference verifier, which uses an MVP precursor naming — see the [`../protocol/README.md`](../protocol/README.md) note about production vs canonical)

---

## Phase 2 plan

1. Create `Package.swift` at this directory's root
2. Move (or copy + link) the `HPPDemo/Services/` files into `Sources/HPPCore/`
3. Move models into `Sources/HPPSchemas/`
4. Surface a clean public API — internal helpers stay `internal`
5. Carve out `Tests/HPPCoreTests/` from the existing `PCSCalculatorTests.swift` and grow from there
6. Add `Examples/QuickStart/` — a 30-line "drop into your app" iOS sample
7. Refactor the `HPPDemo` app to depend on the local Swift Package (or maintain duplication initially while the package matures)
8. Tag `v0.2.0` and submit to the [Swift Package Index](https://swiftpackageindex.com/)

The work is mechanical (extraction, not invention). Expected effort: 1–2 substantial work sessions.

---

## Privacy & security guarantees the package carries forward

These are **load-bearing** properties of the iOS implementation that any extraction must preserve:

- **Private key never leaves the Secure Enclave.** No API in `HPPCore` exposes the private key. The non-exportability is testable via the live diagnostic in the `HPPDemo` app.
- **Biometric data never leaves Apple's LocalAuthentication framework.** `HPPCore.BiometricAuthManager` receives only a pass/fail result.
- **DOB stored locally in UserDefaults; only `age_qualified` boolean transmitted.** `HPPCore.AgePredicateStore` enforces this at the API surface.
- **License-scan OCR runs on-device via Apple's Vision framework.** Image is parsed in memory and discarded immediately. (This currently lives in `HPPDemo/DateOfBirthView.swift`'s `LicenseScannerSheet`; will be extracted to `HPPCore.LicenseScannerSheet` in Phase 2.)

If a Phase 2 extraction breaks any of the above, the extraction is wrong — the test suite must catch it.


---

## License, patents, and trademarks

- **Code:** [Apache License, Version 2.0](../LICENSE). Copyright © 2026 Agile On Target LLC.
- **Patent scope:** [`../PATENT-NOTICE.md`](../PATENT-NOTICE.md) and [`../PATENT-POLICY.md`](../PATENT-POLICY.md). USPTO Customer No. 224891. All patent rights reserved by Agile On Target LLC; Apache 2.0 §3 grant is narrow and does not authorize commercial production deployment, OEM embedding, or ground-up reimplementation.
- **Trademarks:** `HPP` (USPTO Serial 99656390), `Human Presence Protocol` (Serial 99656359), + 3 others filed 2026-02-17 — see [`../NOTICE`](../NOTICE) and [`../PATENT-NOTICE.md §4`](../PATENT-NOTICE.md). Use `℠` or `™` (not `®` until registration issues).
- **Attribution:** [`../NOTICE`](../NOTICE), [`../AUTHORS`](../AUTHORS), [`../THIRD-PARTY-LICENSES.md`](../THIRD-PARTY-LICENSES.md).
- **Contributions:** governed by [`../CLA.md`](../CLA.md).

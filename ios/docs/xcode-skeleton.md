# HPP iOS Client — Xcode Project Skeleton


This document provides a complete code architecture reference for the HPP iOS client.
An Apple developer can use this to scaffold the real Xcode project in 30 minutes.

---

## 1. Project Structure

```
HPP/
├── Package.swift
├── Sources/
│   ├── HPPClient/
│   │   ├── HPPClient.swift                    // SDK entry point / facade
│   │   ├── Configuration.swift                // Base URL, timeouts, feature flags
│   │   └── HPPError.swift                     // Error types
│   ├── SecureEnclave/
│   │   ├── SecureEnclaveManager.swift         // Key generation, signing
│   │   ├── BiometricGate.swift                // Biometric verification wrapper
│   │   └── KeychainStore.swift                // Keychain CRUD operations
│   ├── Protocol/
│   │   ├── PulseManager.swift                 // Daily attestation flow
│   │   ├── BurnFlowController.swift           // QR scan + burn flow
│   │   ├── OfflineQueue.swift                 // Deferred Pulse queue
│   │   └── LedgerManager.swift                // Local hash chain ledger
│   ├── Networking/
│   │   ├── VerifierClient.swift               // HTTP client for all endpoints
│   │   ├── CertificatePinning.swift           // TLS pin validation
│   │   └── RetryPolicy.swift                  // Exponential backoff
│   ├── Models/
│   │   ├── DeviceIdentity.swift               // Device key pair metadata
│   │   ├── PulseRecord.swift                  // Pulse attestation record
│   │   ├── BurnRecord.swift                   // Burn transaction record
│   │   ├── Receipt.swift                      // Verifier receipt (ReceiptV1)
│   │   ├── CreditsLedger.swift                // Credits balance + history
│   │   ├── OfflineQueueEntry.swift            // Queued offline Pulse
│   │   ├── HashChainEntry.swift               // Ledger hash chain entry
│   │   ├── NonceResponse.swift                // Server nonce
│   │   ├── StatusResponse.swift               // Continuity + credits status
│   │   └── MigrationSession.swift             // Device migration state
│   └── Views/
│       ├── HPPRootView.swift                  // Tab container
│       ├── OnboardingView.swift               // First launch + enrollment
│       ├── BiometricPromptView.swift          // Face ID / Touch ID gate
│       ├── PulseView.swift                    // Daily attestation screen
│       ├── DashboardView.swift                // Score + credits display
│       ├── BurnScanView.swift                 // QR scanner
│       ├── BurnConfirmView.swift              // Burn amount + confirm
│       ├── BurnResultView.swift               // Success / failure
│       ├── ReceiptListView.swift              // Receipt history
│       ├── ReceiptDetailView.swift            // Single receipt detail
│       ├── SettingsView.swift                 // App settings
│       ├── MigrationView.swift                // Device migration flow
│       └── ErrorView.swift                    // Error states
├── Tests/
│   ├── SecureEnclaveTests.swift
│   ├── PulseManagerTests.swift
│   ├── BurnFlowTests.swift
│   ├── OfflineQueueTests.swift
│   ├── LedgerManagerTests.swift
│   ├── VerifierClientTests.swift
│   ├── CanonicalSigningTests.swift
│   └── HashChainTests.swift
└── Resources/
    ├── Info.plist
    ├── Config.plist                           // Per-environment configuration
    ├── CertificatePins.plist                  // TLS certificate pins
    └── Assets.xcassets/
```

---

## 2. Package.swift

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "HPP",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "HPPClient", targets: ["HPPClient"]),
    ],
    targets: [
        .target(
            name: "HPPClient",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "HPPTests",
            dependencies: ["HPPClient"],
            path: "Tests"
        ),
    ]
)
// Zero external dependencies. All crypto via Apple CryptoKit + Security framework.
```

---

## 3. Core Models (from 04B_14 Data Model Schemas)

```swift
// MARK: - DeviceIdentity.swift

struct DeviceIdentity: Codable {
    let devicePublicKey: String          // Base64-encoded P-256 public key
    let keyCreatedAt: Date               // Secure Enclave key generation time
    let enrolledAt: Date?                // Server enrollment confirmation time
    let appAttestKeyId: String?          // App Attest key ID (optional)
    let deviceModel: String              // e.g., "iPhone15,2"
    let osVersion: String                // e.g., "17.4"
    let appVersion: String               // e.g., "1.0.0"
    let enrollmentReceiptHash: String?   // Hash of enrollment receipt
}
```

```swift
// MARK: - PulseRecord.swift

struct PulseRecord: Codable {
    let pulseVersion: Int                // Always 1
    let devicePublicKey: String
    let epochId: String                  // "2026-03-31"
    let nonce: String                    // Base64, from verifier
    let clientConfirmedAt: String        // ISO8601, biometric success time
    let issuedAt: String                 // ISO8601, Pulse creation time
    let biometricSuccess: Bool           // Always true (false = no Pulse)
    let signature: String                // Base64, ECDSA P-256 over canonical string
    let siteOrigin: String?              // Optional origin binding
}
```

```swift
// MARK: - BurnRecord.swift

struct BurnRecord: Codable {
    let devicePublicKey: String
    let amount: Int                      // Credits to burn
    let siteOrigin: String               // Relying party origin
    let actionId: String                 // Unique per burn attempt (UUID)
    let nonce: String                    // From verifier
    let clientConfirmedAt: String
    let issuedAt: String
    let biometricSuccess: Bool
    let signature: String                // ECDSA over canonical burn string
    let prevBurnHash: String             // Hash chain link
    let receiptHash: String?             // Set after server confirmation
}
```

```swift
// MARK: - Receipt.swift (ReceiptV1)

struct ReceiptV1: Codable {
    let receiptVersion: Int              // 1
    let receiptId: String
    let receiptType: ReceiptType
    let status: String
    let devicePublicKey: String
    let epochId: String
    let nonce: String
    let issuedAt: String
    let clientConfirmedAt: String
    let submitReceivedAt: String
    let verifierTime: String
    let strictWindowSeconds: Int
    let verifierBaseUrl: String
    let siteOrigin: String?
    let scoreAfter: Int
    let creditsAfter: Int
    let deltaCredits: Int
    let prevReceiptHash: String
    let verifierKeyId: String
    let receiptHash: String              // SHA-256
    let receiptSignature: String         // Ed25519

    enum ReceiptType: String, Codable {
        case pulseAccept = "pulse_accept"
        case pulseReject = "pulse_reject"
        case burnAccept = "burn_accept"
        case burnReject = "burn_reject"
    }
}
```

```swift
// MARK: - HashChainEntry.swift (from 04A_20 Ledger Architecture)

struct HashChainEntry: Codable {
    let entryVersion: Int                // 1
    let entryIndex: Int                  // Sequential, starting at 1
    let prevEntryHash: String            // SHA-256 of previous entry (zeros for first)
    let entryTime: String                // ISO8601
    let eventType: EventType
    let eventId: String
    let epochId: String
    let deltaCredits: Int
    let cachedCreditsAfter: Int          // Must be >= 0
    let cachedScoreAfter: Int            // Must be >= 0
    let verifierReceiptHash: String?
    let verifierReceiptId: String?
    let siteOrigin: String?
    let verifierBaseUrl: String
    let note: String
    let entryHash: String                // SHA-256 of canonical string
    let deviceSignature: String          // ECDSA over entryHash

    enum EventType: String, Codable {
        case pulseSubmitted = "pulse_submitted"
        case receiptAccepted = "receipt_accepted"
        case receiptRejected = "receipt_rejected"
        case burnInitiated = "burn_initiated"
        case burnReceiptAccepted = "burn_receipt_accepted"
        case burnReceiptRejected = "burn_receipt_rejected"
        case epochMissed = "epoch_missed"
        case epochDecayApplied = "epoch_decay_applied"
        case epochCliffReset = "epoch_cliff_reset"
        case manualReset = "manual_reset"
    }
}
```

---

## 4. Protocol Definitions

```swift
// MARK: - SecureEnclaveManagerProtocol.swift

protocol SecureEnclaveManagerProtocol {
    /// Generate a new P-256 key pair in Secure Enclave with biometric gating
    func generateKeyPair() async throws -> DeviceIdentity

    /// Sign data with the Secure Enclave private key (triggers biometric)
    func sign(_ data: Data) async throws -> Data

    /// Get the public key as Base64 string
    func getPublicKey() throws -> String

    /// Check if a valid key pair exists
    var hasKeyPair: Bool { get }

    /// Delete the key pair (for migration/reset)
    func deleteKeyPair() throws
}
```

```swift
// MARK: - VerifierServiceProtocol.swift

protocol VerifierServiceProtocol {
    func checkHealth() async throws -> HealthResponse
    func fetchKeys() async throws -> KeyManifest
    func enroll(identity: DeviceIdentity) async throws -> EnrollResponse
    func requestNonce(devicePublicKey: String, siteOrigin: String?) async throws -> NonceResponse
    func submitPulse(_ pulse: PulseRecord) async throws -> ReceiptV1
    func getStatus(devicePublicKey: String) async throws -> StatusResponse
    func submitBurn(_ burn: BurnRecord) async throws -> ReceiptV1
    func startMigration(newDevicePublicKey: String) async throws -> MigrationSession
    func relinquish(migration: MigrationSession, signature: Data) async throws
    func claimMigration(migration: MigrationSession, signature: Data) async throws -> MigrationResult
}
```

```swift
// MARK: - HPPClientProtocol.swift

protocol HPPClientProtocol {
    /// Initialize and enroll if needed
    func initialize() async throws

    /// Perform daily Pulse (biometric + sign + submit)
    func pulse() async throws -> ReceiptV1

    /// Initiate burn from QR code data
    func burn(qrPayload: Data) async throws -> ReceiptV1

    /// Get current status (cached or fresh)
    func status() async throws -> StatusResponse

    /// Sync offline queue
    func syncOfflineQueue() async throws -> [ReceiptV1]

    /// Start device migration (from new device)
    func startMigration() async throws -> MigrationSession

    /// Relinquish device (from old device)
    func relinquish(migrationId: String) async throws

    /// Current enrollment state
    var isEnrolled: Bool { get }

    /// Current credits balance (cached)
    var creditsBalance: Int { get }

    /// Current continuity score (cached)
    var continuityScore: Int { get }
}
```

---

## 5. Key Implementation Skeletons

```swift
// MARK: - SecureEnclaveManager.swift

import Security
import CryptoKit
import LocalAuthentication

final class SecureEnclaveManager: SecureEnclaveManagerProtocol {

    private let keyTag = "com.hpp.device.signing.key"

    func generateKeyPair() async throws -> DeviceIdentity {
        // 1. Create access control: biometryCurrentSet + privateKeyUsage
        guard let access = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.biometryCurrentSet, .privateKeyUsage],
            nil
        ) else { throw HPPError.secureEnclaveUnavailable }

        // 2. Define key attributes
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: keyTag.data(using: .utf8)!,
                kSecAttrAccessControl as String: access,
            ] as [String: Any]
        ]

        // 3. Generate key pair
        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            throw HPPError.secureEnclaveUnavailable
        }

        // 4. Extract public key
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            throw HPPError.secureEnclaveUnavailable
        }

        // 5. Export public key as Base64
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
            throw HPPError.secureEnclaveUnavailable
        }

        return DeviceIdentity(
            devicePublicKey: publicKeyData.base64EncodedString(),
            keyCreatedAt: Date(),
            enrolledAt: nil,
            appAttestKeyId: nil,
            deviceModel: deviceModel(),
            osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0",
            enrollmentReceiptHash: nil
        )
    }

    func sign(_ data: Data) async throws -> Data {
        // Retrieve private key from Keychain (triggers Face ID)
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: keyTag.data(using: .utf8)!,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let privateKey = item else {
            throw HPPError.signatureFailure
        }

        // Sign with ECDSA
        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey as! SecKey,
            .ecdsaSignatureMessageX962SHA256,
            data as CFData,
            &error
        ) as Data? else {
            throw HPPError.signatureFailure
        }

        return signature
    }

    // ... getPublicKey(), hasKeyPair, deleteKeyPair()
}
```

```swift
// MARK: - PulseManager.swift

final class PulseManager {

    private let secureEnclave: SecureEnclaveManagerProtocol
    private let verifier: VerifierServiceProtocol
    private let ledger: LedgerManager
    private let offlineQueue: OfflineQueue

    func generatePulse() async throws -> ReceiptV1 {
        // 1. Request nonce from verifier
        let publicKey = try secureEnclave.getPublicKey()
        let nonce = try await verifier.requestNonce(devicePublicKey: publicKey, siteOrigin: nil)

        // 2. Build canonical Pulse string
        let pulse = PulseRecord(
            pulseVersion: 1,
            devicePublicKey: publicKey,
            epochId: nonce.epoch,
            nonce: nonce.nonce,
            clientConfirmedAt: ISO8601DateFormatter().string(from: Date()),
            issuedAt: ISO8601DateFormatter().string(from: Date()),
            biometricSuccess: true,
            signature: "",  // Placeholder — signed below
            siteOrigin: nil
        )

        // 3. Compute canonical string and sign (triggers Face ID)
        let canonicalString = pulse.canonicalString()
        let signatureData = try await secureEnclave.sign(canonicalString.data(using: .utf8)!)

        // 4. Submit signed Pulse
        var signedPulse = pulse
        signedPulse.signature = signatureData.base64EncodedString()

        do {
            let receipt = try await verifier.submitPulse(signedPulse)
            try ledger.appendEntry(for: .receiptAccepted, receipt: receipt)
            return receipt
        } catch HPPError.networkUnreachable {
            try offlineQueue.enqueue(signedPulse)
            throw HPPError.networkUnreachable
        }
    }

    func scheduleDailyReminder() {
        // Use BGAppRefreshTask for background scheduling
        // See 04B_04 Section 9 for BGTaskScheduler configuration
    }
}
```

```swift
// MARK: - BurnFlowController.swift

final class BurnFlowController {

    private let secureEnclave: SecureEnclaveManagerProtocol
    private let verifier: VerifierServiceProtocol
    private let ledger: LedgerManager

    struct QRPayload: Codable {
        let siteOrigin: String
        let amount: Int
        let actionDescription: String
    }

    func scanQR(_ data: Data) throws -> QRPayload {
        return try JSONDecoder().decode(QRPayload.self, from: data)
    }

    func initiateBurn(payload: QRPayload) async throws -> ReceiptV1 {
        let publicKey = try secureEnclave.getPublicKey()

        // 1. Request nonce
        let nonce = try await verifier.requestNonce(
            devicePublicKey: publicKey, siteOrigin: payload.siteOrigin)

        // 2. Build burn record
        let burn = BurnRecord(
            devicePublicKey: publicKey,
            amount: payload.amount,
            siteOrigin: payload.siteOrigin,
            actionId: UUID().uuidString,
            nonce: nonce.nonce,
            clientConfirmedAt: ISO8601DateFormatter().string(from: Date()),
            issuedAt: ISO8601DateFormatter().string(from: Date()),
            biometricSuccess: true,
            signature: "",
            prevBurnHash: ledger.lastBurnHash,
            receiptHash: nil
        )

        // 3. Sign (triggers Face ID)
        let canonicalString = burn.canonicalString()
        let sig = try await secureEnclave.sign(canonicalString.data(using: .utf8)!)
        var signed = burn
        signed.signature = sig.base64EncodedString()

        // 4. Submit — burns are NEVER queued offline
        let receipt = try await verifier.submitBurn(signed)
        try ledger.appendEntry(for: .burnReceiptAccepted, receipt: receipt)
        return receipt
    }
}
```

```swift
// MARK: - OfflineQueue.swift

final class OfflineQueue {

    private let maxEntries = 7  // 7 days of offline Pulses
    private let storageKey = "hpp.offline.queue"

    func enqueue(_ pulse: PulseRecord) throws {
        var queue = loadQueue()
        if queue.count >= maxEntries {
            queue.removeFirst()  // Drop oldest
        }
        queue.append(OfflineQueueEntry(
            pulse: pulse,
            queuedAt: Date(),
            retryCount: 0
        ))
        saveQueue(queue)
    }

    func sync(
        secureEnclave: SecureEnclaveManagerProtocol,
        verifier: VerifierServiceProtocol
    ) async throws -> [ReceiptV1] {
        var queue = loadQueue()
        var receipts: [ReceiptV1] = []

        for (index, entry) in queue.enumerated() {
            // Each queued Pulse needs a FRESH nonce (old one expired)
            let nonce = try await verifier.requestNonce(
                devicePublicKey: entry.pulse.devicePublicKey, siteOrigin: nil)

            // Re-sign with new nonce (triggers biometric)
            var updatedPulse = entry.pulse
            updatedPulse.nonce = nonce.nonce
            updatedPulse.issuedAt = ISO8601DateFormatter().string(from: Date())

            let canonical = updatedPulse.canonicalString()
            let sig = try await secureEnclave.sign(canonical.data(using: .utf8)!)
            updatedPulse.signature = sig.base64EncodedString()

            let receipt = try await verifier.submitPulse(updatedPulse)
            receipts.append(receipt)
            queue[index].synced = true
        }

        queue.removeAll { $0.synced }
        saveQueue(queue)
        return receipts
    }

    func prune() {
        var queue = loadQueue()
        let cutoff = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        queue.removeAll { $0.queuedAt < cutoff }
        saveQueue(queue)
    }
}
```

```swift
// MARK: - LedgerManager.swift (from 04A_20 Ledger Architecture)

final class LedgerManager {

    private let secureEnclave: SecureEnclaveManagerProtocol
    private var entries: [HashChainEntry] = []

    var lastBurnHash: String {
        entries.last(where: { $0.eventType == .burnReceiptAccepted })?.entryHash ?? String(repeating: "0", count: 64)
    }

    func appendEntry(for eventType: HashChainEntry.EventType, receipt: ReceiptV1) throws {
        let prevHash = entries.last?.entryHash ?? String(repeating: "0", count: 64)
        let index = entries.count + 1

        let entry = HashChainEntry(
            entryVersion: 1,
            entryIndex: index,
            prevEntryHash: prevHash,
            entryTime: ISO8601DateFormatter().string(from: Date()),
            eventType: eventType,
            eventId: receipt.receiptId,
            epochId: receipt.epochId,
            deltaCredits: receipt.deltaCredits,
            cachedCreditsAfter: receipt.creditsAfter,
            cachedScoreAfter: receipt.scoreAfter,
            verifierReceiptHash: receipt.receiptHash,
            verifierReceiptId: receipt.receiptId,
            siteOrigin: receipt.siteOrigin,
            verifierBaseUrl: receipt.verifierBaseUrl,
            note: "",
            entryHash: "",      // Computed below
            deviceSignature: "" // Computed below
        )

        // Compute canonical string → SHA-256 → sign
        let canonical = entry.canonicalString()  // hpp_ledger_v1 format
        let hash = SHA256.hash(data: canonical.data(using: .utf8)!)
        let hashString = hash.map { String(format: "%02x", $0) }.joined()

        var finalEntry = entry
        finalEntry.entryHash = hashString
        // Sign requires async — caller must handle

        entries.append(finalEntry)
        persistToDisk()
    }

    func verifyChain() throws -> Bool {
        for (i, entry) in entries.enumerated() {
            // 1. Recompute canonical string
            let canonical = entry.canonicalString()
            let expectedHash = SHA256.hash(data: canonical.data(using: .utf8)!)
                .map { String(format: "%02x", $0) }.joined()

            guard entry.entryHash == expectedHash else { return false }

            // 2. Verify chain link
            if i > 0 {
                guard entry.prevEntryHash == entries[i-1].entryHash else { return false }
            } else {
                guard entry.prevEntryHash == String(repeating: "0", count: 64) else { return false }
            }

            // 3. Verify arithmetic
            if i > 0 {
                let prevCredits = entries[i-1].cachedCreditsAfter
                guard entry.cachedCreditsAfter == prevCredits + entry.deltaCredits else { return false }
                guard entry.cachedCreditsAfter >= 0 else { return false }
            }
        }
        return true
    }

    func getBalance() -> Int {
        entries.last?.cachedCreditsAfter ?? 0
    }
}
```

```swift
// MARK: - VerifierClient.swift

final class VerifierClient: VerifierServiceProtocol {

    private let session: URLSession
    private let baseURL: URL
    private let retryPolicy: RetryPolicy

    init(baseURL: URL) {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true

        let delegate = CertificatePinningDelegate()
        self.session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
        self.baseURL = baseURL
        self.retryPolicy = RetryPolicy(maxRetries: 3)
    }

    func submitPulse(_ pulse: PulseRecord) async throws -> ReceiptV1 {
        var request = URLRequest(url: baseURL.appendingPathComponent("/v1/pulse"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(pulse)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw HPPError.networkUnreachable
        }

        switch httpResponse.statusCode {
        case 200: return try JSONDecoder().decode(ReceiptV1.self, from: data)
        case 409: throw HPPError.duplicatePulse
        case 410: throw HPPError.nonceExpired
        case 429:
            let retryAfter = TimeInterval(httpResponse.value(forHTTPHeaderField: "Retry-After") ?? "5") ?? 5
            throw HPPError.rateLimited(retryAfter: retryAfter)
        case 500...599: throw HPPError.serverError
        default: throw HPPError.invalidRequest(String(data: data, encoding: .utf8) ?? "")
        }
    }

    // ... enroll(), requestNonce(), getStatus(), submitBurn(), migration endpoints
}
```

---

## 6. SwiftUI View Stubs (12 screens from 04B_02)

```swift
// MARK: - HPPRootView.swift
struct HPPRootView: View {
    @StateObject private var client = HPPClientViewModel()
    var body: some View {
        if client.isEnrolled {
            TabView {
                PulseView(client: client).tabItem { Label("Pulse", systemImage: "heart.fill") }
                DashboardView(client: client).tabItem { Label("Status", systemImage: "chart.bar") }
                ReceiptListView(client: client).tabItem { Label("Receipts", systemImage: "list.bullet") }
                SettingsView(client: client).tabItem { Label("Settings", systemImage: "gear") }
            }
        } else {
            OnboardingView(client: client)
        }
    }
}

// MARK: - PulseView.swift (Screen 6 from 04B_02)
struct PulseView: View {
    @ObservedObject var client: HPPClientViewModel
    var body: some View {
        VStack(spacing: 24) {
            Text("Daily Presence").font(.title).bold()
            Text("Score: \(client.continuityScore)").font(.headline)
            Text("Credits: \(client.creditsBalance)").font(.subheadline)

            Button("Pulse Now") { Task { try await client.pulse() } }
                .buttonStyle(.borderedProminent)
                .disabled(client.hasPulsedToday)

            if client.hasPulsedToday {
                Label("Checked in today", systemImage: "checkmark.circle.fill")
                    .foregroundColor(.green)
            }
        }
    }
}

// MARK: - BurnScanView.swift (Screen 8 from 04B_02)
struct BurnScanView: View {
    @ObservedObject var client: HPPClientViewModel
    @State private var scannedPayload: BurnFlowController.QRPayload?
    var body: some View {
        // AVFoundation camera preview with QR detection
        // On scan: parse QR → navigate to BurnConfirmView
        Text("Point camera at provider QR code")
    }
}

// MARK: - DashboardView.swift (Screen 7 from 04B_02)
struct DashboardView: View {
    @ObservedObject var client: HPPClientViewModel
    var body: some View {
        List {
            Section("Continuity") {
                LabeledContent("Score", value: "\(client.continuityScore)")
                LabeledContent("State", value: client.continuityState)
                LabeledContent("Grace Remaining", value: "\(client.graceRemaining) days")
            }
            Section("Credits") {
                LabeledContent("Balance", value: "\(client.creditsBalance)")
            }
            Section("Last Pulse") {
                LabeledContent("Epoch", value: client.lastEpoch)
            }
        }
    }
}
```

---

## 7. Info.plist Required Entries (from 04B_05 Section 17)

```xml
<key>NSFaceIDUsageDescription</key>
<string>HPP uses Face ID to verify your presence for daily attestation.</string>

<key>NSCameraUsageDescription</key>
<string>HPP uses the camera to scan QR codes for presence credit transactions.</string>

<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.hpp.pulse.reminder</string>
</array>

<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
</array>
```

---

## 8. Cross-References

| This Skeleton | Maps To |
|---|---|
| Models/ | 04B_14 Data Model Schemas |
| SecureEnclave/ | 04B_15 Cryptographic Primitives, 04B_25 Implementation Notes |
| Protocol/ | 04B_08 State Machine Diagrams |
| Networking/ | 04B_26 iOS Server Contract, 04A_03 OpenAPI, 04A_17 Verifier API |
| Views/ | 04B_02 UX Flows & Wireframes |
| Tests/ | 04B_06 Acceptance Tests, 04B_07 Test Runbook |
| LedgerManager | 04A_20 Ledger Architecture, 04A_18 Canonical Signing |
| Package.swift | 04B_05 Build & Distribution Guide |

---


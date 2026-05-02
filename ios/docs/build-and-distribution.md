**HUMAN PRESENCE PROTOCOL**

iOS Build and Distribution Guide

|                    |                                          |
|--------------------|------------------------------------------|
| **Document ID**    | OSI8_04B_05                              |
| **Version**        | 3.0                                      |
| **Date**           | April 2026                               |
| **Status**         | Canonical                                |
| **Scope**          | MVP / Production                         |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |
| **Owner**          | Agile On Target LLC                      |

**1. Purpose**

Define how the HPP iOS client is built, signed, configured, and distributed across development, testing, and production environments. This document ensures deterministic builds, reproducible environments, and clean separation between environments.

This specification is normative. Deviations require documented justification in the change log.

**2. Build Toolchain**

|  |  |
|----|----|
| **Component** | **Requirement** |
| **IDE** | Xcode 16+ (latest stable) |
| **Language** | Swift 5.9+ (Swift 6 concurrency when stable) |
| **iOS SDK** | iOS 17+ (target iOS 18.x) |
| **Build System** | Xcode Build System (New Build System) |
| **Package Manager** | Swift Package Manager (SPM). No CocoaPods. No Carthage. |
| **Minimum macOS** | macOS 14 Sonoma+ (Xcode 16 requirement) |
| **Command Line Tools** | xcodebuild, xcode-select, xcrun |

All builds must use the same Xcode version across development and CI environments. Pin the Xcode version in .xcode-version file at repository root.

**3. Repository Structure**

|  |  |
|----|----|
| **Directory** | **Contents** |
| **/ios-client** | SwiftUI app target, views, view models, services |
| **/ios-client/Sources** | Application source code organized by feature module |
| **/ios-client/Tests** | Unit and integration tests |
| **/ios-client/UITests** | UI automation tests |
| **/shared-crypto** | SPM package: ECDSA helpers, key management, hashing |
| **/configs** | xcconfig files per environment (Dev, Test, Prod) |
| **/scripts** | Build scripts, CI helpers, certificate management |
| **/docs** | Internal developer documentation |

The /shared-crypto package is a local Swift Package containing all cryptographic operations. This isolates Secure Enclave and CryptoKit interactions from the UI layer and enables unit testing with mock implementations.

**4. Apple Developer Account**

|  |  |
|----|----|
| **Account Type** | Apple Developer Program (Organization) |
| **Organization** | Agile On Target LLC |
| **Team ID** | Assigned by Apple upon enrollment |
| **Capabilities Required** | App Attest, Push Notifications, Background Modes |

**4.1 App IDs (Separate Per Environment)**

|  |  |  |
|----|----|----|
| **Environment** | **Bundle Identifier** | **Purpose** |
| **Dev** | com.hpp.dev | Local development, simulator + device |
| **Test** | com.hpp.test | TestFlight, internal QA, sandbox App Attest |
| **Prod** | com.hpp.prod | App Store release, production App Attest |

Separate bundle identifiers ensure that environment-specific data (Keychain items, Secure Enclave keys, App Attest registrations) cannot cross-contaminate between environments.

**5. Provisioning Profiles**

|  |  |  |
|----|----|----|
| **Environment** | **Signing Method** | **Profile Type** |
| **Dev** | Automatic | iOS Development |
| **Test** | Automatic | Ad Hoc (TestFlight uses App Store profile) |
| **Prod** | Manual (recommended) | App Store Distribution |

Production builds use manual signing to ensure deterministic certificate and profile selection. Development and test environments use automatic signing for velocity.

**6. Configuration Management**

**6.1 xcconfig Files**

|                   |                            |
|-------------------|----------------------------|
| **File**          | **Purpose**                |
| **Dev.xcconfig**  | Local development settings |
| **Test.xcconfig** | TestFlight / QA settings   |
| **Prod.xcconfig** | App Store release settings |

**6.2 Configuration Variables**

|                        |                |                  |                 |
|------------------------|----------------|------------------|-----------------|
| **Variable**           | **Dev**        | **Test**         | **Prod**        |
| **HPP_VERIFIER_URL**   | localhost:8080 | test.hpp.network | api.hpp.network |
| **HPP_APP_ATTEST_ENV** | development    | production       | production      |
| **HPP_LOG_LEVEL**      | debug          | info             | error           |
| **HPP_CERT_PINNING**   | disabled       | enabled          | enabled         |
| **HPP_BUNDLE_ID**      | com.hpp.dev    | com.hpp.test     | com.hpp.prod    |
| **HPP_DISPLAY_NAME**   | HPP Dev        | HPP Test         | HPP             |

Each scheme maps to its xcconfig. Configuration is resolved at build time via Info.plist variable expansion (\$(HPP_VERIFIER_URL)), not runtime toggles.

**7. Secrets Management**

|  |  |
|----|----|
| **Rule** | **Detail** |
| **Source Control** | NO secrets in source control. Ever. |
| **Config.plist** | Local-only file containing API keys, certificate pins, verifier auth tokens. |
| **.gitignore** | Config.plist MUST be in .gitignore. |
| **CI Secrets** | Stored in CI platform encrypted secrets (GitHub Actions Secrets or equivalent). |
| **Runtime Loading** | Config.plist loaded at app launch via Bundle.main.path(forResource:). |
| **Template** | Config.plist.template committed to repo with placeholder values for developer onboarding. |

Rationale: Prevents accidental exposure of credentials in version control. Ensures reproducible builds across environments without hardcoding secrets.

**7.1 Config.plist Contents**

- HPP_API_KEY: Verifier API authentication key

- HPP_CERT_PIN_SHA256: Base64-encoded SHA-256 of server certificate public key

- HPP_VERIFIER_AUTH_TOKEN: Bearer token for verifier registration endpoint

**8. Build Schemes**

|              |               |               |             |
|--------------|---------------|---------------|-------------|
| **Scheme**   | **xcconfig**  | **Bundle ID** | **Signing** |
| **HPP-Dev**  | Dev.xcconfig  | com.hpp.dev   | Automatic   |
| **HPP-Test** | Test.xcconfig | com.hpp.test  | Automatic   |
| **HPP-Prod** | Prod.xcconfig | com.hpp.prod  | Manual      |

Schemes are committed to the repository in .xcscheme files (shared = true). No developer-specific scheme configuration.

**9. Continuous Integration**

|              |                                                       |
|--------------|-------------------------------------------------------|
| **Status**   | Optional for MVP. Required before production release. |
| **Platform** | GitHub Actions (macOS runner) or Xcode Cloud          |
| **Runner**   | macOS 14+ with Xcode 16+ pre-installed                |

**9.1 CI Pipeline Steps**

|  |  |  |
|----|----|----|
| **\#** | **Step** | **Detail** |
| 1 | **Checkout** | Clone repository, restore SPM cache |
| 2 | **Lint** | SwiftLint (warnings on style, errors on safety) |
| 3 | **Build** | xcodebuild build -scheme HPP-Test -destination generic/platform=iOS |
| 4 | **Unit Tests** | xcodebuild test -scheme HPP-Test -destination platform=iOS Simulator |
| 5 | **Archive** | xcodebuild archive -scheme HPP-Prod -archivePath build/HPP.xcarchive |
| 6 | **Export** | xcodebuild -exportArchive to generate .ipa |
| 7 | **Upload** | xcrun altool --upload-app or App Store Connect API |

CI pipeline runs on every push to main and on pull request creation. Archive and upload steps run only on tagged releases.

**10. Code Signing**

|  |  |
|----|----|
| **Parameter** | **Value** |
| **Development** | Automatic signing with Apple Development certificate |
| **Distribution** | Manual signing with Apple Distribution certificate |
| **Certificate Storage** | Apple Developer account (managed by Xcode) |
| **CI Certificate** | Exported .p12 stored in CI encrypted secrets |
| **Keychain** | Temporary keychain created in CI, destroyed after build |
| **Entitlements** | App Attest, Background Modes (background-fetch) |

Production distribution certificate and provisioning profile are controlled by a single team member (Protocol Architect). No wildcard profiles. No shared developer certificates.

**11. TestFlight Distribution**

|                      |                                                   |
|----------------------|---------------------------------------------------|
| **Parameter**        | **Value**                                         |
| **Upload Method**    | Xcode direct upload or CI pipeline (xcrun altool) |
| **Internal Testers** | First. Up to 100 Apple Developer team members.    |
| **External Testers** | Optional. Requires Beta App Review by Apple.      |
| **Beta Entitlement** | App Attest runs in production mode on TestFlight. |
| **Test Duration**    | Builds expire after 90 days.                      |
| **Feedback**         | TestFlight in-app feedback + screenshots.         |

**11.1 TestFlight Validation Checklist**

- Secure Enclave key generation succeeds on physical device.

- App Attest attestation completes against Apple servers.

- Daily pulse flow triggers biometric prompt and submits to test verifier.

- QR scan initiates burn flow end-to-end.

- Offline queue accumulates and drains correctly.

- Background task schedules and executes when system permits.

**12. App Store Distribution**

|  |  |
|----|----|
| **Submission** | Manual via Xcode or App Store Connect |
| **Release Strategy** | Phased release (7-day rollout) for initial launch |
| **App Review** | Expect 24-48 hours. Prepare demo account if requested. |
| **App Category** | Utilities |
| **Content Rating** | 4+ (no objectionable content) |
| **Privacy URL** | Required. Points to HPP privacy policy. |
| **Support URL** | Required. Points to HPP support page. |

**12.1 App Store Metadata**

- App name: Human Presence Protocol (or approved variant)

- Subtitle: Prove you are here.

- Keywords: presence, attestation, biometric, identity, verification

- Screenshots: Required for iPhone 6.7" and 6.1" displays minimum.

- Description: Focus on user benefit, not protocol internals.

**13. Versioning**

|  |  |
|----|----|
| **Component** | **Rule** |
| **Marketing Version** | Semantic: MAJOR.MINOR.PATCH (e.g., 1.0.0) |
| **Build Number** | Auto-incremented integer. Never reused per marketing version. |
| **MAJOR** | Protocol-breaking changes (new attestation format, key rotation scheme) |
| **MINOR** | New features (provider integrations, UI additions) |
| **PATCH** | Bug fixes, performance improvements, security patches |
| **Git Tags** | v1.0.0, v1.0.1, etc. Tag triggers CI archive + upload. |

**14. Release Checklist**

|  |  |
|----|----|
| **Item** | **Verification** |
| All unit and integration tests pass | CI green |
| Privacy strings present (NSFaceIDUsageDescription, NSCameraUsageDescription) | Info.plist audit |
| Camera and biometric usage declared in App Store Connect | Metadata review |
| Verifier endpoints reachable from production network | Connectivity test |
| App Attest capability enabled in App ID | Developer portal check |
| Certificate pinning validates against production server | MITM test |
| Config.plist excluded from archive (not in .ipa) | Archive inspection |
| Config.plist present locally with production values | Manual verify |
| Build number incremented | xcodebuild output |
| No debug logging in release scheme | Log audit |
| Privacy Nutrition Label accurate in App Store Connect | Manual verify |
| Encryption export compliance declaration filed | App Store Connect |
| TestFlight soak test passed (48 hours minimum) | TestFlight metrics |

**15. Rollback Strategy**

|  |  |
|----|----|
| **TestFlight** | Retain previous build. Expire current build if critical. |
| **App Store** | Submit hotfix PATCH release. Apple does not support rollback to prior version. |
| **Phased Release** | Pause phased rollout in App Store Connect if issues detected. |
| **Emergency** | Remove app from sale via App Store Connect. Last resort only. |
| **Verifier Compat** | Backend must support current and previous client version simultaneously. |

Protocol-level rollback considerations: Secure Enclave keys and App Attest registrations persist across app updates. A rollback does not affect device-level cryptographic state. The verifier must handle version skew gracefully.

**16. Dependency Management**

|  |  |
|----|----|
| **Package Manager** | Swift Package Manager (SPM) only |
| **Third-Party Deps** | ZERO for MVP. Apple frameworks only. |
| **Rationale** | Minimizes supply chain attack surface. HPP is a security-critical protocol. |
| **Future Exceptions** | Require security review and documented justification per dependency. |
| **Lock File** | Package.resolved committed to repository. |

Zero third-party dependencies is a deliberate security posture, not a limitation. Every external dependency is a potential supply chain vector. HPP uses only Apple-provided frameworks where the security boundary is the hardware itself.

**17. Static Analysis & Linting**

|  |  |
|----|----|
| **Linter** | SwiftLint (installed via Homebrew, not SPM) |
| **Config** | .swiftlint.yml at repository root |
| **Xcode Warnings** | Treat all warnings as errors in Prod scheme |
| **Static Analysis** | Xcode Analyze (Cmd+Shift+B) before each release |
| **Memory** | Instruments Leaks and Allocations profiling before release |

**18. Acceptance Criteria**

Build and distribution system is accepted when all of the following hold:

|  |  |
|----|----|
| **Criterion** | **Verification** |
| Dev, Test, Prod builds are distinct (different bundle IDs, URLs, App Attest environments) | Build inspection |
| Config.plist excluded from repository and archive | git status + .ipa audit |
| TestFlight build installable and functional on physical device | Device test |
| App Store submission accepted by Apple | App Store Connect |
| CI pipeline produces reproducible archive from tagged commit | CI log comparison |
| No secrets in repository history | git log audit |

**19. VDR Cross-References**

|  |  |  |
|----|----|----|
| **Doc ID** | **Title** | **Relationship** |
| OSI8_04B_04 | iOS Platform Integration Specification | Platform constraints |
| OSI8_03A_01 | MVP Feature Set | Feature scope |
| OSI8_04B_02 | Client Architecture | Component design |
| OSI8_05A_01 | Threat Model | Supply chain risks |
| OSI8_07A_01 | Corporate Structure | Apple Developer account ownership |

**20. Change Log**

|  |  |  |
|----|----|----|
| **Version** | **Date** | **Changes** |
| 1.0 | 2026 | Initial draft. iOS 16+ baseline. |
| 1.1 | 2026 | Canonical status. |
| 3.0 | Feb 2026 | Updated to iOS 17+/18.x and Xcode 16+ baseline. Added: full configuration variable matrix, CI pipeline steps, code signing detail, TestFlight validation checklist, App Store metadata requirements, dependency management policy (zero third-party), static analysis section, phased release and rollback detail, release checklist with verification methods, VDR cross-references. Expanded all sections to institutional documentation standard. |

END OF DOCUMENT

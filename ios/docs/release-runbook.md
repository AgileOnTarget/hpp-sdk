**HPP iOS CLIENT**

**RELEASE RUNBOOK**

*Human Presence Protocol*

|                    |                                          |
|:-------------------|:-----------------------------------------|
| **Document ID**    | OSI8_04B_12                              |
| **Title**          | HPP iOS Client Release Runbook           |
| **Version**        | 3.0                                      |
| **Status**         | Canonical                                |
| **Scope**          | MVP iOS Client Release Procedures        |
| **Date**           | April 2026                               |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose**

This runbook defines the deterministic, repeatable procedure for cutting, validating, and shipping an HPP iOS client release. Every step is a checkpoint. Items marked \[BLOCKS RELEASE\] must pass before proceeding. No exceptions. No judgment calls.

This document enforces release hygiene at the same standard applied to aviation maintenance task cards: sequential, verifiable, and auditable. Each section maps to Protocol Invariants and VDR documents, ensuring that the release process itself is traceable.

**Definitions**

**Invariant:** A protocol property that must always hold true regardless of implementation.

**Smoke Test:** Minimal end-to-end behavioral verification.

**Release Branch:** Immutable branch used solely for release stabilization.

|  |
|----|
| **Operational Rule:** No step may be skipped. No step may be performed out of order. If a blocking gate fails, the release halts until the gate is cleared. The runbook is the authority, not the engineer’s judgment. |

**2. Pre-Release Gate**

**Purpose:** Confirm all prerequisites are met before cutting a release branch. No release branch is created until every blocking item is checked.

**VDR References:** OSI8_04B_09, OSI8_04B_06, OSI8_04B_10, OSI8_04A_13, OSI8_03C_19

> ☐ All checklist items in OSI8_04B_09 (Implementation Plan Checklist) marked complete. **\[BLOCKS RELEASE\]**
>
> ☐ All acceptance tests in OSI8_04B_06 (iOS Client Acceptance Tests) passing. Zero P0/P1 failures. **\[BLOCKS RELEASE\]**
>
> ☐ All demo website acceptance tests in OSI8_03C_19 passing for web integration flows. **\[BLOCKS RELEASE\]**
>
> ☐ No Critical or High risks open in OSI8_04B_10 (Risk Register) without documented mitigation. **\[BLOCKS RELEASE\]**
>
> ☐ Backend verifier endpoints stable. /time, /challenge, /pulse, /receipt all returning 200. **\[BLOCKS RELEASE\]**
>
> ☐ Demo website functional. QR generation, polling, unlock cycle confirmed. **\[BLOCKS RELEASE\]**
>
> ☐ Version number incremented in Xcode project (CFBundleShortVersionString and CFBundleVersion). **\[BLOCKS RELEASE\]**
>
> ☐ HPP-Version header in Config.plist matches backend expected version (currently 1.0). **\[BLOCKS RELEASE\]**
>
> ☐ Security review checklist (OSI8_04B_22) completed and signed off. **\[BLOCKS RELEASE\]**
>
> ☐ Privacy sweep: no PII in any outbound network call, log statement, or telemetry event. **\[BLOCKS RELEASE\]**

|  |
|----|
| **INVARIANT GATE:** If any Protocol Invariant (INV-1 through INV-14) is violated by a known defect, the release does not proceed. Invariant violations are not deferrable. |

**3. Branching**

**Purpose:** Isolate release code from ongoing development.

> ☐ Create release branch from main: release/ios-vX.Y **\[BLOCKS RELEASE\]**
>
> ☐ Freeze feature merges to release branch. Only bug fixes permitted. **\[BLOCKS RELEASE\]**
>
> ☐ Verify release branch builds cleanly (xcodebuild clean build). **\[BLOCKS RELEASE\]**
>
> ☐ Tag branch creation point on main for traceability.

**4. Build Configuration**

**Purpose:** Confirm production configuration. Wrong config = wrong verifier = broken protocol.

**VDR References:** OSI8_04A_13, OSI8_04B_05, OSI8_02B_05

> ☐ Environment set to Production in Config.plist. **\[BLOCKS RELEASE\]**
>
> ☐ verifier_url points to production verifier (HTTPS required). **\[BLOCKS RELEASE\]**
>
> ☐ Certificate pins present and match production TLS certificate chain. **\[BLOCKS RELEASE\]**
>
> ☐ max_receipt_age_seconds set to production value (default: 300). **\[BLOCKS RELEASE\]**
>
> ☐ max_pulse_skew_seconds set to production value (default: 30). **\[BLOCKS RELEASE\]**
>
> ☐ offline_queue_expiration_days set to 7. **\[BLOCKS RELEASE\]**
>
> ☐ Telemetry endpoint points to production (or is disabled for initial release).
>
> ☐ App Attest environment set to production (not .development). **\[BLOCKS RELEASE\]**
>
> ☐ No debug flags, test endpoints, or development overrides present. **\[BLOCKS RELEASE\]**

**5. Static Analysis**

**Purpose:** Catch code quality issues, security vulnerabilities, and leaked secrets before build.

**VDR References:** OSI8_04B_22, OSI8_04B_03

> ☐ SwiftLint passes with zero errors. Warnings documented and accepted. **\[BLOCKS RELEASE\]**
>
> ☐ Security static analysis scan completed (e.g., MobSF, Semgrep, or equivalent). **\[BLOCKS RELEASE\]**
>
> ☐ Secret scan: grep for API keys, tokens, passwords, private keys in source. Zero findings. **\[BLOCKS RELEASE\]**
>
> ☐ No hardcoded URLs outside Config.plist.
>
> ☐ No print() or NSLog() statements containing variable data in release build. **\[WARNING\]**
>
> ☐ Biometric policy uses .deviceOwnerAuthenticationWithBiometrics (not .deviceOwnerAuthentication). Enforces INV-2. **\[BLOCKS RELEASE\]**

**6. Test Execution**

**Purpose:** Execute full test suite on release branch. Tests run against production configuration.

**VDR References:** OSI8_04B_06, OSI8_04B_07, OSI8_03C_19, OSI8_04B_19

**6.1 Automated Tests**

> ☐ Unit tests: all passing. Coverage ≥ 80% on crypto and state machine modules. **\[BLOCKS RELEASE\]**
>
> ☐ Integration tests: end-to-end attestation → burn → verify against dev verifier. **\[BLOCKS RELEASE\]**
>
> ☐ UI tests (XCUITest): scan flow, biometric simulation, error state rendering. **\[BLOCKS RELEASE\]**
>
> ☐ PII sweep: automated scan of all outbound network payloads. Zero PII detected. **\[BLOCKS RELEASE\]**

**6.2 Manual Smoke Tests**

Execute each flow in Xcode Simulator. Record pass/fail per item.

|  |  |  |  |
|:--:|:---|:---|:---|
| **ID** | **Test** | **Steps / Expected** | **Invariants** |
| **SM-01** | **Device Registration** | Launch app → SE key generated → device registered with verifier. | INV-1 |
| **SM-02** | **Pulse Attestation** | Trigger attestation → biometric prompt → pulse signed and submitted. | INV-1, INV-2, INV-3 |
| **SM-03** | **Offline Pulse Queue** | Disable network → trigger attestation → re-enable → queue drains. | INV-10 |
| **SM-04** | **QR Scan and Burn** | Load demo website → scan QR → biometric → burn → website unlocks. | INV-1, INV-2, INV-4, INV-7 |
| **SM-05** | **Receipt Display** | After successful burn, receipt confirmation shown in app. | INV-6 |
| **SM-06** | **Session Mismatch Rejection** | Refresh website (new session) → attempt burn with old QR → rejected. | INV-7 |
| **SM-07** | **Network Error Recovery** | Block verifier → attempt burn → error displayed → retry available. | INV-6, INV-10 |
| **SM-08** | **Zero PII Verification** | Inspect all network traffic via proxy → no PII in any request. | INV-11, INV-12 |
| **SM-09** | **Normal Device Migration** | Settings → Device Migration → Normal path → old-device biometric → QR displayed → new device scans → new-device biometric → rotation confirmed. Old device shows revoked. New device can pulse. Score preserved. Requires two physical devices. | INV-1, INV-2, INV-4 |
| **SM-10** | **Recovery Migration Initiation** | Settings → Device Migration → Recovery path → biometric on new device → server accepts initiation → cooldown screen visible with days remaining. Use test verifier admin to simulate cooldown elapsed, complete claim, verify 50% score penalty. | INV-1, INV-2, INV-4 |

> ☐ All 10 smoke tests pass. **\[BLOCKS RELEASE\]**

**7. Artifact Signing**

**Purpose:** Ensure the binary is correctly signed for distribution.

**VDR References:** OSI8_04B_05

> ☐ Bundle identifier matches registered App ID (e.g., com.agilontarget.hpp). **\[BLOCKS RELEASE\]**
>
> ☐ Provisioning profile is Distribution (not Development). **\[BLOCKS RELEASE\]**
>
> ☐ Provisioning profile includes App Attest capability. **\[BLOCKS RELEASE\]**
>
> ☐ Signing certificate is valid Apple Distribution certificate (not expired). **\[BLOCKS RELEASE\]**
>
> ☐ Entitlements file includes com.apple.developer.devicecheck.appattest-environment = production. **\[BLOCKS RELEASE\]**
>
> ☐ No Simulator architectures in release binary (arm64 only, no x86_64). **\[BLOCKS RELEASE\]**

**8. TestFlight Upload**

**Purpose:** Archive, upload, and confirm processing in App Store Connect.

> ☐ Archive build in Xcode (Product → Archive).
>
> ☐ Upload archive via Xcode Organizer or xcrun altool.
>
> ☐ App Store Connect shows Processing → Ready for Testing (allow up to 30 minutes). **\[BLOCKS RELEASE\]**
>
> ☐ No processing errors or compliance warnings in App Store Connect. **\[BLOCKS RELEASE\]**
>
> ☐ Export compliance: app uses encryption (HTTPS + ECDSA). Mark appropriately.

**9. Post-Upload Validation**

**Purpose:** Validate the distributed binary behaves identically to the development build.

> ☐ Install from TestFlight on test device. **\[BLOCKS RELEASE\]**
>
> ☐ Repeat all 10 smoke tests (SM-01 through SM-10) on TestFlight build. **\[BLOCKS RELEASE\]**
>
> ☐ Verify telemetry events arrive at telemetry endpoint (if enabled). **\[WARNING\]**
>
> ☐ Verify App Attest attestation succeeds in production environment. **\[BLOCKS RELEASE\]**
>
> ☐ Verify Secure Enclave key generation on physical device (not Simulator). **\[BLOCKS RELEASE\]**
>
> ☐ Confirm no debug logging visible in Console.app on device.

**10. Version Tagging**

**Purpose:** Create immutable release tag for traceability and rollback.

> ☐ Git tag: ios-vX.Y (e.g., ios-v1.0) on release branch HEAD. **\[BLOCKS RELEASE\]**
>
> ☐ Push tag to remote: git push origin ios-vX.Y **\[BLOCKS RELEASE\]**
>
> ☐ Verify tag matches the exact commit uploaded to TestFlight. **\[BLOCKS RELEASE\]**
>
> ☐ Merge release branch back to main (if no divergence).
>
> ☐ Capture SHA-256 hash of uploaded IPA and store with release notes. **\[BLOCKS RELEASE\]**

**11. Rollback Plan**

If a critical defect is discovered after TestFlight distribution, execute the following rollback procedure. Trigger conditions and actions are deterministic — no judgment calls.

**11.1 Trigger Conditions**

|  |  |  |
|:---|:--:|:---|
| **Trigger** | **Severity** | **Action** |
| **Crash rate \> 1% of sessions** | **Critical** | Immediate rollback. Disable TestFlight distribution. Revert to previous release tag. |
| **Burn flow failures \> 5%** | **Critical** | Immediate rollback. Investigate burn state machine and verifier integration. |
| **Receipt verification failures (valid receipts rejected)** | **Critical** | Immediate rollback. Check verifier epoch sync and nonce registry. |
| **PII detected in any outbound request** | **Critical** | Immediate rollback. Treat as security incident. Full audit before re-release. |
| **Invariant violation detected in production** | **Critical** | Immediate rollback. Invariant violations are non-negotiable. |
| **Offline queue not draining after reconnect** | **High** | Hotfix on release branch. No rollback unless data loss confirmed. |
| **Telemetry not arriving** | **Medium** | Monitor. Hotfix if root cause is client-side. Not a rollback trigger. |
| **UI rendering issues** | **Low** | Document as known limitation. Fix in next release. |

**11.2 Rollback Procedure**

- 1\. Disable new TestFlight distribution in App Store Connect (Stop Testing).

- 2\. Revert to previous release branch: git checkout release/ios-vPREVIOUS.

- 3\. Archive and upload previous version to TestFlight.

- 4\. Confirm previous version installs and passes smoke tests.

- 5\. Document rollback in release notes with root cause (if known).

- 6\. Open Critical defect in risk register (OSI8_04B_10) with post-mortem timeline.

**12. Release Notes Template**

Every release must include structured release notes. Use the following template:

|  |  |
|:---|:---|
| **Version** | ios-vX.Y |
| **Date** | YYYY-MM-DD |
| **Release Type** | MVP / Patch / Hotfix |
| **Changes** | Bulleted list of functional changes. |
| **Bug Fixes** | Bulleted list of defects resolved. |
| **Known Issues** | Documented limitations with severity and workaround (if any). |
| **Open Risks** | Active items from OSI8_04B_10 that apply to this release. |
| **Invariant Status** | All 14 Protocol Invariants (INV-1–INV-14): VERIFIED / EXCEPTION (with justification). |
| **Test Results** | Summary: X/Y automated, 8/8 smoke, PII sweep clean. |
| **Rollback Tag** | Previous version tag for rollback reference. |

**13. Post-Release Monitoring**

**Purpose:** Monitor for 72 hours after distribution. Escalation criteria are deterministic.

**VDR References:** OSI8_04B_16, OSI8_03C_14

|  |  |  |
|:---|:--:|:---|
| **Metric** | **Threshold** | **Escalation** |
| **Crash rate** | **\> 1%** | Trigger rollback per Section 11. |
| **Burn success rate** | **\< 95%** | Investigate verifier integration. Hotfix if client-side. |
| **Attestation failure rate** | **\> 5%** | Check App Attest + SE key generation on affected devices. |
| **Offline queue drain time** | **\> 60 seconds** | Monitor. Hotfix if exceeds 5 minutes. |
| **Telemetry delivery rate** | **\< 90%** | Investigate endpoint. Not a rollback trigger. |
| **PII detection (automated scan)** | **Any occurrence** | Immediate rollback. Security incident. |
| **Verifier error rate (5xx)** | **\> 1%** | Coordinate with backend. Client-side hold if systemic. |

> ☐ 72-hour monitoring period completed with all metrics within thresholds. **\[BLOCKS RELEASE\]**
>
> ☐ Post-release report filed with test results, metrics summary, and any incidents.

**14. VDR Cross-Reference Index**

|  |  |  |
|:---|:---|:---|
| **Doc ID** | **Document** | **Relationship** |
| **OSI8_02A_02** | Protocol Invariants Specification | Invariant gate in Section 2 |
| **OSI8_02B_05** | Core Protocol Internet Draft | HPP-Version header validation |
| **OSI8_04B_03** | iOS Client Security Model | Security constraints validated in Sections 5–6 |
| **OSI8_04B_05** | iOS Build and Distribution Guide | Build/signing procedures in Sections 7–8 |
| **OSI8_04B_06** | iOS Client Acceptance Tests | Pre-release test gate in Section 2 |
| **OSI8_04B_07** | iOS Acceptance Test Runbook | Test execution guide for Section 6 |
| **OSI8_04A_13** | Environment Configuration Matrix | Config validation in Section 4 |
| **OSI8_03C_14** | Telemetry Events | Post-release monitoring in Section 13 |
| **OSI8_04B_09** | iOS Implementation Plan Checklist | Pre-release gate in Section 2 |
| **OSI8_04B_10** | iOS Implementation Risk Register | Risk gate in Section 2, rollback in Section 11 |
| **OSI8_03C_19** | Demo Website Acceptance Tests | Web integration gate in Section 2 |
| **OSI8_04B_16** | Post-Release Monitoring Plan | Monitoring thresholds in Section 13 |
| **OSI8_04B_19** | iOS Test Data Pack | Test fixtures for Section 6 |
| **OSI8_04B_22** | iOS Security Review Checklist | Security gate in Sections 2 and 5 |
| **OSI8_05A_07** | HPP Privacy Architecture | PII sweep constraints |

**END OF DOCUMENT**

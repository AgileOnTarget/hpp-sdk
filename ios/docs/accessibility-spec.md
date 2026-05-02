**HPP iOS ACCESSIBILITY SPECIFICATION**

VoiceOver, Dynamic Type, and WCAG 2.1 AA Compliance


**1. Purpose**

Apple rejects apps without adequate accessibility support. Enterprise and government deployments require Section 508 compliance. This document specifies VoiceOver labels, Dynamic Type support, motion sensitivity, and color contrast requirements for all 17 HPP iOS screens (12 original + 5 migration screens).

**2. VoiceOver Labels**

|  |  |  |
|----|----|----|
| **Screen** | **Key Element** | **VoiceOver Label** |
| OnboardingView | Setup button | Set up Human Presence Protocol. Double tap to begin. |
| BiometricPromptView | Biometric icon | Face ID required. Authenticate to verify your presence. |
| PulseView | Pulse button | Daily presence check. Double tap to verify. Score: \[N\]. Credits: \[N\]. |
| PulseView | Score display | Continuity score: \[N\] days. \[State\]. |
| PulseView | Credits display | Presence credits: \[N\] available. |
| DashboardView | Score section | Continuity dashboard. Score \[N\], state \[active/grace/bleed\]. |
| BurnScanView | Camera viewfinder | QR code scanner active. Point camera at provider’s QR code. |
| BurnConfirmView | Confirm button | Burn \[N\] credits for \[provider\]. Double tap and authenticate to confirm. |
| BurnResultView | Result icon | \[Success/Failure\]. \[N\] credits burned. \[N\] remaining. |
| ReceiptListView | Receipt row | \[Pulse/Burn\] receipt, \[date\], \[status\]. Double tap for details. |
| ReceiptDetailView | Receipt hash | Receipt hash: \[first 8 characters\]. Verified by \[key ID\]. |
| SettingsView | Migration button | Transfer to new device. Double tap to begin migration. |
| MigrationStartView | Choice buttons | I have my old device. Or: I don’t have my old device. |
| MigrationQRView | QR code image | Migration QR code. Have your old device scan this code. |
| MigrationRelinquishView | Transfer button | Transfer presence to new device. This device will be deactivated. |
| RecoveryCooldownView | Timer display | Recovery in progress. \[N\] days remaining. Your presence will transfer automatically. |

**3. Dynamic Type**

All text elements must support Dynamic Type using Apple’s preferred font API:

— Use .font(.title), .font(.headline), .font(.body), .font(.caption) — NOT hardcoded point sizes

— Test at all accessibility text sizes (xSmall through AX5)

— Score and credits numbers: Use .monospacedDigit() modifier for alignment

— Minimum touch target: 44×44 points for all interactive elements

— Scrollable containers for screens that overflow at largest text sizes

**4. Reduce Motion**

The Pulse animation (heartbeat/ripple on successful attestation) must respect the user’s Reduce Motion setting:

— Check: UIAccessibility.isReduceMotionEnabled

— If true: Replace animation with a static checkmark icon + haptic feedback

— If false: Show the standard pulse ripple animation (\< 3 seconds)

— No autoplay animations anywhere in the app

**5. Color Contrast (WCAG 2.1 AA)**

|                 |                |                |               |
|-----------------|----------------|----------------|---------------|
| **Element**     | **Foreground** | **Background** | **Min Ratio** |
| Body text       | \#1C1C1E       | \#FFFFFF       | 4.5:1         |
| Heading text    | \#000000       | \#FFFFFF       | 4.5:1         |
| Score number    | \#1B3A5C       | \#FFFFFF       | 4.5:1         |
| Success state   | \#2E7D32       | \#FFFFFF       | 4.5:1         |
| Error state     | \#C62828       | \#FFFFFF       | 4.5:1         |
| Button text     | \#FFFFFF       | \#1B3A5C       | 4.5:1         |
| Disabled button | \#8E8E93       | \#F2F2F7       | 3:1 min       |

All colors must also work in Dark Mode. Use Apple’s semantic colors (.label, .secondaryLabel, .systemBackground) wherever possible.

**6. Haptic Feedback**

— Pulse success: UINotificationFeedbackGenerator.success

— Burn confirmation: UINotificationFeedbackGenerator.success

— Burn failure: UINotificationFeedbackGenerator.error

— QR code detected: UIImpactFeedbackGenerator.medium

— Migration complete: UINotificationFeedbackGenerator.success

Haptics provide non-visual confirmation for all critical state transitions.

**7. Switch Control**

All screens must be fully navigable via Switch Control. Requirements:

— Every interactive element has a unique accessibility identifier

— Tab order follows visual reading order (top-to-bottom, left-to-right)

— No gesture-only interactions (all gestures have button alternatives)

— QR scanning: provide manual entry fallback for users who cannot use camera

**8. Cross-References**

— 04B_02: UX Flows & Wireframes (screen inventory)

— 04B_27: Migration Flow (5 additional screens)

— Apple Human Interface Guidelines: Accessibility

— WCAG 2.1 Level AA: Web Content Accessibility Guidelines

— Section 508: US federal accessibility requirements

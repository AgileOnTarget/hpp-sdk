**HPP iOS PRIVACY NUTRITION LABEL**

App Store Privacy Label Mapping


**1. Purpose**

Apple requires a privacy nutrition label for every App Store submission. This document maps HPP’s privacy architecture to Apple’s 14 data categories and 6 purpose categories, providing the exact selections for App Store Connect.

**2. Data Collection Summary**

HPP collects NO personal data. No account. No identity. No tracking. The only data transmitted to the server is a cryptographic attestation signed by hardware-bound keys.

|  |  |  |
|----|----|----|
| **Apple Category** | **HPP Collects?** | **Rationale** |
| Contact Info | NO | No name, email, phone, address |
| Health & Fitness | NO | No health data |
| Financial Info | NO | No payment, credit card, bank |
| Location | NO | No GPS, IP geolocation |
| Sensitive Info | NO | No racial, political, sexual, religious |
| Contacts | NO | No address book access |
| User Content | NO | No photos, videos, messages |
| Browsing History | NO | No web browsing tracked |
| Search History | NO | No search queries |
| Identifiers | NO | No IDFA, no Apple ID, no user ID |
| Purchases | NO | No in-app purchases tracked |
| Usage Data | NO | No analytics, no telemetry to third parties |
| Diagnostics | MINIMAL | Crash logs only, no PII |
| Other Data | DEVICE PUBLIC KEY | Hardware-generated, not linked to identity |

**3. App Store Connect Selections**

**3.1 Data Used to Track You**

Selection: NONE. HPP does not track users across apps or websites. No IDFA. No advertising identifier. App Tracking Transparency framework is NOT required.

**3.2 Data Linked to You**

Selection: NONE. The device public key is hardware-generated and not linked to any Apple ID, email, phone number, or personal identifier. The verifier never receives any personal information.

**3.3 Data Not Linked to You**

Selection: Device ID (Other). The device public key is a random P-256 key generated in Secure Enclave. It is not derived from any personal identifier. It cannot be correlated to the user without physical device access.

**4. iOS Permission Declarations**

|  |  |  |
|----|----|----|
| **Permission** | **Used?** | **Purpose String** |
| Face ID / Touch ID | YES — Required | HPP uses Face ID to verify your presence for daily attestation. |
| Camera | YES — Required | HPP uses the camera to scan QR codes for presence credit transactions. |
| Background App Refresh | YES | HPP uses background refresh to remind you of daily attestation. |
| Notifications | Optional | HPP can remind you to complete your daily presence check. |
| Location | NO | Not requested. |
| Contacts | NO | Not requested. |
| Microphone | NO | Not requested. |
| Photos | NO | Not requested. |
| Bluetooth | NO | Not requested. |
| HealthKit | NO | Not requested. |

**5. Biometric Data Handling**

CRITICAL: HPP does NOT collect, store, or transmit biometric data. Face ID / Touch ID evaluation happens entirely within the Secure Enclave and iOS LocalAuthentication framework. The app receives only a boolean success/failure result. No biometric template, image, or measurement leaves the device. This is enforced by Apple’s hardware architecture — the app physically cannot access biometric data.

**6. App Store Review Notes**

— HPP may trigger App Review questions about Face ID usage for non-authentication purposes. Prepare a response explaining that Face ID is used for cryptographic signing authorization, analogous to Apple Pay transaction confirmation.

— The app does not fit neatly into App Store categories. Recommend: Utilities or Productivity.

— Age rating: 4+ (no objectionable content).

— Export compliance: Uses encryption (ECDSA P-256). Will need CCATS classification or self-classification exemption. Standard iOS CryptoKit usage qualifies for the encryption exemption.

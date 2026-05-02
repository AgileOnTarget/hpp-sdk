**HPP iOS CLIENT**

**END OF LIFE POLICY**

*Human Presence Protocol*

|  |  |
|----|----|
| **Document ID** | 03-33 |
| **Title** | HPP iOS Client End of Life Policy |
| **Version** | 1.0 |
| **Status** | Canonical |
| **Scope** | MVP iOS Client — Version Lifecycle, Deprecation, and Retirement |
| **Date** | February 2026 |
| **Author** | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Principles**

End-of-life management for the HPP iOS client is governed by four non-negotiable principles. These principles derive from the same safety-first philosophy that governs the protocol itself: the system must fail closed, never fail open.

|  |  |
|----|----|
| **Principle** | **Meaning** |
| **No unsafe client may continue operating** | A client with a known security vulnerability that could compromise protocol invariants must be blocked from protocol operations. Security takes precedence over user convenience, backward compatibility, and adoption metrics. |
| **EOL is enforced by the Verifier** | The client cannot be trusted to enforce its own retirement. A compromised or modified client might ignore deprecation. The verifier is the enforcement authority — it refuses protocol operations from clients below the minimum supported version. |
| **Users are never silently broken** | Before a client version reaches EOL, users receive clear, advance notice with a specific upgrade path. The transition from “working” to “blocked” is never a surprise. Deprecation warnings begin at least 90 days before EOL. |
| **Old clients fail closed** | An EOL client does not silently degrade. It displays a blocking screen directing the user to upgrade. No partial functionality. No read-only mode. No “graceful degradation” that might give the user a false sense of security. |

|  |
|----|
| **Design Philosophy:** This policy applies aviation safety engineering to software lifecycle management. In aviation, an airworthiness directive grounds affected aircraft until the fix is applied. No exceptions, no waivers based on operational convenience. HPP applies the same logic: a client that cannot guarantee protocol integrity does not fly. |

**2. Version Lifecycle States**

Every released version of the HPP iOS client exists in exactly one of three lifecycle states at any given time. Transitions are one-directional: Active → Deprecated → End of Life. No version returns to a previous state.

|  |  |  |  |
|----|----|----|----|
| **State** | **Protocol Operations** | **Support Level** | **User Experience** |
| **Active** | All operations permitted: register, pulse, burn, receipt. | Full support. Bug fixes, security patches, and new features. | Normal operation. No warnings. |
| **Deprecated** | All operations still permitted. No functional restriction. | Critical security fixes only. No bug fixes. No new features. | In-app deprecation banner. Release notes warning. Push notification (if enabled). |
| **End of Life** | All protocol operations blocked. Verifier rejects requests. | No support. No fixes. Version is permanently retired. | Blocking upgrade screen. App Store link. No partial functionality. |

**2.1 State Transition Rules**

|  |  |  |
|----|----|----|
| **Transition** | **Trigger** | **Process** |
| **Active → Deprecated** | New Active version released | Previous Active version moves to Deprecated automatically when a new version enters Active. At most two versions may be Active simultaneously during a transition window (maximum 14 days). |
| **Deprecated → End of Life** | 90-day deprecation period expires | After 90 days in Deprecated state, the version moves to EOL. The verifier is updated to reject the version. The transition date is announced at deprecation time. |
| **Active → End of Life (emergency)** | Critical security vulnerability | Emergency kill switch (Section 5). Bypasses Deprecated state entirely. No 90-day window. Immediate block. This is the only exception to the normal lifecycle. |

**2.2 Version Registry**

The verifier maintains a version registry that records the lifecycle state of every released client version. This registry is the single source of truth for version status.

|  |  |  |  |  |  |
|----|----|----|----|----|----|
| **Version** | **State** | **Released** | **Deprecated** | **EOL Date** | **Notes** |
| **1.0.0** | **Active** | TBD | — | — | MVP initial release |
| *(template)* |  |  |  |  | Future versions added here |

**3. Verifier Enforcement Mechanics**

The verifier is the sole enforcement authority for version lifecycle. The client cannot override, ignore, or bypass verifier decisions. This is by design: a compromised client that could self-certify its own safety would defeat the purpose of version management.

**3.1 Version Check Protocol**

|  |  |  |
|----|----|----|
| **Step** | **Phase** | **Details** |
| **1** | **Client sends request** | Every request to the verifier (register, /time, /pulse, /burn) includes the HPP-Version header with the client’s version string (semantic versioning: major.minor.patch). |
| **2** | **Verifier checks version** | Verifier compares HPP-Version against minimum_supported_client_version from the version registry. |
| **3a** | **Version ≥ minimum** | Request proceeds normally. If version is Deprecated, the response includes a Deprecation-Notice header with the EOL date. |
| **3b** | **Version \< minimum** | Verifier returns HTTP 426 (Upgrade Required) with error code UNSUPPORTED_CLIENT_VERSION. Response body includes: minimum required version, App Store upgrade URL, and human-readable message. |
| **4** | **Client handles response** | On 426: client displays the blocking upgrade screen (Section 4). On Deprecation-Notice header: client displays the deprecation banner. |

**3.2 Verifier Configuration**

|  |  |  |
|----|----|----|
| **Parameter** | **Type** | **Description** |
| **minimum_supported_client_version** | Semver string | Lowest version permitted to operate. Requests below this are rejected. |
| **deprecated_versions\[\]** | Array of semver | Versions in Deprecated state. Verifier adds Deprecation-Notice header. |
| **emergency_block_versions\[\]** | Array of semver | Versions blocked immediately via kill switch (Section 5). Overrides minimum_supported. |
| **upgrade_url** | URL | App Store link included in 426 response. Client displays this for upgrade. |

**3.3 Blocked Operations**

When a client version is EOL or emergency-blocked, the verifier rejects all protocol operations. There are no exceptions and no partial access.

|  |  |  |
|----|----|----|
| **Operation** | **Blocked Behavior** | **Rationale** |
| **POST /register** | Rejected. New registrations from EOL clients are not accepted. | Prevents new device enrollment on vulnerable software. |
| **GET /time** | Rejected. Server time withheld from EOL clients. | Without /time, the client cannot construct valid pulses. |
| **POST /pulse** | Rejected. No pulses accepted. No credits accumulated. | Prevents credit accumulation on compromised software. |
| **POST /burn** | Rejected. No burns processed. No receipts issued. | Prevents credit spending through vulnerable code paths. |
| **GET /burn/status** | Rejected. Burn status queries blocked. | Consistent block. No read access from EOL clients. |

**4. Client Behavior on EOL**

When the client receives HTTP 426 from the verifier, it enters the EOL state. This is a terminal UI state. The user cannot bypass it, dismiss it, or access any protocol functionality.

**4.1 Blocking Upgrade Screen**

|  |  |
|----|----|
| **Element** | **Specification** |
| **Screen type** | Full-screen modal. Non-dismissable. Covers entire app. |
| **Title** | “Upgrade Required” |
| **Message** | “This version of HPP is no longer supported. Please update to the latest version to continue using HPP.” |
| **Primary action** | Button: “Update Now” → opens upgrade_url from 426 response (App Store deep link). |
| **Secondary action** | None. No “Remind Me Later”. No “Skip”. No “Continue Anyway.” |
| **Background operations** | All protocol operations cease. Offline queue paused. No background tasks. |

**4.2 Deprecation Banner (Pre-EOL)**

During the Deprecated state, the client displays a non-blocking banner to encourage voluntary upgrade:

|  |  |
|----|----|
| **Element** | **Specification** |
| **Banner type** | Persistent top banner. Dismissable once per session. Reappears on next app launch. |
| **Message** | “This version of HPP will stop working on \[EOL date\]. Please update to continue using HPP.” |
| **Action** | Tap banner → opens App Store. Dismiss button available. |
| **Frequency escalation** | Days 1–60: dismissable, appears once per day. Days 61–80: dismissable, appears on every launch. Days 81–90: non-dismissable persistent banner. |

**5. Emergency Kill Switch**

|  |
|----|
| **Nuclear Option:** The emergency kill switch immediately blocks a specific client version from all protocol operations. It bypasses the 90-day deprecation window. It is used only when a critical security vulnerability makes continued operation dangerous to the protocol or to users. |

**5.1 Activation Criteria**

The kill switch may only be activated when one or more of the following conditions are confirmed:

|  |  |
|----|----|
| **Condition** | **Example** |
| **Protocol invariant violation in client code** | Bug allows burn without biometric gate (I-2 violation). Bug allows balance manipulation (I-4/I-6 violation). |
| **Confirmed PII leak** | Telemetry or network payload found to contain user-identifying data (I-11/I-12 violation). |
| **Cryptographic weakness discovered** | SE signing bypass, nonce reuse, signature forgery vector (I-1/I-8 violation). |
| **Active exploitation in the wild** | Confirmed attacker activity exploiting a client-side vulnerability to forge presence or steal credits. |

**5.2 Activation Procedure**

|  |  |  |
|----|----|----|
| **Step** | **Phase** | **Details** |
| **1** | **Confirm vulnerability** | Security Engineer validates the finding. Confirms which invariant is violated. Documents the attack vector. |
| **2** | **Authorize kill switch** | Lead iOS Engineer and Security Engineer jointly authorize activation. Both must sign off. Solo activation is not permitted except by CTO override. |
| **3** | **Update verifier config** | Add affected version to emergency_block_versions\[\]. Verifier immediately begins rejecting the version. |
| **4** | **Verify enforcement** | Test that the blocked version receives HTTP 426 and displays the upgrade screen. Confirm no protocol operations succeed. |
| **5** | **Communicate to users** | Push notification (if available): “Urgent security update required for HPP.” App Store release notes updated. Support page updated. |
| **6** | **Post-mortem** | Written post-mortem within 5 business days: root cause, timeline, affected users, fix, and preventive measures. |

**6. Deprecation Timeline**

The standard deprecation cycle provides users with 90 days of advance notice before a version reaches End of Life. This timeline balances security urgency with user fairness.

|  |  |  |
|----|----|----|
| **Day** | **Milestone** | **Actions** |
| **Day 0** | **New version released** | New Active version published to App Store. Previous Active version transitions to Deprecated. EOL date set to Day 0 + 90. |
| **Day 0** | **Deprecation notice begins** | Deprecated version adds in-app banner. Release notes published. Blog post (if applicable). Deprecation-Notice header added to verifier responses. |
| **Day 30** | **First reminder escalation** | Push notification sent to users still on deprecated version (if push tokens available): “Please update HPP — your version will stop working in 60 days.” |
| **Day 60** | **Second reminder escalation** | Banner becomes non-dismissable after Day 80 (pre-staged). Push notification: “Update HPP now — only 30 days remaining.” |
| **Day 80** | **Final warning period** | Banner becomes non-dismissable. Appears on every screen. Persistent until upgrade. “This version stops working in 10 days.” |
| **Day 90** | **End of Life** | Verifier minimum_supported_client_version updated. Deprecated version blocked. Blocking upgrade screen displayed. No protocol operations. |

**7. Data Preservation**

When a client version reaches EOL, local data is preserved on the device. The user’s identity, credits, and attestation history are not destroyed. They are paused until the user upgrades.

|  |  |  |
|----|----|----|
| **Data** | **Preserved?** | **Post-Upgrade Behavior** |
| **Secure Enclave key pair** | Yes. SE keys persist across app updates. | Same key pair used after upgrade. Device identity continuity maintained. |
| **App Attest token** | Yes. Stored in Keychain. | Reused if still valid. Re-attested if expired. |
| **Local ledger (pulse history)** | Yes. On-device storage. | Ledger read by upgraded client. History intact. |
| **Credit balance** | Yes. Derived from ledger. | Balance recomputed from preserved ledger. Credits subject to normal expiration (90-day validity). |
| **Burn records and receipts** | Yes. Append-only store. | Hash chain verified on upgrade. Integrity confirmed. |
| **Offline queue** | Yes. Queue file preserved. | Queue drained after upgrade. Entries older than 7 days expired per normal rules. |
| **Configuration/preferences** | Yes. UserDefaults. | Migrated if schema changes. Defaults applied if incompatible. |

**7.1 Data Migration on Upgrade**

|  |  |
|----|----|
| **Scenario** | **Behavior** |
| **Compatible upgrade (minor/patch)** | Data used as-is. No migration required. Ledger and key pair continue seamlessly. |
| **Schema migration required (major)** | Upgrade runs migration script on first launch. Old schema data transformed to new schema. Migration is atomic: success or rollback. Failed migration falls back to re-registration. |
| **Incompatible upgrade (protocol version change)** | If the protocol version changes fundamentally, the client may require re-registration. Existing credits subject to expiration during the transition. This scenario is documented in release notes. |

|  |
|----|
| **Continuity Guarantee:** For compatible upgrades (same protocol version), the user’s device identity, accumulated credits, and attestation history resume exactly where they left off. The upgrade experience is: update the app, open it, continue pulsing. No re-registration. No lost credits (subject to normal expiration). |

**8. Finality**

|  |
|----|
| **No EOL client is permitted to operate indefinitely. Security takes precedence over backward compatibility.** |

This principle is absolute. There is no exception process, no executive override, and no customer accommodation that permits a known-vulnerable client version to continue executing protocol operations.

The cost of enforcing this principle is user friction during upgrades. The cost of not enforcing it is protocol compromise. HPP chooses safety over convenience, always.

This is consistent with the protocol’s design philosophy: constraints are what make HPP’s guarantees meaningful. A flexible EOL policy would create the same kind of weakness that flexible bot detection creates — a gap that adversaries exploit.

**9. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-01** | Protocol Specification | Protocol versioning and verifier behavior |
| **02-02** | Protocol Invariants Specification | Invariants that trigger kill switch if violated |
| **03-06** | iOS Platform Integration | SE key persistence across app updates |
| **03-14** | Telemetry Events | Deprecation and EOL event tracking |
| **03-21** | iOS Release Runbook | Release process coordinated with deprecation timeline |
| **03-25** | Post-Release Monitoring Plan | Monitoring version adoption during deprecation |
| **03-26** | iOS Debugging Guide | UNSUPPORTED_CLIENT_VERSION error handling |
| **03-29** | iOS Client FAQ | User-facing explanation of device change and continuity |
| **03-30** | iOS Known Limitations | Device-bound identity as permanent limitation |
| **03-31** | iOS Security Review Checklist | Security checks that may trigger kill switch |
| **03-32** | Code Ownership and Maintenance | Incident response for kill switch activation |

**END OF DOCUMENT**

**HPP iOS CLIENT**

**POST-RELEASE MONITORING PLAN**

*Human Presence Protocol*

|                    |                                             |
|--------------------|---------------------------------------------|
| **Document ID**    | 03-25                                       |
| **Title**          | HPP iOS Client Post-Release Monitoring Plan |
| **Version**        | 2.1                                         |
| **Status**         | Canonical                                   |
| **Scope**          | MVP iOS Client — Production Monitoring      |
| **Date**           | February 2026                               |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward    |

**CONFIDENTIAL**

**1. Purpose**

This document defines what is monitored after an HPP iOS MVP release, why it is monitored, what thresholds trigger action, and exactly what actions are taken. Every metric maps to a Protocol Invariant or operational health indicator. Every threshold has a deterministic escalation path.

Post-release monitoring serves three functions: early fault detection (something is broken), protocol integrity verification (invariants are holding), and operational health tracking (the system is performing within bounds). The monitoring window is 72 hours for critical observation, with ongoing weekly review thereafter.

|  |
|----|
| **Operational Rule:** Monitoring is not optional. The 72-hour critical window is a release gate (03-21 Section 13). A release is not complete until the monitoring window closes with all metrics within thresholds. |

**2. Monitoring Objectives**

|  |  |  |
|----|----|----|
| **Objective** | **What It Detects** | **Invariants** |
| **Burn integrity** | Failed burns, partial burns, atomic rollback failures | I-4, I-5, I-6, I-7 |
| **Pulse health** | Attestation failures, biometric gate issues, offline queue stalls | I-1, I-2, I-3 |
| **Replay resistance** | Duplicate nonce attempts, receipt replay, idempotency violations | I-7, I-8 |
| **Clock coherence** | Epoch skew, /time endpoint failures, stale timestamps | I-3 |
| **Hardware health** | SE failures, App Attest errors, key generation problems | I-1 |
| **PII containment** | Any PII in telemetry, logs, or network traffic | I-11, I-12 |
| **Stability** | Crash rate, launch failures, memory pressure | — (operational) |
| **RP integration** | Demo website unlock failures, QR parsing errors, polling timeouts | I-6, I-14 |

**3. Telemetry Sources**

|  |  |  |
|----|----|----|
| **Source** | **Data Provided** | **Constraints** |
| **iOS Client Telemetry** | Pulse events, burn events, SE operations, biometric outcomes, queue state, error codes | No PII. Event type + timestamp + success/failure + error code only. Defined in 03-14. |
| **Verifier Logs** | Registration events, pulse verification, burn verification, nonce collisions, epoch management | Server-side. No client-identifiable data beyond device_id (random UUID). |
| **Demo Website Logs** | QR generation, polling cycles, unlock events, session timeouts, error states | No PII. Session IDs are ephemeral random UUIDs. Defined in 03-12. |
| **App Store Connect** | Crash reports, performance metrics, TestFlight feedback | Apple-provided. Contains stack traces. No HPP protocol data. |
| **Network Proxy (Manual)** | Full HTTP traffic capture during 72-hour window for PII sweep | Run on test devices only. Automated PII pattern scan. Results stored ephemerally. |

**4. Key Metrics and Thresholds**

Each metric has a healthy range, a warning threshold, and a critical threshold. Critical thresholds trigger immediate action per Section 6 (Triage Playbooks). Warning thresholds trigger investigation within 4 hours.

**4.1 Pulse Metrics**

|  |  |  |  |  |
|----|----|----|----|----|
| **Metric** | **Healthy** | **Warning** | **Critical** | **Invariant** |
| **pulse_success_rate** | ≥ 99% | 95–99% | **\< 95%** | I-1, I-2, I-3 |
| **pulse_queue_depth** | 0–5 | 6–20 | **\> 20** | I-10 |
| **pulse_submit_latency** | \< 2s | 2–5s | **\> 5s** | I-3 |
| **pulse_queue_drain_time** | \< 30s | 30–60s | **\> 60s** | I-10 |
| **time_sync_failures** | 0 | 1–3/hr | **\> 3/hr** | I-3 |

**4.2 Burn Metrics**

|  |  |  |  |  |
|----|----|----|----|----|
| **Metric** | **Healthy** | **Warning** | **Critical** | **Invariant** |
| **burn_success_rate** | ≥ 99.5% | 95–99.5% | **\< 95%** | I-4, I-5, I-6 |
| **burn_attempts** | Baseline | ±50% | **±200%** | — (anomaly) |
| **burn_idempotency_conflicts** | 0 | 0 | **\> 0** | I-7 |
| **receipt_age_rejections** | 0 | 1–3/hr | **\> 3/hr** | I-3, I-7 |
| **session_mismatch_rejections** | 0 | 1–3/hr | **\> 3/hr** | I-7 |
| **atomic_rollback_events** | 0 | 1–2/hr | **\> 2/hr** | I-6 |

**4.3 Device and Security Metrics**

|  |  |  |  |  |
|----|----|----|----|----|
| **Metric** | **Healthy** | **Warning** | **Critical** | **Invariant** |
| **secure_enclave_errors** | 0 | 1–2/hr | **\> 2/hr** | I-1 |
| **biometric_auth_failures** | \< 5% | 5–15% | **\> 15%** | I-2 |
| **app_attest_failures** | 0 | 1–3/hr | **\> 3/hr** | I-1 |
| **nonce_collision_attempts** | 0 | 0 | **\> 0** | I-7, I-8 |
| **pii_detection_hits** | 0 | 0 | **\> 0** | I-11, I-12 |

**4.4 Stability Metrics**

|  |  |  |  |  |
|----|----|----|----|----|
| **Metric** | **Healthy** | **Warning** | **Critical** | **Invariant** |
| **crash_free_sessions** | ≥ 99.5% | 98–99.5% | **\< 98%** | — (operational) |
| **app_launch_failures** | 0 | 1–2/day | **\> 2/day** | — (operational) |
| **verifier_error_rate (5xx)** | \< 0.1% | 0.1–1% | **\> 1%** | — (backend) |
| **website_unlock_success_rate** | ≥ 99% | 95–99% | **\< 95%** | I-6, I-14 |

|  |
|----|
| **Zero-Tolerance Metrics:** Three metrics have zero-tolerance thresholds: burn_idempotency_conflicts, nonce_collision_attempts, and pii_detection_hits. Any non-zero value is an immediate Critical event requiring investigation and potential rollback per 03-21 Section 11. |

**5. Alerting Configuration**

|  |  |  |  |
|----|----|----|----|
| **Severity** | **Channel** | **Response Time** | **Triggers** |
| **Critical** | Pager / SMS | **15 minutes** | Any zero-tolerance metric \> 0. Burn success \< 95%. Crash-free \< 98%. PII detected. |
| **High** | Slack + Email | **4 hours** | Pulse success \< 99%. SE errors \> 2/hr. Verifier 5xx \> 1%. Rollback events \> 2/hr. |
| **Medium** | Email | **24 hours** | Queue depth \> 20. Latency \> 5s. Receipt age rejections \> 3/hr. |
| **Low** | Weekly report | **Next review** | Biometric failure rate 5–15%. Minor anomalies in burn_attempts volume. |

**6. Triage Playbooks**

Each playbook is a deterministic decision tree. Follow the steps in order. Do not skip steps. Escalate per the alerting matrix if the playbook does not resolve the issue.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-01: Burn Failures [Critical]</strong></p>
<blockquote>
<p><strong>1.</strong> Check verifier logs for 5xx errors or timeout spikes. If verifier down → coordinate backend fix, not client rollback.</p>
<p><strong>2.</strong> Check client telemetry for epoch skew. If |skew| &gt; 30s → check /time endpoint availability.</p>
<p><strong>3.</strong> Check receipt_age_rejections. If spiking → epoch window may be too tight. Verify max_receipt_age_seconds in Config.plist.</p>
<p><strong>4.</strong> Check atomic_rollback_events. If &gt; 0 → burn state machine has partial failure path. Pull crash logs for state machine transitions.</p>
<p><strong>5.</strong> Check session_mismatch_rejections. If spiking → QR caching issue on RP side, not client bug.</p>
<p><strong>6.</strong> If burn_success_rate &lt; 95% for &gt; 30 minutes → trigger rollback per 03-21 Section 11.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-02: Pulse Failures [High]</strong></p>
<blockquote>
<p><strong>1.</strong> Check /time endpoint availability. If unreachable → all pulse operations fail. Backend issue.</p>
<p><strong>2.</strong> Check biometric_auth_failures rate. If &gt; 15% → possible iOS update changed LAContext behavior. Test on affected OS version.</p>
<p><strong>3.</strong> Check pulse_queue_depth. If growing → submission failures. Check network connectivity and verifier /pulse endpoint.</p>
<p><strong>4.</strong> Check pulse_submit_latency. If &gt; 5s → verifier under load or network degradation.</p>
<p><strong>5.</strong> If pulse_success_rate &lt; 95% for &gt; 1 hour → escalate to Critical.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-03: Crash Spike [Critical]</strong></p>
<blockquote>
<p><strong>1.</strong> Pull crash logs from App Store Connect (Xcode Organizer or Crashlytics if integrated).</p>
<p><strong>2.</strong> Identify top stack trace. Categorize: SE operation, state machine, network, UI.</p>
<p><strong>3.</strong> If crash in SE operation → check device model and iOS version. SE behavior varies by hardware.</p>
<p><strong>4.</strong> If crash in burn state machine → likely atomicity bug. Review rollback path.</p>
<p><strong>5.</strong> If crash_free_sessions &lt; 98% for &gt; 1 hour → trigger rollback per 03-21 Section 11.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-04: Idempotency / Replay Violation [Critical]</strong></p>
<blockquote>
<p><strong>1.</strong> Any non-zero value is an immediate escalation. This indicates a protocol-level failure.</p>
<p><strong>2.</strong> Check verifier nonce registry. Determine if nonce was genuinely duplicated or if registry has a bug.</p>
<p><strong>3.</strong> Check client nonce generation. Verify SecRandomCopyBytes is not failing silently.</p>
<p><strong>4.</strong> If confirmed duplicate nonce → CSPRNG failure. Immediate rollback. Security incident.</p>
<p><strong>5.</strong> If nonce_collision_attempts from different device_ids → possible Sybil attack. Engage threat model (03-18).</p>
<p><strong>6.</strong> Document in risk register (03-17) with full forensic timeline.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-05: PII Detection [Critical]</strong></p>
<blockquote>
<p><strong>1.</strong> Any PII detected in any telemetry, log, or network payload is an immediate security incident.</p>
<p><strong>2.</strong> Identify the source: client telemetry, verifier log, or website log.</p>
<p><strong>3.</strong> If client-side → immediate rollback. Identify the code path that emitted PII. Patch and re-release.</p>
<p><strong>4.</strong> If server-side → coordinate with backend to purge affected logs within 24 hours.</p>
<p><strong>5.</strong> File incident report. Update risk register (03-17). Update privacy assessment (05-08).</p>
<p><strong>6.</strong> Re-run full PII sweep on patched build before re-release.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-06: Secure Enclave / App Attest Failures [High]</strong></p>
<blockquote>
<p><strong>1.</strong> Check device model distribution in crash logs. Older devices have different SE capabilities.</p>
<p><strong>2.</strong> Check iOS version distribution. iOS 17 vs 18 SE behavior differences documented in 03-06.</p>
<p><strong>3.</strong> If app_attest_failures spiking → check Apple’s Developer System Status for App Attest outages.</p>
<p><strong>4.</strong> If SE errors on specific device model → document as known limitation (03-30). Not a rollback trigger unless widespread.</p>
<p><strong>5.</strong> If SE errors &gt; 2/hr across multiple device models → escalate to Critical. Possible systemic issue.</p>
</blockquote></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>PB-07: Offline Queue Stall [Medium]</strong></p>
<blockquote>
<p><strong>1.</strong> Check pulse_queue_depth trend. If growing monotonically → queue is not draining.</p>
<p><strong>2.</strong> Check network connectivity on affected devices. If all offline → expected behavior.</p>
<p><strong>3.</strong> Check pulse_queue_drain_time. If &gt; 60s after reconnect → submission path blocked.</p>
<p><strong>4.</strong> Check BGTaskScheduler execution. iOS 18 throttles background tasks more aggressively (03-17 R16).</p>
<p><strong>5.</strong> If queue contains entries older than 7 days → entries should auto-prune. Verify expiration logic.</p>
</blockquote></td>
</tr>
</tbody>
</table>

**7. Monitoring Timeline**

|  |  |  |
|----|----|----|
| **Window** | **Duration** | **Activities** |
| **Hour 0–4** | Immediate post-release | Active monitoring. All dashboards open. PII sweep running on test devices. Pager on. |
| **Hour 4–24** | First day | Hourly metric checks. Baseline establishment for burn and pulse rates. First anomaly detection window. |
| **Hour 24–48** | Second day | Trend analysis. Compare rates against baseline. Check for time-of-day patterns. |
| **Hour 48–72** | Third day | Final critical window. If all metrics within thresholds for 72 hours, release monitoring gate passes. |
| **Week 1–4** | Ongoing | Weekly metric review. Risk register update. Bug filing for Medium/Low issues. |
| **Month 2+** | Steady state | Monthly review. Threshold re-calibration based on usage patterns. |

**8. Weekly Review Procedure**

|  |  |
|----|----|
| **Activity** | **Description** |
| **Metrics Review** | Examine all metrics from Section 4 for the past 7 days. Flag any metric that exceeded Warning threshold at any point. |
| **Risk Register Update** | Add new risks discovered during monitoring to 03-17. Update scores on existing risks based on observed behavior. |
| **Bug Filing** | Create defects for any reproducible issue. Link to relevant telemetry data and triage playbook. |
| **Threshold Calibration** | After 4 weeks of baseline data, adjust Warning and Critical thresholds to reflect actual usage patterns. Document changes. |
| **Invariant Audit** | Confirm all 14 Protocol Invariants are holding based on metric evidence. Document any invariant under stress. |
| **Report** | Produce weekly monitoring summary. File with release notes. Share with acquisition diligence team if VDR is active. |

**9. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-02** | Protocol Invariants Specification | Invariants mapped to every metric |
| **03-06** | iOS Platform Integration | SE and App Attest behavior referenced in PB-06 |
| **03-08** | iOS Client Acceptance Tests | Test suite validating pre-release behavior |
| **03-12** | Demo Website Security Model | Website logging constraints |
| **03-14** | Telemetry Events | Telemetry schema driving all client-side metrics |
| **03-17** | iOS Implementation Risk Register | Risk register updated from monitoring findings |
| **03-18** | MVP Threat Model | Threat model referenced in PB-04 (replay/Sybil) |
| **03-19** | Demo Website Acceptance Tests | Website-side test companion |
| **03-21** | iOS Release Runbook | Rollback triggers and 72-hour monitoring gate |
| **03-30** | iOS Known Limitations | Known device-specific issues documented from monitoring |
| **05-07** | HPP Privacy Architecture | PII constraints governing all telemetry |
| **05-08** | HPP Data Processing Impact Assessment | Updated from PII incident response |

**END OF DOCUMENT**

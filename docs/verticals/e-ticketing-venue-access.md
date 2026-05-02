<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-09</p>
<p><strong>HPP E-Ticketing &amp; Venue Access Integration</strong></p>
<p><em>Scalping Prevention, Fraud Elimination &amp; Presence-Gated Entry</em></p></td>
</tr>
</tbody>
</table>

|  |  |
|----|----|
| **Field** | **Value** |
| **Document ID** | 04D-09_IMP_E_Ticketing_Venue_Access_v1 |
| **Status** | Canonical — v1.0 |
| **Patent Coverage** | HPP Core (Presence Gating) · H-Constant (Economic Cost Floor) |
| **Author** | Agile On Target LLC |
| **Date** | March 2026 |

**1. Purpose**

This specification defines how ticketing platforms and venue operators integrate HPP to bind event tickets to biometrically verified humans at the point of purchase and validate human presence at the point of entry. This eliminates automated scalping, counterfeit tickets, and unauthorized resale while preserving legitimate transferability.

**2. Market Context**

- US BOTS Act (Better Online Ticket Sales Act): prohibits circumvention of purchase controls

- UK Consumer Rights Act 2015: secondary ticketing transparency requirements

- Global ticket fraud losses estimated at \$15–\$25 billion annually

- Scalping bots purchase tickets in milliseconds — faster than any human can complete checkout

- HPP's H-Constant makes automated purchasing economically unviable: each ticket requires 30+ seconds of verified biological time

**3. Architecture**

**3.1 Purchase-Time Binding**

1.  Customer selects tickets on ticketing platform.

2.  At checkout, platform requires HPP presence attestation (just like Financial Services vertical).

3.  Presence Certificate includes ticket_binding: SHA-256(event_id \|\| seat_id \|\| device_id \|\| nonce).

4.  Ticket is cryptographically bound to the purchasing device's hardware identifier.

5.  Scalping bots cannot parallelize: each ticket requires one biometric attestation, taking minimum H-Constant time.

**3.2 Entry-Time Verification**

6.  Ticket holder arrives at venue with their enrolled device.

7.  Venue gate scanner requests HPP re-attestation from the ticket holder's device.

8.  HPP client prompts biometric (face, fingerprint, or device PIN with UV).

9.  Re-attestation certificate includes original ticket_binding hash.

10. Gate system verifies: (a) certificate valid, (b) ticket_binding matches purchase record, (c) ticket not already used.

11. Gate opens. Entry logged in tamper-evident ledger.

**3.3 Legitimate Transfer**

HPP supports legitimate ticket transfers (gifts, family) through a transfer protocol:

12. Original purchaser initiates transfer via HPP.requestPresence() with action_scope: "ticket_transfer".

13. Platform issues transfer_challenge to original device.

14. Purchaser completes biometric to authorize transfer.

15. New holder's device is bound to the ticket (re-binding via new Presence Certificate).

16. Original binding is revoked. Transfer event logged in ledger.

This creates an auditable chain of custody while preventing unauthorized resale — the transfer requires the original purchaser's biometric approval.

**4. Scalping Prevention Economics**

HPP makes ticket scalping economically irrational through the H-Constant:

- Minimum 30 seconds per ticket purchase (biometric attestation time)

- 10,000 tickets = ~83 hours of continuous human labor (cannot be parallelized per device)

- Enrollment rate limit: 3 devices per IP per 24 hours (prevents device farm scaling)

- At minimum wage (\$7.25/hour): 10,000 tickets costs ~\$602 in biological labor alone

- Combined with ticket price, resale margins collapse for high-volume scalpers

**5. API Integration**

**5.1 Purchase Binding**

**Endpoint:** POST /v1/challenge

- purpose: "ticket_purchase"

- ticket_binding: SHA-256(event_id \|\| seat_id \|\| device_id \|\| nonce)

- quantity_limit: maximum tickets per attestation (platform-configured)

**5.2 Entry Verification**

**Endpoint:** POST /v1/challenge

- purpose: "ticket_entry"

- ticket_binding: must match original purchase binding

- venue_id: venue or gate identifier

**5.3 Transfer Authorization**

**Endpoint:** POST /v1/challenge

- purpose: "ticket_transfer"

- original_ticket_binding: hash of original purchase

- new_device_id: recipient's device identifier

**6. Venue Integration**

Venue gate systems integrate via lightweight HPP verification:

- QR code on ticket links to ticket_id and expected device_id

- Gate scanner requests presence re-attestation from holder's device via BLE or NFC proximity

- Verification takes \< 5 seconds including biometric

- Offline-capable: gate system can verify certificate signature against cached public key

- Throughput: ~12 entries per minute per gate (5-second verification cycle)

**7. Security Invariants Enforced**

- INV-1: Biometric required at both purchase and entry

- INV-7: Each ticket interaction uses a unique nonce (no replay)

- H-Constant: Biological cost floor eliminates scalping bot economics

- Device binding: ticket cryptographically tied to hardware, not account

- Transfer audit trail: complete chain of custody from purchase to entry

# Relying Party Use Case Map — Human Presence Protocol

This document provides implementation patterns for integrating HPP into real products.

It is non-normative. The authoritative protocol rules are in [`core-spec.md`](core-spec.md) and [`verifier-api.md`](verifier-api.md).

---

## 1. Integration Principle

HPP is not an identity system. HPP is a presence and continuity primitive.

Relying parties use it to introduce friction and trust tiering where bots, farms, and synthetic accounts create cost.

---

## 2. Two Core Levers

**Lever 1 — Continuity Score:** A slow-growing trust age.

**Lever 2 — Credits:** A spendable friction budget used to price high-risk actions.

Score gates long-term trust. Credits gate high-risk transactions.

---

## 3. Pattern A — Soft Gate

Soft gates reduce abuse without blocking legitimate onboarding.

**Definition:** Permit the action but degrade its reach, visibility, or impact unless a threshold is met.

**Examples:**

- Link posting requires score ≥ 5
- Replies in high-traffic threads require score ≥ 3
- Creating a new marketplace listing requires score ≥ 10
- Editing a wiki page requires score ≥ 7

**Implementation:**

1. On action, call `GET /v1/verify/{device_key}?threshold=T&site_origin=ORIGIN`
2. If `meets_threshold: true`, proceed normally
3. Else proceed with limited effect (non-clickable links, manual review queue, visible only to followers, tightened rate limit)

**Why this works:** Bots can still post. They cannot scale influence quickly.

---

## 4. Pattern B — Hard Gate

Hard gates block specific actions unless continuity threshold is met.

**Definition:** Action is denied unless score meets threshold.

**Examples:**

- Creating a new account requires score ≥ 1
- Sending a DM to a non-follower requires score ≥ 10
- Creating a new payment profile requires score ≥ 30
- Initiating a crypto withdrawal requires score ≥ 60

**Implementation:**

1. Call verify with threshold
2. If false, block and show clear requirement
3. Provide a path to earn presence over time

Hard gates should be used sparingly. They introduce conversion friction.

---

## 5. Pattern C — Credit Burn Transaction Gate

This is the cleanest anti-spam and anti-abuse mechanism.

**Definition:** Permit the action only if the user burns credits.

**Examples:**

- Burn 1 credit to DM a non-follower
- Burn 2 credits to post a link
- Burn 5 credits to create a new marketplace listing
- Burn 10 credits to request a human support review

**Implementation:**

1. RP calculates cost in credits
2. RP requests burn via `POST /v1/burn`
3. If receipt status `accepted`, complete the action
4. If `rejected`, deny action

**Design note:** This turns spam into a budgeted resource. Bots can still exist. They must pay.

---

## 6. Pattern D — Hybrid Gate

Use Score for baseline trust and Credits for high-risk spikes.

**Example: Marketplace platform**

- Score ≥ 10 required to list items
- Burn 3 credits to post first 3 listings
- Burn 1 credit per DM to seller until score ≥ 30
- Above score 60, DM cost drops to zero

This creates a natural maturity curve.

---

## 7. Pattern E — Progressive Trust Ladder

This is the standard product map.

| Tier | Score Range | Privileges |
|------|-----------|------------|
| 0 | 0–2 | Read-only, minimal posting, strong rate limits |
| 1 | 3–7 | Can comment, can follow, links limited |
| 2 | 8–30 | Can post links, can create groups, moderate limits |
| 3 | 31–90 | Can DM non-followers, can list items, fewer limits |
| 4 | 91+ | High-trust privileges, reduced credit costs |

The ladder should be visible in product UI.

---

## 8. Pattern F — Anti-Abuse Throttles

HPP can drive throttles without full denial.

**Examples:**

- If score < 7, max 10 actions per hour
- If score < 30, max 3 outbound DMs per day
- If score < 10, max 1 link per day

This is powerful because it scales with time.

---

## 9. Pattern G — Account Creation and Onboarding

**Recommended approach:**

1. Let users install and begin building presence immediately
2. Gate high-value actions behind score thresholds
3. Show progress toward next tier in the UI
4. Never require presence for read-only access

This avoids cold-start friction while protecting high-value surfaces.

---

## 10. Implementation Checklist

For any relying party integration:

- [ ] Choose which patterns apply (A–G)
- [ ] Define threshold values for each gated action
- [ ] Define credit costs for burn-gated actions
- [ ] Implement verify and burn API calls
- [ ] Design UI for threshold requirements and progress
- [ ] Handle edge cases: new users, decayed users, offline users
- [ ] Log all verify and burn responses for audit

---

## 11. Philosophy

HPP does not eliminate bots. It prices them.

The goal is not a bot-free internet. The goal is an internet where human attention is scarce, valuable, and verifiable — and where synthetic participation costs real resources.

Relying parties decide what that means for their product.

# Continuity Reference — Human Presence Protocol (HPP)

This document provides a practical reference for how Continuity Score behaves under typical usage and inactivity patterns.

It is non-normative. The normative rules are defined in [`core-spec.md`](core-spec.md).

---

## 1. Default Parameters (Recommended)

These defaults are RECOMMENDED starting values. Verifiers MAY choose different values but MUST publish them.

- **Epoch length:** 24 hours (UTC)
- **Grace Buffer:** 3 epochs
- **Bleed rate:** 1 per empty epoch after grace
- **Epoch Cliff:** 14 consecutive empty epochs

---

## 2. Intuition

- Presence accumulates slowly (1 per day)
- Small gaps are forgiven
- Extended absence erodes trust
- Long absence resets trust

Continuity is a *memory of presence*.

---

## 3. Growth Table

| Days With Valid Pulse | Continuity Score |
|----------------------|-----------------|
| 1 | 1 |
| 7 | 7 |
| 14 | 14 |
| 30 | 30 |
| 60 | 60 |
| 90 | 90 |
| 180 | 180 |
| 365 | 365 |

One accepted Pulse per day increases score by 1.

---

## 4. Short Absence (Within Grace)

Assume: Score = 30, Grace Buffer = 3 days

| Days Missed | Resulting Score | State |
|------------|----------------|-------|
| 1 | 30 | Grace |
| 2 | 30 | Grace |
| 3 | 30 | Grace |

No decay occurs.

---

## 5. Bleed After Grace

Assume: Score = 30, Grace = 3, Bleed = 1 per day

| Days Missed | Calculation | Resulting Score |
|------------|-------------|----------------|
| 4 | 30 − 1 | 29 |
| 5 | 30 − 2 | 28 |
| 6 | 30 − 3 | 27 |
| 10 | 30 − 7 | 23 |

Bleed begins only after Grace is exhausted.

---

## 6. Epoch Cliff Reset

Assume: Epoch Cliff = 14 consecutive missed days

If no Pulse is recorded for 14 consecutive days:

**Score → 0**

Primary device considered abandoned.

---

## 7. Recovery After Decay

Assume: Score decayed to 22, user resumes Pulses

| Day | Action | Score |
|-----|--------|-------|
| 0 | Pulse resumes | 23 |
| 1 | Pulse | 24 |
| 7 | Pulse | 30 |

Recovery is linear, not exponential.

---

## 8. Example Scenarios

### Scenario A — Casual User

- Uses app most days
- Misses weekends occasionally
- Likely score stabilizes between 20 and 60
- Good candidate for social platforms

### Scenario B — Daily Power User

- Rarely misses days
- Score grows steadily toward 90+
- Good candidate for financial or high-trust features

### Scenario C — Bot Farm

- Attempts to rotate devices and labor
- High operational cost: daily biometrics, device procurement, slow accumulation, decay if inconsistent
- Economics collapse

---

## 9. Suggested Threshold Bands

These are examples only.

| Score Range | Interpretation | Example Uses |
|------------|---------------|-------------|
| 0–2 | New / Unknown | Read-only access |
| 3–7 | Low | Post comments |
| 8–30 | Medium | Post links, create rooms |
| 31–90 | High | DM non-followers, marketplace listings |
| 91+ | Very High | Financial actions, governance |

Relying parties choose their own policies.

---

## 10. Credits vs Score

- **Continuity Score** = trust age
- **Credits** = spendable friction budget

A user may have:

- High score, low credits
- Low score, some credits

They serve different purposes.

---

## 11. Design Philosophy

Continuity is not a reputation. It is not a social score.

It is simply: *"How long has a human been continuously present?"*

Nothing more. Nothing less.

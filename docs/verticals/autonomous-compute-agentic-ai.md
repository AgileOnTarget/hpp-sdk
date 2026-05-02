<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>THE HUMAN PRESENCE STACK</strong></p>
<p>LAYER 04D — INTEGRATION VERTICALS · Document 04D-08</p>
<p><strong>HPP Autonomous Compute &amp; Agentic AI Integration</strong></p>
<p><em>Human Oversight Gating for AI Agents, Bots &amp; Autonomous Systems</em></p></td>
</tr>
</tbody>
</table>

|  |  |
|----|----|
| **Field** | **Value** |
| **Document ID** | 04D-08_IMP_Autonomous_Compute_Agentic_AI_v1 |
| **Status** | Canonical — v1.0 |
| **Patent Coverage** | Pro-Q (Active/Passive Presence Tiers) · Pro-S (Compute Allocation) |
| **Author** | Agile On Target LLC |
| **Date** | March 2026 |

**1. Purpose**

This specification defines how platforms integrate HPP to distinguish between autonomous AI agent actions and human-supervised actions, and to gate compute resource allocation on verified human presence. As AI agents (browser automation, API orchestrators, autonomous coding tools) proliferate, the internet needs a mechanism to ensure humans remain in the loop for consequential actions.

HPP provides this mechanism without blocking AI: it distinguishes "human-approved" from "autonomously initiated" actions, allowing platforms to apply different trust levels, rate limits, and authorization policies accordingly.

**2. The Problem**

- AI agents can now browse the web, fill forms, make purchases, and interact with APIs autonomously

- Existing bot detection (CAPTCHA, behavioral analysis) cannot distinguish a human-supervised AI agent from an unsupervised one

- Platforms need to know: "Is a human watching and approving this action, or is this fully autonomous?"

- EU AI Act requires human oversight for high-risk AI applications

- US Executive Order 14110 emphasizes need for AI safety guardrails

**3. Presence Tier Model**

HPP defines two presence tiers that platform can enforce:

|  |  |  |  |
|----|----|----|----|
| **Tier** | **Credit Burn Rate** | **Meaning** | **Allowed Actions** |
| Active Presence | 2.0x per interval | Human biometrically confirmed within last 60 seconds | All actions including consequential (purchases, deletions, transfers) |
| Passive Presence | 1.0x per interval | Human was verified but may not be actively watching | Read-only, non-destructive actions |
| No Presence | 0x (blocked) | No verified human in loop | Platform-defined (may block, may allow with reduced trust) |

**3.1 Active/Passive Transitions**

A session begins as Active Presence after biometric attestation. It transitions to Passive after 60 seconds without re-attestation. Platforms can require re-attestation (active presence confirmation) before allowing consequential actions:

- Active → Passive: 60 seconds without biometric interaction

- Passive → Active: new biometric attestation (re-attestation)

- Passive → None: session expiry (per certificate expiry_ms)

**4. Compute Allocation Gating**

**4.1 API Rate Limiting by Presence**

Platforms can allocate API resources based on presence tier:

|                   |                 |             |                         |
|-------------------|-----------------|-------------|-------------------------|
| **Resource**      | **No Presence** | **Passive** | **Active**              |
| API calls/minute  | 10              | 100         | 1,000                   |
| Daily API limit   | 100             | 1,000       | 10,000                  |
| Batch operations  | Blocked         | Read-only   | Full access             |
| Write operations  | Blocked         | Blocked     | Allowed                 |
| Delete operations | Blocked         | Blocked     | Re-attestation required |

**4.2 Credit-Based Compute Metering**

For compute-intensive operations, platforms can require presence credit expenditure:

- 1 credit = 100 API calls at passive tier

- 1 credit = 1,000 API calls at active tier (10x multiplier for verified human oversight)

- Credits bound to device — cannot be pooled across accounts or transferred

- Prevents credential-sharing attacks: each device must independently maintain presence

**5. Integration Architecture**

**5.1 Middleware Pattern**

Platforms integrate HPP as middleware that inspects the presence tier before routing requests:

1.  AI agent or browser automation tool sends API request with HPP session token.

2.  Platform middleware calls HPP.getSession() to check presence tier.

3.  If tier meets action requirement: request forwarded to backend.

4.  If tier insufficient: return 403 with hpp_required_tier header indicating what's needed.

5.  Agent can prompt human for re-attestation, or degrade to allowed actions.

**5.2 Agent SDK Integration**

AI agent frameworks integrate HPP to enable human-in-the-loop attestation:

- Browser agents (Puppeteer, Playwright, Selenium): HPP extension detects automation and prompts for human biometric before consequential actions

- API agents (LangChain, AutoGPT): include HPP session token in request headers; human re-attests when elevated privilege needed

- IDE agents (Copilot, Cursor): HPP gates destructive operations (force push, production deploy) on active presence

**5.3 HTTP Headers**

HPP presence tier is communicated via standard HTTP headers:

- X-HPP-Presence-Tier: "active" \| "passive" \| "none"

- X-HPP-Session-Id: session identifier

- X-HPP-Last-Attestation: Unix timestamp of most recent biometric

- X-HPP-Credits-Remaining: current credit balance

**6. Use Cases**

**6.1 AI Agent Purchasing**

An AI shopping agent wants to purchase an item. The e-commerce platform requires active presence for checkout:

6.  Agent browses products (passive presence sufficient).

7.  Agent adds item to cart (passive presence sufficient).

8.  Agent initiates checkout → platform returns 403 hpp_required_tier: "active".

9.  Agent prompts human: "Please verify your presence to complete this purchase."

10. Human completes biometric attestation. Session upgrades to active.

11. Agent retries checkout → purchase succeeds with active presence certificate.

**6.2 Autonomous Code Deployment**

A coding agent wants to deploy to production:

12. Agent writes code, runs tests (passive presence sufficient).

13. Agent initiates production deploy → CI/CD gate requires active presence.

14. Human developer re-attests to confirm deployment approval.

15. Deploy proceeds with active presence certificate as audit proof of human approval.

**7. Security Invariants Enforced**

- INV-1: Active presence requires biometric UV — no password or PIN substitute

- INV-4: Ephemeral sessions — presence tier degrades automatically over time

- INV-5: Presence state not accessible to page JS directly (agent must use HPP API)

- H-Constant: Each re-attestation costs minimum biological time — cannot be automated away

- Pro-Q: Active/passive tier distinction is cryptographically enforced, not self-reported by the agent

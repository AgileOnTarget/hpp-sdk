# HPP Patent Policy

**Issuer:** Agile On Target LLC, the patent holder of the Human Presence Protocol portfolio (USPTO Customer No. 224891).
**Effective:** 2026-04-17.
**Supersedes:** any prior informal statement on the patent scope of HPP protocol documentation.
**Companion documents:** [`LICENSE`](LICENSE) (Apache 2.0), [`NOTICE`](NOTICE), [`PATENT-NOTICE.md`](PATENT-NOTICE.md), [`CLA.md`](CLA.md).

This policy clarifies the patent-licensing scope of the materials published in this repository. In particular, it distinguishes between:

- **The source code** in this repository (the `chrome-extension/` folder, the `website/src/` surface as it ships, the `ios/Sources/` surface as it ships, and any other source files), which is **licensed under the Apache License, Version 2.0**; and
- **The protocol documentation** in this repository (the `protocol/openapi.yaml` specification, the `protocol/schemas/` directory, the `protocol/test-vectors.json` vectors, the markdown files under `protocol/docs/` — `core-spec.md`, `architecture.md`, `canonical-signing.md`, `receipt-canon.md`, `threat-model.md`, `verifier-api.md`, `relying-party-guide.md` — and any equivalent specification material elsewhere in this repository), which is **non-normative for patent grant purposes** as defined below.

This distinction is load-bearing for the commercial posture of the HPP portfolio. A reader who treats the protocol documentation as an implicit patent grant is mistaken.

---

## 1. The protocol documentation is descriptive, not a patent grant

The protocol documentation published in this repository **describes** what the Human Presence Protocol does and specifies the canonical behavior any compliant implementation must exhibit. It is published openly because HPP's security argument depends on public auditability — a protocol that cryptographically proves human presence must permit third parties (academics, regulators, prosecuting counsel, security researchers, standards-body contributors) to inspect the design.

**Publication of the protocol documentation is not, and must not be construed as, a grant of patent rights under the Human Presence Protocol patent portfolio.** Specifically:

1. **Reading, citing, linking to, referencing, teaching, or reproducing** the protocol documentation confers **no patent license** under any claim of the USPTO Customer 224891 portfolio.

2. **Implementing the protocol based on the documentation** — whether in a clean-room build, a partial reimplementation, a subset, a superset, or any derivative architecture — **does not receive a patent license by estoppel, by implication, by exhaustion, or by any other theory** arising from the documentation's publication.

3. **Describing the protocol** in academic papers, regulatory filings, standards-body submissions, product comparisons, or journalistic coverage is welcomed and does not require a patent license, because none of those activities practice the patented claims.

The documentation exists to make HPP auditable. It does not exist to make HPP free to build against.

---

## 2. The only patent license available through this repository is the Apache 2.0 grant, and that grant is narrow

The sole patent license available through this repository is the **Apache 2.0 Section 3 grant**, and that grant is bounded by its own terms:

> "a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted."

Read precisely, that language licenses **claims necessarily infringed by the Contributions as distributed** — not claims merely *discussed* in the documentation that accompanies those Contributions. A user who builds on the SDK code and ships a product that incorporates the SDK source receives an Apache 2.0 patent license covering the claims the SDK source necessarily infringes. A user who reads the documentation and writes their own implementation from scratch receives **no patent license** from Agile On Target LLC.

The **irrevocability** clause of Apache 2.0 Section 3 applies only to copies already distributed under Apache 2.0. Agile On Target LLC cannot withdraw the grant for the existing v0.1.x release of this repository from anyone who received it. Nothing in this policy attempts to do so. What this policy **does** do is clarify that the grant's scope has always been narrower than the full USPTO 224891 portfolio, and that the publication of protocol documentation in this repository has never been and is not an extension of that grant.

---

## 3. Industry convention and precedent

The two-tier posture — **open specification, separately-licensed patents** — is the standard pattern for patent-bearing Internet infrastructure:

| Body | Specification | Patent licensing |
|---|---|---|
| **W3C** | Open publication | Royalty-Free Patent Policy commitments limited to the specification as adopted, not the contributor's full portfolio |
| **IETF** | Open RFCs | IPR Policy requires disclosure; licensing terms negotiated separately, often FRAND |
| **3GPP / ETSI / ITU / ISO** | Open standards | Formal IPR Declarations separate specification publication from patent licensing |
| **Qualcomm, Nokia, InterDigital, Ericsson, Huawei** | Contribute to open standards | Retain FRAND-licensed patent portfolios covering implementations of those standards |

Agile On Target LLC's release of HPP documentation under Apache 2.0 follows this convention. The specification is open. The patent portfolio is separate. A prospective implementer who wants to deploy HPP in a commercial setting has two paths: (a) build on the SDK code and operate within the Apache 2.0 patent scope for that specific deployment, or (b) obtain a separate written patent license from Agile On Target LLC.

---

## 4. Specific applications of this policy

### 4.1 Writing an independent client or verifier from the specification

You may **study the specification**. You may **write a compatible client or verifier** that interoperates with Agile On Target LLC's reference verifier. You will need a **separate patent license** from Agile On Target LLC before you can **deploy that implementation in commercial production**. The two paths to commercial deployment are (a) incorporate this SDK's source and operate within its Apache 2.0 patent scope, or (b) obtain a separate commercial patent license. See [`PATENT-NOTICE.md §6 Inquiries`](PATENT-NOTICE.md) for contact channels.

### 4.2 Academic, security, and standards research

You may **study, audit, publish papers about, present at conferences, contribute to standards bodies, test adversarially, and report security findings** based on the protocol documentation and/or the SDK code. None of these activities requires a patent license. Agile On Target LLC welcomes adversarial analysis and treats responsible security disclosure per [`SECURITY.md`](SECURITY.md).

### 4.3 Using a licensed HPP deployment as an end user or relying party

A relying party that **consumes** receipts and session tokens issued by a licensed HPP deployment is a downstream user of that licensed implementation — not an independent patent-infringing implementer. End-user consumption of HPP presence receipts is covered by the chain of licenses from Agile On Target LLC → licensed implementer → relying party, and no additional direct patent license from Agile On Target LLC is required for that specific flow.

Relying parties who want to **integrate** HPP into their own site should use the Website SDK (when it ships in Phase 2) or the relying-party guide in `protocol/docs/`, and should operate within the Apache 2.0 scope of this repository — which does cover the integration surface as distributed.

### 4.4 Derivative specifications

Publishing a **derivative specification** — e.g., an "HPP-inspired" alternative protocol, a forked specification document, or a specification extension — is subject to the same patent rules as implementation: the underlying concepts are protected by the portfolio, and a derivative specification may induce patent infringement by its implementers. Derivative specifications may additionally raise trademark concerns (see [`PATENT-NOTICE.md §4 Trademarks`](PATENT-NOTICE.md)). Agile On Target LLC does not consent to the publication of derivative specifications absent a separate written agreement.

### 4.5 Machine-readable excerpts

The OpenAPI YAML, JSON Schema, and test-vector JSON files are **descriptive artifacts** of the protocol. Their machine-readable format does not alter their status under this policy. Generating client or server stubs from `protocol/openapi.yaml` via a code-generation tool produces a derivative of the specification — the resulting code is itself subject to the Apache 2.0 patent scope only to the extent the generated code is substantially similar to the Contributions in this repository. Generated code that is materially different from the SDK source should be treated as an independent reimplementation under §4.1 above.

---

## 5. What this policy is not

This policy is **not**:

- An extension, expansion, or modification of the Apache 2.0 grant. The Apache 2.0 grant remains exactly what its text says.
- A new restriction imposed retroactively on users of v0.1.x releases of this repository. Apache 2.0 grants are irrevocable under the License terms; Agile On Target LLC is not attempting to revoke them.
- A representation that any specific third-party implementation does or does not infringe the portfolio. Patent infringement is a fact-specific question of law decided by competent jurisdictions.
- Legal advice. See §7 below.

---

## 6. Relationship to the other documents in this repository

| Document | What it governs |
|---|---|
| [`LICENSE`](LICENSE) | The Apache 2.0 copyright and patent license for the source code and the non-normative documentation |
| [`NOTICE`](NOTICE) | Apache 2.0 attribution; names Agile On Target LLC; claims trademarks; restates non-grants |
| [`PATENT-NOTICE.md`](PATENT-NOTICE.md) | The canonical human-readable statement of what Apache 2.0 does and does not authorize, with the trademark application table and inquiry channels |
| **[`PATENT-POLICY.md`](PATENT-POLICY.md)** *(this file)* | The non-normative status of the protocol documentation; the implied-license disclaimers; the industry-convention framing |
| [`CLA.md`](CLA.md) | Contributor grants to Agile On Target LLC that keep the portfolio consolidated as contributions accrete |

All five documents should be read together. Where they address overlapping topics (e.g., the four non-grants enumerated in NOTICE and PATENT-NOTICE.md §2), they are intended to be consistent. In the event of inconsistency, **the Apache 2.0 LICENSE controls for patent grant scope**; this PATENT-POLICY controls for interpretation of the non-normative documentation status.

---

## 7. No legal advice; governing law

This policy is **informational only**. It does not constitute legal advice and does not create an attorney-client relationship with Agile On Target LLC or its counsel. Parties seeking to rely on any statement in this policy for commercial, standards-body, or litigation purposes should consult independent patent counsel.

This policy is governed by the laws of the State of North Carolina, United States, consistent with [`CLA.md §8`](CLA.md).

Agile On Target LLC reserves the right to clarify, supplement, or replace this policy as the portfolio matures from provisional to non-provisional status, as registrations issue on the filed marks, and as the commercial licensing framework evolves. Material changes will be reflected in [`CHANGELOG.md`](CHANGELOG.md).

---

*Agile On Target LLC — USPTO Customer No. 224891 — Jurisdiction: North Carolina — April 2026*

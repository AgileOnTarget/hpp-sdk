# Patent Notice

**Patent Holder:** Agile On Target LLC (Jurisdiction: North Carolina, United States)
**USPTO Customer Number:** 224891
**Portfolio:** 42 provisional patent applications filed February 14 – March 28, 2026. 1,429 claims across 32 protocol primitives, 15 invariants, and 48 capability enablers.
**Non-provisional conversion deadline:** February 14, 2027.

All patent rights in the Human Presence Protocol (HPP) architecture are **reserved by Agile On Target LLC**. The public release of this SDK under the Apache License, Version 2.0 does not transfer, assign, or waive any patent rights other than the limited grant described below.

---

## 1. What the Apache 2.0 license in this repository grants

The code in this repository is licensed under the [Apache License, Version 2.0](LICENSE). Apache 2.0 Section 3 grants a **limited, defensive patent license** from Agile On Target LLC (as the Licensor / original Contributor) covering **only those patent claims that are necessarily infringed** by the unmodified Contributions in this repository, used as distributed.

This grant specifically **does**:

- permit use, modification, and redistribution of the code in this repository for evaluation, integration, research, personal, and non-commercial purposes;
- survive reorganization, merger, or acquisition of Agile On Target LLC;
- terminate automatically for any party that files patent litigation against Agile On Target LLC or any other Contributor alleging that the Work or a Contribution infringes a patent (Apache 2.0, Section 3, paragraph 2).

---

## 2. What the Apache 2.0 license does NOT grant

The Apache 2.0 patent grant is narrow. It explicitly **does not**:

1. **Grant a license to the broader HPP architecture.** Any ground-up reimplementation of the Human Presence Protocol that does not use the specific Contributions in this repository receives NO patent license under this LICENSE. The 1,429 claims across the USPTO Customer 224891 portfolio protect the architecture, not just this code.

2. **Authorize commercial production deployment.** Running HPP in production to authenticate real users for a commercial service — whether as an internal component, an embedded feature, or a standalone offering — is beyond the Apache 2.0 grant's practical scope because the architecture is protected independently of any particular implementation. Commercial production deployment requires a **separate written patent license** from Agile On Target LLC.

3. **Authorize embedding into a commercial product.** Shipping a commercial product that includes HPP as a component — whether the HPP code is this SDK, a derivative, or an independent implementation — requires a separate patent license.

4. **Authorize offering HPP as a service.** Hosting an HPP verifier for third parties (including customers, tenants, users, or members of a federation) requires a separate patent license.

5. **Authorize competitive reimplementation.** Writing a clean-room HPP verifier, iOS client, Chrome extension, website SDK, or receipt-chain implementation specifically to compete with the reference implementations — even if the clean-room code uses no Apache-licensed material from this repository — does not receive any patent license. Such an implementation may infringe the USPTO Customer 224891 portfolio claims and may be subject to enforcement.

6. **Grant any trademark license.** See **Trademarks** below.

In plain English: you can **read** this code, **copy** it, **integrate** it for evaluation, **run** it for personal or research purposes, and **contribute back** under the CLA. You **cannot** ship a commercial product or service that practices the HPP architecture without a separate patent grant from Agile On Target LLC.

---

## 3. Why the SDK is open anyway

HPP's security argument depends on **public auditability**. A protocol that proves human presence cryptographically must allow third parties — academics, regulators, prosecuting counsel, security researchers, integrators evaluating adoption — to inspect every line of code that touches the cryptographic primitives. A closed-source HPP would be untrustworthy by construction.

The Apache 2.0 license provides the legal vehicle for that open inspection while preserving the patent rights that fund the development and underwrite the architectural commitments (no surveillance, no behavioral inference, no platform-policy reversibility) that make HPP credible as Internet infrastructure.

This dual structure — open code, patent-pending architecture, commercial license for production — is conventional in standards-track infrastructure work. See for example: WebAuthn (open spec, Apache-licensed reference implementations, patent grants negotiated through W3C's Royalty-Free Patent Policy); QUIC (open IETF spec, patent commitments via the IETF IPR disclosure process); or MariaDB, Sentry, CockroachDB, and similar source-available infrastructure shipping with explicit commercial-license gates.

---

## 4. Trademarks

Agile On Target LLC has filed federal service-mark applications on the **USPTO Principal Register** for the marks below, all in **International Class 042** (authentication services), all **filed February 17, 2026**, on **Section 1(b) intent-to-use** basis:

| Mark | USPTO Serial No. | Filing Date | Filing Basis |
|---|---|---|---|
| **Human Presence Protocol** | 99656359 | 2026-02-17 | §1(b) ITU |
| **HPP** | 99656390 | 2026-02-17 | §1(b) ITU |
| **Proof of Time** | 99656418 | 2026-02-17 | §1(b) ITU |
| **Temporal Identity** | 99656431 | 2026-02-17 | §1(b) ITU |
| **Presence Proof** | 99656479 | 2026-02-17 | §1(b) ITU |

Under Lanham Act Section 7(c), the filing of each application establishes a **nationwide priority date of February 17, 2026** for the respective mark, subject to USPTO examination, publication for opposition, and (for Section 1(b) filings) the filing of a Statement of Use or Amendment to Allege Use with specimens of actual use in commerce before the registration issues. Status for each application can be verified publicly at [USPTO TSDR](https://tsdr.uspto.gov/) by serial number.

### Symbol usage

Because none of the marks above has yet matured to federal registration, the **®** symbol **must not be used** in connection with any of them. The appropriate designators are **℠** (service mark, most accurate for Class 042 services) or **™** (more commonly recognized). After a registration certificate issues for any given mark, **®** becomes the appropriate designator for that mark.

### Apache 2.0 exclusion

The Apache License, Version 2.0 Section 6 **expressly does not grant permission to use the trademarks of the Licensor**. The Apache 2.0 license to use, modify, and distribute the code **is not** permission to use the "HPP" or "Human Presence Protocol" names — or any of the other listed marks — in a way that suggests endorsement by, sponsorship from, or affiliation with Agile On Target LLC.

### Forks and reimplementations

**Forks, derivatives, and reimplementations** must use a different product name and must not hold themselves out as the "Human Presence Protocol" or "HPP" absent a separate written trademark license from Agile On Target LLC. Descriptive use (e.g., "compatible with HPP", "implements the HPP protocol as published by Agile On Target LLC under USPTO Customer No. 224891") is acceptable under ordinary trademark nominative-fair-use principles, provided the use does not falsely suggest affiliation.

### Trademark licensing inquiries

Requests for trademark licensing — including product-name use, domain registration incorporating the marks, certification programs, or use of any mark on marketing materials — should reference the corresponding USPTO serial number in all correspondence.

---

## 5. Contributions

All contributions to this repository are accepted **only** under the Contributor License Agreement at [`CLA.md`](CLA.md). Every contributor grants Agile On Target LLC:

1. A perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable **copyright license** to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute the contribution and such derivative works.
2. A perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable **patent license** to make, have made, use, offer to sell, sell, import, and otherwise transfer the contribution.
3. A representation that the contributor has the right to grant the above licenses.

This CLA is what keeps the patent portfolio consolidated even as the code evolves. Contributions that have not been submitted under the CLA will not be merged.

---

## 6. Inquiries

| Your situation | What you need |
|---|---|
| Evaluating, integrating, researching, or running HPP for personal use | **No patent inquiry needed.** The Apache 2.0 license covers you. |
| **Commercial production deployment**, OEM embedding, licensing for resale, or offering HPP as a service | **Separate written patent license** from Agile On Target LLC. Reference USPTO Customer No. 224891 in your inquiry. |
| Standards-body engagement (IETF / W3C / ISO / ITU) | Portfolio is available under royalty-free terms for inclusion in published standards subject to standards-body IPR policies. |
| Litigation, expert witness, regulatory inquiries | See [humanpresenceprotocol.com](https://humanpresenceprotocol.com) for the RAD documentation and KGM filing chronology. |
| Trademark use beyond nominative fair use (product name, marketing, domain) | **Separate written trademark license** from Agile On Target LLC. |

Contact through the GitHub organization at [https://github.com/AgileOnTarget](https://github.com/AgileOnTarget) or via counsel of record on USPTO Customer No. 224891.

---

## 7. No warranty; no legal advice

The Apache 2.0 license disclaims warranties. Nothing in this repository — including this notice, the NOTICE file, or the LICENSE — constitutes a representation that any specific deployment of HPP infringes or does not infringe any specific patent claim. Patent enforceability is a question of law decided by courts of competent jurisdiction on a case-by-case basis, not by the contents of this notice.

This document is **informational** and does not constitute legal advice. Parties seeking to use HPP in commercial contexts should consult their own patent counsel before relying on any statement in this document.

---

*Agile On Target LLC — North Carolina, United States — USPTO Customer No. 224891*

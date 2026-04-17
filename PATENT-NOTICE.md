# Patent Notice

The Human Presence Protocol (HPP) is the subject of **42 provisional patent applications** filed under **USPTO Customer No. 224891**, between February 14 and March 28, 2026. The portfolio comprises 1,429 claims across 32 protocol primitives, 15 invariants, and 48 capability enablers.

The non-provisional conversion deadline is **February 14, 2027**.

---

## What the Apache 2.0 license in this repository grants

The code in this repository is licensed under [Apache License 2.0](LICENSE). The Apache 2.0 license includes an explicit patent grant covering **the contributions made by the licensor in this repository**. You may use, modify, and distribute the code under those terms.

## What it does NOT grant

The Apache 2.0 patent grant **does not extend** to the broader HPP architecture covered by the 42 USPTO applications. Specifically, **production use of HPP at commercial scale**, **selling HPP as a service**, **embedding HPP into a commercial product**, or **building patent-infringing alternative implementations** of the HPP architecture are **not authorized** by the Apache 2.0 license alone.

These activities require a **separate patent license** from the portfolio owner.

In plain English: you can read this code, copy it, integrate it for evaluation, run it for personal or research purposes, and contribute back. You cannot ship a commercial product that practices the patented HPP architecture without a separate patent grant.

---

## Why the SDK is open anyway

HPP's security argument depends on **public auditability**. A protocol that proves human presence cryptographically must allow third parties — academics, regulators, prosecuting counsel, security researchers, integrators evaluating adoption — to inspect every line of code that touches the cryptographic primitives. A closed-source HPP would be untrustworthy by construction.

The Apache 2.0 license provides the legal vehicle for that open inspection while preserving the patent rights that fund the development and underwrite the architectural commitments (no surveillance, no behavioral inference, no platform-policy reversibility) that make HPP credible as Internet infrastructure.

This dual structure — open code, patent-pending architecture — is conventional in standards-track infrastructure work. See for example: WebAuthn (open spec, Apache-licensed reference implementations, patent grants negotiated through W3C's Royalty-Free Patent Policy); QUIC (open IETF spec, patent commitments via the IETF IPR disclosure process); or any commercial cryptographic library shipping under a permissive license against patented underlying primitives.

---

## Inquiries

- **Evaluation, integration, research use:** no patent inquiry needed. The Apache 2.0 license covers you.
- **Commercial production deployment, OEM embedding, licensing for resale:** written request referencing **USPTO Customer No. 224891**.
- **Standards-body engagement, IETF / W3C / ISO contributions:** the portfolio is available under royalty-free terms for inclusion in published standards subject to standards-body IPR policies.
- **Litigation, expert witness, regulatory inquiries:** see the marketing site at [humanpresenceprotocol.com](https://humanpresenceprotocol.com) for the RAD documentation and KGM filing chronology.

---

## No warranty

The Apache 2.0 license disclaims warranties; nothing in this repository constitutes a representation that any specific deployment of HPP infringes or does not infringe any specific patent claim. Patent enforceability is a question of law decided by competent jurisdictions on a case-by-case basis, not by the contents of this notice.

This document is informational and does not constitute legal advice.

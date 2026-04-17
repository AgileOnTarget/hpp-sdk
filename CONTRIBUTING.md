# Contributing to HPP

Thank you for considering a contribution. HPP is an evolving protocol; the SDK is the surface where adopters meet the spec, so even small clarifications matter.

## How to file an issue

- Reproduce on `main` first
- Include OS, browser, language version, exact reproduction steps
- For protocol-level questions, link the relevant section of [`protocol/openapi.yaml`](protocol/openapi.yaml) or [`protocol/docs/`](protocol/docs/)
- For security-sensitive issues, do **not** file a public issue — see [`SECURITY.md`](SECURITY.md)

## How to propose a change

1. Open an issue first describing the proposed change and rationale
2. Wait for maintainer ack before opening a PR for non-trivial work
3. Branch from `main`; one logical change per PR
4. Match the existing code style (Apache 2.0 file headers; no third-party deps without explicit discussion)
5. Update tests, docs, and `CHANGELOG.md` in the same PR

## Scope of contributions

| Welcome | Discuss first | Out of scope |
|---|---|---|
| Bug fixes | Spec changes | New features that materially change the protocol invariants |
| Doc clarifications | New endpoints in OpenAPI | Anything that loosens privacy guarantees |
| Test vector additions | New language SDKs | Vendor-specific implementations |
| Chrome extension polish | iOS Swift Package surface | Centralized identity binding |
| Integration examples | Cross-cutting refactors | Telemetry, analytics, surveillance hooks |

The protocol invariants (HPP-PRES, NPHT, Biometric Burn, CCM, H-Constant) are the **load-bearing security claims**. Changes that affect them require a formal review against the threat model in [`protocol/docs/threat-model.md`](protocol/docs/threat-model.md).

## Code style

- Apache 2.0 header on new source files
- Two-space indent for JSON / YAML; language conventions for code (Swift, JavaScript)
- No emojis in source code or commit messages
- No marketing language in code comments — be honest about what proves what
- Every public-facing claim should have a citation: code reference, EVD entry ID, or patent application number

## Review process

- Maintainers review on a best-effort basis (this is a small project)
- Sub-trivial changes: 1 maintainer approval
- Spec changes: at least 2 maintainer approvals + cite the threat model
- Security-relevant changes: see [`SECURITY.md`](SECURITY.md) for the disclosure-coordination process

## Code of conduct

Be technical, be honest, be brief. Disagree about engineering decisions on the merits, with citations. Do not personalize disagreements. The maintainers reserve the right to remove contributions or contributors that do not adhere to this norm.

## Contributor License Agreement — required

All contributions are accepted **only** under the [Contributor License Agreement](CLA.md). Every PR opened against this repository triggers the CLA Assistant workflow ([`.github/workflows/cla.yml`](.github/workflows/cla.yml)), which comments on the PR and asks you to sign.

**To sign:** post a comment on the PR containing the exact text:

> I have read the CLA Document and I hereby sign the CLA

The workflow records the signature in [`signatures/version1/cla.json`](signatures/version1/cla.json), committed to `main`. Your signature is auditable in git history and covers every subsequent PR you open against the current CLA version — you sign once per CLA version, not once per PR.

If you are contributing on behalf of an organization with an active IP assignment policy, include the following one-liner in the PR description in addition to posting the sign-off comment:

> I am authorized to submit this Contribution on behalf of [Organization Name] under the terms of the CLA at CLA.md.

For PRs from pre-authorized bots (Dependabot, Renovate, GitHub Actions) the signature requirement is waived via the workflow's `allowlist`.

## Patent / commercial / trademark licensing

Your contribution is licensed to downstream users under [Apache 2.0](LICENSE). The Apache 2.0 patent grant is narrow — it covers only the patent claims necessarily infringed by the contribution as distributed. Commercial production deployment, OEM embedding, offering HPP as a service, and ground-up reimplementation of the HPP architecture **are not authorized** by the Apache 2.0 license alone and require a **separate written patent license** from Agile On Target LLC (USPTO Customer No. 224891). Trademark use of "HPP" / "Human Presence Protocol" beyond nominative fair use requires a separate trademark license. See [`PATENT-NOTICE.md`](PATENT-NOTICE.md), [`NOTICE`](NOTICE), and [`PATENT-POLICY.md`](PATENT-POLICY.md) for details.

## Questions

Open an issue tagged `question`. For commercial / licensing inquiries, see [`PATENT-NOTICE.md`](PATENT-NOTICE.md).

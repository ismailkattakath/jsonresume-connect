# Governance of JSON Resume Connect

## Today: a single maintainer

| Role | Who | Can |
|---|---|---|
| **Maintainer** | [@ismailkattakath](https://github.com/ismailkattakath) | merge, release, triage, set direction, enforce the [Code of Conduct](CODE_OF_CONDUCT.md) |
| **Contributor** | anyone who opens an issue, discussion or pull request | propose changes |

The maintainer owns every path ([CODEOWNERS](.github/CODEOWNERS)).

## How decisions are made

- **Most changes:** a pull request, reviewed and merged by the maintainer.
- **Bigger changes** (a new step, a new OAuth scope, a new outbound host, a breaking output
  change): open an issue or discussion first and agree the design before writing code.
- **Disagreements:** discuss them in the open, on the issue or pull request. The maintainer
  makes the final call and writes down why.
- **Security reports** follow [SECURITY.md](SECURITY.md) and are handled privately until fixed.

## Becoming a maintainer

A contributor with a record of good, sustained contributions may be invited as a
co-maintainer. The existing maintainer(s) decide by consensus. Once there are two or more
maintainers, a pull request needs approval from a maintainer who did not author it.

## Path to JSON Resume stewardship

This project is built for the [JSON Resume](https://jsonresume.org) community and is intended
to be **offered to the [jsonresume](https://github.com/jsonresume) GitHub organisation**.

1. The maintainer proposes the transfer to the jsonresume organisation's maintainers.
2. If they accept, the repository transfers to `github.com/jsonresume`, and the organisation's
   own governance and maintainers take precedence over this file.
3. The current maintainer stays on as a maintainer unless they choose to step down.
4. Licence (MIT), DCO sign-off and copyright notices are unchanged by a transfer. The
   DCO was chosen so no contributor paperwork has to be redone (see
   [CONTRIBUTING.md](CONTRIBUTING.md)).

Nothing in this file is a commitment by the jsonresume organisation; the transfer happens only
if they agree.

## Changing this document

Changes to governance go through a pull request like any other change, and are announced in
the release notes.

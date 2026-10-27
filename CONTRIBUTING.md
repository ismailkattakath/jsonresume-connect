# Contributing to JSON Resume Connect

Thanks for helping. This project is small, so the rules are short.

- **Bugs and ideas:** open an issue with one of the [issue forms](.github/ISSUE_TEMPLATE/).
- **Questions:** see [SUPPORT.md](SUPPORT.md).
- **Security problems:** never in a public issue. See [SECURITY.md](SECURITY.md).
- **Conduct:** everyone follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

You need Node.js and npm. The tests run the `.gs` files in Node, so no Google account is needed
for them.

```bash
npm ci                 # install the pinned dev dependencies
npm test               # run the test suite
npm run lint           # lint
npm run format:check   # check formatting (no writes)
```

All four must pass before a pull request is merged; CI is expected to run the same four.

## Testing a change live in Workspace Studio

The unit tests cover the pure code. Anything touching the card UI, OAuth, `UrlFetchApp`,
`DocumentApp` or `DriveApp` also needs a run on Google's servers:

1. Push your branch's files to **your own** Apps Script project (the web editor or `clasp`).
   Never use the maintainer's project or credentials.
2. Install it with a **test deployment** (*Deploy → Test deployments → Install*). The README's
   install section has the exact steps and the admin-console gates.
3. Build a short flow in Workspace Studio that exercises your change, and run it.
4. In the pull request, say what you ran and what you saw. Include the flow's shape and the
   step outputs. **Never paste a real résumé, an OAuth token or an access log.**

## Commit messages: Conventional Commits

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Releases and
the changelog are generated from them by
[release-please](https://github.com/googleapis/release-please), so the type matters:

| Type | Use for | Release effect |
|---|---|---|
| `feat:` | a new user-visible capability | minor bump |
| `fix:` | a bug fix | patch bump |
| `feat!:` / `BREAKING CHANGE:` footer | an incompatible change | major bump |
| `docs:`, `test:`, `chore:`, `ci:`, `refactor:`, `build:` | everything else | no release on its own |

Example: `fix(render): escape résumé HTML in summary paragraphs`.

## Sign your commits: Developer Certificate of Origin (DCO)

Every commit must carry a `Signed-off-by:` line. It certifies the
[Developer Certificate of Origin 1.1](https://developercertificate.org/): you wrote the change,
or otherwise have the right to submit it under this project's licence.

```bash
git commit -s -m "fix(render): escape résumé HTML in summary paragraphs"
```

`-s` adds `Signed-off-by: Your Name <your@email>` from your git config. Forgot it? Run
`git commit --amend -s` (one commit) or `git rebase --signoff main` (several), then
force-push your branch with `--force-with-lease`.

### Why DCO and not a CLA

- **No counterparty needed.** A Contributor License Agreement (CLA) is a contract with a legal
  entity that stores signatures. This project is owned by one person and may move to the
  [JSON Resume](https://github.com/jsonresume) organisation. A DCO needs no entity at all.
- **It survives a transfer.** The sign-off travels inside each commit. A CLA signed with one
  owner would need re-papering when stewardship changes.
- **Inbound = outbound.** Contributions arrive under the same Apache-2.0 licence they go out
  under. Apache-2.0 §5 already says so; the DCO records that you agreed.
- Google's [release guidance](https://opensource.google/documentation/reference/releasing/preparing)
  requires a CLA, but only for Google-owned projects. It does not bind this one.

## Licence headers

Every new `.gs` and `.mjs` file starts with this header (a
[REUSE 3.3](https://reuse.software/spec-3.3/) / [SPDX](https://spdx.dev/learn/handling-license-info/)
pair):

```js
// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: Apache-2.0
```

- **Year:** the year the file was created, not the current year.
- **Your own file:** put your own name on the `SPDX-FileCopyrightText` line.
- **Substantial edits to someone else's file:** add a second `SPDX-FileCopyrightText` line
  with your name. Do not remove existing lines.
- **`OAuth2.gs` is vendored** from
  [googleworkspace/apps-script-oauth2](https://github.com/googleworkspace/apps-script-oauth2).
  Keep its upstream Google header untouched, and record any upgrade in [NOTICE](NOTICE).
- **JSON files** (`appsscript.json`) cannot hold comments. They are covered by the top-level
  [LICENSE](LICENSE).

**Why SPDX and not the 11-line Apache boilerplate:** both are valid. The two-line form is
machine-checkable (`reuse lint`, ScanCode). It is also closer to the JSON Resume organisation's
own repositories, which carry no per-file headers at all.

## Pull requests

- One logical change per pull request. Keep it small.
- Add or update tests for any behaviour change.
- Fill in the pull request template, including the live-test notes when they apply.
- The maintainer reviews every pull request ([CODEOWNERS](.github/CODEOWNERS)). How decisions
  are made: [GOVERNANCE.md](GOVERNANCE.md).

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE).

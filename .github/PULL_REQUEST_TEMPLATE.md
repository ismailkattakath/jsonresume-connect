## What and why

<!-- One or two sentences. Link the issue: "Fixes #123". -->

## Type

<!-- The PR title must be a Conventional Commit: feat:, fix:, docs:, test:, chore:, ci:, refactor:, build:. Add ! for a breaking change. -->

## How it was tested

- [ ] `npm test`, `npm run lint` and `npm run format:check` pass locally
- [ ] Tests added or updated for the behaviour change
- [ ] Ran live in Workspace Studio with a test deployment (needed for card UI, OAuth, Docs or Drive changes)

<!-- For a live run: the flow's shape and what you saw. Never paste a real résumé, a token or a log with personal data. -->

## Checklist

- [ ] Every commit is signed off (`git commit -s`) — see CONTRIBUTING.md § DCO
- [ ] New `.gs` / `.mjs` files carry the SPDX licence header
- [ ] No new OAuth scope or outbound host — or it is called out above with the reason
- [ ] README updated if user-visible behaviour changed

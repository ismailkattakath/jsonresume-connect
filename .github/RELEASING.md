# Releasing and deploying (CI/CD runbook)

How a commit on `main` becomes a versioned Apps Script deployment, and the one-time repo setup
it needs. User-facing release notes live in `docs/`; this file is the operator's runbook.

## The flow

| Step | Workflow | Trigger | Output |
|---|---|---|---|
| 1 | `ci.yml` (job `lint-format-test`) | PR, push to `main` | lint, format, tests, `src/appsscript.json` parses |
| 2 | `release-please.yml` | push to `main` | opens/updates the release PR from Conventional Commits |
| 3 | merge the release PR | operator | tag `vX.Y.Z`, GitHub release, `CHANGELOG.md` |
| 4 | `deploy.yml` (called by step 2's `deploy` job) | release created | `clasp push --force` + `clasp create-deployment --description vX.Y.Z` |

- **Re-deploy a tag by hand:** `gh workflow run deploy.yml -f tag=vX.Y.Z`.
- **Not `on: release`.** A release created with `GITHUB_TOKEN` starts no workflow (GitHub
  docs, "Triggering a workflow from a workflow"); with a PAT it would deploy twice. So
  `release-please.yml` calls `deploy.yml` directly (`workflow_call`).
- **Versioning:** the manifest starts empty and `initial-version` is `0.1.0`, so the first
  release is `v0.1.0`; `bump-minor-pre-major` keeps breaking changes on `0.x` minor bumps.
  Commits that are not Conventional Commits (the history before this file) are ignored.

## What CI cannot do

- **Test deployments are not automatable.** *Deploy → Test deployments → Install* exists only in
  the Apps Script editor UI; there is no API (README § Deploying it). CI produces **versioned**
  deployments only — and those require `urlFetchWhitelist` in `src/appsscript.json`.
- **While the repo is private**, `codeql.yml`, `scorecard.yml` and `dependency-review.yml` are
  skipped (`if: !github.event.repository.private`): each needs a public repo or GitHub Advanced
  Security (their READMEs). They start running when the repo goes public.
- **Environment required reviewers** are not available for private repos on the free plan, so
  the `production` gate below is inert until the repo is public (or on Pro).
- Until `src/`, `test/`, `package.json`, `.nvmrc` and `.clasp.json.example` land on `main`,
  `ci.yml` fails. That is expected.

## Secrets and variables

| Name | Kind | Scope | Value |
|---|---|---|---|
| `CLASPRC_JSON` | secret | environment `production` | whole contents of `~/.clasprc.json` after a **clasp v3** `clasp login` |
| `SCRIPT_ID` | secret | environment `production` | the Apps Script project ID (Project Settings → IDs) |
| `DEPLOYMENT_ID` | variable | environment `production` | the versioned deployment to keep updating (optional; see below) |
| `RELEASE_PLEASE_TOKEN` | secret | repo | optional GitHub App token / fine-grained PAT (see below) |

Create the `production` environment first (next section) — `--env` needs it to exist. Set them **from your own terminal** (each prompts for the value or reads a file; nothing is
echoed):

```bash
R=ismailkattakath/jsonresume-connect
gh secret set CLASPRC_JSON --repo "$R" --env production < ~/.clasprc.json
gh secret set SCRIPT_ID    --repo "$R" --env production          # paste at the prompt
gh variable set DEPLOYMENT_ID --repo "$R" --env production --body "<deployment id>"
```

- **Missing secrets skip, not fail.** `deploy.yml` emits a `Deploy skipped` notice and exits
  green when `CLASPRC_JSON` or `SCRIPT_ID` is absent (forks, fresh clones).
- **`CLASPRC_JSON` must be v3 format.** clasp v3 stores named credentials; v2 files are a
  different shape (`src/auth/file_credential_store.ts`). Log in with the same pinned version:
  `npx @google/clasp@3.4.1 login`. Rejected alternative: `--adc` with a service account — Apps
  Script API calls run as the user who owns the project, and a service account would need
  domain-wide delegation for a consumer account; the user token is simpler and revocable.
- **Who can deploy.** The deploy job runs only on `refs/heads/main` and only for a tag whose
  commit is on `main`. Anyone with write access could still edit `deploy.yml` on a branch and
  dispatch it; the **protected-branches policy** of `production` is what stops that, and it is
  only enforced once the repo is public. Keep write access to the owner until then.
- **The token is a refresh token for your Google account.** Revoke it at
  myaccount.google.com → Security → Third-party access if it leaks, then re-run `clasp login`.
- **`DEPLOYMENT_ID` keeps one deployment.** A Studio custom-step install is bound to a
  deployment ID; a new ID per release would leave installs on the old version. On the first
  run leave it unset, copy the ID from the `clasp create-deployment` log, then set it.
- **`RELEASE_PLEASE_TOKEN` (optional).** With the default `GITHUB_TOKEN`, CI does **not** run
  on the release PR, so a required `lint-format-test` check blocks it: merge it with the
  ruleset bypass (below). A GitHub App token (preferred: scoped, short-lived) or fine-grained
  PAT (contents + pull requests: write) makes CI run on it instead.

## Environment `production`

Create it with the owner as required reviewer, deployable only from protected branches
(user id `8927166` = `ismailkattakath`, from `gh api users/ismailkattakath -q .id`):

```bash
gh api -X PUT repos/ismailkattakath/jsonresume-connect/environments/production \
  --input - <<'JSON'
{
  "wait_timer": 0,
  "prevent_self_review": false,
  "reviewers": [{ "type": "User", "id": 8927166 }],
  "deployment_branch_policy": { "protected_branches": true, "custom_branch_policies": false }
}
JSON
```

## Branch ruleset for `main` — apply after going public (not yet applied)

Requires a PR, the CI check, linear history; blocks force-push and deletion. The repository
admin role (`actor_id: 5`) may bypass — that is how the owner pushes straight to `main` and
merges the release PR. Required check context = the CI job name `lint-format-test`;
`integration_id: 15368` is the GitHub Actions app.

```bash
gh api -X POST repos/ismailkattakath/jsonresume-connect/rulesets --input - <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash", "rebase"]
      } },
    { "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "lint-format-test", "integration_id": 15368 },
          { "context": "dco", "integration_id": 15368 }
        ]
      } }
  ]
}
JSON
```

### Tag ruleset — release tags are immutable

`deploy.yml` checks that the tag's commit is on `main`, but a moved tag would still pass if it
was moved to another `main` commit. Block that (apply with the branch ruleset):

```bash
gh api -X POST repos/ismailkattakath/jsonresume-connect/rulesets --input - <<'JSON'
{
  "name": "release tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" }, { "type": "update" } ]
}
JSON
```

### Notes on the branch ruleset

- **Optional, add to `rules`:** `{ "type": "required_signatures" }` — only if every committer
  (including release-please's bot commits) signs; the default `GITHUB_TOKEN` API commits are
  signed by GitHub.
- **Not required checks:** `analyze (javascript-typescript)`, `scorecard`, `dependency-review`
  — they are skipped while private, and a skipped required check never reports.
- Check the result: `gh api repos/ismailkattakath/jsonresume-connect/rulesets`.

## DCO (Developer Certificate of Origin)

- `dco.yml` (job `dco`) fails a PR when any non-merge commit lacks a `Signed-off-by:` trailer
  naming its author (`git commit -s`). Bot commits (`*[bot]@users.noreply.github.com`:
  release-please, Dependabot) are exempt.
- It is plain `git` in a pinned checkout: no third-party action holds the PR.
- **Alternative: the DCO GitHub App** (github.com/apps/dco, CNCF's standard). It needs no
  workflow and offers a "remediation commit" flow. If you install it, delete `dco.yml` and make
  the App's `DCO` check required instead of `dco` — one check, not two.

## Supply-chain choices (and what they beat)

- **Every action is pinned to a full commit SHA** with a `# vX.Y.Z` comment (OpenSSF
  Scorecard *Pinned-Dependencies*); Dependabot bumps SHA and comment together, weekly, grouped,
  with a 7-day cooldown (zizmor `dependabot-cooldown`).
- **`persist-credentials: false`** on every checkout (zizmor `artipacked`).
- **No `harden-runner`.** The surface is small (four pinned actions, `npm ci` from a lockfile,
  one pinned `npx` package); egress auditing adds a third-party dependency for little signal
  here. Revisit in audit mode once public.
- **CodeQL reads `.gs` as JavaScript** via the extractor's `LGTM_INDEX_FILETYPES=".gs:js"`
  (github/codeql `javascript/extractor/.../AutoBuild.java`). It is an extractor variable, not a
  documented action input: confirm on the first public run that the `src/*.gs` files appear in
  the CodeQL "files scanned" summary.
- **Lint the workflows locally:** `nix run nixpkgs#actionlint` and
  `nix run nixpkgs#zizmor -- --persona=auditor .github/`.

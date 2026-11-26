# Deploy the add-on

## Install paths

**Web editor** (first run; *Deploy → Test deployments → Install* is editor-only):

1. Create an Apps Script project, runtime **V8**.
2. Copy every file under `src/` into it: `appsscript.json`, `JsonResumeToDoc.gs`, `RenderDoc.gs`
   and `third_party/apps-script-oauth2/OAuth2.gs`.
3. Deploy as a Workspace add-on and add the step to a flow.

**clasp** (after first light): `cp .clasp.json.example .clasp.json`, put your `scriptId` in it,
then `npx @google/clasp push`. `rootDir` is `src/`, so only the add-on is pushed. `.clasp.json`
is gitignored: a script id is yours, not the repo's.

**gcloud** (optional, with [direnv](https://direnv.net)): `cp .envrc.local.example .envrc.local`, put
your Google Cloud project ID in it, then `direnv allow`. Inside this folder gcloud then uses
that project through `CLOUDSDK_CORE_PROJECT`, and the tracked `.envrc` loads the Nix devShell
(`nix develop`: Node.js 24 + git). `.envrc.local` is gitignored for the same reason.

The `.gs` files share **one global scope** in Apps Script. `RenderDoc.gs` uses `str()` from
`JsonResumeToDoc.gs`, and the step uses the renderer's functions, so every file must be in the
project and none may redefine another's names. A test fails on a name defined twice. Load order
does not matter: `OAuth2` is defined at load and used only at call time.

**Why `third_party/` sits inside `src/`:** Google's convention keeps vendored code under
`third_party/<project>/` with its `LICENSE`. clasp pushes only `rootDir`, so the directory lives
under `src/`; nested files push as `third_party/apps-script-oauth2/OAuth2`. Prettier and ESLint
skip it.

## Deploying it — the honest path

**Platform status:** on 2026-10-22 Google's admin page called custom steps a **limited
preview** ([Allow or block custom steps][custom-steps-admin]). By 2026-11-06 its help page no
longer did; [the Marketplace listing notes](../marketplace-listing.md) record that reading.
Check both pages before relying on either.

[custom-steps-admin]: https://knowledge.workspace.google.com/admin/studio/allow-or-block-ws-custom-steps?hl=en

**Check this before writing any more code:** custom steps are **OFF by default**. A super-admin
must enable them at *Admin console → Apps → Google Workspace → Workspace Studio: Custom steps
settings*, and there is a separate *Approvals* control. No developer doc mentions this; it is
the likeliest day-one blocker. You also need an eligible edition (Business, Enterprise or
Education — a personal `@gmail.com` needs Workspace Experiments), flows allowed, and Gemini
enabled.

**No Google Cloud project is needed** for a step. That requirement applies to *starters*, which
post to the Workspace Studio API. This add-on requests two scopes ([scopes](../reference/scopes.md)).

**The Drive and Docs advanced services must stay declared** in `appsscript.json`
(`dependencies.enabledAdvancedServices`). Without them, REST calls return **403** *"Google Drive
API has not been used in project …"*, because the hidden default Cloud project has the API off.
Declaring the service turns it on and **adds no scope**. The code never calls the `Drive` or
`Docs` globals; the declaration exists only to enable the APIs.

**URL allowlist (`urlFetchWhitelist`):** optional for a **test** deployment, **required** for a
**versioned** one. Entries must be `https://` with a full domain and a path, with at most one
leading `*` for subdomains. **There is no "any host" entry.** Once declared, the list is
enforced: *"script projects can't access URLs that have not been added to the allowlist"*. The
page does not exempt test deployments. **But the 2026-10-27 live run contradicts a strict
reading:** under a test deployment with the list declared, Load JSON Resume fetched
`registry.jsonresume.org/{user}.json`, which 301s to `jsonresume.org`, then not on the list.
So either a test deployment does not enforce the list, or redirect targets are not checked.
Which one is unmeasured. A **versioned** deployment is where the list certainly applies.

**The list itself** is `urlFetchWhitelist` in `src/appsscript.json`: `jsonresume.org` (sign-in,
token and résumé) and Google's own API hosts.

**Use the web editor for the first run, not `clasp`.** `clasp` is in nixpkgs as
`nixpkgs#google-clasp` (note: `nixpkgs#clasp` is a different program entirely), but it
**cannot create the test deployment** — *Deploy → Test deployments → Install* is editor-UI only
and has no API. So clasp saves nothing on the critical path and costs a login. Adopt it after
first light, when `clasp push` beats re-pasting.

1. Create an Apps Script project, runtime **V8**.
2. Project Settings → tick *Show `appsscript.json` manifest file in editor*.
3. Paste every file under `src/` ([install paths](#install-paths)).
4. **Deploy → Test deployments → Install → Done.**
5. Refresh Workspace Studio and authorise the add-on.

**First-run flow that gives an unambiguous verdict:** *starter → JSON Resume Connect →
Notify me in Chat*, with `name`, `docUrl` and `pdfUrl` as variable chips in the message.

| What you see | Meaning |
|---|---|
| Your real name and a Doc link that opens | **works** |
| "not connected to JSON Resume" | open the step, click **Connect JSON Resume**, refresh the page |
| "connection expired or was revoked" | connect again |
| "your JSON Resume account has no resume yet" | create it in the jsonresume.org dashboard |
| "does not match the jsonresume.org schema: …" | fix the listed fields in your résumé |
| Step errors, or outputs are unavailable as chips | the return shape is wrong |

**Where to look when it fails:** the flow's **Activity** tab first, for the user-facing error.
Then Apps Script editor → **Executions**; `onExecute` logs which inputs arrived (never the
résumé itself, which is personal data).

## Also learned in the deploy

- **"Allow unpublished (test) custom steps"** is a *second* sub-gate nested under the Admin
  console's Custom-steps toggle. A Test deployment is unpublished by definition, so without it
  the step installs and is then refused at run time. It auto-checks when the parent is set to
  ON — but unchecking it later would break every test step with no obvious cause.
- **Save before deploying.** Apps Script reads the manifest *server-side* to decide the
  deployment type. With unsaved changes, `Deploy → Test deployments` offers no **Install** and
  says only *"update the manifest file with Add-on details"*.

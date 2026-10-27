# Security policy for JSON Resume Connect

## Supported versions

There are no tagged releases yet. Security fixes land on **`main`** only, and on the
**latest release** once releases exist. Older releases are not patched; upgrade instead.

| Version | Supported |
|---|---|
| latest release (or `main` before the first release) | yes |
| anything older | no |

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/ismailkattakath/jsonresume-connect/security/advisories/new):
*Security → Report a vulnerability*. Only the maintainer and you can see the report.

Include:

- what an attacker can do, and against whom (the add-on's user, their Drive, their JSON Resume
  account);
- the smallest reproduction you can give — a crafted `resume.json` field is ideal;
- the commit or release you tested.

**Never include a real OAuth token, a real résumé, or someone else's data.** Redact them.

### What happens next

- The maintainer acknowledges the report and works on a fix in the private advisory.
- The fix ships, then the advisory is published with credit to you, unless you ask not to be
  named.
- This is a one-person project, so response times are best effort.

## Scope

In scope — the security properties this add-on is meant to keep:

| Area | The property | Where |
|---|---|---|
| **OAuth tokens** | The jsonresume.org access and refresh tokens live only in the running user's Apps Script `UserProperties` (with `UserCache`), via the vendored OAuth2 library. They must never be logged, returned as a step output, written into a Doc, or readable by another user. | `LoadJsonResume.gs`, `OAuth2.gs` |
| **Untrusted résumé content** | Every résumé value is attacker-controllable text. It must be HTML-escaped before it reaches the generated document, and a link must only become a link when its URL is safe (no `javascript:` and similar). Any injection into the Doc, or a way to make a link do something other than open an `https` page, is a vulnerability. | `RenderResume.gs` (`escapeHtml` and the URL check) |
| **Drive access** | The add-on asks only for `drive.file`: it can touch files it created or the user opened with it, nothing else. Any path that reads or changes another Drive file, or widens the scope, is a vulnerability. | `appsscript.json` (`oauthScopes`) |
| **Outbound URLs** | The manifest declares a `urlFetchWhitelist`; Google enforces it on versioned deployments (whether test deployments or redirect targets are checked is unmeasured — see the README). A fetch that reaches a host the add-on did not mean to contact is a vulnerability. | `appsscript.json` |

Out of scope:

- Bugs in jsonresume.org itself — report them to
  [jsonresume/jsonresume.org](https://github.com/jsonresume/jsonresume.org).
- Bugs in Google Apps Script, Workspace Studio or Google Docs — report them to Google.
- Bugs in the upstream OAuth2 library that this project has not modified — report them to
  [googleworkspace/apps-script-oauth2](https://github.com/googleworkspace/apps-script-oauth2).
  If our vendored copy is affected, tell us too.
- Anything that needs the victim's own Google account already compromised.

# Configuration reference

Where the step's pieces live, the card it shows, and how the jsonresume.org connection works.

## Where things live

| | |
|---|---|
| Name | `addOns.common.name` and the step's `name` in `src/appsscript.json`, plus `APP_NAME` in `JsonResumeToDoc.gs` (jsonresume.org's consent screen shows it). A test fails if the three differ or the literal appears anywhere else in code. No "Google" in the name: the add-on naming rules forbid it |
| Code | `src/JsonResumeToDoc.gs` (connect, fetch, validate, outputs) · `src/RenderDoc.gs` (HTML → Doc) |
| Vendored | `src/third_party/apps-script-oauth2/OAuth2.gs` |

## The Connect JSON Resume card

| Card state | Shows |
|---|---|
| Not connected | **Connect JSON Resume**, plus "After connecting, **refresh** this page" |
| Connected | "Connected to JSON Resume as @username", the **Document title** field, and **Disconnect** |

| Input | Required | Notes |
|---|---|---|
| `title` | no | the Doc's name. Defaults to `<basics.name> — Resume`. Accepts a variable from an earlier step |

The cards have no header, so they do not repeat the name. The field title matches the manifest
input's description (a test checks it).

**Disconnect** swaps the connected section for the Connect section in place, through
`AddOnsResponseService` `modifyCard` → `replaceSection`. Studio's guides say card navigation is not
supported in Studio add-ons ([update cards](https://developers.google.com/workspace/add-ons/studio/update-cards)).
The earlier `CardService` navigation call was replaced. **Run live 2026-10-28:** the section swaps
in place, and the cards render without a header. A successful connect loads the résumé once, so
the card shows "as @username" before the first run.

**Labels are sentence case** (Google's add-on style guide), except proper nouns: "Connect JSON
Resume", "Disconnect", "Document title". The connect card links `jsonresume.org` for sign-up; Studio
opens card links in a new tab, which suits it. The bold **refresh** stays text, not a link. A test
checks every card and manifest label.

**If client registration fails** (jsonresume.org down), the card says "JSON Resume sign-in is
unavailable right now. Try again in a few minutes." instead of showing a raw error.

**One spelling:** everything the user reads says **resume**, in ASCII as in the JSON Resume name.
That covers cards, errors, the manifest and the Doc's default title. A test enforces it. Prose in
these docs keeps résumé.

1. **No account yet?** Create one at jsonresume.org. **Sign in with GitHub:** the dashboard stores
   your résumé as a GitHub gist it creates for you, using your GitHub sign-in (upstream
   `gistOperations.js`, read 2026-10-27). An email-and-password account cannot create one.
2. Click **Connect JSON Resume** and approve **"Read your resume"** on jsonresume.org.
3. **Refresh the Studio page.** Studio does not redraw a step card after a sign-in in another
   tab, and reopening the step does not help, measured 2026-10-27. Clicking Connect again also
   shows it connected. The card says **refresh** in bold rather than as a link: Studio strips
   bold from card links and opens them in a new tab, so a link cannot refresh this page.

   **The config event does carry the flow's id**
   (`workflow.elementConfiguration.workflowId`, live 2026-10-27), should a link ever be wanted.

**Known upstream bug:** signing in to jsonresume.org **with GitHub** during Connect lands on
`/dashboard` instead of the approval screen
([jsonresume/jsonresume.org#636](https://github.com/jsonresume/jsonresume.org/issues/636)).
Click **Connect JSON Resume** again.

**How the connection works:**

| Piece | Value | Evidence |
|---|---|---|
| Library | [OAuth2 for Apps Script](https://github.com/googleworkspace/apps-script-oauth2), vendored as `src/third_party/apps-script-oauth2/OAuth2.gs` at `aae9287` (Apache-2.0, byte-identical to upstream `dist/OAuth2.gs`; a test pins its sha256) | that commit fixes token refresh for clients without a secret (#513) |
| Client | registered once per deployment through jsonresume.org's self-serve dynamic client registration (`/api/oauth/register`): a public client, **no secret** | measured 2026-10-27 |
| Security | PKCE S256 (required by jsonresume.org) | measured |
| Redirect | `https://script.google.com/macros/d/{scriptId}/usercallback` | measured: accepted |
| Scope | `resume:read` | |
| Tokens | access 1 h, refresh 90 days, kept in the user's own `UserProperties` | measured |
| Fetch | `GET https://jsonresume.org/api/oauth/resume` → `{ username, url, resume }` | measured: 200 |

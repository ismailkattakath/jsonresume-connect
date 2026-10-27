# Design review — card UX against Google's add-on and Studio guidelines

Audit of `main` @ `8fe629c`, 2026-10-27. **For agent "core"; nothing here edits code.**
Line numbers are from that commit.

## Verdict

- The cards are **short, plain and mostly compliant**. Error messages already follow "problem,
  then fix" ("Could not load resume: … Open this step and connect again.").
- **Two fixes matter before review:** an unsupported card-navigation call, and raw HTTP/exception
  text that reaches the user.
- The rest is polish: retryability, casing and naming.

## Sources

| Short name | Page |
|---|---|
| Style guide | <https://developers.google.com/workspace/add-ons/guides/workspace-style> |
| Studio config cards | <https://developers.google.com/workspace/add-ons/studio/configuration-cards> |
| Studio update cards | <https://developers.google.com/workspace/add-ons/studio/update-cards> |
| Studio errors | <https://developers.google.com/workspace/add-ons/studio/handle-errors> |
| App review | <https://developers.google.com/workspace/marketplace/about-app-review> |

## Must fix

| # | Where | Now | Rule | Change |
|---|---|---|---|---|
| 1 | `LoadJsonResume.gs:95-100` `disconnectJsonResume` | returns `CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(…))` | Studio config cards: navigation methods "aren't supported in add-ons that extend Workspace Studio". Studio update cards: the action "must call a function that returns a `RenderActions` object containing modification instructions" | Return `AddOnsResponseService.newRenderActionBuilder().setAction(AddOnsResponseService.newAction().addModifyCard(AddOnsResponseService.newModifyCard().setReplaceSection(…)))`, swapping the connected section for the connect section. **Verify live first**: if Disconnect visibly works today, record that and keep it. |
| 2 | `RenderResume.gs:186` `checkResponse` → surfaced by `RenderResume.gs:116` (`'Could not create the Google Doc: ' + err.message`) | the user sees `… returned HTTP 403: <up to 300 chars of API error>` | Style guide: "Don't let the user see any exceptions your code throws"; "check that your add-on doesn't display debug information in the UI" | Map status to a plain sentence (403 → "Google refused to create the Doc. Check that the add-on is still allowed to create files in your Drive."). Send the raw detail to `console.error` only. |
| 3 | `LoadJsonResume.gs:186` | `'Could not load resume: ' + err.message` (a raw UrlFetch exception) | same | "Could not reach jsonresume.org. The step will try again." Log `err.message`. |
| 4 | `LoadJsonResume.gs:143` | `throw new Error('jsonresume.org client registration returned HTTP …')` inside `onConfig` | same; an uncaught throw in a config card shows a raw error | Catch it in `onConfigLoadJsonResume` and return a card: "JSON Resume sign-in is unavailable right now. Try again in a few minutes." |
| 5 | `LoadJsonResume.gs:182` | "jsonresume.org returned HTTP 503." | Style guide: "Explain the problem from the user's standpoint, and suggest how to fix it" | 5xx/429: "jsonresume.org is not responding. The step will try again." Other 4xx: say what to check. |

## Should fix

| # | Where | Now | Rule | Change |
|---|---|---|---|---|
| 6 | `LoadJsonResume.gs:261-270` `failStep` | every failure is `ACTIONABLE` + `NOT_RETRYABLE` | Studio errors: `RETRYABLE` "attempts to run the step again up to five times"; `NOT_ACTIONABLE` is for errors inputs cannot fix | Add `failStep(message, {retry: true})` → `NOT_ACTIONABLE` + `RETRYABLE`. Use it for network errors, 5xx and 429 (items 3 and 5). Keep the current pair for schema, connection and input errors. |
| 7 | Manifest step names and card headers: `Apply Tailoring`, `Parse Job Description` | Title Case | Style guide: "Use sentence case (especially for buttons, labels, and card actions)" | `Apply tailoring`, `Parse job description`. `Load JSON Resume` and `Render JSON Resume to Doc` stay as they are: "JSON Resume" is a proper noun. |
| 8 | Field titles vs manifest | card `Resume JSON` (`RenderResume.gs:61`), `Job posting as JSON` (`ParseJobDescription.gs`); manifest `Resume (JSON)`, `Job posting (JSON)` | one label per thing | Use the manifest's wording on the cards: `Resume (JSON)`, `Job posting (JSON)`. |
| 9 | Spelling | UI and manifest say **resume**; README says **résumé** | consistency | Keep **resume** in UI strings (ASCII, matches the JSON Resume name). The README may keep résumé in prose. |
| 10 | `addOns.common.name` = `JSON Resume`; `logoUrl` = the jsonresume org avatar | borrows another project's name and logo | Marketplace policies: "Do not represent that you or your product is authorized by, endorsed by or produced by another company"; review: "The icon properly represents the app's name or functionality" | Name `JSON Resume Connect`; `logoUrl` → repo-hosted `assets/icon-128.png`. See `docs/naming.md` and `assets/README.md`. |
| 11 | `LoadJsonResume.gs:138` `client_name: 'JSON Resume for Workspace Studio'` | shown on jsonresume.org's consent screen; carries a Google mark | Google trademark guidelines: "Don't incorporate Google Brand Features into your own product names" | `client_name: 'JSON Resume Connect'`. It applies to new registrations only; the stored `JR_CLIENT_ID` keeps the old name until re-registered. |

## Nice to have

| # | Where | Change | Why |
|---|---|---|---|
| 12 | Connect card (`LoadJsonResume.gs:78-80`) | Make "jsonresume.org" a link to `https://jsonresume.org`. Studio opens card links in a new tab (README, measured), which suits a sign-up. | One click instead of typing a URL. |
| 13 | Connect card "After connecting, **refresh** this page." | Keep it. Add "(your browser's reload button)" only if users ask. | The bold is a deliberate workaround, already documented (Studio strips bold in links and opens links in a new tab). |
| 14 | Any future card image (`CardHeader.setImageUrl`) | Always pair it with `setImageAltText('JSON Resume Connect')`. | Style guide: hosted images must be "accessible by everyone who may use your add-on". |
| 15 | Hints that name "the Ask Gemini step" | Fine as is. | Naming a Google feature in **body text** is nominative use; the trademark rules apply to the add-on's **name**, logo and listing. |

## Already compliant

| Check | Evidence |
|---|---|
| Button labels start with a verb (style guide) | `Connect JSON Resume`, `Disconnect` |
| Errors name the fix | `LoadJsonResume.gs:164,176,179`, `ParseJobDescription.gs` "Open the step and pick the output of the Ask Gemini step." |
| Errors reach the Activity tab, not a log | `failStep` uses `setErrorLog` (Studio errors) |
| Short card text, no jargon | each card has one paragraph of at most two sentences |
| Variables offered on every input | `setIncludeVariables(true)` on all text inputs |
| No Google product icons in the UI | no images in any card |

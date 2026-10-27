# Google Workspace Marketplace listing

Copy-paste text and the asset list for **Google Cloud console › APIs & Services › Google
Workspace Marketplace SDK › Store Listing** ([Create a listing][listing]).

> **Status to check first:** Google's help page labels Workspace Studio custom steps as a
> **limited preview** ([Create and use custom steps][studiohelp]). Confirm that a public
> Marketplace listing for a Studio-only add-on is accepted **before** paying for review effort.
>
> **One step, named "JSON Resume Connect"** (core merges Load + Render into it and deletes
> Parse Job Description and Apply Tailoring).

## The step

| | |
|---|---|
| Step name | **JSON Resume Connect** |
| Configuration | **Connect JSON Resume** button (OAuth with PKCE); **Disconnect** once connected |
| Runs | load résumé from jsonresume.org → check against the JSON Resume schema (fail if invalid) → write a new Doc in the user's Drive |

### Outputs — match core's final manifest

| Output | Meaning |
|---|---|
| Doc URL | link to the new Doc |
| PDF link | PDF export of that Doc |
| DOCX link | DOCX export of that Doc |
| Doc ID | Drive file ID of the Doc |
| Name | `basics.name` |
| Headline | `basics.label` |
| Email | `basics.email` |
| Resume (JSON) | the validated `resume.json` |
| Resume (plain text) | the résumé as plain text |

## App details

| Field | Limit ([listing]) | Value |
|---|---|---|
| Application name | ≤ 50 chars | `JSON Resume Connect` (19) — rationale: [`naming.md`](naming.md) |
| Short description | ≤ 200 chars | see below (measured length noted) |
| Detailed description | < 16,000 chars | see below (1,605 chars, measured) |
| Category | console dropdown | **Productivity** if offered; otherwise the closest office/productivity entry |
| Language | — | English |

### Short description (147 chars, measured)

```text
Load your JSON Resume in a Workspace Studio flow, check it against the schema, and render it as a document in Google Docs™ with PDF and DOCX links.
```

### Detailed description

```text
JSON Resume Connect adds one résumé step to your Google Workspace Studio™ flows.

Keep one résumé in the open JSON Resume standard (jsonresume.org). The step turns it into a clean document in Google Docs™ whenever your flow runs — for example, each time a job posting arrives.

WHAT THE STEP DOES
• Connect once — sign in to your jsonresume.org account from the step's card (OAuth with PKCE). Disconnect at any time.
• Load and check — each run loads your résumé and checks it against the JSON Resume schema. If it does not match, the step fails with the problems listed, so you fix the source instead of sending a broken résumé.
• Render — writes the résumé into a new document in your Google Drive™, in a clean academic-CV style, and returns the Doc link plus PDF and DOCX download links for the next steps of your flow (for example, a Gmail draft).

WHY IT IS BUILT THIS WAY
• No API key to obtain or pay for.
• Deterministic output that can be tested.
• Narrow permissions: it can open only the files it creates (drive.file), plus outbound requests to jsonresume.org and Google's Docs and Drive APIs.
• No server, no analytics, no tracking. Your résumé and your Docs stay in your accounts.

YOU NEED
• A Google Workspace account with access to Workspace Studio.
• A jsonresume.org account with a résumé (sign in with GitHub).

Open source (MIT): https://github.com/ismailkattakath/jsonresume-connect

Independent project. Not affiliated with or endorsed by the JSON Resume project or Google LLC. Google Docs™, Google Drive™, Google Workspace™ and Google Workspace Studio™ are trademarks of Google LLC.
```

## Graphic assets

| Asset | Required | File | Rule ([listing], [review]) |
|---|---|---|---|
| App icon 32×32 | yes | `assets/icon-32.png` | "at least two sizes: 32x32 and 128x128" |
| App icon 128×128 | yes | `assets/icon-128.png` | same |
| Card banner 220×140 | yes | `assets/card-banner-220x140.png` | "Required size: 220x140 pixels" |
| Screenshots | ≥ 1, ≤ 10 | `assets/screenshots/1–4` (5–6 to capture) — see below | 1280×800 recommended; square corners, no padding |
| Promo video | optional | — | YouTube URL |

Icons are square, in colour, with transparent backgrounds — the [review] criteria.

### Screenshots

Captured in a real Workspace Studio session, in a 1280×800 window at 2× (files are 2560×1600,
an accepted size). Before each capture, the account photo and the page scrollbar were hidden
with CSS; nothing was edited after capture. The recipient is `hiring@example.com`.

| # | Shot | File |
|---|---|---|
| 1 | **The flow** — starter → **JSON Resume Connect** → Gmail draft using its Doc name and link | `assets/screenshots/1-flow.png` |
| 2 | **Connect card** — the step not yet connected, showing **Connect JSON Resume** | `assets/screenshots/2-connect.png` |
| 3 | **Connected card** — "Connected to JSON Resume as @username" with **Disconnect** | `assets/screenshots/3-connected.png` |
| 4 | **Step outputs** — all ten outputs offered to the next step | `assets/screenshots/4-outputs.png` |
| 5 | **The result** — the rendered résumé open in Google Docs | to capture with a **test** JSON Resume account |
| 6 | **A clear failure** — the Activity tab showing an actionable schema error | to capture with a **test** account holding an invalid résumé |

Shot 3 shows the maintainer's public JSON Resume handle. Shots 5 and 6 would show a whole
résumé, so they need a test account rather than real personal data.

## Support links (required)

All three are served by GitHub Pages from `docs/` (see `docs/_config.yml`). Replace the base URL
if the repo is renamed (see [`naming.md`](naming.md)) — **Pages URLs do not follow a rename**.

| Field | URL |
|---|---|
| Terms of service | `https://jsonresume-connect.kattakath.com/terms/` |
| Privacy policy | `https://jsonresume-connect.kattakath.com/privacy/` |
| Support | `https://github.com/ismailkattakath/jsonresume-connect/issues` |
| Help (optional) | `https://github.com/ismailkattakath/jsonresume-connect#readme` |
| Report issue (optional) | `https://github.com/ismailkattakath/jsonresume-connect/issues/new/choose` |

The privacy URL must also go into the OAuth consent screen ([policies][pol]: "In the designated
field in the Google Marketplace SDK" and "In your OAuth client configuration").

## Review pitfalls ([about app review][review])

| Rejection reason (quoted) | How this listing avoids it |
|---|---|
| "Inappropriate use of Google's trademarks in the app name, logo, or app descriptions." | Google-free name; "for Google Docs™" style only in text, with ™ and attribution |
| "Links don't work or point to the incorrect information." | Check all five URLs after Pages is live and the repo is public |
| "Screenshots and images are of low quality, or don't accurately represent app capabilities." | Real 1280×800 captures only |
| "The app is still being tested and not publicly ready." | Submit only after the manifest is final and the test flow passes end to end |
| "The app didn't complete the OAuth verification." | See [`oauth-verification.md`](oauth-verification.md) |

[listing]: https://developers.google.com/workspace/marketplace/create-listing
[review]: https://developers.google.com/workspace/marketplace/about-app-review
[pol]: https://developers.google.com/workspace/marketplace/terms/policies
[studiohelp]: https://support.google.com/workspace-studio/answer/16433731

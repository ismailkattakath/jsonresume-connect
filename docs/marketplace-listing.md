# Google Workspace Marketplace listing

Copy-paste text and the asset list for **Google Cloud console › APIs & Services › Google
Workspace Marketplace SDK › Store Listing** ([Create a listing][listing]).

> **Status to check first:** Google's help page labels Workspace Studio custom steps as a
> **limited preview** ([Create and use custom steps][studiohelp]). Confirm that a public
> Marketplace listing for a Studio-only add-on is accepted **before** paying for review effort.
>
> **Step table below matches `appsscript.json` on `main` (four steps).** Match it to core's
> final manifest before submitting.

## App details

| Field | Limit ([listing]) | Value |
|---|---|---|
| Application name | ≤ 50 chars | `JSON Resume to Doc` (18) — rationale: [`naming.md`](naming.md) |
| Short description | ≤ 200 chars | see below (measured length noted) |
| Detailed description | < 16,000 chars | see below (1,808 chars, measured) |
| Category | console dropdown | **Productivity** if offered; otherwise the closest office/productivity entry |
| Language | — | English |

### Short description (147 chars, measured)

```text
Load your JSON Resume in a Workspace Studio flow, check it against the schema, and render it as a document in Google Docs™ with PDF and DOCX links.
```

### Detailed description

```text
JSON Resume to Doc adds résumé steps to your Google Workspace Studio™ flows.

Keep one résumé in the open JSON Resume standard (jsonresume.org). Let a flow turn it into a clean document in Google Docs™ whenever you need one — for example, each time a job posting arrives.

STEPS
• Load JSON Resume — connect your jsonresume.org account once. Each run loads your résumé, checks it against the JSON Resume schema, and fails clearly if it does not match.
• Render JSON Resume to Doc — writes a résumé into a new document in your Google Drive™, in a clean academic-CV style, and returns the Doc link plus PDF and DOCX download links.
• Parse Job Description — checks a job posting that an AI step wrote as JSON against the JSON Resume job schema.
• Apply Tailoring — applies a short tailoring patch from an AI step to your résumé: the headline and summary may be reworded, highlights and skills only picked and reordered. Employers, titles, dates and degrees are never changed.

WHY IT IS BUILT THIS WAY
• No API key to obtain or pay for. Tailoring belongs to the AI step you already have in Workspace Studio.
• Deterministic steps that can be tested.
• Narrow permissions: it can open only the files it creates (drive.file), plus outbound requests to jsonresume.org and Google's Docs and Drive APIs.
• No server, no analytics, no tracking. Your résumé and your Docs stay in your accounts.

YOU NEED
• A Google Workspace account with access to Workspace Studio.
• A jsonresume.org account with a résumé (sign in with GitHub).

Open source (Apache-2.0): https://github.com/ismailkattakath/jsonresume-google-docs

Independent project. Not affiliated with or endorsed by the JSON Resume project or Google LLC. Google Docs™, Google Drive™, Google Workspace™ and Google Workspace Studio™ are trademarks of Google LLC.
```

## Graphic assets

| Asset | Required | File | Rule ([listing], [review]) |
|---|---|---|---|
| App icon 32×32 | yes | `assets/icon-32.png` | "at least two sizes: 32x32 and 128x128" |
| App icon 128×128 | yes | `assets/icon-128.png` | same |
| Card banner 220×140 | yes | `assets/card-banner-220x140.png` | "Required size: 220x140 pixels" |
| Screenshots | ≥ 1, ≤ 10 | to capture — see below | 1280×800 recommended; square corners, no padding |
| Promo video | optional | — | YouTube URL |

Icons are square, in colour, with transparent backgrounds — the [review] criteria.

### Screenshots

Capture at **1280×800**, in a real Workspace Studio session with a test résumé (no real personal
data). `assets/screenshot-placeholder-1280x800.png` is a frame only; it **cannot** be submitted.

1. **The flow** — Studio canvas: starter → Load JSON Resume → Gemini step → Render JSON Resume
   to Doc → Gmail draft.
2. **Connect card** — Load JSON Resume, not connected, showing **Connect JSON Resume**.
3. **Connected card** — "Connected to JSON Resume as @username" with **Disconnect**.
4. **Render step card** — the Resume JSON field bound to a variable from an earlier step.
5. **The result** — the rendered résumé open in Google Docs.
6. **A clear failure** — the Activity tab showing an actionable schema error.

## Support links (required)

All three are served by GitHub Pages from `docs/` (see `docs/_config.yml`). Replace the base URL
if the repo is renamed (see [`naming.md`](naming.md)) — **Pages URLs do not follow a rename**.

| Field | URL |
|---|---|
| Terms of service | `https://ismailkattakath.github.io/jsonresume-google-docs/terms/` |
| Privacy policy | `https://ismailkattakath.github.io/jsonresume-google-docs/privacy/` |
| Support | `https://github.com/ismailkattakath/jsonresume-google-docs/issues` |
| Help (optional) | `https://github.com/ismailkattakath/jsonresume-google-docs#readme` |
| Report issue (optional) | `https://github.com/ismailkattakath/jsonresume-google-docs/issues/new/choose` |

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

# Naming and trademark verdict

## Verdict

- **"JSON Resume to Google Doc" is non-compliant.** It puts a Google product name inside the
  add-on's own name.
- **Recommended name: `JSON Resume to Doc`** (18 characters). Use it for the manifest
  `addOns.common.name`, the Marketplace app name and the OAuth consent-screen app name.
- **Recommended repo slug: `jsonresume-to-doc`** (it is now `jsonresume-google-docs`).
- Google products appear **in descriptions only**, as "for Google Docs™", with an attribution
  line.

## The rules, quoted

| Source | Rule (verbatim) | Effect on the name |
|---|---|---|
| [Add-on style guide][style] | "Don't include the words "Google", "Gmail", or other Google product names in your add-on name." | "Google Doc" in the name is out |
| [Marketplace app review][review] | "The app, including its name, doesn't use Google brand assets, trademarks, or Google branded content." Listed rejection reason: "Inappropriate use of Google's trademarks in the app name, logo, or app descriptions." | a Google mark in the name is a rejection reason |
| [Marketplace branding][mbrand] | "Don't use any Google trademarks or any confusingly similar marks as the name of your extension or company." Exception: "you may make reference to that Google product by using the phrases "for", "for use with", or "compatible with" before the trademark" — "be sure to include the ™ symbol". Attribution example: "Google Chat™ is a trademark of Google LLC". Description example: "Productivity tool for Google Chat™" | "for Google Docs™" is allowed, and its own example sits in a **description** |
| [Google trademark guidelines][tm] | "Don't incorporate Google Brand Features into your own product names, service names, trademarks, logos, or company names." | same |
| [OAuth consent-screen branding][cbrand] | Avoid names confusable with Google's brands; don't combine Google product names with generic terms (examples rejected: "Google Photo App", "Gmail for Android") | the consent-screen name must also be Google-free |

### Why the "for Google Docs™" exception does not save the name

- The Marketplace branding page allows it; the add-on style guide and the app-review criteria
  forbid any Google product name in the add-on name. A listing must pass **review**, so the
  stricter rule decides.
- **Weakest assumption:** the branding page might win if a reviewer reads it as the governing
  rule. Nothing is lost by the Google-free name, so the safe option costs nothing.

## Why `JSON Resume to Doc`

| Option | Google-free | Says what it does | Implies official JSON Resume product | Verdict |
|---|---|---|---|---|
| JSON Resume to Google Doc | no | yes | somewhat | **rejected**: Google mark |
| JSON Resume for Google Docs™ | no (allowed in descriptions only) | yes | somewhat | **rejected** as the name; fine as a tagline |
| JSON Resume (current manifest name) | yes | no | **yes**: it is the project's own name | **rejected** until the JSON Resume org adopts this repo |
| JSON Resume Steps | yes | weak | somewhat | runner-up: fits four steps, but says nothing about the Doc |
| **JSON Resume to Doc** | yes | yes | names the standard it reads, not who makes it | **chosen** |

- "Doc" is a common English word for a document. It is not "Google Docs".
- It matches the existing step name "Render JSON Resume to Doc".
- The style guide prefers "15 or fewer characters"; 18 is a soft miss, accepted for clarity.

## The JSON Resume name

- **No published brand or trademark policy** for JSON Resume was found. Searched on
  2026-10-27: the `jsonresume` GitHub org's repositories, `jsonresume/jsonresume.org` README,
  CONTRIBUTING, DESIGN_SYSTEM_PLAN and the org profile.
- The code is **MIT** ("Copyright (c) 2014-2026 JSON Resume contributors"). The logo files
  (`apps/styleguide/public/brand/*.svg`) carry **no separate licence**. So this project does
  **not** use the JSON Resume logo: it has its own mark (`assets/`).
- "JSON Resume" is used **nominatively**, to name the open standard and service the add-on
  reads. That is how the ecosystem names itself too (`resume-cli`, `jsonresume-theme-*`).
- Marketplace policy: "Do not represent that you or your product is authorized by, endorsed by
  or produced by another company" ([policies][pol]). Until the JSON Resume org adopts the
  project, every listing and the README carry:
  > *Independent project. Not affiliated with or endorsed by the JSON Resume project.*
- If the org adopts it, drop the disclaimer. The repo then moves to `jsonresume/jsonresume-to-doc`.

## Attribution line (descriptions, README footer, Pages footer)

> Google Docs™, Google Drive™, Google Workspace™ and Google Workspace Studio™ are trademarks of
> Google LLC. JSON Resume to Doc is not affiliated with or endorsed by Google LLC.

## Places to rename (for agent "core" and the lead; not done here)

| Where | Now | Change to |
|---|---|---|
| `appsscript.json` › `addOns.common.name` | `JSON Resume` | `JSON Resume to Doc` |
| `appsscript.json` › `addOns.common.logoUrl` | jsonresume org avatar | repo-hosted `assets/icon-128.png` (see `assets/README.md`) |
| `LoadJsonResume.gs` › `client_name` in dynamic client registration | `JSON Resume for Workspace Studio` | `JSON Resume to Doc` (jsonresume.org's consent screen shows it; "Workspace Studio" is a Google mark) |
| README H1 | `JSON Resume steps for Google Workspace Studio` | `JSON Resume to Doc` + "for Google Workspace Studio™" in the tagline |
| GitHub repo slug | `jsonresume-google-docs` | `jsonresume-to-doc` (GitHub redirects the old URL; **Pages URLs do not redirect**, so rename before registering the consent-screen URLs) |

[style]: https://developers.google.com/workspace/add-ons/guides/workspace-style
[review]: https://developers.google.com/workspace/marketplace/about-app-review
[mbrand]: https://developers.google.com/workspace/marketplace/terms/branding
[tm]: https://partnermarketinghub.withgoogle.com/brands/google/trademarks-and-terms/trademark-guidelines-for-proper-usage/
[cbrand]: https://support.google.com/cloud/answer/15549049
[pol]: https://developers.google.com/workspace/marketplace/terms/policies

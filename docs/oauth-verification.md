# OAuth verification and Marketplace setup — operator click-list

## Verdict

- **Sensitive-scope verification IS needed.** Read in the console on 2026-10-27 (Data Access):
  `drive.file` is **non-sensitive**, but **`script.external_request` is listed under "Your
  sensitive scopes"** ("Connect to an external service"). An earlier draft of this file guessed
  it was not sensitive; the console settled it. So publishing the app needs Google's
  sensitive-scope review: the justifications below **and the demo video** (§ Demo video script).
- Until verified, the app stays usable by test users only (Audience › Test users), and
  external users would see the unverified-app screen.
- **Do brand verification anyway.** Without it the consent screen does not show the app name and
  logo ([branding help][cbrand]). Marketplace review also checks that "The app has passed OAuth
  verification" ([review]).
- **Blocker to settle first: the homepage domain.** See "Weakest assumption" below.

## Scopes and justifications

Paste these into **Google Auth platform › Data Access** justifications and the Marketplace SDK.

| Scope | Class | Justification (paste) |
|---|---|---|
| `https://www.googleapis.com/auth/drive.file` | **Non-sensitive**, "recommended for most use cases" ([Drive scopes][drive]) | Creates one Google Doc per run in the user's Drive, styles it through the Docs API, and returns its link plus PDF and DOCX export links. It can open only files the add-on created. Full Drive access (`drive`) or read access (`drive.readonly`) would grant far more than the add-on uses, so the narrowest Drive scope was chosen. |
| `https://www.googleapis.com/auth/script.external_request` | **Sensitive** (console, Data Access, 2026-10-27) | Lets the add-on call jsonresume.org, the user's chosen résumé host, to read the user's own résumé after the user connects their account through OAuth (scope `resume:read`), and to call the Google Docs and Drive APIs. The manifest `urlFetchWhitelist` limits requests to `https://jsonresume.org/`, `https://docs.googleapis.com/` and `https://www.googleapis.com/`. |

**Why `drive.file` is the right Drive scope:** it is the only Drive scope that covers "Create new
Drive files, or modify existing files, that you open with an app" without reaching the user's other
files ([Drive scopes][drive]). The README records the add-on working end to end with **only these
two scopes** (measured 2026-10-27).

## Decided: a custom domain the operator owns

**Resolved 2026-10-27:** the pages are served at **https://jsonresume-connect.kattakath.com/**
(GitHub Pages custom domain, `docs/CNAME`; Cloudflare DNS-only `CNAME` → `ismailkattakath.github.io`).
The authorized domain is **`kattakath.com`**, which is the operator's Google Workspace domain, so it
is already verified with Google. A subdomain dedicated to this app matches the repo slug and
survives a repo rename or transfer (the `CNAME` file moves with the repo). The analysis below is
kept for the record.

## Previously the weakest assumption: a GitHub Pages homepage

- Brand verification requires: "The homepage must be hosted on a verified domain you own", and the
  privacy policy "should be hosted within the domain that hosts your homepage"
  ([verification requirements][vr]).
- Authorized domains must be **top private domains** you have verified ([branding help][cbrand]).
- `github.io` is on the Public Suffix List, so `ismailkattakath.github.io` *should* count as a top
  private domain. **No Google page confirms it is accepted.** The closest precedent: `glitch.me`
  (also a public suffix) was refused as an authorized domain ([Glitch forum][glitch]).
- **Settle it in 5 minutes:** in **Google Auth platform › Branding › Authorized domains**, try
  adding `ismailkattakath.github.io`.
  - **Accepted** → verify it in Search Console as a URL-prefix property (HTML-file method in
    `docs/`), and continue.
  - **Refused** → give GitHub Pages a **custom domain the operator owns** (Settings › Pages ›
    Custom domain) and use that domain everywhere below.
- **A rename or transfer changes the Pages URL.** That changes the homepage and privacy URLs on
  the consent screen, which means brand re-verification. The repo is already renamed to
  `jsonresume-connect`; a later transfer to the jsonresume org repeats this.

## Click-list (in order)

`<operator>` marks a value only the operator can supply. No email address is invented here.

### A. Cloud project

1. **Cloud console › project picker › New project.** Name it **and set the project ID** to
   `jsonresume-connect` (the repo slug; the ID is permanent and defaults to a random one). Attach
   a billing account: the [Configure OAuth][coauth] prerequisites list "Enable billing".
   **Done 2026-10-27:** project `jsonresume-connect`, number `560535498451`, org `kattakath.com`,
   billing linked, the three APIs below enabled.
2. **APIs & Services › Library.** Enable **Google Workspace Marketplace SDK**, **Google Drive
   API** and **Google Docs API** (the manifest uses the Drive v3 and Docs v1 advanced services).
3. **Apps Script editor › Project Settings › Google Cloud Platform (GCP) Project › Change
   project.** Enter the project **number** from step 1. This creates the OAuth client for the
   script ([Configure OAuth][coauth]).

### B. OAuth consent screen (Google Auth platform)

4. **Google Auth platform › Branding.**
   - App name: `JSON Resume Connect`
   - User support email: `<operator>`
   - App logo: `assets/icon-120.png` ("120px by 120px", ≤ 1 MB — [branding help][cbrand])
   - Application home page: `https://jsonresume-connect.kattakath.com/`
   - Privacy policy: `…/privacy/` · Terms of service: `…/terms/`
   - Authorized domains: see "Weakest assumption"
   - Developer contact email: `<operator>`
5. **Google Auth platform › Audience.** User type **External**. Click **Publish app** (moves from
   Testing to In production). While in Testing, add test users under **Audience › Test users**.
6. **Google Auth platform › Data Access › Add or Remove Scopes.** Add the two scopes above. **Read
   the "sensitive" indicator** next to each ("Sensitive scopes require review by Google and have a
   sensitive indicator" — [scopes list][scopes]). Record what it says in this file.
7. **Search Console** (search.google.com/search-console). Verify the homepage domain with an
   account that is an Owner or Editor of the Cloud project ([verification requirements][vr]).
8. **Submit for verification.** Google Auth platform › **Verification Center** › Submit; older
   console path: **APIs & Services › OAuth consent screen › Edit app › Submit for verification**
   ([Configure OAuth][coauth]). Paste the justifications and the demo-video link.
   - Only sensitive scopes need the video; record it anyway, since brand and Marketplace reviewers
     use it.
   - Until verified, users outside your domain see the unverified-app screen, capped at "100 new
     users in total" ([unverified apps][unv]).

### C. Apps Script deployment

9. **Apps Script editor › Deploy › New deployment**, and pick the add-on deployment type shown
   in the **Select type** dropdown. Describe it `v1.0.0`.
   Then **Deploy › Manage deployments** and copy the **Deployment ID**.
10. **Testing before publishing:** a Workspace admin enables **Admin console › Apps › Google
    Workspace › Workspace Studio › custom steps settings › Allow unpublished (test) custom
    steps** ([Studio codelab][codelab]).

### D. Marketplace SDK

11. **APIs & Services › Google Workspace Marketplace SDK › App Configuration**
    ([SDK config][sdk]):
    - **App visibility: Public.** ⚠️ **Permanent:** "Once you choose a visibility option and save
      the App Configuration page, you can't change your selection later." Use **Unlisted** if a
      quiet launch is wanted.
    - Installation settings: **Individual + Admin Install**.
    - App integration: **Google Workspace add-on** › paste the Deployment ID from step 9.
    - OAuth scopes: the **same two** scopes. They must match the consent screen and the manifest.
    - Developer name: `Ismail Kattakath` · Developer website: `https://github.com/ismailkattakath`
      · Developer email: `<operator>` (not shown publicly).
    - Trader status: `<operator>` (EEA consumer disclosure).
    - **Save Draft.**
12. **Marketplace SDK › Store Listing.** Fill it from [`marketplace-listing.md`](marketplace-listing.md).
    Upload the icons, banner and real screenshots. Paste the support, privacy and terms URLs.
    **Publish** (submits for review; "typically takes several days" — [review]).

## Demo video script (~2 min, unlisted YouTube)

Use a **test** Google account and a **test** résumé. Show the browser address bar throughout.

| t | Show | Say (caption) |
|---|---|---|
| 0:00 | Marketplace listing or the install dialog | "JSON Resume Connect adds a résumé step to Google Workspace Studio." |
| 0:10 | **Google consent screen** with both scopes visible | "It asks for two permissions: files it creates in Drive (drive.file) and outbound requests to jsonresume.org and Google APIs." |
| 0:30 | Studio: add the **JSON Resume Connect** step → **Connect JSON Resume** → jsonresume.org approval "Read your resume" → refresh | "The user connects their own JSON Resume account." |
| 0:55 | Connected card "Connected to JSON Resume as @username" | — |
| 1:05 | Add a Gmail draft step that uses the step's `docUrl` / `pdfUrl` | — |
| 1:15 | Run the flow → Activity tab → open `docUrl` | "drive.file: the add-on creates this Doc in the user's Drive." |
| 1:35 | Click the PDF and DOCX links | "Export links for the Doc it created." |
| 1:45 | Drive: the add-on sees only this file; **Disconnect** clears the JSON Resume sign-in | "It cannot open any other file." |

## Re-verification triggers

- Repo rename or transfer to the jsonresume org (homepage and privacy URLs change).
- A new scope in `appsscript.json`.
- A new app name or logo on the consent screen.

[vo]: https://support.google.com/cloud/answer/13463073
[vr]: https://support.google.com/cloud/answer/13464321
[cbrand]: https://support.google.com/cloud/answer/15549049
[unv]: https://support.google.com/cloud/answer/7454865
[drive]: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
[scopes]: https://developers.google.com/identity/protocols/oauth2/scopes
[coauth]: https://developers.google.com/workspace/marketplace/configure-oauth-consent-screen
[sdk]: https://developers.google.com/workspace/marketplace/enable-configure-sdk
[review]: https://developers.google.com/workspace/marketplace/about-app-review
[codelab]: https://codelabs.developers.google.com/workspace-studio-custom-extensions
[glitch]: https://support.glitch.com/t/google-api-not-allowing-glitch-me-as-authorised-domain/11276

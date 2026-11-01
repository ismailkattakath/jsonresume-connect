# OAuth verification and Marketplace setup — operator click-list

## Verdict

- **Sensitive-scope verification IS needed.** Read in the console on 2026-10-27 (Data Access):
  `drive.file` is **non-sensitive**, but **`script.external_request` is listed under "Your
  sensitive scopes"** ("Connect to an external service"). An earlier draft of this file guessed
  it was not sensitive; the console settled it. So publishing the app needs Google's
  sensitive-scope review: the justifications below **and the demo video** (§ Demo video script).
- Until verified, external users see the unverified-app screen, and the sensitive scope is
  capped at 100 users for the project's lifetime (see § Status).

## Status (read in the console and Gmail, 2026-11-01)

- **Audience:** **In production**, user type **External**. User cap: **1 / 100** used.
- **Branding:** **verified**, shown to users.
- **Data access:** **under review, blocked** on two of five steps, reviewed 2026-10-29:

| Step | Result | Google's finding |
|---|---|---|
| 1. Homepage requirements | complete (2026-10-27) | — |
| 2. Branding guidelines | complete (2026-10-27) | — |
| 3. Request minimum scopes | complete (2026-10-29) | — |
| 4. Privacy policy requirements | **error** | "does not specify any data protection mechanisms for sensitive data". **Fixed** by `privacy.md` § How your data is protected |
| 5. App functionality | **error** | "demo video does not show the OAuth consent flow". Re-record per § Demo video script |

- **To resume the review:** resubmit in **Verification Center** with the updated privacy-policy
  link, then **reply to Google's email** ("[Action Needed] OAuth Verification Request
  Acknowledgement", 2026-10-29) with the new demo-video link. Google continues only after that
  reply.
- **Do not trigger the unverified scope for new users** until approval: each one spends the
  100-user cap, which never resets.
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

Use a **test** `@gmail.com` account (see § Before recording) and a **test**
résumé. Show the browser address bar throughout. Narrate or caption every step.

### Why the first video was rejected (2026-10-29)

The first video ([youtu.be/-2EGooqRRNE](https://youtu.be/-2EGooqRRNE), 1:57) does show a Google
consent screen, at about 0:05–0:33. It still failed "does not show the OAuth consent flow" on
three counts, read from its frames on 2026-11-01:

| Gap | What the video shows | What Google requires |
|---|---|---|
| **Recorded with an in-org account** | The consent popup is signed in as the operator's own `kattakath.com` account, the project's own organization. Apps Script does not show the unverified-app screen to accounts in the same domain ([Apps Script client verification][asverify]) | Console › Data Access: "The unverified app screen will appear for your test account. This is expected and **must be shown** in the video" |
| **One of two consent workflows** | Only the in-Studio **Grant permission** popup, which is the **Apps Script** OAuth client | The project has **two** OAuth clients: *Apps Script* and *Google Workspace Marketplace Integration Client*. Console: "Your video must include **all OAuth clients** that you assigned to this project". Help: "if there are multiple OAuth consent workflows, you must demonstrate each" ([demo-video help][demohelp]) |
| **Consent screen not shown complete** | The popup is cropped: the scope list is cut off mid-scroll, "See access details" is never opened, and the footer with the language selector is never in frame | "The complete OAuth Consent Screen", with all scopes "fully expanded and readable", and the language selector set to **English** ([demo-video help][demohelp]) |

### Before recording

- **A fresh `@gmail.com` test account, enrolled in Google Workspace Experiments.** It is the
  only kind of account that can do all three things the video needs:
  - **Be a draft tester.** "For public app listings, the email addresses must be Gmail
    accounts" ([manage the listing][mlisting]). Add it under **Marketplace SDK › Store
    Listing › Draft Testers**. A test deployment will not do, because "Test users must belong
    to the same domain as the script owner" ([testing add-ons][addontest]).
  - **Use Workspace Studio.** A personal account needs Google Workspace Experiments
    ([Studio eligibility][studioelig]). **Leaving Experiments is permanent: you cannot
    rejoin** ([Experiments][experiments]).
  - **See the unverified-app screen.** A Gmail account gets the "Unverified auth flow"
    ([Apps Script client verification][asverify]).
  - A second Workspace tenant fails the first test, because it is not Gmail.
  - **Not yet verified:** that a Gmail Studio user can run a step installed as a draft tester.
    Try it once before recording.
  - The account uses **1 of the 100** lifetime users of the unverified-app cap.
- **Scopes match in three places.** `oauthScopes` in `src/appsscript.json`, the console's
  **Data Access** list, and the consent screen must list the same two scopes.
- **Start from no grant.** Remove any earlier grant from the test account:
  [Google Account › Third-party connections](https://myaccount.google.com/connections) ›
  JSON Resume Connect › Delete all connections.
- **Maximize the consent popup** so the whole screen fits, including the footer.

| t | Show | Say (caption) |
|---|---|---|
| 0:00 | **Workflow 1 — Marketplace install.** As the draft tester, open the listing and click **Install**. Show the install consent screen in full: the app name, the account, both scopes, and the language selector set to English. Pause ~5 s, then **Allow** | "Workflow 1 of 2: installing from the Google Workspace Marketplace." |
| 0:15 | **Workflow 2 — Studio Grant permission.** Add the **JSON Resume Connect** step and click **Grant permission**. Show the **unverified-app screen** (expected before approval), then **Advanced › Go to JSON Resume Connect** | "Workflow 2 of 2: authorizing the step in Workspace Studio. Google shows this screen until verification completes." |
| 0:25 | **Google OAuth consent screen**, complete: the app name, the account, **both scope lines with "See access details" opened**, scrolled to the footer with the language selector set to **English**. Pause ~5 s, then **Select all › Continue** | "It asks for two permissions: files it creates in Drive (drive.file) and outbound requests to jsonresume.org and Google APIs (script.external_request)." |
| 0:40 | Back in the step card: **Connect JSON Resume** → jsonresume.org approval "Read your resume" → refresh | "The user connects their own JSON Resume account." |
| 0:55 | Connected card "Connected to JSON Resume as @username" | — |
| 1:05 | Add a Gmail draft step that uses the step's `docUrl` / `pdfUrl` | — |
| 1:15 | Run the flow → Activity tab → open `docUrl` | "drive.file: the add-on creates this Doc in the user's Drive." |
| 1:35 | Click the PDF and DOCX links | "Export links for the Doc it created." |
| 1:45 | Drive: the add-on sees only this file; **Disconnect** clears the JSON Resume sign-in | "It cannot open any other file." |

### Production pipeline (free tools, researched 2026-11-01)

One rule overrides every effect below: **the consent segments stay full-frame and at normal
speed.** Zoom, trimming and speed-ramping apply only outside them. Write down the consent time
ranges right after recording. Every later step reuses them.

| Step | Tool | Why it won | What it beat |
|---|---|---|---|
| Record, click-following zoom, cursor smoothing | [OpenScreen][openscreen] (`getopenscreen` fork, MIT) | Auto-zoom like Screen Studio, plus a CLI that edits the zooms in the `.openscreen` project file, so the zooms over consent can be removed | Cap: AGPLv3, and commercial use needs a paid license. Screen Studio: paid. Kap: no release since 2022. The original OpenScreen repo is archived |
| Trim dead time, speed-ramp waits | [auto-editor][autoeditor] (Unlicense, in nixpkgs) | `--edit audio --margin 0.3s --when-inactive speed:4 --set-action nil,<consent-start>,<consent-end>` | Hand-written ffmpeg `silencedetect` scripts. **Never run it unpinned:** a static, silent consent screen is exactly what it cuts |
| Compose: Material 3 title cards, lower thirds, transitions | [Remotion][remotion] (free for individuals; its own license, not OSI) | React code, so each segment's zoom can be read and checked. Ships `@remotion/transitions`, `@remotion/captions` and `@remotion/google-fonts` (Roboto Flex). Build the M3 look from Material 3 design tokens | HyperFrames (Apache-2.0, but pre-1.0). Motion Canvas: stale since 2024-12. MUI: not on Material 3 yet |
| Captions | [whisper.cpp][whispercpp] (MIT, in nixpkgs) → `@remotion/captions` | Runs on-device on Apple Silicon | Paid caption services |
| Thumbnail, 1280×720 | `npx remotion still`, from the same components | One source for the look | Figma or Canva: a second copy of the design |
| Export | Remotion, 1920×1080 H.264, unlisted on YouTube | — | Shotcut (in nixpkgs) only for hand fixes |

**Before the real recording, test the pipeline:** record a 30-second clip with a static
consent screen, run it through every step, and check the export frame by frame. The consent
segment must come out complete, uncropped and at normal speed.

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
[asverify]: https://developers.google.com/apps-script/guides/client-verification
[demohelp]: https://support.google.com/cloud/answer/13804565
[mlisting]: https://developers.google.com/workspace/marketplace/manage-app-listing
[addontest]: https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons
[studioelig]: https://support.google.com/workspace-studio/answer/16782648
[experiments]: https://support.google.com/calendar/answer/13447104
[openscreen]: https://github.com/getopenscreen/openscreen
[autoeditor]: https://github.com/WyattBlue/auto-editor
[remotion]: https://www.remotion.dev/
[whispercpp]: https://github.com/ggml-org/whisper.cpp

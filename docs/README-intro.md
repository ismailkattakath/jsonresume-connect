<!-- Content for the README's brand-intro placeholder. The lead splices it in.
     Badge workflow files exist on origin/ci/pipelines (ci.yml, scorecard.yml); the CI and
     Scorecard badges resolve once that branch is merged and the repo is public.
     If the repo is transferred (e.g. to the jsonresume org), replace
     `ismailkattakath/jsonresume-connect` everywhere below. -->

<p align="center">
  <img src="assets/icon-128.png" width="96" height="96" alt="JSON Resume Connect logo: a pair of braces on a folded page">
</p>

<h1 align="center">JSON Resume Connect</h1>

<p align="center"><b>Your <a href="https://jsonresume.org">JSON Resume</a>, rendered as a document in Google Docs™ — from a Google Workspace Studio™ flow.</b></p>

<p align="center">
  <a href="https://github.com/ismailkattakath/jsonresume-connect/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ismailkattakath/jsonresume-connect/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ismailkattakath/jsonresume-connect"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/ismailkattakath/jsonresume-connect/badge"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/ismailkattakath/jsonresume-connect/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ismailkattakath/jsonresume-connect?sort=semver"></a>
</p>

## What it does — in 30 seconds

| You | The add-on |
|---|---|
| Keep **one** résumé in the open JSON Resume standard | **Connects** to your jsonresume.org account (OAuth 2.1 with PKCE) |
| Add its **one step** to a Workspace Studio flow | **Loads** the résumé and **fails clearly** if it breaks the schema — it never silently repairs it |
| Use the links in your next step (e.g. a Gmail draft) | **Renders** a clean academic-CV-style document in your Drive, with **PDF and DOCX** links |

- **Two permissions only:** files it creates (`drive.file`) and outbound requests
  (`script.external_request`).
- **No server, no API key, no analytics.**

<p align="center">
  <img src="assets/screenshots/1-flow.png" width="640" alt="A Workspace Studio flow: Start manually, then JSON Resume Connect, then Draft an email whose subject and message use the step's Doc name and Link to doc">
</p>

<sub>Independent project. Not affiliated with or endorsed by the JSON Resume project or Google LLC.
Google Docs™ and Google Workspace Studio™ are trademarks of Google LLC.</sub>

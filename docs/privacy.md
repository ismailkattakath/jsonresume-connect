---
title: Privacy policy
permalink: /privacy/
---

# Privacy policy — JSON Resume Connect

*Last updated: 2026-11-01. Changes are tracked in this file's
[git history](https://github.com/ismailkattakath/jsonresume-connect/commits/main/docs/privacy.md).*

**JSON Resume Connect** ("the add-on") is an independent open-source Google Workspace add-on. It
adds one step to Google Workspace Studio™ flows. It is maintained by
[Ismail Kattakath](https://github.com/ismailkattakath). The source code is public, so every
statement below can be checked against it.

## In short

- **No server.** The add-on runs entirely inside Google Apps Script, under your own Google
  account. The maintainer runs no backend and no database.
- **No analytics, no ads, no tracking, no selling, no sharing** of your data.
- It talks to **two services only**: Google (Drive and Docs) and **jsonresume.org** (to read
  your résumé, with your permission).

## What the add-on accesses, and why

| Data | Where it comes from | What the add-on does with it | Where it is kept |
|---|---|---|---|
| Your JSON Resume sign-in (access and refresh tokens) and your jsonresume.org username | jsonresume.org, after you click **Connect JSON Resume** and approve "Read your resume" (scope `resume:read`) | Reads your résumé when a flow runs; shows "Connected as @username" | Apps Script **User Properties** and **User Cache**: private to your Google account and this add-on. Deleted when you click **Disconnect** |
| Your résumé (`resume.json`) | jsonresume.org | Checks it against the JSON Resume schema and writes it into the Doc below | **Not stored** by the add-on. It exists in memory during the run only |
| The Google Doc it creates | Created by the add-on | Writes your résumé into it and returns its link plus PDF and DOCX export links | **Your Google Drive**. The add-on can open only files it created (`drive.file`) |
| An OAuth client identifier for jsonresume.org | Registered once per deployment | Identifies the add-on to jsonresume.org | Apps Script Script Properties. It is not personal data |

### Google permissions (OAuth scopes)

| Scope | Why |
|---|---|
| `https://www.googleapis.com/auth/drive.file` | Create the résumé Doc in your Drive and style it. It grants access **only to files the add-on creates**, never to the rest of your Drive |
| `https://www.googleapis.com/auth/script.external_request` | Make HTTPS requests to jsonresume.org (to read your résumé) and to the Google Docs and Drive APIs |

The add-on asks for nothing else: no Gmail, no Calendar, no Contacts, no full Drive access.

### Logs

The add-on writes Apps Script execution logs, which Google stores in the Google Cloud project
that hosts the add-on. The maintainer can read them. They record which inputs were present
(field **names**, not values) and error messages. An error message can quote a short part of the
data that caused it, for example an error returned by a Google API. Logs are used **only** to fix
bugs, and Google Cloud deletes them on its own retention schedule.

## How your data is protected

The add-on treats your JSON Resume sign-in and your résumé as **sensitive data**. These
safeguards protect them, and each one can be checked in the source code:

| Safeguard | What it means for you |
|---|---|
| **Encrypted in transit** | Every request the add-on makes uses **HTTPS**. Its manifest (`src/appsscript.json`, `urlFetchWhitelist`) lets it reach only `https://jsonresume.org/`, `https://docs.googleapis.com/` and `https://www.googleapis.com/`, and Apps Script blocks any other address. TLS certificate checks are never turned off |
| **Encrypted at rest** | The résumé Doc lives in your Google Drive, which Google encrypts in transit and at rest ([Google Drive Help](https://support.google.com/drive/answer/10519333)). The add-on keeps no copy anywhere else |
| **Sign-in tokens stay private to you** | Your JSON Resume tokens are kept in Apps Script **User Properties** and **User Cache**, inside Google's infrastructure. Only you, as the current user of the add-on, can read them; "properties are never shared between scripts" ([Apps Script Properties Service](https://developers.google.com/apps-script/guides/properties)). The maintainer cannot read them |
| **No password, no shared secret** | You sign in on jsonresume.org's own page. The add-on never sees your jsonresume.org password. It uses OAuth with **PKCE** (a one-time proof that protects the sign-in code from interception) as a public client, so there is no client secret to leak |
| **Least privilege** | It asks jsonresume.org for **read-only** access to your résumé (`resume:read`). In Google it can open **only files it created** (`drive.file`) |
| **No server, no database** | Your data never passes through a server run by the maintainer. There is none |
| **Kept out of logs** | Execution logs record field **names**, never your résumé or a token (see [Logs](#logs)) |
| **Minimal retention** | Your résumé exists in memory only while a flow runs. **Disconnect** deletes your tokens and username at once (see [Deleting your data](#deleting-your-data)) |
| **Vulnerability reporting** | Security problems are reported privately and fixed on `main`, as described in [SECURITY.md](https://github.com/ismailkattakath/jsonresume-connect/blob/main/SECURITY.md) |

## Google API Services — Limited Use

The use of information received from Google Workspace scopes will adhere to the
[Google User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the
[Limited Use requirements](https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes)
(statement as worded in Google's
[Google Workspace API User Data and Developer Policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)).
This applies to all information JSON Resume Connect receives from Google APIs.

In particular, the add-on:

- uses Google user data **only** to provide its user-facing feature: creating your résumé Doc;
- does **not** transfer it to anyone, except as needed to provide that feature, to comply with
  law, or as part of a merger or acquisition with your consent;
- does **not** use it for advertising, and does **not** sell it;
- does **not** let humans read it, unless you ask for help with a specific item and agree, or
  it is needed for security or to comply with law;
- does **not** use it to create, train or improve any machine-learning or AI model.

## AI

The add-on itself calls **no** AI model. If your flow uses a Gemini step, that step is a Google
feature, governed by Google's terms, not by this add-on.

## Deleting your data

| To remove | Do this |
|---|---|
| Your JSON Resume tokens and username | Open the step in your flow and click **Disconnect** |
| The add-on's access to your Google account | [Google Account › Third-party connections](https://myaccount.google.com/connections) › JSON Resume Connect › Delete all connections |
| The add-on's access to jsonresume.org | Revoke it in your jsonresume.org account |
| Résumé Docs it created | Delete them in Google Drive. They are ordinary Docs that you own |

## Children

The add-on is not directed at children.

## Changes and contact

- Changes to this policy are published on this page and in its git history.
- Questions: open an issue at
  [github.com/ismailkattakath/jsonresume-connect/issues](https://github.com/ismailkattakath/jsonresume-connect/issues),
  or contact [the maintainer on GitHub](https://github.com/ismailkattakath).

---

*Google Docs™, Google Drive™, Google Workspace™ and Google Workspace Studio™ are trademarks of
Google LLC. This add-on is not affiliated with or endorsed by Google LLC or by the JSON Resume
project.*

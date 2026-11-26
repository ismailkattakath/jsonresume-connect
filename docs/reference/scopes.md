# Scopes reference

| Scope | Needed by | Grants |
|---|---|---|
| `script.external_request` | the step | outbound HTTPS (jsonresume.org sign-in and fetch; Drive/Docs REST) |
| `drive.file` | the Doc create and styling | **only the files this add-on creates** |

The step does not read your mail or calendar. The renderer cannot see any Drive file it did not
create itself.

**Measured 2026-10-27, with only those two scopes:**

| Call | Result |
|---|---|
| Drive REST `files.create`, HTML → Google Doc (multipart upload) | **works** |
| Docs API `documents.batchUpdate` on that Doc | **works** (the step sets page margins with it) |
| Drive REST `files/{id}/export?mimeType=application/pdf` | **works** (no longer called; see below) |
| Drive REST `files.create` of the PDF bytes | **works** (no longer called) |
| `DocumentApp.create` / `openById` | **fails**: needs `auth/documents` |
| `DriveApp.getFileById` | **fails**: needs `drive.readonly` or `drive` |

So the add-on uses **no `DocumentApp` and no `DriveApp`**. It calls REST through
`UrlFetchApp` with `ScriptApp.getOAuthToken()`. The tests assert that.

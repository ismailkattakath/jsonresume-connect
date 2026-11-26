# Rendering reference

The step renders the résumé to a single-column HTML document. Google converts that into
a **Google Doc** in your Drive. **The Doc is the only file the step creates.**

PDF and DOCX come from Docs' own export links, built from the Doc's id. A link downloads the Doc
**as it is when you open it**, so a hand edit to the Doc is never out of step with a stored copy.
The step fetches nothing to build them.

The export links open for anyone who can open the Doc, i.e. the owner by default. Share the Doc
to share them.

A Studio step cannot output a file: output types are scalars only. So the step returns file IDs
and links, which is the same pattern Google's own Drive picker uses.

**Failure policy:**

| Failure | Studio error | User reads |
|---|---|---|
| Not connected, token revoked (401), no résumé (404), other 4xx, invalid résumé | `ACTIONABLE` + `NOT_RETRYABLE` | what to fix ("Open this step and connect again.") |
| jsonresume.org unreachable, 429 or 5xx; client registration failed | `NOT_ACTIONABLE` + `RETRYABLE` (Studio retries up to five times) | "… is not responding. The step will try again." |
| Drive refuses the create (401/403) | `ACTIONABLE` + `NOT_RETRYABLE` | "Google refused to create the Doc. Check that the add-on is still allowed to create files in your Drive." |
| Drive unreachable, 429 or 5xx | `NOT_ACTIONABLE` + `RETRYABLE` | "Google Drive is not responding. The step will try again." |

**Retries happen only in a switched-on flow.** Measured live 2026-10-27 with an injected 503: a
switched-on flow re-ran the step after **~3–4 min**, then **~6–7 min** (growing backoff). A manual
test run (**Run the flow** in the editor) does **not** retry: it stops at the first failure.

**The user never sees an HTTP code, Google's error text or an exception message.** The style
guide says "Don't let the user see any exceptions your code throws". Those details go to
Executions (`console.error`), and the résumé and tokens never do. Tests check every failure
message for raw detail.
- A failed styling call (`documents.batchUpdate`) → the step **succeeds** with the Doc as
  imported. The reason goes to the Executions log.

**Sections rendered**, in order, each skipped when absent or empty: basics (name, label,
contact, profiles, summary), work, projects, education, skills, certificates, awards,
publications, volunteer, languages, interests, references.

**The résumé is untrusted input:** anyone can write anything into a gist. So every value is HTML-escaped. A link becomes an `href` only for `http(s)://` URLs
without credentials, so `javascript:` and `data:` URLs render as plain text. `basics.image` is
left out on purpose: an external image URL is a tracking beacon.

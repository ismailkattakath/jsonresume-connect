# Outputs reference

All `SINGLE`. All `STRING` except `email`, which is `EMAIL_ADDRESS`: the **Draft an email** step's
To field offers only email-address variables, never text (measured live 2026-10-27). Studio shows an
`EMAIL_ADDRESS` output as "<label> email address", so its label is just `Resume`, read as **Resume
email address** (the Gmail starter's "Sender email address" works the same way). The chip labels follow Google's built-in **Create a doc** step (measured
live 2026-10-27: "Link to doc", "Doc name", "Doc location", "Document ID") and the Gmail
starter's "Sender email address". A test pins every id and label, in order. Ids stay stable:
users never see them, and renaming one breaks every flow bound to it.

| Id | Chip | Use |
|---|---|---|
| `docUrl` | Link to doc | the Doc, for a Gmail or Chat step |
| `docName` | Doc name | the name Drive stored (the configured title, or `<name> — Resume`) |
| `pdfUrl` | Link to PDF | `https://docs.google.com/document/d/{id}/export?format=pdf` |
| `docxUrl` | Link to DOCX | `https://docs.google.com/document/d/{id}/export?format=docx` |
| `docId` | Document ID | for a Drive step (share, move) |
| `name` | Name | `basics.name`, for addressing a message |
| `label` | Headline | `basics.label` |
| `email` | Resume email address | `basics.email`, usable as a draft's **To**. A resume with no valid address **fails the step** (Studio needs every output on every run) |
| `resumeText` | Resume (plain text) | flattened text for any AI step (summary, cover letter) |
| `resume` | Resume (JSON) | the validated `resume.json`. **Weakest case:** no native step consumes JSON, and it can be up to 2 MB |

**No "Doc location".** The Doc is always created in My Drive's root, so that chip would be a
constant (`https://drive.google.com/drive/my-drive`) that tells the user nothing. Add it if a
folder input ever appears.

`resumeText` renders `basics` then `work`, `projects`, `education`, `skills`, `certificates`,
`awards`, each entry as a headline plus summary plus highlights. Measured on a real registry
résumé: 10,605 characters over 123 lines.

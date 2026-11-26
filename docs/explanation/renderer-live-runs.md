# The renderer: built, and run live

[`RENDERER-DESIGN.md`](../../RENDERER-DESIGN.md) is the design for the renderer, which is
now **built** (`src/RenderDoc.gs`). It waited until Load JSON Resume had run for real, and that
happened on 2026-09-30. The design also records two dead ends, verified by running them: the
JSON Resume registry's `.pdf` endpoint is broken in production, and the registry is
username-keyed, so it can never render a *tailored* résumé.

**Ran live on 2026-10-27:** the flow reported *Run Completed* and produced a Doc plus a PDF.
The structure was faithful: H1/H2/H3 headings, real lists, live links, correct escaping. Eight
findings came back and are fixed:

| # | Finding | Fix | Test |
|---|---|---|---|
| 1 | **6 pages** (last nearly empty) for a 19 KB résumé | inline `font-size` + `margin` on **every** h1/h2/h3/p/li (h1 18pt, h2 12pt, h3 11pt, body 10pt); 0.6 in page margins via `documents.batchUpdate` (best-effort); skills, languages and interests as one line each | every block carries a size; h1 ≤ 20pt; h1 > h2 > h3; margin request shape |
| 2 | Dates inside the h3 wrapped, orphaning `– 2026-03-01` | dates moved to **one small grey line under the h3**, with location/roles: `Aug 2024 – Mar 2026 · Toronto` | no h3 contains a year; the meta line follows the h3 |
| 3 | Raw ISO dates, lowercase `present` | `formatDate()`: `YYYY` stays, `YYYY-MM` / `YYYY-MM-DD` → `Aug 2024`; anything else untouched; `Present` | 12 input cases, ranges |
| 4 | `Bachelor of Technology (BTech) Computer Science…` | studyType and area joined with `, ` | |
| 5 | Project subline ended `· application` (raw `type`) | `type` dropped; roles kept | |
| 6 | `<username>`, `<user>`, `<repo>`, `<basics.name>` vanished from card hints | `{username}`-style placeholders | both cards are built through a CardService stub; no hint or title contains `<` |
| 7 | Load hint still promised "any HTTPS URL" | hint lists the allowlisted hosts | hint hosts == allowlisted résumé hosts |
| 8 | Variable chips read "Step 2: The raw resume.json document, as a JSON string." | short descriptions: `Resume (JSON)`, `Doc URL`, `PDF URL`, … | output descriptions ≤ 24 chars, no sentence |

**Second live run (2026-10-27):** all eight fixes held, and the PDF went from 6 pages to 4 (the
last half full). Two follow-ups, **not yet run live**:

| Finding | Fix | Test |
|---|---|---|
| An h3 asked for 10.5pt imported as 10pt: the import appears to round half-points down | whole-point sizes only (h3 11pt, meta 9pt) | every `font-size` is an integer |
| Still 4 pages; the target is 2–3. Line height stayed 1.15, and each paragraph kept Normal text's 11pt at paragraph level | `line-height:1.0` and tighter block margins; a second best-effort `documents.batchUpdate` sets the Normal text named style to 10pt, single spacing, no paragraph gaps | single line spacing on every block; the named-style request shape |

**Why #1 is fixed with inline styles, not the Docs API alone:** the import maps h1–h3 to the
Doc's named Heading styles (H1 at Arial 24) and did not carry the body's font-size down to them.
An inline style on each element pins the size per paragraph. `documents.batchUpdate` also has an
`updateNamedStyle` request that could restyle Heading 1–3 instead. Inline won because it lives in
the HTML, which the tests check offline, and it adds no API call or failure mode.
`updateNamedStyle` is the fallback if a re-run shows the import dropping inline sizes. The page
count is still a **hypothesis until the next live run**. If the margins also look wide there,
check whether the import set a per-section `sectionStyle` margin that overrides the document
margin.

**Why #2 uses a separate line, not a right-aligned tab:** a tab stop needs a Docs API range edit
after import, and a two-cell table imports with borders and confuses ATS parsers. A paragraph is
the one layout the HTML import is certain to keep.

**Also found:** `registry.jsonresume.org/{user}.json` now answers **301 → `jsonresume.org/@{user}.json`**
(measured 2026-10-27). `UrlFetchApp` follows redirects, so `https://jsonresume.org/` joined the
allowlist.

**Next:** a re-run on the operator's word, to confirm the page count (target 2–3).

// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * The renderer half of the step: resume.json -> HTML ->
 * Google Doc. The step itself (connect, fetch, validate, outputs) is
 * JsonResumeToDoc.gs. Design and measured evidence: RENDERER-DESIGN.md.
 *
 *   resume -> resumeToHtml() -> Drive files.create (HTML -> Google Doc)
 *          -> documents.batchUpdate (margins, Normal text style)
 *
 * THE DOC IS THE ONLY ARTIFACT. pdfUrl and docxUrl are Docs' own export links,
 * built from the id: they download whatever the Doc says NOW, so a hand edit
 * to the Doc is never out of step with a stored copy. A stored PDF was built
 * once and removed (2026-10-27); RENDERER-DESIGN.md says when it comes back.
 *
 * WE OWN THE HTML SERIALISER, AND GOOGLE OWNS THE LAYOUT ENGINE. resumeToHtml()
 * is the only real logic here, and it is pure JavaScript, so
 * test/render.test.mjs tests it off Google's servers.
 *
 * SCOPES: drive.file + script.external_request, and NOTHING ELSE. Measured
 * 2026-10-27: with only those two, Drive REST create-with-conversion and Docs
 * documents.batchUpdate work (so did files.export, now unused). DocumentApp.create/openById need
 * .../auth/documents, and DriveApp.getFileById needs drive.readonly or drive.
 * So this file never touches DocumentApp or DriveApp, and it never uses the
 * `Drive`/`Docs` advanced-service globals either. Every Google call is REST
 * through UrlFetchApp with ScriptApp.getOAuthToken(), whose token "only
 * includes scopes that the script currently needs".
 *
 * SHARED GLOBAL SCOPE: Apps Script loads every .gs file of a project into ONE
 * global namespace. This file reuses str() from JsonResumeToDoc.gs, and so
 * does not redefine it. A second definition would silently replace the first,
 * whichever file loads last. The tests load every file into one context, the
 * same way Apps Script does, and fail on a name defined twice.
 */

var DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files' +
  '?uploadType=multipart&fields=id,name,webViewLink';
var DOCS_EXPORT_URL = 'https://docs.google.com/document/d/';
var DOCS_API_URL = 'https://docs.googleapis.com/v1/documents/';
var GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
var PAGE_MARGIN_PT = 36; // 0.5 inch

/**
 * Creates the Google Doc for a validated resume and styles it.
 * Returns { id, name, webViewLink }.
 *
 * Failure policy:
 * - The Doc create fails: THROWS. The caller fails the step; there is nothing
 *   useful to hand on.
 * - A styling call (batchUpdate) fails: logged with console.error, and the Doc
 *   is returned as imported. Cosmetic, so it never costs the user the Doc.
 */
function renderResumeDoc(token, resume, title) {
  var doc = driveCreate(
    token,
    {name: title, mimeType: GOOGLE_DOC_MIME},
    'text/html; charset=UTF-8',
    utf8Bytes(resumeToHtml(resume))
  );

  // Page margins. How the HTML import treats CSS @page is undocumented, so
  // set them explicitly through the
  // Docs API (documents.batchUpdate, measured to work under drive.file on
  // 2026-10-27). Cosmetic, so a failure is logged and the run goes on.
  try {
    docsBatchUpdate(token, doc.id, marginRequests(PAGE_MARGIN_PT));
  } catch (err) {
    console.error('JsonResumeToDoc: margins not applied: ' + err.message);
  }
  // Normal text's paragraph-level size and spacing (see namedStyleRequests).
  // A separate call, so a rejection here cannot cost the margins above.
  try {
    docsBatchUpdate(token, doc.id, namedStyleRequests());
  } catch (err) {
    console.error(
      'JsonResumeToDoc: Normal text style not applied: ' + err.message
    );
  }
  return doc;
}

// ---- Drive REST (Apps Script only; not reachable from the tests) ----------

/**
 * One multipart files.create. With metadata.mimeType set to a Google Docs type
 * and an HTML body, Drive CONVERTS the upload (the import table lists
 * "HTML -> Google Docs").
 */
function driveCreate(token, metadata, mediaType, mediaBytes) {
  var boundary = 'render-resume-' + Utilities.getUuid();
  var parts = multipartFrame(boundary, metadata, mediaType);
  var body = utf8Bytes(parts.head).concat(mediaBytes, utf8Bytes(parts.tail));
  var response = UrlFetchApp.fetch(DRIVE_UPLOAD_URL, {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    payload: body,
    headers: {Authorization: 'Bearer ' + token},
    muteHttpExceptions: true,
  });
  var file = JSON.parse(checkResponse(response, 'files.create'));
  return {
    id: str(file.id),
    name: str(file.name) || str(metadata.name),
    webViewLink: str(file.webViewLink),
  };
}

/** documents.batchUpdate: Docs REST v1, same token, same no-DocumentApp rule. */
function docsBatchUpdate(token, docId, requests) {
  var response = UrlFetchApp.fetch(
    DOCS_API_URL + encodeURIComponent(docId) + ':batchUpdate',
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({requests: requests}),
      headers: {Authorization: 'Bearer ' + token},
      muteHttpExceptions: true,
    }
  );
  return checkResponse(response, 'documents.batchUpdate');
}

/**
 * Throws with Google's own error message when the call failed.
 *
 * The message matters. The first live run got a 403 "Google Drive API has not
 * been used in project …". The fix was the advanced-service declaration in
 * appsscript.json, and only Google's text said so.
 */
function checkResponse(response, what) {
  var status = response.getResponseCode();
  var text = response.getContentText();
  if (status >= 200 && status < 300) return text;
  var detail = text;
  try {
    detail = JSON.parse(text).error.message || text;
  } catch (e) {
    /* not JSON */
  }
  // For the Executions log only: the caller maps `status` to a sentence for
  // the user and never shows them this text.
  var err = new Error(
    what + ' returned HTTP ' + status + ': ' + str(detail).slice(0, 300)
  );
  err.status = status;
  throw err;
}

function utf8Bytes(s) {
  return Utilities.newBlob('').setDataFromString(s, 'UTF-8').getBytes();
}

// ---- Pure half: tested by test/render.test.mjs ----------------------------

/**
 * Docs' own export link for a format. It downloads the Doc as it is when the
 * link is opened, so it is never stale. Nothing here fetches it: it is a link
 * for a person, so it needs no allowlist entry.
 *
 * A Drive file id is [A-Za-z0-9_-]. Anything else is not a Drive id, and the
 * link is left EMPTY rather than built from it.
 */
function exportUrl(docId, format) {
  var id = str(docId);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return '';
  return DOCS_EXPORT_URL + id + '/export?format=' + encodeURIComponent(format);
}

/**
 * The text frame around one multipart/related body (RFC 2387; Drive's
 * "multipart upload"). The media bytes go between head and tail.
 */
function multipartFrame(boundary, metadata, mediaType) {
  var head =
    '--' +
    boundary +
    '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n' +
    '--' +
    boundary +
    '\r\n' +
    'Content-Type: ' +
    mediaType +
    '\r\n\r\n';
  var tail = '\r\n--' + boundary + '--\r\n';
  return {head: head, tail: tail};
}

function docTitleFor(resume, configured) {
  var t = str(configured).trim();
  if (t) return t.slice(0, 200);
  var name =
    resume && resume.basics && typeof resume.basics === 'object'
      ? str(resume.basics.name).trim()
      : '';
  // "Resume", not "Résumé": one spelling in everything the user reads.
  return name ? name + ' — Resume' : 'Resume';
}

/**
 * The HTML escape. EVERY résumé value goes through it, because the résumé is
 * untrusted: it is whatever the jsonresume.org account holds, and anyone can
 * write anything into a gist.
 */
function escapeHtml(v) {
  return str(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * An href is safe only when it starts with https:// or http://. Escaping alone
 * is not enough: a javascript: URL passes straight through an HTML escape.
 * Returns '' for anything else, and the caller then renders plain text.
 */
function safeWebUrl(v) {
  var u = str(v).trim();
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(u)) return '';
  if (
    u.indexOf('@') !== -1 &&
    u.indexOf('@') < (u.indexOf('/', 8) === -1 ? u.length : u.indexOf('/', 8))
  )
    return '';
  return u;
}

function safeEmail(v) {
  var e = str(v).trim();
  return /^[^\s@<>"'()\\,;:]+@[^\s@<>"'()\\,;:]+\.[^\s@<>"'()\\,;:]+$/.test(e)
    ? e
    : '';
}

/** A link when the URL is safe, plain escaped text when it is not. */
// Ink-coloured links, as in academic-cv-lite: Docs paints an unstyled link
// blue (live, 2026-10-27). Entry links stay plain; the contact line underlines.
var LINK_STYLE = 'color:#111827;text-decoration:none';
var CONTACT_LINK_STYLE = 'color:#111827;text-decoration:underline';

function linkOrText(url, text, style) {
  var safe = safeWebUrl(url);
  var label = escapeHtml(text || url);
  return safe
    ? '<a href="' +
        escapeHtml(safe) +
        '" style="' +
        (style || LINK_STYLE) +
        '">' +
        label +
        '</a>'
    : label;
}

function arr(v) {
  return Array.isArray(v)
    ? v.filter(function (x) {
        return x !== null && x !== undefined && x !== '';
      })
    : [];
}

function objs(v) {
  return arr(v).filter(function (x) {
    return typeof x === 'object' && !Array.isArray(x);
  });
}

var MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * ISO 8601 (the schema's date format) to the form résumé themes print:
 * "2024" stays "2024", "2024-08" and "2024-08-01" become "Aug 2024". The day
 * is dropped, as themes do. Anything else ("Summer 2019", a bad month) comes
 * back as it was, trimmed: a wrong guess is worse than the raw string.
 */
function formatDate(v) {
  var s = str(v).trim();
  var m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s);
  if (!m) return s;
  if (!m[2]) return m[1];
  var month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return s;
  if (m[3]) {
    var day = parseInt(m[3], 10);
    if (day < 1 || day > 31) return s;
  }
  return MONTHS[month - 1] + ' ' + m[1];
}

function dateRange(start, end) {
  var s = formatDate(start);
  var e = formatDate(end);
  if (!s && !e) return '';
  if (!s) return e;
  return s + ' – ' + (e || 'Present');
}

function joinNonEmpty(parts, sep) {
  return parts
    .map(str)
    .map(function (p) {
      return p.trim();
    })
    .filter(function (p) {
      return p.length > 0;
    })
    .join(sep);
}

/**
 * Inline styles, ON EVERY ELEMENT. The live run (2026-10-27) came out at 6
 * pages: the import maps h1/h2/h3 to the Doc's named Heading styles (H1 at
 * Arial 24) and did not carry the body's font-size down to them. An inline
 * style on the element itself is the one place the import reads per
 * paragraph. (batchUpdate's updateNamedStyle could restyle Heading 1-3
 * instead. Inline styles were chosen because they live in the HTML this file
 * tests offline, and cost no extra API call or failure mode. If a re-run
 * shows the import dropping them, updateNamedStyle is the fallback.)
 *
 * WHOLE POINTS ONLY. The second live run (2026-10-27) asked for an h3 at
 * 10.5pt and the Doc came back with 10pt text runs: the import appears to
 * round half-points down. So every size here is an integer.
 *
 * Spacing (second live run: 4 pages, last one half full; target 2-3): line
 * height 1.0 instead of 1.15, and tighter block margins. Untested live.
 */
// The look follows jsonresume.org's academic-cv-lite theme (measured on the
// live page, 2026-10-27): Merriweather, ink #111827 / body #1f2937 / dates
// #666666; centred name, italic centred headline, centred contact line with
// bullets; UPPERCASE section headings over a 2px rule; entries as bold title,
// italic organisation, grey dates. Sizes stay compact (the theme's ratios,
// scaled to a 10pt body, single spacing) so a full résumé still fits in
// about 3 pages; Merriweather sets taller than Arial.
// Docs has no letter-spacing, so the theme's 1px tracking is left out.
var INK = '#111827';
var FONT =
  'font-family:Merriweather,Georgia,serif;line-height:1.0;color:#1f2937;';
var STYLES = {
  h1:
    FONT +
    'font-size:20pt;font-weight:bold;color:' +
    INK +
    ';text-align:center;margin:0 0 2pt 0',
  label:
    FONT +
    'font-size:12pt;font-style:italic;text-align:center;margin:0 0 4pt 0',
  contact: FONT + 'font-size:10pt;text-align:center;margin:0 0 6pt 0',
  summary: FONT + 'font-size:10pt;margin:0 0 4pt 0',
  h2:
    FONT +
    'font-size:13pt;font-weight:bold;color:' +
    INK +
    ';text-transform:uppercase;' +
    'border-bottom:2px solid ' +
    INK +
    ';padding-bottom:2pt;margin:12pt 0 4pt 0',
  h3:
    FONT + 'font-size:11pt;font-weight:bold;color:' + INK + ';margin:6pt 0 0 0',
  org: FONT + 'font-size:10pt;font-style:italic;margin:0',
  meta: FONT + 'font-size:9pt;color:#666666;margin:0 0 2pt 0',
  p: FONT + 'font-size:10pt;margin:0 0 2pt 0',
  ul: 'margin:0 0 2pt 0',
  li: FONT + 'font-size:10pt;margin:0',
};

/**
 * Named-style requests for the Doc's Normal text. The second live run showed
 * each paragraph keeping Normal text's 11pt / 1.15 at PARAGRAPH level (only
 * the text runs were 10pt), which likely adds line height per paragraph.
 * Setting Normal text to 10pt, single spacing, no paragraph gaps fixes that
 * at the source. Sent as its own best-effort batchUpdate.
 *
 * THE FIELDS MASK MUST START WITH namedStyleType. The Docs API reference for
 * UpdateNamedStyleRequest: "At least `namedStyleType` must be specified." Live
 * run 3 (2026-10-27) sent a mask without it and got HTTP 400 "Named style type
 * is required", which this step logged and swallowed, so Normal stayed 11pt.
 * The mask lists LEAF paths only: per the same reference, naming a parent
 * ("textStyle") resets all of its nested fields not given here.
 * https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request#UpdateNamedStyleRequest
 */
function namedStyleRequests() {
  return [
    {
      updateNamedStyle: {
        namedStyle: {
          namedStyleType: 'NORMAL_TEXT',
          textStyle: {fontSize: {magnitude: 10, unit: 'PT'}},
          paragraphStyle: {
            lineSpacing: 100,
            spaceAbove: {magnitude: 0, unit: 'PT'},
            spaceBelow: {magnitude: 0, unit: 'PT'},
          },
        },
        fields:
          'namedStyleType,textStyle.fontSize,paragraphStyle.lineSpacing,' +
          'paragraphStyle.spaceAbove,paragraphStyle.spaceBelow',
      },
    },
  ];
}

/** One element with its inline style. `inner` is already-escaped HTML. */
function el(tag, styleKey, inner) {
  return (
    '<' + tag + ' style="' + STYLES[styleKey] + '">' + inner + '</' + tag + '>'
  );
}

/** The Docs API requests that set all four page margins, in points. */
function marginRequests(pt) {
  var m = {magnitude: pt, unit: 'PT'};
  return [
    {
      updateDocumentStyle: {
        documentStyle: {
          marginTop: m,
          marginBottom: m,
          marginLeft: m,
          marginRight: m,
        },
        fields: 'marginTop,marginBottom,marginLeft,marginRight',
      },
    },
  ];
}

/**
 * One entry: the title as an h3, then ONE small grey line with the dates and
 * any subline ("Aug 2024 – Mar 2026 · Toronto"), then summary, bullets and
 * keywords.
 *
 * Dates are NOT in the h3. Inside it, a long title pushed "– 2026-03-01" onto
 * a line of its own (live run, 2026-10-27). A right-aligned tab stop would
 * need a Docs API range edit after import, and a two-cell table imports with
 * borders and confuses ATS parsers. A separate line is the one layout the
 * HTML import is certain to keep.
 */
function renderEntry(e) {
  var html = el('h3', 'h3', e.title);
  if (e.org) html += el('p', 'org', e.org);
  var meta = [e.dates ? escapeHtml(e.dates) : '', e.subtitle || ''].filter(
    function (x) {
      return x;
    }
  );
  if (meta.length) html += el('p', 'meta', meta.join(' · '));
  if (str(e.summary).trim()) html += el('p', 'p', escapeHtml(e.summary));
  var bullets = arr(e.bullets)
    .map(str)
    .filter(function (b) {
      return b.trim();
    });
  if (bullets.length) {
    html += el(
      'ul',
      'ul',
      bullets
        .map(function (b) {
          return el('li', 'li', escapeHtml(b));
        })
        .join('')
    );
  }
  var keywords = arr(e.keywords)
    .map(str)
    .filter(function (k) {
      return k.trim();
    });
  if (keywords.length) html += el('p', 'p', escapeHtml(keywords.join(', ')));
  return html;
}

/**
 * A compact entry: ONE paragraph, "Title: keyword, keyword". Used for skills,
 * languages and interests, which carry no dates or bullets. As an h3 plus a
 * keyword paragraph, the live résumé's skills section spent two lines and a
 * heading gap on every group.
 */
function renderCompactEntry(e) {
  var keywords = arr(e.keywords)
    .map(str)
    .filter(function (k) {
      return k.trim();
    });
  return el(
    'p',
    'p',
    '<b>' +
      e.title +
      '</b>' +
      (keywords.length ? ': ' + escapeHtml(keywords.join(', ')) : '')
  );
}

/**
 * Section order, heading and field mapping, per resume-schema v1
 * (https://github.com/jsonresume/resume-schema). `title` and `subtitle` return
 * HTML, which is why every value they use goes through escapeHtml/linkOrText.
 */
var RESUME_SECTIONS = [
  // academic-cv-lite's order: education first.
  {
    key: 'education',
    heading: 'Education',
    entry: function (ed) {
      return {
        title: linkOrText(ed.url, ed.institution),
        org: escapeHtml(joinNonEmpty([ed.studyType, ed.area], ' in ')),
        dates: dateRange(ed.startDate, ed.endDate),
        subtitle: escapeHtml(ed.score ? 'Score: ' + str(ed.score) : ''),
        summary: '',
        bullets: ed.courses,
      };
    },
  },
  {
    key: 'work',
    heading: 'Professional Experience',
    entry: function (w) {
      return {
        title: escapeHtml(w.position) || linkOrText(w.url, w.name || w.company),
        org: w.position ? linkOrText(w.url, w.name || w.company) : '',
        dates: dateRange(w.startDate, w.endDate),
        subtitle: escapeHtml(joinNonEmpty([w.location, w.description], ' · ')),
        summary: w.summary,
        bullets: w.highlights,
      };
    },
  },
  {
    key: 'projects',
    heading: 'Projects',
    entry: function (p) {
      // p.type is a free-form category ("application", "volunteering"). Printed
      // raw it read as an enum, so it is left out.
      return {
        title: linkOrText(p.url, p.name),
        org: escapeHtml(
          joinNonEmpty([p.entity, arr(p.roles).map(str).join(', ')], ' · ')
        ),
        dates: dateRange(p.startDate, p.endDate),
        summary: p.description || p.summary,
        bullets: p.highlights,
        keywords: p.keywords,
      };
    },
  },
  {
    key: 'skills',
    heading: 'Skills',
    compact: true,
    entry: function (s) {
      return {
        title: escapeHtml(joinNonEmpty([s.name, s.level], ' — ')),
        keywords: s.keywords,
      };
    },
  },
  {
    key: 'certificates',
    heading: 'Certifications',
    entry: function (c) {
      return {
        title: linkOrText(c.url, c.name),
        org: escapeHtml(c.issuer),
        dates: formatDate(c.date),
      };
    },
  },
  {
    key: 'awards',
    heading: 'Awards',
    entry: function (a) {
      return {
        title: escapeHtml(a.title),
        org: escapeHtml(a.awarder),
        dates: formatDate(a.date),
        summary: a.summary,
      };
    },
  },
  {
    key: 'publications',
    heading: 'Publications',
    entry: function (p) {
      return {
        title: linkOrText(p.url, p.name),
        org: escapeHtml(p.publisher),
        dates: formatDate(p.releaseDate),
        summary: p.summary,
      };
    },
  },
  {
    key: 'volunteer',
    heading: 'Volunteering',
    entry: function (v) {
      return {
        title: escapeHtml(v.position) || linkOrText(v.url, v.organization),
        org: v.position ? linkOrText(v.url, v.organization) : '',
        dates: dateRange(v.startDate, v.endDate),
        summary: v.summary,
        bullets: v.highlights,
      };
    },
  },
  {
    key: 'languages',
    heading: 'Languages',
    compact: true,
    entry: function (l) {
      return {title: escapeHtml(joinNonEmpty([l.language, l.fluency], ' — '))};
    },
  },
  {
    key: 'interests',
    heading: 'Interests',
    compact: true,
    entry: function (i) {
      return {title: escapeHtml(i.name), keywords: i.keywords};
    },
  },
  {
    key: 'references',
    heading: 'References',
    entry: function (r) {
      return {title: escapeHtml(r.name), summary: r.reference};
    },
  },
];

/**
 * resume.json -> one self-contained HTML document: single column, inline
 * styles only, no scripts and no external resources. basics.image is left out
 * ON PURPOSE. An external image URL in an untrusted document is a tracking
 * beacon, and a résumé photo is a regional convention, not a default.
 *
 * Absent, empty or wrongly-typed sections are skipped, never rendered as an
 * empty heading. Every schema field is optional.
 */
function resumeToHtml(resume) {
  var r = resume && typeof resume === 'object' ? resume : {};
  var b =
    r.basics && typeof r.basics === 'object' && !Array.isArray(r.basics)
      ? r.basics
      : {};
  var out = [];

  if (str(b.name).trim()) out.push(el('h1', 'h1', escapeHtml(b.name)));
  if (str(b.label).trim()) out.push(el('p', 'label', escapeHtml(b.label)));

  var loc = b.location && typeof b.location === 'object' ? b.location : {};
  var email = safeEmail(b.email);
  // The theme's contact line: email, phone, location, site, then each profile
  // by network name; links show without the scheme.
  var contact = [
    email
      ? '<a href="mailto:' +
        escapeHtml(email) +
        '" style="' +
        CONTACT_LINK_STYLE +
        '">' +
        escapeHtml(email) +
        '</a>'
      : escapeHtml(b.email),
    escapeHtml(b.phone),
    escapeHtml(joinNonEmpty([loc.city, loc.region, loc.countryCode], ', ')),
    str(b.url).trim()
      ? linkOrText(
          b.url,
          str(b.url)
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, ''),
          CONTACT_LINK_STYLE
        )
      : '',
  ];
  objs(b.profiles).forEach(function (p) {
    var label = str(p.network).trim() || str(p.username).trim();
    contact.push(
      str(p.url).trim()
        ? linkOrText(p.url, label || p.url, CONTACT_LINK_STYLE)
        : escapeHtml(label)
    );
  });
  contact = contact.filter(function (c) {
    return c;
  });
  if (contact.length) out.push(el('p', 'contact', contact.join('  •  ')));

  // The theme puts the summary straight under the header, unheaded, then a rule.
  if (str(b.summary).trim())
    out.push(el('p', 'summary', escapeHtml(b.summary)));
  out.push('<hr>');

  RESUME_SECTIONS.forEach(function (section) {
    var items = objs(r[section.key]);
    if (!items.length) return;
    var body = items
      .map(function (item) {
        var e = section.entry(item);
        if (!e.title) return '';
        return section.compact ? renderCompactEntry(e) : renderEntry(e);
      })
      .join('');
    if (!body) return;
    out.push(el('h2', 'h2', escapeHtml(section.heading.toUpperCase())));
    out.push(body);
  });

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
    escapeHtml(docTitleFor(r, '')) +
    '</title></head>' +
    '<body style="' +
    FONT +
    'font-size:10pt">' +
    out.join('\n') +
    '</body></html>'
  );
}

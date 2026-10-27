/**
 * Tests for the renderer half (src/RenderDoc.gs): resumeToHtml(), the URL
 * guards, the export links, the Docs API request shapes and the live-run
 * findings. Plain JavaScript, so it runs off Google's servers; Drive REST
 * itself is exercised through a fake in execute.test.mjs.
 */

import {check, loadProject} from './helpers.mjs';

const ctx = loadProject();

// ---- the Doc is the only artifact: export LINKS, no stored PDF ----------
const ID = '1AbC-d_9xYz';
const links = ctx.buildOutputs(ID, 'https://docs.google.com/document/d/' + ID + '/edit');
check('pdfUrl is the Doc\'s own PDF export link',
  links.pdfUrl === `https://docs.google.com/document/d/${ID}/export?format=pdf`, links.pdfUrl);
check('docxUrl is the Doc\'s own DOCX export link',
  links.docxUrl === `https://docs.google.com/document/d/${ID}/export?format=docx`, links.docxUrl);
check('export links are URL-safe (no space, quote, angle, or extra query)',
  [links.pdfUrl, links.docxUrl].every((u) => /^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+\/export\?format=[a-z]+$/.test(u)));
for (const bad of ['', 'a/b', 'x?format=exe', 'a b', '"><script>', '../../x', undefined, null]) {
  const o = ctx.buildOutputs(bad, '');
  check(`a non-Drive id ${JSON.stringify(bad)} yields NO export links`, o.pdfUrl === '' && o.docxUrl === '');
}

// ---- title ------------------------------------------------------------------
check('title defaults to the name', ctx.docTitleFor({ basics: { name: 'Ada' } }, '') === 'Ada — Résumé');
check('configured title wins', ctx.docTitleFor({ basics: { name: 'Ada' } }, ' CV for X ') === 'CV for X');
check('no name falls back to Résumé', ctx.docTitleFor({}, '') === 'Résumé');

// ---- multipart frame -------------------------------------------------------
const frame = ctx.multipartFrame('B', { name: 'n', mimeType: 'm' }, 'text/html; charset=UTF-8');
check('multipart head opens with the boundary and carries metadata',
  frame.head.startsWith('--B\r\nContent-Type: application/json') && frame.head.includes('{"name":"n","mimeType":"m"}'));
check('multipart head ends on the media part headers', frame.head.endsWith('Content-Type: text/html; charset=UTF-8\r\n\r\n'));
check('multipart tail closes the boundary', frame.tail === '\r\n--B--\r\n');

// ---- escaping and URL safety (the résumé is untrusted) --------------------
const hostile = {
  basics: {
    name: '<script>alert(1)</script>',
    label: 'a & b "c" \'d\'',
    email: '"><img src=x onerror=alert(1)>@x.com',
    url: 'javascript:alert(1)',
    image: 'https://tracker.example/pixel.gif',
    profiles: [{ network: 'X', username: 'u', url: 'data:text/html,<b>x</b>' }],
  },
  work: [{ name: 'Evil<iframe>', url: 'https://user:pw@evil.example/', position: 'P', highlights: ['<b>bold</b>'] }],
};
const h = ctx.resumeToHtml(hostile);
check('no raw <script> survives', !h.includes('<script>'));
check('no raw <img> or <iframe> survives', !/<img|<iframe/i.test(h));
check('script text is still visible, escaped', h.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
check('quotes and ampersands are escaped', h.includes('a &amp; b &quot;c&quot; &#39;d&#39;'));
check('javascript: never becomes an href', !/href="javascript:/i.test(h));
check('data: never becomes an href', !/href="data:/i.test(h));
check('credentials-in-URL never become an href', !h.includes('href="https://user:pw@'));
check('an invalid email is not a mailto link', !h.includes('mailto:"'));
check('basics.image is never fetched (no tracking beacon)', !h.includes('tracker.example'));
check('a highlight with markup renders as text', h.includes('&lt;b&gt;bold&lt;/b&gt;'));
check('safeWebUrl accepts https', ctx.safeWebUrl('https://example.com/a?b=c') === 'https://example.com/a?b=c');
check('safeWebUrl accepts an @ in the path', ctx.safeWebUrl('https://medium.com/@me') === 'https://medium.com/@me');
check('safeWebUrl rejects a URL with a quote', ctx.safeWebUrl('https://e.com/"onmouseover=x') === '');
check('safeEmail accepts a normal address', ctx.safeEmail('a.b+c@example.co') === 'a.b+c@example.co');

// ---- structure -------------------------------------------------------------
const full = {
  basics: {
    name: 'Ada Lovelace', label: 'Analyst', email: 'ada@example.com', phone: '+1 555',
    url: 'https://ada.example', summary: 'Wrote the first program.',
    location: { city: 'London', countryCode: 'GB' },
    profiles: [{ network: 'GitHub', username: 'ada', url: 'https://github.com/ada' }],
  },
  work: [{ name: 'Analytical Engine', position: 'Programmer', startDate: '1842-01', highlights: ['Note G'] }],
  education: [{ institution: 'Home', area: 'Mathematics', studyType: 'Tutoring', courses: ['Calculus'] }],
  skills: [{ name: 'Mathematics', level: 'Master', keywords: ['Bernoulli numbers'] }],
  projects: [{ name: 'Notes', description: 'Translation with notes.', url: 'https://notes.example' }],
};
const f = ctx.resumeToHtml(full);
const h2 = (html, heading) => new RegExp(`<h2 style="[^"]*">${heading}</h2>`).test(html);
check('name is the h1', /<h1 style="[^"]*">Ada Lovelace<\/h1>/.test(f));
check('email becomes an ink-coloured mailto link', f.includes('<a href="mailto:ada@example.com" style="color:#111827;text-decoration:underline">ada@example.com</a>'));
check('safe URLs become ink-coloured links, labelled by network', /<a href="https:\/\/github.com\/ada" style="color:#111827;text-decoration:underline">GitHub<\/a>/.test(f));
check('no link is left to Docs\' default blue', [...f.matchAll(/<a [^>]*>/g)].every((m) => /color:#111827/.test(m[0])));
check('open-ended role reads as Present, with a month name', f.includes('Jan 1842 – Present'));
for (const heading of ['EDUCATION', 'PROFESSIONAL EXPERIENCE', 'PROJECTS', 'SKILLS']) {
  check(`renders the ${heading} section`, h2(f, heading));
}
for (const heading of ['Awards', 'Certifications', 'Publications', 'Volunteering', 'Languages', 'Interests', 'References']) {
  check(`absent section ${heading} has no heading`, !h2(f, heading));
}
check('an empty section array has no heading', !ctx.resumeToHtml({ basics: { name: 'A' }, awards: [] }).includes('>Awards</h2>'));
check('the document has no external resources', !/<(link|script|img)\b|src=/i.test(f));

// ---- live-run findings, 2026-10-27 ----------------------------------------
// #1 LENGTH: every block element carries its own inline font-size. The import
// maps h1-h3 to the Doc's named Heading styles and ignores the body's size.
const blocks = [...f.matchAll(/<(h1|h2|h3|p|li)\b([^>]*)>/g)];
check('every h1/h2/h3/p/li carries an inline font-size',
  blocks.length > 10 && blocks.every((m) => /style="[^"]*font-size:\d/.test(m[2])),
  blocks.filter((m) => !/font-size/.test(m[2])).map((m) => m[0]).join(' '));
const ptOf = (tag) => Number((new RegExp(`<${tag} style="[^"]*font-size:([\\d.]+)pt`).exec(f) || [])[1]);
check('h1 is compact (<= 20pt, not Docs\' default 24pt)', ptOf('h1') > 0 && ptOf('h1') <= 20, String(ptOf('h1')));
check('headings shrink h1 > h2 > h3', ptOf('h1') > ptOf('h2') && ptOf('h2') > ptOf('h3'));
check('every block element sets its margins', blocks.every((m) => /margin:/.test(m[2])));
const margins = ctx.marginRequests(43.2);
const ds = margins[0]?.updateDocumentStyle;
check('margin request sets all four margins in PT',
  ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].every((k) => ds?.documentStyle[k]?.magnitude === 43.2 && ds.documentStyle[k].unit === 'PT')
  && ds.fields === 'marginTop,marginBottom,marginLeft,marginRight');
// Second live run: a 10.5pt h3 imported as 10pt (half-points round down), so
// every size must be a whole number of points.
const sizes = [...f.matchAll(/font-size:([\d.]+)pt/g)].map((m) => m[1]);
check('every font-size is a whole number of points', sizes.length > 0 && sizes.every((s) => /^\d+$/.test(s)),
  sizes.filter((s) => !/^\d+$/.test(s)).join(','));
check('blocks use single line spacing', blocks.every((m) => /line-height:1\.0;/.test(m[2])));
const ns = ctx.namedStyleRequests()[0]?.updateNamedStyle;
check('Normal text named style: 10pt, single spacing, no paragraph gaps',
  ns?.namedStyle.namedStyleType === 'NORMAL_TEXT'
  && ns.namedStyle.textStyle.fontSize.magnitude === 10 && ns.namedStyle.textStyle.fontSize.unit === 'PT'
  && ns.namedStyle.paragraphStyle.lineSpacing === 100
  && ns.namedStyle.paragraphStyle.spaceAbove.magnitude === 0 && ns.namedStyle.paragraphStyle.spaceBelow.magnitude === 0
  && ns.fields === 'namedStyleType,textStyle.fontSize,paragraphStyle.lineSpacing,paragraphStyle.spaceAbove,paragraphStyle.spaceBelow');
// LIVE RUN 3 (2026-10-27): HTTP 400 "Named style type is required". The API
// requires namedStyleType in the mask AND on the namedStyle object.
const mask = String(ns?.fields || '').split(',');
check('updateNamedStyle mask names namedStyleType first', mask[0] === 'namedStyleType', ns?.fields);
check('updateNamedStyle carries namedStyle.namedStyleType', ns?.namedStyle?.namedStyleType === 'NORMAL_TEXT');
check('updateNamedStyle mask has only leaf paths (a parent resets its children)',
  mask.every((p) => p === 'namedStyleType' || /^(textStyle|paragraphStyle)\.\w+$/.test(p)), ns?.fields);
check('every masked leaf is actually set on the request',
  mask.filter((p) => p !== 'namedStyleType').every((p) => p.split('.').reduce((o, k) => o?.[k], ns.namedStyle) !== undefined));

// #2 HEADLINE WRAP: dates live on their own small line, never inside the h3.
const h3s = [...f.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => m[1]);
check('no h3 contains a date', h3s.length > 0 && h3s.every((t) => !/\d{4}/.test(t.replace(/<[^>]*>/g, ''))), JSON.stringify(h3s));
check('entries read title / italic organisation / grey dates (academic-cv-lite)',
  /<\/h3><p style="[^"]*font-style:italic[^"]*">[^<]*(<a [^>]*>[^<]*<\/a>)?[^<]*<\/p><p style="[^"]*color:#666666[^"]*">Jan 1842 – Present<\/p>/.test(f));
check('the summary sits unheaded under the header, then a rule',
  !h2(f, 'SUMMARY') && /<hr>/.test(f));
check('Education comes before Professional Experience',
  f.indexOf('>EDUCATION<') > 0 && f.indexOf('>EDUCATION<') < f.indexOf('>PROFESSIONAL EXPERIENCE<'));
check('headings and body use Merriweather', /font-family:Merriweather,Georgia,serif/.test(f));
check('section headings are uppercase over a rule', /<h2 style="[^"]*text-transform:uppercase;border-bottom:2px solid/.test(f));

// #3 DATES: ISO to "Mon YYYY", unparseable strings untouched.
for (const [inp, want] of [['2024', '2024'], ['2024-08', 'Aug 2024'], ['2024-08-01', 'Aug 2024'],
  [' 2026-03-01 ', 'Mar 2026'], ['2024-12-31', 'Dec 2024'], ['2024-13', '2024-13'], ['2024-00', '2024-00'],
  ['2024-02-45', '2024-02-45'], ['Summer 2019', 'Summer 2019'], ['', ''], [undefined, ''], [2024, '2024']]) {
  check(`formatDate(${JSON.stringify(inp)}) = ${JSON.stringify(want)}`, ctx.formatDate(inp) === want, JSON.stringify(ctx.formatDate(inp)));
}
check('a full range reads "Aug 2024 – Mar 2026"', ctx.dateRange('2024-08-01', '2026-03-01') === 'Aug 2024 – Mar 2026');
check('an open range ends in Present', ctx.dateRange('2024-08', '') === 'Aug 2024 – Present');
check('an end date alone is shown alone', ctx.dateRange('', '2020') === '2020');
check('single dates are formatted (certificates)',
  ctx.resumeToHtml({ certificates: [{ name: 'CKA', date: '2023-05-02' }] }).includes('May 2023'));

// #4 EDUCATION: studyType and area joined with a comma.
check('education reads "studyType in area"', f.includes('Tutoring in Mathematics'));

// Compact skills: one paragraph per group, no h3.
check('skills render as one compact paragraph, not an h3',
  /<p style="[^"]*"><b>Mathematics — Master<\/b>: Bernoulli numbers<\/p>/.test(f) && !h3s.some((t) => t.includes('Mathematics — Master')));


// #5 PROJECT TYPE: the raw enum is not printed.
const proj = ctx.resumeToHtml({ projects: [{ name: 'X', type: 'application', roles: ['Lead'] }] });
check('project type enum is dropped', !proj.includes('application'));
check('project roles still show', proj.includes('Lead'));

// ---- degenerate inputs must not throw, and must not leak undefined/null ----
for (const [label, value] of [['empty object', {}], ['nulls', { basics: null, work: null }],
  ['wrong types', { basics: 'x', work: 'y', skills: 42 }],
  ['array items that are not objects', { work: ['a', null, 3], skills: [[1]] }],
  ['entries with no fields', { work: [{}], education: [{}], skills: [{}] }]]) {
  try {
    const out = ctx.resumeToHtml(value);
    check(`degenerate: ${label}`, !/undefined|null/.test(out), out.slice(0, 200));
  } catch (e) { check(`degenerate: ${label}`, false, e.message); }
}


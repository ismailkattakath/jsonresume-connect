// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * The manifest contract and the project-wide source rules.
 *
 * Studio errors a step whose returned outputs differ from the declared ones,
 * a card field that matches no manifest input is an orphan, and the scope bill
 * IS the design. None of that needs Google's servers to check.
 */

import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  OAUTH2_FILE,
  OWN_FILES,
  SRC,
  check,
  fakeOAuth2,
  loadProject,
  manifest,
  propertyStore,
  readSrc,
  recordingCardService,
  sha256,
  stripComments,
  topLevelNames,
} from './helpers.mjs';

const elements = manifest.addOns.flows.workflowElements;
const step = elements[0];
const action = step.workflowAction;
const own = Object.fromEntries(OWN_FILES.map(f => [f, readSrc(f)]));
const code = Object.values(own).map(stripComments).join('\n');

// ---- parsing: one global scope, like Apps Script ---------------------------
for (const f of OWN_FILES) {
  test(`${f} parses`, () => loadProject({}, [f]));
}
test(`${OAUTH2_FILE} parses and defines OAuth2.createService`, () => {
  const ctx = loadProject({}, [OAUTH2_FILE]);
  assert.equal(typeof ctx.OAuth2.createService, 'function');
});

// ONE global scope: a name defined in two files would silently replace the
// other copy in production, whichever file loads last.
test('no top-level name is defined in two files', () => {
  const seen = new Map();
  const dupes = [];
  for (const [f, src] of Object.entries(own)) {
    for (const n of topLevelNames(src)) {
      if (seen.has(n)) dupes.push(`${n} (${seen.get(n)}, ${f})`);
      else seen.set(n, f);
    }
  }
  assert.deepEqual(dupes, []);
});

// ---- one step, its name in ONE place ----------------------------------------
check('the manifest declares exactly one step', elements.length === 1);
check(
  'the step has a name',
  typeof step.name === 'string' && step.name.trim().length > 0
);
// The display name: addOns.common.name, the step's name, and APP_NAME (the
// one code copy, which jsonresume.org's consent screen shows) must agree, and
// the literal may appear in code nowhere else. A rename is the manifest plus
// that constant, and this test says if either was missed.
check(
  "the step's name is the add-on's name",
  step.name === manifest.addOns.common.name,
  `${step.name} vs ${manifest.addOns.common.name}`
);
check(
  'no "Google" in the name (Workspace add-on naming rules)',
  !/google/i.test(manifest.addOns.common.name)
);
test('the name appears in code once: the APP_NAME constant', () => {
  const hits = OWN_FILES.flatMap(f =>
    stripComments(own[f])
      .split('\n')
      .filter(l => l.includes(`'${manifest.addOns.common.name}'`))
      .map(l => `${f}: ${l.trim()}`)
  );
  assert.deepEqual(hits, [
    `JsonResumeToDoc.gs: var APP_NAME = '${manifest.addOns.common.name}';`,
  ]);
});
check(
  'the logo is a repo-hosted https image',
  /^https:\/\/raw\.githubusercontent\.com\/ismailkattakath\/jsonresume-connect\/main\/assets\/[\w-]+\.png$/.test(
    manifest.addOns.common.logoUrl
  ),
  manifest.addOns.common.logoUrl
);

// Design review item 9: ONE spelling in everything the user reads. "resume"
// (ASCII, as in the JSON Resume name); the accented form only in comments.
test('user-facing text spells it "resume", never with accents', () => {
  const accented = /r[ée]sum[ée]/i;
  const offenders = [
    ...OWN_FILES.filter(f =>
      /résumé|resumé|résume/i.test(stripComments(own[f]))
    ),
    ...(JSON.stringify(manifest)
      .match(/r[ée]sum[ée]/gi)
      ?.filter(m => m !== 'resume' && m !== 'Resume') || []),
  ];
  assert.ok(accented.test('résumé'));
  assert.deepEqual(offenders, []);
});

// ---- callbacks ---------------------------------------------------------------
const {stub: CardService} = recordingCardService();
const ctx = loadProject({
  CardService,
  AddOnsResponseService: {},
  ...fakeOAuth2(),
  PropertiesService: {
    getUserProperties: () => propertyStore(),
    getScriptProperties: () => propertyStore({JR_CLIENT_ID: 'test-client'}),
  },
});
for (const fn of [action.onConfigFunction, action.onExecuteFunction]) {
  check(`callback ${fn} is defined`, typeof ctx[fn] === 'function');
}
// Functions the cards name by string must exist too.
for (const fn of [
  ...code.matchAll(/setFunctionName\('([^']+)'\)/g),
  ...code.matchAll(/setCustomUiCallback\('([^']+)'\)/g),
  ...code.matchAll(/setCallbackFunction\('([^']+)'\)/g),
].map(m => m[1])) {
  check(`card callback ${fn} is defined`, typeof ctx[fn] === 'function');
}

// ---- outputs: declared == returned ------------------------------------------
const declaredOut = action.outputs.map(o => o.id).sort();
const got = ctx.buildOutputs('1AbC', 'https://docs.google.com/x', {
  basics: {name: 'A'},
});
check(
  'buildOutputs returns exactly the declared outputs',
  JSON.stringify(Object.keys(got).sort()) === JSON.stringify(declaredOut),
  `${JSON.stringify(Object.keys(got))} vs ${JSON.stringify(declaredOut)}`
);
check(
  'outputs are strings even when given undefined',
  Object.values(ctx.buildOutputs(undefined, null, undefined)).every(
    v => typeof v === 'string'
  )
);
check(
  'every output is a STRING scalar',
  action.outputs.every(
    o => o.dataType.basicType === 'STRING' && o.cardinality === 'SINGLE'
  )
);
check(
  'the merged step keeps the Doc links and the resume metadata',
  JSON.stringify(declaredOut) ===
    JSON.stringify(
      [
        'docId',
        'docUrl',
        'pdfUrl',
        'docxUrl',
        'name',
        'label',
        'email',
        'resume',
        'resumeText',
      ].sort()
    ),
  JSON.stringify(declaredOut)
);

// ---- inputs: card fields bind to manifest inputs BY NAME --------------------
check(
  'the step declares one input, the optional title',
  action.inputs.length === 1 &&
    action.inputs[0].id === 'title' &&
    action.inputs[0].required === false
);
const fieldNames = [...code.matchAll(/setFieldName\('([^']+)'\)/g)]
  .map(m => m[1])
  .sort();
check(
  'every card field matches a manifest input',
  JSON.stringify(fieldNames) ===
    JSON.stringify(action.inputs.map(i => i.id).sort()),
  JSON.stringify(fieldNames)
);

// ---- scopes: the bill IS the design -----------------------------------------
check(
  'scopes are exactly external_request + drive.file',
  JSON.stringify([...manifest.oauthScopes].sort()) ===
    JSON.stringify([
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/script.external_request',
    ])
);
check(
  'no DocumentApp or DriveApp call (each one forces a broader scope)',
  !/\b(DocumentApp|DriveApp)\s*\./.test(code)
);
check(
  'no Drive/Docs advanced-service call (REST via UrlFetchApp only)',
  !/\b(Drive|Docs)\.[A-Z]/.test(code)
);
const services = (manifest.dependencies?.enabledAdvancedServices || [])
  .map(s => `${s.serviceId}/${s.version}`)
  .sort();
check(
  'Drive v3 + Docs v1 advanced services declared (the 403 fix)',
  JSON.stringify(services) === JSON.stringify(['docs/v1', 'drive/v3']),
  JSON.stringify(services)
);

// ---- URL allowlist ------------------------------------------------------------
// Apps Script manifest reference: https, full domain, a non-empty path, and at
// most one LEADING wildcard.
const allow = manifest.urlFetchWhitelist || [];
check(
  'allowlist entries are https with a path and at most one leading *',
  allow.length > 0 &&
    allow.every(u => /^https:\/\/(\*\.)?[a-z0-9.-]+\.[a-z]+\/\S*$/.test(u)),
  JSON.stringify(allow)
);
check(
  'the allowlist is jsonresume.org plus Google APIs only',
  JSON.stringify([...allow].sort()) ===
    JSON.stringify([
      'https://docs.googleapis.com/',
      'https://jsonresume.org/',
      'https://www.googleapis.com/',
    ]),
  JSON.stringify(allow)
);
for (const url of [
  ctx.DRIVE_UPLOAD_URL,
  ctx.DOCS_API_URL + 'x:batchUpdate',
  ctx.JR_ORIGIN + '/api/oauth/resume',
  ctx.JR_ORIGIN + '/api/oauth/token',
  ctx.JR_ORIGIN + '/api/oauth/register',
]) {
  check(
    `allowlist covers ${url.split('?')[0]}`,
    allow.some(p => url.startsWith(p))
  );
}
// registry.jsonresume.org/{user}.json 301s to jsonresume.org/@{user}.json
// (measured 2026-10-27), so the redirect target is on the list too.
check(
  'allowlist covers the registry redirect target',
  allow.includes('https://jsonresume.org/')
);

// ---- the Doc is the only artifact -------------------------------------------
check(
  'no files.export call (nothing is exported or stored)',
  !/\/export\?mimeType|files\.export|driveExport/i.test(code)
);
check(
  'driveCreate is called from exactly one place',
  (code.match(/driveCreate\(/g) || []).length === 2
);
check(
  'no pdfFileId output anywhere',
  !/pdfFileId/.test(code) && !JSON.stringify(manifest).includes('pdfFileId')
);

// ---- manifest text ------------------------------------------------------------
const texts = [step.name, step.description];
for (const io of [...action.inputs, ...action.outputs])
  texts.push(io.description);
check(
  'no manifest description contains "<"',
  texts.every(t => !t.includes('<'))
);
check(
  'no manifest description promises "any HTTPS URL"',
  texts.every(t => !/any HTTPS URL/i.test(t))
);
const outDescs = action.outputs.map(o => o.description);
check(
  'output descriptions are chip-sized (<= 24 chars, no sentence)',
  outDescs.every(d => d.length <= 24 && !d.endsWith('.')),
  JSON.stringify(outDescs)
);

// ---- licence headers ---------------------------------------------------------
// MIT, as SPDX headers (REUSE convention), on every file the project wrote.
// The vendored OAuth2.gs keeps upstream's Apache-2.0 header, untouched.
const SPDX =
  '// SPDX-FileCopyrightText: 2026 Ismail Kattakath\n// SPDX-License-Identifier: MIT\n';
const repo = join(SRC, '..');
const ownJs = [
  ...OWN_FILES.map(f => join(SRC, f)),
  ...readdirSync(join(repo, 'test'))
    .filter(f => f.endsWith('.mjs'))
    .map(f => join(repo, 'test', f)),
  ...readdirSync(repo)
    .filter(f => /\.(m?js|cjs)$/.test(f))
    .map(f => join(repo, f)),
];
check(
  'licence headers: files were found',
  ownJs.length >= 9,
  String(ownJs.length)
);
for (const f of ownJs) {
  check(
    `${relative(repo, f)} starts with the MIT SPDX header`,
    readFileSync(f, 'utf8').startsWith(SPDX)
  );
}
check(
  'the vendored OAuth2.gs carries no project SPDX header',
  !readSrc(OAUTH2_FILE).includes('SPDX-License-Identifier: MIT')
);

// ---- vendored OAuth2 for Apps Script ----------------------------------------
// googleworkspace/apps-script-oauth2 dist/OAuth2.gs at aae9287 (the #513
// public-client refresh fix). Pinned by hash: a local edit to vendored code
// must be a deliberate re-vendor, not a drive-by.
check(
  'OAuth2.gs is byte-identical to upstream dist/OAuth2.gs at aae9287',
  sha256(OAUTH2_FILE) ===
    '73e240cdf2ad217c97fbd864e150ffc380c2220b0f040fcaa6143a81ef58ad0d',
  sha256(OAUTH2_FILE)
);
check(
  'the vendored library ships with its Apache-2.0 LICENSE',
  readSrc('third_party/apps-script-oauth2/LICENSE').includes('Apache License')
);

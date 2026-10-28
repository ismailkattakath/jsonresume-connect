// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * Tests for the step half (src/JsonResumeToDoc.gs): the Studio payload shape,
 * the /api/oauth/resume body, strict validation, the connect cards and the
 * plain-text flattening.
 *
 * Apps Script cannot run off Google's servers, so the Studio integration
 * itself is verified by installing the add-on. Everything that does not touch
 * a Google service is plain JavaScript, and that is where the bugs live.
 */

import {
  LIVE_EVENT,
  check,
  fakeAddOnsResponseService,
  fakeOAuth2,
  manifest,
  loadProject,
  propertyStore,
  recordingCardService,
} from './helpers.mjs';

const ctx = loadProject();

// ---- the /api/oauth/resume body -------------------------------------------
// The body is { username, url, resume } (measured 2026-10-27).
check(
  'unwraps { username, resume }',
  ctx.unwrapResumePayload({
    username: 'u',
    url: 'x',
    resume: {basics: {name: 'A'}},
  }).resume.basics.name === 'A'
);
check(
  'keeps the username',
  ctx.unwrapResumePayload({username: 'u', resume: {}}).username === 'u'
);
check(
  'a bare resume passes through',
  ctx.unwrapResumePayload({basics: {name: 'B'}}).resume.basics.name === 'B'
);
check(
  'a non-object resume field is not unwrapped',
  ctx.unwrapResumePayload({resume: 'x'}).resume.resume === 'x'
);

// ---- Studio action-invocation shape ---------------------------------------
// THESE TESTS USED TO ENCODE THE BUG. They asserted the generic add-on card
// shape, formInputs[field].stringInputs.value[0], which is real but not what
// a Studio step execution delivers, so they passed while the step could never
// have read its input in production. A test that agrees with the code about
// the wrong thing is worse than no test. They now assert the payload Google's
// own calculator reads:
//   event.workflow.actionInvocation.inputs["value1"].integerValues[0]
const invocation = inputs => ({workflow: {actionInvocation: {inputs}}});
const readFromEvent = (ev, id) => {
  const inputs =
    (ev &&
      ev.workflow &&
      ev.workflow.actionInvocation &&
      ev.workflow.actionInvocation.inputs) ||
    {};
  return ctx.readActionInput(inputs, id);
};

check(
  'reads stringValues from an action invocation',
  readFromEvent(invocation({title: {stringValues: ['CV for X']}}), 'title') ===
    'CV for X'
);
check(
  'trims whitespace',
  readFromEvent(
    invocation({title: {stringValues: ['  CV for X  ']}}),
    'title'
  ) === 'CV for X'
);
check(
  'missing field yields empty string',
  readFromEvent(invocation({}), 'title') === ''
);
check(
  'empty stringValues array yields empty string',
  readFromEvent(invocation({title: {stringValues: []}}), 'title') === ''
);
check(
  'a missing workflow envelope does not throw',
  readFromEvent({}, 'title') === ''
);
check(
  'an undefined event does not throw',
  readFromEvent(undefined, 'title') === ''
);

// THE LIVE PAYLOAD ITSELF. If this ever stops parsing, the platform changed.
check(
  'reads the captured live event',
  readFromEvent(LIVE_EVENT, 'resumeUrl') === 'https://example.com/resume.json'
);
check(
  'live event carries no formInputs to fall back on',
  LIVE_EVENT.commonEventObject.formInputs === undefined
);

// REGRESSION GUARD. The old generic-card payload must NOT satisfy the reader.
check(
  'the generic formInputs shape is NOT accepted',
  ctx.readActionInput({title: {stringInputs: {value: ['x']}}}, 'title') === ''
);
check(
  'an integer input does not masquerade as a string',
  ctx.readActionInput({n: {integerValues: [2]}}, 'n') === ''
);

// ---- validation: strict, fails, never repairs ------------------------------
check(
  'accepts a sparse but valid resume',
  ctx.hasAnyKnownSection({basics: {name: 'A'}}) === true
);
check(
  'accepts a work-only resume',
  ctx.hasAnyKnownSection({work: []}) === true
);
check(
  'rejects an unrelated object',
  ctx.hasAnyKnownSection({hello: 'world'}) === false
);

const problem = o => ctx.resumeProblem(o);
check('a JSON array is an error', /not a JSON object/.test(problem([1, 2])));
check('null is an error', /not a JSON object/.test(problem(null)));
check(
  'an unrelated object is an error',
  /no jsonresume\.org sections/.test(problem({hello: 'world'}))
);
check('a plain resume passes', problem({basics: {name: 'A'}}) === '');
check(
  'a schema-valid resume passes',
  problem({
    basics: {name: 'A'},
    work: [
      {
        name: 'X',
        startDate: '2024-08',
        endDate: '2026-03-01',
        highlights: ['h'],
      },
    ],
    skills: [{name: 'S', keywords: ['k']}],
    education: [{startDate: '2006', courses: []}],
  }) === ''
);
check(
  'work as an object is rejected',
  /work must be an array/.test(problem({work: {name: 'X'}}))
);
check(
  'a string entry is rejected',
  /work\[0\] must be an object/.test(problem({work: ['X']}))
);
check(
  'highlights as a string is rejected',
  /work\[0\]\.highlights must be an array of strings/.test(
    problem({work: [{highlights: 'h'}]})
  )
);
check(
  'a prose date is rejected',
  /work\[0\]\.startDate must be YYYY/.test(
    problem({work: [{startDate: 'Aug 2024'}]})
  )
);
for (const bad of ['2024-13', '2024-00', '2024-02-32', '2024-02-00']) {
  check(
    `an out-of-range date (${bad}) is rejected, per schema 1.7.0`,
    /work\[0\]\.startDate must be YYYY/.test(
      problem({work: [{startDate: bad}]})
    )
  );
}
for (const good of ['2024', '2024-12', '2024-02-29', '1999-01-31']) {
  check(
    `a valid date (${good}) passes`,
    problem({work: [{startDate: good}]}) === ''
  );
}
check(
  'an empty endDate (current role) passes',
  problem({work: [{startDate: '2024', endDate: ''}]}) === ''
);
check(
  'basics.name as a number is rejected',
  /basics\.name must be a string/.test(problem({basics: {name: 1}}))
);
check(
  'extra unknown keys are allowed',
  problem({basics: {name: 'A'}, meta: {x: 1}, work: [{foo: 'bar'}]}) === ''
);
check(
  'problems are capped at 5 with a count',
  /\(and 1 more\)/.test(problem({work: ['a', 'b', 'c', 'd', 'e', 'f']}))
);
check(
  'a schema problem names the schema',
  /^it does not match the jsonresume\.org schema: /.test(problem({work: {}}))
);

// ---- connect cards ----------------------------------------------------------
// Studio renders hint text as HTML, so an <angle> placeholder vanishes. Build
// every card through the recording stub and read the text.
function cardsFor({hasAccess}) {
  const {stub, calls} = recordingCardService();
  const c = loadProject({
    CardService: stub,
    ...fakeOAuth2({hasAccess}),
    PropertiesService: {
      getUserProperties: () => propertyStore({JR_USERNAME: 'ada'}),
      getScriptProperties: () => propertyStore({JR_CLIENT_ID: 'test-client'}),
    },
    CacheService: {getUserCache: () => ({})},
    LockService: {getUserLock: () => ({})},
  });
  c.jsonResumeConnectCard();
  c.onConfigJsonResumeToDoc();
  return calls;
}
const signedOut = cardsFor({hasAccess: false});
const signedIn = cardsFor({hasAccess: true});
const texts = calls =>
  calls.filter(([k]) => k === 'setText').map(([, a]) => String(a[0]));
const hints = [...signedOut, ...signedIn]
  .filter(([k]) => k === 'setHint' || k === 'setTitle')
  .map(([, a]) => String(a[0]));

check('card hints were captured', hints.length >= 2, String(hints.length));
check(
  'no card hint or title contains "<"',
  hints.every(h => !h.includes('<')),
  JSON.stringify(hints.filter(h => h.includes('<')))
);
check(
  'the connect card says to refresh, in bold, without a link',
  texts(signedOut).includes('After connecting, <b>refresh</b> this page.')
);
check(
  'the connect card offers "Connect JSON Resume" through an AuthorizationAction',
  texts(signedOut).includes('Connect JSON Resume') &&
    signedOut.some(([k]) => k === 'setAuthorizationAction')
);
check(
  'signed out, the config throws the AuthorizationException',
  signedOut.some(([k]) => k === 'throwException')
);
check(
  'signed in, the card names the account and offers Disconnect',
  texts(signedIn).some(t => t.includes('as <b>@ada</b>')) &&
    texts(signedIn).includes('Disconnect')
);
check(
  'signed in, the card carries the title field, accepting variables',
  signedIn.some(([k, a]) => k === 'setFieldName' && a[0] === 'title') &&
    signedIn.some(([k, a]) => k === 'setIncludeVariables' && a[0] === true)
);

// Design review item 8: one label per thing. The card field's title is the
// manifest input's description.
const fieldTitle = (calls, field) => {
  const at = calls.findIndex(
    ([k, a]) => k === 'setFieldName' && a[0] === field
  );
  const next = calls.slice(at).find(([k]) => k === 'setTitle');
  return at >= 0 && next ? String(next[1][0]) : '';
};
for (const input of manifest.addOns.flows.workflowElements[0].workflowAction
  .inputs) {
  check(
    `card field "${input.id}" is titled as the manifest describes it`,
    fieldTitle(signedIn, input.id) === input.description,
    fieldTitle(signedIn, input.id)
  );
}
check(
  'the connected and the connect section share one id (Disconnect swaps them)',
  signedIn.filter(([k, a]) => k === 'setId' && a[0] === 'jsonresume_connection')
    .length >= 1 &&
    signedOut.filter(
      ([k, a]) => k === 'setId' && a[0] === 'jsonresume_connection'
    ).length >= 1
);

// Style guide: "Use sentence case (especially for buttons, labels, and card
// actions)". Words after the first stay lowercase, except proper nouns and
// acronyms. "Connect JSON Resume" keeps its capitals: JSON Resume is a name.
const PROPER = new Set([
  'JSON',
  'Resume',
  'PDF',
  'DOCX',
  'URL',
  'ID',
  'Doc',
  'Docs',
  'Drive',
  'Google',
]);
const sentenceCase = label =>
  label
    .split(/\s+/)
    .slice(1)
    .every(w => !/^[A-Z]/.test(w) || PROPER.has(w.replace(/[^\w]/g, '')));
const labels = [];
for (const calls of [signedOut, signedIn]) {
  calls.forEach(([k, a], n) => {
    if (k === 'setTitle') labels.push(String(a[0]));
    if (k === 'newTextButton') {
      const t = calls.slice(n).find(([k2]) => k2 === 'setText');
      if (t) labels.push(String(t[1][0]));
    }
  });
}
check(
  'button and field labels were captured',
  labels.length >= 3,
  JSON.stringify(labels)
);
check(
  'button and field labels are sentence case',
  labels.every(sentenceCase),
  JSON.stringify(labels.filter(l => !sentenceCase(l)))
);
const io = manifest.addOns.flows.workflowElements[0].workflowAction;
const ioDescs = [...io.inputs, ...io.outputs].map(x => x.description);
check(
  'manifest input and output labels are sentence case',
  ioDescs.every(sentenceCase),
  JSON.stringify(ioDescs.filter(l => !sentenceCase(l)))
);
check(
  'the connect card links jsonresume.org for sign-up',
  texts(signedOut).some(t =>
    t.includes('<a href="https://jsonresume.org">jsonresume.org</a>')
  )
);

// ---- Disconnect: a modifyCard action, not CardService navigation -----------
// Studio's guides: navigation is not supported in Studio add-ons; a button
// returns AddOnsResponseService.newRenderActionBuilder().setAction(
// newAction().addModifyCard(newModifyCard().setReplaceSection(section))).
// NOT YET RUN LIVE.
{
  const {stub, calls} = recordingCardService();
  const oauth = fakeOAuth2({hasAccess: true});
  const user = propertyStore({JR_USERNAME: 'ada'});
  const c = loadProject({
    CardService: stub,
    AddOnsResponseService: fakeAddOnsResponseService(),
    OAuth2: oauth.OAuth2,
    PropertiesService: {
      getUserProperties: () => user,
      getScriptProperties: () => propertyStore({JR_CLIENT_ID: 'test-client'}),
    },
    CacheService: {getUserCache: () => ({})},
    LockService: {getUserLock: () => ({})},
  });
  const r = c.disconnectJsonResume();
  check('Disconnect forgets the tokens', oauth.state.resets === 1);
  check(
    'Disconnect forgets the account name',
    user.getProperty('JR_USERNAME') === null
  );
  check(
    'Disconnect returns one modifyCard that replaces the section',
    r.kind === 'action' &&
      r.action.modifications.length === 1 &&
      r.action.modifications[0].replaceSection !== undefined
  );
  check(
    'the replacement is the Connect section, under the same id',
    calls.some(([k, a]) => k === 'setText' && a[0] === 'Connect JSON Resume') &&
      calls.some(([k, a]) => k === 'setId' && a[0] === 'jsonresume_connection')
  );
  check(
    'Disconnect uses no CardService navigation',
    !calls.some(
      ([k]) => k === 'setNavigation' || k === 'updateCard' || k === 'pushCard'
    )
  );
}

// ---- sign-in unavailable: a sentence, not a raw error (review item 4) -------
{
  const {stub, calls} = recordingCardService();
  const c = loadProject({
    CardService: stub,
    console: {log() {}, error() {}},
    ...fakeOAuth2({hasAccess: false}),
    PropertiesService: {
      getUserProperties: () => propertyStore(),
      getScriptProperties: () => propertyStore(),
    },
    ScriptApp: {getScriptId: () => 'script-id'},
    UrlFetchApp: {
      fetch: () => ({getResponseCode: () => 503, getContentText: () => 'down'}),
    },
    CacheService: {getUserCache: () => ({})},
    LockService: {getUserLock: () => ({})},
  });
  let threw = '';
  try {
    c.onConfigJsonResumeToDoc();
    c.jsonResumeConnectCard();
  } catch (e) {
    threw = e.message;
  }
  check(
    'a failed client registration does not throw from the config card',
    threw === '',
    threw
  );
  check(
    'it shows a plain sentence instead',
    calls.filter(
      ([k, a]) =>
        k === 'setText' &&
        a[0] ===
          'JSON Resume sign-in is unavailable right now. Try again in a few minutes.'
    ).length === 2
  );
  check(
    'and offers no Connect button it cannot honour',
    !calls.some(
      ([k]) => k === 'throwException' || k === 'setAuthorizationAction'
    )
  );
}

// ---- headline formatting per section (resumeText) ---------------------------
check(
  'work headline carries position, employer and dates',
  ctx.headlineFor('work', {
    position: 'Principal Engineer',
    name: 'Acme',
    startDate: '2020-01',
    endDate: '2024-06',
  }) === 'Principal Engineer — Acme  (2020-01 – 2024-06)'
);
check(
  'an open-ended role reads as present',
  ctx
    .headlineFor('work', {
      position: 'Engineer',
      name: 'Acme',
      startDate: '2024-01',
    })
    .includes('present')
);
check(
  'education uses studyType/area/institution',
  ctx
    .headlineFor('education', {
      studyType: 'BSc',
      area: 'Computer Science',
      institution: 'A University',
    })
    .startsWith('BSc Computer Science — A University')
);
check(
  'skills carry no dates',
  ctx.headlineFor('skills', {name: 'Nix', level: 'Advanced'}) ===
    'Nix — Advanced'
);
check(
  'certificates use issuer and date',
  ctx.headlineFor('certificates', {
    name: 'CKA',
    issuer: 'CNCF',
    date: '2023-05',
  }) === 'CKA — CNCF  (2023-05)'
);

// ---- degenerate inputs must not throw --------------------------------------
for (const [label, value] of [
  ['empty object', {}],
  ['nulls', {basics: null, work: null}],
  ['wrong types', {basics: 'x', work: 'y', skills: 42}],
  ['array items that are not objects', {work: ['a', null, 3]}],
]) {
  let ok = true;
  let detail = '';
  try {
    ctx.toPlainText(value);
  } catch (e) {
    ok = false;
    detail = e.message;
  }
  check(`degenerate: ${label}`, ok, detail);
}

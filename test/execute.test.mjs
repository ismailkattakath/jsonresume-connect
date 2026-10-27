// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * The merged execute path, end to end, against fakes of the Apps Script
 * services it touches: OAuth2 (the vendored library's public surface),
 * UrlFetchApp (jsonresume.org, Drive REST, Docs REST), PropertiesService,
 * ScriptApp, Utilities and AddOnsResponseService.
 *
 * What a fake cannot prove: that Google's services behave as faked. Those
 * shapes were measured live (README § Notes, RENDERER-DESIGN.md); these tests
 * prove the step's own control flow over them.
 */

import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_EVENT,
  eventWith,
  fakeAddOnsResponseService,
  fakeOAuth2,
  loadProject,
  manifest,
  propertyStore,
} from './helpers.mjs';

const DOC_ID = '1AbC-d_9xYz';
const VALID = {
  basics: {name: 'Ada Lovelace', label: 'Analyst', email: 'ada@example.com'},
  work: [
    {name: 'Analytical Engine', position: 'Programmer', startDate: '1842-01'},
  ],
};
const json = (status, body) => ({
  status,
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

/**
 * One run of onExecute. `resumeResponse` is what /api/oauth/resume answers;
 * `drive` and `docs` what Drive files.create and Docs batchUpdate answer.
 */
function run({
  hasAccess = true,
  resumeResponse = json(200, {username: 'ada', url: 'x', resume: VALID}),
  drive = json(200, {
    id: DOC_ID,
    webViewLink: `https://docs.google.com/document/d/${DOC_ID}/edit`,
  }),
  docs = json(200, {}),
  register = null,
  event = LIVE_EVENT,
} = {}) {
  const oauth = fakeOAuth2({hasAccess});
  const userProps = propertyStore();
  const fetches = [];
  const logs = [];
  const ctx = loadProject({
    console: {
      log: (...a) => logs.push(['log', a.join(' ')]),
      error: (...a) => logs.push(['error', a.join(' ')]),
    },
    OAuth2: oauth.OAuth2,
    PropertiesService: {
      getUserProperties: () => userProps,
      getScriptProperties: () =>
        propertyStore(register ? {} : {JR_CLIENT_ID: 'test-client'}),
    },
    CacheService: {getUserCache: () => ({})},
    LockService: {getUserLock: () => ({})},
    ScriptApp: {
      getOAuthToken: () => 'google-token',
      getScriptId: () => 'script-id',
    },
    Utilities: {
      getUuid: () => 'uuid',
      newBlob: () => ({
        setDataFromString(s) {
          this.bytes = [...Buffer.from(s, 'utf8')];
          return this;
        },
        getBytes() {
          return this.bytes;
        },
      }),
    },
    AddOnsResponseService: fakeAddOnsResponseService(),
    UrlFetchApp: {
      fetch(url, options = {}) {
        fetches.push({url, options});
        let r;
        if (url === 'https://jsonresume.org/api/oauth/resume')
          r = resumeResponse;
        else if (url === 'https://jsonresume.org/api/oauth/register')
          r = register;
        else if (
          url.startsWith('https://www.googleapis.com/upload/drive/v3/files')
        )
          r = drive;
        else if (url.startsWith('https://docs.googleapis.com/v1/documents/'))
          r = docs;
        else throw new Error(`unexpected fetch ${url}`);
        if (r instanceof Error) throw r;
        return {getResponseCode: () => r.status, getContentText: () => r.body};
      },
    },
  });
  const result = ctx.onExecuteJsonResumeToDoc(event);
  const driveCalls = fetches.filter(f => f.url.includes('/upload/drive/'));
  const docsCalls = fetches.filter(f => f.url.includes('docs.googleapis.com'));
  return {result, fetches, driveCalls, docsCalls, logs, oauth, userProps};
}

// What the user reads must never carry an HTTP code, Google's error text or
// an exception message (design review items 2-5; style guide: "Don't let the
// user see any exceptions your code throws").
const RAW = /HTTP \d|\d{3}\b|Error:|DNS|returned|has not been used/;

const failsWith = (r, re, {retry = false} = {}) => {
  assert.equal(r.result.kind, 'error', JSON.stringify(r.result));
  assert.match(r.result.message, re);
  assert.doesNotMatch(r.result.message, RAW, 'raw detail reached the user');
  assert.equal(r.result.actionability, retry ? 'NOT_ACTIONABLE' : 'ACTIONABLE');
  assert.equal(r.result.retryability, retry ? 'RETRYABLE' : 'NOT_RETRYABLE');
  assert.equal(r.driveCalls.length, 0, 'no Doc may be created on a failure');
};
const logged = (r, re) =>
  assert.ok(
    r.logs.some(([k, l]) => k === 'error' && re.test(l)),
    `no Executions log matching ${re}`
  );

describe('fails the step, never renders, when', () => {
  it('not connected', () => {
    const r = run({hasAccess: false});
    failsWith(
      r,
      /^Could not load resume: not connected to JSON Resume\. Open this step and click "Connect JSON Resume"\.$/
    );
    assert.equal(
      r.fetches.length,
      0,
      'nothing is fetched without a connection'
    );
  });

  it('the token is rejected (401): resets the connection', () => {
    const r = run({resumeResponse: json(401, {error: 'invalid_token'})});
    failsWith(
      r,
      /connection expired or was revoked\. Open this step and connect again\.$/
    );
    assert.equal(r.oauth.state.resets, 1);
  });

  it('the account has no resume (404)', () => {
    failsWith(
      run({resumeResponse: json(404, {})}),
      /your JSON Resume account has no resume yet\. Create it in the jsonresume\.org dashboard\.$/
    );
  });

  for (const status of [500, 503, 429]) {
    it(`jsonresume.org answers ${status}: retryable, the code only in the log`, () => {
      const r = run({resumeResponse: json(status, 'oops')});
      failsWith(
        r,
        /^jsonresume\.org is not responding\. The step will try again\.$/,
        {
          retry: true,
        }
      );
      logged(r, new RegExp(`HTTP ${status}`));
    });
  }

  it('jsonresume.org refuses another way (400): says what to do', () => {
    const r = run({resumeResponse: json(400, 'bad')});
    failsWith(
      r,
      /refused the request\. Open this step, click Disconnect, then connect JSON Resume again\.$/
    );
    logged(r, /HTTP 400/);
  });

  it('the fetch throws: retryable, the exception only in the log', () => {
    const r = run({resumeResponse: new Error('DNS error')});
    failsWith(
      r,
      /^Could not reach jsonresume\.org\. The step will try again\.$/,
      {retry: true}
    );
    logged(r, /DNS error/);
  });

  it('client registration fails: retryable, no raw error', () => {
    const r = run({register: json(503, 'down')});
    failsWith(
      r,
      /^JSON Resume sign-in is unavailable right now\. The step will try again\.$/,
      {
        retry: true,
      }
    );
    logged(r, /registration returned HTTP 503/);
  });

  it('the body is not JSON', () => {
    failsWith(
      run({resumeResponse: json(200, '<html>')}),
      /did not return JSON\.$/
    );
  });

  it('the body exceeds 2 MB', () => {
    failsWith(
      run({resumeResponse: json(200, 'x'.repeat(2 * 1024 * 1024 + 1))}),
      /exceeds the 2 MB limit\.$/
    );
  });

  it('the resume is not an object', () => {
    failsWith(run({resumeResponse: json(200, [1, 2])}), /not a JSON object\.$/);
  });

  it('the resume has no known section', () => {
    failsWith(
      run({resumeResponse: json(200, {resume: {hello: 'world'}})}),
      /no jsonresume\.org sections found/
    );
  });

  it('the resume does not match the schema: lists the problems, repairs nothing', () => {
    const r = run({
      resumeResponse: json(200, {
        resume: {
          basics: {name: 'A'},
          work: [{startDate: 'Aug 2024', highlights: 'h'}],
        },
      }),
    });
    failsWith(r, /does not match the jsonresume\.org schema: /);
    assert.match(
      r.result.message,
      /work\[0\]\.highlights must be an array of strings/
    );
    assert.match(
      r.result.message,
      /work\[0\]\.startDate must be YYYY, YYYY-MM or YYYY-MM-DD/
    );
  });
});

describe('a failed Doc create', () => {
  const docFails = (r, re, opts) => {
    assert.equal(r.driveCalls.length, 1);
    assert.equal(r.docsCalls.length, 0);
    r = {...r, driveCalls: []};
    failsWith(r, re, opts);
  };

  it("Drive 403: a plain sentence, Google's text only in the log", () => {
    const r = run({
      drive: json(403, {
        error: {message: 'Google Drive API has not been used in project 1'},
      }),
    });
    docFails(
      r,
      /^Google refused to create the Doc\. Check that the add-on is still allowed to create files in your Drive\.$/
    );
    logged(
      r,
      /files\.create returned HTTP 403: Google Drive API has not been used in project 1/
    );
  });

  it('Drive 503: retryable', () => {
    docFails(
      run({drive: json(503, 'x')}),
      /^Google Drive is not responding\. The step will try again\.$/,
      {
        retry: true,
      }
    );
  });

  it('Drive unreachable: retryable', () => {
    docFails(
      run({drive: new Error('Address unavailable')}),
      /^Google Drive is not responding/,
      {
        retry: true,
      }
    );
  });

  it('Drive 400: says what to check, not retried', () => {
    docFails(
      run({drive: json(400, 'x')}),
      /^Google Drive could not create the Doc from this resume\./
    );
  });
});

describe('a valid resume', () => {
  const r = run();
  const map = r.result.map || {};
  const out = Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, v.values])
  );

  it('returns outputs, not an error', () => {
    assert.equal(r.result.kind, 'outputs', JSON.stringify(r.result));
  });

  it('returns exactly the declared outputs, one string each', () => {
    const declared =
      manifest.addOns.flows.workflowElements[0].workflowAction.outputs.map(
        o => o.id
      );
    assert.deepEqual(Object.keys(out).sort(), [...declared].sort());
    for (const [k, v] of Object.entries(out)) {
      assert.ok(v.length === 1 && typeof v[0] === 'string', k);
    }
  });

  it('returns the Doc and its export links', () => {
    assert.equal(out.docId[0], DOC_ID);
    assert.equal(out.docName[0], 'Ada Lovelace — Resume');
    assert.equal(
      out.docUrl[0],
      `https://docs.google.com/document/d/${DOC_ID}/edit`
    );
    assert.equal(
      out.pdfUrl[0],
      `https://docs.google.com/document/d/${DOC_ID}/export?format=pdf`
    );
    assert.equal(
      out.docxUrl[0],
      `https://docs.google.com/document/d/${DOC_ID}/export?format=docx`
    );
  });

  it('returns the resume metadata, JSON and text', () => {
    assert.equal(out.name[0], 'Ada Lovelace');
    assert.equal(out.label[0], 'Analyst');
    assert.equal(out.email[0], 'ada@example.com');
    assert.deepEqual(JSON.parse(out.resume[0]), VALID);
    assert.match(out.resumeText[0], /^Ada Lovelace\nAnalyst\n/);
  });

  it('fetches the resume with the JSON Resume token, nothing else', () => {
    const jr = r.fetches.filter(f =>
      f.url.startsWith('https://jsonresume.org/')
    );
    assert.equal(jr.length, 1);
    assert.equal(jr[0].options.headers.Authorization, 'Bearer jr-access-token');
  });

  it('creates ONE Doc: an HTML upload Drive converts to a Google Doc', () => {
    assert.equal(r.driveCalls.length, 1);
    const {options} = r.driveCalls[0];
    assert.equal(options.method, 'post');
    assert.equal(options.headers.Authorization, 'Bearer google-token');
    assert.match(options.contentType, /^multipart\/related; boundary=/);
    const body = Buffer.from(options.payload).toString('utf8');
    assert.ok(
      body.includes(
        '{"name":"Ada Lovelace — Resume","mimeType":"application/vnd.google-apps.document"}'
      )
    );
    assert.ok(body.includes('Content-Type: text/html; charset=UTF-8'));
    assert.ok(body.includes('<!DOCTYPE html>'));
    assert.match(body, /<h1 style="[^"]*">Ada Lovelace<\/h1>/);
  });

  it('styles the Doc in two separate batchUpdates: margins, then Normal text', () => {
    assert.equal(r.docsCalls.length, 2);
    assert.ok(
      r.docsCalls.every(
        c =>
          c.url ===
          `https://docs.googleapis.com/v1/documents/${DOC_ID}:batchUpdate`
      )
    );
    const [m, n] = r.docsCalls.map(
      c => JSON.parse(c.options.payload).requests[0]
    );
    assert.equal(m.updateDocumentStyle.documentStyle.marginTop.magnitude, 36);
    assert.equal(n.updateNamedStyle.namedStyle.namedStyleType, 'NORMAL_TEXT');
  });

  it('remembers the account name for the card', () => {
    assert.equal(r.userProps.getProperty('JR_USERNAME'), 'ada');
  });

  it('logs the envelope only, never the resume (personal data)', () => {
    const text = r.logs.map(([, l]) => l).join('\n');
    assert.match(text, /inputs present: \["resumeUrl"\]/);
    assert.ok(!text.includes('Ada') && !text.includes('ada@example.com'));
  });

  it('fetches only allowlisted URLs', () => {
    const allow = manifest.urlFetchWhitelist;
    for (const {url} of r.fetches)
      assert.ok(
        allow.some(p => url.startsWith(p)),
        url
      );
  });
});

describe('the title input', () => {
  it('names the Doc when configured', () => {
    const r = run({event: eventWith({title: '  CV for Analytical Engines  '})});
    const body = Buffer.from(r.driveCalls[0].options.payload).toString('utf8');
    assert.ok(body.includes('{"name":"CV for Analytical Engines",'));
  });

  it('docName is the configured title when Drive echoes no name', () => {
    const r = run({event: eventWith({title: 'CV for X'})});
    assert.equal(r.result.map.docName.values[0], 'CV for X');
  });

  it('docName is the name Drive stored, when it returns one', () => {
    const r = run({
      drive: json(200, {
        id: DOC_ID,
        name: 'Ada Lovelace — Resume (1)',
        webViewLink: 'https://docs.google.com/document/d/x/edit',
      }),
    });
    assert.equal(r.result.map.docName.values[0], 'Ada Lovelace — Resume (1)');
  });

  it('asks Drive for the stored name', () => {
    assert.match(run().driveCalls[0].url, /fields=id,name,webViewLink$/);
  });

  it('defaults to "<name> — Resume" when empty', () => {
    const r = run({event: eventWith({title: ''})});
    const body = Buffer.from(r.driveCalls[0].options.payload).toString('utf8');
    assert.ok(body.includes('{"name":"Ada Lovelace — Resume",'));
  });
});

describe('best-effort styling', () => {
  it('a failed batchUpdate still delivers the Doc, and says why in Executions', () => {
    const r = run({
      docs: json(400, {error: {message: 'Named style type is required.'}}),
    });
    assert.equal(r.result.kind, 'outputs');
    assert.equal(
      r.docsCalls.length,
      2,
      'the second call is tried even when the first fails'
    );
    const errors = r.logs.filter(([k]) => k === 'error').map(([, l]) => l);
    assert.equal(errors.length, 2);
    assert.ok(
      errors.every(e => e.includes('HTTP 400: Named style type is required.'))
    );
  });
});

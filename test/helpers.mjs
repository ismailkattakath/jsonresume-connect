// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * Shared harness: loads the add-on's .gs files the way Apps Script does.
 *
 * Apps Script loads every .gs file of a project into ONE global scope, so the
 * files are run into one `node:vm` context, in order. `node:vm` rather than
 * `new Function(...)`: it takes the source as a value instead of splicing it
 * into a function body, and states the intent plainly.
 *
 * Top-level `var` and `function` declarations become properties of the
 * context, which is how the tests reach them (`ctx.resumeToHtml`). Top-level
 * `const`/`let` would NOT: they land in the shared lexical scope instead. That
 * is why the .gs files keep `var` at the top level, and why the linter does
 * not enforce no-var.
 */

import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext, runInContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
export const SRC = join(here, '..', 'src');
export const THIRD_PARTY = join(SRC, 'third_party');

/** Every .gs file under a directory, recursively, sorted. */
function gsFiles(dir) {
  return readdirSync(dir, {recursive: true})
    .filter(f => f.endsWith('.gs'))
    .map(f => join(dir, f))
    .sort();
}

/** Our own .gs files (relative to src/), excluding vendored third_party code. */
export const OWN_FILES = gsFiles(SRC)
  .filter(f => !f.startsWith(THIRD_PARTY))
  .map(f => relative(SRC, f));
export const OAUTH2_FILE = 'third_party/apps-script-oauth2/OAuth2.gs';

export const readSrc = f => readFileSync(join(SRC, f), 'utf8');
export const sha256 = f =>
  createHash('sha256')
    .update(readFileSync(join(SRC, f)))
    .digest('hex');
export const manifest = JSON.parse(readSrc('appsscript.json'));

/**
 * Source with comments removed, so a word in a comment cannot fail or pass a
 * check. A line comment starts at `//` NOT preceded by `:`, so the `//` in
 * "https://" is code, not a comment.
 */
export const stripComments = src =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Top-level `function X` / `var X` names declared by one source file. */
export const topLevelNames = src =>
  [...src.matchAll(/^(?:function|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);

/**
 * Loads our .gs files into one fresh context with the given globals.
 * Throws with the file name if one does not parse.
 */
export function loadProject(globals = {}, files = OWN_FILES) {
  const ctx = createContext({console, ...globals});
  for (const f of files) runInContext(readSrc(f), ctx, {filename: f});
  return ctx;
}

/**
 * One named assertion = one node:test test, so every property shows as its
 * own TAP line, as the self-running suites printed one `ok` line each.
 */
export const check = (name, cond, detail = '') =>
  test(name, () => assert.ok(cond, detail || undefined));

/**
 * CardService as a recording stub: every call returns the stub and is logged
 * in `calls`, so a card can be BUILT off Google's servers and its text read.
 */
export function recordingCardService() {
  const calls = [];
  const stub = new Proxy(function () {}, {
    get: (_t, k) =>
      k === 'then'
        ? undefined
        : (...args) => {
            calls.push([k, args]);
            return stub;
          },
  });
  return {stub, calls};
}

/** A Properties store backed by a Map. */
export function propertyStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    map: m,
    getProperty: k => (m.has(k) ? m.get(k) : null),
    setProperty(k, v) {
      m.set(k, String(v));
      return this;
    },
    deleteProperty(k) {
      m.delete(k);
      return this;
    },
  };
}

/**
 * The OAuth2 library, faked at its public surface: the step only calls
 * createService(...) and chains setters, then hasAccess / getAccessToken /
 * getAuthorizationUrl / reset / handleCallback.
 */
export function fakeOAuth2({hasAccess = false} = {}) {
  const state = {hasAccess, resets: 0, token: 'jr-access-token'};
  const service = new Proxy(
    {},
    {
      get: (_t, k) => {
        if (k === 'hasAccess') return () => state.hasAccess;
        if (k === 'getAccessToken') return () => state.token;
        if (k === 'getAuthorizationUrl')
          return () => 'https://jsonresume.org/oauth/authorize?x';
        if (k === 'reset')
          return () => {
            state.resets++;
            state.hasAccess = false;
          };
        return () => service;
      },
    }
  );
  return {state, OAuth2: {createService: () => service}};
}

/**
 * AddOnsResponseService as a fake whose build() yields the workflow action:
 * {kind: 'outputs', map: {id: {values: [...]}}} or
 * {kind: 'error', message, actionability, retryability}.
 */
export function fakeAddOnsResponseService() {
  const self = obj => obj;
  return {
    ErrorActionability: {
      ACTIONABLE: 'ACTIONABLE',
      NOT_ACTIONABLE: 'NOT_ACTIONABLE',
    },
    ErrorRetryability: {
      RETRYABLE: 'RETRYABLE',
      NOT_RETRYABLE: 'NOT_RETRYABLE',
    },
    newAction: () => {
      const a = {modifications: []};
      a.addModifyCard = m => {
        a.modifications.push(m);
        return a;
      };
      return a;
    },
    newModifyCard: () => {
      const m = {};
      m.setReplaceSection = section => {
        m.replaceSection = section;
        return m;
      };
      return m;
    },
    newVariableData: () => {
      const d = {values: []};
      d.addStringValue = v => {
        d.values.push(v);
        return d;
      };
      d.addEmailAddress = v => {
        d.type = 'EMAIL_ADDRESS';
        d.values.push(v);
        return d;
      };
      return d;
    },
    newReturnOutputVariablesAction: () => {
      const a = self({kind: 'outputs'});
      a.setVariableDataMap = m => {
        a.map = m;
        return a;
      };
      return a;
    },
    newReturnElementErrorAction: () => {
      const a = self({kind: 'error'});
      a.setErrorLog = f => {
        a.message = f.text;
        return a;
      };
      a.setErrorActionability = x => {
        a.actionability = x;
        return a;
      };
      a.setErrorRetryability = x => {
        a.retryability = x;
        return a;
      };
      return a;
    },
    newWorkflowTextFormat: () => {
      const f = {text: ''};
      f.addTextFormatElement = e => {
        f.text += e.text;
        return f;
      };
      return f;
    },
    newTextFormatElement: () => {
      const e = {};
      e.setText = t => {
        e.text = t;
        return e;
      };
      return e;
    },
    newHostAppAction: () => {
      const h = {};
      h.setWorkflowAction = w => {
        h.workflow = w;
        return h;
      };
      return h;
    },
    newRenderActionBuilder: () => {
      const b = {};
      b.setHostAppAction = h => {
        b.host = h;
        return b;
      };
      b.setAction = a => {
        b.action = a;
        return b;
      };
      b.build = () =>
        b.host ? b.host.workflow : {kind: 'action', action: b.action};
      return b;
    },
  };
}

/**
 * THE REAL PAYLOAD, captured from a live run on 2026-09-30 (Apps Script
 * Executions, onExecuteLoadJsonResume, 0.91 s, Completed). Every key and
 * nesting level is verbatim; only the URL value is generalised. The
 * `resumeUrl` input is historical (the step had a URL field then); what this
 * pins is the SHAPE: inputs[id].stringValues[0] under
 * workflow.actionInvocation, and no formInputs in commonEventObject.
 *
 * Two fields no documentation mentions: `triggerId` on the actionInvocation,
 * and `hostApp` appearing TWICE with different values.
 */
export const LIVE_EVENT = Object.freeze({
  clientPlatform: 'web',
  commonEventObject: {platform: 'WEB', hostApp: 'WORKFLOW'},
  workflow: {
    triggerEventSource: 'TRIGGER_EVENT_SOURCE_AUTOMATED',
    actionInvocation: {
      triggerId: '00000000-0000-0000-0000-000000000000',
      inputs: {resumeUrl: {stringValues: ['https://example.com/resume.json']}},
    },
    executionMetadata: {},
  },
  hostApp: 'flows',
});

/** A live-shaped event carrying the given STRING inputs. */
export const eventWith = inputs => ({
  ...LIVE_EVENT,
  workflow: {
    ...LIVE_EVENT.workflow,
    actionInvocation: {
      ...LIVE_EVENT.workflow.actionInvocation,
      inputs: Object.fromEntries(
        Object.entries(inputs).map(([k, v]) => [k, {stringValues: [v]}])
      ),
    },
  },
});

/**
 * Real résumés from the public registry, fetched once. Each entry is
 * {who, resume} or {who, skip: reason}; offline, every entry is a skip.
 */
export async function registryResumes(people = ['thomasdavis', 'jsonresume']) {
  const out = [];
  for (const who of people) {
    try {
      const r = await fetch(`https://registry.jsonresume.org/${who}.json`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) out.push({who, skip: `HTTP ${r.status}`});
      else out.push({who, resume: await r.json()});
    } catch (e) {
      out.push({who, skip: e.message});
    }
  }
  return out;
}

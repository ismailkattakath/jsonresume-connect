/**
 * ESLint flat config.
 *
 * Google style, reused rather than retyped: the rule list comes from
 * eslint-config-google, the config Google publishes for its JavaScript style
 * guide. Its last release (0.14.0, 2019) predates ESLint 9 and crashes ESLint
 * 10 as shipped ('Could not find "valid-jsdoc"'): 2 of its 65 rules were
 * removed from ESLint (valid-jsdoc, require-jsdoc) and are dropped here.
 * Formatting is Prettier's job, so eslint-config-prettier switches off the
 * formatting rules last. (gts, Google's maintained style tool, is
 * TypeScript-first and carries a TypeScript toolchain this project does not
 * use.)
 */

import {readFileSync, readdirSync} from 'node:fs';
import js from '@eslint/js';
import google from 'eslint-config-google';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const REMOVED_FROM_ESLINT = ['valid-jsdoc', 'require-jsdoc'];
const googleRules = Object.fromEntries(
  Object.entries(google.rules).filter(([k]) => !REMOVED_FROM_ESLINT.includes(k))
);

/**
 * Apps Script globals the add-on uses. Hand-listed because no maintained
 * source covers them: neither eslint-plugin-googleappsscript (1.0.5, 2023) nor
 * @types/google-apps-script (2.0.13) declares AddOnsResponseService, the
 * Workspace Studio response builder (checked 2026-10-27). OAuth2 is the
 * vendored library in src/third_party.
 */
const APPS_SCRIPT = [
  'AddOnsResponseService',
  'CacheService',
  'CardService',
  'HtmlService',
  'LockService',
  'OAuth2',
  'PropertiesService',
  'ScriptApp',
  'UrlFetchApp',
  'Utilities',
];

/**
 * Apps Script loads every .gs file into ONE global scope, so a function in
 * one file is a global in the others. The names are read from the source
 * (top-level `function`/`var`), so the list cannot drift from the code.
 */
const ownGs = readdirSync('src')
  .filter(f => f.endsWith('.gs'))
  .map(f => readFileSync(`src/${f}`, 'utf8'));
const crossFile = ownGs.flatMap(src =>
  [...src.matchAll(/^(?:function|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
);
const readonly = names => Object.fromEntries(names.map(n => [n, 'readonly']));

export default [
  {ignores: ['node_modules/', 'src/third_party/']},
  js.configs.recommended,
  {rules: googleRules},
  {
    rules: {
      // Google's own setting is {args: 'none'}, written when ESLint ignored
      // catch bindings by default; ESLint 9 changed that default to 'all'.
      'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none'}],
    },
  },
  {
    files: ['src/**/*.gs'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2020,
      globals: {
        ...readonly(['console']),
        ...readonly(APPS_SCRIPT),
        ...readonly(crossFile),
      },
    },
    rules: {
      // Top-level `var` on purpose: the tests read globals off a node:vm
      // context, where top-level const/let do not become properties (see
      // test/helpers.mjs), and Apps Script shares them across files either way.
      'no-var': 'off',
      'prefer-const': 'off',
      // Every top-level function is a callback the manifest or a card names
      // by string, or a global another file uses: unused in its own file.
      'no-unused-vars': [
        'error',
        {vars: 'local', args: 'none', caughtErrors: 'none'},
      ],
      // A name is declared once in its file and read as a global in the
      // others; the cross-file globals above include the file's own names.
      'no-redeclare': ['error', {builtinGlobals: false}],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: globals.node,
    },
  },
  prettier,
];

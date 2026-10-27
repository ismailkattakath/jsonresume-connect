/**
 * Real résumés from the public JSON Resume registry, rather than fixtures
 * written to match the code. Network-dependent: each résumé that cannot be
 * fetched (offline, or the registry returns an error) is a node:test SKIP,
 * never a pass and never a failure.
 */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadProject, registryResumes} from './helpers.mjs';

const ctx = loadProject();

for (const {who, resume, skip} of await registryResumes()) {
  const opts = skip ? {skip: `registry/${who}: ${skip}`} : {};

  test(`registry/${who}: recognised as a resume`, opts, () => {
    assert.equal(ctx.hasAnyKnownSection(resume), true);
  });
  test(`registry/${who}: flattens to non-trivial text`, opts, () => {
    assert.ok(ctx.toPlainText(resume).length > 300);
  });
  test(`registry/${who}: no undefined/null leaked into the text`, opts, () => {
    const text = ctx.toPlainText(resume);
    assert.ok(!text.includes('undefined') && !text.includes('null'));
  });
  test(`registry/${who}: name appears in the text when present`, opts, () => {
    assert.ok(!resume.basics?.name || ctx.toPlainText(resume).includes(resume.basics.name));
  });
  test(`registry/${who}: no run of blank lines`, opts, () => {
    assert.ok(!/\n{3,}/.test(ctx.toPlainText(resume)));
  });
  test(`registry/${who}: renders non-trivial HTML`, opts, () => {
    assert.ok(ctx.resumeToHtml(resume).length > 1000);
  });
  test(`registry/${who}: no undefined/null leaked into the HTML`, opts, () => {
    assert.ok(!/undefined|>null</.test(ctx.resumeToHtml(resume)));
  });
  test(`registry/${who}: name is present in the HTML`, opts, () => {
    assert.ok(
      !resume.basics?.name || ctx.resumeToHtml(resume).includes(ctx.escapeHtml(resume.basics.name))
    );
  });
  test(`registry/${who}: no script tag`, opts, () => {
    assert.ok(!/<script/i.test(ctx.resumeToHtml(resume)));
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVerdict, pointsFor } from '../src/prompts.js';

test('parses a well-formed grade', () => {
  const r = parseVerdict('VERDICT: PARTIAL\nFEEDBACK: Close! It happens in the stroma.');
  assert.equal(r.verdict, 'PARTIAL');
  assert.match(r.feedback, /stroma/);
});

test('INCORRECT is not mistaken for CORRECT', () => {
  assert.equal(parseVerdict('VERDICT: INCORRECT\nFEEDBACK: No.').verdict, 'INCORRECT');
});

test('falls back to UNKNOWN when the model ignores the format', () => {
  const r = parseVerdict('Sure, here is my thinking.');
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(pointsFor(r.verdict), 0);
});

test('scoring', () => {
  assert.equal(pointsFor('CORRECT'), 1);
  assert.equal(pointsFor('PARTIAL'), 0.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { splitIntoChunks, shuffle } from '../src/notes.js';

test('headings merge into the paragraph that follows', () => {
  const text = `# Title\n\n${'word '.repeat(60)}`;
  const chunks = splitIntoChunks(text);
  assert.equal(chunks.length, 1);
  assert.match(chunks[0], /^# Title word/);
});

test('long paragraphs are split on sentence boundaries', () => {
  const sentence = 'This is a sentence about something. ';
  const chunks = splitIntoChunks(sentence.repeat(60), { maxChars: 400 });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 400));
});

test('empty input gives no chunks', () => {
  assert.deepEqual(splitIntoChunks('  \n\n  '), []);
});

test('shuffle keeps every element', () => {
  const out = shuffle([1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

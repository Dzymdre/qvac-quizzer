import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const NOTE_EXTS = new Set(['.md', '.txt']);

function splitLong(paragraph, maxChars) {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const out = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && buf.length + s.length + 1 > maxChars) {
      out.push(buf);
      buf = '';
    }
    buf = buf ? `${buf} ${s}` : s;
  }
  if (buf) out.push(buf);
  return out;
}

/** Split raw note text into study-sized passages (paragraph-aware). */
export function splitIntoChunks(text, { minChars = 200, maxChars = 900 } = {}) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap((p) => splitLong(p, maxChars));

  const chunks = [];
  let buf = '';
  const flush = () => {
    if (buf) chunks.push(buf);
    buf = '';
  };
  for (const p of paragraphs) {
    if (buf && buf.length + p.length + 1 > maxChars) flush();
    buf = buf ? `${buf} ${p}` : p;
    if (buf.length >= minChars) flush();
  }
  flush();
  return chunks;
}

/** Read every .md/.txt file in a folder into [{ source, text }] passages. */
export async function loadNotes(dir) {
  const files = (await readdir(dir)).filter((f) => NOTE_EXTS.has(extname(f))).sort();
  const passages = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    for (const text of splitIntoChunks(raw)) passages.push({ source: file, text });
  }
  if (passages.length === 0) throw new Error(`No .md or .txt notes found in ${dir}`);
  return passages;
}

export function shuffle(items, rand = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

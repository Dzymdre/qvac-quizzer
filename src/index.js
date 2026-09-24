#!/usr/bin/env node
import readline from 'node:readline/promises';
import {
  loadModel,
  unloadModel,
  completion,
  ragIngest,
  ragSearch,
  ragDeleteWorkspace,
  ragCloseWorkspace
} from '@qvac/sdk';
import * as sdk from '@qvac/sdk'; // used only to look up model constants by name
import { loadNotes, shuffle } from './notes.js';
import { questionPrompt, gradePrompt, askPrompt, parseVerdict, pointsFor } from './prompts.js';

const WORKSPACE = 'qvac-quizzer';
const LLM_NAME = process.env.QVAC_LLM || 'LLAMA_3_2_1B_INST_Q4_0';
const EMBED_NAME = process.env.QVAC_EMBED || 'GTE_LARGE_FP16';

function parseArgs(argv) {
  const opts = { dir: './notes', topic: null, rounds: 5 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--topic') opts.topic = argv[++i];
    else if (argv[i] === '--rounds') opts.rounds = Math.max(1, Number(argv[++i]) || 5);
    else opts.dir = argv[i];
  }
  return opts;
}

const progress = (label) => (p) => {
  const line = `▸ ${label} ${p.percentage.toFixed(0)}%`;
  process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
  if (p.percentage >= 100) process.stderr.write('\n');
};

/** Run the on-device LLM and stream tokens to the terminal. Returns the full text. */
async function generate(modelId, history, { echo = true } = {}) {
  const run = completion({ modelId, history, stream: true });
  let text = '';
  for await (const event of run.events) {
    if (event.type === 'contentDelta') {
      text += event.text;
      if (echo) process.stdout.write(event.text);
    }
  }
  await run.final;
  if (echo) process.stdout.write('\n');
  return text.trim();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const llmSrc = sdk[LLM_NAME];
  const embedSrc = sdk[EMBED_NAME];
  if (!llmSrc || !embedSrc) throw new Error(`Unknown model constant: ${!llmSrc ? LLM_NAME : EMBED_NAME}`);

  const passages = await loadNotes(opts.dir);
  const sourceOf = new Map(passages.map((p) => [p.text, p.source]));
  console.log(`▸ ${passages.length} passages from ${new Set(passages.map((p) => p.source)).size} note file(s)`);

  const embedId = await loadModel({ modelSrc: embedSrc, onProgress: progress('Embedding model') });
  const llmId = await loadModel({ modelSrc: llmSrc, onProgress: progress('Language model') });

  try { await ragDeleteWorkspace({ workspace: WORKSPACE }); } catch { /* first run */ }
  await ragIngest({
    modelId: embedId,
    workspace: WORKSPACE,
    documents: passages.map((p) => p.text),
    chunk: false
  });

  let pool = passages.map((p) => p.text);
  if (opts.topic) {
    const hits = await ragSearch({ modelId: embedId, workspace: WORKSPACE, query: opts.topic, topK: 8 });
    if (hits.length) pool = hits.map((h) => h.content);
    console.log(`▸ Focusing on "${opts.topic}" (${pool.length} passages)`);
  }
  const rounds = shuffle(pool).slice(0, opts.rounds);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = async (q) => { try { return (await rl.question(q)).trim(); } catch { return null; } };
  console.log('\nCommands: /ask <question> · /skip · /quit\n');

  let score = 0, asked = 0;
  const missed = [];

  for (const passage of rounds) {
    process.stdout.write(`\nQ${asked + 1}: `);
    const question = await generate(llmId, questionPrompt(passage));

    let answer;
    for (;;) {
      answer = await prompt('\nYour answer › ');
      if (answer && answer.startsWith('/ask ')) {
        const hits = await ragSearch({ modelId: embedId, workspace: WORKSPACE, query: answer.slice(5), topK: 3 });
        process.stdout.write('\n');
        await generate(llmId, askPrompt(hits.map((h) => h.content), answer.slice(5)));
        continue;
      }
      break;
    }
    if (answer === null || answer === '/quit') break;
    if (answer === '/skip' || answer === '') continue;

    asked++;
    process.stdout.write('\nGrading… ');
    const graded = parseVerdict(await generate(llmId, gradePrompt(passage, question, answer), { echo: false }));
    console.log(`${graded.verdict}\n${graded.feedback}`);
    score += pointsFor(graded.verdict);
    if (graded.verdict !== 'CORRECT') missed.push({ question, passage });
  }
  rl.close();

  console.log(`\n=== Score: ${score}/${asked} ===`);
  if (missed.length) {
    console.log('\nReview these:');
    for (const m of missed) console.log(`• ${m.question}\n  (${sourceOf.get(m.passage) ?? 'notes'})`);
  }

  await ragCloseWorkspace({ workspace: WORKSPACE, deleteOnClose: true });
  await unloadModel({ modelId: llmId });
  await unloadModel({ modelId: embedId });
}

main().catch((err) => {
  console.error('✖', err);
  process.exit(1);
});

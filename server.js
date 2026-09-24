import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadModel,
  unloadModel,
  completion,
  ragIngest,
  ragSearch,
  ragDeleteWorkspace,
  ragCloseWorkspace
} from '@qvac/sdk';

import * as sdk from '@qvac/sdk';
import { loadNotes, shuffle } from './src/notes.js';
import {
  gradePrompt,
  askPrompt,
  parseVerdict,
  pointsFor
} from './src/prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const WORKSPACE = 'qvac-quizzer-web';

const LLM_NAME =
  process.env.QVAC_LLM || 'LLAMA_3_2_1B_INST_Q4_0';

const EMBED_NAME =
  process.env.QVAC_EMBED || 'GTE_LARGE_FP16';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let llmId = null;
let embedId = null;
let passages = [];
let sourceOf = new Map();

let quiz = [];
let currentIndex = 0;
let currentQuestion = '';

let score = 0;
let asked = 0;
let missed = [];

let ready = false;
let loading = false;

function progress(label) {
  return (p) => {
    console.log(`${label}: ${p.percentage.toFixed(0)}%`);
  };
}

async function generate(modelId, history) {
  const run = completion({
    modelId,
    history,
    stream: true
  });

  let text = '';

  for await (const event of run.events) {
    if (event.type === 'contentDelta') {
      text += event.text;
    }
  }

  await run.final;

  return text.trim();
}

/*
  Generate a question directly from one passage.

  The prompt is intentionally strict because small local models
  sometimes create vague questions such as:
  "What is an object?"
*/
async function generateQuestion(passage, attempt = 0) {
  const retryInstruction =
    attempt > 0
      ? `
IMPORTANT:
Your previous question was too vague.

Do NOT ask about generic words such as:
- object
- thing
- item
- concept
- term
- information

Ask about a specific fact, process, definition, cause,
effect, example, or relationship that is clearly present
in the passage.
`
      : '';

  const history = [
    {
      role: 'system',
      content: `
You are a quiz question generator.

Your job is to create ONE useful study question from the
provided study passage.

RULES:
1. The answer MUST be found directly in the passage.
2. Ask about a SPECIFIC fact or idea from the passage.
3. Do not invent information.
4. Do not use information outside the passage.
5. Do not ask vague questions.
6. Never ask questions such as:
   "What is an object?"
   "What is a thing?"
   "What is an item?"
   "What is a concept?"
7. Prefer questions about definitions, processes, causes,
   effects, examples, functions, or important facts.
8. Return ONLY the question.
9. Do not provide the answer.
10. Do not add explanations, labels, or quotation marks.
      `
    },
    {
      role: 'user',
      content: `
Study passage:

${passage.text}

${retryInstruction}

Create ONE specific question that can be answered using
only this passage.
      `
    }
  ];

  let question = await generate(llmId, history);

  question = question
    .replace(/^question\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  /*
    Reject obviously vague questions and try again.
  */
  const vagueQuestion =
    /^(what|who|where|when|why|how)\s+(is|are|was|were)\s+(an?\s+)?(object|thing|item|concept|term|information)\??$/i;

  if (
    vagueQuestion.test(question) ||
    question.length < 15
  ) {
    if (attempt < 2) {
      return generateQuestion(passage, attempt + 1);
    }

    /*
      Final fallback.
      This is better than displaying a meaningless question.
    */
    return `According to the passage, what is one important fact about ${passage.source}?`;
  }

  return question;
}

async function initialize() {
  if (ready || loading) return;

  loading = true;

  try {
    console.log('Loading QVAC models...');

    const llmSrc = sdk[LLM_NAME];
    const embedSrc = sdk[EMBED_NAME];

    if (!llmSrc || !embedSrc) {
      throw new Error(
        `Unknown model constant: ${
          !llmSrc ? LLM_NAME : EMBED_NAME
        }`
      );
    }

    passages = await loadNotes('./notes');

    sourceOf = new Map(
      passages.map((p) => [p.text, p.source])
    );

    console.log(
      `${passages.length} passages loaded from ${
        new Set(passages.map((p) => p.source)).size
      } note file(s).`
    );

    embedId = await loadModel({
      modelSrc: embedSrc,
      onProgress: progress('Embedding model')
    });

    llmId = await loadModel({
      modelSrc: llmSrc,
      onProgress: progress('Language model')
    });

    try {
      await ragDeleteWorkspace({
        workspace: WORKSPACE
      });
    } catch {
      // Workspace may not exist yet.
    }

    await ragIngest({
      modelId: embedId,
      workspace: WORKSPACE,
      documents: passages.map((p) => p.text),
      chunk: false
    });

    ready = true;

    console.log('QVAC is ready.');
  } catch (error) {
    console.error('QVAC initialization failed:', error);
    throw error;
  } finally {
    loading = false;
  }
}

async function makeQuestion() {
  if (!ready) {
    await initialize();
  }

  if (!quiz.length) {
    quiz = shuffle(passages).slice(0, 5);
    currentIndex = 0;
  }

  if (currentIndex >= quiz.length) {
    return null;
  }

  const passage = quiz[currentIndex];

  currentQuestion = await generateQuestion(passage);

  return {
    question: currentQuestion,
    number: currentIndex + 1,
    total: quiz.length
  };
}

app.get('/api/status', async (req, res) => {
  try {
    if (!ready) {
      await initialize();
    }

    res.json({
      ready: true,
      passages: passages.length,
      notes: new Set(passages.map((p) => p.source)).size
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/api/start', async (req, res) => {
  try {
    await initialize();

    quiz = shuffle(passages).slice(0, 5);
    currentIndex = 0;
    currentQuestion = '';

    score = 0;
    asked = 0;
    missed = [];

    const result = await makeQuestion();

    res.json({
      ...result,
      score,
      asked
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/api/answer', async (req, res) => {
  try {
    if (!ready) {
      await initialize();
    }

    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        error: 'Please enter an answer.'
      });
    }

    const passage = quiz[currentIndex];

    /*
      IMPORTANT:
      Use the exact question that was shown to the user.
      Do NOT generate another question here.
    */
    const question = currentQuestion;

    const gradedText = await generate(
      llmId,
      gradePrompt(
        passage,
        question,
        answer.trim()
      )
    );

    const graded = parseVerdict(gradedText);

    asked++;
    score += pointsFor(graded.verdict);

    if (graded.verdict !== 'CORRECT') {
      missed.push({
        question,
        source:
          sourceOf.get(passage.text) ?? 'notes'
      });
    }

    currentIndex++;

    let next = null;

    if (currentIndex < quiz.length) {
      const nextPassage = quiz[currentIndex];

      currentQuestion =
        await generateQuestion(nextPassage);

      next = {
        question: currentQuestion,
        number: currentIndex + 1,
        total: quiz.length
      };
    }

    res.json({
      verdict: graded.verdict,
      feedback: graded.feedback,
      score,
      asked,
      next,
      finished: !next,
      missed
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    if (!ready) {
      await initialize();
    }

    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: 'Enter a question.'
      });
    }

    const hits = await ragSearch({
      modelId: embedId,
      workspace: WORKSPACE,
      query: question.trim(),
      topK: 3
    });

    const answer = await generate(
      llmId,
      askPrompt(
        hits.map((h) => h.content),
        question.trim()
      )
    );

    res.json({
      answer
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/api/reset', async (req, res) => {
  quiz = [];
  currentIndex = 0;
  currentQuestion = '';

  score = 0;
  asked = 0;
  missed = [];

  res.json({
    success: true
  });
});

async function shutdown() {
  console.log('\nShutting down QVAC...');

  try {
    if (ready) {
      await ragCloseWorkspace({
        workspace: WORKSPACE,
        deleteOnClose: true
      });
    }

    if (llmId) {
      await unloadModel({
        modelId: llmId
      });
    }

    if (embedId) {
      await unloadModel({
        modelId: embedId
      });
    }
  } catch (error) {
    console.error('Shutdown error:', error);
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('======================================');
  console.log('       QVAC QUIZZER WEB APP');
  console.log('======================================');
  console.log('');
  console.log(`Open http://localhost:${PORT}`);
  console.log('');
  console.log('AI inference runs locally through QVAC.');
  console.log('');
});
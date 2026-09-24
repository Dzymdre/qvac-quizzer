# qvac-quizzer

Quiz yourself from your own notes, **entirely on-device**. No API key, no server, and your notes never leave your machine.

Built with the [QVAC SDK](https://github.com/tetherto/qvac) (`@qvac/sdk` **0.20.x**, requires ≥ 0.19.0).

## What it does

1. Reads every `.md` / `.txt` file in a notes folder and splits it into passages.
2. Embeds the passages into a local vector store (`ragIngest`).
3. Picks passages, has a local LLM write a question about each (`completion`), and grades your typed answer against the source passage.
4. Prints a score and tells you which note file to re-read for anything you missed.

While answering, type `/ask <question>` to search your notes (`ragSearch`) and get a grounded answer from the local model.

## QVAC functions used

`loadModel`, `completion`, `ragIngest`, `ragSearch`, `ragCloseWorkspace`, `ragDeleteWorkspace`, `unloadModel`

Models (downloaded automatically on first run, then cached):
`LLAMA_3_2_1B_INST_Q4_0` (questions and grading) and `GTE_LARGE_FP16` (embeddings).

## Install

Requires Node.js >= 22.17.

```bash
git clone https://github.com/dzymdre/qvac-quizzer.git
cd qvac-quizzer
npm install
```

## Run

```bash
npm start                              # quiz from ./notes (sample notes included)
npm start -- ~/my-notes                # your own folder of .md/.txt files
npm start -- ~/my-notes --topic "calvin cycle" --rounds 3
```

The first run downloads the two models. After that it works fully offline.

Use a larger model by setting any LLM constant exported by the SDK:

```bash
QVAC_LLM=<CONSTANT_NAME> npm start
```

## Test

```bash
npm test     # offline unit tests for chunking, prompt parsing and scoring
```

## SDK version

Developed against `@qvac/sdk` `^0.20.0` (Node.js v22).

## License

MIT

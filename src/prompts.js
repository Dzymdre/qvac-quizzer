export function questionPrompt(passage) {
  return [
    {
      role: 'system',
      content:
        'You are a study coach. Write exactly ONE clear question that can be answered using only the passage. Output the question and nothing else.'
    },
    { role: 'user', content: `Passage:\n${passage}` }
  ];
}

export function gradePrompt(passage, question, answer) {
  return [
    {
      role: 'system',
      content:
        'You grade a student answer strictly against the passage. Reply in exactly two lines:\n' +
        'VERDICT: CORRECT or PARTIAL or INCORRECT\n' +
        'FEEDBACK: one or two encouraging sentences that state the right answer.'
    },
    {
      role: 'user',
      content: `Passage:\n${passage}\n\nQuestion: ${question}\n\nStudent answer: ${answer}`
    }
  ];
}

export function askPrompt(passages, question) {
  const context = passages.map((p, i) => `[${i + 1}] ${p}`).join('\n\n');
  return [
    {
      role: 'system',
      content:
        "Answer the question using only the student's notes below. If the notes do not contain the answer, say so.\n\n" +
        context
    },
    { role: 'user', content: question }
  ];
}

export function parseVerdict(text) {
  const v = /VERDICT:\s*(CORRECT|PARTIAL|INCORRECT)/i.exec(text);
  const f = /FEEDBACK:\s*([\s\S]+)/i.exec(text);
  return {
    verdict: v ? v[1].toUpperCase() : 'UNKNOWN',
    feedback: (f ? f[1] : text).trim()
  };
}

export const pointsFor = (verdict) =>
  verdict === 'CORRECT' ? 1 : verdict === 'PARTIAL' ? 0.5 : 0;

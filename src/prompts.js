export function questionPrompt(passage) {
  return [
    {
      role: 'system',
      content: `
You are a careful study quiz generator.

Create exactly ONE clear question from the passage.

Rules:
- The answer must be directly supported by the passage.
- Ask about ONE specific fact or idea.
- Do not combine multiple topics in one question.
- Do not ask vague questions.
- Do not ask about words such as "object", "thing", or "item".
- Do not add information that is not in the passage.
- The question must have a short, clear answer.
- Output ONLY the question.
      `.trim()
    },
    {
      role: 'user',
      content: `PASSAGE:
${passage}`
    }
  ];
}

export function gradePrompt(passage, question, answer) {
  return [
    {
      role: 'system',
      content: `
You are a careful teacher grading a student's answer.

Use BOTH the question and the passage.

IMPORTANT:
- First determine exactly what the question is asking.
- Find the answer to THAT question in the passage.
- Compare the student's answer with that answer.
- Do not change the question.
- Do not invent a different question.
- Do not give an answer to a different topic.
- If the student's answer has the correct meaning, mark it CORRECT even if the wording is different.
- If the answer contains some correct information but is incomplete, mark it PARTIAL.
- If the answer does not answer the question, mark it INCORRECT.
- Only use information supported by the passage.

Reply in exactly these two lines:

VERDICT: CORRECT
or
VERDICT: PARTIAL
or
VERDICT: INCORRECT

FEEDBACK: Briefly explain why the answer is correct, partial, or incorrect. If incorrect or partial, state the answer that the passage supports.
      `.trim()
    },
    {
      role: 'user',
      content: `
PASSAGE:
${passage}

QUESTION:
${question}

STUDENT ANSWER:
${answer}
      `
    }
  ];
}

export function askPrompt(passages, question) {
  const context = passages
    .map((p, i) => `[${i + 1}] ${p}`)
    .join('\n\n');

  return [
    {
      role: 'system',
      content: `
Answer the user's question using ONLY the student's notes below.

Rules:
- Do not invent information.
- Keep the answer clear and concise.
- If the notes do not contain enough information, say:
"The notes do not contain enough information to answer that."
      `.trim() +
      `\n\n${context}`
    },
    {
      role: 'user',
      content: question
    }
  ];
}

export function parseVerdict(text) {
  const v =
    /VERDICT:\s*(CORRECT|PARTIAL|INCORRECT)/i.exec(text);

  const f =
    /FEEDBACK:\s*([\s\S]+)/i.exec(text);

  return {
    verdict: v
      ? v[1].toUpperCase()
      : 'UNKNOWN',

    feedback:
      (f ? f[1] : text).trim()
  };
}

export const pointsFor = (verdict) =>
  verdict === 'CORRECT'
    ? 1
    : verdict === 'PARTIAL'
      ? 0.5
      : 0;
const home = document.getElementById("home");
const quiz = document.getElementById("quiz");
const finished = document.getElementById("finished");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const loading = document.getElementById("loading");
const grading = document.getElementById("grading");

const questionNumber = document.getElementById("questionNumber");
const question = document.getElementById("question");
const answer = document.getElementById("answer");

const submitBtn = document.getElementById("submitBtn");

const scoreElement = document.getElementById("score");
const progressBar = document.getElementById("progressBar");

const result = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultIcon = document.getElementById("resultIcon");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");

const finalScore = document.getElementById("finalScore");
const missed = document.getElementById("missed");

const askInput = document.getElementById("askInput");
const askBtn = document.getElementById("askBtn");
const askLoading = document.getElementById("askLoading");
const askAnswer = document.getElementById("askAnswer");

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function setQuestion(data) {
  question.textContent = data.question;

  questionNumber.textContent =
    `Question ${data.number} of ${data.total}`;

  const percent =
    ((data.number - 1) / data.total) * 100;

  progressBar.style.width =
    `${Math.max(5, percent)}%`;

  answer.value = "";

  hide(result);

  answer.focus();
}

async function startQuiz() {
  startBtn.disabled = true;
  show(loading);

  try {
    const response = await fetch("/api/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to start quiz.");
    }

    scoreElement.textContent = data.score;

    hide(home);
    show(quiz);

    setQuestion(data);
  } catch (error) {
    alert(`Could not start quiz:\n${error.message}`);
  } finally {
    hide(loading);
    startBtn.disabled = false;
  }
}

async function submitAnswer() {
  const value = answer.value.trim();

  if (!value) {
    alert("Please enter an answer first.");
    answer.focus();
    return;
  }

  submitBtn.disabled = true;
  show(grading);

  try {
    const response = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        answer: value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to grade answer.");
    }

    scoreElement.textContent = data.score;

    resultTitle.textContent = data.verdict;
    feedback.textContent = data.feedback;

    if (data.verdict === "CORRECT") {
      resultIcon.textContent = "✓";
    } else {
      resultIcon.textContent = "!";
    }

    show(result);

    if (data.finished) {
      nextBtn.textContent = "See Final Score";

      nextBtn.onclick = function () {
        showFinished(data);
      };
    } else {
      nextBtn.textContent = "Next Question";

      nextBtn.onclick = function () {
        setQuestion(data.next);
      };
    }
  } catch (error) {
    alert(`Could not grade answer:\n${error.message}`);
  } finally {
    hide(grading);
    submitBtn.disabled = false;
  }
}

function showFinished(data) {
  hide(quiz);
  show(finished);

  finalScore.textContent =
    `${data.score}/${data.asked}`;

  missed.innerHTML = "";

  if (!data.missed || data.missed.length === 0) {
    missed.innerHTML =
      '<div class="missed-item">🎯 Perfect score! Nothing to review.</div>';

    return;
  }

  const title = document.createElement("h3");
  title.textContent = "Review these:";

  missed.appendChild(title);

  for (const item of data.missed) {
    const div = document.createElement("div");

    div.className = "missed-item";

    div.textContent =
      `${item.question} — ${item.source}`;

    missed.appendChild(div);
  }
}

async function restartQuiz() {
  try {
    await fetch("/api/reset", {
      method: "POST"
    });
  } catch (error) {
    // Ignore reset errors.
  }

  hide(finished);
  show(home);

  scoreElement.textContent = "0";
  progressBar.style.width = "5%";
}

async function askNotes() {
  const value = askInput.value.trim();

  if (!value) {
    return;
  }

  askBtn.disabled = true;

  show(askLoading);
  hide(askAnswer);

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to ask notes.");
    }

    askAnswer.textContent = data.answer;

    show(askAnswer);
  } catch (error) {
    askAnswer.textContent =
      `Error: ${error.message}`;

    show(askAnswer);
  } finally {
    hide(askLoading);
    askBtn.disabled = false;
  }
}

startBtn.addEventListener("click", startQuiz);

submitBtn.addEventListener("click", submitAnswer);

answer.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && event.ctrlKey) {
    submitAnswer();
  }
});

restartBtn.addEventListener("click", restartQuiz);

askBtn.addEventListener("click", askNotes);

askInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    askNotes();
  }
});

console.log("QVAC Quizzer app.js loaded successfully.");
# 🧠 QVAC Quizzer

Study smarter with your own notes.

**QVAC Quizzer** turns your study notes into interactive quizzes using local AI. It generates questions, grades your answers, and lets you ask questions about your notes.

## ✨ Features

* 🤖 **Local AI** — Powered by Tether's QVAC SDK
* 🔒 **Private** — Your notes stay on your device
* ⚡ **No API Key** — AI runs locally
* 📚 **Quiz Generation** — Generate questions from your notes
* ✅ **AI Grading** — Get feedback on your answers
* 🔎 **Ask Your Notes** — Search and ask questions about your study materials

## 🛠️ Built With

* JavaScript
* Node.js
* Express
* [QVAC SDK](https://github.com/tetherto/qvac-sdk)

## 🚀 Run Locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## 🧠 How QVAC Is Used

QVAC Quizzer uses QVAC's local LLM inference to generate quiz questions, grade answers, and answer questions from the user's notes. It also uses embeddings and RAG to retrieve relevant information from the notes.

## 📸 Demo

The app runs locally with AI output visible directly in the quiz interface.

## 🔗 Project

**GitHub Repository:**
https://github.com/Dzymdre/qvac-quizzer

## 💡 Why I Built It

I built QVAC Quizzer to make studying more interactive while keeping personal study notes private and processing AI locally on the device.

## 📄 License

MIT License

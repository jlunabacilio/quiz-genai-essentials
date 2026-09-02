# quiz-genai-essentials

An interactive quiz for the **Generative AI Essentials** training (EverythingOps CoE). Plain HTML/CSS/JS, no build step, no dependencies.

## Running it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## How it works

- Content mirrors the training's 6-day learning path: Gen AI Foundations, Prompting, Agents/MCP & Context, Skills & Agent Harness, Security & Guardrails, and Human in the Loop.
- Each day is a multiple-choice quiz with immediate feedback and an explanation per question.
- Score 70% or higher on a day to unlock the next one.
- Progress and best scores are saved in the browser's `localStorage` (per-browser, no backend).

## Project structure

```
index.html        # app shell
css/styles.css     # styling
js/data.js         # quiz content (6 days, 48 questions)
js/app.js          # rendering + quiz logic + progress tracking
```

## Extending it

`js/data.js` holds one array (`QUIZ_DAYS`), each entry a day with `title`, `subtitle`, and a `questions` array (`q`, `options`, `correct` index, `explanation`). Add a day or more questions there — the app picks them up automatically.

This is the first game mode; the data structure is meant to support adding other formats later (memory-match, ordering, categorization) without changing the quiz content.

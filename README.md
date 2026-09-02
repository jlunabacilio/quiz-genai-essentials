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
- A team leaderboard (per day + an overall tab) is backed by Firestore — see [Leaderboard setup](#leaderboard-setup) below. Without it configured, the app works exactly the same, just without the leaderboard.

## Project structure

```
index.html            # app shell
css/styles.css        # styling
js/data.js             # quiz content (6 days, 48 questions)
js/app.js               # rendering + quiz logic + progress tracking + leaderboard UI
js/firebase-config.js   # your Firebase project's public web config (see below)
js/firebase-init.js     # loads the Firebase SDK from CDN, exposes window.Leaderboard
firestore.rules         # security rules to paste into the Firebase console
```

## Leaderboard setup

The leaderboard uses **Firestore** (Firebase's free Spark plan easily covers a small team — see limits below). GitHub Pages only serves static files, so it can't run a backend itself; the browser talks to Firestore directly using the public web SDK.

### 1. Add your Firebase config

Open `js/firebase-config.js` and replace the placeholder values with your project's config, from:
**Firebase Console → ⚙️ Project settings → General → Your apps → your web app → SDK setup and configuration → "Config"**.

These values (`apiKey`, `authDomain`, etc.) are meant to be public and safe to commit — they identify your project to the client SDK, they are not secrets. Real access control comes from step 2.

### 2. Apply the security rules

In the Firebase Console, go to **Build → Firestore Database → Rules**, paste in the contents of [`firestore.rules`](./firestore.rules), and click **Publish**.

These rules let anyone read the `scores` collection (it's a public team leaderboard, no login system) but only accept a write that looks like a real quiz attempt (valid day/score bounds, a server-set timestamp) — and once written, an entry can never be edited or deleted, so no one can quietly rewrite another player's score. It's not tamper-proof against someone determined to fake a request, but that's an accepted tradeoff for a leaderboard with no login system.

### 3. Try it

Serve the site locally (`python3 -m http.server 8000` — the Firebase SDK is loaded as an ES module, which needs `http://`, not `file://`), complete a quiz, and enter a name when prompted. Open the **🏆 Leaderboard** button in the header — your entry should show up under that day's tab and under "Overall".

### Free tier limits (Spark plan, no credit card, can't incur charges)

- 50,000 reads/day, 20,000 writes/day, 1 GiB stored — far more than a training cohort will use; the app just stops accepting requests for the rest of the day if the (very unlikely) limit is ever hit, no billing risk.

### How scoring works

- Each finished quiz attempt is stored as one row: name, day, correct/total, and time taken.
- The **per-day** tab shows each person's best attempt for that day, ranked by most correct, then fastest time.
- The **Overall** tab sums each person's best attempt across every day they've completed, ranked the same way, with a "days completed" column.

## Extending it

`js/data.js` holds one array (`QUIZ_DAYS`), each entry a day with `title`, `subtitle`, and a `questions` array (`q`, `options`, `correct` index, `explanation`). Add a day or more questions there — the app picks them up automatically.

This is the first game mode; the data structure is meant to support adding other formats later (memory-match, ordering, categorization) without changing the quiz content.

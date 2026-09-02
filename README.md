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
- For a named player, the 2-attempt cap is enforced by Firestore, not just the browser — see [Admin panel](#admin-panel) below.

## Project structure

```
index.html                     # app shell
admin.html                     # admin dashboard shell (unlinked from the main app)
css/styles.css                 # styling
css/admin.css                  # admin dashboard-specific styling
js/data.js                     # quiz content (6 days, 48 questions)
js/app.js                      # rendering + quiz logic + progress tracking + leaderboard UI
js/admin.js                    # admin dashboard: sign in, reset attempts, rename/delete players
js/firebase-config.template.js # checked-in template — no real values, safe to commit
js/firebase-config.js          # your real Firebase config — git-ignored, never committed
js/firebase-init.js            # loads the Firebase SDK from CDN, exposes window.Leaderboard / window.Admin
firestore.rules                # security rules to paste into the Firebase console
.github/workflows/deploy.yml   # builds js/firebase-config.js from secrets and deploys to Pages
```

## Leaderboard setup

The leaderboard uses **Firestore** (Firebase's free Spark plan easily covers a small team — see limits below). GitHub Pages only serves static files, so it can't run a backend itself; the browser talks to Firestore directly using the public web SDK.

The Firebase web config values (`apiKey`, `authDomain`, etc.) are meant to be public — they identify your project to the client SDK, they are not secrets, and real access control comes from the security rules in step 2. That said, GitHub's push protection flags anything shaped like a Google API key as a potential leaked secret, so **the real config is never committed** — it's generated at deploy time from GitHub Actions secrets (see step 1) and kept out of git via `.gitignore`.

### 1. Add your Firebase config as GitHub Actions secrets

In the repo, go to **Settings → Secrets and variables → Actions → New repository secret**, and add each of these (values from **Firebase Console → ⚙️ Project settings → General → Your apps → your web app → SDK setup and configuration → "Config"**):

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

Then go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions** (not "Deploy from a branch") — that's what lets `.github/workflows/deploy.yml` publish the site.

On every push to `main`, the workflow copies `js/firebase-config.template.js` to `js/firebase-config.js`, substituting these secrets in, then deploys the result to Pages. That generated file only ever exists in the deploy artifact — it's never written back to the repository.

For local testing, copy the template yourself and fill in real values — this local copy is git-ignored, so it stays on your machine only:

```bash
cp js/firebase-config.template.js js/firebase-config.js
# then edit js/firebase-config.js and replace the __PLACEHOLDER__ values
```

### 2. Apply the security rules

In the Firebase Console, go to **Build → Firestore Database → Rules**, paste in the contents of [`firestore.rules`](./firestore.rules), and click **Publish**. If you set this up before names were unique, re-paste and re-publish — the file now also covers a second collection (see below).

These rules let anyone read the `scores` collection (it's a public team leaderboard, no login system) but only accept a write that looks like a real quiz attempt (valid day/score bounds, a server-set timestamp) — and once written, an entry can never be edited or deleted, so no one can quietly rewrite another player's score. It's not tamper-proof against someone determined to fake a request, but that's an accepted tradeoff for a leaderboard with no login system.

**Names are unique.** A second collection, `players`, acts as a name registry: its document ID is the normalized (trimmed, lowercased) name, and the rules allow *creating* that document but never updating or deleting it. Firestore treats a write to an existing document ID as an update, not a create — so the first person to claim a name gets it, and every later attempt at that same name (even from two people submitting at nearly the same instant) is rejected by the server, not just by a client-side check. The name gate calls this before letting the quiz start; a taken name shows an inline "already taken" message and lets the player pick another.

This isn't identity verification — without a login system, nothing stops someone from claiming a name that isn't theirs, or a legitimate player from losing access to their name if they clear their browser storage (there's no way to "log back in" as a name once claimed by that browser). What it does guarantee is that only one browser can ever hold a given name at a time, so two different people can't both show up as "Ana" on the leaderboard.

### 3. Try it

Locally: serve the site (`python3 -m http.server 8000` — the Firebase SDK is loaded as an ES module, which needs `http://`, not `file://`) after creating your local `js/firebase-config.js` per step 1. In production: push to `main` and check the **Actions** tab for the deploy run. Either way, complete a quiz, enter a name when prompted, then open the **🏆 Leaderboard** button in the header — your entry should show up under that day's tab and under "Overall".

### Free tier limits (Spark plan, no credit card, can't incur charges)

- 50,000 reads/day, 20,000 writes/day, 1 GiB stored — far more than a training cohort will use; the app just stops accepting requests for the rest of the day if the (very unlikely) limit is ever hit, no billing risk.

### How scoring works

- Each finished quiz attempt is stored as one row: name, day, correct/total, and time taken.
- The **per-day** tab shows each person's best attempt for that day, ranked by most correct, then fastest time.
- The **Overall** tab sums each person's best attempt across every day they've completed, ranked the same way, with a "days completed" column.

## Admin panel

`admin.html` (not linked from the main app — go to it directly) lets one admin account reset a player's attempts, rename a player (updates their past leaderboard entries too), or delete a player entirely (removes their scores, attempts, and claimed name).

For a named player, Firestore's `attempts` collection is authoritative — the same server-side rules that cap a normal player at 2 attempts also mean only the admin account can move that count back down. This is why admin actions actually take effect on the affected player's own device: the app re-checks Firestore (not just the browser's local storage) whenever the menu loads for a named player, so a reset unlocks the day again next time they open the app, no matter whose browser it is.

### 1. Create the admin account

In the Firebase Console: **Build → Authentication → Sign-in method** → enable **Email/Password** (already done). Then **Build → Authentication → Users → Add user**, using `jlunab77@gmail.com` and a password you choose. That password is never in this repo — only you know it.

The admin email is hard-coded in two places, kept in sync: `ADMIN_EMAIL` in `js/firebase-init.js` and the `isAdmin()` function in `firestore.rules`. To change it or add a second admin, update both (in the rules, `request.auth.token.email == '...'` can become `request.auth.token.email in ['...', '...']`) and re-publish the rules.

### 2. Re-publish the security rules

`firestore.rules` changed again to add admin-only permissions (rename/delete on `players` and `scores`, reset on `attempts`) and the new `attempts` collection itself. Paste the current file into **Firestore Database → Rules → Publish**, same as before.

### 3. Use it

Open `admin.html` (locally or on your deployed Pages URL — e.g. `https://yourname.github.io/quiz-genai-essentials/admin.html`), sign in with the admin account, and you'll see every player who's claimed a name: their attempts used per day (with a "Reset" link when they've used any) and their best score per day, plus **Rename** and **Delete** actions. The page has `noindex` in its `<meta>` tags and isn't linked anywhere, but it isn't otherwise hidden — anyone who guesses the URL reaches the login form, they just can't get past it without the admin password.

### What this doesn't cover

Attempts are only Firestore-authoritative for a *named* player (someone who got through the name gate). If the leaderboard isn't configured, or someone skips it, their attempt cap is still purely local-storage-based, same as before this feature — an admin has nothing to reset there because nothing was ever recorded remotely.

## Extending it

`js/data.js` holds one array (`QUIZ_DAYS`), each entry a day with `title`, `subtitle`, and a `questions` array (`q`, `options`, `correct` index, `explanation`). Add a day or more questions there — the app picks them up automatically.

This is the first game mode; the data structure is meant to support adding other formats later (memory-match, ordering, categorization) without changing the quiz content.

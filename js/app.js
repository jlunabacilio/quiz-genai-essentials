// App state, rendering, and localStorage progress tracking.

const STORAGE_KEY = "genai-essentials-quiz-progress";
const PLAYER_NAME_KEY = "genai-essentials-player-name";
const SKIP_LEADERBOARD_KEY = "genai-essentials-skip-leaderboard";
const PASS_THRESHOLD = 0.7; // 70% correct unlocks the next day
const MAX_ATTEMPTS = 2; // per day; the best of the (up to) 2 scores counts

const root = document.getElementById("view-root");
const headerScoreEl = document.getElementById("header-score");
const headerScoreValueEl = document.getElementById("header-score-value");

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // localStorage unavailable (e.g. private mode) — progress just won't persist.
  }
}

function isDayUnlocked(dayId, progress) {
  if (dayId === 1) return true;
  const prev = progress[dayId - 1];
  return !!(prev && prev.passed);
}

function getAttempts(dayProgress) {
  return (dayProgress && dayProgress.attempts) || 0;
}

function totalScore(progress) {
  return Object.values(progress).reduce((sum, d) => sum + (d.bestScore || 0), 0);
}

function updateHeaderScore(progress) {
  const total = totalScore(progress);
  if (total > 0) {
    headerScoreEl.hidden = false;
    headerScoreValueEl.textContent = total;
  } else {
    headerScoreEl.hidden = true;
  }
}

function getPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setPlayerName(name) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch (e) {
    // localStorage unavailable — the name just won't be remembered.
  }
}

function getSkipLeaderboard() {
  try {
    return localStorage.getItem(SKIP_LEADERBOARD_KEY) === "true";
  } catch (e) {
    return false;
  }
}

function setSkipLeaderboard(skip) {
  try {
    localStorage.setItem(SKIP_LEADERBOARD_KEY, skip ? "true" : "false");
  } catch (e) {
    // localStorage unavailable — the choice just won't be remembered.
  }
}

function formatTime(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const PACMAN_LOADER_HTML = `
  <div class="loader-wrap">
    <div class="loader" role="status" aria-label="Loading">
      <div class="circles">
        <span class="one"></span>
        <span class="two"></span>
        <span class="three"></span>
      </div>
      <div class="pacman">
        <span class="top"></span>
        <span class="bottom"></span>
        <span class="left"></span>
        <div class="eye"></div>
      </div>
    </div>
  </div>
`;

// Firestore calls have no built-in timeout — an ad blocker, a flaky
// connection, or an offline device can leave a write "pending" forever
// with no error and no success. Race it against a timer so the UI always
// lands on a definite state instead of hanging on a loading message.
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// A generic "couldn't reach it" message can't be told apart from "your
// Firestore rules reject this" — which matters, because the fix for one is
// "check your connection" and the fix for the other is "re-publish
// firestore.rules". Surface the real code so that's obvious at a glance.
function describeFirebaseError(err) {
  const code = err && err.code;
  const hint = code === "permission-denied" ? " Check that firestore.rules has been published (see the README)." : "";
  const detail = code || (err && err.message) || "unknown error";
  return { detail, hint };
}

function leaderboardUsable() {
  return Boolean(window.Leaderboard && window.Leaderboard.isConfigured && !getSkipLeaderboard());
}

// For a named player, Firestore's attempts collection is the authoritative
// count (it's what the admin panel edits, and what the create/update rules
// actually enforce) — this pulls it down and overwrites the local copy so
// an admin's reset, or an attempt recorded from a different browser, shows
// up here too. Returns whether anything actually changed.
async function reconcileAttemptsFromFirestore(name) {
  const remote = await withTimeout(window.Leaderboard.fetchAttempts(name), 10000, "Attempts fetch timed out");
  const progress = loadProgress();
  let changed = false;
  for (let day = 1; day <= 6; day++) {
    const remoteCount = remote[day] || 0;
    const local = progress[day] || { bestScore: 0, passed: false, attempts: 0 };
    if ((local.attempts || 0) !== remoteCount) {
      progress[day] = { bestScore: local.bestScore || 0, passed: !!local.passed, attempts: remoteCount };
      changed = true;
    }
  }
  if (changed) saveProgress(progress);
  return changed;
}

// ---------- Menu view ----------

function renderMenu() {
  const progress = loadProgress();
  updateHeaderScore(progress);

  const el = document.createElement("div");
  el.className = "menu";

  const intro = document.createElement("div");
  intro.className = "menu-intro";
  intro.innerHTML = `
    <h1>Choose a day</h1>
    <p>Work through the six-day Generative AI Essentials learning path. Score ${Math.round(PASS_THRESHOLD * 100)}%+ to unlock the next day.</p>
  `;
  el.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "day-grid";

  QUIZ_DAYS.forEach((day) => {
    const unlocked = isDayUnlocked(day.id, progress);
    const dayProgress = progress[day.id];
    const attempts = getAttempts(dayProgress);
    const attemptsExhausted = attempts >= MAX_ATTEMPTS;
    const playable = unlocked && !attemptsExhausted;

    const card = document.createElement("button");
    card.className = "day-card" + (playable ? "" : " locked");
    card.disabled = !playable;

    let badge;
    let badgeClass;
    if (dayProgress && dayProgress.passed) {
      badge = "✓ Completed";
      badgeClass = "badge badge-done";
    } else if (!unlocked) {
      badge = "🔒 Locked";
      badgeClass = "badge badge-locked";
    } else if (attemptsExhausted) {
      badge = "No attempts left";
      badgeClass = "badge badge-locked";
    } else {
      badge = "Unlocked";
      badgeClass = "badge badge-open";
    }

    let scoreLine;
    if (dayProgress) {
      scoreLine = `<div class="day-card-score">Best score: ${dayProgress.bestScore}/${day.questions.length} (${Math.round((dayProgress.bestScore / day.questions.length) * 100)}%) · ${attempts}/${MAX_ATTEMPTS} attempts used</div>`;
    } else {
      scoreLine = `<div class="day-card-score muted">${unlocked ? "Not attempted yet" : "Complete the previous day to unlock"}</div>`;
    }

    card.innerHTML = `
      <div class="day-card-top">
        <span class="day-number">Day ${day.id}</span>
        <span class="${badgeClass}">${badge}</span>
      </div>
      <h2>${day.title}</h2>
      <p>${day.subtitle}</p>
      ${scoreLine}
    `;

    if (playable) {
      card.addEventListener("click", () => startQuiz(day.id));
    }

    grid.appendChild(card);
  });

  el.appendChild(grid);

  root.replaceChildren(el);

  // Best-effort background sync: local storage renders instantly, then we
  // check Firestore for a named player and re-render only if something
  // actually changed (an admin reset, or an attempt from another device).
  // Guarded so a slow response can't yank the user back to the menu if
  // they've already moved on to a quiz by the time it resolves.
  const name = getPlayerName();
  if (leaderboardUsable() && name) {
    reconcileAttemptsFromFirestore(name)
      .then((changed) => {
        if (changed && root.querySelector(".menu")) renderMenu();
      })
      .catch(() => {}); // offline/slow — local data still governs
  }
}

// ---------- Name gate (asked once, before the first quiz attempt) ----------

function startQuiz(dayId) {
  const progress = loadProgress();
  if (getAttempts(progress[dayId]) >= MAX_ATTEMPTS) {
    renderMenu(); // attempts exhausted — the day card shouldn't be clickable, but guard anyway
    return;
  }

  if (leaderboardUsable() && !getPlayerName()) {
    renderNameGate(dayId);
  } else {
    renderQuiz(dayId);
  }
}

function renderNameGate(dayId) {
  const day = QUIZ_DAYS.find((d) => d.id === dayId);

  const el = document.createElement("div");
  el.className = "results";
  el.innerHTML = `
    <div class="results-card">
      <div class="results-icon">🏆</div>
      <h1>Before you start</h1>
      <p class="results-message">Add your name so your score on Day ${day.id}: ${day.title} counts toward the team leaderboard.</p>
      <div class="leaderboard-prompt">
        <label for="lb-name-input">Your name</label>
        <div class="leaderboard-prompt-row">
          <input type="text" id="lb-name-input" maxlength="40" placeholder="Your name" autocomplete="off" />
          <button class="btn btn-primary" id="lb-start-btn" type="button">Start quiz</button>
        </div>
        <p class="leaderboard-note leaderboard-note-error" id="lb-name-error" hidden></p>
        <button class="link-btn" id="lb-skip-btn" type="button">Skip — don't use the leaderboard</button>
      </div>
    </div>
  `;

  const input = el.querySelector("#lb-name-input");
  const startBtn = el.querySelector("#lb-start-btn");
  const errorEl = el.querySelector("#lb-name-error");

  const start = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }

    errorEl.hidden = true;
    input.disabled = true;
    startBtn.disabled = true;
    startBtn.textContent = "Checking name…";

    withTimeout(window.Leaderboard.claimName(name), 10000, "Name check timed out")
      .then(() => {
        setPlayerName(name);
        renderQuiz(dayId);
      })
      .catch((err) => {
        input.disabled = false;
        startBtn.disabled = false;
        startBtn.textContent = "Start quiz";
        errorEl.hidden = false;
        errorEl.textContent =
          err && err.code === "permission-denied"
            ? "That name is already taken on the leaderboard — try another."
            : "Couldn't verify that name right now — check your connection and try again.";
        input.focus();
      });
  };
  startBtn.addEventListener("click", start);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") start();
  });
  el.querySelector("#lb-skip-btn").addEventListener("click", () => {
    setSkipLeaderboard(true);
    renderQuiz(dayId);
  });

  root.replaceChildren(el);
  input.focus();
}

// ---------- Quiz view ----------

function renderQuiz(dayId) {
  const day = QUIZ_DAYS.find((d) => d.id === dayId);
  const state = {
    index: 0,
    score: 0,
    answered: false,
    selectedOption: null,
    startTime: performance.now(),
  };

  function renderQuestion() {
    const q = day.questions[state.index];
    const el = document.createElement("div");
    el.className = "quiz";

    const progressPct = Math.round((state.index / day.questions.length) * 100);

    el.innerHTML = `
      <div class="quiz-header">
        <button class="btn btn-ghost btn-back" id="back-btn">← Back to menu</button>
        <div class="quiz-meta">Day ${day.id}: ${day.title}</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
      <div class="quiz-status">
        <span>Question ${state.index + 1} of ${day.questions.length}</span>
        <span>Score: ${state.score}</span>
      </div>
      <h2 class="question-text">${q.q}</h2>
      <div class="options" id="options"></div>
      <div class="quiz-footer" id="quiz-footer"></div>
    `;

    el.querySelector("#back-btn").addEventListener("click", () => {
      if (confirm("Leave this quiz? Your progress on this attempt will be lost.")) {
        renderMenu();
      }
    });

    const optionsEl = el.querySelector("#options");
    q.options.forEach((optionText, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = optionText;
      btn.addEventListener("click", () => selectOption(i, el, q));
      optionsEl.appendChild(btn);
    });

    root.replaceChildren(el);
  }

  function selectOption(i, el, q) {
    if (state.answered) return;
    state.answered = true;
    state.selectedOption = i;

    const isCorrect = i === q.correct;
    if (isCorrect) state.score += 1;

    const optionButtons = el.querySelectorAll(".option");
    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correct) btn.classList.add("correct");
      if (idx === i && !isCorrect) btn.classList.add("incorrect");
    });

    const footer = el.querySelector("#quiz-footer");
    footer.innerHTML = `
      <div class="explanation ${isCorrect ? "explanation-correct" : "explanation-incorrect"}">
        <strong>${isCorrect ? "Correct!" : "Not quite."}</strong>
        <p>${q.explanation}</p>
      </div>
    `;

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-primary";
    nextBtn.textContent = state.index + 1 < day.questions.length ? "Next question" : "See results";
    nextBtn.addEventListener("click", () => {
      state.index += 1;
      state.answered = false;
      state.selectedOption = null;
      if (state.index < day.questions.length) {
        renderQuestion();
      } else {
        finishQuiz();
      }
    });
    footer.appendChild(nextBtn);

    el.querySelector(".quiz-status").innerHTML = `
      <span>Question ${state.index + 1} of ${day.questions.length}</span>
      <span>Score: ${state.score}</span>
    `;
  }

  function finishQuiz() {
    const timeMs = Math.round(performance.now() - state.startTime);
    const name = getPlayerName();

    if (leaderboardUsable() && name) {
      // Firestore's attempts collection is authoritative for a named
      // player: this is the write the security rules actually enforce
      // (self-increment by exactly 1, capped at 2), so the result tells us
      // the *real* count even if this browser's local copy was stale.
      withTimeout(window.Leaderboard.recordAttempt(name, day.id), 10000, "Attempt recording timed out")
        .then((attempts) => wrapUp(attempts, {}))
        .catch((err) => {
          if (err && err.message === "attempts-exhausted") {
            // The server says both attempts were already used (most likely
            // recorded from another tab/device) — this run doesn't count.
            wrapUp(MAX_ATTEMPTS, { notCounted: true });
          } else {
            // Network hiccup: still enforce the cap locally so it can't be
            // bypassed by staying offline, but flag that it didn't sync.
            const prevAttempts = getAttempts(loadProgress()[day.id]);
            wrapUp(prevAttempts + 1, { syncFailed: true });
          }
        });
    } else {
      const prevAttempts = getAttempts(loadProgress()[day.id]);
      wrapUp(prevAttempts + 1, {});
    }

    function wrapUp(attempts, { notCounted, syncFailed } = {}) {
      const progress = loadProgress();
      const total = day.questions.length;
      const pct = state.score / total;
      const passed = !notCounted && pct >= PASS_THRESHOLD;
      const prev = progress[day.id];

      const bestScore = notCounted ? (prev ? prev.bestScore : 0) : prev ? Math.max(prev.bestScore, state.score) : state.score;
      progress[day.id] = {
        bestScore,
        passed: notCounted ? !!(prev && prev.passed) : (prev && prev.passed) || passed,
        attempts,
      };
      saveProgress(progress);
      updateHeaderScore(progress);

      renderResults(day, state.score, total, passed, timeMs, attempts, bestScore, { notCounted, syncFailed });
    }
  }

  renderQuestion();
}

// ---------- Results view ----------

function renderResults(day, score, total, passed, timeMs, attempts, bestScore, flags = {}) {
  const { notCounted, syncFailed } = flags;
  const pct = Math.round((score / total) * 100);
  const nextDay = QUIZ_DAYS.find((d) => d.id === day.id + 1);
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attempts);
  const bestPct = total > 0 ? Math.round((bestScore / total) * 100) : 0;

  let message;
  if (notCounted) {
    message = "This attempt didn't count — you'd already used both attempts for this day, most likely from another tab or device.";
  } else if (passed) {
    message = nextDay
      ? `Great work — Day ${nextDay.id}: ${nextDay.title} is now unlocked.`
      : "You've completed the full Generative AI Essentials path!";
  } else if (attemptsRemaining > 0) {
    message = `You need ${Math.round(PASS_THRESHOLD * 100)}% to unlock the next day. Review the material and try again.`;
  } else {
    message = `You've used both attempts for this day. Your best score, ${bestScore}/${total} (${bestPct}%), is what counts.`;
  }

  const el = document.createElement("div");
  el.className = "results";
  el.innerHTML = `
    <div class="results-card ${notCounted ? "" : passed ? "results-pass" : "results-fail"}">
      <div class="results-icon">${notCounted ? "⚠️" : passed ? "🎉" : "📘"}</div>
      <h1>${notCounted ? "Attempt not recorded" : passed ? "Day complete!" : "Almost there"}</h1>
      <p class="results-score">${score} / ${total} correct (${pct}%) · ${formatTime(timeMs)}</p>
      <div class="results-messages">
        <p class="results-message">${message}</p>
        ${
          attemptsRemaining > 0 && !passed && !notCounted
            ? `<p class="muted results-attempts-note">${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left for this day.</p>`
            : ""
        }
        ${syncFailed ? `<p class="muted results-attempts-note">Couldn't confirm this attempt with the leaderboard server — it's still saved locally on this device.</p>` : ""}
      </div>
      <div id="leaderboard-submit"></div>
      <div class="results-actions">
        ${attemptsRemaining > 0 && !notCounted ? `<button class="btn btn-secondary" id="retry-btn">Retry this day</button>` : ""}
        <button class="btn btn-primary" id="menu-btn">Back to menu</button>
      </div>
    </div>
  `;

  const retryBtn = el.querySelector("#retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => startQuiz(day.id));
  }
  el.querySelector("#menu-btn").addEventListener("click", () => renderMenu());

  root.replaceChildren(el);

  if (!notCounted) {
    renderLeaderboardSubmit(el.querySelector("#leaderboard-submit"), {
      day: day.id,
      correct: score,
      total,
      timeMs,
      passed,
    });
  }
}

// ---------- Leaderboard: submit an attempt ----------

function renderLeaderboardSubmit(container, attempt) {
  if (!window.Leaderboard || !window.Leaderboard.isConfigured) {
    return; // Firebase not set up yet — stay quiet, the rest of the app still works.
  }
  if (getSkipLeaderboard()) {
    return; // user opted out
  }

  const name = getPlayerName();
  if (!name) {
    return; // no name on file (shouldn't normally happen — startQuiz gates on this before the quiz begins)
  }

  container.innerHTML = `<p class="leaderboard-note">Submitting to team leaderboard…</p>`;

  // Firestore's write confirmation can take a while to reach the client
  // (or never arrive) even though the write itself has already landed on
  // the server — so a slow response here isn't proof of failure. Race the
  // real submission against a short grace period: if nothing definite
  // (success or a fast rejection, like a rules problem) comes back in
  // time, show success optimistically rather than telling the player it
  // failed when it most likely didn't. A late success/failure after that
  // is a no-op — the message already shown stands.
  let settled = false;
  const showSubmitted = () => {
    if (settled) return;
    settled = true;
    container.innerHTML = `
      <p class="leaderboard-note leaderboard-note-ok">
        🏆 Submitted to the team leaderboard as "${escapeHtml(name)}".
        <button class="link-btn" id="not-you-btn" type="button">Not you?</button>
      </p>
    `;
    container.querySelector("#not-you-btn").addEventListener("click", () => {
      setPlayerName("");
      container.innerHTML = `<p class="leaderboard-note">Got it — you'll be asked for a name again next time you start a quiz.</p>`;
    });
  };

  window.Leaderboard.submitScore({ name, ...attempt })
    .then(showSubmitted)
    .catch((err) => {
      if (settled) return;
      settled = true;
      const { detail, hint } = describeFirebaseError(err);
      container.innerHTML = `<p class="leaderboard-note leaderboard-note-error">Couldn't reach the leaderboard (${escapeHtml(detail)}) — your local progress is still saved.${escapeHtml(hint)}</p>`;
    });

  setTimeout(showSubmitted, 5000);
}

// ---------- Leaderboard: view ----------

function bestPerNamePerDay(scores) {
  const byDay = new Map();
  scores.forEach((s) => {
    if (!byDay.has(s.day)) byDay.set(s.day, new Map());
    const dayMap = byDay.get(s.day);
    const existing = dayMap.get(s.name);
    if (!existing || s.correct > existing.correct || (s.correct === existing.correct && s.timeMs < existing.timeMs)) {
      dayMap.set(s.name, s);
    }
  });
  return byDay;
}

function renderDayTable(scores, dayId) {
  const byDay = bestPerNamePerDay(scores);
  const dayMap = byDay.get(dayId) || new Map();
  const rows = [...dayMap.values()].sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs).slice(0, 10);

  if (rows.length === 0) {
    return `<p class="muted">No scores yet for this day. Be the first!</p>`;
  }

  return `
    <table class="lb-table">
      <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Time</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.correct}/${r.total}</td>
            <td>${formatTime(r.timeMs)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderOverallTable(scores) {
  const byDay = bestPerNamePerDay(scores);
  const totals = new Map();

  byDay.forEach((dayMap) => {
    dayMap.forEach((entry, name) => {
      const t = totals.get(name) || { name, correct: 0, timeMs: 0, days: 0 };
      t.correct += entry.correct;
      t.timeMs += entry.timeMs;
      t.days += 1;
      totals.set(name, t);
    });
  });

  const rows = [...totals.values()].sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs).slice(0, 10);

  if (rows.length === 0) {
    return `<p class="muted">No scores yet. Be the first!</p>`;
  }

  return `
    <table class="lb-table">
      <thead><tr><th>#</th><th>Name</th><th>Total correct</th><th>Total time</th><th>Days</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.correct}</td>
            <td>${formatTime(r.timeMs)}</td>
            <td>${r.days}/6</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderLeaderboard() {
  const el = document.createElement("div");
  el.className = "leaderboard-view";
  el.innerHTML = `
    <div class="quiz-header">
      <button class="btn btn-ghost btn-back" id="lb-back-btn">← Back to menu</button>
      <div class="quiz-meta">Team Leaderboard</div>
    </div>
    <div class="leaderboard-tabs" id="lb-tabs"></div>
    <div id="lb-content" class="leaderboard-content">${PACMAN_LOADER_HTML}</div>
  `;
  el.querySelector("#lb-back-btn").addEventListener("click", () => renderMenu());
  root.replaceChildren(el);

  if (!window.Leaderboard || !window.Leaderboard.isConfigured) {
    el.querySelector("#lb-tabs").remove();
    el.querySelector("#lb-content").innerHTML = `<p class="muted">The leaderboard isn't configured yet — add your Firebase project details in js/firebase-config.js.</p>`;
    return;
  }

  const tabsEl = el.querySelector("#lb-tabs");
  const contentEl = el.querySelector("#lb-content");
  const tabs = [...QUIZ_DAYS.map((d) => ({ key: String(d.id), label: `Day ${d.id}` })), { key: "overall", label: "Overall" }];
  let activeTab = "overall";
  let allScores = null;

  function renderTabs() {
    tabsEl.innerHTML = "";
    tabs.forEach((tab) => {
      const btn = document.createElement("button");
      btn.className = "lb-tab" + (tab.key === activeTab ? " active" : "");
      btn.textContent = tab.label;
      btn.addEventListener("click", () => {
        activeTab = tab.key;
        renderTabs();
        renderContent();
      });
      tabsEl.appendChild(btn);
    });
  }

  function renderContent() {
    if (!allScores) {
      contentEl.innerHTML = PACMAN_LOADER_HTML;
      return;
    }
    contentEl.innerHTML = activeTab === "overall" ? renderOverallTable(allScores) : renderDayTable(allScores, Number(activeTab));
  }

  renderTabs();
  renderContent();

  withTimeout(window.Leaderboard.fetchAllScores(), 10000, "Leaderboard fetch timed out")
    .then((scores) => {
      allScores = scores;
      renderContent();
    })
    .catch((err) => {
      const { detail, hint } = describeFirebaseError(err);
      contentEl.innerHTML = `<p class="leaderboard-note-error">Couldn't load the leaderboard right now (${escapeHtml(detail)}).${escapeHtml(hint)}</p>`;
    });
}

// ---------- Init ----------

const leaderboardBtn = document.getElementById("leaderboard-btn");
if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", () => renderLeaderboard());
}

renderMenu();

// js/firebase-init.js is an ES module, which loads after this classic
// script runs — so window.Leaderboard doesn't exist yet during the very
// first renderMenu() call above, and the attempts reconcile inside it gets
// silently skipped. Once the module signals it's ready, re-render (only if
// the menu is still the visible view) so that first-load reconcile isn't
// lost.
window.addEventListener("leaderboard-ready", () => {
  if (root.querySelector(".menu")) renderMenu();
});

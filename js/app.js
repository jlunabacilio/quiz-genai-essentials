// App state, rendering, and localStorage progress tracking.

const STORAGE_KEY = "genai-essentials-quiz-progress";
const PLAYER_NAME_KEY = "genai-essentials-player-name";
const SKIP_LEADERBOARD_KEY = "genai-essentials-skip-leaderboard";
const PASS_THRESHOLD = 0.7; // 70% correct unlocks the next day

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

    const card = document.createElement("button");
    card.className = "day-card" + (unlocked ? "" : " locked");
    card.disabled = !unlocked;

    const badge = dayProgress && dayProgress.passed ? "✓ Completed" : unlocked ? "Unlocked" : "🔒 Locked";
    const badgeClass = dayProgress && dayProgress.passed ? "badge badge-done" : unlocked ? "badge badge-open" : "badge badge-locked";

    card.innerHTML = `
      <div class="day-card-top">
        <span class="day-number">Day ${day.id}</span>
        <span class="${badgeClass}">${badge}</span>
      </div>
      <h2>${day.title}</h2>
      <p>${day.subtitle}</p>
      ${
        dayProgress
          ? `<div class="day-card-score">Best score: ${dayProgress.bestScore}/${day.questions.length} (${Math.round((dayProgress.bestScore / day.questions.length) * 100)}%)</div>`
          : `<div class="day-card-score muted">${unlocked ? "Not attempted yet" : "Complete the previous day to unlock"}</div>`
      }
    `;

    if (unlocked) {
      card.addEventListener("click", () => startQuiz(day.id));
    }

    grid.appendChild(card);
  });

  el.appendChild(grid);

  if (Object.keys(progress).length > 0) {
    const resetWrap = document.createElement("div");
    resetWrap.className = "reset-wrap";
    const resetBtn = document.createElement("button");
    resetBtn.className = "btn btn-ghost";
    resetBtn.textContent = "Reset all progress";
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all quiz progress? This can't be undone.")) {
        saveProgress({});
        renderMenu();
      }
    });
    resetWrap.appendChild(resetBtn);
    el.appendChild(resetWrap);
  }

  root.replaceChildren(el);
}

// ---------- Name gate (asked once, before the first quiz attempt) ----------

function startQuiz(dayId) {
  const leaderboardUsable = window.Leaderboard && window.Leaderboard.isConfigured && !getSkipLeaderboard();
  if (leaderboardUsable && !getPlayerName()) {
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
        <button class="link-btn" id="lb-skip-btn" type="button">Skip — don't use the leaderboard</button>
      </div>
    </div>
  `;

  const input = el.querySelector("#lb-name-input");
  const start = () => {
    const name = input.value.trim();
    if (name) setPlayerName(name);
    renderQuiz(dayId);
  };
  el.querySelector("#lb-start-btn").addEventListener("click", start);
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
    const progress = loadProgress();
    const total = day.questions.length;
    const pct = state.score / total;
    const passed = pct >= PASS_THRESHOLD;

    const prev = progress[day.id];
    const bestScore = prev ? Math.max(prev.bestScore, state.score) : state.score;
    progress[day.id] = {
      bestScore,
      passed: (prev && prev.passed) || passed,
    };
    saveProgress(progress);
    updateHeaderScore(progress);

    renderResults(day, state.score, total, passed, timeMs);
  }

  renderQuestion();
}

// ---------- Results view ----------

function renderResults(day, score, total, passed, timeMs) {
  const pct = Math.round((score / total) * 100);
  const nextDay = QUIZ_DAYS.find((d) => d.id === day.id + 1);

  const el = document.createElement("div");
  el.className = "results";
  el.innerHTML = `
    <div class="results-card ${passed ? "results-pass" : "results-fail"}">
      <div class="results-icon">${passed ? "🎉" : "📘"}</div>
      <h1>${passed ? "Day complete!" : "Almost there"}</h1>
      <p class="results-score">${score} / ${total} correct (${pct}%) · ${formatTime(timeMs)}</p>
      <p class="results-message">
        ${
          passed
            ? nextDay
              ? `Great work — Day ${nextDay.id}: ${nextDay.title} is now unlocked.`
              : "You've completed the full Generative AI Essentials path!"
            : `You need ${Math.round(PASS_THRESHOLD * 100)}% to unlock the next day. Review the material and try again.`
        }
      </p>
      <div id="leaderboard-submit"></div>
      <div class="results-actions">
        <button class="btn btn-secondary" id="retry-btn">Retry this day</button>
        <button class="btn btn-primary" id="menu-btn">Back to menu</button>
      </div>
    </div>
  `;

  el.querySelector("#retry-btn").addEventListener("click", () => startQuiz(day.id));
  el.querySelector("#menu-btn").addEventListener("click", () => renderMenu());

  root.replaceChildren(el);

  renderLeaderboardSubmit(el.querySelector("#leaderboard-submit"), {
    day: day.id,
    correct: score,
    total,
    timeMs,
    passed,
  });
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
  withTimeout(window.Leaderboard.submitScore({ name, ...attempt }), 10000, "Leaderboard submission timed out")
    .then(() => {
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
    })
    .catch(() => {
      container.innerHTML = `<p class="leaderboard-note leaderboard-note-error">Couldn't reach the leaderboard — your local progress is still saved.</p>`;
    });
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
    <div id="lb-content" class="leaderboard-content"><p class="muted">Loading…</p></div>
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
      contentEl.innerHTML = `<p class="muted">Loading…</p>`;
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
    .catch(() => {
      contentEl.innerHTML = `<p class="leaderboard-note-error">Couldn't load the leaderboard right now.</p>`;
    });
}

// ---------- Init ----------

const leaderboardBtn = document.getElementById("leaderboard-btn");
if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", () => renderLeaderboard());
}

renderMenu();

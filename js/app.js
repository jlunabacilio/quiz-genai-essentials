// App state, rendering, and localStorage progress tracking.

const STORAGE_KEY = "genai-essentials-quiz-progress";
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
      card.addEventListener("click", () => renderQuiz(day.id));
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

// ---------- Quiz view ----------

function renderQuiz(dayId) {
  const day = QUIZ_DAYS.find((d) => d.id === dayId);
  const state = {
    index: 0,
    score: 0,
    answered: false,
    selectedOption: null,
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

    renderResults(day, state.score, total, passed);
  }

  renderQuestion();
}

// ---------- Results view ----------

function renderResults(day, score, total, passed) {
  const pct = Math.round((score / total) * 100);
  const nextDay = QUIZ_DAYS.find((d) => d.id === day.id + 1);

  const el = document.createElement("div");
  el.className = "results";
  el.innerHTML = `
    <div class="results-card ${passed ? "results-pass" : "results-fail"}">
      <div class="results-icon">${passed ? "🎉" : "📘"}</div>
      <h1>${passed ? "Day complete!" : "Almost there"}</h1>
      <p class="results-score">${score} / ${total} correct (${pct}%)</p>
      <p class="results-message">
        ${
          passed
            ? nextDay
              ? `Great work — Day ${nextDay.id}: ${nextDay.title} is now unlocked.`
              : "You've completed the full Generative AI Essentials path!"
            : `You need ${Math.round(PASS_THRESHOLD * 100)}% to unlock the next day. Review the material and try again.`
        }
      </p>
      <div class="results-actions">
        <button class="btn btn-secondary" id="retry-btn">Retry this day</button>
        <button class="btn btn-primary" id="menu-btn">Back to menu</button>
      </div>
    </div>
  `;

  el.querySelector("#retry-btn").addEventListener("click", () => renderQuiz(day.id));
  el.querySelector("#menu-btn").addEventListener("click", () => renderMenu());

  root.replaceChildren(el);
}

// ---------- Init ----------

renderMenu();

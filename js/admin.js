// Admin dashboard: sign in, then reset attempts / rename / delete players.
// Classic (non-module) script — talks to Firebase only through
// window.Admin, set up by the ES module js/firebase-init.js.

const root = document.getElementById("admin-root");
const whoamiEl = document.getElementById("admin-whoami");
const signoutBtn = document.getElementById("admin-signout-btn");

function whenAdminReady(cb) {
  if (window.Admin) {
    cb();
    return;
  }
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    cb();
  };
  window.addEventListener("leaderboard-ready", settle, { once: true });
  // The Firebase module can fail to load entirely (network blocked, CDN
  // down) — without a fallback the page would just stay blank forever
  // with no explanation. If the ready event hasn't fired by then, give up
  // waiting and let the init code below show its "not configured" state.
  setTimeout(settle, 8000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

// ---------- Login ----------

function renderLogin(defaultEmail) {
  whoamiEl.hidden = true;
  signoutBtn.hidden = true;

  const el = document.createElement("div");
  el.className = "results";
  el.innerHTML = `
    <div class="results-card">
      <div class="results-icon">🔑</div>
      <h1>Admin sign in</h1>
      <p class="results-message">Sign in with the admin account to manage players.</p>
      <div class="leaderboard-prompt admin-login-form">
        <label for="admin-email">Email</label>
        <input type="email" id="admin-email" autocomplete="username" value="${escapeHtml(defaultEmail || "")}" />
        <label for="admin-password">Password</label>
        <input type="password" id="admin-password" autocomplete="current-password" />
        <button class="btn btn-primary" id="admin-signin-btn" type="button">Sign in</button>
        <p class="leaderboard-note leaderboard-note-error" id="admin-login-error" hidden></p>
      </div>
    </div>
  `;

  const emailInput = el.querySelector("#admin-email");
  const passwordInput = el.querySelector("#admin-password");
  const signinBtn = el.querySelector("#admin-signin-btn");
  const errorEl = el.querySelector("#admin-login-error");

  const submit = () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return;

    errorEl.hidden = true;
    signinBtn.disabled = true;
    signinBtn.textContent = "Signing in…";

    withTimeout(window.Admin.signIn(email, password), 20000, "Sign-in timed out")
      .catch((err) => {
        signinBtn.disabled = false;
        signinBtn.textContent = "Sign in";
        errorEl.hidden = false;
        errorEl.textContent =
          err && (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found")
            ? "Incorrect email or password."
            : "Couldn't sign in right now — check your connection and try again.";
      });
    // On success, onAuthChange (registered at startup) fires and swaps the view.
  };

  signinBtn.addEventListener("click", submit);
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  root.replaceChildren(el);
  (defaultEmail ? passwordInput : emailInput).focus();
}

// ---------- Dashboard ----------

function buildPlayerRows({ players, attempts, scores }) {
  const attemptsByPlayer = new Map();
  attempts.forEach((a) => {
    if (!attemptsByPlayer.has(a.playerId)) attemptsByPlayer.set(a.playerId, {});
    attemptsByPlayer.get(a.playerId)[a.day] = a.count;
  });

  const bestByPlayer = new Map();
  scores.forEach((s) => {
    if (!bestByPlayer.has(s.name)) bestByPlayer.set(s.name, {});
    const dayMap = bestByPlayer.get(s.name);
    const cur = dayMap[s.day];
    if (!cur || s.correct > cur.correct) dayMap[s.day] = { correct: s.correct, total: s.total };
  });

  return players
    .map((p) => ({
      id: p.id,
      name: p.displayName,
      attempts: attemptsByPlayer.get(p.id) || {},
      best: bestByPlayer.get(p.displayName) || {},
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderDashboard(email) {
  whoamiEl.hidden = false;
  whoamiEl.textContent = `Signed in as ${email}`;
  signoutBtn.hidden = false;
  signoutBtn.onclick = () => window.Admin.signOut();

  const el = document.createElement("div");
  el.className = "menu";
  el.innerHTML = `
    <div class="menu-intro">
      <h1>Players</h1>
      <p>Reset a day's attempts, rename a player (updates their past leaderboard entries too), or delete them entirely.</p>
    </div>
    <div id="admin-content"><p class="muted">Loading…</p></div>
  `;
  root.replaceChildren(el);

  const contentEl = el.querySelector("#admin-content");
  loadAndRenderTable(contentEl);
}

function loadAndRenderTable(contentEl) {
  contentEl.innerHTML = `<p class="muted">Loading…</p>`;
  withTimeout(window.Admin.fetchAll(), 25000, "Fetch timed out")
    .then((data) => {
      renderTable(contentEl, buildPlayerRows(data));
    })
    .catch((err) => {
      const detail = err && (err.code || err.message) ? ` (${err.code || err.message})` : "";
      contentEl.innerHTML = `<p class="leaderboard-note-error">Couldn't load player data right now${escapeHtml(detail)}.${
        err && err.code === "permission-denied"
          ? " This usually means firestore.rules hasn't been re-published since the admin panel was added — check the README's Admin panel section."
          : ""
      }</p>`;
    });
}

function renderTable(contentEl, rows) {
  if (rows.length === 0) {
    contentEl.innerHTML = `<p class="muted">No players yet.</p>`;
    return;
  }

  const dayHeaders = QUIZ_DAYS.map((d) => `<th>D${d.id}</th>`).join("");

  contentEl.innerHTML = `
    <div class="leaderboard-content admin-table-wrap">
      <table class="lb-table admin-table">
        <thead><tr><th>Name</th>${dayHeaders}<th>Actions</th></tr></thead>
        <tbody>
          ${rows
            .map((r) => {
              const dayCells = QUIZ_DAYS.map((d) => {
                const count = r.attempts[d.id] || 0;
                const best = r.best[d.id];
                const label = best ? `${count}/2<br><span class="muted">${best.correct}/${best.total}</span>` : `${count}/2`;
                return `
                  <td class="admin-day-cell">
                    <div>${label}</div>
                    ${count > 0 ? `<button class="link-btn admin-reset-btn" data-name="${escapeHtml(r.name)}" data-day="${d.id}" type="button">Reset</button>` : ""}
                  </td>
                `;
              }).join("");

              return `
                <tr>
                  <td>${escapeHtml(r.name)}</td>
                  ${dayCells}
                  <td class="admin-actions-cell">
                    <button class="link-btn admin-rename-btn" data-name="${escapeHtml(r.name)}" type="button">Rename</button>
                    <button class="link-btn admin-delete-btn" data-name="${escapeHtml(r.name)}" type="button">Delete</button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  contentEl.querySelectorAll(".admin-reset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      const day = Number(btn.dataset.day);
      btn.disabled = true;
      withTimeout(window.Admin.resetAttempt(name, day), 20000, "Reset timed out")
        .then(() => loadAndRenderTable(contentEl))
        .catch(() => {
          alert("Couldn't reset that attempt right now — try again.");
          btn.disabled = false;
        });
    });
  });

  contentEl.querySelectorAll(".admin-rename-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oldName = btn.dataset.name;
      const newName = prompt(`Rename "${oldName}" to:`, oldName);
      if (!newName || !newName.trim() || newName.trim() === oldName) return;

      btn.disabled = true;
      withTimeout(window.Admin.renamePlayer(oldName, newName.trim()), 25000, "Rename timed out")
        .then(() => loadAndRenderTable(contentEl))
        .catch((err) => {
          alert(err && err.message ? err.message : "Couldn't rename that player right now — try again.");
          btn.disabled = false;
        });
    });
  });

  contentEl.querySelectorAll(".admin-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      if (!confirm(`Delete "${name}"? This removes their leaderboard scores, attempts, and claimed name. This can't be undone.`)) return;

      btn.disabled = true;
      withTimeout(window.Admin.deletePlayer(name), 25000, "Delete timed out")
        .then(() => loadAndRenderTable(contentEl))
        .catch(() => {
          alert("Couldn't delete that player right now — try again.");
          btn.disabled = false;
        });
    });
  });
}

// ---------- Init ----------

whenAdminReady(() => {
  if (!window.Admin) {
    root.innerHTML = `<p class="leaderboard-note-error">Couldn't load Firebase — check your connection and reload the page.</p>`;
    return;
  }
  if (!window.Admin.isConfigured) {
    root.innerHTML = `<p class="muted">Firebase isn't configured yet — add your project details in js/firebase-config.js.</p>`;
    return;
  }

  let lastEmail = null;
  window.Admin.onAuthChange((email) => {
    if (email) {
      renderDashboard(email);
    } else {
      renderLogin(lastEmail || window.Admin.adminEmail);
    }
    lastEmail = email;
  });
});

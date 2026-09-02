// Bridges the Firebase modular SDK (loaded from the CDN as an ES module)
// into plain `window.Leaderboard` / `window.Admin` APIs that the rest of
// the app (classic, non-module scripts) can call directly.
//
// If a CDN import below 404s, the pinned SDK version has been retired —
// check https://firebase.google.com/docs/web/setup for the current version
// and update the import URLs to match (keep all three on the same version).
import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  writeBatch,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const config = window.FIREBASE_CONFIG || {};
const isConfigured = Boolean(config.apiKey) && !String(config.apiKey).startsWith("REPLACE_WITH");

const MAX_ATTEMPTS = 2;

let db = null;
let auth = null;
if (isConfigured) {
  const app = initializeApp(config);
  db = getFirestore(app);
  auth = getAuth(app);
}

// Case/whitespace-insensitive key so "Ana", "ana", and " ANA " all collide.
// Keeps letters (including accented ones — Spanish names need this) and
// digits; strips "/" since it isn't valid inside a single Firestore
// document ID segment.
function normalizeNameId(name) {
  const normalized = String(name).trim().toLowerCase().replace(/\s+/g, " ").replace(/\//g, "-");
  return normalized.slice(0, 60) || "player";
}

function attemptDocId(name, day) {
  return `${normalizeNameId(name)}_day${day}`;
}

// Claims a display name for the leaderboard. Firestore evaluates a setDoc
// as a "create" when the document doesn't exist yet and as an "update"
// once it does — firestore.rules allows create but always denies update on
// players/{id}, so the first person to claim a name gets it, and every
// later attempt at that same (normalized) name is rejected server-side,
// even if two people submit at nearly the same instant.
async function claimName(name) {
  if (!db) throw new Error("Firebase is not configured.");
  const id = normalizeNameId(name);
  await setDoc(doc(db, "players", id), {
    displayName: String(name).trim().slice(0, 40),
    claimedAt: serverTimestamp(),
  });
}

async function submitScore({ name, day, correct, total, timeMs, passed }) {
  if (!db) throw new Error("Firebase is not configured.");
  await addDoc(collection(db, "scores"), {
    name: String(name).slice(0, 40),
    day,
    correct,
    total,
    timeMs,
    passed,
    timestamp: serverTimestamp(),
  });
}

async function fetchAllScores() {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(collection(db, "scores"));
  return snapshot.docs.map((d) => d.data());
}

// Reads how many attempts a named player has used, for every day at once
// (one query instead of six single-document reads).
async function fetchAttempts(name) {
  if (!db) throw new Error("Firebase is not configured.");
  const playerId = normalizeNameId(name);
  const snap = await getDocs(query(collection(db, "attempts"), where("playerId", "==", playerId)));
  const byDay = {};
  snap.forEach((d) => {
    byDay[d.data().day] = d.data().count;
  });
  return byDay;
}

// Records one attempt for (name, day) and returns the new count. Runs as a
// transaction so two near-simultaneous submissions from the same player
// (e.g. two open tabs) can't both sneak in under the cap — Firestore
// re-runs the transaction on conflict, and the security rule only accepts
// an update that increments the stored count by exactly 1, capped at 2, so
// a third attempt is rejected server-side even if the UI let it start.
async function recordAttempt(name, day) {
  if (!db) throw new Error("Firebase is not configured.");
  const playerId = normalizeNameId(name);
  const ref = doc(db, "attempts", attemptDocId(name, day));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { playerId, day, count: 1, updatedAt: serverTimestamp() });
      return 1;
    }
    const current = snap.data().count;
    if (current >= MAX_ATTEMPTS) {
      throw new Error("attempts-exhausted");
    }
    tx.update(ref, { count: current + 1, updatedAt: serverTimestamp() });
    return current + 1;
  });
}

// ---------- Admin ----------

const ADMIN_EMAIL = "jlunab77@gmail.com";

function adminSignIn(email, password) {
  if (!auth) throw new Error("Firebase is not configured.");
  return signInWithEmailAndPassword(auth, email, password).then(() => undefined);
}

function adminSignOut() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

// cb receives the signed-in admin's email, or null when signed out /
// signed in as some other (non-admin) account.
function adminOnAuthChange(cb) {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    cb(user && user.email === ADMIN_EMAIL ? user.email : null);
  });
}

// Fetches everything the admin dashboard needs in three collection-wide
// reads, joined client-side — simpler and cheaper than per-player queries
// for a small team.
async function adminFetchAll() {
  if (!db) throw new Error("Firebase is not configured.");
  const [playersSnap, attemptsSnap, scoresSnap] = await Promise.all([
    getDocs(collection(db, "players")),
    getDocs(collection(db, "attempts")),
    getDocs(collection(db, "scores")),
  ]);

  const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const scores = scoresSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { players, attempts, scores };
}

async function adminResetAttempt(name, day) {
  if (!db) throw new Error("Firebase is not configured.");
  const playerId = normalizeNameId(name);
  await setDoc(doc(db, "attempts", attemptDocId(name, day)), {
    playerId,
    day,
    count: 0,
    updatedAt: serverTimestamp(),
  });
}

async function adminResetAllAttempts(name) {
  for (let day = 1; day <= 6; day++) {
    await adminResetAttempt(name, day);
  }
}

async function adminRenamePlayer(oldName, newName) {
  if (!db) throw new Error("Firebase is not configured.");
  const trimmedNew = String(newName).trim().slice(0, 40);
  if (!trimmedNew) throw new Error("New name can't be empty.");

  const oldId = normalizeNameId(oldName);
  const newId = normalizeNameId(trimmedNew);

  if (newId !== oldId) {
    const existing = await getDoc(doc(db, "players", newId));
    if (existing.exists()) {
      throw new Error("That name is already taken by another player.");
    }
  }

  const scoresSnap = await getDocs(query(collection(db, "scores"), where("name", "==", oldName)));
  const attemptsSnap = await getDocs(query(collection(db, "attempts"), where("playerId", "==", oldId)));

  const batch = writeBatch(db);
  batch.set(doc(db, "players", newId), { displayName: trimmedNew, claimedAt: serverTimestamp() });
  if (newId !== oldId) {
    batch.delete(doc(db, "players", oldId));
  }
  scoresSnap.forEach((d) => batch.update(d.ref, { name: trimmedNew }));
  attemptsSnap.forEach((d) => {
    const day = d.data().day;
    batch.set(doc(db, "attempts", attemptDocId(trimmedNew, day)), {
      playerId: newId,
      day,
      count: d.data().count,
      updatedAt: serverTimestamp(),
    });
    if (newId !== oldId) {
      batch.delete(d.ref);
    }
  });
  await batch.commit();
}

async function adminDeletePlayer(name) {
  if (!db) throw new Error("Firebase is not configured.");
  const id = normalizeNameId(name);

  const scoresSnap = await getDocs(query(collection(db, "scores"), where("name", "==", name)));
  const attemptsSnap = await getDocs(query(collection(db, "attempts"), where("playerId", "==", id)));

  const batch = writeBatch(db);
  scoresSnap.forEach((d) => batch.delete(d.ref));
  attemptsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "players", id));
  await batch.commit();
}

window.Leaderboard = {
  isConfigured,
  claimName,
  submitScore,
  fetchAllScores,
  fetchAttempts,
  recordAttempt,
  MAX_ATTEMPTS,
};

window.Admin = {
  isConfigured,
  adminEmail: ADMIN_EMAIL,
  signIn: adminSignIn,
  signOut: adminSignOut,
  onAuthChange: adminOnAuthChange,
  fetchAll: adminFetchAll,
  resetAttempt: adminResetAttempt,
  resetAllAttempts: adminResetAllAttempts,
  renamePlayer: adminRenamePlayer,
  deletePlayer: adminDeletePlayer,
};

window.dispatchEvent(new Event("leaderboard-ready"));

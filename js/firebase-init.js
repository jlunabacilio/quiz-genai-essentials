// Bridges the Firebase modular SDK (loaded from the CDN as an ES module)
// into a plain `window.Leaderboard` API that the rest of the app (classic,
// non-module scripts) can call directly.
//
// If the CDN import below 404s, the pinned SDK version has been retired —
// check https://firebase.google.com/docs/web/setup for the current version
// and update the two import URLs to match.
import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const config = window.FIREBASE_CONFIG || {};
const isConfigured = Boolean(config.apiKey) && !String(config.apiKey).startsWith("REPLACE_WITH");

let db = null;
if (isConfigured) {
  const app = initializeApp(config);
  db = getFirestore(app);
}

// Case/whitespace-insensitive key so "Ana", "ana", and " ANA " all collide.
// Keeps letters (including accented ones — Spanish names need this) and
// digits; strips "/" since it isn't valid inside a single Firestore
// document ID segment.
function normalizeNameId(name) {
  const normalized = String(name).trim().toLowerCase().replace(/\s+/g, " ").replace(/\//g, "-");
  return normalized.slice(0, 60) || "player";
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
  return snapshot.docs.map((doc) => doc.data());
}

window.Leaderboard = {
  isConfigured,
  claimName,
  submitScore,
  fetchAllScores,
};

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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const config = window.FIREBASE_CONFIG || {};
const isConfigured = Boolean(config.apiKey) && !String(config.apiKey).startsWith("REPLACE_WITH");

let db = null;
if (isConfigured) {
  const app = initializeApp(config);
  db = getFirestore(app);
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
  submitScore,
  fetchAllScores,
};

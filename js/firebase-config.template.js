// Firebase Web SDK configuration — TEMPLATE, checked into git.
//
// In production, .github/workflows/deploy.yml copies this file to
// js/firebase-config.js on every deploy, substituting the placeholders
// below with values from GitHub Actions repository secrets. The real
// js/firebase-config.js is git-ignored and never committed.
//
// For local development: copy this file to js/firebase-config.js and fill
// in your project's real values (see README's "Leaderboard setup" section
// for where to find them). That local copy stays untracked.
window.FIREBASE_CONFIG = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

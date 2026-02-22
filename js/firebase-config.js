// ============================================
// Firebase Configuration — Code With Sandesh
// TODO: Replace with your own Firebase config
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAotJz8g2wLRd6Ifv2xvh098apPv0G8a28",
  authDomain: "codewithsandeshofficial.firebaseapp.com",
  databaseURL: "https://codewithsandeshofficial-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "codewithsandeshofficial",
  storageBucket: "codewithsandeshofficial.firebasestorage.app",
  messagingSenderId: "346563762165",
  appId: "1:346563762165:web:6198a96b3af2582a6e72bc",
  measurementId: "G-JWY5TQKQC1"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Ensure local persistence so logins survive page reloads
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => console.error("Persistence error:", error));

const database = firebase.database();
const ADMIN_EMAILS = [
  "server@premiumserver.qzz.io",
  "bhandaryshandesh2@gmail.com"
];

function isAdmin(user) {
  return user && ADMIN_EMAILS.includes(user.email);
}

function getCurrentUser() {
  return auth.currentUser;
}

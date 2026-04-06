import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc,
  setDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch, increment, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getMessaging, getToken, onMessage
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey:            "%%FIREBASE_API_KEY%%",
  authDomain:        "%%FIREBASE_AUTH_DOMAIN%%",
  projectId:         "%%FIREBASE_PROJECT_ID%%",
  storageBucket:     "%%FIREBASE_STORAGE_BUCKET%%",
  messagingSenderId: "%%FIREBASE_MESSAGING_SENDER_ID%%",
  appId:             "%%FIREBASE_APP_ID%%"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
let messaging = null;
try { messaging = getMessaging(app); } catch(e) { console.warn('FCM not supported:', e); }
window._db = db;
window._storage = storage;
window._auth = auth;
window._googleProvider = googleProvider;
window._messaging = messaging;
window._fb = {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  setDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch, increment, Timestamp,
  storageRef: ref,
  uploadBytes, getDownloadURL,
  signInWithPopup, signOut,
  getToken, onMessage
};
window._fbReady = true;
document.dispatchEvent(new Event('fbReady'));

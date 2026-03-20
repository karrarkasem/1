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

const firebaseConfig = {
  apiKey: "AIzaSyBMLyYD0U5v3B3CWv80i-1mUGpBpkNKB98",
  authDomain: "burjuman-6cb83.firebaseapp.com",
  projectId: "burjuman-6cb83",
  storageBucket: "burjuman-6cb83.firebasestorage.app",
  messagingSenderId: "177984721378",
  appId: "1:177984721378:web:afb0a673eb1a4f1c1b69bb"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
window._db = db;
window._storage = storage;
window._auth = auth;
window._googleProvider = googleProvider;
window._fb = {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  setDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch, increment, Timestamp,
  storageRef: ref,   // ✅ تم التغيير هنا من 'ref' إلى 'storageRef'
  uploadBytes, getDownloadURL,
  signInWithPopup, signOut
};
window._fbReady = true;
document.dispatchEvent(new Event('fbReady'));

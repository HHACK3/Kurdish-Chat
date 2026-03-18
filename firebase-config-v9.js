// Firebase SDK v9+ with Module Support

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUmPUgvcNQiT1OMelbVCwgzIdmrtqbV9w",
  authDomain: "krd-chat.firebaseapp.com",
  projectId: "krd-chat",
  storageBucket: "krd-chat.firebasestorage.app",
  messagingSenderId: "462153418531",
  appId: "1:462153418531:web:e3760d5244cbc4bb9c6e96",
  measurementId: "G-D15BHYN94C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Google Sign-In provider
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence for better performance with multi-tab support
enableIndexedDbPersistence(db, { synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.storage = storage;
window.googleProvider = googleProvider;

console.log('Firebase initialized successfully!', { auth, db, storage });

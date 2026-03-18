// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

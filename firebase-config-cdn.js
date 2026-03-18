// Firebase Configuration - CDN Version (No Modules)

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
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence with multi-tab support
// Comment out during development to avoid multi-tab conflicts
// db.enablePersistence({ 
//     synchronizeTabs: true,
//     experimentalForceOwningTab: true
// })
//     .catch((err) => {
//         if (err.code == 'failed-precondition') {
//             console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
//         } else if (err.code == 'unimplemented') {
//             console.log('The current browser does not support persistence.');
//         }
//     });

// Google Sign-In provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.storage = storage;
window.googleProvider = googleProvider;

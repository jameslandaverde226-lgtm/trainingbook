// --- FILE: ./lib/firebase.ts ---
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// --- CONFIG: Trainingbook (Primary Project) ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 1. Initialize Primary App
// We check getApps() to prevent initialization errors during Next.js hot-reloading
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Primary Project Instances
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Export instances
export { 
  app, 
  db, 
  storage, 
  auth 
};
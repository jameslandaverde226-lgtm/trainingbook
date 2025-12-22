import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// --- CONFIG 1: Trainingbook (Primary Project) ---
// This project stores your Events, Storage Overrides, and Local Images
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- CONFIG 2: CARES Path (Secondary Project) ---
// This project is the source for your Team Roster and Personnel data
const caresPathConfig = {
  apiKey: process.env.NEXT_PUBLIC_CARES_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_CARES_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_CARES_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_CARES_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_CARES_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_CARES_APP_ID,
};

// 1. Initialize Primary App (Default)
// We check getApps() to prevent initialization errors during Next.js hot-reloading
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Primary Project Instances
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// 2. Initialize Secondary App (Named: "caresPath")
const caresApp = getApps().find(a => a.name === "caresPath") 
  ? getApp("caresPath") 
  : initializeApp(caresPathConfig, "caresPath");

// Secondary Project Instances
const caresDb = getFirestore(caresApp);
const caresStorage = getStorage(caresApp); // Available if you ever need to write back to CARES

// 3. Export all instances for use in components and stores
export { 
  app, 
  db, 
  storage, 
  auth, 
  caresApp, 
  caresDb, 
  caresStorage 
};
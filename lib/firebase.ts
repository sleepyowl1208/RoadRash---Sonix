import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Workaround for TypeScript error: "Module 'firebase/auth' has no exported member..."
const { getAuth } = firebaseAuth as any;

let app: FirebaseApp | undefined;
let auth: any | undefined; // Relaxed type from Auth to any
let db: Firestore | undefined;

// Only initialize if we have an API Key to avoid "auth/invalid-api-key" error
if (typeof window !== "undefined" && firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase config missing. Running in offline/guest mode.");
}

export { app, auth, db };
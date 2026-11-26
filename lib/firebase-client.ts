"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// These are public Firebase web app identifiers, not Admin credentials.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
let connected = false;
export function firebaseClient() {
  if (
    process.env.NEXT_PUBLIC_USE_EMULATORS !== "true" &&
    (!config.apiKey || !config.authDomain || !config.projectId || !config.appId)
  ) {
    throw new Error(
      "Firebase is not configured. Add the public web app settings to .env.local.",
    );
  }
  const testMode = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
  const app = getApps().length
    ? getApp()
    : initializeApp(
        testMode
          ? {
              apiKey: "demo-key",
              authDomain: "localhost",
              projectId: "demo-interview-test",
              appId: "demo-app",
            }
          : config,
      );
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (testMode && !connected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connected = true;
  }
  return { auth, db };
}

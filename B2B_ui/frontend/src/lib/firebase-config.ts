// src/lib/firebase-config.ts

import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAZdRgHpJrWIJ8UzcQe_oD_VcnFsK7sq-4",
  authDomain: "test-3afa8.firebaseapp.com",
  projectId: "test-3afa8",
  storageBucket: "test-3afa8.firebasestorage.app",
  messagingSenderId: "605297674908",
  appId: "1:605297674908:web:108a45494d1db88f8cbb59",
  measurementId: "G-0P1TBVVXG4",
}

// ✅ Avoid re-initializing Firebase during hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// ✅ Firestore database
export const db = getFirestore(app)

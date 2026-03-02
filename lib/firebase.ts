// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB5n0XoICsbfFuXo_UwdXX8Ax00Fe2KCSQ",
    authDomain: "fullmoon-e94e4.firebaseapp.com",
    projectId: "fullmoon-e94e4",
    storageBucket: "fullmoon-e94e4.firebasestorage.app",
    messagingSenderId: "509949476619",
    appId: "1:509949476619:web:0d33c357f156bf4d1dec0e",
    measurementId: "G-EGCLYLDY6F",
    databaseURL: "https://fullmoon-e94e4-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
// Singleton pattern pour éviter de ré-initialiser Firebase à chaque rechargement Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let analytics;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
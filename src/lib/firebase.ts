
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqBTEoc5EVfYi1jX8yGsz6m8eHLehvZKY",
  authDomain: "studio-7108285578-efaf5.firebaseapp.com",
  projectId: "studio-7108285578-efaf5",
  storageBucket: "studio-7108285578-efaf5.appspot.com",
  messagingSenderId: "371662480472",
  appId: "1:371662480472:web:8296486201b16e8518562d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
try {
    enableIndexedDbPersistence(db);
} catch (err: any) {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore offline persistence failed to enable. This can happen if you have multiple tabs open.');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firestore offline persistence is not supported in this browser.');
    }
}


const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };

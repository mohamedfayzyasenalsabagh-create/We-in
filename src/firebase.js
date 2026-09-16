// Real Firebase project connection for We-in.
// This config is not a secret — it's meant to be public in web apps.
// Real security comes from Firestore/Storage Security Rules (set up later).

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDgylC5uDhcGzeWjFWLveCh4Q-IxtSt8RA",
  authDomain: "we-in-e0c9b.firebaseapp.com",
  projectId: "we-in-e0c9b",
  storageBucket: "we-in-e0c9b.firebasestorage.app",
  messagingSenderId: "857243960215",
  appId: "1:857243960215:web:ec48c95b64715f047b7ad2",
  measurementId: "G-34X752MBDW",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

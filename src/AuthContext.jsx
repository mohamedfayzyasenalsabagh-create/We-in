import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db, app as mainApp } from "./firebase";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user object
  const [profile, setProfile] = useState(null); // Firestore users/{uid} doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? { id: u.uid, ...snap.data() } : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function refreshProfile() {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    setProfile(snap.exists() ? { id: auth.currentUser.uid, ...snap.data() } : null);
  }

  // Customer self-signup: real account, real verification email sent by Firebase.
  async function signup({ email, password, name }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      phone: null,
      role: "customer",
      wishlist: [],
      addresses: [],
      points: 0,
      createdAt: serverTimestamp(),
    });
    return cred.user;
  }

  async function login({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  // Google/Facebook: real OAuth sign-in via Firebase. Email is already
  // verified by Google/Meta themselves, so no separate verification email
  // is needed for these. If it's the person's first time, we create their
  // profile with phone left empty — the app then forces a one-time "add your
  // phone number" step before letting them do anything else, since delivery
  // needs a real contact number no matter how someone signed in.
  async function socialSignIn(providerName) {
    const provider = providerName === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const ref = doc(db, "users", cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: cred.user.displayName || "",
        email: cred.user.email || "",
        phone: null,
        role: "customer",
        wishlist: [],
        addresses: [],
        points: 0,
        createdAt: serverTimestamp(),
      });
    }
    await refreshProfile();
    return cred.user;
  }
  const loginWithGoogle = () => socialSignIn("google");
  const loginWithFacebook = () => socialSignIn("facebook");

  // Required step after any sign-in method if the profile has no phone yet.
  async function setMyPhone(phone) {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, "users", auth.currentUser.uid), { phone });
    await refreshProfile();
  }

  async function logout() {
    await signOut(auth);
  }

  async function resendVerification() {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }

  // Used by the admin to create merchant/delivery/staff accounts WITHOUT
  // logging the admin out of their own session. Firebase's client SDK
  // normally signs you in as the newly created user, which would kick the
  // admin out — this works around that by spinning up a second, throwaway
  // Firebase app instance just for the creation call, then tearing it down.
  async function createManagedAccount({ email, password, name, role, phone, extra = {} }) {
    const secondaryApp = initializeApp(mainApp.options, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        phone: phone || null,
        role,
        createdAt: serverTimestamp(),
        ...extra,
      });
      return cred.user.uid;
    } finally {
      await signOut(secondaryAuth).catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
    }
  }

  const value = {
    user,
    profile,
    loading,
    signup,
    login,
    loginWithGoogle,
    loginWithFacebook,
    setMyPhone,
    logout,
    resendVerification,
    createManagedAccount,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

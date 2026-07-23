import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

const ADMIN_EMAIL = 'rinomasstbi@gmail.com';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save or update user profile in Firestore
    await syncUserProfile(user);
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const syncUserProfile = async (user: User): Promise<UserProfile> => {
  const isAdmin = user.email === ADMIN_EMAIL;
  const now = new Date().toISOString();

  let profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email || 'Pengguna',
    photoURL: user.photoURL || undefined,
    role: isAdmin ? 'admin' : 'user',
    createdAt: now,
    lastLoginAt: now
  };

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const existing = userSnap.data() as UserProfile;
      profile = {
        ...existing,
        email: user.email || '',
        displayName: user.displayName || user.email || 'Pengguna',
        photoURL: user.photoURL || undefined,
        role: isAdmin ? 'admin' : (existing.role || 'user'),
        lastLoginAt: now
      };
      await setDoc(userRef, profile, { merge: true });
    } else {
      await setDoc(userRef, profile);
    }
  } catch (error) {
    console.warn("Koneksi Firestore offline / tertunda saat sinkronisasi profil, menggunakan profil lokal:", error);
  }

  return profile;
};

export { onAuthStateChanged, ADMIN_EMAIL };

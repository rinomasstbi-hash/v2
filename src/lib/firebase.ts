import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

const ADMIN_EMAIL = 'rinomasstbi@gmail.com';

const getActiveFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca custom_firebase_config dari localStorage:", e);
  }
  return defaultConfig;
};

const activeConfig = getActiveFirebaseConfig();

const app = !getApps().length ? initializeApp(activeConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = activeConfig.firestoreDatabaseId 
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);

export const saveCustomFirebaseConfig = (configObj: any) => {
  localStorage.setItem('custom_firebase_config', JSON.stringify(configObj));
  window.location.reload();
};

export const resetCustomFirebaseConfig = () => {
  localStorage.removeItem('custom_firebase_config');
  window.location.reload();
};

export const isUsingCustomFirebaseConfig = () => {
  return !!localStorage.getItem('custom_firebase_config');
};

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

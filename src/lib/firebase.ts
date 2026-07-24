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
    localStorage.removeItem('local_session_user');
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
  window.location.reload();
};

export const loginAsLocalUser = (role: 'admin' | 'user' = 'admin', email = 'rinomasstbi@gmail.com', name = 'Rino Masstbi (Admin)') => {
  const localUser: UserProfile = {
    uid: 'local_' + (role === 'admin' ? 'admin' : 'user') + '_' + Date.now(),
    email: email,
    displayName: name,
    role: role,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  localStorage.setItem('local_session_user', JSON.stringify(localUser));
  window.location.reload();
};

export const getLocalSessionUser = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem('local_session_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Gagal membaca local_session_user:", e);
  }
  return null;
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
    console.error("Gagal sinkronisasi user profile ke Firestore:", error);
  }

  return profile;
};

export { onAuthStateChanged, ADMIN_EMAIL };

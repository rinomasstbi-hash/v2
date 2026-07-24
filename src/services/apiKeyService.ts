import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeminiApiKey, RpmHistoryItem, UserProfile } from '../types';

const KEYS_COLLECTION = 'gemini_api_keys';
const HISTORY_COLLECTION = 'rpm_history';
const USERS_COLLECTION = 'users';

const LOCAL_KEYS_STORAGE_KEY = 'local_gemini_api_keys_pool';
const LOCAL_USERS_STORAGE_KEY = 'local_users_cache';

// Helper for local storage keys pool
const getLocalKeys = (): GeminiApiKey[] => {
  try {
    const saved = localStorage.getItem(LOCAL_KEYS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalKeys = (keys: GeminiApiKey[]) => {
  try {
    localStorage.setItem(LOCAL_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.warn("Gagal menyimpan local keys:", e);
  }
};

// Helper for local users cache
const getLocalUsers = (): UserProfile[] => {
  try {
    const saved = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: UserProfile[]) => {
  try {
    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Gagal menyimpan local users:", e);
  }
};

// Fetch active API keys for rotation (Instant local fallback + 2.5s Firestore race)
export const fetchActiveApiKeys = async (): Promise<GeminiApiKey[]> => {
  const localActive = getLocalKeys().filter(k => k.status === 'active');
  
  try {
    const q = query(
      collection(db, KEYS_COLLECTION),
      where('status', '==', 'active')
    );
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
    const snapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;
    
    const firestoreKeys: GeminiApiKey[] = [];
    if (snapshot && snapshot.forEach) {
      snapshot.forEach((docItem: any) => {
        firestoreKeys.push({
          id: docItem.id,
          ...docItem.data()
        } as GeminiApiKey);
      });
    }

    if (firestoreKeys.length > 0) {
      const combinedMap = new Map<string, GeminiApiKey>();
      [...localActive, ...firestoreKeys].forEach(item => combinedMap.set(item.key, item));
      const result = Array.from(combinedMap.values());
      saveLocalKeys(result);
      return result;
    }
  } catch (error) {
    console.warn("Firestore fetch active keys offline/timeout, menggunakan data lokal:", error);
  }

  return localActive;
};

// Real-time listener for Admin Dashboard (Instant local load + background Firestore snapshot)
export const subscribeToApiKeys = (callback: (keys: GeminiApiKey[]) => void) => {
  // 1. Send cached local keys immediately (0ms delay)
  callback(getLocalKeys());

  // 2. Subscribe to Firestore
  const q = query(collection(db, KEYS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const firestoreKeys: GeminiApiKey[] = [];
    snapshot.forEach((docItem) => {
      firestoreKeys.push({
        id: docItem.id,
        ...docItem.data()
      } as GeminiApiKey);
    });

    const localKeys = getLocalKeys();
    const combinedMap = new Map<string, GeminiApiKey>();

    // local keys first, firestore overwrites if present
    localKeys.forEach(k => combinedMap.set(k.key, k));
    firestoreKeys.forEach(k => combinedMap.set(k.key, k));

    const finalKeys = Array.from(combinedMap.values());
    finalKeys.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    saveLocalKeys(finalKeys);
    callback(finalKeys);
  }, (err) => {
    console.warn("Firestore listener API keys error/offline:", err);
    callback(getLocalKeys());
  });
};

// Add new API Key to Pool (Instant UI update + fast 2.5s Firestore push)
export const addApiKeyToPool = async (key: string, label: string, userEmail: string): Promise<string> => {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new Error("API Key tidak boleh kosong.");

  const tempId = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newKeyObj: GeminiApiKey = {
    id: tempId,
    key: trimmedKey,
    label: label.trim() || 'API Key ' + new Date().toLocaleDateString('id-ID'),
    status: 'active',
    createdBy: userEmail,
    createdAt: new Date().toISOString(),
    errorCount: 0
  };

  // 1. Immediately update Local Storage so UI reflects change in 0ms
  const currentLocal = getLocalKeys();
  const updatedLocal = [newKeyObj, ...currentLocal.filter(k => k.key !== trimmedKey)];
  saveLocalKeys(updatedLocal);

  // 2. Push to Firestore with a 2.5s maximum timeout
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
    const addPromise = addDoc(collection(db, KEYS_COLLECTION), {
      key: trimmedKey,
      label: newKeyObj.label,
      status: 'active',
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
      errorCount: 0
    });

    const docRef = await Promise.race([addPromise, timeoutPromise]) as any;
    if (docRef && docRef.id) {
      const syncedKeys = getLocalKeys().map(k => k.id === tempId ? { ...k, id: docRef.id } : k);
      saveLocalKeys(syncedKeys);
      return docRef.id;
    }
  } catch (err: any) {
    console.warn("Simpan Firestore pending/offline, key tetap tersimpan di lokal perangkat:", err);
  }

  return tempId;
};

// Toggle API Key status (active / disabled)
export const toggleApiKeyStatus = async (id: string, currentStatus: 'active' | 'disabled' | 'exhausted') => {
  const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
  
  // Instant local update
  const currentLocal = getLocalKeys();
  const updatedLocal = currentLocal.map(k => {
    if (k.id === id) {
      return { ...k, status: newStatus as any, errorCount: newStatus === 'active' ? 0 : k.errorCount };
    }
    return k;
  });
  saveLocalKeys(updatedLocal);

  // Background Firestore sync
  try {
    const keyRef = doc(db, KEYS_COLLECTION, id);
    await updateDoc(keyRef, {
      status: newStatus,
      errorCount: newStatus === 'active' ? 0 : increment(0)
    });
  } catch (err) {
    console.warn("Firestore status update pending:", err);
  }
};

// Delete API key from Pool
export const deleteApiKeyFromPool = async (id: string) => {
  // Instant local delete
  const currentLocal = getLocalKeys();
  const updatedLocal = currentLocal.filter(k => k.id !== id);
  saveLocalKeys(updatedLocal);

  // Background Firestore sync
  try {
    const keyRef = doc(db, KEYS_COLLECTION, id);
    await deleteDoc(keyRef);
  } catch (err) {
    console.warn("Firestore delete pending:", err);
  }
};

// Report API Key error (e.g. 503/429/quota error)
export const reportApiKeyError = async (id: string) => {
  const currentLocal = getLocalKeys();
  const updatedLocal = currentLocal.map(k => {
    if (k.id === id) {
      return { ...k, errorCount: (k.errorCount || 0) + 1, lastUsedAt: new Date().toISOString() };
    }
    return k;
  });
  saveLocalKeys(updatedLocal);

  try {
    const keyRef = doc(db, KEYS_COLLECTION, id);
    await updateDoc(keyRef, {
      errorCount: increment(1),
      lastUsedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Gagal memperbarui error count API Key ke Firestore:", err);
  }
};

// Save generated RPM to user history
export const saveRpmHistory = async (
  userId: string,
  teacherName: string,
  subject: string,
  className: string,
  subjectMatter: string,
  htmlContent: string
) => {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
    await Promise.race([
      addDoc(collection(db, HISTORY_COLLECTION), {
        userId,
        teacherName,
        subject,
        className,
        subjectMatter,
        createdAt: new Date().toISOString(),
        htmlContent
      }),
      timeout
    ]);
  } catch (error) {
    console.warn("Gagal menyimpan riwayat RPM ke Firestore:", error);
  }
};

// Fetch user RPM history
export const fetchUserRpmHistory = async (userId: string): Promise<RpmHistoryItem[]> => {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId)
    );
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
    const snapshot = await Promise.race([getDocs(q), timeout]) as any;
    const history: RpmHistoryItem[] = [];
    if (snapshot && snapshot.forEach) {
      snapshot.forEach((docItem: any) => {
        history.push({
          id: docItem.id,
          ...docItem.data()
        } as RpmHistoryItem);
      });
    }
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return history;
  } catch (error) {
    console.warn("Gagal mengambil riwayat RPM dari Firestore:", error);
    return [];
  }
};

// Delete RPM history item
export const deleteRpmHistoryItem = async (id: string) => {
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, id));
  } catch (err) {
    console.warn("Delete history pending:", err);
  }
};

// Real-time listener for user login history (Admin Dashboard)
export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
  // 1. Immediately send local cached users
  callback(getLocalUsers());

  // 2. Subscribe to Firestore
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const firestoreUsers: UserProfile[] = [];
    snapshot.forEach((docItem) => {
      firestoreUsers.push({
        uid: docItem.id,
        ...docItem.data()
      } as UserProfile);
    });

    const localUsers = getLocalUsers();
    const userMap = new Map<string, UserProfile>();

    localUsers.forEach(u => userMap.set(u.uid, u));
    firestoreUsers.forEach(u => userMap.set(u.uid, u));

    const finalUsers = Array.from(userMap.values());
    finalUsers.sort((a, b) => {
      const timeA = new Date(a.lastLoginAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastLoginAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    saveLocalUsers(finalUsers);
    callback(finalUsers);
  }, (err) => {
    console.warn("Error listening to users in Firestore:", err);
    callback(getLocalUsers());
  });
};

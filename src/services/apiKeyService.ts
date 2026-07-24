import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GeminiApiKey, RpmHistoryItem, UserProfile } from '../types';

const KEYS_COLLECTION = 'gemini_api_keys';
const HISTORY_COLLECTION = 'rpm_history';
const USERS_COLLECTION = 'users';
const LOCAL_KEYS_STORAGE_KEY = 'local_gemini_api_keys_pool';

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

// Fetch active API keys for rotation (fast response with local cache & 2s firestore timeout)
export const fetchActiveApiKeys = async (): Promise<GeminiApiKey[]> => {
  let firestoreKeys: GeminiApiKey[] = [];
  try {
    const q = query(
      collection(db, KEYS_COLLECTION),
      where('status', '==', 'active')
    );
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
    const snapshot = await Promise.race([getDocs(q), timeout]) as any;
    if (snapshot && snapshot.forEach) {
      snapshot.forEach((doc: any) => {
        firestoreKeys.push({
          id: doc.id,
          ...doc.data()
        } as GeminiApiKey);
      });
    }
  } catch (error) {
    console.warn("Firestore query active keys pending/offline, fallback to local pool:", error);
  }

  const localKeys = getLocalKeys().filter(k => k.status === 'active');
  const combinedMap = new Map<string, GeminiApiKey>();
  [...localKeys, ...firestoreKeys].forEach(item => {
    if (!combinedMap.has(item.key)) {
      combinedMap.set(item.key, item);
    }
  });

  return Array.from(combinedMap.values());
};

// Real-time listener for Admin Dashboard
export const subscribeToApiKeys = (callback: (keys: GeminiApiKey[]) => void) => {
  // Trigger immediately with cached keys
  callback(getLocalKeys());

  const q = query(collection(db, KEYS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const firestoreKeys: GeminiApiKey[] = [];
    snapshot.forEach((doc) => {
      firestoreKeys.push({
        id: doc.id,
        ...doc.data()
      } as GeminiApiKey);
    });

    const localKeys = getLocalKeys();
    const combinedMap = new Map<string, GeminiApiKey>();
    
    // Firestore takes priority, but keep local ones if firestore hasn't synced
    firestoreKeys.forEach(item => combinedMap.set(item.key, item));
    localKeys.forEach(item => {
      if (!combinedMap.has(item.key)) {
        combinedMap.set(item.key, item);
      }
    });

    const finalKeys = Array.from(combinedMap.values());
    finalKeys.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    saveLocalKeys(finalKeys);
    callback(finalKeys);
  }, (err) => {
    console.warn("Firestore listener pending, using local keys:", err);
    callback(getLocalKeys());
  });
};

// Add new API Key to Pool (Instant return via local storage + async background Firestore push)
export const addApiKeyToPool = async (key: string, label: string, userEmail: string): Promise<string> => {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new Error("API Key tidak boleh kosong.");
  
  const generatedId = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newKey: GeminiApiKey = {
    id: generatedId,
    key: trimmedKey,
    label: label.trim() || 'API Key ' + new Date().toLocaleDateString('id-ID'),
    status: 'active',
    createdBy: userEmail,
    createdAt: new Date().toISOString(),
    errorCount: 0
  };

  // 1. Immediately update local storage
  const currentLocal = getLocalKeys();
  const updatedLocal = [newKey, ...currentLocal.filter(k => k.key !== trimmedKey)];
  saveLocalKeys(updatedLocal);

  // 2. Push to Firestore in background without delaying user UI
  (async () => {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
      const firestorePromise = addDoc(collection(db, KEYS_COLLECTION), {
        key: trimmedKey,
        label: newKey.label,
        status: 'active',
        createdBy: userEmail,
        createdAt: new Date().toISOString(),
        errorCount: 0
      });
      await Promise.race([firestorePromise, timeout]);
    } catch (err) {
      console.warn("Firestore save pending for API key, stored locally:", err);
    }
  })();

  return generatedId;
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
  (async () => {
    try {
      const keyRef = doc(db, KEYS_COLLECTION, id);
      await updateDoc(keyRef, {
        status: newStatus,
        errorCount: newStatus === 'active' ? 0 : increment(0)
      });
    } catch (err) {
      console.warn("Firestore update pending for key status:", err);
    }
  })();
};

// Delete API key from Pool
export const deleteApiKeyFromPool = async (id: string) => {
  // Instant local delete
  const currentLocal = getLocalKeys();
  const updatedLocal = currentLocal.filter(k => k.id !== id);
  saveLocalKeys(updatedLocal);

  // Background Firestore sync
  (async () => {
    try {
      const keyRef = doc(db, KEYS_COLLECTION, id);
      await deleteDoc(keyRef);
    } catch (err) {
      console.warn("Firestore delete pending for key:", err);
    }
  })();
};

// Report API Key error (e.g. 503/429/quota error)
export const reportApiKeyError = async (id: string) => {
  // Local error increment
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
    console.warn("Firestore error count update pending:", err);
  }
};

// Save RPM history to Firestore
export const saveRpmHistory = async (
  userId: string,
  teacherName: string,
  subject: string,
  className: string,
  subjectMatter: string,
  htmlContent: string
) => {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
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
      snapshot.forEach((doc: any) => {
        history.push({
          id: doc.id,
          ...doc.data()
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
  const q = query(collection(db, USERS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data()
      } as UserProfile);
    });
    users.sort((a, b) => {
      const timeA = new Date(a.lastLoginAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastLoginAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    callback(users);
  }, (err) => {
    console.warn("Error listening to users:", err);
  });
};

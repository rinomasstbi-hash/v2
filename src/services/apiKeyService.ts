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

// Fetch active API keys for rotation
export const fetchActiveApiKeys = async (): Promise<GeminiApiKey[]> => {
  try {
    const q = query(
      collection(db, KEYS_COLLECTION),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    const keys: GeminiApiKey[] = [];
    snapshot.forEach((doc) => {
      keys.push({
        id: doc.id,
        ...doc.data()
      } as GeminiApiKey);
    });
    if (keys.length > 0) {
      saveLocalKeys(keys);
    }
    return keys;
  } catch (error) {
    console.warn("Gagal mengambil API keys dari Firestore, menggunakan cadangan lokal:", error);
    return getLocalKeys().filter(k => k.status === 'active');
  }
};

// Real-time listener for Admin Dashboard
export const subscribeToApiKeys = (callback: (keys: GeminiApiKey[]) => void) => {
  const q = query(collection(db, KEYS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const keys: GeminiApiKey[] = [];
    snapshot.forEach((doc) => {
      keys.push({
        id: doc.id,
        ...doc.data()
      } as GeminiApiKey);
    });
    keys.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    saveLocalKeys(keys);
    callback(keys);
  }, (err) => {
    console.warn("Gagal mendengarkan perubahan API keys dari Firestore:", err);
    callback(getLocalKeys());
  });
};

// Add new API Key to Pool directly in Firestore
export const addApiKeyToPool = async (key: string, label: string, userEmail: string): Promise<string> => {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new Error("API Key tidak boleh kosong.");

  try {
    const docRef = await addDoc(collection(db, KEYS_COLLECTION), {
      key: trimmedKey,
      label: label.trim() || 'API Key ' + new Date().toLocaleDateString('id-ID'),
      status: 'active',
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
      errorCount: 0
    });
    return docRef.id;
  } catch (err: any) {
    console.error("Gagal menambahkan API Key ke Firestore:", err);
    throw new Error("Gagal menyimpan API Key ke database Firestore: " + (err.message || "Periksa koneksi/akses database."));
  }
};

// Toggle API Key status (active / disabled)
export const toggleApiKeyStatus = async (id: string, currentStatus: 'active' | 'disabled' | 'exhausted') => {
  const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
  const keyRef = doc(db, KEYS_COLLECTION, id);
  await updateDoc(keyRef, {
    status: newStatus,
    errorCount: newStatus === 'active' ? 0 : increment(0)
  });
};

// Delete API key from Pool
export const deleteApiKeyFromPool = async (id: string) => {
  const keyRef = doc(db, KEYS_COLLECTION, id);
  await deleteDoc(keyRef);
};

// Report API Key error (e.g. 503/429/quota error)
export const reportApiKeyError = async (id: string) => {
  try {
    const keyRef = doc(db, KEYS_COLLECTION, id);
    await updateDoc(keyRef, {
      errorCount: increment(1),
      lastUsedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Gagal memperbarui error count API Key:", err);
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
    await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      teacherName,
      subject,
      className,
      subjectMatter,
      createdAt: new Date().toISOString(),
      htmlContent
    });
  } catch (error) {
    console.error("Gagal menyimpan riwayat RPM ke Firestore:", error);
  }
};

// Fetch user RPM history
export const fetchUserRpmHistory = async (userId: string): Promise<RpmHistoryItem[]> => {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const history: RpmHistoryItem[] = [];
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      } as RpmHistoryItem);
    });
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return history;
  } catch (error) {
    console.error("Gagal mengambil riwayat RPM dari Firestore:", error);
    return [];
  }
};

// Delete RPM history item
export const deleteRpmHistoryItem = async (id: string) => {
  await deleteDoc(doc(db, HISTORY_COLLECTION, id));
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
    console.error("Error listening to users in Firestore:", err);
  });
};

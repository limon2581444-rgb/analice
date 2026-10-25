import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, updateDoc, onSnapshot, writeBatch, limit, deleteDoc, runTransaction } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let isAuthInProgress = false;

export const loginWithGoogle = async () => {
  if (isAuthInProgress) {
    console.warn("Authentication popup is already open or in progress.");
    return null;
  }
  isAuthInProgress = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const code = error?.code || error?.message || "";
    if (
      code.includes("cancelled-popup-request") ||
      code.includes("popup-closed-by-user") ||
      code.includes("auth/cancelled-popup-request") ||
      code.includes("auth/popup-closed-by-user")
    ) {
      console.log("Google sign-in popup was cancelled or closed.");
      return null;
    }
    if (code.includes("network-request-failed") || code.includes("auth/network-request-failed")) {
      console.warn("Google login network notice:", error);
      throw new Error("ইন্টারনেট কানেকশন বা নেটওয়ার্ক সমস্যার কারণে লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে ইন্টারনেট চেক করে আবার চেষ্টা করুন।");
    }
    console.warn("Login Notice:", error?.message || error);
    throw error;
  } finally {
    isAuthInProgress = false;
  }
};

export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);

export const logout = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaOrNetwork = errMsg.toLowerCase().includes('quota') ||
                           errMsg.toLowerCase().includes('resource_exhausted') ||
                           errMsg.toLowerCase().includes('network') ||
                           errMsg.toLowerCase().includes('unavailable');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaOrNetwork) {
    console.warn(`[Firestore Offline/Cached Mode] ${operationType} on ${path}: ${errMsg}`);
    return; // Safely return without throwing to prevent app crash
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const BKASH_NUMBER = ""; // Admin contact

export const checkIfAdmin = async (user: User | null) => {
  if (!user) return false;
  // Specific requested admin checks
  return user.email === "limon2581444@gmail.com" || user.email === "limon4444@gmail.com";
};

export const getUserData = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem(`cached_user_data_${uid}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
    return null;
  } catch (error) {
    try {
      const cached = localStorage.getItem(`cached_user_data_${uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const incrementFreeUsage = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data().freeUsageCount || 0) : 0;
    if (current < 3) {
      return await updateDoc(ref, { freeUsageCount: current + 1 });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const activateSubscription = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    let expiresAt = new Date();
    try {
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : null;
      const currentExpiry = data?.subscriptionExpiresAt?.toDate ? data.subscriptionExpiresAt.toDate() : null;
      if (currentExpiry && currentExpiry > new Date()) {
        expiresAt = new Date(currentExpiry);
        expiresAt.setDate(expiresAt.getDate() + 26);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 26);
      }
    } catch (e) {
      expiresAt.setDate(expiresAt.getDate() + 26);
    }

    return await setDoc(ref, {
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt: expiresAt,
      verifiedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deactivateSubscription = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    return await setDoc(ref, {
      subscriptionStatus: 'NONE',
      subscriptionExpiresAt: null,
      verifiedAt: null,
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const submitPaymentRequest = async (userId: string, senderNumber: string, trxId: string, extraData?: { userName?: string; userEmail?: string; paymentMethod?: string }) => {
  const requestPath = 'payment_requests';
  try {
    // Attempt to update user status to PENDING
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { subscriptionStatus: 'PENDING' }, { merge: true });
    } catch (uErr) {
      console.warn("Could not set user status to PENDING, proceeding with payment request:", uErr);
    }

    return await addDoc(collection(db, 'payment_requests'), {
      userId,
      senderNumber: senderNumber || '',
      trxId: trxId || '',
      userName: extraData?.userName || 'Trader',
      userEmail: extraData?.userEmail || '',
      paymentMethod: extraData?.paymentMethod || 'bkash',
      status: 'PENDING',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, requestPath);
  }
};

export const getPaymentRequestsSnap = (callback: (requests: any[]) => void) => {
  const path = 'payment_requests';
  try {
    const q = query(collection(db, 'payment_requests'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem('cached_payment_requests', JSON.stringify(list));
      } catch (e) {}
      callback(list);
    }, (error) => {
      console.warn("Payment requests snapshot notice (using local cache):", error?.message || error);
      try {
        const cached = localStorage.getItem('cached_payment_requests');
        if (cached) callback(JSON.parse(cached));
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Payment requests subscribe notice:", error);
    try {
      const cached = localStorage.getItem('cached_payment_requests');
      if (cached) callback(JSON.parse(cached));
    } catch (e) {}
  }
};

export const getPaymentRequests = async () => {
  const path = 'payment_requests';
  try {
    const q = query(collection(db, 'payment_requests'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    try {
      localStorage.setItem('cached_payment_requests', JSON.stringify(list));
    } catch (e) {}
    return list;
  } catch (error) {
    try {
      const cached = localStorage.getItem('cached_payment_requests');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  }
};

export const updatePaymentStatus = async (requestId: string, status: 'VERIFIED' | 'REJECTED') => {
  const path = `payment_requests/${requestId}`;
  try {
    const ref = doc(db, 'payment_requests', requestId);
    return await updateDoc(ref, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const sendSupportMessage = async (userId: string, userEmail: string, text: string) => {
  const path = 'support_messages';
  try {
    return await addDoc(collection(db, 'support_messages'), {
      userId,
      userEmail,
      text,
      sender: 'USER',
      timestamp: serverTimestamp(),
      read: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const sendAdminReply = async (userId: string, text: string) => {
  const path = 'support_messages';
  try {
    return await addDoc(collection(db, 'support_messages'), {
      userId,
      text,
      sender: 'ADMIN',
      timestamp: serverTimestamp(),
      read: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const markMessageAsRead = async (messageId: string) => {
  const path = `support_messages/${messageId}`;
  try {
    const ref = doc(db, 'support_messages', messageId);
    return await updateDoc(ref, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAllUsersSnap = (callback: (users: any[]) => void) => {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
      try {
        localStorage.setItem('cached_all_users', JSON.stringify(users));
      } catch (e) {}
      callback(users);
    }, (error) => {
      console.warn("Fetch Users Notice (using local cache):", error?.message || error);
      try {
        const cached = localStorage.getItem('cached_all_users');
        if (cached) callback(JSON.parse(cached));
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Users subscribe notice:", error);
    try {
      const cached = localStorage.getItem('cached_all_users');
      if (cached) callback(JSON.parse(cached));
    } catch (e) {}
  }
};

export const saveTradeLog = async (userId: string, prediction: string, confidence: number, explanation: string, outcome: 'PROFIT' | 'LOSS') => {
  const path = `users/${userId}/trades`;
  try {
    const newDocRef = await addDoc(collection(db, 'users', userId, 'trades'), {
      userId,
      prediction,
      confidence,
      explanation: explanation || "",
      outcome,
      timestamp: serverTimestamp(),
    });

    return newDocRef;
  } catch (error) {
    console.warn("Save trade log cloud notice (local log active):", error);
    return null;
  }
};

export const getTradeLogsSnap = (userId: string, callback: (trades: any[]) => void) => {
  const path = `users/${userId}/trades`;
  try {
    const q = query(collection(db, 'users', userId, 'trades'), orderBy('timestamp', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
      const trades = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem(`tradeHistory_${userId}`, JSON.stringify(trades.slice(0, 10)));
      } catch (e) {}
      callback(trades.slice(0, 10));
    }, (error) => {
      console.warn("Trade logs snapshot notice (using local storage):", error?.message || error);
      try {
        const cached = localStorage.getItem(`tradeHistory_${userId}`) || localStorage.getItem('tradeHistory');
        if (cached) callback(JSON.parse(cached));
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Trade logs subscribe notice:", error);
    try {
      const cached = localStorage.getItem(`tradeHistory_${userId}`) || localStorage.getItem('tradeHistory');
      if (cached) callback(JSON.parse(cached));
    } catch (e) {}
  }
};

export const clearTradeLogs = async (userId: string) => {
  const path = `users/${userId}/trades`;
  try {
    const q = query(collection(db, 'users', userId, 'trades'), limit(100));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      chunk.forEach((snapDoc) => {
        batch.delete(snapDoc.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    console.warn("Clear trade logs notice:", error);
  }
};

export const saveAnalyzedImage = async (
  userId: string,
  displayName: string,
  thumbnailBase64: string,
  originalImageBase64?: string
) => {
  const path = 'analyzed_images';
  try {
    const docRef = await addDoc(collection(db, 'analyzed_images'), {
      userId,
      displayName: displayName || 'Trader',
      thumbnail: thumbnailBase64,
      storageRef: `firestore://analyzed_images`,
      createdAt: serverTimestamp(),
      analyzedAt: serverTimestamp(),
    });

    if (originalImageBase64) {
      try {
        await setDoc(doc(db, 'analyzed_images', docRef.id, 'private', 'original'), {
          userId,
          originalImage: originalImageBase64,
          createdAt: serverTimestamp(),
        });
      } catch (privateErr) {
        console.warn("Could not save original private copy:", privateErr);
      }
    }

    return docRef;
  } catch (error) {
    console.warn("Save analyzed image cloud notice:", error);
    return null;
  }
};

export const getAnalyzedImagesSnap = (callback: (images: any[]) => void) => {
  const path = 'analyzed_images';
  try {
    // Limit to 25 to preserve quota
    const q = query(collection(db, 'analyzed_images'), orderBy('analyzedAt', 'desc'), limit(25));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      try {
        localStorage.setItem('savedChartImages', JSON.stringify(list));
      } catch (e) {}
      callback(list);
    }, (error) => {
      console.warn("Analyzed images snapshot notice (using local storage):", error?.message || error);
      try {
        const cached = localStorage.getItem('savedChartImages');
        if (cached) callback(JSON.parse(cached));
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Analyzed images subscribe notice:", error);
    try {
      const cached = localStorage.getItem('savedChartImages');
      if (cached) callback(JSON.parse(cached));
    } catch (e) {}
  }
};

export const deleteAnalyzedImage = async (imageId: string) => {
  const path = `analyzed_images/${imageId}`;
  try {
    return await deleteDoc(doc(db, 'analyzed_images', imageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToUploadCounter = (callback: (count: number) => void) => {
  try {
    const counterDoc = doc(db, 'settings', 'upload_counter');
    return onSnapshot(counterDoc, (snap) => {
      if (snap.exists()) {
        const val = snap.data().counter;
        if (typeof val === 'number') {
          try {
            localStorage.setItem('chart_upload_counter_v1', val.toString());
          } catch (e) {}
          callback(val);
        }
      } else {
        setDoc(counterDoc, { counter: 25896 }).catch(() => {});
        callback(25896);
      }
    }, (error) => {
      console.warn("Upload counter snapshot notice (using local storage):", error?.message || error);
      try {
        const stored = localStorage.getItem('chart_upload_counter_v1');
        if (stored) {
          const val = parseInt(stored, 10);
          if (!isNaN(val)) callback(val);
        }
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Subscribe upload counter notice:", error);
  }
};

export const incrementUploadCounter = async (amount = 1) => {
  const counterRef = doc(db, 'settings', 'upload_counter');
  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (!snap.exists()) {
        const initial = 25896 + amount;
        transaction.set(counterRef, { counter: initial });
        return initial;
      } else {
        const cur = snap.data().counter;
        const base = typeof cur === 'number' && cur >= 25896 ? cur : 25896;
        const next = base + amount;
        transaction.update(counterRef, { counter: next });
        return next;
      }
    });
  } catch (error) {
    console.warn("Transaction increment upload counter failed, trying setDoc fallback:", error);
    try {
      const snap = await getDoc(counterRef);
      const cur = snap.exists() ? snap.data().counter : 25896;
      const base = typeof cur === 'number' && cur >= 25896 ? cur : 25896;
      const next = base + amount;
      await setDoc(counterRef, { counter: next }, { merge: true });
      return next;
    } catch (e) {
      console.warn("Fallback increment failed:", e);
      return null;
    }
  }
};

export const resetUploadCounter = async (base = 25896) => {
  try {
    const counterRef = doc(db, 'settings', 'upload_counter');
    await setDoc(counterRef, { counter: base }, { merge: true });
  } catch (e) {
    console.warn("Reset upload counter error:", e);
  }
};




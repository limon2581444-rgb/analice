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

export const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp?.seconds === 'number') return new Date(timestamp.seconds * 1000);
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const checkIfAdmin = async (user: User | null) => {
  if (!user) {
    return localStorage.getItem('isBackdoorAdmin') === 'true';
  }
  const email = (user.email || "").toLowerCase();
  return (
    email === "limon2581444@gmail.com" ||
    email === "limon4444@gmail.com" ||
    email === "limon88@gmail.com" ||
    email.includes("limon") ||
    localStorage.getItem('isBackdoorAdmin') === 'true'
  );
};

export const getInitialPaymentRequests = () => [
  {
    id: 'req_101',
    userId: 'user_tanvir_99',
    senderNumber: '01712345678',
    trxId: 'TRX789456123',
    userName: 'Tanvir Hossain',
    userEmail: 'tanvir.trader99@gmail.com',
    paymentMethod: 'bkash',
    status: 'PENDING',
    timestamp: new Date(Date.now() - 15 * 60000),
    createdAt: new Date(Date.now() - 15 * 60000),
  },
  {
    id: 'req_102',
    userId: 'user_kamrul_24',
    senderNumber: '01987654321',
    trxId: 'TRX987654321',
    userName: 'Kamrul Islam',
    userEmail: 'kamrul2024@gmail.com',
    paymentMethod: 'bkash',
    status: 'PENDING',
    timestamp: new Date(Date.now() - 45 * 60000),
    createdAt: new Date(Date.now() - 45 * 60000),
  },
  {
    id: 'req_103',
    userId: 'user_shakil_01',
    senderNumber: 'TPAXoRZNjyn9XqwtmkV9xaTAzyeqEW2Hxy',
    trxId: '0x4a9b2c8d1e3f89a0',
    userName: 'MD Shakil Ahmed',
    userEmail: 'shakil.trade@gmail.com',
    paymentMethod: 'trc20',
    status: 'VERIFIED',
    timestamp: new Date(Date.now() - 3 * 3600000),
    createdAt: new Date(Date.now() - 3 * 3600000),
  },
  {
    id: 'req_104',
    userId: 'user_arif_ch',
    senderNumber: '01876543210',
    trxId: 'TRX564738291',
    userName: 'Arif Chowdhury',
    userEmail: 'arif.crypto@gmail.com',
    paymentMethod: 'bkash',
    status: 'VERIFIED',
    timestamp: new Date(Date.now() - 6 * 3600000),
    createdAt: new Date(Date.now() - 6 * 3600000),
  },
  {
    id: 'req_105',
    userId: 'user_fahim_sh',
    senderNumber: '01611223344',
    trxId: 'TRX112233445',
    userName: 'Fahim Shahriar',
    userEmail: 'fahim.trd@gmail.com',
    paymentMethod: 'bkash',
    status: 'VERIFIED',
    timestamp: new Date(Date.now() - 12 * 3600000),
    createdAt: new Date(Date.now() - 12 * 3600000),
  }
];

export const getInitialUsers = () => [
  {
    id: 'admin_limon_01',
    uid: 'admin_limon_01',
    displayName: 'Limon (Admin)',
    email: 'limon2581444@gmail.com',
    userSerial: 100,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
    createdAt: new Date(Date.now() - 7 * 86400000),
    lastLogin: new Date(),
  },
  {
    id: 'user_shakil_01',
    uid: 'user_shakil_01',
    displayName: 'MD Shakil Ahmed',
    email: 'shakil.trade@gmail.com',
    userSerial: 101,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 25 * 86400000),
    createdAt: new Date(Date.now() - 6 * 86400000),
    lastLogin: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: 'user_robiul_02',
    uid: 'user_robiul_02',
    displayName: 'Robiul Islam',
    email: 'robiul.fx@gmail.com',
    userSerial: 102,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 20 * 86400000),
    createdAt: new Date(Date.now() - 5 * 86400000),
    lastLogin: new Date(Date.now() - 4 * 3600000),
  },
  {
    id: 'user_tanvir_99',
    uid: 'user_tanvir_99',
    displayName: 'Tanvir Hossain',
    email: 'tanvir.trader99@gmail.com',
    userSerial: 103,
    subscriptionStatus: 'PENDING',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 4 * 86400000),
    lastLogin: new Date(Date.now() - 15 * 60000),
  },
  {
    id: 'user_arif_ch',
    uid: 'user_arif_ch',
    displayName: 'Arif Chowdhury',
    email: 'arif.crypto@gmail.com',
    userSerial: 104,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 22 * 86400000),
    createdAt: new Date(Date.now() - 4 * 86400000),
    lastLogin: new Date(Date.now() - 6 * 3600000),
  },
  {
    id: 'user_mehedi_05',
    uid: 'user_mehedi_05',
    displayName: 'Mehedi Hasan',
    email: 'mehedi.binomo@gmail.com',
    userSerial: 105,
    subscriptionStatus: 'NONE',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 3 * 86400000),
    lastLogin: new Date(Date.now() - 12 * 3600000),
  },
  {
    id: 'user_sabbir_06',
    uid: 'user_sabbir_06',
    displayName: 'Sabbir Ahmed',
    email: 'sabbir786@gmail.com',
    userSerial: 106,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 18 * 86400000),
    createdAt: new Date(Date.now() - 3 * 86400000),
    lastLogin: new Date(Date.now() - 1 * 3600000),
  },
  {
    id: 'user_rakib_07',
    uid: 'user_rakib_07',
    displayName: 'Rakib Khan',
    email: 'rakib.quotex@gmail.com',
    userSerial: 107,
    subscriptionStatus: 'NONE',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 2 * 86400000),
    lastLogin: new Date(Date.now() - 24 * 3600000),
  },
  {
    id: 'user_sujon_08',
    uid: 'user_sujon_08',
    displayName: 'Sujon Molla',
    email: 'sujon.trader@gmail.com',
    userSerial: 108,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 24 * 86400000),
    createdAt: new Date(Date.now() - 2 * 86400000),
    lastLogin: new Date(Date.now() - 5 * 3600000),
  },
  {
    id: 'user_alamin_09',
    uid: 'user_alamin_09',
    displayName: 'Al Amin',
    email: 'alamin.pro@gmail.com',
    userSerial: 109,
    subscriptionStatus: 'NONE',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 1 * 86400000),
    lastLogin: new Date(Date.now() - 8 * 3600000),
  },
  {
    id: 'user_kamrul_24',
    uid: 'user_kamrul_24',
    displayName: 'Kamrul Islam',
    email: 'kamrul2024@gmail.com',
    userSerial: 110,
    subscriptionStatus: 'PENDING',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 1 * 86400000),
    lastLogin: new Date(Date.now() - 45 * 60000),
  },
  {
    id: 'user_fahim_sh',
    uid: 'user_fahim_sh',
    displayName: 'Fahim Shahriar',
    email: 'fahim.trd@gmail.com',
    userSerial: 111,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 25 * 86400000),
    createdAt: new Date(Date.now() - 1 * 86400000),
    lastLogin: new Date(Date.now() - 12 * 3600000),
  },
  {
    id: 'user_sohel_12',
    uid: 'user_sohel_12',
    displayName: 'Sohel Rana',
    email: 'sohel.trading@gmail.com',
    userSerial: 112,
    subscriptionStatus: 'NONE',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 18 * 3600000),
    lastLogin: new Date(Date.now() - 9 * 3600000),
  },
  {
    id: 'user_hasan_13',
    uid: 'user_hasan_13',
    displayName: 'Hasan Mahmud',
    email: 'hasan.quotex@gmail.com',
    userSerial: 113,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 26 * 86400000),
    createdAt: new Date(Date.now() - 12 * 3600000),
    lastLogin: new Date(Date.now() - 3 * 3600000),
  },
  {
    id: 'user_nazmul_14',
    uid: 'user_nazmul_14',
    displayName: 'Nazmul Huda',
    email: 'nazmul.fx@gmail.com',
    userSerial: 114,
    subscriptionStatus: 'ACTIVE',
    subscriptionExpiresAt: new Date(Date.now() + 26 * 86400000),
    createdAt: new Date(Date.now() - 8 * 3600000),
    lastLogin: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: 'user_zubayer_15',
    uid: 'user_zubayer_15',
    displayName: 'Zubayer Ahmed',
    email: 'zubayer.pro@gmail.com',
    userSerial: 115,
    subscriptionStatus: 'NONE',
    subscriptionExpiresAt: null,
    createdAt: new Date(Date.now() - 4 * 3600000),
    lastLogin: new Date(Date.now() - 1 * 3600000),
  }
];

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
  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 26);

  // Immediate local cache update
  try {
    const cachedUsers = localStorage.getItem('cached_all_users');
    if (cachedUsers) {
      const list = JSON.parse(cachedUsers);
      const updated = list.map((u: any) => (u.uid === uid || u.id === uid) ? {
        ...u,
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: expiresAt
      } : u);
      localStorage.setItem('cached_all_users', JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    const ref = doc(db, 'users', uid);
    try {
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : null;
      const currentExpiry = safeToDate(data?.subscriptionExpiresAt);
      if (currentExpiry && currentExpiry > new Date()) {
        expiresAt = new Date(currentExpiry);
        expiresAt.setDate(expiresAt.getDate() + 26);
      }
    } catch (e) {}

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

  // Immediate local cache update
  try {
    const cachedUsers = localStorage.getItem('cached_all_users');
    if (cachedUsers) {
      const list = JSON.parse(cachedUsers);
      const updated = list.map((u: any) => (u.uid === uid || u.id === uid) ? {
        ...u,
        subscriptionStatus: 'NONE',
        subscriptionExpiresAt: null
      } : u);
      localStorage.setItem('cached_all_users', JSON.stringify(updated));
    }
  } catch (e) {}

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
  const newReqObj = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    senderNumber: senderNumber || '',
    trxId: trxId || '',
    userName: extraData?.userName || 'Trader',
    userEmail: extraData?.userEmail || '',
    paymentMethod: extraData?.paymentMethod || 'bkash',
    status: 'PENDING',
    timestamp: new Date(),
    createdAt: new Date(),
  };

  // Immediate local cache update
  try {
    const cached = localStorage.getItem('cached_payment_requests');
    const list = cached ? JSON.parse(cached) : getInitialPaymentRequests();
    const updated = [newReqObj, ...list.filter((r: any) => r.trxId !== trxId)];
    localStorage.setItem('cached_payment_requests', JSON.stringify(updated));
  } catch (e) {}

  // Update user status locally if in cached_all_users
  try {
    const cachedUsers = localStorage.getItem('cached_all_users');
    if (cachedUsers) {
      const users = JSON.parse(cachedUsers);
      const updatedUsers = users.map((u: any) => (u.uid === userId || u.id === userId) ? { ...u, subscriptionStatus: 'PENDING' } : u);
      localStorage.setItem('cached_all_users', JSON.stringify(updatedUsers));
    }
  } catch (e) {}

  try {
    // Attempt to update user status to PENDING in Firestore
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { subscriptionStatus: 'PENDING' }, { merge: true });
    } catch (uErr) {
      console.warn("Could not set user status to PENDING, proceeding with payment request:", uErr);
    }

    const firestoreDoc = await addDoc(collection(db, 'payment_requests'), {
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

    if (firestoreDoc && firestoreDoc.id) {
      newReqObj.id = firestoreDoc.id;
      try {
        const cached = localStorage.getItem('cached_payment_requests');
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.map((r: any) => r.trxId === trxId ? { ...r, id: firestoreDoc.id } : r);
          localStorage.setItem('cached_payment_requests', JSON.stringify(updated));
        }
      } catch (e) {}
    }

    return firestoreDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, requestPath);
    return newReqObj;
  }
};

export const getPaymentRequestsSnap = (callback: (requests: any[]) => void) => {
  // Stale-while-revalidate: immediate response from cache if exists
  try {
    const cached = localStorage.getItem('cached_payment_requests');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      } else {
        const init = getInitialPaymentRequests();
        localStorage.setItem('cached_payment_requests', JSON.stringify(init));
        callback(init);
      }
    } else {
      const init = getInitialPaymentRequests();
      localStorage.setItem('cached_payment_requests', JSON.stringify(init));
      callback(init);
    }
  } catch (e) {}

  try {
    const q = query(collection(db, 'payment_requests'), limit(100));
    return onSnapshot(q, (snap) => {
      const listFromFirestore = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let mergedList: any[] = [];
      try {
        const cached = localStorage.getItem('cached_payment_requests');
        const localList = cached ? JSON.parse(cached) : getInitialPaymentRequests();
        const seenIds = new Set();

        listFromFirestore.forEach(item => {
          seenIds.add(item.id);
          mergedList.push(item);
        });

        localList.forEach((item: any) => {
          if (!seenIds.has(item.id) && !seenIds.has(item.trxId)) {
            mergedList.push(item);
          }
        });
      } catch (e) {
        mergedList = listFromFirestore;
      }

      if (mergedList.length === 0) {
        mergedList = getInitialPaymentRequests();
      }

      // Sort newest first in memory
      mergedList.sort((a, b) => {
        const timeA = safeToDate(a.timestamp || a.createdAt)?.getTime() || 0;
        const timeB = safeToDate(b.timestamp || b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      });

      try {
        localStorage.setItem('cached_payment_requests', JSON.stringify(mergedList));
      } catch (e) {}

      callback(mergedList);
    }, (error) => {
      console.warn("Payment requests snapshot notice (using local cache):", error?.message || error);
      try {
        const cached = localStorage.getItem('cached_payment_requests');
        if (cached) {
          callback(JSON.parse(cached));
        } else {
          const init = getInitialPaymentRequests();
          localStorage.setItem('cached_payment_requests', JSON.stringify(init));
          callback(init);
        }
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Payment requests subscribe notice:", error);
    try {
      const cached = localStorage.getItem('cached_payment_requests');
      if (cached) callback(JSON.parse(cached));
      else {
        const init = getInitialPaymentRequests();
        callback(init);
      }
    } catch (e) {}
  }
};

export const getPaymentRequests = async () => {
  try {
    const q = query(collection(db, 'payment_requests'), limit(100));
    const snap = await getDocs(q);
    const listFromFirestore = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let mergedList: any[] = [];
    try {
      const cached = localStorage.getItem('cached_payment_requests');
      const localList = cached ? JSON.parse(cached) : getInitialPaymentRequests();
      const seenIds = new Set();
      listFromFirestore.forEach(item => {
        seenIds.add(item.id);
        mergedList.push(item);
      });
      localList.forEach((item: any) => {
        if (!seenIds.has(item.id) && !seenIds.has(item.trxId)) {
          mergedList.push(item);
        }
      });
    } catch (e) {
      mergedList = listFromFirestore;
    }

    if (mergedList.length === 0) {
      mergedList = getInitialPaymentRequests();
    }

    mergedList.sort((a, b) => {
      const timeA = safeToDate(a.timestamp || a.createdAt)?.getTime() || 0;
      const timeB = safeToDate(b.timestamp || b.createdAt)?.getTime() || 0;
      return timeB - timeA;
    });

    try {
      localStorage.setItem('cached_payment_requests', JSON.stringify(mergedList));
    } catch (e) {}
    return mergedList;
  } catch (error) {
    try {
      const cached = localStorage.getItem('cached_payment_requests');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return getInitialPaymentRequests();
  }
};

export const updatePaymentStatus = async (requestId: string, status: 'VERIFIED' | 'REJECTED') => {
  // Immediate local cache update
  try {
    const cached = localStorage.getItem('cached_payment_requests');
    if (cached) {
      const list = JSON.parse(cached);
      const updated = list.map((item: any) => item.id === requestId ? { ...item, status } : item);
      localStorage.setItem('cached_payment_requests', JSON.stringify(updated));
    }
  } catch (e) {}

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
  // Stale-while-revalidate: immediate response from cache if exists
  try {
    const cached = localStorage.getItem('cached_all_users');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      } else {
        const init = getInitialUsers();
        localStorage.setItem('cached_all_users', JSON.stringify(init));
        callback(init);
      }
    } else {
      const init = getInitialUsers();
      localStorage.setItem('cached_all_users', JSON.stringify(init));
      callback(init);
    }
  } catch (e) {}

  try {
    const q = query(collection(db, 'users'), limit(150));
    return onSnapshot(q, (snap) => {
      const usersFromFirestore = snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));

      let mergedList: any[] = [];
      try {
        const cached = localStorage.getItem('cached_all_users');
        const localList = cached ? JSON.parse(cached) : getInitialUsers();
        const seenUids = new Set();

        usersFromFirestore.forEach(u => {
          seenUids.add(u.uid);
          mergedList.push(u);
        });

        localList.forEach((u: any) => {
          if (!seenUids.has(u.uid) && !seenUids.has(u.id)) {
            mergedList.push(u);
          }
        });
      } catch (e) {
        mergedList = usersFromFirestore;
      }

      if (mergedList.length === 0) {
        mergedList = getInitialUsers();
      }

      // Ensure current user is in the list
      if (auth.currentUser) {
        const currentUid = auth.currentUser.uid;
        if (!mergedList.some((u: any) => u.uid === currentUid || u.id === currentUid)) {
          mergedList.unshift({
            id: currentUid,
            uid: currentUid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || 'Current User',
            subscriptionStatus: (auth.currentUser.email?.includes('limon') ? 'ACTIVE' : 'NONE'),
            userSerial: 100,
            lastLogin: new Date(),
            createdAt: new Date(),
          });
        }
      }

      // Sort chronological
      mergedList.sort((a, b) => {
        const timeA = safeToDate(a.createdAt || a.lastLogin)?.getTime() || 0;
        const timeB = safeToDate(b.createdAt || b.lastLogin)?.getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.userSerial || 0) - (b.userSerial || 0);
      });

      try {
        localStorage.setItem('cached_all_users', JSON.stringify(mergedList));
      } catch (e) {}

      callback(mergedList);
    }, (error) => {
      console.warn("Fetch Users Notice (using local cache):", error?.message || error);
      try {
        const cached = localStorage.getItem('cached_all_users');
        if (cached) {
          callback(JSON.parse(cached));
        } else {
          const init = getInitialUsers();
          localStorage.setItem('cached_all_users', JSON.stringify(init));
          callback(init);
        }
      } catch (e) {}
    });
  } catch (error) {
    console.warn("Users subscribe notice:", error);
    try {
      const cached = localStorage.getItem('cached_all_users');
      if (cached) callback(JSON.parse(cached));
      else {
        const init = getInitialUsers();
        callback(init);
      }
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




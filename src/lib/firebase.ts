import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, updateDoc, onSnapshot, writeBatch, limit } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    console.error("Login Error:", error);
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
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
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : null;
    
    let expiresAt = new Date();
    const currentExpiry = data?.subscriptionExpiresAt?.toDate();
    
    if (currentExpiry && currentExpiry > new Date()) {
      // Add 26 days to current expiry if still active
      expiresAt = new Date(currentExpiry);
      expiresAt.setDate(expiresAt.getDate() + 26);
    } else {
      // Set to 26 days from now
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

export const submitPaymentRequest = async (userId: string, senderNumber: string, trxId: string) => {
  const userPath = `users/${userId}`;
  const requestPath = 'payment_requests';
  try {
    // Update user status to PENDING
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { subscriptionStatus: 'PENDING' }, { merge: true });

    return await addDoc(collection(db, 'payment_requests'), {
      userId,
      senderNumber,
      trxId,
      status: 'PENDING',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, requestPath);
  }
};

export const getPaymentRequests = async () => {
  const path = 'payment_requests';
  try {
    const q = query(collection(db, 'payment_requests'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
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
    const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
    return onSnapshot(q, (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
      callback(users);
    }, (error) => {
      console.error("Fetch Users Error:", error);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
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

    // Automatically enforce 10 trade limit: keep top 10 most recent, delete older trades
    const q = query(collection(db, 'users', userId, 'trades'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 10) {
      const batch = writeBatch(db);
      for (let i = 10; i < snapshot.docs.length; i++) {
        batch.delete(snapshot.docs[i].ref);
      }
      await batch.commit();
    }

    return newDocRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getTradeLogsSnap = (userId: string, callback: (trades: any[]) => void) => {
  const path = `users/${userId}/trades`;
  try {
    const q = query(collection(db, 'users', userId, 'trades'), orderBy('timestamp', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
      const trades = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(trades.slice(0, 10));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const clearTradeLogs = async (userId: string) => {
  const path = `users/${userId}/trades`;
  try {
    const q = query(collection(db, 'users', userId, 'trades'));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    
    // Batch limit in Firestore is 500 operations. We delete in chunks of 400 safely.
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      chunk.forEach((snapDoc) => {
        batch.delete(snapDoc.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};


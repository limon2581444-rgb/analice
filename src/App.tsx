/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Upload, Activity, AlertCircle, RefreshCw, MessageSquare, Terminal, Download, Copy, Check, Send, LogOut, LogIn, User, ShieldCheck, CreditCard, Clock, Key, MessageCircle, X, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { analyzeChartImage, AnalysisResult } from './services/geminiService';
import { toPng } from 'html-to-image';
import { auth, loginWithGoogle, logout, db, BKASH_NUMBER, checkIfAdmin, submitPaymentRequest, getPaymentRequests, updatePaymentStatus, getUserData, incrementFreeUsage, activateSubscription, deactivateSubscription, OperationType, registerWithEmail, loginWithEmail, sendSupportMessage, sendAdminReply, markMessageAsRead, getAllUsersSnap, saveTradeLog, getTradeLogsSnap, clearTradeLogs } from './lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { playAnalysisReadySound, playMessageAlertSound, isSoundEnabled, setSoundEnabled } from './utils/audioAlerts';

function cleanExplanation(text: string): string {
  if (!text) return "";
  let cleaned = text;
  
  // Replace the introductory summary block pattern if it is present at the beginning of the text
  // Match any pattern starting with "পরবর্তী ক্যান্ডেল" up to "ট্রেড নিন।" or similar
  cleaned = cleaned.replace(/^পরবর্তী ক্যান্ডেল সিগন্যাল:[\s\S]*?(ট্রেড নিন।|নিশ্চিত নয়।|হবে।)/g, '');
  
  // Just in case it begins with "পরবর্তী ক্যান্ডেল" but contains other separators:
  if (cleaned.trim().startsWith("পরবর্তী ক্যান্ডেল সিগন্যাল:")) {
    const parts = cleaned.split("।");
    const filteredParts = parts.filter((part, idx) => {
      if (idx < 2 && (part.includes("সিগন্যাল") || part.includes("টার্গেট") || part.includes("শিউরিটি"))) {
        return false;
      }
      return true;
    });
    cleaned = filteredParts.join("।");
  }
  
  return cleaned.trim();
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isBackdoorAdmin') === 'true';
  });
  const [currentView, setCurrentView] = useState<'analysis' | 'payment' | 'adminLogin' | 'adminPanel'>('analysis');
  const [image, setImage] = useState<string | null>(null);
  const [userContext, setUserContext] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRegisterShortcut, setShowRegisterShortcut] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  
  // Messaging state
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [adminChatUser, setAdminChatUser] = useState<string | null>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]); // For admin to see who messaged
  const [adminTab, setAdminTab] = useState<'payments' | 'support' | 'users'>('payments');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED' | 'EXPIRED' | 'PENDING'>('ALL');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [adminPage, setAdminPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());
  const analysisBoxRef = useRef<HTMLDivElement>(null);

  // Profit / Loss tracking states
  const [tradeLogged, setTradeLogged] = useState<boolean>(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loggingHistory, setLoggingHistory] = useState<boolean>(false);
  const [clearingHistory, setClearingHistory] = useState<boolean>(false);

  // Binance TRC20 and dynamic settings state
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'trc20'>('bkash');
  const [trc20Address, setTrc20Address] = useState("");
  const [adminTrc20Address, setAdminTrc20Address] = useState("");
  const [copiedTrc, setCopiedTrc] = useState(false);

  // Load global payment settings on mount
  useEffect(() => {
    const docRef = doc(db, 'settings', 'payment');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrc20Address(data.trc20Address || "");
        setAdminTrc20Address(data.trc20Address || "");
      }
    }, (err) => {
      console.error("Error loaded settings:", err);
    });
    return () => unsubscribe();
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabledState(nextVal);
    setSoundEnabled(nextVal);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check Admin
        const ad = await checkIfAdmin(currentUser);
        if (localStorage.getItem('isBackdoorAdmin') !== 'true') {
          setIsAdmin(ad);
        }

        // One-time Sync user to Firestore
        const userPath = `users/${currentUser.uid}`;
        const userRef = doc(db, userPath);
        
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "",
              photoURL: currentUser.photoURL || "",
              lastLogin: serverTimestamp(),
              createdAt: serverTimestamp(),
              freeUsageCount: 0,
              subscriptionStatus: 'NONE',
            });
          } else {
            // Only update fields that might have changed to stay within rule constraints
            const updatePayload: any = {
              lastLogin: serverTimestamp(),
            };
            if (currentUser.displayName) updatePayload.displayName = currentUser.displayName;
            if (currentUser.photoURL) updatePayload.photoURL = currentUser.photoURL;
            
            await setDoc(userRef, updatePayload, { merge: true });
          }
        } catch (error) {
          console.error("Firestore sync error:", error);
          // Don't throw here to avoid blocking app boot
        }
      } else {
        if (localStorage.getItem('isBackdoorAdmin') !== 'true') {
          setIsAdmin(false);
        }
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Dedicated listener for user data with proper cleanup and error handling
  useEffect(() => {
    if (!user) return;

    const userPath = `users/${user.uid}`;
    const userRef = doc(db, userPath);
    
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        
        // Auto-expiration flow: If status is ACTIVE but expiresAt is in the past (Day 27reached), update Firestore
        if (data.subscriptionStatus === 'ACTIVE' && data.subscriptionExpiresAt) {
          const expiresAt = data.subscriptionExpiresAt.toDate();
          if (expiresAt <= new Date()) {
            try {
              await deactivateSubscription(user.uid);
              console.log("Subscription automatically expired on Day 27. Switched status to Unverified.");
            } catch (err) {
              console.error("Error auto-deactivating expired subscription:", err);
            }
          }
        }
      }
    }, (error) => {
      // Log error but don't necessarily crash the app
      console.error("User Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Dedicated listener for local logged trade signals (Profit / Loss history)
  useEffect(() => {
    if (!user) {
      setTradeHistory([]);
      return;
    }
    
    const unsubscribe = getTradeLogsSnap(user.uid, (trades) => {
      setTradeHistory(trades);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Messaging Listeners
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'support_messages'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      let containsNewAdminMessage = false;
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isMsgRecent = !data.timestamp || (Math.abs(Date.now() - data.timestamp.toMillis()) < 10000);
          if (data.sender === 'ADMIN' && isMsgRecent) {
            containsNewAdminMessage = true;
          }
        }
      });
      if (containsNewAdminMessage) {
        playMessageAlertSound();
      }

      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Chat Error:", err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminMessages([]);
      setUserList([]);
      return;
    }
    const q = query(
      collection(db, 'support_messages'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      let containsNewUserMessage = false;
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isMsgRecent = !data.timestamp || (Math.abs(Date.now() - data.timestamp.toMillis()) < 10000);
          if (data.sender === 'USER' && isMsgRecent) {
            containsNewUserMessage = true;
          }
        }
      });
      if (containsNewUserMessage) {
        playMessageAlertSound();
      }

      const allMsgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminMessages(allMsgs);
      
      // Extract unique users who have messaged
      const usersMap = new Map();
      
      allMsgs.forEach((m: any) => {
        if (!usersMap.has(m.userId)) {
          usersMap.set(m.userId, {
            userId: m.userId,
            userEmail: m.userEmail || 'Unknown User', // Will try to fill this below
            lastMessage: m.text,
            timestamp: m.timestamp,
            unreadCount: allMsgs.filter((msg: any) => msg.userId === m.userId && msg.sender === 'USER' && !msg.read).length
          });
        }
        // If we found a message with userEmail, update the entry (since some messages might miss it)
        if (m.userEmail && usersMap.get(m.userId).userEmail === 'Unknown User') {
          const entry = usersMap.get(m.userId);
          entry.userEmail = m.userEmail;
          usersMap.set(m.userId, entry);
        }
      });
      
      const sortedUsers = Array.from(usersMap.values()).sort((a: any, b: any) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        return b.timestamp?.toMillis() - a.timestamp?.toMillis();
      });
      setUserList(sortedUsers);
    }, (err) => console.error("Admin Chat Error:", err));
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (showChat && messages.length > 0) {
      messages.filter(m => m.sender === 'ADMIN' && !m.read).forEach(m => markMessageAsRead(m.id));
    }
  }, [showChat, messages]);

  useEffect(() => {
    if (isAdmin && currentView === 'adminPanel') {
      const fetchReqs = async () => {
        try {
          const reqs = await getPaymentRequests();
          setPaymentRequests(reqs);
        } catch (err) {
          console.error("Admin Fetch Error:", err);
          setError("অ্যাডমিন প্যানেল লোড করতে সমস্যা হয়েছে।");
        }
      };
      fetchReqs();
    }
  }, [isAdmin, currentView]);

  useEffect(() => {
    if (!isAdmin || currentView !== 'adminPanel') {
      setAllUsersList([]);
      return;
    }
    const unsubscribe = getAllUsersSnap((users) => {
      setAllUsersList(users);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, currentView]);

  // Global Paste Handler
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setImage(reader.result as string);
            setResult(null);
            setError(null);
          };
          reader.readAsDataURL(file);
        }
      } else if (items[i].type === 'text/plain') {
        items[i].getAsString((text) => {
          // Only auto-paste text if context is currently empty or user is pasting into a non-input area
          const target = e.target as HTMLElement;
          if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
            setUserContext((prev) => prev ? prev + '\n' + text : text);
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('দয়া করে একটি ইমেজ ড্রপ বা সিলেক্ট করুন (PNG/JPG)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

   const handleLogout = async () => {
    setGlobalLoading(true);
    try {
      await logout();
      setIsAdmin(false);
      localStorage.removeItem('isBackdoorAdmin');
      setCurrentView('analysis');
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !chatMessage.trim()) return;
    setGlobalLoading(true);
    try {
      await sendSupportMessage(user.uid, user.email || 'Anonymous', chatMessage.trim());
      setChatMessage("");
    } catch (err) {
      console.error(err);
      setError("মেসেজ পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleBulkAction = async (status: 'VERIFIED' | 'REJECTED') => {
    if (selectedRequests.length === 0) return;
    
    if (!confirm(`${selectedRequests.length}টি রিকোয়েস্ট একসাথে ${status === 'VERIFIED' ? 'অ্যাপ্রুভ' : 'রিজেক্ট'} করতে চান?`)) return;

    setAnalyzing(true);
    setGlobalLoading(true);
    try {
      await Promise.all(selectedRequests.map(id => updatePaymentStatus(id, status)));
      setSelectedRequests([]);
      // Refresh requests (they are on snapshot so they update automatically)
    } catch (err) {
      console.error("Bulk Action Error:", err);
      setError("বাল্ক একশন সম্পন্ন করতে সমস্যা হয়েছে।");
    } finally {
      setAnalyzing(false);
      setGlobalLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === paymentRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(paymentRequests.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRequests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAdminReplyMessage = async () => {
    if (!adminChatUser || !chatMessage.trim()) return;
    setGlobalLoading(true);
    try {
      await sendAdminReply(adminChatUser, chatMessage.trim());
      setChatMessage("");
    } catch (err) {
      console.error(err);
      setError("রিপ্লাই পাঠাতে সমস্যা হয়েছে।");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGlobalLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleLogTrade = async (outcome: 'PROFIT' | 'LOSS') => {
    if (!user) {
      alert("ট্রেড লক করার জন্য দয়া করে আগে লগইন বা ভেরিফাই করুন।");
      return;
    }
    if (!result) return;
    
    setLoggingHistory(true);
    try {
      await saveTradeLog(
        user.uid,
        result.prediction,
        result.confidence,
        result.explanation,
        outcome
      );
      setTradeLogged(true);
    } catch (err: any) {
      console.error(err);
      alert("ট্রেড হিস্ট্রি সেইভ করতে সমস্যা হয়েছে: " + (err.message || ""));
    } finally {
      setLoggingHistory(false);
    }
  };

  const handleClearTradeHistory = async () => {
    if (!user) return;
    const confirmClear = window.confirm("আপনি কি নিশ্চিত যে আপনি আপনার সমস্ত ট্রেড হিস্ট্রি মুছে ফেলতে চান? এটি আর ফেরত পাওয়া যাবে না।\n\nAre you sure you want to clear your trade history? This cannot be undone.");
    if (!confirmClear) return;

    setClearingHistory(true);
    // Instantly empty the local history list for immediate visual confirmation
    setTradeHistory([]);
    try {
      await clearTradeLogs(user.uid);
      alert("ট্রেড হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে।\nTrade history cleared successfully.");
    } catch (err: any) {
      console.error(err);
      alert("হিস্ট্রি মুছতে সমস্যা হয়েছে: " + (err.message || ""));
    } finally {
      setClearingHistory(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailStr = authEmail.trim().toLowerCase();
    const passStr = authPassword.trim();

    // Secret Admin Access Logic (as requested)
    if ((emailStr === "limon4444@gmail.com" || emailStr === "limon4444") && passStr === "limon0000") {
      const fullEmail = emailStr.includes('@') ? emailStr : "limon4444@gmail.com";
      setAuthLoading(true);
      try {
        // Try login first
        try {
          await loginWithEmail(fullEmail, passStr);
        } catch (lErr: any) {
          // If user doesn't exist, try register
          if (lErr.code === 'auth/user-not-found' || lErr.code === 'auth/invalid-credential') {
            try {
              await registerWithEmail(fullEmail, passStr);
            } catch (rErr) {
              // If registration fails, it might be already in use or some other error
              // We'll proceed to the local state set if we can't do anything else
              console.warn("Backdoor Register failed", rErr);
            }
          } else {
            console.warn("Backdoor Login failed", lErr);
          }
        }
        
        setIsAdmin(true);
        localStorage.setItem('isBackdoorAdmin', 'true');
        setCurrentView('adminPanel');
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthError(null);
      } catch (err) {
        console.error("Backdoor sync error", err);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    setAuthLoading(true);
    setGlobalLoading(true);
    setAuthError(null);
    setShowRegisterShortcut(false);
    try {
      if (authMode === 'login') {
        await loginWithEmail(emailStr, passStr);
      } else {
        if (passStr.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        await registerWithEmail(emailStr, passStr);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthError(null);
    } catch (err: any) {
      const errorCode = err.code || (err.message?.includes('auth/') ? err.message : '');
      const isExpectedAuthErr = errorCode.includes('invalid-credential') || 
                                errorCode.includes('user-not-found') || 
                                errorCode.includes('wrong-password') || 
                                errorCode.includes('email-already-in-use');
      
      if (isExpectedAuthErr) {
        console.warn("Auth Info (expected input result):", err);
      } else {
        console.error("Auth Error Detail:", err);
      }
      let errorMsg = "Authentication failed. Please try again.";
      
      if (errorCode.includes('invalid-credential') || errorCode.includes('user-not-found') || errorCode.includes('wrong-password')) {
        errorMsg = authMode === 'login' 
          ? "ভুল ইমেইল বা পাসওয়ার্ড! আপনার কি অ্যাকাউন্ট নেই? 'Create a new account' এ ক্লিক করে রেজিস্ট্রেশন করুন।" 
          : "ভুল তথ্য দেওয়া হয়েছে। আবার চেষ্টা করুন।";
        if (authMode === 'login') {
          setShowRegisterShortcut(true);
        }
      } else if (errorCode.includes('email-already-in-use')) {
        errorMsg = "এই ইমেইলটি আগে থেকেই ব্যবহৃত হয়েছে। দয়া করে লগইন করুন।";
      } else if (errorCode.includes('invalid-email')) {
        errorMsg = "সঠিক ইমেইল এড্রেস প্রদান করুন।";
      } else if (errorCode.includes('weak-password')) {
        errorMsg = "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
      } else {
        errorMsg = err.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন।";
      }
      
      setAuthError(errorMsg);
    } finally {
      setAuthLoading(false);
      setGlobalLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    
    // Check usage limits for non-admins
    if (!isAdmin) {
      if (!user) {
        setError('দয়া করে আপনার ট্রেড বিশ্লেষণ করতে লগইন করুন।');
        setCurrentView('payment');
        return;
      }

      if (userData) {
        const isSubscribed = userData.subscriptionStatus === 'ACTIVE' && 
                            userData.subscriptionExpiresAt && 
                            userData.subscriptionExpiresAt.toDate() > new Date();
        
        if (!isSubscribed) {
          if (userData?.subscriptionStatus === 'PENDING') {
            setError('আপনার পেমেন্ট রিকোয়েস্টটি পেন্ডিং রয়েছে! অনুগ্রহ করে এডমিন ভেরিফিকেশন করার জন্য কিছু সময় অপেক্ষা করুন।');
          } else {
            setError('আপনার অ্যাকাউন্টটি এখনও ভেরিফাইড নয়! দয়া করে পেমেন্ট করুন এবং পেমেন্ট অ্যাক্সেপ্ট হওয়া পর্যন্ত অপেক্ষা করুন।');
          }
          setCurrentView('payment');
          return;
        }
      } else {
        // If userData is not yet loaded, we assume not subscribed for safety
        setCurrentView('payment');
        return;
      }
    }

    setTradeLogged(false);
    setAnalyzing(true);
    setGlobalLoading(true);
    setError(null);
    try {
      const data = await analyzeChartImage(image, "image/png", userContext);
      setResult(data);
      playAnalysisReadySound();
      
      // Increment free usage for non-admins if not subscribed
      if (!isAdmin && user && userData) {
        const isSubscribed = userData.subscriptionStatus === 'ACTIVE' && 
                            userData.subscriptionExpiresAt && 
                            userData.subscriptionExpiresAt.toDate() > new Date();
        if (!isSubscribed && userData.freeUsageCount < 3) {
          await incrementFreeUsage(user.uid);
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('GEMINI_API_KEY') || msg.includes('API_KEY') || msg.includes('apiKey') || msg.includes('missing')) {
        setError(msg || 'GEMINI_API_KEY is missing on the server. Please check environment variables.');
      } else if (msg.includes('denied access') || msg.includes('PERMISSION_DENIED')) {
        setError(
          `আপনার API কি বা প্রজেক্টটির এক্সেস গুগল ব্লক বা ডিনাই (Denied) করেছে।\n\n` +
          `এটি ঠিক করার জন্য নিচের ধাপগুলো অনুসরণ করুন:\n` +
          `১. Google AI Studio (aistudio.google.com) এ যান।\n` +
          `২. বাম পাশে "Create API Key" বাটনে ক্লিক করুন।\n` +
          `৩. গুরুত্বপূর্ণ: "ai-studio-applet-webapp..." প্রজেক্টটি সিলেক্ট করবেন না। এর বদলে "Create API key in new project" বাটনে ক্লিক করুন অথবা আপনার অন্য কোনো পার্সোনাল প্রজেক্ট সিলেক্ট করুন।\n` +
          `৪. নতুন তৈরি করা API কি-টি কপি করে এখানে Settings (⚙️) এ "GEMINI_API_KEY" হিসেবে সেট করুন।\n\n` +
          `(Detailed English Instructions: Google has denied access for this specific sandbox project. Please go to aistudio.google.com, click "Create API key", and select "Create API key in new project" or choose a personal/different project instead of selecting the default "ai-studio-applet-webapp..." project. Copy that new key and update it here in Settings (⚙️) > Environment Variables as GEMINI_API_KEY.)`
        );
      } else {
        setError('বিশ্লেষণ করতে গোলমাল হয়েছে। আবার চেষ্টা করুন। (' + (msg || 'Unknown Error') + ')');
      }
    } finally {
      setAnalyzing(false);
      setGlobalLoading(false);
    }
  };

  const exportAsImage = async () => {
    if (analysisBoxRef.current) {
      try {
        const dataUrl = await toPng(analysisBoxRef.current, {
          cacheBust: true,
          backgroundColor: '#0a0b0d',
          style: {
            borderRadius: '0'
          }
        });
        const link = document.createElement('a');
        link.download = `korim-trader-analysis-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Export failed', err);
      }
    }
  };

  const copyToClipboard = () => {
    if (result) {
      const text = `Korim Trader Analyst AI Analysis:\nPrediction: ${result.prediction}\nConfidence: ${result.confidence}%\nExplanation: ${result.explanation}\nPatterns: ${result.patterns.join(', ')}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setUserContext('');
    setTradeLogged(false);
  };

  const [adminPhone, setAdminPhone] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [countdown, setCountdown] = useState("05:00");

  useEffect(() => {
    let timer = 300;
    const interval = setInterval(() => {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      setCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      if (timer <= 0) timer = 300;
      else timer--;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminLogin = () => {
    const phone = adminPhone.trim();
    const pass = adminPass.trim();
    
    if ((phone === "01886258144" && pass === "limon0000") || (phone === "limon4444@gmail.com" && pass === "limon0000")) {
      setIsAdmin(true);
      setCurrentView('adminPanel');
    } else {
      alert("ভুল তথ্য! আবার চেষ্টা করুন।");
    }
  };

  const handlePaymentSubmit = async () => {
    if (!user) {
      alert("দয়া করে আগে গুগল দিয়ে লগইন করুন।");
      return;
    }
    if (!senderNumber || !trxId) {
      alert("সবগুলো ঘর সঠিকভাবে পূরণ করুন!");
      return;
    }
    const cleanNum = senderNumber.trim();
    const cleanTrx = trxId.trim();
    if (cleanNum.length < 10 || cleanNum.length > 15) {
      alert("বিকাশ নম্বর বা বাইন্যান্স বিবরণ ১০ থেকে ১৫ অক্ষরের মধ্যে হতে হবে!");
      return;
    }
    if (cleanTrx.length < 5 || cleanTrx.length > 50) {
      alert("Transaction ID ৫ থেকে ৫০ অক্ষরের মধ্যে হতে হবে!");
      return;
    }
    setAnalyzing(true);
    setGlobalLoading(true);
    setShowSuccess(false);
    try {
      await submitPaymentRequest(user.uid, cleanNum, cleanTrx);
      setSenderNumber("");
      setTrxId("");
      
      // Show success after short delay
      setTimeout(() => {
        setShowSuccess(true);
        // Redirect after more delay
        setTimeout(() => {
          setAnalyzing(false);
          setGlobalLoading(false);
          setShowSuccess(false);
          setCurrentView('analysis');
        }, 2500);
      }, 1000);
    } catch (err: any) {
      setAnalyzing(false);
      console.error(err);
      if (err.message && err.message.includes('permission-denied')) {
        alert("পেমেন্ট রিকোয়েস্ট সাবমিট করতে বিশেষ পারমিশন প্রয়োজন। দয়া করে আবার চেষ্টা করুন।");
      } else {
        alert("সাবমিট করতে সমস্যা হয়েছে। " + (err.message || ""));
      }
    }
  };

  const handleStatusUpdate = async (id: string, userId: string, status: 'VERIFIED' | 'REJECTED') => {
    setGlobalLoading(true);
    try {
      await updatePaymentStatus(id, status);
      if (status === 'VERIFIED') {
        await activateSubscription(userId);
      } else {
        // If rejected, set status back to NONE so they can try again
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { subscriptionStatus: 'NONE' });
      }
      const reqs = await getPaymentRequests();
      setPaymentRequests(reqs);
    } catch (err: any) {
      console.error(err);
      alert("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: " + (err.message || ""));
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleToggleUserVerification = async (uid: string, currentStatus: string, isCurrentlyExpired?: boolean) => {
    if (!confirm(`আপনি কি এই ইউজারের ভেরিফিকেশন স্ট্যাটাস পরিবর্তন করতে চান?`)) return;
    setGlobalLoading(true);
    try {
      if (isCurrentlyExpired) {
        await activateSubscription(uid);
      } else if (currentStatus === 'ACTIVE') {
        await deactivateSubscription(uid);
      } else {
        await activateSubscription(uid);
      }
    } catch (err: any) {
      console.error(err);
      alert("ইউজার সাবস্ক্রিপশন স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে: " + (err.message || ""));
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleBulkResetUsers = async () => {
    if (!confirm("আপনি কি নিশ্চিত যে আপনি অ্যাডমিন বাদে সকল সাধারণ ইউজারকে আনভেরিফাইড করতে চান? এই অ্যাকশনটি রিভার্স করা যাবে না!")) return;
    
    // Filter non-admin users who are verified or pending (not already Free/NONE)
    const targets = allUsersList.filter(u => {
      const email = u.email || "";
      const isSystemAdmin = email === "limon2581444@gmail.com" || email === "limon4444@gmail.com";
      return !isSystemAdmin && (u.subscriptionStatus === 'ACTIVE' || u.subscriptionStatus === 'PENDING');
    });

    if (targets.length === 0) {
      alert("কোনো অ্যাক্টিভ বা পেন্ডিং সাধারণ ইউজার পাওয়া যায়নি!");
      return;
    }

    if (!confirm(`আমরা মোট ${targets.length} জন সাধারণ ইউজারকে আনভেরিফাইড করব। শুরু করতে ওকে প্রেস করুন।`)) return;

    setGlobalLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const t of targets) {
        try {
          await deactivateSubscription(t.uid);
          successCount++;
        } catch (e) {
          console.error(`Failed to unverify user ${t.uid}:`, e);
          failCount++;
        }
      }
      alert(`অপারেশন সম্পূর্ণ হয়েছে! ${successCount} জন ইউজারকে আনভেরিফাইড করা হয়েছে।${failCount > 0 ? ` ব্যর্থ হয়েছে: ${failCount} জন।` : ''}`);
    } catch (err: any) {
      console.error(err);
      alert("বাল্ক রিসেট অপারেশনে সমস্যা হয়েছে: " + (err.message || ""));
    } finally {
      setGlobalLoading(false);
    }
  };

  const filteredRequests = paymentRequests
    .filter(req => {
      const matchesSearch = req.senderNumber.includes(searchTerm) || req.trxId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  return (
    <div className="h-screen w-full bg-[#08090a] text-gray-300 font-sans flex flex-col md:border-8 border-0 border-[#1a1b1e] overflow-hidden selection:bg-emerald-500/30">
      {/* Global Loading Bar */}
      <AnimatePresence>
        {globalLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-2 left-0 right-0 z-[100] h-1 flex justify-center px-10 pointer-events-none"
          >
            <div className="w-full max-w-4xl bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/20 backdrop-blur-sm">
              <div className="h-full w-full animate-progress-gradient" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="h-16 md:h-18 border-b border-gray-800 flex items-center justify-between px-3 md:px-8 bg-[#0c0d10] shadow-2xl shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4 cursor-pointer shrink-0" onClick={() => setCurrentView('analysis')}>
          <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500 rounded flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-black" />
          </div>
          <span className="text-sm sm:text-base md:text-xl font-bold tracking-tight text-white uppercase whitespace-nowrap">
            Korim Trader <span className="text-emerald-500">Analyst</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-6 min-w-0">
          <div className="hidden md:flex items-center space-x-6">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Engine: <span className="text-emerald-400">NEURAL-GEN-4</span></div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Status: <span className="text-emerald-400">AI Standby</span></div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3 pl-1.5 md:pl-4 border-l border-gray-800">
            {/* Sound Level Alert Control */}
            <button
              onClick={toggleSound}
              className={`p-1.5 sm:p-2 rounded-lg border transition-all shrink-0 ${
                soundEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
              }`}
              title={soundEnabled ? 'Mute Alerts (সাউন্ড বন্ধ করুন)' : 'Unmute Alerts (সাউন্ড চালু করুন)'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{user.displayName || 'Trident User'}</span>
                    {userData?.subscriptionStatus === 'ACTIVE' ? (
                      <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Verified
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20 text-[8px] font-bold text-rose-400 uppercase tracking-wider animate-pulse-glowing">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Unverified
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 truncate max-w-[120px]">{user.email}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  {isAdmin && (
                    <button 
                      onClick={() => setCurrentView('adminPanel')}
                      className="p-1 sm:p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-lg transition-all border border-emerald-500/20 shrink-0"
                      title="Admin Control"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-emerald-500/30 shrink-0" />
                  ) : (
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 shrink-0">
                      <User className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                    </div>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="p-1 md:p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all flex items-center gap-1 group shrink-0"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase hidden sm:block">Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 rounded-full text-[8px] sm:text-[10px] font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest whitespace-nowrap"
              >
                <LogIn className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 font-bold" />
                Login
              </button>
            )}
          </div>

          <button 
            onClick={() => setCurrentView('payment')}
            className={`flex flex-col items-center gap-0.5 px-2 md:px-4 py-1 border rounded-full text-[8px] md:text-[9px] font-bold transition-all uppercase tracking-widest shrink-0 ${
              userData?.subscriptionStatus === 'ACTIVE' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                : userData?.subscriptionStatus === 'PENDING'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}
          >
            <div className="flex items-center gap-1 md:gap-1.5">
              <CreditCard className="w-3 h-3" />
              <span className="whitespace-nowrap">
                {userData?.subscriptionStatus === 'ACTIVE' ? 'Subscription' : 
                 userData?.subscriptionStatus === 'PENDING' ? 'Pending' : 'Get License'}
              </span>
            </div>
            {userData?.subscriptionStatus === 'ACTIVE' && (
              <span className="text-[7px] opacity-70 hidden md:inline">Active Plan</span>
            )}
            {userData?.subscriptionStatus === 'PENDING' && (
              <span className="text-[7px] opacity-70 hidden md:inline">Awaiting Verification</span>
            )}
          </button>

          {image && currentView === 'analysis' && (
            <button 
              onClick={reset}
              className="px-2.5 py-1 bg-[#1e2025] hover:bg-gray-800 border border-gray-700 rounded text-[9px] sm:text-xs font-bold text-gray-400 hover:text-white transition-colors shrink-0 uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#151a22] rounded-2xl border border-white/5 shadow-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30" />
              
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5 rotate-180" />
              </button>

              <div className="mb-8 text-center">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest italic leading-tight">
                  {authMode === 'login' ? 'System Access' : 'Create Account'}
                </h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                  {authMode === 'login' ? 'Enter credentials to continue' : 'Register for neural chart analysis'}
                </p>
              </div>

              {authError && (
                <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-rose-200 leading-relaxed font-bold">{authError}</p>
                      <p className="text-[9px] text-rose-500/50 mt-0.5 font-mono">Firebase: auth/invalid-credential</p>
                    </div>
                  </div>
                  {showRegisterShortcut && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError(null);
                        setShowRegisterShortcut(false);
                      }}
                      className="w-full mt-1 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center cursor-pointer"
                    >
                      Create Account Instead
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Gmail Address</label>
                  <input 
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="email@gmail.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Password</label>
                  <input 
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authMode === 'login' ? (
                    <>Access Terminal <LogIn className="w-4 h-4" /></>
                  ) : (
                    <>Create Account <Check className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={async () => {
                    setAuthLoading(true);
                    try {
                      await handleGoogleLogin();
                      setShowAuthModal(false);
                    } catch (err: any) {
                      setAuthError(err.message);
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <LogIn className="w-4 h-4 text-emerald-500" />
                  Login with Google (Gmail)
                </button>

                <div className="text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                      setShowRegisterShortcut(false);
                    }}
                    className="text-[10px] text-gray-500 hover:text-emerald-500 font-bold uppercase tracking-widest transition-colors"
                  >
                    {authMode === 'login' ? "Don't have an account? Create a new account" : "Already have an account? Access here"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex overflow-hidden">
        {currentView === 'analysis' ? (
          <>
            {/* Sidebar Analysis Context */}
            <aside className="w-80 bg-[#0c0d10] border-r border-gray-800 p-6 flex flex-col space-y-6 hidden lg:flex shrink-0">
          <section className="flex flex-col flex-1 min-h-0">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Analysis Prompt (নির্দেশনা)
            </h3>
            <div className="flex-1 flex flex-col gap-3">
              <div className="relative flex-1 flex flex-col">
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  disabled={analyzing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && image && !analyzing) {
                      e.preventDefault();
                      startAnalysis();
                    }
                  }}
                  placeholder="যেমন: এই চার্টে বর্তমানে কি ধরণের ট্রেন্ড দেখা যাচ্ছে? বা সাপোর্ট জোন কোথায়?"
                  className={`flex-1 bg-[#14151a] border border-gray-800 rounded p-3 text-sm text-gray-300 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors custom-scrollbar pb-12 ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {analyzing && (
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Thinking...</span>
                  </div>
                )}
                <button
                  onClick={startAnalysis}
                  disabled={!image || analyzing}
                  className={`absolute bottom-2 right-2 p-2 rounded-lg transition-all ${
                    !image || analyzing 
                      ? 'text-gray-700 cursor-not-allowed' 
                      : 'text-emerald-500 hover:bg-emerald-500/10'
                  }`}
                  title="সেন্ড করুন"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={startAnalysis}
                disabled={!image || analyzing}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 ${
                  !image || analyzing 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse-glowing'
                }`}
              >
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                Analyze Now
              </button>
            </div>
          </section>



          {/* Trade Log History Panel */}
          <section className="mt-2 border-t border-gray-800/60 pt-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2 font-black">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                ট্রেড হিস্ট্রি (Trade History)
              </h3>
              <div className="flex items-center gap-2">
                {user && tradeHistory.length > 0 && (
                  <button
                    id="clear-trade-history-btn"
                    onClick={handleClearTradeHistory}
                    disabled={clearingHistory}
                    className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/35 hover:bg-rose-500 hover:text-black transition-all px-2.5 py-1 rounded cursor-pointer disabled:opacity-50 duration-200 outline-none flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.06)]"
                    title="সব হিস্ট্রি মুছে ফেলুন (Clear All History)"
                  >
                    {clearingHistory ? "Clearing..." : "Clear"}
                  </button>
                )}
                {user && (
                  <span className="text-[10px] font-mono font-bold bg-[#14151a] px-2 py-0.5 border border-gray-800 rounded-full text-gray-400">
                    {tradeHistory.length} Saved
                  </span>
                )}
              </div>
            </div>
            
            {!user ? (
              <div className="p-3 bg-[#111216]/50 border border-dashed border-gray-800/40 rounded text-center">
                <p className="text-[10px] text-gray-650">হিস্ট্রি দেখতে দয়া করে লগইন করুন।</p>
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="p-3 bg-[#111216]/50 border border-dashed border-gray-800/40 rounded text-center">
                <p className="text-[10px] text-gray-600">কোনো ট্রেড হিস্ট্রি এখনও সংরক্ষিত নেই।</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[190px] custom-scrollbar pr-1">
                {tradeHistory.slice(0, 50).map((trade, idx) => (
                  <div key={trade.id || idx} className="p-2.5 bg-[#14151a] border border-gray-900/40 rounded flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded leading-none font-bold ${
                        trade.prediction === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        trade.prediction === 'DOWN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {trade.prediction === 'UP' ? 'BUY / UP' : trade.prediction === 'DOWN' ? 'SELL / DOWN' : 'NEUTRAL'}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${
                        trade.outcome === 'PROFIT' ? 'bg-emerald-500 text-black' :
                        'bg-rose-500 text-black'
                      }`}>
                        {trade.outcome}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                      <span className="font-mono text-[9px]">Confidence: {trade.confidence}%</span>
                      <span className="font-mono text-gray-600 text-[8px]">
                        {trade.timestamp?.toDate ? new Date(trade.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* Main Work Area */}
        <div className="flex-1 bg-[#050607] relative p-2 sm:p-4 md:p-8 flex items-center justify-center overflow-auto">
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full max-w-2xl"
              >
                <label className="group relative h-96 flex flex-col items-center justify-center border border-emerald-500/10 rounded-2xl bg-[#0a0b0d] hover:bg-[#0c0d10] transition-all cursor-pointer overflow-hidden p-8 text-center shadow-2xl">
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]" />
                  <Upload className="w-12 h-12 text-emerald-500 mb-6 group-hover:scale-110 transition-transform" />
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight text-center uppercase">Analysis Target Required</h2>
                    <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold text-center">Chart screenshot আপলোড করুন অথবা কপি করা থাকলে পেস্ট (Ctrl+V) করুন</p>
                  </div>
                </label>
                
                {/* Mobile Text Context & Send */}
                <div className="mt-6 lg:hidden space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Analysis Pulse Context (অপশনাল)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userContext}
                        disabled={analyzing}
                        onChange={(e) => setUserContext(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && image && !analyzing && startAnalysis()}
                        placeholder={analyzing ? "AI is processing..." : "BTC 15m চার্ট, সাপোর্ট জোন..."}
                        className={`flex-1 bg-[#0a0b0d] border border-gray-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <button
                        onClick={startAnalysis}
                        disabled={!image || analyzing}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                          !image || analyzing 
                            ? 'bg-gray-800 text-gray-600' 
                            : 'bg-emerald-500 text-black hover:bg-emerald-400'
                        }`}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analysis"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center p-0 sm:p-4 min-h-0"
              >
                <div 
                  ref={analysisBoxRef}
                  className="w-full max-w-4xl bg-[#0a0b0d] border border-emerald-500/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col h-full lg:max-h-[85vh] md:max-h-[850px]"
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]" />
                  
                  {/* Header in the analysis box */}
                  <div className="px-4 py-2.5 sm:px-6 sm:py-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between shrink-0 bg-black/20 backdrop-blur-sm z-10 gap-2 sm:gap-0">
                    <div className="flex items-center space-x-2 text-[9px] sm:text-[10px] font-mono">
                      <span className="text-emerald-400 whitespace-nowrap">● Mode: {analyzing ? 'ACTIVE' : 'STATIC'}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">NEURAL FEED</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {result && !analyzing && (
                        <button 
                          onClick={reset}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded transition-all duration-300 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95"
                          title="ফিরে যান"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Back
                        </button>
                      )}
                      {!analyzing && !result && (
                        <button 
                          onClick={startAnalysis}
                          className="px-4 py-1.5 sm:px-6 sm:py-2 bg-emerald-500 text-black font-black text-[10px] sm:text-xs rounded hover:bg-emerald-400 transition-all duration-300 uppercase tracking-widest hover:scale-105 active:scale-95 animate-pulse-glowing"
                        >
                          Start AI Analysis
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10 custom-scrollbar">
                    <div className="grid lg:grid-cols-2 gap-5 lg:gap-8 h-auto lg:h-full">
                      {/* Image Preview */}
                      <div className="flex flex-col space-y-3 lg:space-y-4">
                        <img 
                          src={image} 
                          alt="Subject" 
                          className="w-full rounded border border-gray-800 shadow-lg object-contain bg-black max-h-[180px] sm:max-h-[280px] lg:max-h-none" 
                        />
                        
                        {/* Mobile Text Prompt Box */}
                        <div className="block lg:hidden bg-[#14151a] border border-gray-800 p-3 rounded-lg space-y-2.5">
                          <label className="text-[9px] uppercase text-gray-500 font-bold tracking-widest block">Analysis Prompt (দিকনির্দেশনা)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={userContext}
                              disabled={analyzing}
                              onChange={(e) => setUserContext(e.target.value)}
                              placeholder="যেমন: সাপোর্ট জোন বা ক্যান্ডেলস্টিক প্যাটার্ন..."
                              className="flex-1 bg-black/40 border border-gray-800/80 rounded-lg p-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500 focus:bg-black/60 transition-all placeholder:text-gray-600"
                            />
                            {!result && !analyzing && (
                              <button
                                onClick={startAnalysis}
                                className="px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer"
                              >
                                Scan
                              </button>
                            )}
                          </div>
                        </div>

                        {userContext && (
                          <div className="hidden lg:block bg-[#14151a] border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] uppercase text-gray-600 font-bold tracking-widest block mb-1">User Instruction</span>
                            <p className="text-xs italic text-gray-400">"{userContext}"</p>
                          </div>
                        )}
                      </div>

                      {/* Result / Analysis State */}
                      <div className="flex flex-col">
                        <AnimatePresence mode="wait">
                          {analyzing ? (
                            <motion.div 
                              key="analyzing"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex-1 flex flex-col items-center justify-center space-y-6 text-center"
                            >
                              <div className="relative">
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  className="w-20 h-20 border-2 border-dashed border-emerald-500/30 rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Terminal className="w-8 h-8 text-emerald-500" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white tracking-widest uppercase">Deep Scanning...</h3>
                                <div className="flex items-center gap-1 justify-center">
                                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                                </div>
                              </div>
                            </motion.div>
                          ) : error ? (
                            <motion.div
                              key="error"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-5"
                            >
                              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                                <AlertCircle className="w-8 h-8" />
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">Analysis Error</h3>
                                <p className="text-gray-400 text-xs leading-relaxed max-w-sm bg-black/40 border border-white/5 rounded-lg p-3.5 italic font-mono text-left whitespace-pre-wrap breakdown-words">
                                  {error}
                                </p>
                              </div>
                              <button
                                onClick={startAnalysis}
                                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-lg transition-colors uppercase tracking-widest cursor-pointer"
                              >
                                Try Again
                              </button>
                            </motion.div>
                          ) : result ? (
                            <motion.div 
                              key="result"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-8"
                            >
                              <div className="space-y-2">
                                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold italic">Prediction Matrix</span>
                                <div className="flex flex-col space-y-1">
                                  <h2 className={`text-6xl font-black italic tracking-tighter ${
                                    result.prediction === 'UP' ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                                    result.prediction === 'DOWN' ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]' :
                                    'text-amber-500'
                                  }`}>
                                    {result.prediction === 'UP' ? 'BUY / UP' : 
                                     result.prediction === 'DOWN' ? 'SELL / DOWN' : 
                                     'NEUTRAL'}
                                  </h2>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${result.confidence}%` }}
                                        className={`h-full ${result.prediction === 'UP' ? 'bg-emerald-500' : result.prediction === 'DOWN' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                      />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-gray-500">{result.confidence}% PROB</span>
                                  </div>
                                </div>
                              </div>

                              {/* Direct Trade Signal Recommendation (সরাসরি ট্রেডিং নির্দেশ) */}
                              <div className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${
                                result.prediction === 'UP' ? 'bg-[#10b981]/10 border-[#10b981]/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' :
                                result.prediction === 'DOWN' ? 'bg-[#f43f5e]/10 border-[#f43f5e]/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]' :
                                'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                              }`}>
                                <div className="absolute top-0 right-0 w-32 h-32 blur-2xl opacity-10 rounded-full" />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 block font-mono">পরবর্তী ক্যান্ডেল সিগন্যাল (SIGNAL)</span>
                                    <h3 className={`text-xl font-black italic tracking-tight flex items-center gap-2 ${
                                      result.prediction === 'UP' ? 'text-emerald-400' :
                                      result.prediction === 'DOWN' ? 'text-rose-400' :
                                      'text-amber-400'
                                    }`}>
                                      {result.prediction === 'UP' ? (
                                        <>
                                          <TrendingUp className="w-5 h-5" />
                                          UP DIRECTION (উপরে ট্রেড নিন)
                                        </>
                                      ) : result.prediction === 'DOWN' ? (
                                        <>
                                          <TrendingDown className="w-5 h-5" />
                                          DOWN DIRECTION (নিচে ট্রেড নিন)
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-5 h-5" />
                                          WAIT / NEUTRAL (কোনো ট্রেড নিবেন না)
                                        </>
                                      )}
                                    </h3>
                                    <p className="text-xs text-gray-300 font-medium leading-relaxed max-w-lg">
                                      {result.prediction === 'UP' ? (
                                        <span>চার্ট ও ক্যান্ডেল প্যাটার্ন অনুযায়ী পরবর্তী ১ মিনিটের জন্য একটি <strong className="text-emerald-400 underline decoration-emerald-400/30">UP (সবুজ)</strong> ট্রেড নিতে পারেন।</span>
                                      ) : result.prediction === 'DOWN' ? (
                                        <span>চার্ট ও ক্যান্ডেল প্যাটার্ন অনুযায়ী পরবর্তী ১ মিনিটের জন্য একটি <strong className="text-rose-400 underline decoration-rose-400/30">DOWN (লাল)</strong> ট্রেড নিতে পারেন।</span>
                                      ) : (
                                        <span>মার্কেট এই মুহূর্তে কোনো নির্দিষ্ট ট্রেন্ড অনুসরণ করছে না। কোনো ঝুকিপূর্ণ ট্রেড নিবেন না, পরবর্তী শিওর সিগন্যালের অপেক্ষা করুন।</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="w-full sm:w-auto shrink-0 flex items-center justify-between sm:flex-col sm:items-end gap-1 bg-black/50 border border-white/5 p-3 rounded-lg">
                                    <span className="text-[9px] uppercase tracking-widest text-[#94a3b8] font-black font-mono">নিশ্চয়তা (SURETY)</span>
                                    <span className={`text-2xl font-black italic tracking-tighter leading-none ${
                                      result.prediction === 'UP' ? 'text-emerald-400' :
                                      result.prediction === 'DOWN' ? 'text-rose-400' :
                                      'text-amber-400'
                                    }`}>
                                      {result.confidence}% SURE
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Candle Closing Target Card (ক্যান্ডেল ক্লোজিং নির্দেশ) */}
                              <div className={`p-5 rounded-xl border-2 border-dashed relative overflow-hidden transition-all duration-300 ${
                                result.prediction === 'UP' ? 'bg-[#10b981]/5 border-[#10b981]/30 shadow-[0_0_15px_rgba(16,185,129,0.03)]' :
                                result.prediction === 'DOWN' ? 'bg-[#f43f5e]/5 border-[#f43f5e]/30 shadow-[0_0_15px_rgba(244,63,94,0.03)]' :
                                'bg-[#f59e0b]/5 border-[#f59e0b]/30'
                              }`}>
                                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none opacity-20 ${
                                  result.prediction === 'UP' ? 'bg-[#10b981]' :
                                  result.prediction === 'DOWN' ? 'bg-[#f43f5e]' :
                                  'bg-[#f59e0b]'
                                }`} />
                                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2">
                                  <div className={`w-2.5 h-2.5 rounded-full animate-ping shrink-0 ${
                                    result.prediction === 'UP' ? 'bg-emerald-400' :
                                    result.prediction === 'DOWN' ? 'bg-rose-400' :
                                    'bg-amber-400'
                                  }`} />
                                  <span className={
                                    result.prediction === 'UP' ? 'text-emerald-400 font-black' :
                                    result.prediction === 'DOWN' ? 'text-rose-400 font-black' :
                                    'text-amber-400 font-black'
                                  }>
                                    ক্যান্ডেল ক্লোজিং কনফার্মেশন (CANDLE CLOSING CONFIRMATION)
                                  </span>
                                </div>
                                <h4 className="text-gray-400 text-xs font-semibold mb-3">
                                  পরবর্তী ক্যান্ডেল সিগন্যালটি ১০০% সফল ও নিশ্চিত হতে কত প্রাইসে বা লেভেলে ক্যান্ডেল ক্লোজ হওয়া পর্যন্ত অপেক্ষা করবেন:
                                </h4>
                                <div className="text-xl sm:text-2xl font-black leading-tight tracking-tight bg-black/60 border border-white/5 rounded-xl p-4 shadow-sm select-all">
                                  {result.entryTarget ? (
                                    <span className={
                                      result.prediction === 'UP' ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                      result.prediction === 'DOWN' ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                                      'text-amber-400'
                                    }>
                                      {result.entryTarget}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 font-bold">
                                      {result.prediction === 'UP' ? (
                                        "সবুজ ক্যান্ডেলটি রেজিস্টেন্স লেভেলের বা পূর্ববর্তী ক্যান্ডেলের টপের উপরে ক্লোজ হতে হবে।"
                                      ) : result.prediction === 'DOWN' ? (
                                        "লাল ক্যান্ডেলটি সাপোর্ট লেভেলের বা পূর্ববর্তী ক্যান্ডেলের বটমের নিচে ক্লোজ হতে হবে।"
                                      ) : (
                                        "মার্কেটের মুভমেন্ট ও ডিরেকশন নিশ্চিত নয়, অনুগ্রহ করে ব্রেকআউট হতে দিন।"
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 italic mt-3">
                                  * ক্যান্ডেল সম্পূর্ণ ক্যান্ডেল টাইম শেষ হয়ে ক্লোজ হওয়ার পূর্বে তাড়াহুড়ো করে এন্ট্রি নিবেন না। ক্লোজিং নিশ্চিত করাই সবচেয়ে নিরাপদ কৌশল।
                                </p>
                              </div>





                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0c0d10] border border-gray-800 p-3 rounded text-center">
                                  <span className="text-[9px] uppercase text-gray-600 block mb-1">Target Zone</span>
                                  <span className="text-emerald-400 font-mono text-sm leading-none">AUTO_LOCKED</span>
                                </div>
                                <div className="bg-[#0c0d10] border border-gray-800 p-3 rounded text-center">
                                  <span className="text-[9px] uppercase text-gray-600 block mb-1">Risk Factor</span>
                                  <span className="text-rose-400 font-mono text-sm leading-none">MITIGATED</span>
                                </div>
                              </div>

                              {/* Profit/Loss Logging and Feedback System */}
                              <div className="p-4 bg-[#0a0b0d] border border-gray-800/80 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono">ট্রেড ফলাফল সংরক্ষণ করুন (Save Trade Outcome)</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  এই AI সিগন্যালটির ফলাফল কেমন ছিল? নিচে "Profit" অথবা "Loss" সিলেক্ট করে আপনার ট্রেড হিস্ট্রি বা ইতিহাসে সংরক্ষণ করুন।
                                </p>
                                
                                {tradeLogged ? (
                                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-bold">ফলাফল সফলভাবে ইতিহাসে সংরক্ষিত হয়েছে! (Saved successfully to History!)</span>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      disabled={loggingHistory}
                                      onClick={() => handleLogTrade('PROFIT')}
                                      className="py-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all text-emerald-400 rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.05)] disabled:opacity-50"
                                    >
                                      <TrendingUp className="w-4 h-4" />
                                      Profit (লাভ হয়েছে)
                                    </button>
                                    <button
                                      disabled={loggingHistory}
                                      onClick={() => handleLogTrade('LOSS')}
                                      className="py-2.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-black transition-all text-rose-400 rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.05)] disabled:opacity-50"
                                    >
                                      <TrendingDown className="w-4 h-4 animate-none" />
                                      Loss (লোকসান হয়েছে)
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                                  <Terminal className="w-8 h-8" />
                               </div>
                               <div className="space-y-4">
                                  <div className="space-y-1">
                                     <p className="text-gray-500 uppercase tracking-widest text-xs font-bold italic">Awaiting analysis pulse</p>
                                     <p className="text-[10px] text-gray-700">Upload chart & Click "Start AI Analysis"</p>
                                  </div>
                                  {!user && (
                                    <button 
                                      onClick={handleGoogleLogin}
                                      className="mx-auto flex items-center gap-2 px-6 py-2 bg-emerald-500 text-black rounded-lg font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                    >
                                      <LogIn className="w-4 h-4" />
                                      Login to Start
                                    </button>
                                  )}
                               </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Scanning Effect Footer */}
                  <div className="mt-auto px-6 py-3 border-t border-white/5 flex justify-between items-center text-[9px] text-gray-600 uppercase font-mono bg-black/20 shrink-0">
                    <div>Scanning matrix... Ready for input</div>
                    <div className="flex space-x-6">
                      <span>Sentiment: <span className={result?.prediction === 'UP' ? 'text-emerald-500' : result?.prediction === 'DOWN' ? 'text-rose-500' : 'text-amber-500'}>{result?.prediction || 'N/A'}</span></span>
                      <span>Next Forecast: <span className="text-white">ENCRYPTED</span></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    ) : null}
  </main>

       {/* Subscription Management View */}
      {currentView === 'payment' && (
        <div className="absolute inset-0 z-50 bg-[#08090a] flex items-center justify-center p-4 overflow-auto custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-[#151a22] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" /> Subscription <span className="text-emerald-500">Center</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Manage your analysis license and billing</p>
              </div>
              <button 
                onClick={() => setCurrentView('analysis')} 
                className="px-4 py-2 hover:bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" /> Back to App
              </button>
            </div>

            <div className="p-3 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8">
              {/* Left Column: Status & Current Plan */}
              <div className="md:col-span-5 space-y-6">
                <div className="bg-black/40 rounded-xl p-6 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="w-20 h-20 text-emerald-500" />
                  </div>
                  
                  <div className="relative z-10">
                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-4 block">Current Status</span>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        userData?.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500' : 
                        userData?.subscriptionStatus === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <h2 className={`text-2xl font-black uppercase tracking-tighter ${
                        userData?.subscriptionStatus === 'ACTIVE' ? 'text-emerald-500' : 
                        userData?.subscriptionStatus === 'PENDING' ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {userData?.subscriptionStatus || 'NO ACTIVE PLAN'}
                      </h2>
                    </div>

                    {!user ? (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-400">Please login to view your subscription details</p>
                        <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-black rounded-lg font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                          <LogIn className="w-4 h-4" /> GMAIL LOGIN
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-3 rounded border border-white/5">
                            <span className="text-[9px] text-gray-600 uppercase font-black block mb-1">Trials Used</span>
                            <span className="text-sm font-mono text-white">{userData?.freeUsageCount || 0} / 3</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded border border-white/5">
                            <span className="text-[9px] text-gray-600 uppercase font-black block mb-1">Expires In</span>
                            <span className="text-sm font-mono text-white">
                              {userData?.subscriptionStatus === 'ACTIVE' && userData.subscriptionExpiresAt 
                                ? Math.ceil((userData.subscriptionExpiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' Days'
                                : '26 Days'}
                            </span>
                          </div>
                        </div>
                        
                        {userData?.subscriptionStatus === 'ACTIVE' && (
                          <div className="flex items-center gap-2 text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest bg-emerald-500/5 p-3 rounded border border-emerald-500/10">
                            <ShieldCheck className="w-4 h-4" />
                            License Verified & Active
                          </div>
                        )}
                        
                        {userData?.subscriptionStatus === 'PENDING' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] text-amber-500/70 font-bold uppercase tracking-widest bg-amber-500/5 p-3 rounded border border-amber-500/10">
                              <Clock className="w-4 h-4" />
                              Verification in Progress...
                            </div>
                            <p className="text-[10px] text-gray-500 italic">Expected verification time: {countdown}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5">
                   <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Pro Features Unlocked</h3>
                   <ul className="space-y-3">
                     {[
                       'only 26 din  par day us 30',
                       'Priority Neural Processing',
                       'Advanced Pattern Detection',
                       'Higher Confidence Accuracy',
                       'Technical Indicator Matrix',
                       'Export High-Res Reports'
                     ].map((feature, i) => (
                       <li key={i} className="flex items-center gap-3 text-[11px] text-gray-400">
                         <Check className="w-3.5 h-3.5 text-emerald-500" /> {feature}
                       </li>
                     ))}
                   </ul>
                </div>
              </div>

              {/* Right Column: Upgrade / Billing */}
              <div className="md:col-span-7 space-y-6">
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                  {!user ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                        <User className="w-10 h-10 text-gray-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Login Required</h3>
                        <p className="text-xs text-gray-500 max-w-[250px]">Please login with your Gmail account to continue with the Korim Trader Pro subscription.</p>
                      </div>
                      <button 
                        onClick={() => setShowAuthModal(true)}
                        className="bg-emerald-500 text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-400 active:scale-95"
                      >
                        Login to Continue
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h2 className="text-2xl font-black text-white italic tracking-tighter">KORIM TRADER PRO</h2>
                          <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-black">80% discount cholce</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-emerald-500">20$</span>
                          <span className="text-[10px] text-gray-400 block font-bold tracking-wider mt-0.5">(2450 tk)</span>
                          <span className="text-xs text-gray-500 block">/ 26 Days</span>
                        </div>
                      </div>

                      {userData?.subscriptionStatus === 'ACTIVE' ? (
                        <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                          <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Subscription Active</h3>
                          <p className="text-xs text-gray-500 mt-2">Your pro features are fully operational. Renewal option will appear 3 days before expiry.</p>
                          <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                             <span className="text-[10px] uppercase text-gray-600 font-bold tracking-widest">Renewal Date</span>
                             <p className="text-sm font-mono text-gray-300">{userData.subscriptionExpiresAt?.toDate().toLocaleDateString()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* bKash Payment option */}
                          <div className={`bg-[#e2125d]/5 border border-[#e2125d]/20 rounded-xl p-4 flex items-center justify-between transition-all ${paymentMethod === 'bkash' ? 'ring-1 ring-[#e2125d]/40 bg-[#e2125d]/8' : ''}`}>
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                                 <svg className="w-7 h-7 text-[#e2125d]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                   <path
                                     d="M4 18l7-10 3 4.5L20 6l-6 10-3-3.5L4 18z"
                                     fill="currentColor"
                                   />
                                   <circle cx="20" cy="6" r="1.5" fill="currentColor" />
                                 </svg>
                               </div>
                               <div>
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 block">Payment Gateway</span>
                                 <span className="text-sm font-bold text-white">bKash (Personal)</span>
                               </div>
                             </div>
                             <div className="text-right">
                               <span className="text-xs font-bold text-rose-500 block">No bKash</span>
                             </div>
                          </div>

                          {/* Binance TRC20 Gateway Options Row */}
                          <div 
                             onClick={() => setPaymentMethod('trc20')}
                             className={`mt-3 flex items-center justify-between p-3.5 bg-gradient-to-r border rounded-xl cursor-pointer transition-all ${
                               paymentMethod === 'trc20' 
                                 ? 'from-blue-500/10 to-slate-900 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                                 : 'from-blue-500/5 to-slate-900 border-gray-800/80 hover:border-blue-500/30'
                             }`}
                           >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-[#f3ba2f]/10 rounded-md flex items-center justify-center font-bold text-[#f3ba2f] text-[10px] uppercase tracking-tighter">
                                BIN
                              </div>
                              <div>
                                <span className="text-[11px] font-bold text-white text-left block">Binance Option</span>
                                <span className="text-[9px] text-gray-500 font-medium block">Pay with USDT / Crypto</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Binance</span>
                              <button
                                type="button"
                                onClick={() => setPaymentMethod(paymentMethod === 'trc20' ? 'bkash' : 'trc20')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  paymentMethod === 'trc20'
                                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-400'
                                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                                }`}
                              >
                                TRC20
                              </button>
                            </div>
                          </div>

                          {/* Pic 2: Empty box filled from admin panel, show & copy system */}
                          {paymentMethod === 'trc20' && (
                            <div className="bg-[#131720]/90 border border-gray-800 rounded-2xl p-5 space-y-3.5 shadow-xl relative overflow-hidden animate-fade-in text-left">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                              <div className="flex justify-between items-center pl-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  WALLET ADDRESS (TRC20)
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-black text-blue-400 uppercase tracking-widest">USDT Network</span>
                              </div>
                              
                              <div className="flex items-center justify-between bg-[#0b0d12] border border-gray-800 rounded-xl p-3.5 group/addr hover:bg-[#0c0f16] hover:border-blue-500/30 transition-all">
                                <span className="text-xs sm:text-sm font-mono font-bold text-blue-400 break-all select-all pr-2">
                                  {trc20Address || 'TPAXoRZNjyn9XqwtmkV9xaTAzyeqEW2Hxy'}
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => { 
                                    const addr = trc20Address || 'TPAXoRZNjyn9XqwtmkV9xaTAzyeqEW2Hxy';
                                    navigator.clipboard.writeText(addr); 
                                    setCopiedTrc(true); 
                                    setTimeout(() => setCopiedTrc(false), 2000); 
                                  }} 
                                  className="text-[9px] sm:text-[10px] text-gray-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-all shrink-0 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 active:scale-95"
                                >
                                  {copiedTrc ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-500 tracking-wide font-normal italic pl-1">
                                Send only TRC20 to this address. Other assets will be lost.
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 text-left font-sans">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                {paymentMethod === 'bkash' ? 'Your Number' : 'Your Wallet / Phone / Details'}
                              </label>
                              <input 
                                type="text" 
                                value={senderNumber}
                                onChange={(e) => setSenderNumber(e.target.value)}
                                placeholder={paymentMethod === 'bkash' ? "017********" : "USDT / Address details"}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                              />
                            </div>
                            <div className="space-y-1.5 text-left font-sans">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Transaction ID</label>
                              <input 
                                type="text" 
                                value={trxId}
                                onChange={(e) => setTrxId(e.target.value)}
                                placeholder="TrxID"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono text-white"
                              />
                            </div>
                          </div>

                          <button 
                            onClick={handlePaymentSubmit}
                            disabled={userData?.subscriptionStatus === 'PENDING' || analyzing}
                            className={`w-full py-4 rounded-lg font-black uppercase tracking-widest transition-all ${
                              userData?.subscriptionStatus === 'PENDING' || analyzing
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : 'bg-emerald-500 text-black hover:scale-[1.02] active:scale-98 animate-pulse-glowing'
                            }`}
                          >
                            {analyzing ? 'Processing...' : (userData?.subscriptionStatus === 'PENDING' ? 'Awaiting Admin Approval' : 'Analyze Now (Pay 20$ / 2450 tk)')}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {analyzing && (
                    <div className="absolute inset-0 bg-[#0c0d10]/98 z-50 flex flex-col items-center justify-center space-y-6 text-center rounded-xl p-8">
                      {!showSuccess ? (
                        <>
                          <div className="relative">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="w-20 h-20 border-2 border-dashed border-emerald-500/30 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <CreditCard className="w-8 h-8 text-emerald-500" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-black text-white tracking-widest uppercase">Processing Request...</h3>
                            <div className="flex items-center gap-1 justify-center">
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] mt-4 italic">Encrypted Secure Transaction</p>
                          </div>
                        </>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center space-y-4"
                        >
                          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                            <Check className="w-10 h-10 text-black" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter">Success!</h3>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">আপনার রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে। খুব শীঘ্রই আপনাকে ভেরিফাই করা হবে।</p>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mt-4">Redirecting to Dashboard...</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-end">
                    <div className="flex gap-4">
                       <span className="text-[9px] text-gray-700 uppercase font-bold tracking-widest">Encrypted SSL</span>
                       <span className="text-[9px] text-gray-700 uppercase font-bold tracking-widest">API Secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {currentView === 'adminLogin' && (
        <div className="absolute inset-0 z-50 bg-[#08090a] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#151a22] rounded-2xl p-8 border border-white/5 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-emerald-500 text-center uppercase tracking-widest mb-6 italic">Secure System Access</h2>
            
            {!user && (
              <div className="mb-6 space-y-4">
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">Encrypted Gateway Login</p>
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-lg font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  GMAIL LOGIN
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px]"><span className="bg-[#151a22] px-2 text-gray-600 uppercase tracking-widest font-bold">OR SECONDARY</span></div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Access ID</label>
                <input 
                  type="text" 
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="ID Number"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Password</label>
                <input 
                  type="password" 
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button 
                onClick={handleAdminLogin}
                className="w-full py-4 bg-blue-500 text-white font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => setCurrentView('analysis')}
                className="w-full py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {currentView === 'adminPanel' && (
        <div className="absolute inset-0 z-50 bg-[#08090a] flex flex-col p-4 sm:p-8 overflow-hidden">
          <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0 bg-[#0c0d10] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0e0f12]">
              <div>
                <h2 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter flex items-center gap-3 italic">
                  <ShieldCheck className="w-6 h-6" /> System Control Center
                </h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Payment Verification System v2.5</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="flex bg-white/5 rounded-lg border border-white/10 p-1 mr-4">
                  <button 
                    onClick={() => setAdminTab('payments')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                      adminTab === 'payments' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Payments
                  </button>
                  <button 
                    onClick={() => setAdminTab('support')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                      adminTab === 'support' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Support {userList.some(u => u.unreadCount > 0) && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                    )}
                  </button>
                  <button 
                    onClick={() => setAdminTab('users')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                      adminTab === 'users' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Users ({allUsersList.length})
                  </button>
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search Number/TrxID..." 
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-blue-500 w-48 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-gray-400 focus:outline-none focus:border-blue-500 uppercase tracking-widest"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button 
                  onClick={() => setCurrentView('analysis')}
                  className="px-6 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-500/20 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Exit Panel
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {!isAdmin ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6">
                  <AlertCircle className="w-16 h-16 text-rose-500" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Access Denied</h3>
                    <p className="text-gray-500 max-w-sm text-sm">আপনার গুগল অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।</p>
                  </div>
                </div>
              ) : adminTab === 'payments' ? (
                <div className="flex flex-col h-full">
                  {/* TRC20 Wallet Setting */}
                  <div className="bg-[#141822] border-b border-gray-800 p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">Binance TRC20 Wallet Address</h4>
                        <p className="text-[10px] text-gray-500 font-medium">This address is dynamically displayed on the user's payment screen.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 max-w-sm sm:max-w-md w-full">
                      <input 
                        type="text"
                        value={adminTrc20Address}
                        onChange={(e) => setAdminTrc20Address(e.target.value)}
                        placeholder="Enter TRC20 Address (e.g. TPAXo...)"
                        className="flex-1 bg-black/40 border border-gray-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-white font-mono placeholder-gray-700"
                      />
                      <button
                        onClick={async () => {
                          setGlobalLoading(true);
                          try {
                            const configRef = doc(db, 'settings', 'payment');
                            await setDoc(configRef, { trc20Address: adminTrc20Address }, { merge: true });
                            alert("TRC20 Wallet Address updated in database successfully!");
                          } catch (err: any) {
                            console.error("Error setting TRC20:", err);
                            alert("Failed to save. Check firestore rules or connection.");
                          } finally {
                            setGlobalLoading(false);
                          }
                        }}
                        className="px-4 py-1.5 bg-blue-500 text-white hover:bg-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0 active:scale-95"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  <AnimatePresence>
                    {selectedRequests.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between px-6"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            {selectedRequests.length} Transactions Selected
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleBulkAction('VERIFIED')}
                            className="px-4 py-1.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          >
                            Verify All
                          </button>
                          <button 
                            onClick={() => handleBulkAction('REJECTED')}
                            className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-rose-400 transition-all"
                          >
                            Reject All
                          </button>
                          <button onClick={() => setSelectedRequests([])} className="px-3 py-1.5 text-gray-500 hover:text-white text-[10px] font-bold uppercase transition-colors">Clear Selection</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 bg-[#151a22] z-10">
                        <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-800">
                          <th className="px-6 py-4 w-12 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-700 bg-white/5 checked:bg-blue-500 cursor-pointer"
                              checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className="px-6 py-4 font-black">Timestamp</th>
                          <th className="px-6 py-4 font-black">Sender Number</th>
                          <th className="px-6 py-4 font-black">Transaction ID</th>
                          <th className="px-6 py-4 font-black">Status</th>
                          <th className="px-6 py-4 font-black text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {filteredRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center text-gray-600 italic text-sm tracking-widest">No matching requests found.</td>
                          </tr>
                        ) : (
                          filteredRequests
                            .slice((adminPage - 1) * itemsPerPage, adminPage * itemsPerPage)
                            .map((req) => (
                            <tr key={req.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-gray-700 bg-white/5 checked:bg-blue-500 cursor-pointer"
                                  checked={selectedRequests.includes(req.id)}
                                  onChange={() => toggleSelect(req.id)}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-gray-400 font-mono">
                                  {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : 'N/A'}<br/>
                                  <span className="text-[10px] text-gray-600">{req.timestamp?.toDate ? req.timestamp.toDate().toLocaleTimeString() : ''}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-gray-200 font-mono tracking-wider">{req.senderNumber}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-amber-500 font-mono">{req.trxId}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[9px] font-black px-2 py-1 rounded inline-block uppercase tracking-widest ${
                                  req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                  req.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                  'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {req.status === 'PENDING' && (
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleStatusUpdate(req.id, req.userId, 'VERIFIED')}
                                      className="p-2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all"
                                      title="Verify"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleStatusUpdate(req.id, req.userId, 'REJECTED')}
                                      className="p-2 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                                      title="Reject"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-[#0e0f12]">
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                         Showing {(adminPage - 1) * itemsPerPage + 1}-{Math.min(adminPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length}
                       </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                        disabled={adminPage === 1}
                        className="px-4 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white/10 disabled:opacity-20 transition-all font-mono"
                      >
                        Prev
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.ceil(filteredRequests.length / itemsPerPage) }).map((_, i) => (
                          <button 
                            key={i}
                            onClick={() => setAdminPage(i + 1)}
                            className={`w-8 h-8 rounded text-[10px] font-black transition-all ${
                              adminPage === i + 1 ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setAdminPage(p => Math.min(Math.ceil(filteredRequests.length / itemsPerPage), p + 1))}
                        disabled={adminPage >= Math.ceil(filteredRequests.length / itemsPerPage)}
                        className="px-4 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-white/10 disabled:opacity-20 transition-all font-mono"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : adminTab === 'users' ? (
                <div className="flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-6">
                  {/* Top metrics summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => setUserStatusFilter('ALL')}
                      className={`border p-4 rounded-xl flex items-center justify-between text-left transition-all outline-none focus:ring-1 focus:ring-blue-500/50 ${
                        userStatusFilter === 'ALL'
                          ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">সর্বমোট লগইনকৃত ইউজার</p>
                        <h3 className="text-3xl font-black text-white mt-1 font-mono">{allUsersList.length} জন</h3>
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        userStatusFilter === 'ALL' ? 'bg-blue-500 text-black shadow-md' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setUserStatusFilter('VERIFIED')}
                      className={`border p-4 rounded-xl flex items-center justify-between text-left transition-all outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                        userStatusFilter === 'VERIFIED'
                          ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">মোট ভেরিফাইড ইউজার</p>
                        <h3 className="text-3xl font-black text-emerald-500 mt-1 font-mono">
                          {allUsersList.filter(u => u.subscriptionStatus === 'ACTIVE' && !(u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date())).length} জন
                        </h3>
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        userStatusFilter === 'VERIFIED' ? 'bg-emerald-500 text-black shadow-md' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </button>

                    <button
                      onClick={() => setUserStatusFilter('UNVERIFIED')}
                      className={`border p-4 rounded-xl flex items-center justify-between text-left transition-all outline-none focus:ring-1 focus:ring-rose-500/50 ${
                        userStatusFilter === 'UNVERIFIED'
                          ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider">মোট আনভেরিফাইড ইউজার</p>
                        <h3 className="text-3xl font-black text-rose-500 mt-1 font-mono">
                          {allUsersList.filter(u => u.subscriptionStatus !== 'ACTIVE').length} জন
                        </h3>
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        userStatusFilter === 'UNVERIFIED' ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    </button>
                  </div>

                  {/* Bulk Reset Banner */}
                  <div className="bg-[#1e141a]/60 border border-rose-500/20 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">বাল্ক ইউজার আনভেরিফিকেশন অ্যাকশন</h4>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">অ্যাডমিন বাদে সকল সাধারণ ভেরিফাইড এবং পেন্ডিং ইউজারকে এক ক্লিকে আনভেরিফাইড (ফ্রি) করুন।</p>
                      </div>
                    </div>
                    <button
                      onClick={handleBulkResetUsers}
                      className="px-5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.25)] shrink-0 active:scale-95"
                    >
                      সকল সাধারণ ইউজার আনভেরিফাইড করুন ⚠️
                    </button>
                  </div>

                  {/* Search and control row */}
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#101217] border border-white/5 p-4 rounded-xl">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full xl:w-auto">
                      <div className="relative w-full lg:w-72">
                        <input 
                          type="text" 
                          placeholder="ইউজারের নাম, ইমেইল বা UID দিয়ে খুজুন..." 
                          className="bg-[#14161d] border border-white/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-amber-500 w-full text-white"
                          value={userSearchQuery || ""}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      {/* Filter pills buttons group */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                          onClick={() => setUserStatusFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            userStatusFilter === 'ALL'
                              ? 'bg-blue-500 text-black border-blue-500 font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          সবাই ({allUsersList.length})
                        </button>
                        <button
                          onClick={() => setUserStatusFilter('VERIFIED')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            userStatusFilter === 'VERIFIED'
                              ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          ভেরিফাইড ({allUsersList.filter(u => u.subscriptionStatus === 'ACTIVE' && !(u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date())).length})
                        </button>
                        <button
                          onClick={() => setUserStatusFilter('PENDING')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            userStatusFilter === 'PENDING'
                              ? 'bg-amber-500 text-black border-amber-500 font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          পেন্ডিং ({allUsersList.filter(u => u.subscriptionStatus === 'PENDING').length})
                        </button>
                        <button
                          onClick={() => setUserStatusFilter('EXPIRED')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            userStatusFilter === 'EXPIRED'
                              ? 'bg-rose-500 text-white border-rose-500 font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          মেয়াদোত্তীর্ণ ({allUsersList.filter(u => u.subscriptionStatus === 'ACTIVE' && u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date()).length})
                        </button>
                        <button
                          onClick={() => setUserStatusFilter('UNVERIFIED')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            userStatusFilter === 'UNVERIFIED'
                              ? 'bg-rose-500 text-white border-rose-500 font-bold'
                              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          ফ্রি/আনভেরিফাইড ({allUsersList.filter(u => u.subscriptionStatus !== 'ACTIVE' && u.subscriptionStatus !== 'PENDING').length})
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black shrink-0 xl:text-right">
                      ফলফলাফল: {
                        allUsersList.filter(u => {
                          const queryStr = (userSearchQuery || "").toLowerCase();
                          const nameMatch = (u.displayName || "").toLowerCase().includes(queryStr);
                          const emailMatch = (u.email || "").toLowerCase().includes(queryStr);
                          const uidMatch = (u.uid || "").toLowerCase().includes(queryStr);
                          const matchesSearch = nameMatch || emailMatch || uidMatch;
                          if (!matchesSearch) return false;

                          const isExpired = u.subscriptionStatus === 'ACTIVE' && u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date();
                          const isVerified = u.subscriptionStatus === 'ACTIVE' && !isExpired;

                          if (userStatusFilter === 'VERIFIED') return isVerified;
                          if (userStatusFilter === 'UNVERIFIED') return u.subscriptionStatus !== 'ACTIVE' && u.subscriptionStatus !== 'PENDING';
                          if (userStatusFilter === 'EXPIRED') return isExpired;
                          if (userStatusFilter === 'PENDING') return u.subscriptionStatus === 'PENDING';
                          return true;
                        }).length
                      } জন ইউজার পাওয়া গেছে
                    </div>
                  </div>

                  {/* Table area */}
                  <div className="flex-1 overflow-auto border border-gray-800 rounded-xl bg-[#0e0f12] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#12141a] text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <th className="px-6 py-4">ইউজার প্রোফাইল</th>
                          <th className="px-6 py-4">রেজিস্ট্রেশন</th>
                          <th className="px-6 py-4">সর্বশেষ লগইন</th>
                          <th className="px-6 py-4">ভেরিফিকেশন স্ট্যাটাস ও সময়</th>
                          <th className="px-6 py-4 text-right">ম্যানেজ অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {(() => {
                          const queryStr = (userSearchQuery || "").toLowerCase();
                          const filtered = allUsersList.filter(u => {
                            const nameMatch = (u.displayName || "").toLowerCase().includes(queryStr);
                            const emailMatch = (u.email || "").toLowerCase().includes(queryStr);
                            const uidMatch = (u.uid || "").toLowerCase().includes(queryStr);
                            const matchesSearch = nameMatch || emailMatch || uidMatch;
                            if (!matchesSearch) return false;

                            const isExpired = u.subscriptionStatus === 'ACTIVE' && u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date();
                            const isVerified = u.subscriptionStatus === 'ACTIVE' && !isExpired;

                            if (userStatusFilter === 'VERIFIED') {
                              return isVerified;
                            }
                            if (userStatusFilter === 'UNVERIFIED') {
                              return u.subscriptionStatus !== 'ACTIVE' && u.subscriptionStatus !== 'PENDING';
                            }
                            if (userStatusFilter === 'EXPIRED') {
                              return isExpired;
                            }
                            if (userStatusFilter === 'PENDING') {
                              return u.subscriptionStatus === 'PENDING';
                            }
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="text-center py-12 text-gray-600 text-xs italic">
                                  কোনো ইউজার পাওয়া যায়নি
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((u) => {
                            const isExpired = u.subscriptionStatus === 'ACTIVE' && u.subscriptionExpiresAt && u.subscriptionExpiresAt.toDate() <= new Date();
                            const isVerified = u.subscriptionStatus === 'ACTIVE' && !isExpired;
                            
                            // Calculate verified date and relative days
                            let verifiedDateStr = "";
                            let relativeDaysStr = "";
                            let vDate: Date | null = null;
                            
                            if (isVerified) {
                              vDate = u.verifiedAt ? u.verifiedAt.toDate() : null;
                              if (!vDate && u.subscriptionExpiresAt) {
                                const exp = u.subscriptionExpiresAt.toDate();
                                vDate = new Date(exp.getTime());
                                vDate.setDate(vDate.getDate() - 30);
                              }
                              
                              if (vDate) {
                                const now = new Date();
                                const diffMs = now.getTime() - vDate.getTime();
                                const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                
                                const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                                verifiedDateStr = vDate.toLocaleDateString('bn-BD', options);
                                relativeDaysStr = `${diffDays} দিন যাবত ভেরিফাইড`;
                              } else {
                                verifiedDateStr = "আজ থেকে";
                                relativeDaysStr = "১ দিন যাবত ভেরিফাইড";
                              }
                            }

                            // Calculate joined date and last login
                            const joinedDateStr = u.createdAt && u.createdAt.toDate 
                              ? u.createdAt.toDate().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) 
                              : 'N/A';
                              
                            const lastLoginStr = u.lastLogin && u.lastLogin.toDate
                              ? u.lastLogin.toDate().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) + " " + u.lastLogin.toDate().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
                              : 'N/A';

                            return (
                              <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {u.photoURL ? (
                                      <img referrerPolicy="no-referrer" src={u.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-750 shrink-0" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-white/5 border border-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                                        <User className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-200">{u.displayName || 'Unnamed User'}</span>
                                      <span className="text-[10px] text-gray-500 font-mono font-bold">{u.email}</span>
                                      <span className="text-[9px] text-gray-600 font-mono">UID: {u.uid}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400 font-mono font-bold">
                                  {joinedDateStr}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400 font-mono font-bold">
                                  {lastLoginStr}
                                </td>
                                <td className="px-6 py-4">
                                  {isVerified ? (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                                        🟢 Verified
                                      </span>
                                      <div className="text-[11px] text-emerald-400 font-bold">
                                        {relativeDaysStr}
                                      </div>
                                      <div className="text-[10px] text-gray-500 italic">
                                        (ভেরিফিকেশন শুরু: {verifiedDateStr})
                                      </div>
                                    </div>
                                  ) : isExpired ? (
                                    <div className="space-y-1">
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, true)}
                                        className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-500 border border-rose-500/40 px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                        title="আবার ভেরিফাই করতে ক্লিক করুন"
                                      >
                                        🔴 30D (Unverified)
                                      </button>
                                      <div className="text-[11px] text-rose-400 font-bold">
                                        ৩০ দিন সম্পূর্ণ হয়েছে (মেয়াদোত্তীর্ণ)
                                      </div>
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, true)}
                                        className="text-[9px] text-amber-500 hover:underline font-bold uppercase tracking-wider block text-left"
                                      >
                                        আবার ভেরিফাই করুন ⚡
                                      </button>
                                    </div>
                                  ) : u.subscriptionStatus === 'PENDING' ? (
                                    <div>
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                                        🟡 Pending Verification
                                      </span>
                                      <div className="text-[11px] text-gray-400 font-bold mt-1">পেমেন্ট রিকোয়েস্ট পেন্ডিং</div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, false)}
                                        className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-500 border border-rose-500/40 px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                        title="ভেরিফাই করতে ক্লিক করুন"
                                      >
                                        🔴 Unverified (Free)
                                      </button>
                                      <div className="text-[10px] text-gray-500">কোনো সক্রিয় সাবস্ক্রিপশন নেই</div>
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, false)}
                                        className="text-[9px] text-amber-500 hover:underline font-bold uppercase tracking-wider block text-left"
                                      >
                                        ভেরিফাই করুন ✨
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, isExpired)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-black tracking-wider uppercase transition-all border ${
                                      isVerified 
                                        ? 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border-rose-500/20' 
                                        : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-500 border-emerald-500/20'
                                    }`}
                                  >
                                    {isVerified ? "আনভেরিফাইড" : "ভেরিফাই করুন"}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-0">
                  {/* User List Sidebar */}
                  <div className={`w-full md:w-72 border-r border-gray-800 flex flex-col bg-[#0e0f12] ${adminChatUser ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-800 bg-[#12141a]">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Support Inquiries</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {userList.length === 0 ? (
                        <div className="p-8 text-center text-gray-600 italic text-[10px] uppercase font-bold tracking-widest mt-10">No messages yet.</div>
                      ) : (
                        userList.map((u: any) => (
                          <button 
                            key={u.userId}
                            onClick={() => {
                              setAdminChatUser(u.userId);
                              // Mark all user messages as read when admin clicks
                              adminMessages.filter(m => m.userId === u.userId && m.sender === 'USER' && !m.read).forEach(m => markMessageAsRead(m.id));
                            }}
                            className={`w-full p-4 border-b border-gray-800 flex flex-col items-start gap-1 transition-all text-left ${
                              adminChatUser === u.userId ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[10px] font-black text-gray-200 truncate max-w-[140px] uppercase tracking-tighter">{u.userEmail}</span>
                              {u.unreadCount > 0 && (
                                <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{u.unreadCount}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate w-full italic">"{u.lastMessage}"</div>
                            <div className="text-[8px] text-gray-600 mt-1 uppercase font-bold tracking-widest">
                              {u.timestamp?.toDate ? u.timestamp.toDate().toLocaleString() : ''}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className={`flex-1 flex flex-col bg-[#08090a] ${!adminChatUser ? 'hidden md:flex' : 'flex'}`}>
                    {adminChatUser ? (
                      <>
                        <div className="p-4 border-b border-gray-800 bg-[#0c0d10] flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => setAdminChatUser(null)} 
                               className="md:hidden p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-gray-400 hover:text-white mr-1 shrink-0"
                             >
                               <ArrowLeft className="w-4 h-4" />
                             </button>
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Conversation with</span>
                               <span className="text-sm font-bold text-gray-200">{userList.find(u => u.userId === adminChatUser)?.userEmail}</span>
                             </div>
                           </div>
                           <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest">ID: {adminChatUser}</div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                          {adminMessages.filter(m => m.userId === adminChatUser).sort((a: any, b: any) => a.timestamp?.toMillis() - b.timestamp?.toMillis()).map((m: any) => (
                            <div key={m.id} className={`flex ${m.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${
                                m.sender === 'ADMIN' 
                                ? 'bg-emerald-600 text-white rounded-tr-none' 
                                : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                              }`}>
                                {m.text}
                                <div className={`text-[8px] mt-1.5 opacity-50 ${m.sender === 'ADMIN' ? 'text-white' : 'text-gray-400'}`}>
                                  {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString() : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 border-t border-gray-800 bg-[#0c0d10]">
                           <div className="relative">
                             <input 
                               type="text" 
                               value={chatMessage}
                               onChange={(e) => setChatMessage(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleAdminReplyMessage()}
                               placeholder="Type your official reply..."
                               className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-14 py-4 text-xs focus:outline-none focus:border-emerald-500 transition-all text-white placeholder:text-gray-600"
                             />
                             <button 
                               onClick={handleAdminReplyMessage}
                               disabled={!chatMessage.trim()}
                               className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:hover:shadow-none transition-all"
                             >
                               <Send className="w-4 h-4" />
                             </button>
                           </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <MessageSquare className="w-16 h-16 text-gray-800" />
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-gray-600 uppercase tracking-widest italic font-mono">Select a user to begin communication</h3>
                          <p className="text-[10px] text-gray-700 uppercase font-bold tracking-[0.2em]">Secure End-to-End Encryption Active</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-[#0c0d10] border-t border-gray-800 flex items-center px-8 justify-between text-[10px] tracking-widest text-gray-600 shrink-0">
        <div className="flex space-x-6 uppercase font-medium">
          <span>LATENCY: 14ms</span>
          <span className="hidden sm:inline">DECRYPTION: ACTIVE</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="uppercase font-medium">SERVER SECURE - SYNCED WITH CLOUD ANALYTICS</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }

        @keyframes pulse-glowing {
          0% {
            box-shadow: 0 0 5px rgba(16, 185, 129, 0.4), 0 0 0px rgba(16, 185, 129, 0.2);
          }
          50% {
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.8), 0 0 10px rgba(16, 185, 129, 0.4);
          }
          100% {
            box-shadow: 0 0 5px rgba(16, 185, 129, 0.4), 0 0 0px rgba(16, 185, 129, 0.2);
          }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        .animate-pulse-glowing {
          animation: pulse-glowing 2s infinite ease-in-out;
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
      `}} />

      {/* Floating Chat Support for Users */}
      {user && !isAdmin && currentView !== 'adminPanel' && (
        <div className="fixed bottom-14 right-4 sm:right-6 z-[60]">
          <AnimatePresence>
            {showChat && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-16 right-0 w-[calc(100vw-32px)] sm:w-[325px] h-[450px] bg-[#0c0d10] border border-emerald-500/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-500/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 italic">Support Live</h3>
                  </div>
                  <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#08090a]/50">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <MessageSquare className="w-8 h-8 text-emerald-500/20" />
                      <p className="text-[10px] text-gray-600 uppercase font-black leading-relaxed">
                        অ্যাডমিনকে মেসেজ দিন। আপনার সমস্যার সমাধান দ্রুত করা হবে।
                      </p>
                    </div>
                  )}
                  {messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                        m.sender === 'USER' 
                        ? 'bg-emerald-500 text-black font-medium rounded-tr-none' 
                        : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'
                      }`}>
                        {m.text}
                        <div className={`text-[8px] mt-1 opacity-50 ${m.sender === 'USER' ? 'text-black' : 'text-gray-500'}`}>
                          {m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-white/5 bg-[#0e0f12]">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type message..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:border-emerald-500 transition-all text-white"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 disabled:text-gray-600 disabled:opacity-50 hover:bg-emerald-500/10 rounded-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse-ring pointer-events-none scale-105" />
            <span className="absolute -inset-1 rounded-full border border-emerald-500/30 animate-pulse-ring pointer-events-none" />
            <button 
              onClick={() => window.open("https://t.me/Korimanalice", "_blank")}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative z-10 bg-emerald-500 hover:scale-110 hover:shadow-emerald-500/30 animate-pulse-glowing"
              title="সব সমস্যার সমাধানের জন্য আমাদের টেলিগ্রাম চ্যানেলে যোগ দিন (Join our Telegram Channel)"
            >
              <div className="relative">
                <MessageCircle className="w-6 h-6 text-black animate-bounce [animation-duration:3s]" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


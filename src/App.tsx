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
import { TrendingUp, Upload, Activity, AlertCircle, RefreshCw, MessageSquare, Terminal, Download, Copy, Check, Send, LogOut, LogIn, User, ShieldCheck, CreditCard, Clock, Key, MessageCircle, X, ArrowLeft } from 'lucide-react';
import { analyzeChartImage, AnalysisResult } from './services/geminiService';
import { toPng } from 'html-to-image';
import { auth, loginWithGoogle, logout, db, BKASH_NUMBER, checkIfAdmin, submitPaymentRequest, getPaymentRequests, updatePaymentStatus, getUserData, incrementFreeUsage, activateSubscription, OperationType, registerWithEmail, loginWithEmail, sendSupportMessage, sendAdminReply, markMessageAsRead } from './lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

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
  const [adminTab, setAdminTab] = useState<'payments' | 'support'>('payments');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [adminPage, setAdminPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const analysisBoxRef = useRef<HTMLDivElement>(null);

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
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
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
    
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    }, (error) => {
      // Log error but don't necessarily crash the app
      console.error("User Snapshot Error:", error);
    });

    return () => unsubscribe();
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
      console.error("Auth Error Detail:", err);
      let errorMsg = "Authentication failed. Please try again.";
      
      const errorCode = err.code || (err.message?.includes('auth/') ? err.message : '');
      
      if (errorCode.includes('invalid-credential') || errorCode.includes('user-not-found') || errorCode.includes('wrong-password')) {
        errorMsg = authMode === 'login' 
          ? "ভুল ইমেইল বা পাসওয়ার্ড! আপনার কি অ্যাকাউন্ট নেই? 'Create one' এ ক্লিক করে রেজিস্ট্রেশন করুন।" 
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
          if (userData.subscriptionStatus === 'PENDING') {
            setError('আপনার পেমেন্ট ভেরিফিকেশন পেন্ডিং আছে। অ্যাডমিন অ্যাপ্রুভ করলে আপনি অ্যানালাইসিস করতে পারবেন।');
            setCurrentView('payment');
          } else {
            setError('অ্যানালাইসিস শুরু করতে প্রথমে সাবস্ক্রিপশন কিনুন।');
            setCurrentView('payment');
          }
          return;
        }
      } else {
        // If userData is not yet loaded, we assume not subscribed for safety
        setCurrentView('payment');
        return;
      }
    }

    setAnalyzing(true);
    setGlobalLoading(true);
    setError(null);
    try {
      const data = await analyzeChartImage(image, "image/png", userContext);
      setResult(data);
      
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
        link.download = `tradelens-analysis-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Export failed', err);
      }
    }
  };

  const copyToClipboard = () => {
    if (result) {
      const text = `TradeLens AI Analysis:\nPrediction: ${result.prediction}\nConfidence: ${result.confidence}%\nExplanation: ${result.explanation}\nPatterns: ${result.patterns.join(', ')}`;
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
    setAnalyzing(true);
    setGlobalLoading(true);
    setShowSuccess(false);
    try {
      await submitPaymentRequest(user.uid, senderNumber, trxId);
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
            Trade<span className="text-emerald-500">Lens</span> AI
          </span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-6 min-w-0">
          <div className="hidden md:flex items-center space-x-6">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Engine: <span className="text-emerald-400">NEURAL-GEN-4</span></div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Status: <span className="text-emerald-400">AI Standby</span></div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3 pl-1.5 md:pl-4 border-l border-gray-800">
            {user ? (
              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{user.displayName || 'Trident User'}</span>
                    {userData?.subscriptionStatus === 'ACTIVE' ? (
                      <span className="text-[7px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-1 rounded uppercase tracking-widest leading-none py-0.5">Verified</span>
                    ) : (
                      <span className="text-[7px] font-black bg-rose-500/20 text-rose-500 border border-rose-500/40 px-1 rounded uppercase tracking-widest leading-none py-0.5">Unverified</span>
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
                    {authMode === 'login' ? "Don't have an account? Create one" : "Already have an account? Access here"}
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
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${
                  !image || analyzing 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                }`}
              >
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                Analyze Now
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Market Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#14151a] border border-gray-800 rounded shadow-inner">
                <span className="text-[10px] text-gray-400">API LATENCY</span>
                <span className="text-[10px] text-emerald-500 font-mono">12ms</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#14151a] border border-gray-800 rounded shadow-inner">
                <span className="text-[10px] text-gray-400">AI CONFIDENCE</span>
                <span className="text-[10px] text-emerald-500 font-mono">{result ? result.confidence + '%' : 'PENDING'}</span>
              </div>
            </div>
          </section>

          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Expert Tip:</p>
            <p className="text-[11px] leading-relaxed text-gray-500">
              নির্ভুল ফলাফলের জন্য ক্লিয়ার স্ক্রিনশট ব্যবহার করুন এবং নির্দিষ্ট কোনো প্যাটার্ন (যেমন: Head & Shoulders) সম্পর্কে জানতে টেক্সট বক্সে লিখুন।
            </p>
          </div>
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
                        <>
                          <button 
                            onClick={copyToClipboard}
                            className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest"
                            title="Copy Analysis as Text"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <button 
                            onClick={exportAsImage}
                            className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest"
                            title="Download Analysis as Image"
                          >
                            <Download className="w-3 h-3" />
                            Export
                          </button>
                        </>
                      )}
                      {!analyzing && !result && (
                        <button 
                          onClick={startAnalysis}
                          className="px-4 py-1.5 sm:px-6 sm:py-2 bg-emerald-500 text-black font-black text-[10px] sm:text-xs rounded hover:bg-emerald-400 transition-colors uppercase tracking-widest"
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

                              <div className="bg-[#14151a] border border-gray-800 rounded-lg p-4 space-y-4 shadow-inner">
                                <p className="text-gray-300 leading-relaxed text-sm">
                                  {result.explanation}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                  {result.patterns.map((p, i) => (
                                    <span key={i} className="text-[9px] uppercase font-bold text-emerald-500/70 border border-emerald-500/20 px-2 py-0.5 rounded italic">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Breakout Safe Trade Strategy Card */}
                              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-400 justify-between">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 shrink-0" />
                                    <span className="text-[10px] uppercase tracking-widest font-black leading-none">Safe Trade Strategy (ঝুঁকিমুক্ত ট্রেড ফর্মুলা)</span>
                                  </div>
                                  <span className="text-[11px] font-bold bg-emerald-400/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    শিউরিটি বা নিশ্চয়তা: {result.confidence}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 font-medium leading-relaxed">
                                  এই সিগন্যালটির সফল হওয়ার নিশ্চয়তা প্রায় <span className="text-emerald-400 font-black">{result.confidence}%</span>। এই ক্যান্ডেলটির উপরে গেলে <span className="text-emerald-400 font-bold uppercase">UP</span> বা এটার নিচে গেলে <span className="text-rose-400 font-bold uppercase">DOWN</span>, এভাবে ট্রেড নিলে কোনো ঝুঁকি থাকবে না।
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
                                : '0 Days'}
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
                       'Unlimited Chart Analysis',
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
                        <p className="text-xs text-gray-500 max-w-[250px]">Please login with your Gmail account to continue with the Tradelens Pro subscription.</p>
                      </div>
                      <button 
                        onClick={handleGoogleLogin}
                        className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        Login with Gmail
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h2 className="text-2xl font-black text-white italic tracking-tighter">TRADELENS PRO</h2>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Professional License</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-emerald-500">৳100</span>
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
                          <div className="bg-[#e2125d]/5 border border-[#e2125d]/20 rounded-xl p-4 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                 <img src="https://searchvectorlogo.com/wp-content/uploads/2020/02/bkash-logo-vector.png" alt="bKash" className="w-8 h-8 object-contain" />
                               </div>
                               <div>
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 block">Payment Gateway</span>
                                 <span className="text-sm font-bold text-white">bKash (Personal)</span>
                               </div>
                             </div>
                             <div className="text-right">
                               <span className="text-xs font-mono font-bold text-gray-300 block">{BKASH_NUMBER}</span>
                               <button onClick={() => { navigator.clipboard.writeText(BKASH_NUMBER); alert("Number Copied!"); }} className="text-[9px] text-[#e2125d] font-bold uppercase underline">Copy Number</button>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Your Number</label>
                              <input 
                                type="text" 
                                value={senderNumber}
                                onChange={(e) => setSenderNumber(e.target.value)}
                                placeholder="017********"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Transaction ID</label>
                              <input 
                                type="text" 
                                value={trxId}
                                onChange={(e) => setTrxId(e.target.value)}
                                placeholder="TrxID"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                              />
                            </div>
                          </div>

                          <button 
                            onClick={handlePaymentSubmit}
                            disabled={userData?.subscriptionStatus === 'PENDING' || analyzing}
                            className={`w-full py-4 rounded-lg font-black uppercase tracking-widest transition-all ${
                              userData?.subscriptionStatus === 'PENDING' || analyzing
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : 'bg-emerald-500 text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            }`}
                          >
                            {analyzing ? 'Processing...' : (userData?.subscriptionStatus === 'PENDING' ? 'Awaiting Admin Approval' : 'Analyze Now (Pay ৳100)')}
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
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Payment Verification System v2.0</p>
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

          <button 
            onClick={() => setShowChat(!showChat)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              showChat 
              ? 'bg-rose-500 rotate-90' 
              : 'bg-emerald-500 hover:scale-110 hover:shadow-emerald-500/20'
            }`}
          >
            {showChat ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <div className="relative">
                <MessageCircle className="w-6 h-6 text-black" />
                {userList.find(u => u.userId === user.uid)?.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-emerald-500">
                    {messages.filter(m => m.sender === 'ADMIN' && !m.read).length}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


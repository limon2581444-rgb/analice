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
import { TrendingUp, TrendingDown, Upload, Activity, AlertCircle, RefreshCw, MessageSquare, Terminal, Download, Copy, Check, Send, LogOut, LogIn, User, ShieldCheck, CreditCard, Clock, Key, MessageCircle, X, ArrowLeft, Volume2, VolumeX, Zap, Target, Sliders, DollarSign, History, Image as ImageIcon, Plus, Lock } from 'lucide-react';
import { analyzeChartImage, AnalysisResult } from './services/geminiService';
import { toPng } from 'html-to-image';
import { auth, loginWithGoogle, logout, db, BKASH_NUMBER, checkIfAdmin, submitPaymentRequest, getPaymentRequests, updatePaymentStatus, getUserData, incrementFreeUsage, activateSubscription, deactivateSubscription, OperationType, registerWithEmail, loginWithEmail, sendSupportMessage, sendAdminReply, markMessageAsRead, getAllUsersSnap, saveTradeLog, getTradeLogsSnap, clearTradeLogs } from './lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot, collection, query, where, orderBy, updateDoc, getDocs, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { playAnalysisReadySound, playMessageAlertSound, isSoundEnabled, setSoundEnabled } from './utils/audioAlerts';
import { TrendAnalysisGraph } from './components/TrendAnalysisGraph';
import { PredictionTrendChart } from './components/PredictionTrendChart';
import { TradingTimer } from './components/TradingTimer';
import { MoneyManagementModal } from './components/MoneyManagementModal';
// @ts-ignore
import tradeLensLogo from './assets/images/tradelens_logo_1783032357643.jpg';

function RainEffect() {
  const [drops, setDrops] = useState<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    height: number;
    width: string;
    opacity: number;
    colorClass: string;
    glowClass: string;
    dotColor: string;
  }[]>([]);

  const [splashes, setSplashes] = useState<{
    id: number;
    left: number;
    bottom: number;
    delay: number;
    scale: number;
    colorClass: string;
    glowClass: string;
  }[]>([]);
  
  useEffect(() => {
    const totalDrops = 110;
    const generatedDrops = Array.from({ length: totalDrops }, (_, i) => {
      const rand = Math.random();
      let width = "1.2px";
      let height = 15 + Math.random() * 15;
      let duration = 1.8 + Math.random() * 1.6;
      let opacity = 0.25 + Math.random() * 0.45;
      
      let colorClass = "from-cyan-400 to-transparent";
      let glowClass = "glow-drop-cyan";
      let dotColor = "bg-cyan-400";

      if (rand > 0.65) {
        // Bullish green trading candle stream
        width = "1.5px";
        height = 18 + Math.random() * 18;
        duration = 1.5 + Math.random() * 1.2;
        opacity = 0.35 + Math.random() * 0.45;
        colorClass = "from-emerald-400 via-emerald-500/50 to-transparent";
        glowClass = "glow-drop-emerald";
        dotColor = "bg-emerald-400";
      } else if (rand > 0.35) {
        // Bearish red trading candle stream
        width = "1.5px";
        height = 18 + Math.random() * 18;
        duration = 1.6 + Math.random() * 1.3;
        opacity = 0.3 + Math.random() * 0.4;
        colorClass = "from-rose-400 via-rose-500/50 to-transparent";
        glowClass = "glow-drop-rose";
        dotColor = "bg-rose-500";
      } else {
        // High-speed cyber cyan streams
        width = "1px";
        height = 12 + Math.random() * 12;
        duration = 2.0 + Math.random() * 1.8;
        opacity = 0.2 + Math.random() * 0.3;
        colorClass = "from-cyan-400/80 via-blue-500/30 to-transparent";
        glowClass = "glow-drop-cyan";
        dotColor = "bg-cyan-300";
      }

      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * -7,
        duration,
        height,
        width,
        opacity,
        colorClass,
        glowClass,
        dotColor,
      };
    });
    setDrops(generatedDrops);

    // Generate beautiful splash rings on the landing zone (puddle surface)
    const totalSplashes = 25;
    const generatedSplashes = Array.from({ length: totalSplashes }, (_, i) => {
      const randType = Math.random();
      let colorClass = "border-cyan-400/50";
      let glowClass = "shadow-[0_0_8px_rgba(34,211,238,0.3)]";
      if (randType > 0.65) {
        colorClass = "border-emerald-400/50";
        glowClass = "shadow-[0_0_8px_rgba(52,211,153,0.3)]";
      } else if (randType > 0.35) {
        colorClass = "border-rose-400/50";
        glowClass = "shadow-[0_0_8px_rgba(251,113,133,0.3)]";
      }
      return {
        id: i,
        left: 2 + Math.random() * 96,
        bottom: 4 + Math.random() * 12,
        delay: Math.random() * -4,
        scale: 0.5 + Math.random() * 0.9,
        colorClass,
        glowClass,
      };
    });
    setSplashes(generatedSplashes);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Falling unique trading neon rain drops */}
      {drops.map((drop) => (
        <div
          key={drop.id}
          className={`absolute bg-gradient-to-b ${drop.colorClass} ${drop.glowClass} animate-rain-drop flex flex-col items-center`}
          style={{
            left: `${drop.left}%`,
            top: `-50px`,
            width: drop.width,
            height: `${drop.height}px`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            opacity: drop.opacity,
          }}
        >
          {/* Glowing candle tip */}
          <div className={`w-[3px] h-[3px] rounded-full shrink-0 ${drop.dotColor} absolute bottom-0 shadow-[0_0_8px_rgba(255,255,255,1)]`} />
        </div>
      ))}

      {/* Cybernetic Landing Splash Rings */}
      {splashes.map((splash) => (
        <div
          key={`splash-${splash.id}`}
          className={`absolute rounded-full border-t-2 border-x ${splash.colorClass} ${splash.glowClass} animate-splash`}
          style={{
            left: `${splash.left}%`,
            bottom: `${splash.bottom}px`,
            width: "18px",
            height: "7px",
            animationDelay: `${splash.delay}s`,
            transform: `scale(${splash.scale})`,
          }}
        />
      ))}

      {/* Cyberpunk Silhouette Couple Proposal */}
      <div className="absolute bottom-2 left-4 sm:left-12 md:left-24 lg:left-32 xl:left-40 z-10 pointer-events-none select-none transition-all duration-500">
        <svg viewBox="0 0 160 130" className="w-28 h-23 sm:w-36 sm:h-29 md:w-44 md:h-36 filter drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]">
          {/* Cybernetic Glowing Umbrella */}
          <path 
            d="M 15 48 Q 80 12 145 48 Q 80 38 15 48 Z" 
            fill="rgba(6, 182, 212, 0.15)" 
            stroke="#22d3ee" 
            strokeWidth="2.5" 
            className="animate-pulse"
          />
          {/* Umbrella center pin */}
          <line x1="80" y1="28" x2="80" y2="12" stroke="#22d3ee" strokeWidth="2.5" />
          
          {/* Umbrella pole with cyber glow */}
          <path 
            d="M 80 34 L 80 102 Q 77 106 72 104" 
            fill="none" 
            stroke="#22d3ee" 
            strokeWidth="1.8" 
          />
          
          {/* Standing Girl (on the right, facing left) */}
          <g className="fill-[#08090b] stroke-[#10b981]/30 stroke-[0.8px]">
            {/* Girl Head */}
            <circle cx="106" cy="58" r="6.5" fill="#08090b" className="stroke-[#22d3ee]/30" />
            
            {/* Girl ponytail */}
            <path d="M 111 55 Q 120 54 117 64 Q 112 62 109 59" fill="#08090b" />
            
            {/* Girl Body/Dress */}
            <path d="M 101 66 C 97 74, 94 92, 91 106 L 118 106 C 114 93, 112 74, 107 66 Z" fill="#08090b" />
            
            {/* Surprised hands (touching face/chest) */}
            <path d="M 101 67 Q 95 65 96 61" fill="none" stroke="#08090b" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Legs */}
            <line x1="97" y1="106" x2="96" y2="123" stroke="#08090b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="107" y1="106" x2="108" y2="123" stroke="#08090b" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          
          {/* Kneeling Boy (on the left, facing right) */}
          <g className="fill-[#08090b] stroke-[#f43f5e]/30 stroke-[0.8px]">
            {/* Boy Head */}
            <circle cx="56" cy="74" r="6.5" fill="#08090b" className="stroke-[#f43f5e]/30" />
            {/* Boy spiky hair */}
            <path d="M 50 71 Q 54 66 58 71" fill="#08090b" />
            
            {/* Boy torso & legs in kneeling pose */}
            <path d="M 54 82 Q 46 94 48 102 C 40 102, 34 112, 38 123 L 56 123 C 58 116, 52 108, 54 102 C 60 103, 64 112, 66 123 L 73 123 C 71 114, 62 102, 57 82 Z" fill="#08090b" />
            
            {/* Proposing Arm reaching forward */}
            <path d="M 57 82 Q 74 81 77 81" fill="none" stroke="#08090b" strokeWidth="2.8" strokeLinecap="round" />
            
            {/* Other Arm holding the umbrella pole */}
            <path d="M 54 82 Q 72 84 80 84" fill="none" stroke="#08090b" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          {/* Red Rose held by the boy with bright glowing neon red head */}
          <line x1="77" y1="81" x2="82" y2="76" stroke="#10b981" strokeWidth="1" />
          <circle cx="82" cy="76" r="3.5" fill="#f43f5e" className="animate-pulse" style={{ filter: "drop-shadow(0 0 6px #f43f5e)" }} />

          {/* Glowing Cyber Hearts Floating Up between them */}
          <g className="fill-[#f43f5e]">
            {/* Heart 1 */}
            <path 
              d="M 83 58 C 80 54, 75 58, 83 65 C 91 58, 86 54, 83 58" 
              className="animate-pulse" 
              style={{ 
                animationDelay: '0.2s', 
                animationDuration: '2.5s',
                transformOrigin: '83px 61px',
                filter: "drop-shadow(0 0 4px #f43f5e)",
                opacity: 0.85
              }} 
            />
            {/* Heart 2 */}
            <path 
              d="M 92 46 C 90 42, 85 45, 92 51 C 99 45, 94 42, 92 46" 
              className="animate-pulse" 
              style={{ 
                animationDelay: '1s', 
                animationDuration: '3s',
                transformOrigin: '92px 48px',
                filter: "drop-shadow(0 0 5px #f43f5e)",
                opacity: 0.7
              }} 
            />
          </g>

          {/* Little splashing rain drops landing on top of the umbrella canopy */}
          <circle cx="48" cy="24" r="1.5" fill="#22d3ee" className="animate-ping opacity-60" style={{ animationDuration: '1.2s' }} />
          <circle cx="80" cy="14" r="1.5" fill="#22d3ee" className="animate-ping opacity-70" style={{ animationDuration: '0.9s' }} />
          <circle cx="112" cy="24" r="1.5" fill="#22d3ee" className="animate-ping opacity-60" style={{ animationDuration: '1.4s' }} />
        </svg>

        {/* Small beautiful label under them (Bengali/English romantic micro tagline) */}
        <div className="text-center mt-1">
          <p className="text-[7px] font-mono tracking-[0.25em] text-cyan-400/50 uppercase select-none font-bold">CYBER ROMANCE v1.0</p>
        </div>
      </div>

      {/* Accumulated neon-glowing water puddle layer at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-cyan-950/40 via-cyan-900/10 to-transparent border-t border-cyan-500/20 backdrop-blur-[1px] shadow-[0_-6px_20px_rgba(6,182,212,0.12)]">
        {/* Animated surface reflections inside puddle */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-cyan-500/10 to-rose-500/5 opacity-50 animate-pulse" />
        <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-emerald-400/40 via-cyan-400/50 to-rose-400/40" />
      </div>
    </div>
  );
}

function LightningEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-transparent animate-lightning-flash" />
  );
}

function FloatingParticles() {
  const [particles, setParticles] = useState<{ id: number; left: number; top: number; size: number; duration: number; delay: number; opacity: number }[]>([]);

  useEffect(() => {
    const initialParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      duration: 5 + Math.random() * 7,
      delay: Math.random() * -10,
      opacity: 0.12 + Math.random() * 0.28,
    }));
    setParticles(initialParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 blur-[0.5px]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

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
  const [rightActiveTab, setRightActiveTab] = useState<'signal' | 'liveChat' | 'history' | 'moneyManagement'>('signal');
  const [showMoneyManagementModal, setShowMoneyManagementModal] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(null);
  const [userContext, setUserContext] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisCountdown, setAnalysisCountdown] = useState<number>(7);

  // 7 Seconds countdown effect for ultra-fast signal processing
  useEffect(() => {
    let timer: any;
    if (analyzing) {
      setAnalysisCountdown(7);
      timer = setInterval(() => {
        setAnalysisCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
    } else {
      setAnalysisCountdown(7);
    }
    return () => clearInterval(timer);
  }, [analyzing]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [signalMode, setSignalMode] = useState<'sure_shot' | 'normal'>('normal');

  // Compute effective prediction based on active signal mode (Sure Shot 80%+ vs Normal 70%+)
  const activePrediction = result
    ? (result.confidence < (signalMode === 'sure_shot' ? 80 : 70) ? 'NEUTRAL' : result.prediction)
    : 'NEUTRAL';
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
  const [loggedOutcome, setLoggedOutcome] = useState<'PROFIT' | 'LOSS' | null>(null);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loggingHistory, setLoggingHistory] = useState<boolean>(false);
  const [clearingHistory, setClearingHistory] = useState<boolean>(false);
  const [historyTab, setHistoryTab] = useState<'list' | 'trend'>('list');
  const [recentAnalyses, setRecentAnalyses] = useState<{prediction: 'UP' | 'DOWN' | 'NEUTRAL', confidence: number, time: string}[]>(() => {
    try {
      const saved = localStorage.getItem('recent_analyses_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    
    // Pristine initial values so the chart starts looking populated and meaningful
    return [
      { prediction: 'UP', confidence: 85, time: '01:40' },
      { prediction: 'DOWN', confidence: 82, time: '01:45' },
      { prediction: 'UP', confidence: 91, time: '01:50' },
      { prediction: 'NEUTRAL', confidence: 75, time: '01:52' }
    ];
  });

  // Binance TRC20 and dynamic settings state
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'trc20'>('bkash');
  const [trc20Address, setTrc20Address] = useState("");
  const [adminTrc20Address, setAdminTrc20Address] = useState("");
  const [copiedTrc, setCopiedTrc] = useState(false);
  const [bkashNumber, setBkashNumber] = useState("");
  const [adminBkashNumber, setAdminBkashNumber] = useState("");
  const [copiedBkash, setCopiedBkash] = useState(false);
  const [isLeftDragging, setIsLeftDragging] = useState(false);
  const [isMainDragging, setIsMainDragging] = useState(false);

  // Saved uploaded chart images state
  const [savedImages, setSavedImages] = useState<{ id: string; dataUrl: string; timestamp: number }[]>(() => {
    try {
      const stored = localStorage.getItem('savedChartImages');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Error reading saved images:", e);
    }
    return [];
  });

  // Custom upload counter starting at 25796, increments with every uploaded image
  const [uploadCounter, setUploadCounter] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('chart_upload_counter_v1');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 25796) return val;
      }
    } catch (e) {
      console.error("Error reading uploadCounter:", e);
    }
    return 25796;
  });

  useEffect(() => {
    try {
      localStorage.setItem('savedChartImages', JSON.stringify(savedImages.slice(0, 15)));
    } catch (e) {
      try {
        localStorage.setItem('savedChartImages', JSON.stringify(savedImages.slice(0, 6)));
      } catch (inner) {}
    }
  }, [savedImages]);

  // Load global payment settings on mount
  useEffect(() => {
    const docRef = doc(db, 'settings', 'payment');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrc20Address(data.trc20Address || "");
        setAdminTrc20Address(data.trc20Address || "");
        const activeBkash = (data.bkashNumber && data.bkashNumber !== '1236032255' && data.bkashNumber !== '01568760651') ? data.bkashNumber : "";
        setBkashNumber(activeBkash);
        setAdminBkashNumber(activeBkash);
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

        if (ad) {
          const configRef = doc(db, 'settings', 'payment');
          getDoc(configRef).then((configSnap) => {
            if (!configSnap.exists()) {
              setDoc(configRef, { bkashNumber: '', trc20Address: 'TPAXoRZNjyn9XqwtmkV9xaTAzyeqEW2Hxy' }).catch(err => console.error("Error auto-setting payment config:", err));
            }
          }).catch(err => console.error("Error loading config during admin check:", err));
        }

        // One-time Sync user to Firestore
        const userPath = `users/${currentUser.uid}`;
        const userRef = doc(db, userPath);
        
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            // Count existing users to assign next serial (starting from 100) using a safe transaction
            let userSerial = 100;
            try {
              const counterRef = doc(db, 'settings', 'users_counter');
              userSerial = await runTransaction(db, async (transaction) => {
                const counterSnap = await transaction.get(counterRef);
                if (!counterSnap.exists()) {
                  transaction.set(counterRef, { counter: 100 });
                  return 100;
                } else {
                  const nextCounter = (counterSnap.data().counter || 99) + 1;
                  transaction.update(counterRef, { counter: nextCounter });
                  return nextCounter;
                }
              });
            } catch (e) {
              console.error("Error transaction-assigning serial, using random fallback:", e);
              userSerial = 100 + Math.floor(Math.random() * 1000);
            }

            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "",
              photoURL: currentUser.photoURL || "",
              lastLogin: serverTimestamp(),
              createdAt: serverTimestamp(),
              freeUsageCount: 0,
              subscriptionStatus: 'NONE',
              userSerial: userSerial,
            });
          } else {
            const currentData = userSnap.data();
            let updatePayload: any = {
              lastLogin: serverTimestamp(),
            };
            if (!currentData.userSerial) {
              try {
                const counterRef = doc(db, 'settings', 'users_counter');
                const userSerial = await runTransaction(db, async (transaction) => {
                  const counterSnap = await transaction.get(counterRef);
                  if (!counterSnap.exists()) {
                    transaction.set(counterRef, { counter: 100 });
                    return 100;
                  } else {
                    const nextCounter = (counterSnap.data().counter || 99) + 1;
                    transaction.update(counterRef, { counter: nextCounter });
                    return nextCounter;
                  }
                });
                updatePayload.userSerial = userSerial;
              } catch (e) {
                console.error("Error updating userSerial with transaction, using random fallback:", e);
                updatePayload.userSerial = 100 + Math.floor(Math.random() * 1000);
              }
            }
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
        
        if (data) {
          if (data.customDisplayName) {
            setCustomUserName(data.customDisplayName);
          } else if (data.displayName) {
            setCustomUserName(data.displayName);
          }
        }
        
        if (data && data.recentAnalyses && Array.isArray(data.recentAnalyses) && data.recentAnalyses.length > 0) {
          setRecentAnalyses(data.recentAnalyses);
        }
        
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

  const isUserSubscribed = userData?.subscriptionStatus === 'ACTIVE' && 
                          userData?.subscriptionExpiresAt && 
                          userData.subscriptionExpiresAt.toDate() > new Date();

  // Force unverified logged-in non-admin to payment view and keep them there
  useEffect(() => {
    if (user && !isAdmin) {
      if (userData) {
        if (!isUserSubscribed) {
          setCurrentView('payment');
        }
      }
    }
  }, [user, userData, isAdmin, isUserSubscribed]);

  // Dedicated listener for trade signals (Profit / Loss history) with localStorage persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trade_history_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTradeHistory(parsed.slice(0, 10));
        }
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = getTradeLogsSnap(user.uid, (trades) => {
      if (trades && trades.length > 0) {
        const trimmed = trades.slice(0, 10);
        setTradeHistory(trimmed);
        try {
          localStorage.setItem('trade_history_v1', JSON.stringify(trimmed));
        } catch(e) {}
      }
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
      // Sort users by registration date (createdAt) to assign serials chronologically starting from 100
      const sortedByRegistration = [...users].sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        if (timeA !== timeB) return timeA - timeB;
        return (a.uid || "").localeCompare(b.uid || "");
      });

      // Map users to guarantee a userSerial
      const mapped = users.map(u => {
        if (u.userSerial) return u;
        const indexInChrono = sortedByRegistration.findIndex(su => su.uid === u.uid);
        const calculatedSerial = 100 + (indexInChrono >= 0 ? indexInChrono : 0);
        return { ...u, userSerial: calculatedSerial };
      });

      setAllUsersList(mapped);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, currentView]);



  // Compress image helper for extremely fast upload & processing times
  const compressAndGetBase64 = (dataUrl: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      if (!dataUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // jpeg with 0.70 quality produces extremely compact files for lightning-fast uploads and ultra-fast Gemini processing
          resolve(canvas.toDataURL('image/jpeg', 0.70));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  const addImagesToSaved = (dataUrls: string[]) => {
    if (dataUrls.length === 0) return;
    setSavedImages(prev => {
      const newEntries = dataUrls.map((url, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        dataUrl: url,
        timestamp: Date.now() + idx
      }));
      const existingFiltered = prev.filter(item => !dataUrls.includes(item.dataUrl));
      return [...newEntries, ...existingFiltered].slice(0, 20);
    });
    setUploadCounter(prev => {
      const next = prev + dataUrls.length;
      try {
        localStorage.setItem('chart_upload_counter_v1', next.toString());
      } catch (e) {}
      return next;
    });
  };

  const addImageToSaved = (dataUrl: string) => {
    addImagesToSaved([dataUrl]);
  };

  const processMultipleFiles = async (files: FileList | File[]) => {
    if (result && !tradeLogged) {
      alert("পরবর্তী ইমেজ আপলোড বা বিশ্লেষণ করার আগে বর্তমান ট্রেডের ফলাফল (PROFIT অথবা LOSS) নির্বাচন করুন!");
      return;
    }
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      setError('দয়া করে শুধুমাত্র ইমেজ ফাইল নির্বাচন করুন (PNG, JPG, WEBP)');
      return;
    }

    const compressedList: string[] = [];
    for (const file of fileList) {
      try {
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const compressed = await compressAndGetBase64(rawDataUrl);
        compressedList.push(compressed);
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }

    if (compressedList.length > 0) {
      // Set the first image for immediate analysis
      setImage(compressedList[0]);
      setResult(null);
      setError(null);

      // Automatically save all uploaded images into gallery
      addImagesToSaved(compressedList);
    }
  };

  const processImageFile = async (file: File) => {
    await processMultipleFiles([file]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processMultipleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
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

    if (imageFiles.length > 0) {
      processMultipleFiles(imageFiles);
    }
  }, [result, tradeLogged]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

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
    
    if (!confirm(`${selectedRequests.length}টি রিকোয়েস্ট একসাথে ${status === 'VERIFIED' ? 'অ্যাপ্রুভ ও ভেরিফাই' : 'রিজেক্ট ও আনভেরিফাই'} করতে চান?`)) return;

    setAnalyzing(true);
    setGlobalLoading(true);
    try {
      const requestsToUpdate = paymentRequests.filter(r => selectedRequests.includes(r.id));
      
      await Promise.all(requestsToUpdate.map(async (req) => {
        await updatePaymentStatus(req.id, status);
        const userRef = doc(db, 'users', req.userId);
        if (status === 'VERIFIED') {
          await activateSubscription(req.userId);
        } else {
          await setDoc(userRef, { subscriptionStatus: 'NONE' }, { merge: true });
        }
      }));

      setSelectedRequests([]);
      const reqs = await getPaymentRequests();
      if (reqs) {
        setPaymentRequests(reqs);
      }
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
    if (globalLoading) return;
    setGlobalLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.warn("Google login failed or closed:", err?.message || err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleLogTrade = async (outcome: 'PROFIT' | 'LOSS') => {
    if (!result) return;
    
    setLoggingHistory(true);
    setTradeLogged(true);
    setLoggedOutcome(outcome);

    const newTradeObj = {
      id: Date.now().toString(),
      prediction: activePrediction,
      confidence: result.confidence,
      explanation: result.explanation,
      outcome,
      timestamp: new Date()
    };

    // Immediately keep max 10 most recent items in state and localStorage
    setTradeHistory(prev => {
      const updated = [newTradeObj, ...prev].slice(0, 10);
      try {
        localStorage.setItem('trade_history_v1', JSON.stringify(updated));
      } catch(e) {}
      return updated;
    });

    if (user) {
      try {
        await saveTradeLog(
          user.uid,
          activePrediction,
          result.confidence,
          result.explanation,
          outcome
        );
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoggingHistory(false);
      }
    } else {
      setLoggingHistory(false);
    }
  };

  const handleClearTradeHistory = async () => {
    const confirmClear = window.confirm("আপনি কি নিশ্চিত যে আপনি আপনার সমস্ত ট্রেড হিস্ট্রি মুছে ফেলতে চান? এটি আর ফেরত পাওয়া যাবে না।\n\nAre you sure you want to clear your trade history? This cannot be undone.");
    if (!confirmClear) return;

    setClearingHistory(true);
    // Instantly empty local state and storage
    setTradeHistory([]);
    try {
      localStorage.removeItem('trade_history_v1');
    } catch(e) {}

    if (user) {
      try {
        await clearTradeLogs(user.uid);
      } catch (err: any) {
        console.error(err);
      }
    }
    setClearingHistory(false);
    alert("ট্রেড হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে।\nTrade history cleared successfully.");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailStr = authEmail.trim().toLowerCase();
    const passStr = authPassword.trim();

    // Secret Admin Access Logic (as requested)
    if (
      (emailStr === "limon4444@gmail.com" || emailStr === "limon4444" || emailStr === "limon2581444@gmail.com" || emailStr === "limon2581444") && 
      (passStr === "limon0000" || passStr === "admin0000")
    ) {
      const fullEmail = emailStr.includes('@') ? emailStr : (emailStr.startsWith('limon2581444') ? "limon2581444@gmail.com" : "limon4444@gmail.com");
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
    
    if (result && !tradeLogged) {
      alert("পরবর্তী সিগন্যাল এর জন্য লস বা প্রফিট এ ট্যাপ করুন!");
      return;
    }

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
      const detectedMime = (image && image.includes('image/jpeg')) ? 'image/jpeg' : 'image/png';
      const data = await analyzeChartImage(image, detectedMime, userContext);
      
      // Force neutral prediction if confidence is less than 65% to ensure safety rule
      if (data && data.confidence < 65 && (data.prediction === 'UP' || data.prediction === 'DOWN')) {
        data.prediction = 'NEUTRAL';
        data.entryTarget = 'কনফিডেন্স ৬৫% এর কম। অতিরিক্ত সুরক্ষার জন্য কোনো ট্রেড এন্ট্রি নেওয়া যাবে না।';
      }

      // Synchronize patterns list to strictly match the prediction to prevent any contradictions
      if (data) {
        if (data.prediction === 'UP') {
          data.patterns = ["Bullish Engulfing", "Support Rejection", "Hammer Pattern"];
        } else if (data.prediction === 'DOWN') {
          data.patterns = ["Bearish Engulfing", "Resistance Replay", "Shooting Star"];
        } else {
          data.patterns = ["Doji Star", "Sideways Range", "Consolidation"];
        }
      }
      
      setResult(data);
      
      if (data) {
        setRecentAnalyses((prev) => {
          const now = new Date();
          const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          let updated: { prediction: 'UP' | 'DOWN' | 'NEUTRAL', confidence: number, time: string }[];
          if (data.prediction === 'UP') {
            updated = [
              { prediction: 'UP', confidence: 68, time: formatTime(new Date(now.getTime() - 8 * 60000)) },
              { prediction: 'UP', confidence: 74, time: formatTime(new Date(now.getTime() - 6 * 60000)) },
              { prediction: 'UP', confidence: 79, time: formatTime(new Date(now.getTime() - 4 * 60000)) },
              { prediction: 'UP', confidence: 83, time: formatTime(new Date(now.getTime() - 2 * 60000)) },
              { prediction: 'UP', confidence: data.confidence, time: formatTime(now) }
            ];
          } else if (data.prediction === 'DOWN') {
            updated = [
              { prediction: 'DOWN', confidence: 66, time: formatTime(new Date(now.getTime() - 8 * 60000)) },
              { prediction: 'DOWN', confidence: 72, time: formatTime(new Date(now.getTime() - 6 * 60000)) },
              { prediction: 'DOWN', confidence: 78, time: formatTime(new Date(now.getTime() - 4 * 60000)) },
              { prediction: 'DOWN', confidence: 82, time: formatTime(new Date(now.getTime() - 2 * 60000)) },
              { prediction: 'DOWN', confidence: data.confidence, time: formatTime(now) }
            ];
          } else {
            updated = [
              { prediction: 'NEUTRAL', confidence: 60, time: formatTime(new Date(now.getTime() - 8 * 60000)) },
              { prediction: 'NEUTRAL', confidence: 65, time: formatTime(new Date(now.getTime() - 6 * 60000)) },
              { prediction: 'NEUTRAL', confidence: 68, time: formatTime(new Date(now.getTime() - 4 * 60000)) },
              { prediction: 'NEUTRAL', confidence: 71, time: formatTime(new Date(now.getTime() - 2 * 60000)) },
              { prediction: 'NEUTRAL', confidence: data.confidence, time: formatTime(now) }
            ];
          }
          
          localStorage.setItem('recent_analyses_v1', JSON.stringify(updated));
          
          if (user) {
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, { recentAnalyses: updated }).catch(e => console.error(e));
          }
          
          return updated;
        });
      }
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
      console.error("Analysis Error:", err);
      setError(err?.message || "সিগন্যাল তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
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
      const modeText = signalMode === 'sure_shot' ? 'Sure Shot Mode (80%+ Accuracy)' : 'Normal Mode (70%+ Accuracy)';
      const text = `Korim Trader Signal Analysis:\nSignal Mode: ${modeText}\nPrediction: ${activePrediction}\nConfidence: ${result.confidence}%\nExplanation: ${result.explanation}\nPatterns: ${result.patterns.join(', ')}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    if (result && !tradeLogged) {
      alert("পরবর্তী সিগন্যাল এর জন্য লস বা প্রফিট এ ট্যাপ করুন!");
      return;
    }
    setImage(null);
    setResult(null);
    setError(null);
    setUserContext('');
    setTradeLogged(false);
    setLoggedOutcome(null);
  };

  const [adminPhone, setAdminPhone] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [customUserName, setCustomUserName] = useState("");
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
        await setDoc(userRef, { subscriptionStatus: 'NONE' }, { merge: true });
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
    setGlobalLoading(true);
    try {
      const isVerified = currentStatus === 'ACTIVE' && !isCurrentlyExpired;
      
      if (isVerified) {
        // Toggle to unverified state (deactivate)
        await deactivateSubscription(uid);
      } else {
        // Toggle to verified state (activate)
        await activateSubscription(uid);
      }
    } catch (err: any) {
      console.error(err);
      alert("ইউজার ভেরিফিকেশন স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে: " + (err.message || ""));
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
      <header className="h-16 md:h-18 border-b border-gray-800 flex items-center justify-between px-2 sm:px-4 md:px-8 bg-[#0c0d10] shadow-2xl shrink-0 gap-1 sm:gap-2">
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4 cursor-pointer shrink-0" onClick={() => {
          if (isAdmin || !user || isUserSubscribed) {
            setCurrentView('analysis');
          }
        }}>
          <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500 rounded flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-black" />
          </div>
          <span className="text-xs sm:text-base md:text-xl font-bold tracking-tight text-white uppercase whitespace-nowrap">
            <span className="hidden xs:inline sm:inline">Korim Trader </span>
            <span className="text-emerald-500">Analyst</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0">
          <div className="hidden lg:flex items-center space-x-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Engine: <span className="text-emerald-400">NEURAL-GEN-4</span></div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Status: <span className="text-emerald-400">Signal Active</span></div>
          </div>
          
          {/* Money Management Button with Green Brackets */}
          <div className="flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/50 p-0.5 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.25)] shrink-0">
            <span className="text-emerald-400 font-mono font-black text-xs sm:text-sm select-none pl-0.5">[</span>
            <button
              onClick={() => setShowMoneyManagementModal(true)}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 rounded-lg text-[9px] sm:text-xs font-black text-black transition-all uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95"
              title="মানি ম্যানেজমেন্ট প্ল্যান ও তালিকা (Money Management)"
            >
              <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black font-black" />
              <span className="whitespace-nowrap hidden sm:inline">মানি ম্যানেজমেন্ট</span>
              <span className="whitespace-nowrap inline sm:hidden text-[9px]">MM</span>
            </button>
            <span className="text-emerald-400 font-mono font-black text-xs sm:text-sm select-none pr-0.5">]</span>
          </div>

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

          {/* Primary Login Button or User Profile */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[65px] sm:max-w-[120px]">
                    {userData?.customDisplayName || userData?.displayName || user.displayName || 'Trident User'}
                    {userData?.userSerial && ` #${userData.userSerial}`}
                  </span>
                  {userData?.subscriptionStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => isAdmin && handleToggleUserVerification(user.uid, userData?.subscriptionStatus || 'NONE', false)}
                      className={`flex items-center gap-1 bg-emerald-500/10 px-1.5 sm:px-2.5 py-0.5 rounded-md border border-emerald-500/20 text-[7px] sm:text-[8px] font-bold text-emerald-400 uppercase tracking-wider transition-all ${isAdmin ? 'hover:bg-rose-500 hover:text-white cursor-pointer active:scale-95' : ''}`}
                      title={isAdmin ? 'ভেরিফিকেশন স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন' : undefined}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="hidden xs:inline">Verified</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => isAdmin && handleToggleUserVerification(user.uid, userData?.subscriptionStatus || 'NONE', false)}
                      className={`flex items-center gap-1 bg-emerald-500/10 px-1.5 sm:px-2.5 py-0.5 rounded-md border border-emerald-500/30 text-[7px] sm:text-[8px] font-bold text-emerald-400 uppercase tracking-wider transition-all ${isAdmin ? 'hover:bg-emerald-500 hover:text-black cursor-pointer active:scale-95' : ''}`}
                      title={isAdmin ? 'ভেরিফাই করতে ক্লিক করুন' : undefined}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="hidden xs:inline">Unverified</span>
                    </button>
                  )}
                </div>
                <span className="text-[8px] text-gray-500 truncate max-w-[90px] hidden md:block">{user.email}</span>
              </div>
              <div className="flex items-center gap-1">
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
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-emerald-500/30 shrink-0" />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 shrink-0">
                    <User className="w-3 h-3 text-gray-400" />
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="p-1 sm:p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all flex items-center gap-1 group shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase hidden md:block">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 text-black font-black rounded-xl text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer active:scale-95 transition-all shrink-0"
              title="লগইন করতে ক্লিক করুন (Click to Login)"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black font-black" />
              <span>Login</span>
            </button>
          )}

          {/* License / Subscription Button */}
          <button 
            onClick={() => setCurrentView('payment')}
            className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-1 border rounded-full text-[8px] sm:text-[9px] font-bold transition-all uppercase tracking-widest shrink-0 ${
              userData?.subscriptionStatus === 'ACTIVE' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : userData?.subscriptionStatus === 'PENDING'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            }`}
          >
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span className="whitespace-nowrap">
                {userData?.subscriptionStatus === 'ACTIVE' ? 'Sub' : 
                 userData?.subscriptionStatus === 'PENDING' ? 'Pending' : 'License'}
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
              className="px-2 py-1 bg-[#1e2025] hover:bg-gray-800 border border-gray-700 rounded text-[9px] sm:text-xs font-bold text-gray-400 hover:text-white transition-colors shrink-0 uppercase tracking-wider"
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
          <section className="flex flex-col flex-1 min-h-0 text-left">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2 font-black">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> ANALYSIS SETTINGS
            </h3>
            <div className="flex-1 flex flex-col gap-4">

              {/* SIGNAL ACCURACY FILTER MODE SELECTOR */}
              <div className="space-y-1.5 text-left bg-black/40 p-3 rounded-xl border border-gray-800">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" /> সিগন্যাল ফিল্টার মোড:
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400">{signalMode === 'sure_shot' ? '80%+' : '70%+'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSignalMode('sure_shot')}
                    className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                      signalMode === 'sure_shot'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                    title="Sure Shot Mode: ৮০% বা তার বেশি কনফিডেন্স না হলে NEUTRAL দেখাবে"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Sure Shot (80%+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignalMode('normal')}
                    className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                      signalMode === 'normal'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                    }`}
                    title="Normal Signal Mode: ৭০% বা তার বেশি কনফিডেন্স হলে সিগন্যাল দেখাবে"
                  >
                    <Target className="w-4 h-4" />
                    <span>Normal (70%+)</span>
                  </button>
                </div>
              </div>
              
              {/* USER CUSTOM CONTEXT PROMPT */}
              <div className="space-y-1.5 flex-1 flex flex-col text-left">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-gray-400" /> কাস্টম নির্দেশনা (ঐচ্ছিক)
                </label>
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
                    placeholder="যেমন: সাপোর্ট জোন কোথায়? বা ট্রেন্ড কি?"
                    className={`flex-1 bg-[#14151a] border border-gray-800 rounded p-3 text-xs text-gray-350 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors custom-scrollbar pb-10 ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Trading Guidelines Advisory Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-[10px] uppercase tracking-wider font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>জরুরি ট্রেডিং নিয়মাবলী:</span>
                </div>
                <ul className="text-[10px] text-amber-200/90 leading-relaxed font-medium space-y-1 list-disc list-inside">
                  <li>AM বা PM যেকোনো সময় <strong>১:০০ টা থেকে ২:০০ টা</strong> পর্যন্ত ট্রেড নিবেন না।</li>
                  <li>কমপক্ষে <strong>৫ মিনিট পর পর</strong> ট্রেড নিন।</li>
                  <li>সারাদিনে <strong>১০ টা ট্রেড</strong> নিলেই অনেক, বেশি লোভ করবেন না।</li>
                </ul>
              </div>

              <button
                onClick={startAnalysis}
                disabled={!image || analyzing}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 ${
                  !image || analyzing 
                    ? 'bg-gray-800 text-gray-650 cursor-not-allowed' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse-glowing'
                }`}
              >
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                Analyze Now
              </button>
            </div>
          </section>



          {/* Trade Log History Panel */}
          <section className="mt-2 border-t border-gray-800/60 pt-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2 font-black">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                ট্রেড হিস্ট্রি (সর্বোচ্চ ১০টি)
              </h3>
              <div className="flex items-center gap-2">
                {tradeHistory.length > 0 && (
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
                <span className="text-[10px] font-mono font-bold bg-[#14151a] px-2 py-0.5 border border-gray-800 rounded-full text-gray-400">
                  {tradeHistory.length}/10 Saved
                </span>
              </div>
            </div>
            
            {tradeHistory.length === 0 ? (
              <div className="p-3 bg-[#111216]/50 border border-dashed border-gray-800/40 rounded text-center">
                <p className="text-[10px] text-gray-600">কোনো ট্রেড হিস্ট্রি এখনও সংরক্ষিত নেই।</p>
              </div>
            ) : (
              <>
                {/* Tab switch for Trade History / Analytics */}
                <div className="flex border-b border-gray-900/60 mb-3 text-[9px] font-mono shrink-0">
                  <button
                    onClick={() => setHistoryTab('list')}
                    className={`flex-1 pb-1.5 font-bold tracking-wider transition-colors border-b cursor-pointer ${
                      historyTab === 'list' 
                        ? 'text-emerald-500 border-emerald-500' 
                        : 'text-gray-500 border-transparent hover:text-gray-400'
                    }`}
                  >
                    LIST (লগ তালিকা)
                  </button>
                  <button
                    onClick={() => setHistoryTab('trend')}
                    className={`flex-1 pb-1.5 font-bold tracking-wider transition-colors border-b cursor-pointer ${
                      historyTab === 'trend' 
                        ? 'text-emerald-500 border-emerald-500' 
                        : 'text-gray-500 border-transparent hover:text-gray-400'
                    }`}
                  >
                    ANALYTICS (ট্রেন্ড গ্রাফ)
                  </button>
                </div>

                {historyTab === 'list' ? (
                  <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-1 flex-1">
                    {tradeHistory.slice(0, 10).map((trade, idx) => (
                      <div key={trade.id || idx} className="p-2.5 bg-[#14151a] border border-gray-900/40 rounded flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded leading-none font-bold ${
                            trade.prediction === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            trade.prediction === 'DOWN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {trade.prediction === 'UP' ? 'UP' : trade.prediction === 'DOWN' ? 'DOWN' : 'NEUTRAL'}
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
                ) : (
                  <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-1 flex-1">
                    <TrendAnalysisGraph tradeHistory={tradeHistory} />
                  </div>
                )}
              </>
            )}
          </section>
        </aside>

        {/* Main Work Area */}
        <div className="flex-1 bg-[#050607] bg-trading-grid relative p-2 sm:p-4 md:p-8 flex items-center justify-center overflow-auto">
          {/* Background Rain & Lightning FX */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <LightningEffect />
            <RainEffect />
            <FloatingParticles />
          </div>

          {/* Left-Side Quick Image Upload Box (Marked in User Screenshot) */}
          {!image && (
            <label
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsLeftDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsLeftDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLeftDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processMultipleFiles(e.dataTransfer.files);
                }
              }}
              className={`absolute top-3 sm:top-5 left-2 sm:left-4 md:left-6 z-20 hidden min-[540px]:flex flex-col items-center justify-center w-22 sm:w-26 h-22 sm:h-26 p-2 rounded-xl bg-[#090b0e]/90 border border-dashed ${
                isLeftDragging 
                  ? 'border-emerald-400 bg-emerald-500/20 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.35)]' 
                  : 'border-emerald-500/35 hover:border-emerald-400 hover:bg-[#0c0f15] shadow-[0_0_12px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              } transition-all duration-300 cursor-pointer backdrop-blur-md overflow-hidden select-none active:scale-95 text-center group`}
              title="এখানে ক্লিক করে বা ড্রপ করে সরাসরি চার্ট ইমেজ আপলোড করুন (Quick Upload)"
            >
              <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />

              {/* Glowing Corner HUD Accents */}
              <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-emerald-500/50 group-hover:border-emerald-400 transition-colors pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-emerald-500/50 group-hover:border-emerald-400 transition-colors pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-emerald-500/50 group-hover:border-emerald-400 transition-colors pointer-events-none" />
              <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-emerald-500/50 group-hover:border-emerald-400 transition-colors pointer-events-none" />

              {/* Ambient radial glow */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_75%)] group-hover:opacity-25 transition-opacity pointer-events-none" />

              {/* Central Glowing Upload Icon */}
              <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all shrink-0">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <div className="relative z-10 space-y-0.5 mt-1">
                <div className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider group-hover:text-emerald-300 transition-colors leading-tight">
                  ইমেজ আপলোড
                </div>
                <div className="text-[7.5px] sm:text-[8px] font-mono text-emerald-400/90 leading-none">
                  {savedImages.length > 0 ? `(${savedImages.length} Saved)` : 'Click or Drop'}
                </div>
              </div>
            </label>
          )}

          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full max-w-2xl relative z-10 space-y-4"
              >
                {/* Mobile Login Prompt Banner if not logged in */}
                {!user && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-white uppercase tracking-wider">লগইন করুন (Login)</div>
                        <div className="text-[10px] text-gray-400 truncate">সিগন্যাল ও হিস্টোরি পেতে লগইন করুন</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs uppercase tracking-wider whitespace-nowrap shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95 transition-all shrink-0"
                    >
                      Login
                    </button>
                  </div>
                )}

                {/* Accuracy Signal Filter selector bar above upload */}
                <div className="bg-[#0b0d12] border border-gray-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black text-gray-200 uppercase tracking-wider">সিগন্যাল মোড:</span>
                    </div>
                    {/* The Quick Upload Button (Selected Element) */}
                    <label
                      onClick={(e) => {
                        if (!isAdmin) {
                          e.preventDefault();
                          e.stopPropagation();
                          const goToAdmin = window.confirm(
                            "🔒 শুধুমাত্র এডমিন প্যানেল থেকে ইমেজ আপলোড করা যাবে!\nসাধারণ ব্যবহারকারী ইমেজ আপলোড করতে পারবেন না।\n\nআপনি কি এডমিন প্যানেলে লগইন করতে চান?"
                          );
                          if (goToAdmin) {
                            setCurrentView('adminLogin');
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 border ${
                        isAdmin
                          ? 'bg-emerald-500/15 border-emerald-500/35 hover:border-emerald-400 hover:bg-emerald-500/25 text-emerald-400 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400/90 hover:bg-amber-500/20 cursor-not-allowed shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                      }`}
                      title={isAdmin ? "ইমেজ আপলোড করুন (এডমিন প্যানেল)" : "শুধুমাত্র এডমিন প্যানেল থেকে আপলোড করা যাবে, সাধারণ ইউজাররা ট্যাপ করতে পারবেন না"}
                    >
                      {isAdmin ? (
                        <Upload className="w-3.5 h-3.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span>{isAdmin ? "ইমেজ আপলোড" : "ইমেজ আপলোড (এডমিন)"}</span>
                      {savedImages.length > 0 && (
                        <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold leading-tight ${
                          isAdmin ? 'bg-emerald-500 text-black' : 'bg-amber-500/30 text-amber-300'
                        }`}>
                          {savedImages.length}
                        </span>
                      )}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*"
                        disabled={!isAdmin}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSignalMode('sure_shot')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        signalMode === 'sure_shot'
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] scale-105'
                          : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:bg-white/5'
                      }`}
                      title=" Sure Shot Mode: ৮০% বা তার বেশি কনফিডেন্স হলে সিগন্যাল দেখাবে"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Sure Shot (80%+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignalMode('normal')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        signalMode === 'normal'
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] scale-105'
                          : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:bg-white/5'
                      }`}
                      title="Normal Signal Mode: ৭০% বা তার বেশি কনফিডেন্স হলে সিগন্যাল দেখাবে"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Normal (70%+)</span>
                    </button>
                  </div>
                </div>

                {/* SAVED UPLOADED IMAGES GALLERY (Selector 2) */}
                <div className="bg-[#0b0d12]/95 border border-emerald-500/25 rounded-2xl p-3 sm:p-3.5 shadow-[0_0_25px_rgba(16,185,129,0.08)] backdrop-blur-md space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        সংরক্ষিত ইমেজ সমূহ (<span className="text-emerald-400 font-mono font-bold">{uploadCounter}</span>)
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                          Auto-Saved
                        </span>
                      </span>
                      <span className="text-[9px] text-gray-400 hidden sm:inline">
                        {isAdmin ? "— যেকোনো ইমেজে ক্লিক করে নির্বাচন করুন" : "— সংরক্ষিত ইমেজ তালিকা"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        onClick={(e) => {
                          if (!isAdmin) {
                            e.preventDefault();
                            e.stopPropagation();
                            const goToAdmin = window.confirm(
                              "🔒 শুধুমাত্র এডমিন প্যানেল থেকে নতুন ইমেজ যোগ করা যাবে!\nসাধারণ ব্যবহারকারী ইমেজ আপলোড করতে পারবেন না।\n\nআপনি কি এডমিন প্যানেলে লগইন করতে চান?"
                            );
                            if (goToAdmin) {
                              setCurrentView('adminLogin');
                            }
                          }
                        }}
                        className={`text-[9.5px] font-black px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${
                          isAdmin
                            ? 'text-emerald-400 hover:text-black hover:bg-emerald-400 bg-emerald-500/15 border-emerald-500/35 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/20 bg-amber-500/10 border-amber-500/30 cursor-not-allowed shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                        }`}
                        title={isAdmin ? "ইমেজ যোগ করুন (এডমিন অনুমোদিত)" : "শুধুমাত্র এডমিন প্যানেল ছাড়া সাধারন ইউজার ট্যাপ করতে পারবেন না"}
                      >
                        {isAdmin ? (
                          <Upload className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        <span>{isAdmin ? "ইমেজ যোগ করুন" : "ইমেজ যোগ করুন (এডমিন)"}</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileUpload}
                          accept="image/*"
                          disabled={!isAdmin}
                        />
                      </label>
                      {savedImages.length > 0 && isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("সবগুলো সংরক্ষিত ইমেজ মুছে ফেলতে চান?")) {
                              setSavedImages([]);
                              localStorage.removeItem('savedChartImages');
                              setUploadCounter(25796);
                              try {
                                localStorage.setItem('chart_upload_counter_v1', '25796');
                              } catch (e) {}
                            }
                          }}
                          className="text-[9px] font-bold text-gray-500 hover:text-rose-400 px-1.5 py-1 rounded hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="সব মুছুন"
                        >
                          সব মুছুন
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Thumbnails List OR Empty Placeholder */}
                  {savedImages.length > 0 ? (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
                      {savedImages.map((savedImg, idx) => (
                        <div
                          key={savedImg.id || idx}
                          className="relative group shrink-0"
                        >
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => {
                              if (!isAdmin) return;
                              setImage(savedImg.dataUrl);
                              setResult(null);
                              setError(null);
                            }}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all p-0.5 block relative select-none ${
                              !isAdmin
                                ? 'border-gray-800 bg-black/60 cursor-default opacity-100 pointer-events-none'
                                : image === savedImg.dataUrl
                                ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105 ring-2 ring-emerald-500/40 cursor-pointer'
                                : 'border-gray-800 hover:border-emerald-500/60 hover:scale-102 opacity-90 hover:opacity-100 bg-black/60 cursor-pointer'
                            }`}
                            title={isAdmin ? `ইমেজ #${idx + 1} নির্বাচন করুন` : `ইমেজ #${idx + 1}`}
                          >
                            <img 
                              src={savedImg.dataUrl} 
                              alt={`Chart ${idx + 1}`} 
                              className="w-full h-full object-cover rounded-lg"
                            />
                            {isAdmin && image === savedImg.dataUrl && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-md">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5 text-center">
                              <span className="text-[7.5px] font-mono text-gray-300 font-bold block truncate">
                                #{idx + 1}
                              </span>
                            </div>
                          </button>
                          
                          {/* Delete individual image button - Admin Only */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSavedImages(prev => prev.filter(item => item.id !== savedImg.id));
                                if (image === savedImg.dataUrl) {
                                  setImage(null);
                                  setResult(null);
                                }
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:bg-rose-600 active:scale-90 z-10"
                              title="এই ইমেজটি মুছুন"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 px-3 bg-black/40 border border-dashed border-gray-800 rounded-xl text-center flex items-center justify-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-400/70" />
                      <span className="text-[10.5px] text-gray-400 font-medium">
                        নিচে বা ড্রপ/পেস্ট করে যতগুলো ইমেজ দিবেন, সব স্বয়ংক্রিয়ভাবে এখানে সেভ থাকবে।
                      </span>
                    </div>
                  )}
                </div>

                {/* Main Upload Dropzone (Selector 1) */}
                <label 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMainDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      processMultipleFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`group relative h-96 flex flex-col items-center justify-center border-2 ${
                    isMainDragging 
                      ? 'border-emerald-400 bg-emerald-500/20 scale-[1.01] shadow-[0_0_60px_rgba(16,185,129,0.35)]' 
                      : 'border-emerald-500/25 hover:border-emerald-400/60 bg-[#090b0e]/90 hover:bg-[#0c0f14]/95 shadow-[0_0_50px_rgba(16,185,129,0.05)] hover:shadow-[0_0_60px_rgba(16,185,129,0.15)]'
                  } rounded-2xl backdrop-blur-md transition-all duration-300 cursor-pointer overflow-hidden p-8 text-center`}
                >
                   <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
                   <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_75%)] group-hover:opacity-25 transition-opacity duration-500" />
                   
                   {/* Moving Scanner Laser bar */}
                   <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent top-0 animate-scan pointer-events-none z-0" />

                   {/* Neon HUD Corner decorations */}
                   <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-500/30 group-hover:border-emerald-400 transition-colors" />
                   <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-500/30 group-hover:border-emerald-400 transition-colors" />
                   <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-500/30 group-hover:border-emerald-400 transition-colors" />
                   <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-500/30 group-hover:border-emerald-400 transition-colors" />

                   {/* Pulsing Outer Ring */}
                   <div className="relative mb-6">
                     <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md group-hover:scale-125 transition-transform duration-500 animate-pulse" />
                     <img 
                       src={tradeLensLogo} 
                       alt="TradeLens Logo" 
                       className="relative w-28 h-28 rounded-full border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.25)] group-hover:scale-105 group-hover:border-emerald-400/60 transition-all duration-500" 
                       referrerPolicy="no-referrer" 
                     />
                   </div>

                  <div className="space-y-3 relative z-10">
                    <h2 className="text-2xl font-black text-white tracking-wider text-center uppercase bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text">
                      {isMainDragging ? 'এখানে ড্রপ করুন (Release to Save & Analyze)' : 'Analysis Target Required'}
                    </h2>
                    <p className="text-emerald-400/90 uppercase tracking-widest text-[11px] font-black text-center flex items-center justify-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      এক বা একাধিক Chart ইমেজ আপলোড বা ড্রপ করুন (সব অটো সেভ হবে)
                    </p>
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-2 flex items-center justify-center gap-1.5">
                      <span>(Ctrl+V দিয়ে সরাসরি পেস্ট করুন বা ক্লিক করে ফাইল সিলেক্ট করুন)</span>
                    </p>
                  </div>
                </label>
                
                {/* Mobile Text Context */}
                <div className="mt-6 lg:hidden space-y-2 text-left animate-fade-in">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">কাস্টম নির্দেশনা (ঐচ্ছিক)</p>
                  <input
                    type="text"
                    value={userContext}
                    disabled={analyzing}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="যেমন: সাপোর্ট জোন বা মার্কেট ট্রেন্ড..."
                    className="w-full bg-[#0a0b0d] border border-gray-800 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analysis"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center p-0 sm:p-4 min-h-0 relative z-10"
              >
                <div 
                  ref={analysisBoxRef}
                  className="w-full max-w-4xl bg-[#0a0b0d] border border-emerald-500/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col h-full lg:max-h-[85vh] md:max-h-[850px]"
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]" />
                  
                  {/* Header in the analysis box */}
                  <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between shrink-0 bg-black/40 backdrop-blur-sm z-10 gap-2">
                    <div className="flex items-center space-x-2 text-[9px] sm:text-[10px] font-mono">
                      <span className="text-emerald-400 whitespace-nowrap">● Mode: {analyzing ? 'ACTIVE' : 'STATIC'}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">NEURAL FEED</span>
                    </div>

                    {/* Signal Accuracy Threshold Options (Above Dashboard) */}
                    <div className="flex items-center gap-1.5 bg-[#0a0c10] p-1 rounded-xl border border-gray-800 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setSignalMode('sure_shot')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                          signalMode === 'sure_shot'
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                            : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                        }`}
                        title="Sure Shot Mode: ৮০% বা তার বেশি কনফিডেন্স হলে সিগন্যাল দেখাবে, কম হলে নিউট্রাল"
                      >
                        <Zap className="w-3.5 h-3.5 text-current" />
                        <span>Sure Shot (80%+)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSignalMode('normal')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                          signalMode === 'normal'
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                            : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                        }`}
                        title="Normal Signal Mode: ৭০% বা তার বেশি কনফিডেন্স হলে সিগন্যাল দেখাবে, কম হলে নিউট্রাল"
                      >
                        <Target className="w-3.5 h-3.5 text-current" />
                        <span>Normal (70%+)</span>
                      </button>
                    </div>

                    {/* Saved Images Quick Switcher */}
                    {savedImages.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[240px] sm:max-w-xs custom-scrollbar py-0.5">
                        <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase shrink-0">ইমেজ ({savedImages.length}):</span>
                        {savedImages.map((savedImg, idx) => (
                          <button
                            key={savedImg.id || idx}
                            type="button"
                            onClick={() => {
                              if (image !== savedImg.dataUrl) {
                                setImage(savedImg.dataUrl);
                                setResult(null);
                                setError(null);
                              }
                            }}
                            className={`w-6 h-6 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                              image === savedImg.dataUrl
                                ? 'border-emerald-400 ring-1 ring-emerald-400 scale-105'
                                : 'border-gray-800 opacity-60 hover:opacity-100'
                            }`}
                            title={`ইমেজ #${idx + 1}`}
                          >
                            <img src={savedImg.dataUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        {/* Quick Add More Image Button */}
                        <label 
                          className="w-6 h-6 rounded-md border border-dashed border-emerald-500/50 hover:border-emerald-400 flex items-center justify-center text-emerald-400 cursor-pointer hover:bg-emerald-500/10 shrink-0 transition-colors" 
                          title="আরো ইমেজ আপলোড করুন (Auto-Saved)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Result / Analysis State with integrated dynamic Tabs */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 custom-scrollbar flex flex-col z-10">
                    {/* Dynamic Right Deck Tab Header */}
                    <div className="flex border-b border-gray-800 pb-3 mb-5 text-[10px] uppercase font-mono tracking-wider shrink-0 gap-1.5 overflow-x-auto custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => setRightActiveTab('signal')}
                        className={`pb-1 px-1 font-black transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          rightActiveTab === 'signal'
                            ? 'text-emerald-400 border-emerald-500'
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        লাইভ সিগন্যাল ও চ্যাট (Live Signal & Chat)
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setRightActiveTab('history')}
                        className={`pb-1 px-1 font-black transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          rightActiveTab === 'history'
                            ? 'text-emerald-400 border-emerald-500'
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        ট্রেড লগ (Log History)
                      </button>

                      <button
                        type="button"
                        onClick={() => setRightActiveTab('moneyManagement')}
                        className={`pb-1 px-1 font-black transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          rightActiveTab === 'moneyManagement'
                            ? 'text-emerald-400 border-emerald-500'
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        মানি ম্যানেজমেন্ট (Money Management)
                      </button>
                    </div>

                        {rightActiveTab === 'signal' && (
                          <AnimatePresence mode="wait">
                            {analyzing ? (
                              <motion.div 
                                key="analyzing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-5 text-center py-8"
                              >
                                <div className="relative">
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                    className="w-24 h-24 border-2 border-dashed border-emerald-500/60 rounded-full"
                                  />
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-emerald-400 font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                      {analysisCountdown}s
                                    </span>
                                    <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <h3 className="text-base font-black text-white tracking-wider uppercase flex items-center justify-center gap-1.5 font-mono">
                                    <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
                                    ৭ সেকেন্ডে অতি-দ্রুত সিগন্যাল প্রসেসিং...
                                  </h3>
                                  <p className="text-[11px] text-emerald-400/90 font-bold tracking-wide font-mono">
                                    ⚡ Ultra-Fast 7s Signal Engine Active
                                  </p>
                                  <div className="flex items-center gap-1.5 justify-center pt-1">
                                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                     <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping [animation-delay:-0.2s]" />
                                     <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping [animation-delay:-0.4s]" />
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
                                className="space-y-5 text-left"
                              >
                                <div className="space-y-1 text-left">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold italic font-mono">Prediction Matrix</span>
                                    <span className="text-[9.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {signalMode === 'sure_shot' ? '⚡ SURE SHOT (80%+)' : '🎯 NORMAL SIGNAL (70%+)'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <h2 className={`text-5xl font-black italic tracking-tighter ${
                                      activePrediction === 'UP' ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                                      activePrediction === 'DOWN' ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]' :
                                      'text-amber-500'
                                    }`}>
                                      {activePrediction === 'UP' ? 'UP' : 
                                       activePrediction === 'DOWN' ? 'DOWN' : 
                                       'NEUTRAL'}
                                    </h2>

                                    {result.prediction !== 'NEUTRAL' && activePrediction === 'NEUTRAL' && (
                                      <div className="text-[10px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/25 p-2 rounded-lg mt-1 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                        <span>
                                          কনফিডেন্স {result.confidence}%। {signalMode === 'sure_shot' ? 'Sure Shot (80%+)' : 'Normal Signal (70%+)'} মোড অনুযায়ী {signalMode === 'sure_shot' ? '৮০%' : '৭০%'} এর কম হওয়ায় নিরাপদ থাকার জন্য নিউট্রাল সংকেত দেওয়া হয়েছে।
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-1">
                                      <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${result.confidence}%` }}
                                          className={`h-full ${activePrediction === 'UP' ? 'bg-emerald-500' : activePrediction === 'DOWN' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                        />
                                      </div>
                                      <span className="text-xs font-mono font-bold text-gray-400">{result.confidence}% PROB</span>
                                    </div>
                                  </div>
                                </div>

                                {result.patterns && result.patterns.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] uppercase tracking-widest text-[#a2a5b0] font-bold italic font-mono">চিহ্নিত ক্যান্ডেলস্টিক প্যাটার্ন (Detected Formations)</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {result.patterns.map((pat, idx) => (
                                        <span key={idx} className={`px-2 py-0.5 bg-black/40 border rounded text-[10px] font-mono font-semibold ${
                                          activePrediction === 'UP' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                          activePrediction === 'DOWN' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
                                          'text-amber-400 border-amber-500/20 bg-amber-500/5'
                                        }`}>
                                          {pat}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <PredictionTrendChart recentAnalyses={recentAnalyses} />

                                <TradingTimer />

                                {/* Profit / Loss Result Recording Section */}
                                <div className="space-y-2.5 bg-black/60 border border-gray-800 p-3.5 rounded-2xl shadow-xl">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] uppercase font-black tracking-wider text-gray-200 flex items-center gap-1.5 font-mono">
                                      <Activity className="w-4 h-4 text-emerald-400" /> ট্রেডের ফলাফল সিলেক্ট করুন:
                                    </span>
                                    {tradeLogged ? (
                                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Recorded ({loggedOutcome})
                                      </span>
                                    ) : (
                                      <span className="text-[9.5px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md animate-pulse">
                                        ⚠️ Select Result
                                      </span>
                                    )}
                                  </div>

                                  {!tradeLogged && (
                                    <p className="text-[10px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/25 p-2 rounded-lg leading-tight font-bold">
                                      * পরবর্তী সিগন্যাল এর জন্য লস বা প্রফিট এ ট্যাপ করুন।
                                    </p>
                                  )}

                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      disabled={loggingHistory}
                                      onClick={() => handleLogTrade('PROFIT')}
                                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                        tradeLogged && loggedOutcome === 'PROFIT'
                                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-[1.02]'
                                          : tradeLogged
                                          ? 'bg-gray-900/60 text-gray-500 border-gray-800 opacity-50'
                                          : 'bg-emerald-950/40 hover:bg-emerald-500 hover:text-black text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95'
                                      }`}
                                    >
                                      <TrendingUp className="w-4 h-4" />
                                      <span>PROFIT</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={loggingHistory}
                                      onClick={() => handleLogTrade('LOSS')}
                                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                        tradeLogged && loggedOutcome === 'LOSS'
                                          ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-[1.02]'
                                          : tradeLogged
                                          ? 'bg-gray-900/60 text-gray-500 border-gray-800 opacity-50'
                                          : 'bg-rose-950/40 hover:bg-rose-500 hover:text-white text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95'
                                      }`}
                                    >
                                      <TrendingDown className="w-4 h-4" />
                                      <span>LOSS</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Trade History Box right underneath Profit / Loss Section */}
                                <div className="space-y-2 bg-black/70 border border-gray-800 p-3.5 rounded-2xl shadow-lg my-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
                                      <History className="w-3.5 h-3.5 text-emerald-400" />
                                      ট্রেড হিস্ট্রি বক্স ({tradeHistory.length}/10)
                                    </span>
                                    {tradeHistory.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={handleClearTradeHistory}
                                        disabled={clearingHistory}
                                        className="text-[9.5px] font-mono font-bold text-rose-400/90 hover:text-rose-300 hover:underline cursor-pointer"
                                      >
                                        Clear History
                                      </button>
                                    )}
                                  </div>

                                  {tradeHistory.length === 0 ? (
                                    <p className="text-[10px] font-mono text-gray-500 text-center py-2.5 italic border border-dashed border-gray-800/80 rounded-xl bg-gray-950/40">
                                      কোনো ইতিহাস নেই। PROFIT অথবা LOSS বাটনে ট্যাপ করলে হিস্ট্রি সেভ হবে।
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                                      {tradeHistory.slice(0, 10).map((trade, idx) => (
                                        <div key={trade.id || idx} className="p-2 bg-[#101116] border border-gray-800/80 rounded-xl flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-md ${
                                              trade.outcome === 'PROFIT' 
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                            }`}>
                                              {trade.outcome}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-200 font-bold truncate">
                                              {trade.prediction || 'SIGNAL'}
                                            </span>
                                          </div>
                                          <span className="text-[9.5px] font-mono text-gray-400 font-bold shrink-0">
                                            {trade.confidence ? `${trade.confidence}% Conf` : ''}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <button
                                    onClick={copyToClipboard}
                                    className="py-2.5 px-4 bg-gray-800 hover:bg-gray-750 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer border border-white/5"
                                  >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copied ? "Copied!" : "Copy Report"}
                                  </button>
                                  <button
                                    onClick={reset}
                                    className={`py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer ${
                                      tradeLogged
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                        : 'bg-gray-800/80 text-gray-500 border border-gray-700/60 cursor-not-allowed opacity-60'
                                    }`}
                                    title={!tradeLogged ? "পরবর্তী সিগন্যাল এর জন্য লস বা প্রফিট এ ট্যাপ করুন" : "Analyze new chart"}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Analyze New
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="flex-1 flex flex-col justify-center text-center space-y-5 py-4">
                               <button 
                                 type="button"
                                 onClick={startAnalysis}
                                 className="w-16 h-16 mx-auto rounded-full border border-emerald-500/30 overflow-hidden relative group/reload flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-[#0b0d12]"
                                 title="Reload & Start Analysis"
                               >
                                 {image ? (
                                   <img 
                                     src={image} 
                                     alt="Uploaded preview" 
                                     referrerPolicy="no-referrer"
                                     className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover/reload:scale-110 group-hover/reload:opacity-45 transition-all duration-300"
                                   />
                                 ) : null}
                                 <div className="absolute inset-0 bg-emerald-950/20 group-hover/reload:bg-emerald-950/40 transition-colors" />
                                 <RefreshCw className="w-5 h-5 text-emerald-400 relative z-10 animate-[spin_8s_linear_infinite]" />
                               </button>
                               
                               <div className="space-y-4 max-w-sm mx-auto w-full px-2 text-left">
                                  <div className="space-y-1 text-center">
                                     <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black">Awaiting analysis pulse</p>
                                     <p className="text-[11px] text-gray-500 font-medium">কাস্টম নির্দেশনা দিয়ে বিশ্লেষণ করতে "Analyze Now" চাপুন।</p>
                                  </div>
                                  
                                  {/* Custom instruction textarea right inside the signal tab */}
                                  {/* Signal Filter Selector Mode */}
                                   <div className="space-y-1.5 bg-black/40 border border-gray-850 p-3 rounded-xl">
                                     <label className="text-[10px] uppercase font-extrabold text-gray-300 flex items-center justify-between">
                                       <span className="flex items-center gap-1.5">
                                         <Sliders className="w-3.5 h-3.5 text-emerald-400" /> সিগন্যাল ফিল্টার মোড:
                                       </span>
                                       <span className="text-[9px] font-mono font-bold text-emerald-400">{signalMode === 'sure_shot' ? '80%+' : '70%+'}</span>
                                     </label>
                                     <div className="grid grid-cols-2 gap-2 pt-1">
                                       <button
                                         type="button"
                                         onClick={() => setSignalMode('sure_shot')}
                                         className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                                           signalMode === 'sure_shot'
                                             ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                             : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                                         }`}
                                       >
                                         <Zap className="w-3.5 h-3.5" />
                                         <span>Sure Shot (80%+)</span>
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => setSignalMode('normal')}
                                         className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                                           signalMode === 'normal'
                                             ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                             : 'bg-[#14151a] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                                         }`}
                                       >
                                         <Target className="w-3.5 h-3.5" />
                                         <span>Normal (70%+)</span>
                                       </button>
                                     </div>
                                   </div>

                                   <div className="space-y-1.5 bg-black/40 border border-gray-850 p-3.5 rounded-xl">
                                    <label className="text-[10px] uppercase font-extrabold text-gray-400 flex items-center gap-1.5">
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> কাস্টম নির্দেশনা (ঐচ্ছিক)
                                    </label>
                                    <textarea
                                      value={userContext}
                                      onChange={(e) => setUserContext(e.target.value)}
                                      disabled={analyzing}
                                      placeholder="যেমন: এই চার্টের পরবর্তী ক্যান্ডেলের ট্রেন্ড কি হবে? সাপোর্ট জোন চিহ্নিত করে বলুন।"
                                      className="w-full bg-[#14151a] border border-gray-850 rounded p-2.5 text-xs text-gray-300 resize-none focus:outline-none focus:border-emerald-500/50 h-20 custom-scrollbar"
                                    />
                                  </div>

                                  {/* Trading Guidelines Advisory Note */}
                                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-left space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-amber-400 font-black text-[10px] uppercase tracking-wider font-mono">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                      <span>জরুরি ট্রেডিং নিয়মাবলী:</span>
                                    </div>
                                    <ul className="text-[10.5px] text-amber-200/90 leading-relaxed font-medium space-y-1 list-disc list-inside">
                                      <li>AM বা PM যেকোনো সময় <strong>১:০০ টা থেকে ২:০০ টা</strong> পর্যন্ত ট্রেড নিবেন না।</li>
                                      <li>কমপক্ষে <strong>৫ মিনিট পর পর</strong> ট্রেড নিন।</li>
                                      <li>সারাদিনে <strong>১০ টা ট্রেড</strong> নিলেই অনেক, বেশি লোভ করবেন না।</li>
                                    </ul>
                                  </div>

                                  {!user ? (
                                    <button 
                                      onClick={handleGoogleLogin}
                                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-black rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
                                    >
                                      <LogIn className="w-4 h-4" />
                                      Login to Start
                                    </button>
                                  ) : (
                                    <button
                                      onClick={startAnalysis}
                                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all animate-pulse-glowing flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <Terminal className="w-4 h-4" />
                                      Analyze Now
                                    </button>
                                  )}
                               </div>
                              </div>
                            )}
                          </AnimatePresence>
                        )}

                        {rightActiveTab === 'history' && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">ট্রেড হিস্ট্রি লগ (Trade Logs)</h4>
                              {tradeHistory.length > 0 && (
                                <button
                                  onClick={handleClearTradeHistory}
                                  disabled={clearingHistory}
                                  className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-550 hover:text-black transition-all px-2.5 py-1 rounded cursor-pointer duration-200"
                                >
                                  {clearingHistory ? "Clearing..." : "Clear All"}
                                </button>
                              )}
                            </div>
                            {tradeHistory.length === 0 ? (
                              <div className="p-4 bg-[#111216]/50 border border-dashed border-gray-800 rounded text-center">
                                <p className="text-xs text-gray-550">কোনো ট্রেড হিস্ট্রি সংরক্ষিত নেই।</p>
                              </div>
                            ) : (
                              <div className="space-y-4 text-left">
                                <div className="flex border-b border-gray-900 mb-1 text-[9px] font-mono shrink-0">
                                  <button
                                    onClick={() => setHistoryTab('list')}
                                    className={`flex-1 pb-1.5 font-bold tracking-wider transition-colors border-b-2 cursor-pointer ${
                                      historyTab === 'list' 
                                        ? 'text-emerald-400 border-emerald-500' 
                                        : 'text-gray-500 border-transparent hover:text-gray-455'
                                    }`}
                                  >
                                    LIST (লগ তালিকা)
                                  </button>
                                  <button
                                    onClick={() => setHistoryTab('trend')}
                                    className={`flex-1 pb-1.5 font-bold tracking-wider transition-colors border-b-2 cursor-pointer ${
                                      historyTab === 'trend'
                                        ? 'text-emerald-400 border-emerald-500'
                                        : 'text-gray-555 border-transparent hover:text-gray-400'
                                    }`}
                                  >
                                    ANALYTICS (ট্রেন্ড গ্রাফ)
                                  </button>
                                </div>
                                
                                {historyTab === 'list' ? (
                                  <div className="space-y-2 overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
                                    {tradeHistory.slice(0, 10).map((trade, idx) => (
                                      <div key={trade.id || idx} className="p-2.5 bg-[#14151a] border border-gray-900 rounded flex flex-col gap-1 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded leading-none font-bold ${
                                            trade.prediction === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            trade.prediction === 'DOWN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                          }`}>
                                            {trade.prediction === 'UP' ? 'UP' : trade.prediction === 'DOWN' ? 'DOWN' : 'NEUTRAL'}
                                          </span>
                                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${
                                            trade.outcome === 'PROFIT' ? 'bg-emerald-500 text-black' :
                                            'bg-rose-500 text-black'
                                          }`}>
                                            {trade.outcome}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                                          <span className="font-mono text-[9px]">Confidence: {trade.confidence}%</span>
                                          <span className="font-mono text-[8.5px] text-gray-650">
                                            {trade.timestamp?.toDate ? new Date(trade.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
                                    <TrendAnalysisGraph tradeHistory={tradeHistory} />
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}

                        {rightActiveTab === 'moneyManagement' && (
                          <motion.div
                            key="moneyManagement"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col min-h-0"
                          >
                            <MoneyManagementModal isOpen={true} onClose={() => {}} isEmbedded={true} />
                          </motion.div>
                        )}
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
        <div className="absolute inset-0 z-50 bg-[#08090a] bg-trading-grid flex items-center justify-center p-4 overflow-auto custom-scrollbar relative">
          {/* Background Rain & Lightning FX */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <LightningEffect />
            <RainEffect />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-[#151a22] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden z-10"
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
                className="px-4 py-2 hover:bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
                          <span className="text-3xl font-black text-emerald-500">50$</span>
                          <span className="text-[10px] text-gray-400 block font-bold tracking-wider mt-0.5">(6200 tk)</span>
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
                          <div 
                             onClick={() => setPaymentMethod('bkash')}
                             className={`bg-[#e2125d]/5 border border-[#e2125d]/20 rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'bkash' ? 'ring-1 ring-[#e2125d]/40 bg-[#e2125d]/8' : ''}`}
                          >
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
                             <div className="flex items-center gap-2">
                               <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">bKash</span>
                               <span 
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                   paymentMethod === 'bkash'
                                     ? 'bg-[#e2125d] text-white shadow-[0_0_15px_rgba(226,18,93,0.4)] border border-[#e2125d]'
                                     : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                                 }`}
                               >
                                 Personal
                               </span>
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

                          {/* Dynamic bKash instructions and details box */}
                          {paymentMethod === 'bkash' && (
                            <div className="bg-[#131720]/90 border border-gray-800 rounded-2xl p-5 space-y-3.5 shadow-xl relative overflow-hidden animate-fade-in text-left">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#e2125d]" />
                              <div className="flex justify-between items-center pl-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {bkashNumber ? "bKash Personal Number" : "bKash Payment Gateway"}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#e2125d]/10 text-[9px] font-black text-[#e2125d] uppercase tracking-widest">
                                  {bkashNumber ? "Send Money" : "Support"}
                                </span>
                              </div>
                              
                              {bkashNumber ? (
                                <div className="flex items-center justify-between bg-[#0b0d12] border border-gray-800 rounded-xl p-3.5 group/addr hover:bg-[#0c0f16] hover:border-[#e2125d]/30 transition-all">
                                  <span className="text-xs sm:text-sm font-mono font-bold text-rose-400 break-all select-all pr-2">
                                    {bkashNumber}
                                  </span>
                                  <button 
                                    type="button"
                                    onClick={() => { 
                                      navigator.clipboard.writeText(bkashNumber); 
                                      setCopiedBkash(true); 
                                      setTimeout(() => setCopiedBkash(false), 2000); 
                                    }} 
                                    className="text-[9px] sm:text-[10px] text-gray-400 hover:text-rose-300 font-bold uppercase tracking-wider transition-all shrink-0 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 active:scale-95 cursor-pointer"
                                  >
                                    {copiedBkash ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-[#0b0d12] border border-gray-800 rounded-xl p-3.5 group/addr hover:bg-[#0c0f16] hover:border-[#e2125d]/30 transition-all">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#e2125d] animate-pulse" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-300">
                                      বিকাশ নাম্বারের জন্য লাইভ সাপোর্টে মেসেজ দিন
                                    </span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => setShowChat(true)} 
                                    className="text-[10px] text-white font-black uppercase tracking-wider transition-all shrink-0 px-3.5 py-1.5 bg-[#e2125d] hover:bg-[#c20e4f] rounded-lg active:scale-95 shadow-[0_0_12px_rgba(226,18,93,0.4)] cursor-pointer"
                                  >
                                    Live Support
                                  </button>
                                </div>
                              )}
                              <p className="text-[10px] text-gray-400 tracking-wide font-normal pl-1">
                                {bkashNumber 
                                  ? "এই বিকাশ নাম্বারে সেন্ড মানি করুন এবং আপনার সেন্ডার নাম্বার এবং ট্রানজেকশন ID নিচের বক্সে সাবমিট করুন।"
                                  : "সাপোর্ট থেকে বিকাশ নাম্বার নিয়ে সেন্ড মানি করুন এবং আপনার সেন্ডার নাম্বার ও ট্রানজেকশন ID নিচের বক্সে সাবমিট করুন।"
                                }
                              </p>
                            </div>
                          )}

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

                          {/* Name Input Box and User Serial ID Indicator */}
                          <div className="bg-[#131720]/50 border border-gray-800/80 rounded-2xl p-5 space-y-3.5 shadow-xl text-left font-sans animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-emerald-500/10 to-transparent border-b border-l border-emerald-500/20 rounded-bl-xl">
                              <span className="text-[9px] font-mono font-black text-emerald-400 tracking-wider">
                                USER NO: {userData?.userSerial || 'Allocating...'}
                              </span>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-emerald-500" />
                                Your Name / আপনার নাম
                              </label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={customUserName}
                                  onChange={(e) => setCustomUserName(e.target.value)}
                                  placeholder="Type your name here..."
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!user) return;
                                    if (!customUserName.trim()) {
                                      alert("দয়া করে একটি নাম লিখুন!");
                                      return;
                                    }
                                    setGlobalLoading(true);
                                    try {
                                      const userRef = doc(db, 'users', user.uid);
                                      await setDoc(userRef, { customDisplayName: customUserName.trim() }, { merge: true });
                                      alert("আপনার নাম সফলভাবে সংরক্ষণ করা হয়েছে!");
                                    } catch (err) {
                                      console.error(err);
                                      alert("নাম সংরক্ষণ করতে সমস্যা হয়েছে।");
                                    } finally {
                                      setGlobalLoading(false);
                                    }
                                  }}
                                  className="px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] active:scale-95"
                                >
                                  Save Name
                                </button>
                              </div>
                              <p className="text-[9px] text-gray-500 italic pl-1 mt-1">
                                আপনার নামের পাশে আপনার অটো-ইনক্রিমেন্ট আইডি নম্বর <span className="text-emerald-400 font-mono font-bold">#{userData?.userSerial || '100+'}</span> সচল থাকবে।
                              </p>
                            </div>
                          </div>

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
                            {analyzing ? 'Processing...' : (userData?.subscriptionStatus === 'PENDING' ? 'Awaiting Admin Approval' : 'Analyze Now (Pay 50$ / 6200 tk)')}
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

                  {/* bKash Wallet Setting */}
                  <div className="bg-[#141822] border-b border-gray-800 p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">bKash Personal Number</h4>
                        <p className="text-[10px] text-gray-500 font-medium">This number is dynamically displayed on the user's payment screen.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 max-w-sm sm:max-w-md w-full">
                      <input 
                        type="text"
                        value={adminBkashNumber}
                        onChange={(e) => setAdminBkashNumber(e.target.value)}
                        placeholder="Enter bKash Number (e.g. 015...)"
                        className="flex-1 bg-black/40 border border-gray-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500 text-white font-mono placeholder-gray-700"
                      />
                      <button
                        onClick={async () => {
                          setGlobalLoading(true);
                          try {
                            const configRef = doc(db, 'settings', 'payment');
                            await setDoc(configRef, { bkashNumber: adminBkashNumber }, { merge: true });
                            alert("bKash Personal Number updated in database successfully!");
                          } catch (err: any) {
                            console.error("Error setting bKash Number:", err);
                            alert("Failed to save. Check firestore rules or connection.");
                          } finally {
                            setGlobalLoading(false);
                          }
                        }}
                        className="px-4 py-1.5 bg-rose-500 text-white hover:bg-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0 active:scale-95"
                      >
                        Save Number
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
                            Reject & Unverify
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
                          const nameMatch = (u.customDisplayName || u.displayName || "").toLowerCase().includes(queryStr);
                          const emailMatch = (u.email || "").toLowerCase().includes(queryStr);
                          const uidMatch = (u.uid || "").toLowerCase().includes(queryStr);
                          const serialMatch = String(u.userSerial || "").includes(queryStr);
                          const matchesSearch = nameMatch || emailMatch || uidMatch || serialMatch;
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
                            const nameMatch = (u.customDisplayName || u.displayName || "").toLowerCase().includes(queryStr);
                            const emailMatch = (u.email || "").toLowerCase().includes(queryStr);
                            const uidMatch = (u.uid || "").toLowerCase().includes(queryStr);
                            const serialMatch = String(u.userSerial || "").includes(queryStr);
                            const matchesSearch = nameMatch || emailMatch || uidMatch || serialMatch;
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
                                      <span className="text-sm font-bold text-gray-200">
                                        {u.customDisplayName || u.displayName || 'Unnamed User'}
                                        {u.userSerial && <span className="text-emerald-400 font-mono text-xs ml-1.5 font-bold">#{u.userSerial}</span>}
                                      </span>
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
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, false)}
                                        className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                        title="আনভেরিফাই করতে ক্লিক করুন"
                                      >
                                        🟢 Verified
                                      </button>
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
                                    <div className="space-y-1">
                                      <button
                                        onClick={() => handleToggleUserVerification(u.uid, u.subscriptionStatus, false)}
                                        className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/40 px-2 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:bg-emerald-500 hover:text-black transition-all active:scale-95"
                                        title="ভেরিফাই করতে ক্লিক করুন"
                                      >
                                        🟡 Pending Verification
                                      </button>
                                      <div className="text-[11px] text-gray-400 font-bold">পেমেন্ট রিকোয়েস্ট পেন্ডিং</div>
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
                              <span className="text-[10px] font-black text-gray-200 truncate max-w-[140px] uppercase tracking-tighter">
                                {(() => {
                                  const uDetails = allUsersList.find((usr: any) => usr.uid === u.userId);
                                  return (
                                    <>
                                      {uDetails?.customDisplayName || uDetails?.displayName || u.userEmail}
                                      {uDetails?.userSerial && <span className="text-emerald-400 font-mono ml-1">#{uDetails.userSerial}</span>}
                                    </>
                                  );
                                })()}
                              </span>
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
                               <span className="text-sm font-bold text-gray-200">
                                 {(() => {
                                   const uDetails = allUsersList.find((usr: any) => usr.uid === adminChatUser);
                                   return (
                                     <>
                                       {uDetails?.customDisplayName || uDetails?.displayName || userList.find(u => u.userId === adminChatUser)?.userEmail}
                                       {uDetails?.userSerial && <span className="text-emerald-400 font-mono text-xs ml-1.5 font-bold">#{uDetails.userSerial}</span>}
                                     </>
                                   );
                                 })()}
                               </span>
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

      {/* Money Management Fullscreen / Standalone Modal */}
      <MoneyManagementModal 
        isOpen={showMoneyManagementModal} 
        onClose={() => setShowMoneyManagementModal(false)} 
      />
    </div>
  );
}


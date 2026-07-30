import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  X, 
  RotateCcw, 
  Sparkles, 
  Calculator, 
  Award, 
  Check, 
  ChevronRight,
  ShieldAlert,
  Sliders,
  Percent,
  Layers
} from 'lucide-react';

export interface DailyPlanItem {
  day: number;
  startBalance: number;
  targetProfit: number;
  recommendedTradeAmount: number;
  endBalance: number;
  completed: boolean;
}

interface MoneyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
}

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500];
const PRESET_DAYS = [7, 15, 30, 60];

const STORAGE_KEY = 'korim_trader_money_management_plan';

export const MoneyManagementModal: React.FC<MoneyManagementModalProps> = ({
  isOpen,
  onClose,
  isEmbedded = false
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>('');
  
  const [plan, setPlan] = useState<DailyPlanItem[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'settings'>('plan');

  // Load plan from localStorage or generate default on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.amount && parsed.days && Array.isArray(parsed.plan)) {
          setSelectedAmount(parsed.amount);
          setSelectedDays(parsed.days);
          setPlan(parsed.plan);
          setCompletedDays(parsed.completedDays || []);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading money management state', e);
    }

    // Default 10$ - 30 days plan
    generatePlan(10, 30);
  }, []);

  const generatePlan = (amount: number, days: number) => {
    const newPlan: DailyPlanItem[] = [];
    let currentBalance = amount;

    // Base parameters calibrated for $10 -> $150 over 30 days
    const baseIncrement = 0.21 * (amount / 10) * (30 / days);
    const day1ProfitBase = 2.0 * (amount / 10) * Math.sqrt(30 / days);

    for (let i = 1; i <= days; i++) {
      // Linear scaling with soft exponential weighting
      let dailyTarget = day1ProfitBase + (i - 1) * baseIncrement;
      dailyTarget = Math.round(dailyTarget * 100) / 100;
      
      const startBalance = Math.round(currentBalance * 100) / 100;
      const endBalance = Math.round((startBalance + dailyTarget) * 100) / 100;
      
      // Recommended per trade stake (approx 10-15% of start balance, min $1)
      const recommendedTrade = Math.max(1, Math.round(startBalance * 0.12 * 10) / 10);

      newPlan.push({
        day: i,
        startBalance,
        targetProfit: dailyTarget,
        recommendedTradeAmount: recommendedTrade,
        endBalance,
        completed: false
      });

      currentBalance = endBalance;
    }

    setPlan(newPlan);
    setCompletedDays([]);

    // Save to localStorage
    saveToStorage(amount, days, newPlan, []);
  };

  const saveToStorage = (amt: number, dys: number, currentPlan: DailyPlanItem[], completedArr: number[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        amount: amt,
        days: dys,
        plan: currentPlan,
        completedDays: completedArr,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save MM plan', e);
    }
  };

  const handleDoneGenerate = () => {
    const finalAmt = customAmount ? parseFloat(customAmount) : selectedAmount;
    const finalDays = customDays ? parseInt(customDays, 10) : selectedDays;

    if (!finalAmt || finalAmt <= 0) {
      alert('দয়া করে সঠিক অ্যামাউন্ট লিখুন (যেমন $10)');
      return;
    }
    if (!finalDays || finalDays <= 0 || finalDays > 180) {
      alert('দয়া করে ১ থেকে ১৮০ দিনের মধ্যে দিন সংখ্যা লিখুন (যেমন 30 দিন)');
      return;
    }

    setSelectedAmount(finalAmt);
    setSelectedDays(finalDays);
    generatePlan(finalAmt, finalDays);
    setActiveTab('plan');
  };

  const toggleDayCompletion = (dayNum: number) => {
    const isCompleted = completedDays.includes(dayNum);
    let updatedCompleted: number[];
    if (isCompleted) {
      updatedCompleted = completedDays.filter(d => d !== dayNum);
    } else {
      updatedCompleted = [...completedDays, dayNum];
    }
    setCompletedDays(updatedCompleted);

    const updatedPlan = plan.map(item => 
      item.day === dayNum ? { ...item, completed: !isCompleted } : item
    );
    setPlan(updatedPlan);

    const activeAmt = customAmount ? parseFloat(customAmount) : selectedAmount;
    const activeDays = customDays ? parseInt(customDays, 10) : selectedDays;
    saveToStorage(activeAmt, activeDays, updatedPlan, updatedCompleted);
  };

  const handleResetPlan = () => {
    if (confirm('আপনি কি মানি ম্যানেজমেন্ট প্ল্যানের অগ্রগতি রিসেট করতে চান?')) {
      const activeAmt = customAmount ? parseFloat(customAmount) : selectedAmount;
      const activeDays = customDays ? parseInt(customDays, 10) : selectedDays;
      generatePlan(activeAmt, activeDays);
    }
  };

  if (!isOpen && !isEmbedded) return null;

  const currentCapital = customAmount ? parseFloat(customAmount) || selectedAmount : selectedAmount;
  const currentDuration = customDays ? parseInt(customDays, 10) || selectedDays : selectedDays;
  const finalTargetBalance = plan.length > 0 ? plan[plan.length - 1].endBalance : 0;
  const totalExpectedProfit = Math.round((finalTargetBalance - currentCapital) * 100) / 100;
  const progressPercent = plan.length > 0 ? Math.round((completedDays.length / plan.length) * 100) : 0;

  const content = (
    <div className="flex flex-col h-full space-y-4 font-sans text-gray-200">
      {/* Top Banner / Navigation */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0a0c10] rounded-[10px] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
              মানি ম্যানেজমেন্ট પ્લાন <span className="text-emerald-400 text-xs">(Money Management)</span>
            </h3>
            <p className="text-[10px] text-gray-400">
              ব্যালেন্স ও দিনের ওপর ভিত্তি করে প্রফিট টার্গেট ও রিস্ক কন্ট্রোল
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'plan'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ট্রেডিং লিস্ট</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>প্ল্যান কনফিগারেশন</span>
          </button>

          {!isEmbedded && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#12141a] border border-gray-800 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider">প্রারম্ভিক মূলধন</span>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">${currentCapital.toFixed(2)}</div>
          <span className="text-[8.5px] text-gray-500 mt-0.5">Starting Capital</span>
        </div>

        <div className="bg-[#12141a] border border-gray-800 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider">টার্গেট ব্যালেন্স</span>
          <div className="text-lg font-black text-teal-300 font-mono mt-1">${finalTargetBalance.toFixed(2)}</div>
          <span className="text-[8.5px] text-gray-500 mt-0.5">{currentDuration} Days Target</span>
        </div>

        <div className="bg-[#12141a] border border-gray-800 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider">মোট আনুমানিক লাভ</span>
          <div className="text-lg font-black text-amber-400 font-mono mt-1">+${totalExpectedProfit.toFixed(2)}</div>
          <span className="text-[8.5px] text-emerald-400/80 font-bold mt-0.5">+{((totalExpectedProfit / currentCapital) * 100).toFixed(0)}% Profit</span>
        </div>

        <div className="bg-[#12141a] border border-gray-800 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider">অগ্রগতি</span>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">
            {completedDays.length} / {plan.length} <span className="text-xs font-normal text-gray-400">দিন</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {activeTab === 'settings' ? (
        /* Configuration Screen */
        <div className="bg-[#0f1015] border border-gray-850 p-4 sm:p-5 rounded-2xl space-y-5 animate-fadeIn">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 font-mono">
              <DollarSign className="w-4 h-4 text-emerald-400" /> ১. প্রারম্ভিক ডলার অ্যামাউন্ট সিলেক্ট করুন (Amount):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black font-mono transition-all border cursor-pointer ${
                    selectedAmount === amt && !customAmount
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-[1.02]'
                      : 'bg-gray-900/90 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="অথবা কাস্টম ডলার লিখুন (যেমন: 15, 75, 150...)"
                className="w-full bg-[#14161d] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-emerald-400" /> ২. কত দিনের জন্য প্ল্যান করতে চান? (Duration):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setSelectedDays(d);
                    setCustomDays('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black font-mono transition-all border cursor-pointer ${
                    selectedDays === d && !customDays
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-[1.02]'
                      : 'bg-gray-900/90 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {d} দিন ({d} Days)
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="অথবা কাস্টম দিন লিখুন (যেমন: 20, 45...)"
                className="w-full bg-[#14161d] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>
          </div>

          {/* Special Bengali Notice about $10 -> $150 formula */}
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> বিশেষ ফর্মুলা নির্দেশিকা:
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              আপনি ১০ ডলার সিলেক্ট করলে প্রথম দিন প্রফিট টার্গেট থাকবে ২ ডলার, দ্বিতীয় দিন ২.৫০ ডলার, ৩য় দিন ৩ ডলার। এভাবে নিয়মিত বাড়িয়ে ৩০ দিনে মোট প্রায় ১৫০ ডলার টার্গেটে পৌঁছাতে পারবেন। অন্য যেকোনো অ্যামাউন্টের ক্ষেত্রেও আনুপাতিক হারে প্ল্যান সেট হবে।
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDoneGenerate}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>প্ল্যান তৈরি করুন (DONE)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Plan Table View */
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5 font-mono">
              <Award className="w-4 h-4 text-amber-400" /> দৈনিক টার্গেট ট্র্যাকিং লিস্ট ({plan.length} দিন):
            </span>
            
            <button
              onClick={handleResetPlan}
              className="text-[10px] text-gray-400 hover:text-rose-400 flex items-center gap-1 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>রিসেট করুন</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto max-h-[380px] custom-scrollbar border border-gray-800 rounded-2xl bg-[#0b0c0f]">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 bg-[#12141b] border-b border-gray-800 text-[10px] uppercase text-gray-400 font-extrabold tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3">দিন</th>
                  <th className="py-2.5 px-3">শুরুর ব্যালেন্স</th>
                  <th className="py-2.5 px-3 text-emerald-400">টার্গেট প্রফিট</th>
                  <th className="py-2.5 px-3 text-amber-300">ট্রেড সাইজ (Safe)</th>
                  <th className="py-2.5 px-3">শেষের ব্যালেন্স</th>
                  <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {plan.map((item) => {
                  const isDone = completedDays.includes(item.day);
                  return (
                    <tr 
                      key={item.day}
                      onClick={() => toggleDayCompletion(item.day)}
                      className={`hover:bg-gray-800/40 transition-colors cursor-pointer ${
                        isDone ? 'bg-emerald-950/20 text-gray-400' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-gray-200">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] ${
                          isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-300'
                        }`}>
                          দিন {item.day}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-gray-300 font-semibold">
                        ${item.startBalance.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        +${item.targetProfit.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-amber-300 font-medium">
                        ${item.recommendedTradeAmount.toFixed(1)}/ট্রেড
                      </td>

                      <td className="py-2.5 px-3 font-bold text-teal-300">
                        ${item.endBalance.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDayCompletion(item.day);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mx-auto ${
                            isDone 
                              ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-emerald-500 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDone ? 'সম্পন্ন ✅' : 'বাকি ⏳'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl text-[10.5px] text-gray-400 flex items-center justify-between">
            <span>💡 টিপস: লাভ সম্পূর্ণ হলেই আজকের মতো ট্রেডিং বন্ধ করুন। অতি-লোভ পরিহার করুন।</span>
            <span className="font-bold text-emerald-400">{progressPercent}% Completed</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0a0c10] border border-gray-800 w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {content}
      </div>
    </div>
  );
};

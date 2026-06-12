import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TrendingUp, Award, Zap, Percent, ShieldCheck } from 'lucide-react';

interface TradeLog {
  id?: string;
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  outcome: 'PROFIT' | 'LOSS';
  confidence: number;
  explanation: string;
  timestamp?: any;
}

interface TrendAnalysisGraphProps {
  tradeHistory: TradeLog[];
}

export const TrendAnalysisGraph: React.FC<TrendAnalysisGraphProps> = ({ tradeHistory }) => {
  // Compute analytics
  const stats = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        maxStreak: 0,
        neutrals: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let neutrals = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    // Chronological order for streak calculations (oldest first)
    const chronoHistory = [...tradeHistory].sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return timeA - timeB;
    });

    chronoHistory.forEach((trade) => {
      if (trade.prediction === 'NEUTRAL') {
        neutrals++;
      } else if (trade.outcome === 'PROFIT') {
        wins++;
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else if (trade.outcome === 'LOSS') {
        losses++;
        currentStreak = 0;
      }
    });

    const completed = wins + losses;
    const winRate = completed > 0 ? Math.round((wins / completed) * 100) : 0;

    return {
      total: tradeHistory.length,
      wins,
      losses,
      winRate,
      currentStreak,
      maxStreak,
      neutrals,
    };
  }, [tradeHistory]);

  // Compute rolling data for Recharts AreaChart
  const trendData = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) return [];

    // Sort chronologically (oldest first)
    const sortedTrades = [...tradeHistory].sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return timeA - timeB;
    });

    let cumulativeWins = 0;
    let cumulativeLosses = 0;

    return sortedTrades.map((trade, index) => {
      if (trade.outcome === 'PROFIT') {
        cumulativeWins++;
      } else if (trade.outcome === 'LOSS') {
        cumulativeLosses++;
      }

      const completed = cumulativeWins + cumulativeLosses;
      const winRate = completed > 0 ? Math.round((cumulativeWins / completed) * 100) : 0;
      
      const label = `T-${index + 1}`;
      
      return {
        tradeIndex: label,
        winRate: winRate,
        outcome: trade.outcome,
        confidence: trade.confidence,
        timestamp: trade.timestamp
      };
    });
  }, [tradeHistory]);

  if (!tradeHistory || tradeHistory.length === 0) {
    return (
      <div className="p-4 bg-[#111216]/50 border border-dashed border-gray-800/40 rounded text-center">
        <p className="text-[10px] text-gray-600 font-sans">গ্রাফ দেখার মতো যথেষ্ট ডাটা নেই।</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Analytics Hub */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-[#14151a] border border-gray-950 rounded flex flex-col items-center justify-center text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono font-bold leading-none mb-1">Win Rate</span>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-xl font-black ${stats.winRate >= 80 ? 'text-emerald-500' : 'text-amber-500'} font-mono`}>
              {stats.winRate}%
            </span>
          </div>
          <p className="text-[8px] text-gray-600 font-sans mt-0.5">৮০%+ টার্গেট স্কোর</p>
        </div>

        <div className="p-2 bg-[#14151a] border border-gray-950 rounded flex flex-col items-center justify-center text-center">
          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono font-bold leading-none mb-1">Max Streak</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xl font-black text-amber-400 font-mono">
              {stats.maxStreak}
            </span>
          </div>
          <p className="text-[8px] text-gray-600 font-sans mt-0.5">টানা সর্বোচ্চ প্রফিট</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div className="py-1 text-center bg-emerald-500/5 border border-emerald-500/10 rounded">
          <span className="text-emerald-400 font-bold block">Profit (P)</span>
          <span className="text-emerald-400 font-mono font-black">{stats.wins}</span>
        </div>
        <div className="py-1 text-center bg-rose-500/5 border border-rose-500/10 rounded">
          <span className="text-rose-400 font-bold block">Loss (L)</span>
          <span className="text-rose-400 font-mono font-black">{stats.losses}</span>
        </div>
        <div className="py-1 text-center bg-gray-500/5 border border-gray-500/10 rounded">
          <span className="text-gray-400 font-bold block">Neutral</span>
          <span className="text-gray-400 font-mono font-black">{stats.neutrals}</span>
        </div>
      </div>

      {/* Win/Loss Rolling Trend Graph */}
      <div className="bg-[#14151a] border border-gray-900 rounded-lg p-2 flex flex-col h-[150px]">
        <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block mb-2 font-mono text-center">
          Win Rate Trend Line (%)
        </span>
        
        <div className="flex-1 w-full min-h-0 text-[8px] font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="tradeIndex" 
                stroke="#4b5563" 
                fontSize={8} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#4b5563" 
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0f1115] border border-gray-800 p-2 rounded shadow-xl text-[9px] text-gray-250 font-mono space-y-0.5">
                        <p className="font-bold text-gray-400">{data.tradeIndex}</p>
                        <p className="text-emerald-400">
                          Win Rate: <span className="font-black">{data.winRate}%</span>
                        </p>
                        <p className={data.outcome === 'PROFIT' ? 'text-emerald-500' : 'text-rose-500'}>
                          Result: <span className="font-bold">{data.outcome}</span>
                        </p>
                        <p className="text-gray-500 text-[8px]">
                          Confidence: {data.confidence}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="winRate" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorWinRate)" 
                activeDot={{ r: 4, strokeWidth: 1, stroke: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 80% Success Rate Message */}
      <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded flex items-start gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-emerald-400 font-sans leading-relaxed">
          <strong>৮০% একিউরেসি টার্গেট:</strong> নতুন এন্ট্রি সিগন্যালগুলো ৮০% এর অধিক নিশ্চিত হলেই কেবল জেনারেট হচ্ছে। আপনার ট্রেড হিস্ট্রি ট্র্যাকিং বজায় রাখুন।
        </p>
      </div>
    </div>
  );
};

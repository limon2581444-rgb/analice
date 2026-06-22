import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

interface AnalysisItem {
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  time: string;
}

interface PredictionTrendChartProps {
  recentAnalyses: AnalysisItem[];
}

export const PredictionTrendChart: React.FC<PredictionTrendChartProps> = ({ recentAnalyses }) => {
  if (!recentAnalyses || recentAnalyses.length === 0) {
    return null;
  }

  const chartData = recentAnalyses.map((item, index) => {
    let score = 0;
    if (item.prediction === 'UP') {
      score = item.confidence;
    } else if (item.prediction === 'DOWN') {
      score = -item.confidence;
    }
    return {
      name: item.time,
      score: score,
      prediction: item.prediction,
      confidence: item.confidence,
      index: index + 1
    };
  });

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f1115] border border-gray-800/80 p-2.5 rounded-lg shadow-xl text-left font-mono">
          <p className="text-[10px] text-gray-400">সময়: <span className="text-gray-200">{data.name}</span></p>
          <p className="text-xs font-black mt-1 flex items-center gap-1">
            সিগন্যাল: 
            {data.prediction === 'UP' ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" /> BUY / UP</span>
            ) : data.prediction === 'DOWN' ? (
              <span className="text-rose-400 flex items-center gap-0.5"><TrendingDown className="w-3.5 h-3.5" /> SELL / DOWN</span>
            ) : (
              <span className="text-amber-400">NEUTRAL</span>
            )}
          </p>
          <p className="text-[11px] text-emerald-300 font-bold mt-0.5">নিশ্চয়তা: {data.confidence}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 bg-[#14151a]/80 border border-gray-800/50 rounded-xl space-y-3 text-left shadow-[0_4px_25px_rgba(0,0,0,0.25)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 blur-2xl opacity-5 rounded-full bg-[#10b981]" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <BarChart2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono text-gray-300">পূর্ববর্তী ৫টি ট্রেন্ড লাইন (Trend Line Chart)</span>
        </div>
        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono font-bold">LIVE METRIC</span>
      </div>

      <div className="h-[120px] w-full mt-2 select-none relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="#4b5563" 
              fontSize={9} 
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
            />
            <YAxis 
              domain={[-100, 100]} 
              stroke="#4b5563"
              fontSize={8}
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
              ticks={[-100, -50, 0, 50, 100]}
              tickFormatter={(val) => {
                if (val > 0) return `+${val}`;
                return `${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#059669', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" opacity={0.6} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#10b981"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const strokeColor = payload.prediction === 'UP' ? '#10b981' : payload.prediction === 'DOWN' ? '#f43f5e' : '#f59e0b';
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    stroke={strokeColor}
                    strokeWidth={2}
                    fill="#0e1117"
                    style={{ cursor: 'pointer' }}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#10b981', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono border-t border-gray-900 pt-2">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>UP জোনে সবুজ ডট</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>DOWN জোনে লাল ডট</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>নিউট্রেলে হলুদ ডট</span>
        </div>
      </div>
    </div>
  );
};

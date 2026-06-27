import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Flame } from 'lucide-react';

interface TradingTimerProps {
  autoStart?: boolean;
  defaultDuration?: number; // in seconds
}

export const TradingTimer: React.FC<TradingTimerProps> = ({ 
  autoStart = true, 
  defaultDuration = 60 // Strictly 1 minute (60 seconds)
}) => {
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [timeLeft, setTimeLeft] = useState<number>(defaultDuration);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Strictly 1m fixed
  const presets = [
    { label: '১ মিনিট (1m) ফিক্সড', value: 60 }
  ];

  // Sound generator
  const playBeep = (frequency: number, durationMs: number) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // End of timer alert (high-pitched beep)
            playBeep(880, 500);
            setTimeout(() => playBeep(1200, 400), 250);
            return 0;
          }
          // Tick beep for the last 5 seconds
          if (prev <= 6) {
            playBeep(440, 100);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundEnabled]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
    playBeep(600, 80);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
    playBeep(350, 100);
  };

  const selectPreset = (seconds: number) => {
    setIsRunning(false);
    setDuration(seconds);
    setTimeLeft(seconds);
    playBeep(520, 80);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const percentage = (timeLeft / duration) * 100;

  return (
    <div className="p-4 bg-[#14151a]/85 border border-gray-800/60 rounded-xl space-y-3.5 text-left shadow-[0_4px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 blur-2xl opacity-5 rounded-full bg-emerald-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Timer className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono text-gray-300">
            ট্রেড শেষ হওয়ার টাইমার (Expiration Timer)
          </span>
        </div>
        
        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1 rounded-md transition-colors cursor-pointer border ${
            soundEnabled 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
              : 'bg-gray-800/30 border-transparent text-gray-500 hover:bg-gray-800/60'
          }`}
          title={soundEnabled ? 'সাউন্ড বন্ধ করুন (Mute)' : 'সাউন্ড চালু করুন (Unmute)'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Centered Countdown Display and Controls */}
      <div className="flex flex-col items-center justify-center p-4 bg-[#0b0c10]/90 border border-gray-850 rounded-xl relative overflow-hidden">
        {/* Progress bar background indicator */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 rounded-b-xl"
          style={{ width: `${percentage}%` }}
        />

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between px-2 z-10">
          {/* Left: Info badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase font-mono tracking-wider rounded-lg">
              ১ মিনিট (1m) ফিক্সড ট্রেড
            </span>
          </div>

          {/* Center: Timer digits */}
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-black font-mono tracking-widest leading-none ${
              timeLeft <= 5 && isRunning 
                ? 'text-rose-500 animate-pulse' 
                : timeLeft <= 10 && isRunning 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
            }`}>
              {formatTime(timeLeft)}
            </span>
            
            {/* Right: Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={handleStartPause}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  isRunning 
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black border border-transparent'
                }`}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg transition-colors cursor-pointer border border-white/5"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {timeLeft <= 5 && isRunning && (
          <div className="flex items-center gap-1 mt-2.5 text-[9px] text-rose-500 font-extrabold uppercase font-mono tracking-widest animate-pulse z-10">
            <Flame className="w-3.5 h-3.5 animate-bounce" /> Expiration Alert!
          </div>
        )}
      </div>
    </div>
  );
};

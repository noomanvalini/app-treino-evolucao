'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Plus, Minus, Volume2, VolumeX, ChevronDown, ChevronUp, Bell } from 'lucide-react';

interface RestTimerModalProps {
  isOpen: boolean;
  initialSeconds?: number;
  onClose: () => void;
  onTimerComplete?: () => void;
}

export default function RestTimerModal({
  isOpen,
  initialSeconds = 90,
  onClose,
  onTimerComplete
}: RestTimerModalProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial seconds when modal opens
  useEffect(() => {
    if (isOpen) {
      setTotalSeconds(initialSeconds);
      setTimeLeft(initialSeconds);
      setIsRunning(true);
      setIsMinimized(false);
    }
  }, [isOpen, initialSeconds]);

  // Timer countdown effect
  useEffect(() => {
    if (isOpen && isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isRunning, timeLeft]);

  // Audio & Haptic chime when rest finishes
  const handleComplete = () => {
    setIsRunning(false);

    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const now = ctx.currentTime;
          
          // Beep 1
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(880, now); // A5
          gain1.gain.setValueAtTime(0.3, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.2);

          // Beep 2
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1320, now + 0.25); // E6
          gain2.gain.setValueAtTime(0.3, now + 0.25);
          gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.25);
          osc2.stop(now + 0.55);
        }
      } catch (e) {
        console.warn('AudioContext beep error:', e);
      }
    }

    // Vibration on mobile
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {
        // ignore
      }
    }

    onTimerComplete?.();
  };

  const addTime = (seconds: number) => {
    setTimeLeft((prev) => {
      const next = Math.max(5, prev + seconds);
      if (next > totalSeconds) setTotalSeconds(next);
      return next;
    });
  };

  const setPreset = (sec: number) => {
    setTotalSeconds(sec);
    setTimeLeft(sec);
    setIsRunning(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const progressPct = totalSeconds > 0 ? Math.max(0, (timeLeft / totalSeconds) * 100) : 0;

  // Minimized Sticky Floating Bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-slate-card/95 backdrop-blur-md border border-lime-neon/40 shadow-2xl rounded-2xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-card-light border border-border">
              <span className="text-xs font-mono font-bold text-lime-neon">{formatTime(timeLeft)}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Bell className="h-3 w-3 text-lime-neon animate-pulse" /> Descanso
              </p>
              <p className="text-[10px] text-slate-400">
                {timeLeft > 0 ? (isRunning ? 'Contando...' : 'Pausado') : 'Tempo esgotado!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => addTime(30)}
              className="px-2 py-1 bg-slate-card-light hover:bg-slate-card-light/80 text-[11px] font-bold text-slate-200 rounded-lg border border-border transition-colors"
            >
              +30s
            </button>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-2 bg-slate-card-light text-slate-200 hover:text-lime-neon rounded-lg border border-border transition-colors"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 rounded-lg font-bold transition-colors"
              title="Expandir"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Overlay Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-card border border-border rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-lime-neon/10 blur-3xl pointer-events-none rounded-full" />

        {/* Top Controls */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-lime-neon/10 border-lime-neon/30 text-lime-neon'
                : 'bg-slate-card-light border-border text-slate-500'
            }`}
            title={soundEnabled ? 'Som ativado' : 'Som mudo'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Descanso entre Séries
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-400 hover:text-slate-100 border border-border transition-colors"
              title="Minimizar"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-400 hover:text-slate-100 border border-border transition-colors"
              title="Fechar / Pular"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Circular Display */}
        <div className="relative w-44 h-44 mx-auto my-6 flex items-center justify-center">
          {/* SVG Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-slate-card-light"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-lime-neon transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={477}
              strokeDashoffset={477 - (477 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-black font-mono tracking-tight ${timeLeft === 0 ? 'text-lime-neon animate-pulse' : 'text-slate-100'}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1">
              {timeLeft === 0 ? 'Pronto para a série!' : isRunning ? 'Respire fundo...' : 'Pausado'}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[45, 60, 90, 120].map((sec) => (
            <button
              key={sec}
              onClick={() => setPreset(sec)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                totalSeconds === sec && timeLeft > 0
                  ? 'bg-lime-neon text-slate-900 border-lime-neon shadow-md shadow-lime-neon/20'
                  : 'bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 border-border'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => addTime(-15)}
            disabled={timeLeft <= 15}
            className="p-3 rounded-2xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 border border-border disabled:opacity-40 transition-colors"
            title="Diminuir 15 segundos"
          >
            <Minus className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-lime-neon/20 transition-all active:scale-95"
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 fill-current" /> Pausar
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" /> Retomar
              </>
            )}
          </button>

          <button
            onClick={() => addTime(30)}
            className="p-3 rounded-2xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 border border-border transition-colors"
            title="Adicionar 30 segundos"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Footer skip / dismiss button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-card-light/50 transition-colors"
        >
          Pular descanso e voltar ao treino
        </button>
      </div>
    </div>
  );
}

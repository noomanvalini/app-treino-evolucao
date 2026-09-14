'use client';

import React, { useState, useMemo } from 'react';
import { Dumbbell, Calendar, Flame } from 'lucide-react';

interface DayVolume {
  dayName: string; // 'Seg', 'Ter', etc.
  dayShort: string;
  date: Date;
  volumeKg: number;
  workoutCount: number;
  isToday: boolean;
}

interface WeeklyVolumeBarsProps {
  logs?: Array<{ data: any; cargaKg: number; reps: number }>;
}

export default function WeeklyVolumeBars({ logs = [] }: WeeklyVolumeBarsProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Compute 7 days of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    // Get current day of week (0 is Sunday, 1 is Monday...)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    return dayLabels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isToday = d.toDateString() === today.toDateString();

      // Find all logs on this day
      let vol = 0;
      let count = 0;
      logs.forEach((l) => {
        const logDate = l.data?.seconds ? new Date(l.data.seconds * 1000) : new Date(l.data);
        if (logDate.toDateString() === d.toDateString()) {
          vol += (l.cargaKg || 0) * (l.reps || 0);
          count++;
        }
      });

      return {
        dayName: label,
        dayShort: label.toUpperCase(),
        date: d,
        volumeKg: vol,
        workoutCount: count,
        isToday
      };
    });
  }, [logs]);

  // Max volume for height normalization
  const maxVolume = useMemo(() => {
    const vols = weekDays.map((d) => d.volumeKg);
    const m = Math.max(...vols);
    return m > 0 ? m : 1000;
  }, [weekDays]);

  const totalWeekVolume = useMemo(() => {
    return weekDays.reduce((acc, curr) => acc + curr.volumeKg, 0);
  }, [weekDays]);

  // Active day details (defaults to today or selected)
  const activeDay = selectedDayIndex !== null ? weekDays[selectedDayIndex] : weekDays.find((d) => d.isToday) || weekDays[0];

  return (
    <div className="bg-slate-card border border-border rounded-3xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-lime-neon" /> Volume de Treino Semanal
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-heading text-slate-100">
              {totalWeekVolume.toLocaleString('pt-BR')} kg
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">acumulados na semana</span>
          </div>
        </div>

        {/* Selected day badge */}
        <div className="text-right bg-slate-card-light/60 px-3 py-1.5 rounded-xl border border-border/50">
          <span className="block text-[9px] uppercase font-bold text-slate-400">
            {activeDay.dayName} • {activeDay.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </span>
          <span className="text-xs font-black font-heading text-lime-neon">
            {activeDay.volumeKg > 0 ? `${activeDay.volumeKg.toLocaleString('pt-BR')} kg` : 'Sem treino'}
          </span>
        </div>
      </div>

      {/* 7 Days Bar Chart */}
      <div className="grid grid-cols-7 gap-2 items-end pt-4 pb-1 h-32 px-1">
        {weekDays.map((day, idx) => {
          const heightPct = day.volumeKg > 0 ? Math.max(15, Math.round((day.volumeKg / maxVolume) * 100)) : 6;
          const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && day.isToday);

          return (
            <button
              key={day.dayName}
              onClick={() => setSelectedDayIndex(idx)}
              className="flex flex-col items-center gap-2 group h-full justify-end focus:outline-none transition-transform active:scale-95"
            >
              {/* Bar Container */}
              <div className="w-full max-w-[28px] h-20 bg-slate-card-light/40 rounded-xl relative overflow-hidden flex items-end justify-center p-0.5 border border-border/30 group-hover:border-lime-neon/40 transition-colors">
                <div
                  className={`w-full rounded-lg transition-all duration-300 ${
                    isSelected
                      ? 'bg-lime-neon shadow-lg shadow-lime-neon/30'
                      : day.volumeKg > 0
                      ? 'bg-lime-neon/60 group-hover:bg-lime-neon/80'
                      : 'bg-slate-700/30'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* Day Label */}
              <div className="text-center">
                <span
                  className={`text-[10px] font-bold block transition-colors ${
                    isSelected
                      ? 'text-lime-neon font-black'
                      : day.isToday
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {day.dayName}
                </span>
                {day.isToday && (
                  <div className="w-1 h-1 rounded-full bg-lime-neon mx-auto mt-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

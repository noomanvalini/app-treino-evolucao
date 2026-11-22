'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import ClipzBodyBadge from '@/components/ClipzBodyBadge';
import {
  Flame,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowRight,
  Trophy,
} from 'lucide-react';

const WEEK_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AppHeader() {
  const { user, profile, isPreviewMode } = useAuth();
  const router = useRouter();

  const [trainedDayKeys, setTrainedDayKeys] = useState<string[]>([]);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!user) return;

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      // Realistic preview trained days in current month + this week
      const today = new Date();
      const offsets = [0, 1, 3, 4, 7, 9, 11, 14, 16, 18];
      const keys = offsets.map((off) => {
        const d = new Date(today);
        d.setDate(today.getDate() - off);
        return toDayKey(d);
      });
      setTrainedDayKeys(keys);
      return;
    }

    let cancelled = false;
    async function loadWorkoutDays() {
      if (!user) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'strength_logs'), where('userId', '==', user.uid))
        );
        const daySet = new Set<string>();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const raw = data.data;
          const d = raw?.seconds ? new Date(raw.seconds * 1000) : new Date(raw);
          if (!isNaN(d.getTime())) {
            daySet.add(toDayKey(d));
          }
        });
        if (!cancelled) {
          setTrainedDayKeys(Array.from(daySet));
        }
      } catch (err) {
        console.error('Error loading streak days:', err);
      }
    }

    loadWorkoutDays();
    return () => {
      cancelled = true;
    };
  }, [user, isPreviewMode]);

  // Compute current active streak (active workout days in last 7 days or consecutive active days)
  const { activeDaysThisWeek, currentWeekStatus } = useMemo(() => {
    const today = new Date();
    // Monday-based current week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);

    const trainedSet = new Set(trainedDayKeys);
    const weekStatus = WEEK_LABELS.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const key = toDayKey(d);
      return {
        label,
        dateNum: d.getDate(),
        key,
        isToday: key === toDayKey(today),
        trained: trainedSet.has(key),
      };
    });

    const countThisWeek = weekStatus.filter((w) => w.trained).length;
    return { activeDaysThisWeek: countThisWeek, currentWeekStatus: weekStatus };
  }, [trainedDayKeys]);

  // Build calendar cells for calMonth (Monday-first)
  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const trainedSet = new Set(trainedDayKeys);
    const todayKey = toDayKey(new Date());

    const cells: Array<{
      empty?: boolean;
      day?: number;
      key?: string;
      trained?: boolean;
      isToday?: boolean;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ empty: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = toDayKey(d);
      cells.push({
        day,
        key,
        trained: trainedSet.has(key),
        isToday: key === todayKey,
      });
    }
    return cells;
  }, [calMonth, trainedDayKeys]);

  const userInitial = (profile?.nome || user?.displayName || 'U').charAt(0).toUpperCase();
  const userPhoto = user?.photoURL || null;
  const goalDays = profile?.diasAtivos?.length || 4;

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 -mt-6 bg-[#0e0f07]/90 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center justify-between print:hidden">
        {/* 1. Brand Logo */}
        <Link href="/dashboard" className="flex items-center">
          <ClipzBodyBadge className="h-7 w-auto" priority />
        </Link>

        {/* Right Controls: Streak Badge + User Profile Avatar */}
        <div className="flex items-center gap-[10px]">
          {/* 2. Active Days / Streak Badge (Check + "X dias") */}
          <button
            type="button"
            onClick={() => setIsStreakModalOpen(true)}
            className="flex items-center gap-[5px] bg-[#151413] hover:bg-white/[0.12] border border-white/[0.08] px-[10px] py-[5px] rounded-full transition-colors active:scale-95"
            title="Ver sequência ativa semanal e calendário"
          >
            <Check className="w-[13px] h-[13px] text-[#f59e0b] stroke-[2.8]" />
            <span className="font-semibold text-[#f8fafc] text-[12px] leading-none">
              {activeDaysThisWeek} {activeDaysThisWeek === 1 ? 'dia' : 'dias'}
            </span>
          </button>

          {/* 3. User Avatar Thumbnail -> /profile */}
          <Link
            href="/profile"
            className="relative flex items-center justify-center group"
            title="Meu Perfil"
          >
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={profile?.nome || 'Perfil'}
                className="w-[34px] h-[34px] rounded-full object-cover ring-1 ring-[#f59e0b]/50 group-hover:ring-[#f59e0b] transition-all"
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-[#151413] border border-[#f59e0b]/40 group-hover:border-[#f59e0b] flex items-center justify-center text-[#ffb95f] font-bold text-[13px] transition-colors">
                {userInitial}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full bg-[#d3e156] ring-2 ring-[#0e0f07]" />
          </Link>
        </div>
      </header>

      {/* =====================================================================
          MODAL: OFENSIVA SEMANAL & CALENDÁRIO (Streak Popover)
         ===================================================================== */}
      {isStreakModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 print:hidden"
          onClick={() => setIsStreakModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[448px] bg-[#0e0f07] border-t sm:border border-white/10 rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[12px] bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b]" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-[#f8fafc] text-[18px] uppercase leading-[22px]">
                    OFENSIVA DE TREINOS
                  </h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    {activeDaysThisWeek} de {goalDays} dias ativos nesta semana
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStreakModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto scrollbar-none">
              {/* Weekly Sequence Strip */}
              <div className="bg-[#151413] rounded-[14px] p-3.5 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94a3b8]">
                    SEQUÊNCIA DA SEMANA
                  </span>
                  <span className="text-[11px] font-bold text-[#d3e156] flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {Math.min(100, Math.round((activeDaysThisWeek / goalDays) * 100))}% da meta
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {currentWeekStatus.map((day) => (
                    <div key={day.key} className="flex flex-col items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold ${
                          day.isToday ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                        }`}
                      >
                        {day.label}
                      </span>
                      <div
                        className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all ${
                          day.trained
                            ? 'bg-[#f59e0b] text-[#0e0f07] shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                            : day.isToday
                            ? 'bg-white/10 border border-[#f59e0b] text-white'
                            : 'bg-black/70 text-[#64748b]'
                        }`}
                      >
                        {day.trained ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <span className="text-[11px] font-semibold">{day.dateNum}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Monthly Calendar */}
              <div className="bg-[#151413] rounded-[14px] p-3.5 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#f59e0b]" />
                    <span className="font-heading font-semibold text-[15px] uppercase text-[#f8fafc]">
                      {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                      }
                      className="w-7 h-7 rounded-lg bg-black hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                      }
                      className="w-7 h-7 rounded-lg bg-black hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEK_LABELS.map((w) => (
                    <span key={w} className="text-[9px] font-bold text-[#64748b] py-1">
                      {w}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarCells.map((cell, idx) =>
                    cell.empty ? (
                      <div key={`empty_${idx}`} className="h-[34px]" />
                    ) : (
                      <div
                        key={cell.key}
                        className={`h-[34px] rounded-[8px] flex flex-col items-center justify-center text-[12px] font-semibold relative ${
                          cell.trained
                            ? 'bg-[#f59e0b]/20 border border-[#f59e0b]/60 text-[#ffb95f]'
                            : cell.isToday
                            ? 'bg-white/10 border border-white/30 text-white'
                            : 'bg-black/40 text-[#94a3b8]'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {cell.trained && (
                          <span className="w-1 h-1 rounded-full bg-[#d3e156] absolute bottom-1" />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Shortcut to full History page */}
              <button
                type="button"
                onClick={() => {
                  setIsStreakModalOpen(false);
                  router.push('/history');
                }}
                className="w-full bg-[#f8fafc] hover:bg-white min-h-[46px] pl-4 pr-2 py-2 rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
              >
                <span className="font-heading font-semibold text-[#202017] text-[15px] tracking-[0.4px] uppercase">
                  VER HISTÓRICO COMPLETO DE TREINOS
                </span>
                <span className="w-8 h-8 rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-[#202017] stroke-[2.5]" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

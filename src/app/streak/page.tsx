'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import WorkoutCalendarAndStreak, { toDayKey } from '@/components/WorkoutCalendarAndStreak';
import { ArrowLeft, Flame, Trophy, ArrowRight, Loader2, Calendar } from 'lucide-react';

export default function StreakPage() {
  const { user, profile, isPreviewMode, loading: authLoading } = useAuth();
  const router = useRouter();

  const [trainedDayKeys, setTrainedDayKeys] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => toDayKey(new Date()));

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        loadWorkoutDays();
      }
    }
  }, [user, authLoading, router]);

  const loadWorkoutDays = async () => {
    if (!user) return;
    setLoadingData(true);

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      const today = new Date();
      const offsets = [0, 1, 3, 4, 7, 9, 11, 14, 16, 18];
      const keys = offsets.map((off) => {
        const d = new Date(today);
        d.setDate(today.getDate() - off);
        return toDayKey(d);
      });
      setTrainedDayKeys(keys);
      setLoadingData(false);
      return;
    }

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
      setTrainedDayKeys(Array.from(daySet));
    } catch (err) {
      console.error('Error loading streak days:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);

    const trainedSet = new Set(trainedDayKeys);
    let thisWeekCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (trainedSet.has(toDayKey(d))) thisWeekCount++;
    }

    const goalDays = profile?.diasAtivos?.length || 4;
    const pct = Math.min(100, Math.round((thisWeekCount / goalDays) * 100));

    // Count workouts in current month
    const curMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = trainedDayKeys.filter((k) => k.startsWith(curMonthPrefix)).length;

    return {
      thisWeekCount,
      goalDays,
      pct,
      thisMonthCount,
      totalDays: trainedDayKeys.length,
    };
  }, [trainedDayKeys, profile?.diasAtivos]);

  const selectedDayHasWorkout = trainedDayKeys.includes(selectedDayKey);

  if (authLoading || (loadingData && !user)) {
    return (
      <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando sua ofensiva...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28">
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[16px]">
        {/* Back + Title */}
        <section className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-[10px] bg-[#151413] hover:bg-white/10 border border-white/[0.08] flex items-center justify-center text-[#f8fafc] shrink-0 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[28px]">
              OFENSIVA DE TREINOS
            </h1>
            <p className="text-[12px] text-[#94a3b8] leading-[16px]">
              Sua consistência semanal e calendário de atividades
            </p>
          </div>
        </section>

        {/* Hero Streak Banner */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[16px] p-[16px] relative overflow-hidden space-y-4">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#f59e0b]/15 blur-2xl pointer-events-none"
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] bg-[#f59e0b]/15 border border-[#f59e0b]/35 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-[#f59e0b] fill-[#f59e0b]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#ffb95f] block">
                  SEMANA ATUAL
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-heading font-bold text-[32px] leading-none text-[#f8fafc]">
                    {stats.thisWeekCount}
                  </span>
                  <span className="text-[13px] font-semibold text-[#94a3b8]">
                    de {stats.goalDays} dias ativos
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d3e156]/15 text-[#d3e156] text-[11px] font-bold">
                <Trophy className="w-3.5 h-3.5" />
                {stats.pct}%
              </span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2.5">
            <div className="bg-black/65 rounded-[12px] p-3">
              <span className="text-[10px] font-bold uppercase text-[#64748b] block">
                NO MÊS ATUAL
              </span>
              <span className="font-heading font-bold text-[22px] text-[#f8fafc]">
                {stats.thisMonthCount} {stats.thisMonthCount === 1 ? 'treino' : 'treinos'}
              </span>
            </div>
            <div className="bg-black/65 rounded-[12px] p-3">
              <span className="text-[10px] font-bold uppercase text-[#64748b] block">
                TOTAL REGISTRADO
              </span>
              <span className="font-heading font-bold text-[22px] text-[#ffb95f]">
                {stats.totalDays} {stats.totalDays === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </div>
        </section>

        {/* Shared Calendar + Active Sequence */}
        <WorkoutCalendarAndStreak
          calMonth={calMonth}
          onChangeMonth={setCalMonth}
          trainedDayKeys={trainedDayKeys}
          selectedDayKey={selectedDayKey}
          onSelectDay={(dayKey) => setSelectedDayKey(dayKey)}
          showSequence={true}
        />

        {/* Selected Day Action */}
        <section className="bg-[#151413] border border-white/[0.06] rounded-[14px] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-4 h-4 text-[#f59e0b] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[12px] font-bold text-[#f8fafc]">
                {selectedDayKey.split('-').reverse().join('/')}
              </span>
              <span className="block text-[11px] text-[#94a3b8] truncate">
                {selectedDayHasWorkout
                  ? 'Treino registrado nesta data'
                  : 'Nenhum treino registrado nesta data'}
              </span>
            </div>
          </div>

          {selectedDayHasWorkout ? (
            <button
              type="button"
              onClick={() => router.push(`/history/${selectedDayKey}`)}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-[#100F0F] font-bold text-[12px] px-3.5 py-2 rounded-full flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Ver Treino</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/history')}
              className="bg-black hover:bg-white/10 text-[#f8fafc] font-semibold text-[12px] px-3.5 py-2 rounded-full shrink-0 transition-colors"
            >
              Histórico
            </button>
          )}
        </section>

        {/* CTA to Full History */}
        <button
          type="button"
          onClick={() => router.push('/history')}
          className="w-full bg-[#f8fafc] hover:bg-white min-h-[48px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between shadow-lg transition-transform active:scale-[0.98]"
        >
          <span className="font-heading font-semibold text-[#202017] text-[16px] tracking-[0.4px] uppercase">
            VER HISTÓRICO COMPLETO DE TREINOS
          </span>
          <span className="w-[32px] h-[32px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
            <ArrowRight className="w-[15px] h-[15px] text-[#202017] stroke-[2.5]" />
          </span>
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import ClipzBodyBadge from '@/components/ClipzBodyBadge';
import { toDayKey } from '@/components/WorkoutCalendarAndStreak';
import { Check } from 'lucide-react';

export default function AppHeader() {
  const { user, profile, isPreviewMode } = useAuth();
  const [trainedDayKeys, setTrainedDayKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      const today = new Date();
      const offsets = [0, 1, 3, 4];
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

  const activeDaysThisWeek = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);

    const trainedSet = new Set(trainedDayKeys);
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (trainedSet.has(toDayKey(d))) count++;
    }
    return count;
  }, [trainedDayKeys]);

  const userInitial = (profile?.nome || user?.displayName || 'U').charAt(0).toUpperCase();
  const userPhoto =
    profile?.photoURL !== undefined ? profile.photoURL || null : user?.photoURL || null;

  return (
    <header className="sticky top-0 z-30 -mx-4 -mt-6 bg-[#100F0F]/95 backdrop-blur-md border-b border-border px-4 py-3.5 flex items-center justify-between print:hidden">
      {/* 1. Brand Logo */}
      <Link href="/dashboard" className="flex items-center">
        <ClipzBodyBadge className="h-7 w-auto" priority />
      </Link>

      {/* Right Controls: Streak Link -> /streak + User Profile Avatar -> /profile */}
      <div className="flex items-center gap-[10px]">
        {/* 2. Active Days / Streak Badge -> Dedicated /streak page */}
        <Link
          href="/streak"
          className="flex items-center gap-[5px] bg-[#151413] hover:bg-white/[0.12] border border-white/[0.08] px-[10px] py-[5px] rounded-full transition-colors active:scale-95"
          title="Ver ofensiva semanal e calendário"
        >
          <Check className="w-[13px] h-[13px] text-[#f59e0b] stroke-[2.8]" />
          <span className="font-semibold text-[#f8fafc] text-[12px] leading-none">
            {activeDaysThisWeek} {activeDaysThisWeek === 1 ? 'dia' : 'dias'}
          </span>
        </Link>

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
              referrerPolicy="no-referrer"
              className="w-[34px] h-[34px] rounded-full object-cover ring-1 ring-[#f59e0b]/50 group-hover:ring-[#f59e0b] transition-all"
            />
          ) : (
            <div className="w-[34px] h-[34px] rounded-full bg-[#151413] border border-[#f59e0b]/40 group-hover:border-[#f59e0b] flex items-center justify-center text-[#ffb95f] font-bold text-[13px] transition-colors">
              {userInitial}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full bg-[#d3e156] ring-2 ring-[#100F0F]" />
        </Link>
      </div>
    </header>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { PREDEFINED_EXERCISES } from '@/data/exercises';
import {
  Search,
  Calendar,
  List,
  Clock,
  Trophy,
  Zap,
  Copy,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Plus,
  Loader2,
  TrendingUp,
  Dumbbell,
  Star,
  History as HistoryIcon,
} from 'lucide-react';

interface LogSet {
  setNumber?: number;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  isPeak?: boolean;
}

interface SessionExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  setsCount: number;
  topCargaKg: number;
  topReps: number;
  top1RM: number;
  isPr?: boolean;
  setsSummary: string;
  allSets?: LogSet[];
}

interface WorkoutSession {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dateObj: Date;
  timeStr: string;
  title: string;
  splitKey: string;
  durationMin: number;
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
  exercises: SessionExercise[];
}

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
const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(raw: any): Date {
  if (!raw) return new Date(0);
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  return new Date(raw);
}

function formatRelativeDateLabel(d: Date, timeStr: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const key = toDayKey(d);
  if (key === toDayKey(today)) return `HOJE • ${timeStr}`;
  if (key === toDayKey(yesterday)) return `ONTEM • ${timeStr}`;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy} • ${timeStr}`;
}

function buildPreviewSessions(): WorkoutSession[] {
  const now = new Date();
  const mkDate = (daysAgo: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const d0 = mkDate(0, 18, 45);
  const d1 = mkDate(1, 7, 15);
  const d3 = mkDate(3, 19, 10);
  const d4 = mkDate(4, 18, 30);
  const d7 = mkDate(7, 18, 45);
  const d9 = mkDate(9, 19, 10);

  return [
    {
      id: 'prev_1',
      dateKey: toDayKey(d0),
      dateObj: d0,
      timeStr: '18:45',
      title: 'Treino A - Peito, Deltoide Frontal & Tríceps',
      splitKey: 'Treino A (Peito & Tríceps)',
      durationMin: 52,
      totalVolumeKg: 4850,
      totalSets: 14,
      prCount: 1,
      exercises: [
        {
          exerciseId: 'supino-reto-barra',
          name: 'Supino Reto Barra',
          muscleGroup: 'Peito',
          setsCount: 3,
          topCargaKg: 85,
          topReps: 8,
          top1RM: 102,
          isPr: true,
          setsSummary: '82.5kg × 10 • 85kg × 8 • 85kg × 6',
        },
        {
          exerciseId: 'supino-inclinado-halteres',
          name: 'Supino Inclinado Halteres',
          muscleGroup: 'Peito',
          setsCount: 3,
          topCargaKg: 32,
          topReps: 10,
          top1RM: 42.7,
          setsSummary: '3 séries (32kg × 10)',
        },
        {
          exerciseId: 'desenvolvimento-militar',
          name: 'Desenvolvimento Militar',
          muscleGroup: 'Ombro',
          setsCount: 4,
          topCargaKg: 24,
          topReps: 8,
          top1RM: 29.8,
          setsSummary: '4 séries (24kg × 8)',
        },
        {
          exerciseId: 'triceps-corda',
          name: 'Tríceps Corda na Polia',
          muscleGroup: 'Tríceps',
          setsCount: 4,
          topCargaKg: 35,
          topReps: 12,
          top1RM: 49,
          setsSummary: '4 séries (35kg × 12)',
        },
      ],
    },
    {
      id: 'prev_2',
      dateKey: toDayKey(d1),
      dateObj: d1,
      timeStr: '07:15',
      title: 'Treino B - Costas, Bíceps & Abdômen',
      splitKey: 'Treino B (Costas & Bíceps)',
      durationMin: 58,
      totalVolumeKg: 5320,
      totalSets: 16,
      prCount: 0,
      exercises: [
        {
          exerciseId: 'puxada-alta',
          name: 'Puxada Alta Pronada',
          muscleGroup: 'Costas',
          setsCount: 4,
          topCargaKg: 75,
          topReps: 10,
          top1RM: 100,
          setsSummary: '4 séries (75kg × 10)',
        },
        {
          exerciseId: 'remada-curvada',
          name: 'Remada Curvada Barra',
          muscleGroup: 'Costas',
          setsCount: 4,
          topCargaKg: 70,
          topReps: 8,
          top1RM: 87,
          setsSummary: '4 séries (70kg × 8)',
        },
        {
          exerciseId: 'rosca-direta',
          name: 'Rosca Direta Barra W',
          muscleGroup: 'Bíceps',
          setsCount: 4,
          topCargaKg: 32,
          topReps: 10,
          top1RM: 42.7,
          setsSummary: '4 séries (16kg/lado × 10)',
        },
      ],
    },
    {
      id: 'prev_3',
      dateKey: toDayKey(d3),
      dateObj: d3,
      timeStr: '19:10',
      title: 'Treino C - Quadríceps, Posterior & Panturrilhas',
      splitKey: 'Treino C (Pernas & Ombros)',
      durationMin: 65,
      totalVolumeKg: 6150,
      totalSets: 18,
      prCount: 1,
      exercises: [
        {
          exerciseId: 'agachamento-livre',
          name: 'Agachamento Livre',
          muscleGroup: 'Quadríceps',
          setsCount: 4,
          topCargaKg: 122.5,
          topReps: 6,
          top1RM: 142,
          isPr: true,
          setsSummary: '115kg × 8 • 120kg × 6 • 122.5kg × 6',
        },
        {
          exerciseId: 'leg-press-45',
          name: 'Leg Press 45°',
          muscleGroup: 'Quadríceps',
          setsCount: 4,
          topCargaKg: 220,
          topReps: 10,
          top1RM: 293,
          setsSummary: '4 séries (220kg × 10)',
        },
        {
          exerciseId: 'mesa-flexora',
          name: 'Mesa Flexora',
          muscleGroup: 'Posterior de Coxa',
          setsCount: 4,
          topCargaKg: 55,
          topReps: 12,
          top1RM: 77,
          setsSummary: '4 séries (55kg × 12)',
        },
      ],
    },
    {
      id: 'prev_4',
      dateKey: toDayKey(d4),
      dateObj: d4,
      timeStr: '18:30',
      title: 'Treino A - Peito & Tríceps',
      splitKey: 'Treino A (Peito & Tríceps)',
      durationMin: 50,
      totalVolumeKg: 4600,
      totalSets: 14,
      prCount: 0,
      exercises: [
        {
          exerciseId: 'supino-reto-barra',
          name: 'Supino Reto Barra',
          muscleGroup: 'Peito',
          setsCount: 3,
          topCargaKg: 80,
          topReps: 10,
          top1RM: 106.7,
          setsSummary: '3 séries (80kg × 10)',
        },
        {
          exerciseId: 'crucifixo-maquina',
          name: 'Crucifixo Máquina',
          muscleGroup: 'Peito',
          setsCount: 3,
          topCargaKg: 60,
          topReps: 12,
          top1RM: 84,
          setsSummary: '3 séries (60kg × 12)',
        },
      ],
    },
    {
      id: 'prev_5',
      dateKey: toDayKey(d7),
      dateObj: d7,
      timeStr: '18:45',
      title: 'Treino B - Costas & Bíceps',
      splitKey: 'Treino B (Costas & Bíceps)',
      durationMin: 55,
      totalVolumeKg: 5100,
      totalSets: 15,
      prCount: 0,
      exercises: [
        {
          exerciseId: 'puxada-alta',
          name: 'Puxada Alta Pronada',
          muscleGroup: 'Costas',
          setsCount: 4,
          topCargaKg: 70,
          topReps: 10,
          top1RM: 93.3,
          setsSummary: '4 séries (70kg × 10)',
        },
      ],
    },
    {
      id: 'prev_6',
      dateKey: toDayKey(d9),
      dateObj: d9,
      timeStr: '19:10',
      title: 'Treino C - Pernas Completo',
      splitKey: 'Treino C (Pernas & Ombros)',
      durationMin: 62,
      totalVolumeKg: 5890,
      totalSets: 16,
      prCount: 1,
      exercises: [
        {
          exerciseId: 'agachamento-livre',
          name: 'Agachamento Livre',
          muscleGroup: 'Quadríceps',
          setsCount: 4,
          topCargaKg: 115,
          topReps: 8,
          top1RM: 142.8,
          isPr: true,
          setsSummary: '4 séries (115kg × 8)',
        },
      ],
    },
  ];
}

export default function HistoryPage() {
  const { user, isPreviewMode, loading: authLoading } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSplit, setSelectedSplit] = useState<string>('Todos');
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Calendar view states
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalDayKey, setSelectedCalDayKey] = useState<string>(() => toDayKey(new Date()));

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        loadSessions();
      }
    }
  }, [user, authLoading, router]);

  const loadSessions = async () => {
    if (!user) return;
    setLoadingData(true);

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      const preview = buildPreviewSessions();
      setSessions(preview);
      if (preview[0]) setSelectedCalDayKey(preview[0].dateKey);
      setLoadingData(false);
      return;
    }

    try {
      const baseNames: Record<string, string> = {};
      PREDEFINED_EXERCISES.forEach((ex) => {
        baseNames[ex.id] = ex.nome;
      });

      const [logsSnap, exSnap] = await Promise.all([
        getDocs(query(collection(db, 'strength_logs'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'exercises'), where('userId', '==', user.uid))),
      ]);

      exSnap.forEach((d) => {
        const data = d.data();
        if (data.nomeExercicio) baseNames[d.id] = data.nomeExercicio;
      });

      // Group logs by date (YYYY-MM-DD)
      const byDate: Record<string, any[]> = {};
      const max1RmByEx: Record<string, number> = {};

      logsSnap.forEach((d) => {
        const data = d.data();
        const dt = parseDate(data.data);
        if (isNaN(dt.getTime()) || dt.getTime() === 0) return;
        const key = toDayKey(dt);
        if (!byDate[key]) byDate[key] = [];
        const oneRm = Number(data.oneRmCalculado) || 0;
        if (oneRm > (max1RmByEx[data.exerciseId] || 0)) {
          max1RmByEx[data.exerciseId] = oneRm;
        }
        byDate[key].push({ id: d.id, ...data, parsedDate: dt });
      });

      const built: WorkoutSession[] = Object.entries(byDate).map(([dateKey, items]) => {
        items.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        const firstDate: Date = items[0].parsedDate;
        const hh = String(firstDate.getHours()).padStart(2, '0');
        const mm = String(firstDate.getMinutes()).padStart(2, '0');

        const muscles = Array.from(
          new Set(items.map((it) => it.muscleGroup).filter(Boolean))
        ) as string[];
        const title =
          muscles.length > 0
            ? `Treino — ${muscles.slice(0, 3).join(', ')}`
            : 'Sessão de Treino';
        const splitKey = muscles[0] || 'Geral';

        let totalVolumeKg = 0;
        let totalSets = 0;
        let prCount = 0;

        // Group same exercise within the session
        const exMap: Record<string, SessionExercise> = {};
        items.forEach((it) => {
          const exId = it.exerciseId;
          const setsArr: LogSet[] = Array.isArray(it.allSets) ? it.allSets : [];
          const setsCount = setsArr.length > 0 ? setsArr.length : it.totalSetsCompleted || 1;
          const cargaKg = Number(it.cargaKg) || 0;
          const reps = Number(it.reps) || 0;
          const oneRm = Number(it.oneRmCalculado) || 0;

          if (setsArr.length > 0) {
            setsArr.forEach((s) => {
              totalVolumeKg += (Number(s.cargaKg) || 0) * (Number(s.reps) || 0);
            });
          } else {
            totalVolumeKg += cargaKg * reps * setsCount;
          }
          totalSets += setsCount;

          const isPr = oneRm > 0 && oneRm >= (max1RmByEx[exId] || 0);
          if (isPr) prCount += 1;

          const summary =
            setsArr.length > 1
              ? setsArr.map((s) => `${s.cargaKg}kg × ${s.reps}`).join(' • ')
              : `${setsCount} ${setsCount === 1 ? 'série' : 'séries'} (${cargaKg}kg × ${reps})`;

          if (!exMap[exId]) {
            exMap[exId] = {
              exerciseId: exId,
              name: baseNames[exId] || exId,
              muscleGroup: it.muscleGroup || 'Geral',
              setsCount,
              topCargaKg: cargaKg,
              topReps: reps,
              top1RM: oneRm,
              isPr,
              setsSummary: summary,
              allSets: setsArr,
            };
          } else {
            exMap[exId].setsCount += setsCount;
            if (oneRm > exMap[exId].top1RM) {
              exMap[exId].top1RM = oneRm;
              exMap[exId].topCargaKg = cargaKg;
              exMap[exId].topReps = reps;
            }
          }
        });

        return {
          id: `sess_${dateKey}`,
          dateKey,
          dateObj: firstDate,
          timeStr: `${hh}:${mm}`,
          title,
          splitKey,
          durationMin: Math.max(25, Math.min(90, totalSets * 3 + 10)),
          totalVolumeKg: Math.round(totalVolumeKg),
          totalSets,
          prCount,
          exercises: Object.values(exMap),
        };
      });

      built.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setSessions(built);
      if (built[0]) setSelectedCalDayKey(built[0].dateKey);
    } catch (err) {
      console.error('Error loading workout history:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Unique split filter options
  const splitOptions = useMemo(() => {
    const unique = Array.from(new Set(sessions.map((s) => s.splitKey)));
    return ['Todos', ...unique];
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedSplit !== 'Todos' && s.splitKey !== selectedSplit) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = s.title.toLowerCase().includes(q);
        const inEx = s.exercises.some(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.muscleGroup.toLowerCase().includes(q) ||
            String(e.topCargaKg).includes(q)
        );
        if (!inTitle && !inEx) return false;
      }
      return true;
    });
  }, [sessions, selectedSplit, searchQuery]);

  // Monthly summary metrics (current month)
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const inMonth = sessions.filter(
      (s) => s.dateObj.getMonth() === curMonth && s.dateObj.getFullYear() === curYear
    );
    const totalCount = inMonth.length;
    const totalVolKg = inMonth.reduce((acc, s) => acc + s.totalVolumeKg, 0);
    const totalPrs = inMonth.reduce((acc, s) => acc + s.prCount, 0);

    return {
      monthLabel: `${MONTH_SHORT[curMonth]}/${curYear}`,
      count: totalCount,
      tonnage: totalVolKg >= 1000 ? `${(totalVolKg / 1000).toFixed(1)}t` : `${totalVolKg}kg`,
      prs: totalPrs,
    };
  }, [sessions]);

  // Group filtered sessions into ESTA SEMANA / SEMANA PASSADA / ANTERIORES
  const groupedTimeline = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    const thisWeek: WorkoutSession[] = [];
    const lastWeek: WorkoutSession[] = [];
    const older: WorkoutSession[] = [];

    filteredSessions.forEach((s) => {
      const diff = startOfToday - new Date(s.dateObj.getFullYear(), s.dateObj.getMonth(), s.dateObj.getDate()).getTime();
      if (diff < sevenDaysMs) thisWeek.push(s);
      else if (diff < fourteenDaysMs) lastWeek.push(s);
      else older.push(s);
    });

    const groups: { title: string; items: WorkoutSession[]; icon: 'calendar' | 'history' }[] = [];
    if (thisWeek.length > 0) groups.push({ title: 'ESTA SEMANA', items: thisWeek, icon: 'calendar' });
    if (lastWeek.length > 0) groups.push({ title: 'SEMANA PASSADA', items: lastWeek, icon: 'history' });
    if (older.length > 0) groups.push({ title: 'ANTERIORES', items: older, icon: 'history' });
    return groups;
  }, [filteredSessions]);

  // Map dateKey -> WorkoutSession[] for Calendar View
  const sessionsByDayKey = useMemo(() => {
    const map: Record<string, WorkoutSession[]> = {};
    sessions.forEach((s) => {
      if (!map[s.dateKey]) map[s.dateKey] = [];
      map[s.dateKey].push(s);
    });
    return map;
  }, [sessions]);

  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const todayKey = toDayKey(new Date());

    const cells: Array<{
      empty?: boolean;
      day?: number;
      key?: string;
      hasWorkout?: boolean;
      hasPr?: boolean;
      isToday?: boolean;
    }> = [];

    for (let i = 0; i < startOffset; i++) cells.push({ empty: true });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = toDayKey(d);
      const daySess = sessionsByDayKey[key] || [];
      cells.push({
        day,
        key,
        hasWorkout: daySess.length > 0,
        hasPr: daySess.some((s) => s.prCount > 0),
        isToday: key === todayKey,
      });
    }
    return cells;
  }, [calMonth, sessionsByDayKey]);

  const selectedDaySessions = sessionsByDayKey[selectedCalDayKey] || [];

  const renderSessionCard = (session: WorkoutSession, isNewest = false) => {
    const isExpanded = expandedSessionId === session.id;
    const visibleExercises = isExpanded ? session.exercises : session.exercises.slice(0, 4);

    return (
      <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[14px] p-[14px] space-y-[12px]">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-[8px] flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.5px] px-[8px] py-[2px] rounded-[6px] ${
                  isNewest
                    ? 'bg-[#f59e0b]/20 text-[#ffb95f]'
                    : 'bg-black text-[#94a3b8]'
                }`}
              >
                {formatRelativeDateLabel(session.dateObj, session.timeStr)}
              </span>
              <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                <Clock className="w-[12px] h-[12px]" />
                {session.durationMin} min
              </span>
            </div>

            <h3 className="font-bold text-[#f8fafc] text-[15px] leading-[20px] mt-[6px]">
              {session.title}
            </h3>
          </div>

          {session.prCount > 0 ? (
            <span className="bg-[#d3e156] text-[#0e0f07] px-[8px] py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.4px] flex items-center gap-1 shrink-0 shadow-sm">
              <Trophy className="w-[11px] h-[11px]" />
              {session.prCount} {session.prCount === 1 ? 'Novo PR' : 'PRs'}
            </span>
          ) : (
            <span className="bg-black text-[#d3e156] border border-[#d3e156]/25 px-[8px] py-[3px] rounded-full text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-[11px] h-[11px]" />
              100%
            </span>
          )}
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-3 gap-[8px] bg-black/70 rounded-[10px] p-[10px]">
          <div>
            <span className="block text-[9px] font-bold uppercase text-[#64748b]">Volume</span>
            <span className="font-heading font-bold text-[#f8fafc] text-[16px] leading-[20px]">
              {session.totalVolumeKg.toLocaleString('pt-BR')} kg
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase text-[#64748b]">Séries</span>
            <span className="font-heading font-bold text-[#f8fafc] text-[16px] leading-[20px]">
              {session.totalSets} séries
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase text-[#64748b]">Exercícios</span>
            <span className="font-heading font-bold text-[#ffb95f] text-[16px] leading-[20px]">
              {session.exercises.length} feitos
            </span>
          </div>
        </div>

        {/* Exercise Breakdown Rows */}
        <div className="space-y-[6px]">
          {visibleExercises.map((ex, i) =>
            ex.isPr ? (
              <div
                key={`${ex.exerciseId}_${i}`}
                className="bg-black/60 border border-[#d3e156]/20 rounded-[10px] p-[10px] space-y-[4px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d3e156] shrink-0" />
                    <span className="text-[13px] font-semibold text-[#f8fafc] truncate">
                      {ex.name}
                    </span>
                  </div>
                  <span className="bg-[#d3e156]/15 text-[#d3e156] text-[9px] font-bold uppercase px-[6px] py-[2px] rounded flex items-center gap-0.5 shrink-0">
                    <Zap className="w-[10px] h-[10px] fill-current" />
                    PR 1RM {Math.round(ex.top1RM)}kg
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#94a3b8] pl-3.5">
                  <span>{ex.setsCount} séries</span>
                  <span className="font-mono font-semibold text-[#f8fafc]">{ex.setsSummary}</span>
                </div>
              </div>
            ) : (
              <div
                key={`${ex.exerciseId}_${i}`}
                className="bg-white/[0.04] rounded-[8px] px-[10px] py-[7px] flex items-center justify-between gap-2 text-[12px]"
              >
                <span className="text-[#f8fafc] truncate">{ex.name}</span>
                <span className="font-mono text-[#94a3b8] text-[11px] shrink-0">
                  {ex.setsSummary}
                </span>
              </div>
            )
          )}
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between pt-[2px]">
          <button
            type="button"
            onClick={() => router.push('/workout/active')}
            className="h-[34px] px-[12px] rounded-[8px] bg-white/[0.06] hover:bg-[#f59e0b] text-[#ffb95f] hover:text-[#0e0f07] text-[12px] font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
          >
            <Copy className="w-[13px] h-[13px]" />
            <span>Repetir Treino</span>
          </button>

          <button
            type="button"
            onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
            className="h-[34px] px-[12px] rounded-[8px] bg-black hover:bg-[#1c1c13] text-[#f8fafc] text-[12px] font-semibold flex items-center gap-1 transition-colors"
          >
            <span>{isExpanded ? 'Recolher' : 'Detalhes'}</span>
            {isExpanded ? (
              <ChevronUp className="w-[14px] h-[14px] text-[#ffb95f]" />
            ) : (
              <ArrowRight className="w-[14px] h-[14px] text-[#ffb95f]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  if (authLoading || (loadingData && !user)) {
    return (
      <div className="min-h-screen bg-[#0e0f07] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando histórico de treinos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0f07] text-[#f8fafc] pb-28">
      {/* Global 3-Element Header (Logo + Streak + Profile Avatar) */}
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[16px]">
        {/* PAGE TITLE & QUICK LOG BUTTON */}
        <section className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[30px]">
              HISTÓRICO DE TREINOS
            </h1>
            <p className="text-[12px] text-[#94a3b8] leading-[16px] mt-[2px]">
              Timeline e registro de sessões concluídas
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/strength')}
            className="w-[38px] h-[38px] rounded-[10px] bg-[#151413] hover:bg-white/10 border border-white/10 text-[#ffb95f] flex items-center justify-center shrink-0 transition-colors active:scale-95"
            title="Registrar treino passado"
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>
        </section>

        {/* VIEW TOGGLE TABS: Timeline / Lista vs Calendário */}
        <div className="grid grid-cols-2 p-[4px] rounded-[12px] bg-[#151413] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center justify-center gap-1.5 py-[8px] px-3 rounded-[8px] text-[12px] font-bold transition-all ${
              viewMode === 'timeline'
                ? 'bg-[#f59e0b] text-[#0e0f07] shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <List className="w-[15px] h-[15px]" />
            <span>Timeline / Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center justify-center gap-1.5 py-[8px] px-3 rounded-[8px] text-[12px] font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-[#f59e0b] text-[#0e0f07] shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Calendar className="w-[15px] h-[15px]" />
            <span>Calendário</span>
          </button>
        </div>

        {/* MONTHLY SUMMARY METRIC BANNER */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[14px] p-[14px] relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#f59e0b]/10 blur-2xl pointer-events-none"
          />
          <div className="flex items-center justify-between mb-[10px]">
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#ffb95f] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              VOLUME DO MÊS • {monthlySummary.monthLabel}
            </span>
            <span className="text-[11px] text-[#64748b] font-medium">Meta: 20 treinos</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="font-heading font-bold text-[#f8fafc] text-[22px] leading-none block">
                {monthlySummary.count}
              </span>
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold mt-1 block">
                Concluídos
              </span>
            </div>
            <div>
              <span className="font-heading font-bold text-[#f8fafc] text-[22px] leading-none block">
                {monthlySummary.tonnage}
              </span>
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold mt-1 block">
                Movimentados
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-heading font-bold text-[#d3e156] text-[22px] leading-none">
                  {monthlySummary.prs}
                </span>
                <Star className="w-3.5 h-3.5 text-[#d3e156] fill-[#d3e156]" />
              </div>
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold mt-1 block">
                Novos PRs
              </span>
            </div>
          </div>
        </section>

        {/* =================================================================
            VIEW 1: TIMELINE / LISTA
           ================================================================= */}
        {viewMode === 'timeline' ? (
          <div className="space-y-[14px]">
            {/* Search & Split Filter Pills */}
            <div className="space-y-[8px]">
              <div className="relative">
                <Search className="w-[16px] h-[16px] text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar exercício, carga ou treino..."
                  className="w-full h-[42px] pl-10 pr-4 rounded-[10px] bg-[#151413] border border-white/[0.08] text-[#f8fafc] placeholder:text-[#64748b] text-[13px] focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div className="-mx-4 px-4 flex items-center gap-[8px] overflow-x-auto pb-1 scrollbar-none">
                {splitOptions.map((sp) => {
                  const isActive = selectedSplit === sp;
                  return (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSelectedSplit(sp)}
                      className={`h-[32px] px-[12px] rounded-full text-[12px] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                        isActive
                          ? 'bg-[#f59e0b] text-[#0e0f07] font-bold'
                          : 'bg-black border border-white/10 text-[#94a3b8] hover:text-white font-medium'
                      }`}
                    >
                      <span>{sp}</span>
                      {sp === 'Todos' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                            isActive ? 'bg-[#0e0f07] text-[#ffb95f]' : 'bg-white/10 text-white'
                          }`}
                        >
                          {sessions.length}
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="w-2 shrink-0" />
              </div>
            </div>

            {/* Timeline Groups */}
            {groupedTimeline.length === 0 ? (
              <div className="bg-[#151413] rounded-[14px] p-8 text-center space-y-3 border border-white/[0.05]">
                <Dumbbell className="w-8 h-8 text-[#64748b] mx-auto" />
                <p className="text-xs text-[#94a3b8]">
                  Nenhum treino encontrado para este filtro.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/workout/active')}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0e0f07] font-bold text-xs px-5 py-2.5 rounded-full inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Iniciar Treino Agora
                </button>
              </div>
            ) : (
              <div className="space-y-[22px]">
                {groupedTimeline.map((group, gIdx) => (
                  <section key={group.title} className="space-y-[12px]">
                    {/* Group Header */}
                    <div className="flex items-center gap-2">
                      {group.icon === 'calendar' ? (
                        <Calendar className="w-[15px] h-[15px] text-[#f59e0b]" />
                      ) : (
                        <HistoryIcon className="w-[15px] h-[15px] text-[#94a3b8]" />
                      )}
                      <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
                        {group.title}
                      </h2>
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#64748b]">
                        {group.items.length}{' '}
                        {group.items.length === 1 ? 'SESSÃO' : 'SESSÕES'}
                      </span>
                    </div>

                    {/* Vertical Timeline Spine */}
                    <div className="relative pl-[22px] space-y-[14px]">
                      <div
                        aria-hidden
                        className="absolute left-[7px] top-[14px] bottom-[14px] w-[2px] bg-white/10"
                      />

                      {group.items.map((session, sIdx) => {
                        const isNewest = gIdx === 0 && sIdx === 0;
                        return (
                          <article key={session.id} className="relative">
                            {/* Timeline Node Dot */}
                            <div className="absolute -left-[22px] top-[16px] w-[16px] h-[16px] rounded-full bg-[#0e0f07] flex items-center justify-center">
                              <div
                                className={`rounded-full ${
                                  isNewest
                                    ? 'w-[10px] h-[10px] bg-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.85)]'
                                    : session.prCount > 0
                                    ? 'w-[9px] h-[9px] bg-[#d3e156]'
                                    : 'w-[8px] h-[8px] bg-[#64748b]'
                                }`}
                              />
                            </div>

                            {renderSessionCard(session, isNewest)}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* Bottom Manual Registration CTA */}
            <div className="pt-2 space-y-2 text-center">
              <button
                type="button"
                onClick={() => router.push('/strength')}
                className="w-full py-3 px-4 rounded-[12px] bg-[#151413] hover:bg-[#1c1c13] border border-dashed border-[#f59e0b]/40 text-[#ffb95f] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Registrar Treino Passado Manualmente
              </button>
              <p className="text-[11px] text-[#64748b]">
                Esqueceu de registrar ontem? Insira séries, cargas e datas a qualquer momento.
              </p>
            </div>
          </div>
        ) : (
          /* =================================================================
              VIEW 2: CALENDÁRIO INTERATIVO
             ================================================================= */
          <div className="space-y-[14px] animate-in fade-in duration-200">
            <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[14px] p-[14px] space-y-[12px]">
              {/* Month Switcher */}
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                  {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
                </h2>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                    }
                    className="w-8 h-8 rounded-[8px] bg-black hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                    }
                    className="w-8 h-8 rounded-[8px] bg-black hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Week Headers */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WEEK_LABELS.map((w) => (
                  <span key={w} className="text-[10px] font-bold text-[#64748b] py-1">
                    {w}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {calendarCells.map((cell, idx) =>
                  cell.empty ? (
                    <div key={`e_${idx}`} className="h-[40px]" />
                  ) : (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => cell.key && setSelectedCalDayKey(cell.key)}
                      className={`h-[40px] rounded-[10px] flex flex-col items-center justify-center text-[13px] font-semibold relative transition-all ${
                        selectedCalDayKey === cell.key
                          ? 'bg-[#f59e0b] text-[#0e0f07] font-bold shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                          : cell.hasWorkout
                          ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/45 text-[#ffb95f] hover:bg-[#f59e0b]/25'
                          : cell.isToday
                          ? 'bg-white/10 border border-white/30 text-white'
                          : 'bg-black/50 text-[#94a3b8] hover:bg-white/5'
                      }`}
                    >
                      <span>{cell.day}</span>
                      {cell.hasWorkout && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                            selectedCalDayKey === cell.key
                              ? 'bg-[#0e0f07]'
                              : cell.hasPr
                              ? 'bg-[#d3e156]'
                              : 'bg-[#f59e0b]'
                          }`}
                        />
                      )}
                    </button>
                  )
                )}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#94a3b8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span>Dia Treinado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#d3e156]" />
                  <span>Dia com Novo PR</span>
                </div>
              </div>
            </section>

            {/* Selected Day Sessions */}
            <section className="space-y-[10px]">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-heading font-semibold text-[#f8fafc] text-[16px] uppercase">
                  SESSÕES EM {selectedCalDayKey.split('-').reverse().join('/')}
                </h3>
                <span className="text-[11px] font-semibold text-[#ffb95f]">
                  {selectedDaySessions.length}{' '}
                  {selectedDaySessions.length === 1 ? 'treino' : 'treinos'}
                </span>
              </div>

              {selectedDaySessions.length === 0 ? (
                <div className="bg-[#151413] border border-white/[0.06] rounded-[14px] p-6 text-center space-y-2">
                  <Calendar className="w-7 h-7 text-[#64748b] mx-auto" />
                  <p className="text-xs text-[#94a3b8]">
                    Nenhum treino registrado nesta data.
                  </p>
                </div>
              ) : (
                <div className="space-y-[12px]">
                  {selectedDaySessions.map((sess) => (
                    <div key={sess.id}>{renderSessionCard(sess, false)}</div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import AppHeader from '@/components/AppHeader';
import { WeeklyInsight, getWeekKey } from '@/components/WeeklyInsightsCard';
import { PREDEFINED_EXERCISES } from '@/data/exercises';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Timer,
  TrendingUp,
  ArrowUp,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Scale,
  Layers,
  Lightbulb,
  Flame,
  FileDown,
  X,
  Brain,
  ListChecks,
} from 'lucide-react';

type PeriodKey = '7d' | '30d' | '90d';

interface FullStrengthLog {
  id: string;
  exerciseId: string;
  muscleGroup: string;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  totalSetsCompleted?: number;
  durationMinutes?: number;
  avgRestSeconds?: number;
  data: any;
}

interface MeasurementDoc {
  id: string;
  pesoKg: number;
  imcCalculado: number;
  medidas?: Record<string, number>;
  data: any;
}

const VOLUME_GROUPS = [
  { key: 'peito', label: 'Peitoral', matches: ['Peito'], defaultTarget: 16 },
  { key: 'costas', label: 'Costas / Dorsal', matches: ['Costas'], defaultTarget: 16 },
  { key: 'quadriceps', label: 'Quadríceps', matches: ['Quadríceps', 'Pernas'], defaultTarget: 12 },
  { key: 'ombros', label: 'Ombros (Deltoides)', matches: ['Ombro', 'Ombros'], defaultTarget: 12 },
  { key: 'bracos', label: 'Braços (Bíceps / Tríceps)', matches: ['Bíceps', 'Tríceps', 'Antebraço', 'Braços'], defaultTarget: 12 },
  { key: 'posterior', label: 'Posterior de Coxa', matches: ['Posterior de Coxa', 'Glúteos', 'Quadril'], defaultTarget: 12 },
];

const WEEK_DAYS = [
  { label: 'SEG', jsDay: 1 },
  { label: 'TER', jsDay: 2 },
  { label: 'QUA', jsDay: 3 },
  { label: 'QUI', jsDay: 4 },
  { label: 'SEX', jsDay: 5 },
  { label: 'SÁB', jsDay: 6 },
  { label: 'DOM', jsDay: 0 },
];

function parseDate(raw: any): Date {
  if (!raw) return new Date(0);
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  return new Date(raw);
}

function formatDateShort(raw: any): string {
  const d = parseDate(raw);
  if (isNaN(d.getTime()) || d.getTime() === 0) return '--/--/--';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export default function InsightsPage() {
  const { user, profile, isPreviewMode, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [userLogs, setUserLogs] = useState<FullStrengthLog[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementDoc[]>([]);
  const [exerciseNameMap, setExerciseNameMap] = useState<Record<string, string>>({});
  const [currentInsight, setCurrentInsight] = useState<WeeklyInsight | null>(null);
  const [historyInsights, setHistoryInsights] = useState<WeeklyInsight[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);

  // AI Goals Modal State (from Stitch screen 246b222e100f4d668e4bc44f83788880)
  const [isAiGoalsModalOpen, setIsAiGoalsModalOpen] = useState(false);
  const [cycleFocus, setCycleFocus] = useState<'hipertrofia' | 'forca' | 'recomposicao'>('hipertrofia');
  const [deficitTargetSets, setDeficitTargetSets] = useState<number>(10);
  const [enableOverloadBoost, setEnableOverloadBoost] = useState<boolean>(true);
  const [enableRestTimer90s, setEnableRestTimer90s] = useState<boolean>(true);
  const [savingGoals, setSavingGoals] = useState<boolean>(false);
  const [goalsAppliedToast, setGoalsAppliedToast] = useState<boolean>(false);

  const currentWeekKey = getWeekKey();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        loadAllData();
      }
    }
  }, [user, authLoading, router]);

  const loadAllData = async () => {
    if (!user) return;
    setLoadingData(true);

    // Build predefined exercise name lookup
    const baseNames: Record<string, string> = {};
    PREDEFINED_EXERCISES.forEach((ex) => {
      baseNames[ex.id] = ex.nome;
    });

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      setExerciseNameMap(baseNames);
      setCurrentInsight({
        weekKey: currentWeekKey,
        resumoGeral:
          'Você aumentou o volume semanal em +14% e manteve déficit calórico ideal. Ganho estimado de +0.8kg de massa muscular com redução de -1.5cm de cintura abdominal.',
        destaqueSemanal:
          'Peitoral & Tríceps: Volume ótimo alcançado (16 séries efetivas). Mantenha a sobrecarga progressiva no Supino Inclinado.',
        pontosAtencao:
          'Posterior de Coxa: Déficit de 4 séries abaixo do alvo semanal de 12 séries. Recomendado adicionar Stiff ou Mesa Flexora no Treino B.',
        dicaTecnica:
          'Recuperação Inter-Série: Tempo de descanso médio foi de 92s (faixa ideal para hipertrofia sob alta sobrecarga mecânica).',
        mensagemMotivacional: 'Consistência impecável na semana — continue progredindo!',
        dataGeracao: new Date(),
      });
      setHistoryInsights([
        {
          id: 'preview_w1',
          weekKey: '2026-W45',
          resumoGeral:
            'Semana de consolidação de cargas com progressão consistente em Costas e Quadríceps. Peso corporal estável em 79.1kg.',
          destaqueSemanal: 'Agachamento Livre atingiu novo pico de 1RM estimado (+4.2%).',
          pontosAtencao: 'Ombros ficaram com 2 séries abaixo da meta semanal.',
          dicaTecnica: 'Adicione 2 séries extras de Elevação Lateral no final do Treino A.',
          mensagemMotivacional: 'Ritmo excelente, cada treino conta!',
          pesoInfo: { pesoAtual: 79.1 },
          dataGeracao: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        },
        {
          id: 'preview_w2',
          weekKey: '2026-W44',
          resumoGeral:
            'Retomada sólida de volume semanal após deload. Boa simetria entre membros superiores.',
          destaqueSemanal: 'Supino Reto Barra retomou 80.0kg x 8 com técnica limpa.',
          pontosAtencao: 'Descanso médio acima de 2m15s nos isoladores.',
          dicaTecnica: 'Reduza o descanso em isoladores para 60-90s para elevar densidade.',
          mensagemMotivacional: 'Base construída para um novo ciclo de recordes!',
          pesoInfo: { pesoAtual: 80.0 },
          dataGeracao: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
        },
      ]);
      setLoadingData(false);
      return;
    }

    try {
      const [logsSnap, measSnap, exSnap, insSnap, currentInsSnap] = await Promise.all([
        getDocs(query(collection(db, 'strength_logs'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'body_measurements'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'exercises'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'weekly_insights'), where('userId', '==', user.uid))),
        getDoc(doc(db, 'weekly_insights', `${user.uid}_${currentWeekKey}`)),
      ]);

      exSnap.forEach((d) => {
        const data = d.data();
        if (data.nomeExercicio) baseNames[d.id] = data.nomeExercicio;
      });
      setExerciseNameMap(baseNames);

      const logsList: FullStrengthLog[] = [];
      logsSnap.forEach((d) => {
        const data = d.data();
        logsList.push({
          id: d.id,
          exerciseId: data.exerciseId,
          muscleGroup: data.muscleGroup || 'Geral',
          cargaKg: Number(data.cargaKg) || 0,
          reps: Number(data.reps) || 0,
          oneRmCalculado: Number(data.oneRmCalculado) || 0,
          totalSetsCompleted: data.totalSetsCompleted || (Array.isArray(data.allSets) ? data.allSets.length : 1),
          durationMinutes: data.durationMinutes,
          avgRestSeconds: data.avgRestSeconds,
          data: data.data,
        });
      });
      setUserLogs(logsList);

      const measList: MeasurementDoc[] = [];
      measSnap.forEach((d) => {
        const data = d.data();
        measList.push({
          id: d.id,
          pesoKg: Number(data.pesoKg) || 0,
          imcCalculado: Number(data.imcCalculado) || 0,
          medidas: data.medidas || {},
          data: data.data,
        });
      });
      measList.sort((a, b) => parseDate(b.data).getTime() - parseDate(a.data).getTime());
      setMeasurements(measList);

      if (currentInsSnap.exists()) {
        setCurrentInsight(currentInsSnap.data() as WeeklyInsight);
      } else {
        setCurrentInsight(null);
      }

      const histList: WeeklyInsight[] = [];
      insSnap.forEach((d) => {
        const data = d.data() as WeeklyInsight;
        histList.push({ ...data, id: d.id });
      });
      histList.sort((a, b) => parseDate(b.dataGeracao).getTime() - parseDate(a.dataGeracao).getTime());
      setHistoryInsights(histList);
    } catch (err) {
      console.error('Error loading insights page data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter logs by selected period
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const periodLogs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    return userLogs.filter((l) => parseDate(l.data).getTime() >= cutoff.getTime());
  }, [userLogs, periodDays]);

  // 1. Volume Distribution per muscle group
  const volumeStats = useMemo(() => {
    if (isPreviewMode || user?.uid === 'preview_user_uid') {
      const mult = period === '7d' ? 1 : period === '30d' ? 4 : 12;
      const demo = [
        { key: 'peito', label: 'Peitoral', done: 16 * mult, target: 16 * mult },
        { key: 'costas', label: 'Costas / Dorsal', done: 14 * mult, target: 16 * mult },
        { key: 'quadriceps', label: 'Quadríceps', done: 12 * mult, target: 12 * mult },
        { key: 'ombros', label: 'Ombros (Deltoides)', done: 10 * mult, target: 12 * mult },
        { key: 'bracos', label: 'Braços (Bíceps / Tríceps)', done: 12 * mult, target: 12 * mult },
        { key: 'posterior', label: 'Posterior de Coxa', done: 6 * mult, target: 12 * mult },
      ];
      return demo.map((d) => ({
        ...d,
        pct: Math.min(100, Math.round((d.done / d.target) * 100)),
        isLow: d.done / d.target < 0.8,
      }));
    }

    const mult = period === '7d' ? 1 : period === '30d' ? 4 : 12;
    return VOLUME_GROUPS.map((g) => {
      const target = g.defaultTarget * mult;
      const done = periodLogs
        .filter((l) => g.matches.includes(l.muscleGroup))
        .reduce((acc, l) => acc + (l.totalSetsCompleted || 1), 0);
      const ratio = target > 0 ? done / target : 0;
      return {
        key: g.key,
        label: g.label,
        done,
        target,
        pct: Math.min(100, Math.round(ratio * 100)),
        isLow: ratio < 0.8,
      };
    });
  }, [periodLogs, period, isPreviewMode, user?.uid]);

  // 2. Progressive Overload (1RM Estimation)
  const overloadStats = useMemo(() => {
    if (isPreviewMode || user?.uid === 'preview_user_uid') {
      return {
        globalPct: 6.8,
        exercises: [
          { name: 'Supino Reto Barra', prevKg: 80.0, currKg: 84.5, deltaPct: 5.6 },
          { name: 'Agachamento Livre', prevKg: 115.0, currKg: 122.5, deltaPct: 6.5 },
          { name: 'Puxada Alta Pronada', prevKg: 70.0, currKg: 75.0, deltaPct: 7.1 },
        ],
        latestPrText: 'Novo Recorde Pessoal (PR) batido há 2 dias no Agachamento!',
      };
    }

    // Group all logs by exerciseId
    const byEx: Record<string, FullStrengthLog[]> = {};
    userLogs.forEach((l) => {
      if (!byEx[l.exerciseId]) byEx[l.exerciseId] = [];
      byEx[l.exerciseId].push(l);
    });

    const progressed: { name: string; prevKg: number; currKg: number; deltaPct: number; latestDate: Date }[] = [];

    Object.entries(byEx).forEach(([exId, logs]) => {
      if (logs.length < 2) return;
      const sorted = [...logs].sort((a, b) => parseDate(a.data).getTime() - parseDate(b.data).getTime());
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];

      const baseVal = prev.oneRmCalculado || first.oneRmCalculado;
      const currVal = latest.oneRmCalculado;
      if (baseVal > 0 && currVal > 0) {
        const deltaPct = Number((((currVal - baseVal) / baseVal) * 100).toFixed(1));
        progressed.push({
          name: exerciseNameMap[exId] || exId,
          prevKg: prev.cargaKg,
          currKg: latest.cargaKg,
          deltaPct,
          latestDate: parseDate(latest.data),
        });
      }
    });

    progressed.sort((a, b) => b.deltaPct - a.deltaPct);
    const top3 = progressed.slice(0, 3);
    const avgPct =
      top3.length > 0
        ? Number((top3.reduce((acc, item) => acc + item.deltaPct, 0) / top3.length).toFixed(1))
        : 0;

    const topPr = top3.find((x) => x.deltaPct > 0);
    let latestPrText = 'Registre mais sessões para acompanhar novos Recordes Pessoais (PR).';
    if (topPr) {
      const diffDays = Math.max(
        0,
        Math.floor((Date.now() - topPr.latestDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      latestPrText =
        diffDays === 0
          ? `Novo Recorde Pessoal (PR) batido hoje em ${topPr.name}!`
          : `Novo Recorde Pessoal (PR) batido há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} em ${topPr.name}!`;
    }

    return {
      globalPct: avgPct,
      exercises: top3,
      latestPrText,
    };
  }, [userLogs, exerciseNameMap, isPreviewMode, user?.uid]);

  // 3. Consistency & Sessions
  const consistencyStats = useMemo(() => {
    const goalDaysPerWeek = profile?.diasAtivos?.length || 4;

    if (isPreviewMode || user?.uid === 'preview_user_uid') {
      return {
        sessionsDone: 4,
        sessionsGoal: goalDaysPerWeek,
        goalPct: Math.min(100, Math.round((4 / goalDaysPerWeek) * 100)),
        avgDuration: '54m',
        avgRest: '1m 32s',
        activeJsDays: [1, 2, 4, 5], // SEG, TER, QUI, SEX
      };
    }

    // Current week (last 7 days) unique workout days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = userLogs.filter((l) => parseDate(l.data).getTime() >= sevenDaysAgo.getTime());

    const daySet = new Set<string>();
    const jsDaySet = new Set<number>();
    const durations: number[] = [];
    const rests: number[] = [];

    recentLogs.forEach((l) => {
      const d = parseDate(l.data);
      daySet.add(d.toISOString().split('T')[0]);
      jsDaySet.add(d.getDay());
      if (l.durationMinutes && l.durationMinutes > 0) durations.push(l.durationMinutes);
      if (l.avgRestSeconds && l.avgRestSeconds > 0) rests.push(l.avgRestSeconds);
    });

    const sessionsDone = daySet.size;
    const goalPct = goalDaysPerWeek > 0 ? Math.min(100, Math.round((sessionsDone / goalDaysPerWeek) * 100)) : 0;

    let avgDuration = '--';
    if (durations.length > 0) {
      const avgM = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      avgDuration = `${avgM}m`;
    }

    let avgRest = '--';
    if (rests.length > 0) {
      const avgS = Math.round(rests.reduce((a, b) => a + b, 0) / rests.length);
      const mins = Math.floor(avgS / 60);
      const secs = avgS % 60;
      avgRest = mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`;
    }

    return {
      sessionsDone,
      sessionsGoal: goalDaysPerWeek,
      goalPct,
      avgDuration,
      avgRest,
      activeJsDays: Array.from(jsDaySet),
    };
  }, [userLogs, profile?.diasAtivos, isPreviewMode, user?.uid]);

  // Generate fresh AI Insight via /api/insights
  const handleGenerateAiInsight = async () => {
    if (!user || !profile) return;
    if (isPreviewMode || user.uid === 'preview_user_uid') return;

    setGeneratingAi(true);
    setAiError(null);

    try {
      const weeklySetsByMuscle: Record<string, number> = {};
      volumeStats.forEach((v) => {
        weeklySetsByMuscle[v.label] = v.done;
      });

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile.nome,
          stats: {
            totalTreinosSemana: consistencyStats.sessionsDone,
            exerciciosTreinados: overloadStats.exercises.map((e) => ({
              nome: e.name,
              grupo: 'Geral',
              cargaMaxKg: e.currKg,
              oneRmMax: e.currKg,
              series: 3,
            })),
            gruposMaisTreinados: volumeStats.filter((v) => !v.isLow).map((v) => v.label),
            gruposMenosTreinados: volumeStats.filter((v) => v.isLow).map((v) => v.label),
            pesoAtual: measurements[0]?.pesoKg || profile.pesoAtual,
            pesoAnterior: measurements[1]?.pesoKg,
            imcAtual: measurements[0]?.imcCalculado,
            idade: profile.idade,
            altura: profile.altura,
            sexo: profile.sexo,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao consultar o Coach IA.');
      }

      const data = await response.json();
      const savedInsight: WeeklyInsight = {
        ...data,
        userId: user.uid,
        weekKey: currentWeekKey,
        pesoInfo: {
          pesoAtual: measurements[0]?.pesoKg || profile.pesoAtual,
          imc: measurements[0]?.imcCalculado,
        },
        dataGeracao: new Date(),
      };

      await setDoc(doc(db, 'weekly_insights', `${user.uid}_${currentWeekKey}`), savedInsight, {
        merge: true,
      });

      setCurrentInsight(savedInsight);
      loadAllData();
    } catch (err: any) {
      console.error('Error generating AI insight:', err);
      setAiError(err.message || 'Não foi possível atualizar a análise agora.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleExportPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Dynamic AI Goals Modal Computations
  const weakestGroup = useMemo(() => {
    if (volumeStats.length === 0) {
      return { key: 'posterior', label: 'Posterior de Coxa', done: 6, target: 12 };
    }
    const sorted = [...volumeStats].sort((a, b) => a.pct - b.pct);
    return sorted[0];
  }, [volumeStats]);

  const topProjectedExercise = useMemo(() => {
    const first = overloadStats.exercises[0];
    if (!first) {
      return { name: 'Supino Reto', currKg: 84.5, targetKg: 90.0, deltaKg: 5.5 };
    }
    const targetKg = Number((first.currKg * 1.075).toFixed(1));
    const deltaKg = Number((targetKg - first.currKg).toFixed(1));
    return { name: first.name, currKg: first.currKg, targetKg, deltaKg };
  }, [overloadStats]);

  const anthroTargets = useMemo(() => {
    const baseWeight = measurements[0]?.pesoKg || profile?.pesoAtual || 78.4;
    const baseWaist = measurements[0]?.medidas?.cintura || 79.0;
    const weightDelta = cycleFocus === 'hipertrofia' ? 0.8 : cycleFocus === 'forca' ? 0.5 : -0.9;
    const bfDelta = cycleFocus === 'recomposicao' ? -0.8 : cycleFocus === 'hipertrofia' ? -0.2 : 0.0;
    const waistDelta = cycleFocus === 'recomposicao' ? -1.0 : -0.5;
    return {
      targetWeight: Number((baseWeight + weightDelta).toFixed(1)),
      weightDeltaText: weightDelta >= 0 ? `+${weightDelta.toFixed(1)} kg` : `${weightDelta.toFixed(1)} kg`,
      targetBf: Number(Math.max(8, 13.8 + bfDelta).toFixed(1)),
      bfDeltaText: bfDelta >= 0 ? `+${bfDelta.toFixed(1)}%` : `${bfDelta.toFixed(1)}%`,
      targetWaist: Number((baseWaist + waistDelta).toFixed(1)),
      waistDeltaText: `${waistDelta.toFixed(1)} cm`,
    };
  }, [measurements, profile?.pesoAtual, cycleFocus]);

  const estimatedSuccessRate = useMemo(() => {
    const base = Math.round(78 + (consistencyStats.goalPct / 100) * 16);
    return Math.min(98, Math.max(72, base));
  }, [consistencyStats.goalPct]);

  const handleOpenAiGoalsModal = () => {
    const suggested = Math.min(20, Math.max(weakestGroup.done + 4, weakestGroup.target));
    setDeficitTargetSets(suggested);
    setCycleFocus(
      profile?.objetivo === 'forca'
        ? 'forca'
        : profile?.objetivo === 'definicao'
        ? 'recomposicao'
        : 'hipertrofia'
    );
    setIsAiGoalsModalOpen(true);
  };

  const handleApplyAiGoals = async () => {
    setSavingGoals(true);
    try {
      const mappedObjetivo =
        cycleFocus === 'forca'
          ? 'forca'
          : cycleFocus === 'recomposicao'
          ? 'definicao'
          : 'hipertrofia';

      if (user) {
        await updateProfile({
          objetivo: mappedObjetivo,
          focoMuscularLista: [weakestGroup.label],
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `clipzbody_goal_${user.uid}`,
            JSON.stringify({
              targetWeightKg: anthroTargets.targetWeight,
              targetBfPct: anthroTargets.targetBf,
              deficitTargetSets,
              enableOverloadBoost,
              enableRestTimer90s,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      }

      setIsAiGoalsModalOpen(false);
      setGoalsAppliedToast(true);
      setTimeout(() => setGoalsAppliedToast(false), 3500);
    } catch (err) {
      console.error('Error applying AI goals:', err);
    } finally {
      setSavingGoals(false);
    }
  };

  const pastInsights = historyInsights.filter((item) => item.weekKey !== currentWeekKey);

  // SVG Ring progress math
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = Math.min(100, Math.max(12, Math.abs(overloadStats.globalPct) * 8 + 30));
  const ringDashOffset = ringCircumference - (ringProgress / 100) * ringCircumference;

  if (authLoading || (loadingData && !user)) {
    return (
      <div className="min-h-screen bg-[#0e0f07] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando análises do Coach IA...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0f07] text-[#f8fafc] pb-28 print:bg-white print:text-black print:pb-4">
      {/* Global 3-Element Top App Bar (Logo + Streak + Profile Avatar) */}
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[16px] print:max-w-full">
        {/* SCREEN HEADER & PERIOD FILTER PILLS */}
        <section className="space-y-[12px]">
          <div className="space-y-[2px]">
            <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[30px] print:text-black">
              INSIGHTS &amp; ANÁLISE DE IA
            </h1>
            <p className="text-[12px] leading-[16px] text-[#94a3b8] print:text-slate-600">
              Diagnóstico Semanal &amp; Otimização de Hipertrofia
            </p>
          </div>

          {/* Period Filter Pills */}
          <div className="-mx-4 px-4 flex items-center gap-[8px] overflow-x-auto pb-1 scrollbar-none print:hidden">
            {(
              [
                { id: '7d', label: 'Esta Semana' },
                { id: '30d', label: 'Último Mês' },
                { id: '90d', label: 'Geral (90d)' },
              ] as { id: PeriodKey; label: string }[]
            ).map((tab) => {
              const isActive = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriod(tab.id)}
                  className={`px-[16px] py-[7px] rounded-full text-[13px] leading-[18px] whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#f59e0b] text-[#0e0f07] font-bold shadow-sm'
                      : 'bg-black border border-white/10 text-[#f8fafc] font-medium hover:border-white/25'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <div className="w-2 shrink-0" />
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 1: HERO CARD — CLIPZ COACH IA
           ================================================================= */}
        <section
          className="relative overflow-hidden rounded-[14px] p-[16px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.3)] space-y-[14px] border border-white/[0.06] print:border-slate-300 print:shadow-none"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.02) 100%), linear-gradient(180deg, rgb(16,11,2) 0%, rgb(21,20,19) 50%, rgb(16,11,2) 100%)',
          }}
        >
          {/* Subtle Ambient Amber Glows */}
          <div
            aria-hidden
            className="absolute -top-[40px] -right-[40px] w-[144px] h-[144px] rounded-full bg-[rgba(255,185,95,0.12)] blur-[40px] pointer-events-none print:hidden"
          />
          <div
            aria-hidden
            className="absolute -bottom-[40px] -left-[40px] w-[128px] h-[128px] rounded-full bg-[rgba(255,185,95,0.1)] blur-[40px] pointer-events-none print:hidden"
          />

          {/* Top Row: Brand + Status Badge + Refresh Action */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-[8px]">
              <Sparkles className="w-[18px] h-[18px] text-[#ffb95f] shrink-0" />
              <h2 className="font-heading font-bold text-[#f8fafc] text-[16px] uppercase tracking-[0.2px] leading-[20px]">
                CLIPZ COACH IA
              </h2>
            </div>

            <div className="flex items-center gap-[6px]">
              <span className="bg-[rgba(255,185,95,0.15)] px-[10px] py-[3px] rounded-full flex items-center gap-[5px]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#ffb95f]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#f59e0b]">
                  {currentInsight ? 'ATUALIZADO HOJE' : 'PRONTO P/ GERAR'}
                </span>
              </span>

              <button
                type="button"
                onClick={handleGenerateAiInsight}
                disabled={generatingAi}
                className="w-[26px] h-[26px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#ffb95f] transition-colors disabled:opacity-50 print:hidden"
                title="Atualizar diagnóstico com IA"
              >
                <RefreshCw className={`w-[13px] h-[13px] ${generatingAi ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {aiError && (
            <div className="relative z-10 bg-[#ff6e61]/15 border border-[#ff6e61]/40 text-[#ff6e61] text-xs p-2.5 rounded-[10px]">
              {aiError}
            </div>
          )}

          {/* Main AI Summary Box */}
          {currentInsight ? (
            <>
              <div className="relative z-10 bg-white/[0.05] rounded-[10px] p-[12px]">
                <p className="text-[13px] leading-[21px] text-[#f8fafc]/95 font-medium">
                  {currentInsight.resumoGeral || currentInsight.destaqueSemanal}
                </p>
              </div>

              {/* 3 Diagnostic Insight Rows */}
              <div className="relative z-10 space-y-[8px]">
                {currentInsight.destaqueSemanal && (
                  <div className="bg-[#0e0f07]/70 rounded-[10px] p-[10px] flex items-start gap-[10px]">
                    <CheckCircle2 className="w-[16px] h-[16px] text-[#d3e156] shrink-0 mt-[2px]" />
                    <p className="text-[12px] leading-[17px] text-[#94a3b8]">
                      <strong className="text-[#f8fafc] font-semibold">Destaque: </strong>
                      {currentInsight.destaqueSemanal}
                    </p>
                  </div>
                )}

                {currentInsight.pontosAtencao && (
                  <div className="bg-[#0e0f07]/70 rounded-[10px] p-[10px] flex items-start gap-[10px]">
                    <AlertTriangle className="w-[16px] h-[16px] text-[#ffb95f] shrink-0 mt-[2px]" />
                    <p className="text-[12px] leading-[17px] text-[#94a3b8]">
                      <strong className="text-[#f8fafc] font-semibold">Atenção: </strong>
                      {currentInsight.pontosAtencao}
                    </p>
                  </div>
                )}

                {currentInsight.dicaTecnica && (
                  <div className="bg-[#0e0f07]/70 rounded-[10px] p-[10px] flex items-start gap-[10px]">
                    <Timer className="w-[16px] h-[16px] text-[#d3e156] shrink-0 mt-[2px]" />
                    <p className="text-[12px] leading-[17px] text-[#94a3b8]">
                      <strong className="text-[#f8fafc] font-semibold">Otimização: </strong>
                      {currentInsight.dicaTecnica}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="relative z-10 bg-white/[0.04] rounded-[12px] p-4 text-center space-y-3">
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Ainda não geramos o diagnóstico inteligente desta semana com base nos seus treinos e medidas.
              </p>
              <button
                type="button"
                onClick={handleGenerateAiInsight}
                disabled={generatingAi}
                className="bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-[#0e0f07] font-bold text-xs px-5 py-2.5 rounded-full inline-flex items-center gap-2 transition-colors"
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analisando seus dados...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerar Diagnóstico IA
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* =================================================================
            SEÇÃO 2: DISTRIBUIÇÃO DE VOLUME
           ================================================================= */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[14px] p-[16px] space-y-[14px] border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              DISTRIBUIÇÃO DE VOLUME
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#64748b]">
              SÉRIES EFETIVAS
            </span>
          </div>

          <div className="space-y-[12px]">
            {volumeStats.map((group) => (
              <div key={group.key} className="space-y-[6px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className="text-[12px] font-medium text-[#f8fafc] truncate">
                      {group.label}
                    </span>
                    {group.isLow && (
                      <span className="bg-[rgba(245,158,11,0.18)] text-[#ffb95f] text-[9px] font-bold uppercase tracking-[0.4px] px-[6px] py-[2px] rounded-[4px] shrink-0">
                        ABAIXO DA META
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-[3px] shrink-0">
                    <span
                      className={`font-heading font-bold text-[16px] leading-none ${
                        group.isLow ? 'text-[#ffb95f]' : 'text-[#d3e156]'
                      }`}
                    >
                      {group.done}
                    </span>
                    <span className="text-[11px] text-[#64748b] font-medium">
                      / {group.target}
                    </span>
                  </div>
                </div>

                <div className="h-[6px] w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      group.isLow ? 'bg-[#f59e0b]' : 'bg-[#d3e156]'
                    }`}
                    style={{ width: `${Math.max(group.pct, group.done > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="pt-[4px] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#94a3b8]">
            <div className="flex items-center gap-[6px]">
              <span className="w-[7px] h-[7px] rounded-full bg-[#d3e156]" />
              <span>Meta Atingida (&gt; 80%)</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <span className="w-[7px] h-[7px] rounded-full bg-[#f59e0b]" />
              <span>Atenção Necessária (&lt; 80%)</span>
            </div>
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 3: SOBRECARGA PROGRESSIVA (ESTIMATIVA 1RM)
           ================================================================= */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[14px] p-[16px] space-y-[12px] border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              SOBRECARGA PROGRESSIVA
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#94a3b8]">
              ESTIMATIVA 1RM
            </span>
          </div>

          {/* Inner White Summary Card with Ring */}
          <div className="bg-[#f8fafc] rounded-[12px] p-[14px] flex items-center gap-[14px] shadow-sm">
            <div className="relative w-[60px] h-[60px] shrink-0 flex items-center justify-center">
              <svg className="w-[60px] h-[60px] -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={ringRadius}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r={ringRadius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                />
              </svg>
              <TrendingUp className="w-[18px] h-[18px] text-[#f59e0b] absolute" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-[0.6px] text-[#151413]">
                EVOLUÇÃO DE TENSÃO
              </span>
              <div className="flex items-baseline gap-[6px] flex-wrap">
                <span className="font-heading font-bold text-[#f59e0b] text-[28px] leading-[32px]">
                  {overloadStats.globalPct >= 0 ? `+${overloadStats.globalPct}%` : `${overloadStats.globalPct}%`}
                </span>
                <span className="text-[12px] font-semibold text-[#151413]">
                  Progressão Global
                </span>
              </div>
              <span className="block text-[10px] text-[#64748b] pt-[1px]">
                Índice combinado de sobrecarga mecânica
              </span>
            </div>
          </div>

          {/* Progressed Exercises List */}
          {overloadStats.exercises.length > 0 ? (
            <div className="space-y-[8px]">
              {overloadStats.exercises.map((ex, i) => (
                <div
                  key={`${ex.name}_${i}`}
                  className="bg-black/75 rounded-[10px] px-[12px] py-[10px] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[#f8fafc] truncate">
                      {ex.name}
                    </span>
                    <span className="block text-[11px] font-mono text-[#64748b]">
                      {ex.prevKg.toFixed(1)}kg → {ex.currKg.toFixed(1)}kg
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-[3px] font-heading font-bold text-[16px] shrink-0 ${
                      ex.deltaPct >= 0 ? 'text-[#d3e156]' : 'text-[#ff6e61]'
                    }`}
                  >
                    <span>{ex.deltaPct >= 0 ? `+${ex.deltaPct}%` : `${ex.deltaPct}%`}</span>
                    <ArrowUp
                      className={`w-[13px] h-[13px] ${ex.deltaPct < 0 ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-black/50 rounded-[10px] p-3 text-center text-xs text-[#94a3b8]">
              Registre pelo menos 2 sessões do mesmo exercício para comparar sua progressão de 1RM.
            </div>
          )}

          {/* PR Highlight Banner */}
          <div className="bg-[#1c1c13] border border-[#d3e156]/20 rounded-[10px] px-[12px] py-[10px] flex items-center gap-[8px]">
            <Trophy className="w-[15px] h-[15px] text-[#d3e156] shrink-0" />
            <span className="text-[11px] font-medium text-[#f8fafc]/90">
              {overloadStats.latestPrText}
            </span>
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 4: CARD BRANCO — CONSISTÊNCIA & SESSÕES
           ================================================================= */}
        <section className="bg-[#f8fafc] rounded-[14px] p-[16px] space-y-[12px] shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-black text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              CONSISTÊNCIA &amp; SESSÕES
            </h3>
            <span className="text-[11px] font-bold text-[#f59e0b]">
              {consistencyStats.goalPct}% da Meta
            </span>
          </div>

          {/* 3 Black Stat Tiles */}
          <div className="grid grid-cols-3 gap-[8px]">
            <div className="bg-black rounded-[10px] p-[10px] flex flex-col items-center text-center gap-[2px]">
              <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-[#94a3b8]">
                FREQUÊNCIA
              </span>
              <span className="font-heading font-bold text-[#f8fafc] text-[22px] leading-[26px]">
                {consistencyStats.sessionsDone}/{consistencyStats.sessionsGoal}
              </span>
              <span className="text-[9px] font-semibold text-[#d3e156]">Treinos Feitos</span>
            </div>

            <div className="bg-black rounded-[10px] p-[10px] flex flex-col items-center text-center gap-[2px]">
              <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-[#94a3b8]">
                DURAÇÃO MÉDIA
              </span>
              <span className="font-heading font-bold text-[#f8fafc] text-[22px] leading-[26px]">
                {consistencyStats.avgDuration}
              </span>
              <span className="text-[9px] text-[#94a3b8]">Por sessão</span>
            </div>

            <div className="bg-black rounded-[10px] p-[10px] flex flex-col items-center text-center gap-[2px]">
              <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-[#94a3b8]">
                DENSIDADE
              </span>
              <span className="font-heading font-bold text-[#f8fafc] text-[22px] leading-[26px]">
                {consistencyStats.avgRest}
              </span>
              <span className="text-[9px] text-[#94a3b8]">Descanso médio</span>
            </div>
          </div>

          {/* Inner Black Weekly Active Days Bar */}
          <div className="bg-black rounded-[12px] p-[12px] space-y-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#cbd5e1]">
                Dias Ativos na Semana
              </span>
              <span className="text-[11px] font-bold text-[#d3e156]">
                {consistencyStats.sessionsDone}{' '}
                {consistencyStats.sessionsDone === 1 ? 'dia de treino' : 'dias de treino'}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-[6px]">
              {WEEK_DAYS.map((d) => {
                const trained = consistencyStats.activeJsDays.includes(d.jsDay);
                return (
                  <div key={d.label} className="flex flex-col items-center gap-[5px]">
                    <span className="text-[9px] font-bold text-[#94a3b8]">{d.label}</span>
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors ${
                        trained
                          ? 'bg-[#d3e156] text-[#0e0f07]'
                          : 'bg-white/[0.08] text-[#64748b]'
                      }`}
                    >
                      {trained ? (
                        <Check className="w-[14px] h-[14px] stroke-[3]" />
                      ) : (
                        <span className="text-[11px] font-bold">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 5: AÇÕES DO CICLO
           ================================================================= */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[14px] p-[16px] space-y-[10px] border border-white/[0.04] print:hidden">
          <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
            AÇÕES DO CICLO
          </h3>

          {/* Primary White Pill: AJUSTAR METAS COM IA */}
          <button
            type="button"
            onClick={handleOpenAiGoalsModal}
            className="w-full bg-[#f8fafc] hover:bg-white min-h-[48px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
          >
            <span className="font-heading font-semibold text-[#202017] text-[16px] tracking-[0.4px] uppercase leading-[22px]">
              AJUSTAR METAS COM IA
            </span>
            <span className="w-[32px] h-[32px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
              <ArrowRight className="w-[15px] h-[15px] text-[#202017] stroke-[2.5]" />
            </span>
          </button>

          {goalsAppliedToast && (
            <div className="bg-[#d3e156]/15 border border-[#d3e156]/40 text-[#d3e156] text-xs font-semibold px-3 py-2 rounded-[10px] flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Novas metas aplicadas ao seu próximo ciclo de 4 semanas!</span>
            </div>
          )}

          {/* Secondary Dark Outline Pill: EXPORTAR RELATÓRIO EM PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full bg-black hover:bg-[#1c1c13] border border-white/25 min-h-[48px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
          >
            <span className="font-heading font-semibold text-[#f8fafc] text-[16px] tracking-[0.4px] uppercase leading-[22px]">
              EXPORTAR RELATÓRIO EM PDF
            </span>
            <span className="w-[32px] h-[32px] rounded-full bg-[#06b6d4] flex items-center justify-center shrink-0">
              <FileDown className="w-[15px] h-[15px] text-[#0e0f07] stroke-[2.5]" />
            </span>
          </button>
        </section>

        {/* =================================================================
            SEÇÃO 6: HISTÓRICO DE ANÁLISES (Novo Padrão de Design)
           ================================================================= */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[14px] p-[16px] space-y-[12px] border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              HISTÓRICO DE ANÁLISES
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#ffb95f]">
              {pastInsights.length} {pastInsights.length === 1 ? 'SEMANA' : 'SEMANAS'}
            </span>
          </div>

          {pastInsights.length === 0 ? (
            <div className="bg-black/60 border border-dashed border-white/10 rounded-[12px] p-5 text-center space-y-1.5">
              <Calendar className="w-6 h-6 text-[#64748b] mx-auto" />
              <p className="text-xs font-semibold text-[#cbd5e1]">
                Nenhuma análise arquivada ainda.
              </p>
              <p className="text-[11px] text-[#64748b] max-w-[260px] mx-auto">
                A cada semana analisada pelo Coach IA, o relatório ficará salvo aqui cronologicamente.
              </p>
            </div>
          ) : (
            <div className="space-y-[8px]">
              {pastInsights.map((item) => {
                const itemKey = item.id || item.weekKey || '';
                const isExpanded = expandedWeekKey === itemKey;

                return (
                  <div
                    key={itemKey}
                    className="bg-black/80 rounded-[12px] overflow-hidden border border-white/[0.06] transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedWeekKey(isExpanded ? null : itemKey)}
                      className="w-full p-[12px] flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0 space-y-[3px] pr-2">
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[12px] font-bold text-[#f8fafc] font-mono">
                            {formatDateShort(item.dataGeracao)}
                          </span>
                          <span className="text-[10px] text-[#64748b]">•</span>
                          <span className="text-[11px] font-semibold text-[#ffb95f]">
                            {item.weekKey?.replace('W', 'Sem. ')}
                          </span>
                          {item.pesoInfo?.pesoAtual && (
                            <span className="bg-white/10 text-[#cbd5e1] text-[10px] font-mono font-semibold px-[6px] py-[1px] rounded">
                              {item.pesoInfo.pesoAtual}kg
                            </span>
                          )}
                        </div>
                        {item.destaqueSemanal && (
                          <p className="text-[11px] text-[#94a3b8] truncate">
                            {item.destaqueSemanal}
                          </p>
                        )}
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#ffb95f] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#64748b] shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-[12px] pb-[12px] pt-[8px] border-t border-white/10 space-y-[8px] text-[12px] animate-in fade-in duration-150">
                        {item.resumoGeral && (
                          <div className="bg-white/[0.04] rounded-[8px] p-[10px] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#d3e156] block">
                              Visão Geral
                            </span>
                            <p className="text-[#e2e8f0] leading-[18px]">{item.resumoGeral}</p>
                          </div>
                        )}

                        {item.analiseMedidasEPeso && (
                          <div className="bg-white/[0.03] rounded-[8px] p-[10px] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#ffb95f] flex items-center gap-1">
                              <Scale className="w-3 h-3" /> Composição &amp; Medidas
                            </span>
                            <p className="text-[#cbd5e1] leading-[18px]">
                              {item.analiseMedidasEPeso}
                            </p>
                          </div>
                        )}

                        {item.analiseAssimetrias && (
                          <div className="bg-white/[0.03] rounded-[8px] p-[10px] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#ffb95f] flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Assimetrias
                            </span>
                            <p className="text-[#cbd5e1] leading-[18px]">
                              {item.analiseAssimetrias}
                            </p>
                          </div>
                        )}

                        {item.dicaTecnica && (
                          <div className="bg-white/[0.03] rounded-[8px] p-[10px] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#d3e156] flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> Dica Recomendada
                            </span>
                            <p className="text-[#cbd5e1] leading-[18px]">{item.dicaTecnica}</p>
                          </div>
                        )}

                        {item.mensagemMotivacional && (
                          <div className="pt-1 flex items-start gap-1.5 text-[11px] italic text-[#94a3b8]">
                            <Flame className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" />
                            <span>&ldquo;{item.mensagemMotivacional}&rdquo;</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          MODAL BOTTOM-SHEET: AJUSTAR METAS COM IA (Stitch 246b222e100f4d668e4bc44f83788880)
         ===================================================================== */}
      {isAiGoalsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200 print:hidden"
          onClick={() => setIsAiGoalsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[448px] bg-[#0e0f07] border-t sm:border border-white/10 rounded-t-[24px] sm:rounded-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[12px] bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center text-[#ffb95f] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[0.2px] uppercase leading-[22px]">
                    AJUSTAR METAS COM IA
                  </h2>
                  <p className="text-[11px] text-[#94a3b8] leading-tight mt-0.5">
                    Otimização Preditiva para o Próximo Ciclo (4 Semanas)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAiGoalsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4 scrollbar-none flex-1">
              {/* Success Rate Callout */}
              <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[#d3e156]/10 border border-[#d3e156]/25">
                <Brain className="w-5 h-5 text-[#d3e156] shrink-0" />
                <p className="text-[12px] text-[#f8fafc] leading-snug">
                  <strong className="text-[#d3e156] font-semibold">
                    Taxa de Sucesso Estimada: {estimatedSuccessRate}%
                  </strong>{' '}
                  baseada na sua consistência de {consistencyStats.sessionsDone}/
                  {consistencyStats.sessionsGoal} treinos semanais no ciclo atual.
                </p>
              </div>

              {/* FOCO ESTRATÉGICO DO CICLO */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.8px] block">
                  FOCO ESTRATÉGICO DO CICLO
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'hipertrofia' as const,
                      recommended: true,
                      title: 'Hipertrofia & Volume',
                      desc: 'Volume adaptativo e foco em pontos fracos',
                    },
                    {
                      id: 'forca' as const,
                      recommended: false,
                      title: 'Força Máxima (1RM)',
                      desc: 'Sobrecarga de 85%+ em compostos',
                    },
                    {
                      id: 'recomposicao' as const,
                      recommended: false,
                      title: 'Recomposição',
                      desc: 'Déficit calórico com densidade alta',
                    },
                  ].map((opt) => {
                    const selected = cycleFocus === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCycleFocus(opt.id)}
                        className={`text-left flex flex-col p-2.5 rounded-[12px] transition-all ${
                          selected
                            ? 'bg-[#f59e0b]/12 border-2 border-[#f59e0b] shadow-[0_0_16px_rgba(245,158,11,0.2)]'
                            : 'bg-[#151413] border border-white/10 opacity-75 hover:opacity-100'
                        }`}
                      >
                        {opt.recommended ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-[#f59e0b] text-[#0e0f07] font-bold text-[8px] uppercase tracking-wider mb-1 w-max">
                            Recomendado
                          </span>
                        ) : (
                          <span className="h-[18px] block" />
                        )}
                        <span className="font-heading font-semibold text-[13px] leading-tight text-[#f8fafc]">
                          {opt.title}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] mt-1 leading-snug">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AJUSTES RECOMENDADOS PELA IA */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.8px]">
                    AJUSTES RECOMENDADOS PELA IA
                  </span>
                  <span className="text-[10px] font-semibold text-[#d3e156]">
                    4 Ações Preditivas
                  </span>
                </div>

                {/* Action 1: Deficit Muscle Volume Stepper */}
                <div className="p-3.5 rounded-[12px] bg-[#151413] border border-white/[0.06] space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#f8fafc]">
                          {weakestGroup.label} (+
                          {Math.max(1, deficitTargetSets - weakestGroup.done)} séries)
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#ffb95f] text-[9px] font-bold uppercase tracking-wider">
                          Alvo Ótimo
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">
                        Correção de déficit detectado (de {weakestGroup.done} para{' '}
                        {deficitTargetSets} séries semanais).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black px-2 py-1 rounded-[8px] border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeficitTargetSets((v) => Math.max(4, v - 1))}
                        className="w-6 h-6 rounded bg-[#151413] hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-heading font-semibold text-[13px] text-[#d3e156] min-w-[42px] text-center">
                        {deficitTargetSets}/sem
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeficitTargetSets((v) => Math.min(24, v + 1))}
                        className="w-6 h-6 rounded bg-[#151413] hover:bg-white/10 flex items-center justify-center text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-black/70 text-[11px] text-[#94a3b8]">
                    <ListChecks className="w-3.5 h-3.5 text-[#d3e156] shrink-0" />
                    <span>
                      Ação automática: Priorizar {weakestGroup.label} no próximo ciclo de treino
                    </span>
                  </div>
                </div>

                {/* Action 2: Sobrecarga Progressiva Toggle */}
                <div className="p-3.5 rounded-[12px] bg-[#151413] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[13px] font-bold text-[#f8fafc]">
                        Sobrecarga Progressiva (+7.5%)
                      </span>
                      <span className="block text-[11px] text-[#94a3b8]">
                        Meta de tensão global acelerada para 1RM
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableOverloadBoost}
                      onClick={() => setEnableOverloadBoost(!enableOverloadBoost)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        enableOverloadBoost ? 'bg-[#d3e156]' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          enableOverloadBoost ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="px-2.5 py-2 rounded-[8px] bg-black/70 flex items-center justify-between text-[11px]">
                    <span className="text-[#94a3b8]">
                      Projeção {topProjectedExercise.name}:
                    </span>
                    <span className="text-[#d3e156] font-bold font-mono">
                      {topProjectedExercise.currKg.toFixed(1)}kg →{' '}
                      {topProjectedExercise.targetKg.toFixed(1)}kg (+
                      {topProjectedExercise.deltaKg.toFixed(1)}kg)
                    </span>
                  </div>
                </div>

                {/* Action 3: Densidade & Descanso Toggle */}
                <div className="p-3.5 rounded-[12px] bg-[#151413] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[13px] font-bold text-[#f8fafc]">
                        Densidade &amp; Descanso
                      </span>
                      <span className="block text-[11px] text-[#94a3b8]">
                        Fixar 90s (Hipertrofia sob alta carga)
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableRestTimer90s}
                      onClick={() => setEnableRestTimer90s(!enableRestTimer90s)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                        enableRestTimer90s ? 'bg-[#d3e156]' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          enableRestTimer90s ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#64748b] leading-tight">
                    Dispara cronômetro automático de 90s ao concluir cada série no app.
                  </p>
                </div>

                {/* Action 4: Metas Antropométricas (30 dias) */}
                <div className="p-3.5 rounded-[12px] bg-[#151413] border border-white/[0.06] space-y-2">
                  <span className="block text-[13px] font-bold text-[#f8fafc]">
                    Metas Antropométricas (30 dias)
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-[8px] bg-black/70">
                      <span className="block text-[9px] font-bold uppercase text-[#64748b]">
                        Peso Alvo
                      </span>
                      <div className="font-heading font-bold text-[15px] text-[#f8fafc] mt-0.5">
                        {anthroTargets.targetWeight} kg
                      </div>
                      <span className="text-[10px] font-semibold text-[#d3e156]">
                        {anthroTargets.weightDeltaText}
                      </span>
                    </div>

                    <div className="p-2 rounded-[8px] bg-black/70">
                      <span className="block text-[9px] font-bold uppercase text-[#64748b]">
                        Gordura (BF)
                      </span>
                      <div className="font-heading font-bold text-[15px] text-[#f8fafc] mt-0.5">
                        {anthroTargets.targetBf}%
                      </div>
                      <span className="text-[10px] font-semibold text-[#d3e156]">
                        {anthroTargets.bfDeltaText}
                      </span>
                    </div>

                    <div className="p-2 rounded-[8px] bg-black/70">
                      <span className="block text-[9px] font-bold uppercase text-[#64748b]">
                        Cintura
                      </span>
                      <div className="font-heading font-bold text-[15px] text-[#f8fafc] mt-0.5">
                        {anthroTargets.targetWaist} cm
                      </div>
                      <span className="text-[10px] font-semibold text-[#ffb95f]">
                        {anthroTargets.waistDeltaText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-[#151413] flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAiGoalsModalOpen(false)}
                className="px-4 py-3 rounded-[12px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#94a3b8] hover:text-white text-[13px] font-semibold transition-colors shrink-0"
              >
                Descartar
              </button>

              <button
                type="button"
                disabled={savingGoals}
                onClick={handleApplyAiGoals}
                className="flex-1 py-3 px-4 rounded-[12px] bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-60 text-[#0e0f07] font-heading font-bold text-[15px] uppercase tracking-[0.4px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.98]"
              >
                {savingGoals ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>{savingGoals ? 'APLICANDO...' : 'APLICAR NOVAS METAS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="print:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}

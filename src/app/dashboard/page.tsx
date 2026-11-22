'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePalette } from '@/context/PaletteContext';
import BottomNavigation from '@/components/BottomNavigation';
import WeeklyInsightsCard from '@/components/WeeklyInsightsCard';
import WeeklyVolumeBars from '@/components/WeeklyVolumeBars';
import AppHeader from '@/components/AppHeader';
import DashboardStrengthScoreCard, { MuscleReadinessStat } from '@/components/DashboardStrengthScoreCard';
import { MUSCLE_GROUPS, PREDEFINED_EXERCISES, getExerciseGuide } from '@/data/exercises';
import { fetchAndEnsureSavedWorkouts } from '@/data/defaultWorkouts';
import {
  Dumbbell,
  Play,
  Flame,
  ChevronRight,
  Clock,
  Trophy,
  Scale,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface UserProfile {
  nome: string;
  email: string;
  idade?: number;
  altura?: number;
  pesoInicial?: number;
  weeklySetGoals?: {
    peito?: number;
    costas?: number;
    bracos?: number;
    pernas?: number;
    ombros?: number;
  };
}

interface Measurement {
  id: string;
  pesoKg: number;
  imcCalculado: number;
  data: any;
}

interface StrengthLog {
  id: string;
  exerciseId: string;
  muscleGroup: string;
  cargaKg?: number;
  reps?: number;
  oneRmCalculado: number;
  totalSetsCompleted?: number;
  allSets?: Array<any>;
  data: any;
}

interface SavedWorkoutItem {
  id: string;
  userId: string;
  title: string;
  defaultKey?: string;
  muscleGroups: string[];
  exercises: Array<{
    exerciseId: string;
    nomeExercicio: string;
    muscleGroup: string;
    sets: Array<{ setNumber: number; cargaKg: number | ''; reps: number | '' }>;
  }>;
  createdAt?: any;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { isContrast } = usePalette();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestMeasure, setLatestMeasure] = useState<Measurement | null>(null);
  const [previousMonthMeasure, setPreviousMonthMeasure] = useState<Measurement | null>(null);
  const [strengthLogs, setStrengthLogs] = useState<StrengthLog[]>([]);
  const [customExerciseNames, setCustomExerciseNames] = useState<Record<string, string>>({});
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkoutItem[]>([]);
  const [selectedWorkoutIdx, setSelectedWorkoutIdx] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Active Workout Banner State (from localStorage)
  const [activeWorkoutBanner, setActiveWorkoutBanner] = useState<{
    title: string;
    exerciseCount: number;
    elapsedSeconds: number;
  } | null>(null);

  // Check if there is an active in-progress workout in localStorage
  useEffect(() => {
    if (!user) return;
    const storageKey = `clipzbody_active_workout_${user.uid}`;

    const checkActiveWorkout = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          setActiveWorkoutBanner(null);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.isCompleted || parsed.isFinished)) {
          localStorage.removeItem(storageKey);
          setActiveWorkoutBanner(null);
          return;
        }
        if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
          const now = Date.now();
          const lastSaved = parsed.lastSavedAt || parsed.lastResumeTime || now;
          if (Math.floor((now - lastSaved) / 1000) >= 64800) {
            localStorage.removeItem(storageKey);
            setActiveWorkoutBanner(null);
            return;
          }

          const acc =
            typeof parsed.accumulatedSeconds === 'number'
              ? parsed.accumulatedSeconds
              : parsed.elapsedSeconds || 0;
          const liveSecs =
            parsed.isWorkoutStarted && !parsed.isTimerPaused && parsed.lastResumeTime
              ? acc + Math.max(0, Math.floor((now - parsed.lastResumeTime) / 1000))
              : acc;

          setActiveWorkoutBanner({
            title: parsed.title || 'Treino em Andamento',
            exerciseCount: parsed.exercises.length,
            elapsedSeconds: liveSecs
          });
        } else {
          setActiveWorkoutBanner(null);
        }
      } catch {
        setActiveWorkoutBanner(null);
      }
    };

    checkActiveWorkout();
    window.addEventListener('focus', checkActiveWorkout);
    return () => window.removeEventListener('focus', checkActiveWorkout);
  }, [user]);

  // 1. Protect route if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // 2. Fetch User Profile, Measurements, Strength Logs, and Saved Workouts (including A, B, C)
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      setLoadingData(true);

      try {
        // Preview Mode (for branch UI inspection without Firebase Auth domain restrictions)
        if (user.uid === 'preview_user_uid') {
          const now = Date.now();
          const dayMs = 24 * 3600 * 1000;
          setProfile({
            nome: 'Lucas Valini',
            email: 'preview@clipzbody.app',
            idade: 28,
            altura: 178,
            pesoInicial: 79.2
          });
          setLatestMeasure({
            id: 'prev_m1',
            pesoKg: 78.4,
            imcCalculado: 24.7,
            data: new Date(now - 3 * dayMs)
          });
          setPreviousMonthMeasure({
            id: 'prev_m0',
            pesoKg: 79.2,
            imcCalculado: 25.0,
            data: new Date(now - 30 * dayMs)
          });
          setStrengthLogs([
            {
              id: 'p1',
              exerciseId: 'pre_supino_reto_barra',
              muscleGroup: 'Peito',
              cargaKg: 80,
              reps: 8,
              oneRmCalculado: 98.4,
              totalSetsCompleted: 4,
              data: new Date(now - 14 * dayMs)
            },
            {
              id: 'p2',
              exerciseId: 'pre_supino_reto_barra',
              muscleGroup: 'Peito',
              cargaKg: 84,
              reps: 8,
              oneRmCalculado: 102.5,
              totalSetsCompleted: 5,
              data: new Date(now - 1.8 * dayMs) // ~90% (85%-99% -> Green on body map)
            },
            {
              id: 'p3',
              exerciseId: 'pre_supino_inclinado_halteres',
              muscleGroup: 'Peito',
              cargaKg: 32,
              reps: 10,
              oneRmCalculado: 42.6,
              totalSetsCompleted: 5,
              data: new Date(now - 1.8 * dayMs)
            },
            {
              id: 'p4',
              exerciseId: 'pre_peck_deck',
              muscleGroup: 'Peito',
              cargaKg: 65,
              reps: 12,
              oneRmCalculado: 91.0,
              totalSetsCompleted: 4,
              data: new Date(now - 1.8 * dayMs)
            },
            {
              id: 'p5',
              exerciseId: 'pre_overhead_press',
              muscleGroup: 'Ombro',
              cargaKg: 50,
              reps: 8,
              oneRmCalculado: 63.3,
              totalSetsCompleted: 4,
              data: new Date(now - 1.8 * dayMs) // ~90% (85%-99% -> Green on body map)
            },
            {
              id: 'p6',
              exerciseId: 'pre_lateral_raise',
              muscleGroup: 'Ombro',
              cargaKg: 14,
              reps: 12,
              oneRmCalculado: 19.6,
              totalSetsCompleted: 4,
              data: new Date(now - 1.8 * dayMs)
            },
            {
              id: 'p7',
              exerciseId: 'pre_triceps_pulley_corda',
              muscleGroup: 'Tríceps',
              cargaKg: 35,
              reps: 10,
              oneRmCalculado: 46.6,
              totalSetsCompleted: 6,
              data: new Date(now - 1.8 * dayMs) // ~90% (85%-99% -> Green on body map)
            },
            {
              id: 'p8',
              exerciseId: 'pre_agachamento_livre',
              muscleGroup: 'Quadríceps',
              cargaKg: 105,
              reps: 8,
              oneRmCalculado: 133.0,
              totalSetsCompleted: 4,
              data: new Date(now - 15 * dayMs)
            },
            {
              id: 'p9',
              exerciseId: 'pre_agachamento_livre',
              muscleGroup: 'Quadríceps',
              cargaKg: 112,
              reps: 8,
              oneRmCalculado: 140.0,
              totalSetsCompleted: 3,
              data: new Date(now - 4 * dayMs)
            },
            {
              id: 'p10',
              exerciseId: 'pre_leg_press_45',
              muscleGroup: 'Quadríceps',
              cargaKg: 240,
              reps: 10,
              oneRmCalculado: 320.0,
              totalSetsCompleted: 3,
              data: new Date(now - 4 * dayMs)
            },
            {
              id: 'p11',
              exerciseId: 'pre_puxada_pulley_pronada',
              muscleGroup: 'Costas',
              cargaKg: 70,
              reps: 10,
              oneRmCalculado: 91.5,
              totalSetsCompleted: 4,
              data: new Date(now - 16 * dayMs)
            },
            {
              id: 'p12',
              exerciseId: 'pre_puxada_pulley_pronada',
              muscleGroup: 'Costas',
              cargaKg: 72,
              reps: 10,
              oneRmCalculado: 94.0,
              totalSetsCompleted: 8,
              data: new Date(now - 0.8 * dayMs) // Recovering (<48h) -> Amber highlight!
            },
            {
              id: 'p13',
              exerciseId: 'pre_remada_curvada',
              muscleGroup: 'Costas',
              cargaKg: 75,
              reps: 8,
              oneRmCalculado: 95.0,
              totalSetsCompleted: 8,
              data: new Date(now - 0.8 * dayMs)
            },
            {
              id: 'p14',
              exerciseId: 'pre_rosca_direta_barra_w',
              muscleGroup: 'Bíceps',
              cargaKg: 38,
              reps: 10,
              oneRmCalculado: 50.6,
              totalSetsCompleted: 6,
              data: new Date(now - 0.8 * dayMs) // Recovering (<48h) -> Amber highlight!
            },
            {
              id: 'p15',
              exerciseId: 'pre_stiff',
              muscleGroup: 'Posterior de Coxa',
              cargaKg: 90,
              reps: 10,
              oneRmCalculado: 120.0,
              totalSetsCompleted: 3,
              data: new Date(now - 0.8 * dayMs) // Recovering (<48h) -> Amber highlight!
            }
          ]);
          const workoutsList = await fetchAndEnsureSavedWorkouts(user.uid);
          setSavedWorkouts(workoutsList);
          setLoadingData(false);
          return;
        }

        // 2a. User Profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserProfile;
          if (!userData.idade || !userData.altura) {
            router.replace('/onboarding');
            return;
          }
          setProfile(userData);
        } else {
          router.replace('/onboarding');
          return;
        }

        // 2b. Measurements (sorted newest first)
        const measuresQuery = query(collection(db, 'measures'), where('userId', '==', user.uid));
        const measuresSnap = await getDocs(measuresQuery);

        if (!measuresSnap.empty) {
          const measuresList = measuresSnap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          })) as Measurement[];

          measuresList.sort((a, b) => {
            const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
            const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
            return timeB - timeA;
          });

          setLatestMeasure(measuresList[0]);
          if (measuresList.length > 1) {
            setPreviousMonthMeasure(measuresList[1]);
          }
        }

        // 2c. Custom exercises for name resolution
        const exQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
        const exSnap = await getDocs(exQuery);
        const exNameMap: Record<string, string> = {};
        exSnap.forEach((d) => {
          const data = d.data();
          if (data.nomeExercicio) {
            exNameMap[d.id] = data.nomeExercicio;
          }
        });
        setCustomExerciseNames(exNameMap);

        // 2d. Strength Logs
        const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
        const logsSnap = await getDocs(logsQuery);

        if (!logsSnap.empty) {
          const rawLogs = logsSnap.docs.map((d) => {
            const data = d.data();
            let mg = data.muscleGroup;
            if (
              data.exerciseId === 'pre_mesa_flexora' ||
              data.exerciseId?.toLowerCase().includes('flexora')
            ) {
              mg = 'Posterior de Coxa';
            }
            return {
              id: d.id,
              ...data,
              muscleGroup: mg
            };
          }) as StrengthLog[];

          setStrengthLogs(rawLogs);
        }

        // 2e. Saved Workouts (ensuring Treino A, B, C exist)
        const workoutsList = await fetchAndEnsureSavedWorkouts(user.uid);
        setSavedWorkouts(workoutsList);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, router]);

  // --- COMPUTED METRICS (Score Geral de Força, RP Score pts, Mapa Corporal, PRs Recentes) ---
  const {
    rpScorePts,
    totalEvolutionPct,
    muscleReadinessMap,
    recentPrCards,
    latestByExerciseMap
  } = useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    const fourteenDaysMs = 14 * 24 * 3600 * 1000;

    // Group logs by exerciseId sorted chronologically (oldest -> newest)
    const logsByExercise: Record<string, StrengthLog[]> = {};
    strengthLogs.forEach((log) => {
      if (!logsByExercise[log.exerciseId]) {
        logsByExercise[log.exerciseId] = [];
      }
      logsByExercise[log.exerciseId].push(log);
    });

    Object.values(logsByExercise).forEach((arr) => {
      arr.sort((a, b) => {
        const tA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const tB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return tA - tB;
      });
    });

    // Latest load by exerciseId (for estimating workout volume in Hero Card)
    const latestExMap: Record<string, { cargaKg: number; reps: number; oneRm: number }> = {};

    // Calculate RP Score (sum of peak 1RMs across exercises) & per-exercise evolution
    let totalPeak1RM = 0;
    const prList: Array<{
      exerciseId: string;
      exerciseName: string;
      muscleGroup: string;
      best1RM: number;
      deltaKg: number;
      lastTimestamp: number;
    }> = [];

    const exercisesEvoByMuscle: Record<string, number[]> = {};
    MUSCLE_GROUPS.forEach((m) => {
      exercisesEvoByMuscle[m] = [];
    });

    Object.entries(logsByExercise).forEach(([exId, exLogs]) => {
      if (exLogs.length === 0) return;
      const firstLog = exLogs[0];
      const latestLog = exLogs[exLogs.length - 1];
      const best1RM = Math.max(...exLogs.map((l) => l.oneRmCalculado || 0));
      totalPeak1RM += best1RM;

      latestExMap[exId] = {
        cargaKg: latestLog.cargaKg || 20,
        reps: latestLog.reps || 10,
        oneRm: latestLog.oneRmCalculado || 0
      };

      // Exercise evolution %
      let evoPct = 0;
      let delta1RmKg = 0;
      if (exLogs.length >= 2 && firstLog.oneRmCalculado > 0) {
        evoPct = ((latestLog.oneRmCalculado - firstLog.oneRmCalculado) / firstLog.oneRmCalculado) * 100;
        const prevLog = exLogs[exLogs.length - 2];
        delta1RmKg = (latestLog.oneRmCalculado || 0) - (prevLog.oneRmCalculado || 0);
      }

      const mg = latestLog.muscleGroup || 'Peito';
      if (!exercisesEvoByMuscle[mg]) {
        exercisesEvoByMuscle[mg] = [];
      }
      if (exLogs.length >= 2) {
        exercisesEvoByMuscle[mg].push(evoPct);
      }

      // Resolve exercise display name
      const predefined = PREDEFINED_EXERCISES.find((p) => p.id === exId);
      const guide = getExerciseGuide({ id: exId });
      const resolvedName =
        predefined?.nome || customExerciseNames[exId] || guide.nome || 'Exercício';

      const lastTime = latestLog.data?.seconds
        ? latestLog.data.seconds * 1000
        : new Date(latestLog.data).getTime();

      prList.push({
        exerciseId: exId,
        exerciseName: resolvedName,
        muscleGroup: mg,
        best1RM,
        deltaKg: delta1RmKg,
        lastTimestamp: isNaN(lastTime) ? 0 : lastTime
      });
    });

    // Build per-muscle readiness & evolution stats
    const readinessMap: Record<string, MuscleReadinessStat> = {};
    let sumMuscleEvo = 0;
    let musclesWithEvo = 0;

    MUSCLE_GROUPS.forEach((muscle) => {
      const mLogs = strengthLogs.filter((l) => l.muscleGroup === muscle);
      const evos = exercisesEvoByMuscle[muscle] || [];
      const avgEvo =
        evos.length > 0 ? evos.reduce((acc, c) => acc + c, 0) / evos.length : 0;

      if (evos.length > 0) {
        sumMuscleEvo += avgEvo;
        musclesWithEvo++;
      }

      let latestTimeMs: number | null = null;
      let weeklySets = 0;
      let bestMuscle1RM = 0;

      mLogs.forEach((l) => {
        const t = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
        if (!isNaN(t)) {
          if (latestTimeMs === null || t > latestTimeMs) {
            latestTimeMs = t;
          }
          if (nowMs - t <= sevenDaysMs) {
            const sCount =
              typeof l.totalSetsCompleted === 'number' && l.totalSetsCompleted > 0
                ? l.totalSetsCompleted
                : 3;
            weeklySets += sCount;
          }
        }
        if ((l.oneRmCalculado || 0) > bestMuscle1RM) {
          bestMuscle1RM = l.oneRmCalculado;
        }
      });

      const hoursSinceLast =
        latestTimeMs !== null ? Math.max(0, (nowMs - latestTimeMs) / (1000 * 3600)) : null;

      const recoveryPct =
        hoursSinceLast !== null
          ? Math.min(100, Math.max(0, Math.round((hoursSinceLast / 48) * 100)))
          : 100;

      let status: 'ready' | 'recovering' | 'inactive' = 'inactive';
      if (hoursSinceLast !== null) {
        if (recoveryPct < 85) {
          status = 'recovering';
        } else {
          status = 'ready';
        }
      }

      readinessMap[muscle] = {
        muscleGroup: muscle,
        evolutionPct: Number(avgEvo.toFixed(1)),
        hoursSinceLast,
        recoveryPct,
        weeklySets,
        best1RM: bestMuscle1RM,
        status
      };
    });

    const overallEvo = musclesWithEvo > 0 ? Number((sumMuscleEvo / musclesWithEvo).toFixed(1)) : 0;

    // Sort PR cards: most recent workouts first, prioritizing positive PR gains
    prList.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    return {
      rpScorePts: Math.round(totalPeak1RM),
      totalEvolutionPct: overallEvo,
      muscleReadinessMap: readinessMap,
      recentPrCards: prList.slice(0, 8),
      latestByExerciseMap: latestExMap
    };
  }, [strengthLogs, customExerciseNames]);

  // --- GREETING HELPER ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // --- HERO CARD SELECTED WORKOUT METADATA ---
  const selectedWorkout = savedWorkouts[selectedWorkoutIdx] || null;

  const heroWorkoutMeta = useMemo(() => {
    if (!selectedWorkout) {
      return {
        displayTitle: 'Treino A • Peito/Tríceps/Ombro',
        subtitle: 'Peito/Tríceps/Ombro',
        exerciseCount: 7,
        estimatedMinutes: 55,
        estimatedVolumeKg: 4200,
        lastDoneLabel: 'Pronto p/ iniciar',
        lastDaysText: 'Há 3 dias',
        lastPrText: '(+2.5% PR)'
      };
    }

    const exCount = selectedWorkout.exercises.length;
    const estMinutes = Math.max(30, exCount * 8);

    // Estimate total load based on user's past logs or default 30kg x 10 reps x 3 sets
    let estVol = 0;
    selectedWorkout.exercises.forEach((ex) => {
      const past = latestByExerciseMap[ex.exerciseId];
      const setsCount = Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets.length : 3;
      const load = past?.cargaKg || 25;
      const reps = past?.reps || 10;
      estVol += load * reps * setsCount;
    });

    // Find last log date for the primary muscle group of this workout
    const primaryMg = selectedWorkout.muscleGroups[0];
    const stat = primaryMg ? muscleReadinessMap[primaryMg] : null;
    let lastDoneLabel = 'Pronto p/ iniciar';
    if (stat && stat.hoursSinceLast !== null) {
      const days = Math.floor(stat.hoursSinceLast / 24);
      const dayStr = days === 0 ? 'Hoje' : days === 1 ? 'Há 1 dia' : `Há ${days} dias`;
      const evoStr =
        stat.evolutionPct !== 0
          ? ` (${stat.evolutionPct > 0 ? '+' : ''}${stat.evolutionPct.toFixed(1)}% PR)`
          : '';
      lastDoneLabel = `${dayStr}${evoStr}`;
    }

    // Format title & subtitle cleanly
    const parts = selectedWorkout.title.split('•');
    const mainTitle = parts[0]?.trim() || selectedWorkout.title;
    const sub =
      parts[1]?.trim() ||
      (selectedWorkout.muscleGroups.length > 0
        ? selectedWorkout.muscleGroups.join('/')
        : 'Ficha personalizada');

    const fullHeroHeading = selectedWorkout.defaultKey
      ? `Treino ${selectedWorkout.defaultKey} • ${selectedWorkout.muscleGroups.join('/')}`
      : `${mainTitle} • ${sub}`;

    let lastDaysText = 'Pronto p/ iniciar';
    let lastPrText = '';
    if (stat && stat.hoursSinceLast !== null) {
      const days = Math.floor(stat.hoursSinceLast / 24);
      lastDaysText = days === 0 ? 'Hoje' : days === 1 ? 'Há 1 dia' : `Há ${days} dias`;
      if (stat.evolutionPct !== 0) {
        lastPrText = `(${stat.evolutionPct > 0 ? '+' : ''}${stat.evolutionPct.toFixed(1)}% PR)`;
      }
    }

    return {
      displayTitle: fullHeroHeading,
      subtitle: sub,
      exerciseCount: exCount,
      estimatedMinutes: estMinutes,
      estimatedVolumeKg: estVol,
      lastDoneLabel,
      lastDaysText,
      lastPrText
    };
  }, [selectedWorkout, latestByExerciseMap, muscleReadinessMap]);

  const handleCycleWorkout = () => {
    if (savedWorkouts.length <= 1) return;
    setSelectedWorkoutIdx((prev) => (prev + 1) % savedWorkouts.length);
  };

  // --- PHYSICAL SUMMARY HELPERS ---
  const imcValue = latestMeasure?.imcCalculado || 0;
  const pesoValue = latestMeasure?.pesoKg || profile?.pesoInicial || 0;
  const pesoDelta =
    latestMeasure && previousMonthMeasure
      ? Number((latestMeasure.pesoKg - previousMonthMeasure.pesoKg).toFixed(1))
      : null;

  const daysSinceMeasure = useMemo(() => {
    if (!latestMeasure?.data) return null;
    const t = latestMeasure.data?.seconds
      ? latestMeasure.data.seconds * 1000
      : new Date(latestMeasure.data).getTime();
    if (isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / (1000 * 3600 * 24)));
  }, [latestMeasure]);

  const getImcStatus = (imc: number) => {
    if (!imc || imc <= 0) {
      return {
        label: 'Sem Registro',
        badgeBg: 'bg-[rgba(255,255,255,0.08)]',
        dotColor: 'bg-[#64748b]',
        textColor: 'text-[#94a3b8]',
        activeSegment: 0
      };
    }
    if (imc < 18.5) {
      return {
        label: 'Abaixo do Ideal',
        badgeBg: 'bg-[rgba(30,145,177,0.15)]',
        dotColor: 'bg-[#1e91b1]',
        textColor: 'text-[#1e91b1]',
        activeSegment: 1
      };
    }
    if (imc < 25) {
      return {
        label: 'Faixa Ideal',
        badgeBg: 'bg-[rgba(211,225,86,0.1)]',
        dotColor: 'bg-[#d3e156]',
        textColor: 'text-[#d3e156]',
        activeSegment: 2
      };
    }
    return {
      label: 'Acima do Ideal',
      badgeBg: 'bg-[rgba(245,158,11,0.15)]',
      dotColor: 'bg-[#f59e0b]',
      textColor: 'text-[#f59e0b]',
      activeSegment: 3
    };
  };

  const imcStatus = getImcStatus(imcValue);
  const alturaMetros = profile?.altura ? (profile.altura / 100).toFixed(2) : '--';
  const firstName = profile?.nome?.split(' ')[0] || 'Atleta';

  if (authLoading || loadingData) {
    return (
      <div
        className={`min-h-screen ${
          isContrast ? 'bg-[#0e0f07]' : 'bg-[#0D1117]'
        } flex items-center justify-center`}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#d3e156]" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isContrast ? 'bg-[#0e0f07]' : 'bg-[#0D1117]'
      } text-[#e3e3d6] pb-28 transition-colors`}
    >
      {/* Global 3-Element Top App Bar (Logo + Streak + Profile Avatar) */}
      <AppHeader />

      {/* Main Content Container */}
      <main className="py-4 max-w-md mx-auto space-y-4">
        {/* SECTION 1: Saudação + Hero Card "TREINO DE HOJE" */}
        <section className="space-y-3">
          <div className="pt-1">
            <h1 className="text-[18px] font-semibold font-heading text-[#f8fafc] tracking-[-0.45px] leading-[24px]">
              {getGreeting()}, {firstName}
            </h1>
          </div>

          {/* Active Workout In-Progress Banner (if user has an unfinished session) */}
          {activeWorkoutBanner && (
            <Link
              href="/workout/active"
              className={`block w-full ${
                isContrast
                  ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] hover:bg-[#1c1c13] border-2 border-[#ffb95f]'
                  : 'bg-[#202017] hover:bg-[#2a2b21] border-2 border-[#d3e156]'
              } text-[#e3e3d6] rounded-[12px] p-3.5 shadow-lg transition-all active:scale-[0.98]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`${
                      isContrast
                        ? 'bg-[#ffb95f]/20 text-[#ffb95f]'
                        : 'bg-[#d3e156]/20 text-[#d3e156]'
                    } p-2.5 rounded-xl animate-pulse`}
                  >
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span
                      className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                        isContrast ? 'text-[#ffb95f]' : 'text-[#d3e156]'
                      }`}
                    >
                      Treino em Andamento • Retomar
                    </span>
                    <span className="block font-heading font-extrabold text-sm text-[#e3e3d6]">
                      {activeWorkoutBanner.title}
                    </span>
                    <span className="block text-[11px] text-[#909284]">
                      {activeWorkoutBanner.exerciseCount} exercício(s) •{' '}
                      {Math.floor(activeWorkoutBanner.elapsedSeconds / 60)} min decorridos
                    </span>
                  </div>
                </div>
                <div
                  className={`${
                    isContrast ? 'bg-[#ffb95f] text-[#151413]' : 'bg-[#d3e156] text-[#1a1c00]'
                  } font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1`}
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          )}

          {/* Hero Card: TREINO DE HOJE (Figma Node 59:176 / 27:399) */}
          <div
            className={`${
              isContrast ? 'bg-[#f4f4f0]' : 'bg-[#2a2b21]'
            } rounded-[12px] p-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] relative overflow-hidden transition-colors`}
          >
            {/* Ambient Glow Behind CTA (Figma Node 59:177) */}
            <div className="absolute bg-[rgba(211,225,86,0.1)] blur-[64px] -bottom-[40px] -right-[40px] rounded-full w-[176px] h-[176px] pointer-events-none" />

            {/* Top Info Row (Figma Node 59:179) */}
            <div className="flex flex-col items-start relative z-10 w-full">
              <span
                className={`text-[10px] font-bold uppercase tracking-[1px] leading-[14px] ${
                  isContrast ? 'text-[#f97316]' : 'text-[#d3e156]'
                }`}
              >
                TREINO DE HOJE
              </span>
              <h2
                className={`font-heading font-semibold text-[18px] tracking-[-0.22px] uppercase leading-[27.5px] mt-[1px] ${
                  isContrast ? 'text-black' : 'text-[#f8fafc]'
                }`}
              >
                {heroWorkoutMeta.displayTitle}
              </h2>
            </div>

            {/* 2 Metadata Tags: Exercícios + Previsão de Tempo */}
            <div className="flex flex-wrap items-center gap-[8px] pt-[12px] relative z-10">
              <div className="bg-[#1c1c13] rounded-[6px] px-[8px] py-[4px] flex items-center gap-[4px]">
                <Dumbbell className="h-[11.5px] w-[11.5px] text-[#94a3b8] shrink-0" />
                <span className="text-[12px] font-normal text-[#94a3b8] leading-[16px] whitespace-nowrap">
                  {heroWorkoutMeta.exerciseCount} exercícios
                </span>
              </div>

              <div className="bg-[#1c1c13] rounded-[6px] px-[8px] py-[4px] flex items-center gap-[4px]">
                <Clock className="h-[11.5px] w-[11.5px] text-[#94a3b8] shrink-0" />
                <span className="text-[12px] font-normal text-[#94a3b8] leading-[16px] whitespace-nowrap">
                  ~{heroWorkoutMeta.estimatedMinutes} min
                </span>
              </div>
            </div>

            {/* Previous Workout Badge (Figma Node 59:204) */}
            <div className="flex items-center gap-[6px] pt-[12px] relative z-10">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isContrast ? '#F97316' : '#D3E156'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
              <p
                className={`text-[12px] leading-[16px] ${
                  isContrast ? 'text-[rgba(13,17,23,0.8)]' : 'text-[#64748b]'
                }`}
              >
                <span>Último feito: </span>
                <strong
                  className={`font-bold ${
                    isContrast ? 'text-[#151413]' : 'text-[#f8fafc]'
                  }`}
                >
                  {heroWorkoutMeta.lastDaysText}
                </strong>
              </p>
              {heroWorkoutMeta.lastPrText && (
                <span
                  className={`text-[11px] leading-[16px] font-bold ${
                    isContrast ? 'text-[#a3ab5a]' : 'text-[#d3e156]'
                  }`}
                >
                  {heroWorkoutMeta.lastPrText}
                </span>
              )}
            </div>

            {/* Bottom Action Buttons Container (Figma Node 59:211) */}
            <div className="flex items-start gap-[8px] pt-[12px] relative z-10 w-full">
              {/* Primary Pill Button: INICIAR TREINO (Figma Node 59:212) */}
              <Link
                href={
                  selectedWorkout
                    ? `/workout/active?templateId=${encodeURIComponent(selectedWorkout.id)}`
                    : '/workout/active'
                }
                className={`${
                  isContrast
                    ? 'bg-black hover:bg-[#151413]'
                    : 'bg-[#f8fafc] hover:bg-white'
                } flex-1 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full shadow-[0px_8px_20px_-4px_rgba(255,255,255,0.08)] flex items-center justify-between transition-transform active:scale-[0.98]`}
              >
                <span
                  className={`font-heading font-semibold text-[18px] tracking-[0.45px] uppercase leading-[24px] whitespace-nowrap ${
                    isContrast ? 'text-[#f8fafc]' : 'text-[#202017]'
                  }`}
                >
                  INICIAR TREINO
                </span>
                <span
                  className={`${
                    isContrast ? 'bg-[#ffb95f]' : 'bg-[#effe6f]'
                  } rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.13125 6.75H0V5.25H9.13125L4.93125 1.05L6 0L12 6L6 12L4.93125 10.95L9.13125 6.75V6.75"
                      fill="#202017"
                    />
                  </svg>
                </span>
              </Link>

              {/* Secondary Pill Button: TROCAR (Figma Node 59:219) */}
              <button
                type="button"
                onClick={handleCycleWorkout}
                className={`bg-transparent ${
                  isContrast
                    ? 'hover:bg-black/5 border border-[#0d1117]'
                    : 'hover:bg-white/5 border border-[#f8fafc]'
                } min-w-[132px] min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98] shrink-0`}
              >
                <span
                  className={`font-heading font-semibold text-[18px] tracking-[0.45px] uppercase leading-[24px] whitespace-nowrap ${
                    isContrast ? 'text-[#0d1117]' : 'text-[#f8fafc]'
                  }`}
                >
                  TROCAR
                </span>
                <span className="bg-[#1e91b1] rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.694 5.5H13.714C13.8466 5.5 13.9738 5.55268 14.0676 5.64645C14.1613 5.74021 14.214 5.86739 14.214 6C14.214 6.13261 14.1613 6.25979 14.0676 6.35355C13.9738 6.44732 13.8466 6.5 13.714 6.5C12.427 6.5 11.432 6.5 10.637 6.564C9.841 6.627 9.301 6.751 8.903 6.964C8.12616 7.3858 7.50221 8.04194 7.12 8.839C6.91 9.272 6.792 9.795 6.732 10.566C6.672 11.343 6.672 12.328 6.672 13.68V14.393L8.218 12.846C8.31189 12.7522 8.43917 12.6996 8.57185 12.6997C8.70454 12.6998 8.83175 12.7526 8.9255 12.8465C9.01925 12.9404 9.07187 13.0677 9.07178 13.2004C9.07168 13.333 9.01889 13.4602 8.925 13.554L6.525 15.954C6.47703 16.0018 6.41984 16.0394 6.35692 16.0644C6.29399 16.0895 6.22663 16.1015 6.15893 16.0997C6.09122 16.0979 6.02459 16.0824 5.96306 16.0541C5.90153 16.0258 5.8464 15.9853 5.801 15.935L3.629 13.535C3.54374 13.4361 3.50057 13.3077 3.50873 13.1774C3.5169 13.047 3.57573 12.925 3.67267 12.8375C3.7696 12.75 3.89694 12.7038 4.02744 12.709C4.15794 12.7141 4.28125 12.7701 4.371 12.865L5.671 14.302V13.658C5.671 12.333 5.671 11.308 5.735 10.488C5.8 9.659 5.932 8.996 6.22 8.403C6.69463 7.41603 7.46876 6.60411 8.432 6.083C9.012 5.772 9.715 5.634 10.558 5.567C11.398 5.5 12.431 5.5 13.694 5.5ZM17.841 7.9C17.9087 7.90181 17.9754 7.91737 18.0369 7.94573C18.0985 7.9741 18.1536 8.01467 18.199 8.065L20.371 10.465C20.4563 10.5639 20.4994 10.6923 20.4913 10.8226C20.4831 10.953 20.4243 11.075 20.3273 11.1625C20.2304 11.25 20.1031 11.2962 19.9726 11.291C19.8421 11.2859 19.7187 11.2299 19.629 11.135L18.329 9.698V10.342C18.329 11.668 18.329 12.692 18.265 13.512C18.2 14.341 18.068 15.004 17.78 15.597C17.3054 16.584 16.5312 17.3959 15.568 17.917C14.988 18.228 14.285 18.366 13.442 18.433C12.603 18.5 11.569 18.5 10.306 18.5H10.286C10.1534 18.5 10.0262 18.4473 9.93245 18.3536C9.83868 18.2598 9.786 18.1326 9.786 18C9.786 17.8674 9.83868 17.7402 9.93245 17.6464C10.0262 17.5527 10.1534 17.5 10.286 17.5C11.573 17.5 12.568 17.5 13.363 17.436C14.159 17.373 14.699 17.249 15.097 17.036C15.8742 16.6144 16.4985 15.9582 16.881 15.161C17.091 14.727 17.208 14.205 17.268 13.434C17.328 12.657 17.328 11.672 17.328 10.32V9.607L15.782 11.154C15.6881 11.2478 15.5608 11.3004 15.4281 11.3003C15.2955 11.3002 15.1683 11.2474 15.0745 11.1535C14.9807 11.0596 14.9281 10.9323 14.9282 10.7996C14.9283 10.667 14.9811 10.5398 15.075 10.446L17.475 8.046C17.5229 7.99814 17.5801 7.96052 17.643 7.93542C17.7059 7.91033 17.7733 7.89828 17.841 7.9Z"
                      fill="#F8FAFC"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: Card RESUMO FÍSICO (Figma Node 59:227 / 27:445) */}
        <section
          className={`${
            isContrast
              ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))]'
              : 'bg-[#202017]'
          } rounded-[12px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-colors`}
        >
          {/* Header (Figma Node 59:229) */}
          <div className="flex items-center justify-between w-full">
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              Resumo físico
            </h3>

            <Link
              href="/measures"
              className="font-medium text-[#64748b] hover:text-[#94a3b8] text-[10px] tracking-[0.5px] uppercase leading-[14px] whitespace-nowrap transition-colors shrink-0"
            >
              {daysSinceMeasure !== null
                ? daysSinceMeasure === 0
                  ? 'ATUALIZADO HOJE'
                  : `ATUALIZADO HÁ ${daysSinceMeasure} ${daysSinceMeasure === 1 ? 'DIA' : 'DIAS'}`
                : 'REGISTRAR MEDIDAS'}
            </Link>
          </div>

          {/* Primary Highlighted Metric: IMC (Figma Node 59:238) */}
          <div className="pt-[16px] w-full">
            <div
              className={`${
                isContrast ? 'bg-black' : 'bg-[#0e0f07]'
              } rounded-[8px] p-[12px] w-full transition-colors`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex flex-col gap-[4px] items-start pt-[4px]">
                  <span className="font-bold text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                    ÍNDICE DE MASSA CORPORAL
                  </span>
                  <div className="flex gap-[8px] items-baseline">
                    <span className="font-heading font-bold text-[#f8fafc] text-[36px] tracking-[-0.9px] leading-[40px]">
                      {imcValue > 0 ? imcValue.toFixed(1) : '--'}
                    </span>
                    <span className="font-medium text-[#64748b] text-[12px] leading-[16px]">
                      IMC
                    </span>
                  </div>
                </div>

                {/* Smaller Status Badge (Figma Node 59:246) */}
                <div
                  className={`${imcStatus.badgeBg} flex gap-[4px] items-center px-[8px] py-[2px] rounded-full shrink-0`}
                >
                  <span className={`${imcStatus.dotColor} rounded-full shrink-0 w-[6px] h-[6px]`} />
                  <span
                    className={`font-medium ${imcStatus.textColor} text-[11px] leading-[20px] whitespace-nowrap`}
                  >
                    {imcStatus.label}
                  </span>
                </div>
              </div>

              {/* 3-Segment IMC Gauge Bar & Range Labels */}
              <div className="pt-[12px] w-full">
                <div className="bg-[rgba(255,255,255,0.08)] flex h-[6px] w-full rounded-full overflow-hidden">
                  <div
                    className={`w-1/4 h-full transition-colors ${
                      imcStatus.activeSegment === 1 ? 'bg-[#1e91b1]' : 'bg-transparent'
                    }`}
                  />
                  <div
                    className={`w-2/4 h-full transition-colors ${
                      imcStatus.activeSegment === 2
                        ? 'bg-[#c2cf46]'
                        : 'bg-[rgba(255,255,255,0.06)]'
                    }`}
                  />
                  <div
                    className={`w-1/4 h-full transition-colors ${
                      imcStatus.activeSegment === 3 ? 'bg-[#f59e0b]' : 'bg-transparent'
                    }`}
                  />
                </div>

                <div className="pt-[4px] flex items-center justify-between w-full text-[9px] font-medium leading-[20px]">
                  <span
                    className={
                      imcStatus.activeSegment === 1 ? 'text-[#1e91b1]' : 'text-[#64748b]'
                    }
                  >
                    Baixo &lt;18.5
                  </span>
                  <span
                    className={
                      imcStatus.activeSegment === 2 ? 'text-[#d3e156]' : 'text-[#64748b]'
                    }
                  >
                    Normal (18.5 - 24.9)
                  </span>
                  <span
                    className={
                      imcStatus.activeSegment === 3 ? 'text-[#f59e0b]' : 'text-[#64748b]'
                    }
                  >
                    Sobrepeso &gt;25
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Column Grid Metrics: Peso, Idade, Altura (Figma Node 59:290) */}
          <div className="pt-[16px] w-full">
            <div className="grid grid-cols-3 gap-[8px] w-full">
              {/* Peso (Figma Node 59:291) */}
              <Link
                href="/measures"
                className={`${
                  isContrast
                    ? 'bg-black hover:bg-[#1c1c13]'
                    : 'bg-[#2a2b21] hover:bg-[#323328]'
                } p-[10px] rounded-[8px] flex flex-col items-start justify-between transition-colors min-w-0`}
              >
                <span className="font-medium text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[20px]">
                  PESO
                </span>
                <div className="pt-[4px] flex items-baseline gap-[2px]">
                  <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] leading-[22.5px]">
                    {pesoValue > 0 ? pesoValue : '--'}
                  </span>
                  <span className="font-medium text-[#64748b] text-[11px] leading-[20px]">kg</span>
                </div>
                <span className="pt-[2px] font-medium text-[#d3e156] text-[10px] leading-[10px] truncate w-full">
                  {pesoDelta !== null
                    ? `${pesoDelta > 0 ? '+' : ''}${pesoDelta} kg este mês`
                    : 'Toque p/ atualizar'}
                </span>
              </Link>

              {/* Idade (Figma Node 59:302) */}
              <Link
                href="/profile"
                className={`${
                  isContrast
                    ? 'bg-black hover:bg-[#1c1c13]'
                    : 'bg-[#2a2b21] hover:bg-[#323328]'
                } p-[10px] rounded-[8px] flex flex-col items-start justify-between transition-colors min-w-0`}
              >
                <span className="font-medium text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[20px]">
                  IDADE
                </span>
                <div className="pt-[4px] flex items-baseline gap-[3px]">
                  <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] leading-[22.5px]">
                    {profile?.idade || '--'}
                  </span>
                  <span className="font-medium text-[#64748b] text-[11px] leading-[20px]">
                    anos
                  </span>
                </div>
                <span className="pt-[2px] font-medium text-[#94a3b8] text-[10px] leading-[10px] truncate w-full">
                  Metab. ativo
                </span>
              </Link>

              {/* Altura (Figma Node 59:313) */}
              <Link
                href="/profile"
                className={`${
                  isContrast
                    ? 'bg-black hover:bg-[#1c1c13]'
                    : 'bg-[#2a2b21] hover:bg-[#323328]'
                } p-[10px] rounded-[8px] flex flex-col items-start justify-between transition-colors min-w-0`}
              >
                <span className="font-medium text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[20px]">
                  ALTURA
                </span>
                <div className="pt-[4px] flex items-baseline gap-[2px]">
                  <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] leading-[22.5px]">
                    {alturaMetros}
                  </span>
                  <span className="font-medium text-[#64748b] text-[11px] leading-[20px]">m</span>
                </div>
                <span className="pt-[2px] font-medium text-[#94a3b8] text-[10px] leading-[10px] truncate w-full">
                  Estável
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 3: SCORE GERAL DE FORÇA + MAPA CORPORAL ANATÔMICO */}
        <DashboardStrengthScoreCard
          rpScorePts={rpScorePts}
          totalEvolutionPct={totalEvolutionPct}
          muscleStats={muscleReadinessMap}
          onSelectMuscle={(muscle) =>
            router.push(`/strength?muscle=${encodeURIComponent(muscle)}`)
          }
        />

        {/* SECTION 4: VOLUME SEMANAL DE SÉRIES */}
        <WeeklyVolumeBars logs={strengthLogs} weeklySetGoals={profile?.weeklySetGoals} />

        {/* SECTION 5: RECORDES RECENTES (PRS) (Figma Node 59:531 / 27:696) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-[2px]">
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              Recordes Recentes (PRs)
            </h3>
            <Link
              href="/strength"
              className={`font-normal text-[12px] leading-[16px] transition-colors ${
                isContrast
                  ? 'text-[#f59e0b] hover:opacity-80'
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              Ver todos
            </Link>
          </div>

          {recentPrCards.length > 0 ? (
            <div className="-mx-4 px-4 flex gap-[12px] overflow-x-auto pb-2 scrollbar-none">
              {recentPrCards.map((pr) => {
                const isPositiveRecord = pr.deltaKg > 0;
                return (
                  <button
                    key={pr.exerciseId}
                    type="button"
                    onClick={() =>
                      router.push(`/strength?muscle=${encodeURIComponent(pr.muscleGroup)}`)
                    }
                    className={`min-w-[210px] w-[210px] shrink-0 ${
                      isContrast
                        ? 'bg-[#f4f4f0] hover:bg-white'
                        : 'bg-[#2a2b21] hover:bg-[#323328]'
                    } rounded-[12px] p-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] text-left flex flex-col justify-between transition-all active:scale-[0.98]`}
                  >
                    {/* Top Row: Muscle Label + Circular Icon Badge */}
                    <div className="flex items-start justify-between w-full">
                      <span
                        className={`font-semibold text-[11px] tracking-[0.55px] uppercase leading-[20px] truncate ${
                          isContrast ? 'text-[rgba(32,32,23,0.45)]' : 'text-[#94a3b8]'
                        }`}
                      >
                        {pr.muscleGroup}
                      </span>
                      {isPositiveRecord ? (
                        <span
                          className={`${
                            isContrast ? 'bg-[#9e9660]' : 'bg-[rgba(238,152,0,0.2)]'
                          } rounded-full w-[24px] h-[24px] flex items-center justify-center shrink-0`}
                        >
                          <Trophy
                            className={`w-[14px] h-[14px] ${
                              isContrast ? 'text-[#f8fafc]' : 'text-[#f59e0b]'
                            }`}
                          />
                        </span>
                      ) : (
                        <span
                          className={`${
                            isContrast
                              ? 'bg-[rgba(21,20,19,0.08)]'
                              : 'bg-[rgba(255,255,255,0.08)]'
                          } rounded-full w-[24px] h-[24px] flex items-center justify-center shrink-0`}
                        >
                          <Dumbbell
                            className={`w-[14px] h-[14px] ${
                              isContrast ? 'text-[#151413]' : 'text-[#94a3b8]'
                            }`}
                          />
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Exercise Title + 1RM Value */}
                    <div className="pt-[12px] flex flex-col gap-[2px] items-start w-full">
                      <span
                        className={`block font-bold text-[15px] leading-[20px] truncate w-full ${
                          isContrast ? 'text-black' : 'text-[#f8fafc]'
                        }`}
                      >
                        {pr.exerciseName}
                      </span>
                      <div className="flex items-baseline gap-[4px]">
                        <span
                          className={`font-heading font-semibold text-[22px] tracking-[-0.22px] leading-[28px] ${
                            isContrast ? 'text-black' : 'text-[#f8fafc]'
                          }`}
                        >
                          {pr.best1RM.toFixed(1)}
                        </span>
                        <span
                          className={`font-medium text-[12px] leading-[16px] ${
                            isContrast ? 'text-[rgba(13,17,23,0.8)]' : 'text-[#64748b]'
                          }`}
                        >
                          kg 1RM
                        </span>
                      </div>
                    </div>

                    {/* Bottom Pill Badge */}
                    <div className="pt-[12px]">
                      {isPositiveRecord ? (
                        <span
                          className={`inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[11px] font-medium leading-[20px] ${
                            isContrast
                              ? 'bg-[rgba(158,150,96,0.4)] text-[#756e41]'
                              : 'bg-[rgba(211,225,86,0.1)] text-[#d3e156]'
                          }`}
                        >
                          <svg
                            width="10"
                            height="6"
                            viewBox="0 0 10 6"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0"
                          >
                            <path
                              d="M1 5L3.66667 2.33333L5.66667 4.33333L9 1M9 1H6.33333M9 1V3.66667"
                              stroke={isContrast ? '#756E41' : '#D3E156'}
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>+{pr.deltaKg.toFixed(1)} kg recorde!</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-medium leading-[20px] ${
                            isContrast
                              ? 'bg-[rgba(21,20,19,0.08)] text-[#151413]'
                              : 'bg-[rgba(255,255,255,0.08)] text-[#94a3b8]'
                          }`}
                        >
                          PR • 1RM Máximo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className={`${
                isContrast
                  ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))]'
                  : 'bg-[#202017]'
              } rounded-[12px] p-4 text-center`}
            >
              <p className="text-xs text-[#94a3b8]">
                Conclua seu primeiro treino para registrar seus recordes de 1RM (Brzycki) aqui.
              </p>
            </div>
          )}
        </section>

        {/* SECTION 6: ANÁLISE SEMANAL (COACH IA COMPACT CARD) */}
        {user && profile && (
          <WeeklyInsightsCard
            userId={user.uid}
            userName={profile.nome}
            pesoAtual={latestMeasure?.pesoKg || profile.pesoInicial}
            userProfile={{
              idade: profile.idade,
              altura: profile.altura
            }}
            logs={strengthLogs}
            compact={true}
          />
        )}
      </main>

      {/* Bottom Navigation (Untouched as requested) */}
      <BottomNavigation />
    </div>
  );
}

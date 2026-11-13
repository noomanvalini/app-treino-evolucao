'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import WeeklyInsightsCard from '@/components/WeeklyInsightsCard';
import WeeklyVolumeBars from '@/components/WeeklyVolumeBars';
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
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
            },
            {
              id: 'p3',
              exerciseId: 'pre_supino_inclinado_halteres',
              muscleGroup: 'Peito',
              cargaKg: 32,
              reps: 10,
              oneRmCalculado: 42.6,
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
            },
            {
              id: 'p4',
              exerciseId: 'pre_peck_deck',
              muscleGroup: 'Peito',
              cargaKg: 65,
              reps: 12,
              oneRmCalculado: 91.0,
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
            },
            {
              id: 'p5',
              exerciseId: 'pre_overhead_press',
              muscleGroup: 'Ombro',
              cargaKg: 50,
              reps: 8,
              oneRmCalculado: 63.3,
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
            },
            {
              id: 'p6',
              exerciseId: 'pre_lateral_raise',
              muscleGroup: 'Ombro',
              cargaKg: 14,
              reps: 12,
              oneRmCalculado: 19.6,
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
            },
            {
              id: 'p7',
              exerciseId: 'pre_triceps_pulley_corda',
              muscleGroup: 'Tríceps',
              cargaKg: 35,
              reps: 10,
              oneRmCalculado: 46.6,
              totalSetsCompleted: 4,
              data: new Date(now - 3 * dayMs)
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
              totalSetsCompleted: 4,
              data: new Date(now - 4 * dayMs)
            },
            {
              id: 'p10',
              exerciseId: 'pre_leg_press_45',
              muscleGroup: 'Quadríceps',
              cargaKg: 240,
              reps: 10,
              oneRmCalculado: 320.0,
              totalSetsCompleted: 4,
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
              totalSetsCompleted: 4,
              data: new Date(now - 0.8 * dayMs) // Recovering (<48h) -> Amber highlight!
            },
            {
              id: 'p13',
              exerciseId: 'pre_remada_curvada',
              muscleGroup: 'Costas',
              cargaKg: 75,
              reps: 8,
              oneRmCalculado: 95.0,
              totalSetsCompleted: 4,
              data: new Date(now - 0.8 * dayMs)
            },
            {
              id: 'p14',
              exerciseId: 'pre_rosca_direta_barra_w',
              muscleGroup: 'Bíceps',
              cargaKg: 38,
              reps: 10,
              oneRmCalculado: 50.6,
              totalSetsCompleted: 4,
              data: new Date(now - 0.8 * dayMs) // Recovering (<48h) -> Amber highlight!
            },
            {
              id: 'p15',
              exerciseId: 'pre_stiff',
              muscleGroup: 'Posterior de Coxa',
              cargaKg: 90,
              reps: 10,
              oneRmCalculado: 120.0,
              totalSetsCompleted: 4,
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

      let status: 'ready' | 'recovering' | 'inactive' = 'inactive';
      if (hoursSinceLast !== null) {
        if (hoursSinceLast <= 48) {
          status = 'recovering';
        } else if (nowMs - (latestTimeMs || 0) <= fourteenDaysMs) {
          status = 'ready';
        } else {
          status = 'ready'; // Previously trained muscle
        }
      }

      readinessMap[muscle] = {
        muscleGroup: muscle,
        evolutionPct: Number(avgEvo.toFixed(1)),
        hoursSinceLast,
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
        displayTitle: 'Treino A • Push',
        subtitle: 'Peito, Tríceps e Ombro',
        exerciseCount: 7,
        estimatedMinutes: 55,
        estimatedVolumeKg: 4200,
        lastDoneLabel: 'Pronto p/ iniciar'
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
        ? selectedWorkout.muscleGroups.join(', ')
        : 'Ficha personalizada');

    return {
      displayTitle: selectedWorkout.defaultKey
        ? `Treino ${selectedWorkout.defaultKey} • ${selectedWorkout.muscleGroups[0] || 'Geral'}`
        : mainTitle,
      subtitle: sub,
      exerciseCount: exCount,
      estimatedMinutes: estMinutes,
      estimatedVolumeKg: estVol,
      lastDoneLabel
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
        label: 'SEM REGISTRO',
        badgeClass: 'bg-[#2a2b21] border-[rgba(70,72,59,0.3)] text-[#909284]',
        activeSegment: 0
      };
    }
    if (imc < 18.5) {
      return {
        label: 'ABAIXO DO PESO',
        badgeClass: 'bg-[rgba(255,185,95,0.15)] border-[rgba(255,185,95,0.3)] text-[#ffb95f]',
        activeSegment: 1
      };
    }
    if (imc < 25) {
      return {
        label: 'PESO NORMAL',
        badgeClass: 'bg-[rgba(211,225,86,0.15)] border-[rgba(211,225,86,0.3)] text-[#d3e156]',
        activeSegment: 2
      };
    }
    return {
      label: 'SOBREPESO',
      badgeClass: 'bg-[rgba(255,185,95,0.15)] border-[rgba(255,185,95,0.3)] text-[#ffb95f]',
      activeSegment: 3
    };
  };

  const imcStatus = getImcStatus(imcValue);
  const alturaMetros = profile?.altura ? (profile.altura / 100).toFixed(2) : '--';
  const firstName = profile?.nome?.split(' ')[0] || 'Atleta';

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#d3e156]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#e3e3d6] pb-28">
      {/* Top App Bar (Untouched as requested) */}
      <header className="sticky top-0 z-10 bg-obsidian/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-lime-neon" />
          <span className="font-heading font-extrabold text-lg tracking-wider text-slate-100">
            CLIPZ<span className="text-lime-neon">BODY</span>
          </span>
        </div>
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="text-right">
            <span className="text-xs text-slate-400 block group-hover:text-lime-neon transition-colors">
              Olá,
            </span>
            <span className="text-sm font-semibold text-slate-100 leading-tight block">
              {firstName}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-card border border-border flex items-center justify-center text-lime-neon font-bold text-sm group-hover:border-lime-neon transition-colors">
            {profile?.nome?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="px-4 py-5 max-w-md mx-auto space-y-5">
        {/* SECTION 1: Saudação + Hero Card "TREINO DE HOJE" */}
        <section className="space-y-3">
          <div className="px-1">
            <h1 className="text-[26px] font-black font-heading text-[#e3e3d6] tracking-[-0.65px] leading-tight">
              {getGreeting()}, {firstName} 👋
            </h1>
          </div>

          {/* Active Workout In-Progress Banner (if user has an unfinished session) */}
          {activeWorkoutBanner && (
            <Link
              href="/workout/active"
              className="block w-full bg-[#202017] hover:bg-[#2a2b21] border-2 border-[#d3e156] text-[#e3e3d6] rounded-2xl p-4 shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#d3e156]/20 p-2.5 rounded-xl text-[#d3e156] animate-pulse">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#d3e156]">
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
                <div className="bg-[#d3e156] text-[#1a1c00] font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1">
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          )}

          {/* Hero Card: TREINO DE HOJE */}
          <div className="bg-[#2a2b21] border border-[rgba(211,225,86,0.25)] rounded-3xl p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.4)] relative overflow-hidden space-y-4">
            {/* Ambient Neon Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[rgba(211,225,86,0.08)] rounded-full blur-2xl pointer-events-none" />

            {/* Top Info Row */}
            <div className="flex items-start justify-between gap-2 relative z-10">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#d3e156]" />
                  <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#d3e156]">
                    Treino de Hoje
                  </span>
                </div>
                <h2 className="text-xl font-extrabold font-heading text-[#e3e3d6] mt-0.5 leading-snug">
                  {heroWorkoutMeta.displayTitle}
                </h2>
                <p className="text-xs font-medium text-[#c7c7b8]">{heroWorkoutMeta.subtitle}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="block text-[10px] text-[#909284]">Último feito</span>
                <span className="block text-xs font-bold text-[#e3e3d6]">
                  {heroWorkoutMeta.lastDoneLabel}
                </span>
              </div>
            </div>

            {/* Quick Template Selector Pills (A, B, C + Custom) */}
            {savedWorkouts.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none relative z-10">
                {savedWorkouts.map((w, idx) => {
                  const isSelected = idx === selectedWorkoutIdx;
                  const pillLabel = w.defaultKey
                    ? `Ficha ${w.defaultKey}`
                    : w.title.length > 14
                    ? `${w.title.slice(0, 14)}…`
                    : w.title;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWorkoutIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                        isSelected
                          ? 'bg-[#d3e156] text-[#1a1c00] shadow-sm'
                          : 'bg-[rgba(14,15,7,0.5)] text-[#909284] hover:text-[#e3e3d6] border border-[rgba(70,72,59,0.25)]'
                      }`}
                    >
                      {pillLabel}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3 Metadata Chips */}
            <div className="grid grid-cols-3 gap-2 relative z-10">
              <div className="bg-[rgba(14,15,7,0.6)] border border-[rgba(70,72,59,0.2)] rounded-xl px-2.5 py-2 flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-[#d3e156] shrink-0" />
                <span className="text-[11px] font-semibold text-[#e3e3d6] truncate">
                  {heroWorkoutMeta.exerciseCount} exercícios
                </span>
              </div>

              <div className="bg-[rgba(14,15,7,0.6)] border border-[rgba(70,72,59,0.2)] rounded-xl px-2.5 py-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#d3e156] shrink-0" />
                <span className="text-[11px] font-semibold text-[#e3e3d6] truncate">
                  ~{heroWorkoutMeta.estimatedMinutes} min
                </span>
              </div>

              <div className="bg-[rgba(14,15,7,0.6)] border border-[rgba(70,72,59,0.2)] rounded-xl px-2.5 py-2 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-[#d3e156] shrink-0" />
                <span className="text-[11px] font-semibold text-[#e3e3d6] truncate">
                  {heroWorkoutMeta.estimatedVolumeKg.toLocaleString('pt-BR')} kg
                </span>
              </div>
            </div>

            {/* Bottom Action Buttons: INICIAR TREINO + TROCAR */}
            <div className="flex items-center gap-2.5 relative z-10">
              <Link
                href={
                  selectedWorkout
                    ? `/workout/active?templateId=${encodeURIComponent(selectedWorkout.id)}`
                    : '/workout/active'
                }
                className="flex-1 bg-[#d3e156] hover:bg-[#c5d347] text-[#1a1c00] font-extrabold font-heading text-[13px] tracking-[0.33px] py-3.5 px-4 rounded-2xl shadow-[0_4px_20px_rgba(211,225,86,0.25)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>INICIAR TREINO</span>
              </Link>

              <button
                type="button"
                onClick={handleCycleWorkout}
                className="bg-[#34352a] hover:bg-[#3f4033] border border-[rgba(70,72,59,0.4)] text-[#e3e3d6] font-bold text-xs py-3.5 px-4 rounded-2xl transition-colors active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#c7c7b8]" />
                <span>TROCAR</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: Card RESUMO FÍSICO */}
        <section className="bg-[#202017] rounded-3xl p-5 border border-[rgba(70,72,59,0.2)] shadow-xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#d3e156]" />
              <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[#909284]">
                Resumo Físico
              </span>
            </div>

            <Link
              href="/measures"
              className="bg-[#2a2b21] hover:bg-[#34352a] px-2.5 py-1 rounded text-[10px] font-semibold text-[#909284] hover:text-[#e3e3d6] transition-colors"
            >
              {daysSinceMeasure !== null
                ? daysSinceMeasure === 0
                  ? 'ATUALIZADO HOJE'
                  : `ATUALIZADO HÁ ${daysSinceMeasure}D`
                : 'REGISTRAR MEDIDAS →'}
            </Link>
          </div>

          {/* IMC Highlight Box */}
          <div className="bg-[#0e0f07] border border-[rgba(70,72,59,0.15)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#909284] block">
                  Índice de Massa Corporal (IMC)
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black font-heading text-[#e3e3d6] tracking-[-0.75px]">
                    {imcValue > 0 ? imcValue.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs font-medium text-[#909284]">kg/m²</span>
                </div>
              </div>

              <div
                className={`border px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 ${imcStatus.badgeClass}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-extrabold font-heading tracking-[0.3px]">
                  {imcStatus.label}
                </span>
              </div>
            </div>

            {/* 3-Segment IMC Gauge Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-[#202017] rounded-full overflow-hidden flex gap-0.5">
                <div
                  className={`w-1/4 h-full rounded-l-full ${
                    imcStatus.activeSegment === 1 ? 'bg-[#ffb95f]' : 'bg-[rgba(144,146,132,0.25)]'
                  }`}
                />
                <div
                  className={`w-2/4 h-full ${
                    imcStatus.activeSegment === 2
                      ? 'bg-[#d3e156] shadow-[0_0_8px_rgba(211,225,86,0.5)]'
                      : 'bg-[rgba(144,146,132,0.25)]'
                  }`}
                />
                <div
                  className={`w-1/4 h-full rounded-r-full ${
                    imcStatus.activeSegment === 3 ? 'bg-[#ffb95f]' : 'bg-[rgba(144,146,132,0.25)]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] text-[#909284]">
                <span>Baixo &lt;18.5</span>
                <span>Normal (18.5 - 24.9)</span>
                <span>Sobrepeso &gt;25</span>
              </div>
            </div>
          </div>

          {/* 3 Metric Sub-Cards: Peso, Idade, Altura */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Peso */}
            <Link
              href="/measures"
              className="bg-[#2a2b21] hover:bg-[#34352a] border border-[rgba(70,72,59,0.2)] rounded-2xl p-3 flex flex-col justify-between transition-colors"
            >
              <span className="text-[10px] font-bold uppercase text-[#909284]">Peso</span>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="text-lg font-black font-heading text-[#e3e3d6]">
                  {pesoValue > 0 ? pesoValue : '--'}
                </span>
                <span className="text-[10px] font-semibold text-[#909284]">kg</span>
              </div>
              <span className="text-[9px] font-bold text-[#d3e156] mt-1 truncate">
                {pesoDelta !== null
                  ? `${pesoDelta > 0 ? '↗ +' : '↘ '}${pesoDelta}kg mês`
                  : 'Toque p/ atualizar'}
              </span>
            </Link>

            {/* Idade */}
            <Link
              href="/profile"
              className="bg-[#2a2b21] hover:bg-[#34352a] border border-[rgba(70,72,59,0.2)] rounded-2xl p-3 flex flex-col justify-between transition-colors"
            >
              <span className="text-[10px] font-bold uppercase text-[#909284]">Idade</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-black font-heading text-[#e3e3d6]">
                  {profile?.idade || '--'}
                </span>
                <span className="text-[10px] font-semibold text-[#909284]">anos</span>
              </div>
              <span className="text-[9px] font-semibold text-[#909284] mt-1">Perfil Ativo</span>
            </Link>

            {/* Altura */}
            <Link
              href="/profile"
              className="bg-[#2a2b21] hover:bg-[#34352a] border border-[rgba(70,72,59,0.2)] rounded-2xl p-3 flex flex-col justify-between transition-colors"
            >
              <span className="text-[10px] font-bold uppercase text-[#909284]">Altura</span>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="text-lg font-black font-heading text-[#e3e3d6]">
                  {alturaMetros}
                </span>
                <span className="text-[10px] font-semibold text-[#909284]">m</span>
              </div>
              <span className="text-[9px] font-semibold text-[#909284] mt-1">Base cálculo</span>
            </Link>
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

        {/* SECTION 5: RECORDES RECENTES (PRS) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[1.1px] text-[#909284]">
              Recordes Recentes (PRs)
            </span>
            <Link href="/strength" className="text-xs font-bold text-[#d3e156] hover:underline">
              Ver todos
            </Link>
          </div>

          {recentPrCards.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {recentPrCards.map((pr) => {
                const isPositiveRecord = pr.deltaKg > 0;
                return (
                  <button
                    key={pr.exerciseId}
                    type="button"
                    onClick={() =>
                      router.push(`/strength?muscle=${encodeURIComponent(pr.muscleGroup)}`)
                    }
                    className="w-[160px] shrink-0 bg-[#202017] hover:bg-[#2a2b21] border border-[rgba(70,72,59,0.2)] hover:border-[#d3e156]/40 rounded-2xl p-3.5 text-left flex flex-col justify-between transition-all active:scale-95"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase text-[#909284] truncate">
                        {pr.muscleGroup}
                      </span>
                      {isPositiveRecord ? (
                        <Trophy className="h-3.5 w-3.5 text-[#d3e156] shrink-0" />
                      ) : (
                        <Dumbbell className="h-3.5 w-3.5 text-[#909284] shrink-0" />
                      )}
                    </div>

                    <div className="mt-2.5">
                      <span className="block text-xs font-bold text-[#e3e3d6] truncate">
                        {pr.exerciseName}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-black font-heading text-[#d3e156]">
                          {pr.best1RM.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-[#909284]">kg 1RM</span>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      {isPositiveRecord ? (
                        <span className="inline-block bg-[rgba(211,225,86,0.1)] text-[#d3e156] px-2 py-0.5 rounded text-[10px] font-bold">
                          +{pr.deltaKg.toFixed(1)} kg recorde!
                        </span>
                      ) : (
                        <span className="inline-block bg-[#2a2b21] text-[#909284] px-2 py-0.5 rounded text-[10px] font-bold">
                          PR • 1RM Máximo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#202017] border border-[rgba(70,72,59,0.2)] rounded-2xl p-4 text-center">
              <p className="text-xs text-[#909284]">
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

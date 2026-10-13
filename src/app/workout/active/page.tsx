'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import RestTimerModal from '@/components/RestTimerModal';
import { PREDEFINED_EXERCISES, MUSCLE_GROUPS, getExerciseGuide } from '@/data/exercises';
import { 
  Play, Pause, Plus, Trash2, Check, ArrowLeft, Dumbbell, 
  Clock, Flame, Award, AlertCircle, ChevronRight, X, Search, Sparkles, Loader2, Info
} from 'lucide-react';

interface WorkoutSet {
  id: string;
  setNumber: number;
  cargaKg: number | '';
  reps: number | '';
  completed: boolean;
  previousRef?: string;
}

interface ActiveExercise {
  id: string; // unique instance id in this workout
  exerciseId: string; // id from PREDEFINED_EXERCISES or custom exercises
  nomeExercicio: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
  sets: WorkoutSet[];
}

interface AvailableExercise {
  id: string;
  nomeExercicio: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
}

function ActiveWorkoutComponent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Workout Metadata
  const [workoutTitle, setWorkoutTitle] = useState('Treino de Hoje');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Rest Timer State
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  // Add Exercise Modal State
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<AvailableExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string>('Todos');
  const [loadingAvailableExercises, setLoadingAvailableExercises] = useState(false);

  // Latest Logs Cache for smart auto-fill
  const [latestLogsCache, setLatestLogsCache] = useState<Record<string, { cargaKg: number; reps: number }>>({});

  // Finish Workout Modal & Discard Confirmation
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [completedWorkoutStats, setCompletedWorkoutStats] = useState<{
    durationSecs: number;
    volumeKg: number;
    totalSets: number;
    exerciseCount: number;
  } | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  // Modal State: Exercise Demonstration Guide (GIF + Descrição)
  const [exerciseGuideModal, setExerciseGuideModal] = useState<{
    nomeExercicio: string;
    muscleGroup: string;
    gifUrl?: string;
    thumbnailUrl?: string;
    description?: string;
  } | null>(null);

  const handleOpenExerciseGuide = (exercise: {
    id?: string;
    exerciseId?: string;
    nomeExercicio: string;
    muscleGroup?: string;
    gifUrl?: string;
    thumbnailUrl?: string;
    description?: string;
  }) => {
    const guide = getExerciseGuide({ 
      id: exercise.exerciseId || exercise.id, 
      name: exercise.nomeExercicio 
    });
    setExerciseGuideModal({
      nomeExercicio: exercise.nomeExercicio,
      muscleGroup: exercise.muscleGroup || guide.muscleGroup || '',
      gifUrl: exercise.gifUrl || guide.gifUrl,
      thumbnailUrl: exercise.thumbnailUrl || guide.thumbnailUrl,
      description: exercise.description || guide.description
    });
  };

  // Timer Interval Reference
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key
  const storageKey = user ? `clipzbody_active_workout_${user.uid}` : null;

  // 1. Authentication guard & Load/Restore from localStorage or URL params
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if there is an existing workout in localStorage
      if (storageKey) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.exercises)) {
              setWorkoutTitle(parsed.title || 'Treino de Hoje');
              setExercises(parsed.exercises);
              
              const isStarted = !!parsed.isWorkoutStarted;
              setIsWorkoutStarted(isStarted);

              if (isStarted) {
                // Calculate elapsed time considering start timestamp
                const now = Date.now();
                const savedElapsed = parsed.elapsedSeconds || 0;
                const diffFromSave = parsed.lastSavedAt ? Math.floor((now - parsed.lastSavedAt) / 1000) : 0;
                
                if (!parsed.isTimerPaused && diffFromSave > 0 && diffFromSave < 86400) {
                  setElapsedSeconds(savedElapsed + diffFromSave);
                } else {
                  setElapsedSeconds(savedElapsed);
                }
                setIsTimerPaused(!!parsed.isTimerPaused);
              } else {
                setElapsedSeconds(0);
                setIsTimerPaused(false);
              }
              setIsInitialized(true);
              return;
            }
          }
        } catch (e) {
          console.error('Error loading workout from localStorage:', e);
        }
      }

      // If no saved workout, check URL params for initial preset
      const presetGroup = searchParams.get('preset');
      const initialTitle = presetGroup ? `Treino: ${presetGroup}` : 'Treino do Dia';
      setWorkoutTitle(initialTitle);
      setElapsedSeconds(0);
      setIsTimerPaused(false);
      setIsWorkoutStarted(false);
      setExercises([]);
      setIsInitialized(true);
    }
  }, [user, authLoading, storageKey, router, searchParams]);

  // 2. Fetch available exercises and user's past logs for auto-complete
  useEffect(() => {
    if (!user) return;

    const fetchExercisesAndLogs = async () => {
      setLoadingAvailableExercises(true);
      try {
        // Fetch custom exercises
        const exQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
        const exSnap = await getDocs(exQuery);
        const customList: AvailableExercise[] = [];
        exSnap.forEach((doc) => {
          const d = doc.data();
          const guide = getExerciseGuide({ id: doc.id, name: d.nomeExercicio });
          customList.push({
            id: doc.id,
            nomeExercicio: d.nomeExercicio,
            muscleGroup: d.muscleGroup,
            thumbnailUrl: d.thumbnailUrl || guide.thumbnailUrl,
            gifUrl: d.gifUrl || guide.gifUrl,
            description: d.description || guide.description
          });
        });

        // Predefined exercises
        const predefinedList: AvailableExercise[] = PREDEFINED_EXERCISES.map((pe) => ({
          id: pe.id,
          nomeExercicio: pe.nome,
          muscleGroup: pe.muscleGroup,
          thumbnailUrl: pe.thumbnailUrl,
          gifUrl: pe.gifUrl,
          description: pe.description
        }));

        // Combine and deduplicate
        const combined = [...customList, ...predefinedList];
        const unique = combined.filter((v, i, a) => a.findIndex((t) => t.nomeExercicio.toLowerCase() === v.nomeExercicio.toLowerCase()) === i);
        unique.sort((a, b) => a.nomeExercicio.localeCompare(b.nomeExercicio));
        setAvailableExercises(unique);

        // Fetch recent strength logs to have past reference loads
        const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
        const logsSnap = await getDocs(logsQuery);
        const latestMap: Record<string, { cargaKg: number; reps: number; timestamp: number }> = {};
        
        logsSnap.forEach((d) => {
          const data = d.data();
          const t = data.data?.seconds ? data.data.seconds * 1000 : new Date(data.data).getTime();
          const exId = data.exerciseId;
          if (!latestMap[exId] || t > latestMap[exId].timestamp) {
            latestMap[exId] = {
              cargaKg: data.cargaKg,
              reps: data.reps,
              timestamp: t
            };
          }
        });

        const cleanMap: Record<string, { cargaKg: number; reps: number }> = {};
        Object.entries(latestMap).forEach(([k, v]) => {
          cleanMap[k] = { cargaKg: v.cargaKg, reps: v.reps };
        });
        setLatestLogsCache(cleanMap);
      } catch (err) {
        console.error('Error loading exercises/logs:', err);
      } finally {
        setLoadingAvailableExercises(false);
      }
    };

    fetchExercisesAndLogs();
  }, [user]);

  // 3. Workout Duration Timer (only ticks after user explicitly starts the workout)
  useEffect(() => {
    if (!isInitialized || !isWorkoutStarted || isTimerPaused) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isInitialized, isWorkoutStarted, isTimerPaused]);

  // 4. Save to localStorage continuously
  useEffect(() => {
    if (!isInitialized || !storageKey) return;

    try {
      const payload = {
        title: workoutTitle,
        elapsedSeconds,
        isTimerPaused,
        isWorkoutStarted,
        lastSavedAt: Date.now(),
        exercises
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving workout to localStorage:', e);
    }
  }, [isInitialized, storageKey, workoutTitle, elapsedSeconds, isTimerPaused, isWorkoutStarted, exercises]);

  // Helper: calculate 1RM using Brzycki formula
  const calculate1RM = (cargaKg: number, repsCount: number) => {
    if (repsCount <= 0) return 0;
    if (repsCount === 1) return cargaKg;
    return cargaKg * (1 + repsCount / 30);
  };

  // Helper: format duration mm:ss or hh:mm:ss
  const formatDuration = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- EXERCISE ACTIONS ---
  const handleAddExerciseToWorkout = (exercise: AvailableExercise) => {
    const past = latestLogsCache[exercise.id];
    const prevRef = past ? `${past.cargaKg}kg × ${past.reps}` : undefined;
    const guide = getExerciseGuide({ id: exercise.id, name: exercise.nomeExercicio });

    const newExercise: ActiveExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      exerciseId: exercise.id,
      nomeExercicio: exercise.nomeExercicio,
      muscleGroup: exercise.muscleGroup,
      thumbnailUrl: exercise.thumbnailUrl || guide.thumbnailUrl,
      gifUrl: exercise.gifUrl || guide.gifUrl,
      description: exercise.description || guide.description,
      sets: [
        {
          id: `set_1_${Date.now()}`,
          setNumber: 1,
          cargaKg: past ? past.cargaKg : '',
          reps: past ? past.reps : '',
          completed: false,
          previousRef: prevRef
        },
        {
          id: `set_2_${Date.now()}`,
          setNumber: 2,
          cargaKg: past ? past.cargaKg : '',
          reps: past ? past.reps : '',
          completed: false,
          previousRef: prevRef
        },
        {
          id: `set_3_${Date.now()}`,
          setNumber: 3,
          cargaKg: past ? past.cargaKg : '',
          reps: past ? past.reps : '',
          completed: false,
          previousRef: prevRef
        }
      ]
    };

    setExercises((prev) => [...prev, newExercise]);
    setIsAddExerciseModalOpen(false);
  };

  const handleRemoveExercise = (exerciseInstanceId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseInstanceId));
  };

  // --- SET ACTIONS ---
  const handleAddSet = (exerciseInstanceId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNumber = ex.sets.length + 1;
        const newSet: WorkoutSet = {
          id: `set_${newSetNumber}_${Date.now()}`,
          setNumber: newSetNumber,
          cargaKg: lastSet ? lastSet.cargaKg : '',
          reps: lastSet ? lastSet.reps : '',
          completed: false,
          previousRef: lastSet?.previousRef
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleRemoveSet = (exerciseInstanceId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const filtered = ex.sets.filter((s) => s.id !== setId);
        // Renumber sets
        const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: renumbered };
      })
    );
  };

  const handleUpdateSet = (
    exerciseInstanceId: string,
    setId: string,
    field: 'cargaKg' | 'reps',
    value: string
  ) => {
    const num = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: num } : s))
        };
      })
    );
  };

  const handleToggleSetComplete = (exerciseInstanceId: string, setId: string) => {
    let justCompleted = false;

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id === setId) {
              const nextVal = !s.completed;
              if (nextVal) justCompleted = true;
              return { ...s, completed: nextVal };
            }
            return s;
          })
        };
      })
    );

    // Auto-trigger Rest Timer when set is completed
    if (justCompleted) {
      setIsRestTimerOpen(true);
    }
  };

  // --- WORKOUT TOTAL STATS ---
  let totalSetsCount = 0;
  let completedSetsCount = 0;
  let totalVolumeKg = 0;

  exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      totalSetsCount++;
      if (s.completed) {
        completedSetsCount++;
        const c = typeof s.cargaKg === 'number' ? s.cargaKg : 0;
        const r = typeof s.reps === 'number' ? s.reps : 0;
        totalVolumeKg += c * r;
      }
    });
  });

  const progressPercent = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  // --- FINISH WORKOUT ACTION ---
  const handleFinishWorkout = async () => {
    if (!user) return;

    if (completedSetsCount === 0) {
      alert('Marque ao menos uma série como concluída (✓) para salvar o treino.');
      return;
    }

    setIsFinishing(true);
    try {
      const now = new Date();
      const sessionId = `workout_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Save ONLY the peak PR set for each exercise to `strength_logs`
      const logPromises: Promise<any>[] = [];
      exercises.forEach((ex) => {
        const validSets = ex.sets.filter((s) => s.completed && typeof s.cargaKg === 'number' && s.cargaKg > 0 && typeof s.reps === 'number' && s.reps > 0);
        if (validSets.length === 0) return;

        // Find the set with the highest 1RM / PR (tie-breaker: highest cargaKg)
        const sortedSets = [...validSets].sort((a, b) => {
          const oneRmA = calculate1RM(a.cargaKg as number, a.reps as number);
          const oneRmB = calculate1RM(b.cargaKg as number, b.reps as number);
          if (oneRmB !== oneRmA) return oneRmB - oneRmA;
          return (b.cargaKg as number) - (a.cargaKg as number);
        });

        const peakSet = sortedSets[0];
        const peakOneRm = calculate1RM(peakSet.cargaKg as number, peakSet.reps as number);

        // Formulate details of all sets completed in this session
        const allSetsData = validSets.map((s) => ({
          setNumber: s.setNumber,
          cargaKg: s.cargaKg as number,
          reps: s.reps as number,
          oneRmCalculado: Number(calculate1RM(s.cargaKg as number, s.reps as number).toFixed(2)),
          isPeak: s.id === peakSet.id
        }));

        logPromises.push(
          addDoc(collection(db, 'strength_logs'), {
            userId: user.uid,
            exerciseId: ex.exerciseId,
            muscleGroup: ex.muscleGroup,
            cargaKg: peakSet.cargaKg,
            reps: peakSet.reps,
            oneRmCalculado: Number(peakOneRm.toFixed(2)),
            data: now,
            sessionId: sessionId,
            setNumber: peakSet.setNumber,
            allSets: allSetsData,
            totalSetsCompleted: validSets.length
          })
        );
      });

      await Promise.all(logPromises);

      // 2. Save workout session summary
      await addDoc(collection(db, 'workout_sessions'), {
        userId: user.uid,
        sessionId: sessionId,
        title: workoutTitle,
        durationSeconds: elapsedSeconds,
        totalVolumeKg: totalVolumeKg,
        completedSetsCount: completedSetsCount,
        exercisesCount: exercises.length,
        exerciseNames: exercises.map((e) => e.nomeExercicio),
        data: now
      });

      // 3. Clear localStorage
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      // 4. Set stats and open Celebration Modal
      setCompletedWorkoutStats({
        durationSecs: elapsedSeconds,
        volumeKg: totalVolumeKg,
        totalSets: completedSetsCount,
        exerciseCount: exercises.length
      });
      setIsCelebrationOpen(true);
    } catch (err) {
      console.error('Error saving finished workout:', err);
      alert('Houve um erro ao salvar o treino. Tente novamente.');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDiscardWorkout = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-bg text-slate-100 pb-28">
      {/* Sticky Top Bar with Session Timer & Actions */}
      <header className="sticky top-0 z-30 bg-slate-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-100 transition-colors"
            title="Voltar ao Dashboard (o treino continuará salvo)"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-center flex-1 mx-2">
            <input
              type="text"
              value={workoutTitle}
              onChange={(e) => setWorkoutTitle(e.target.value)}
              className="bg-transparent text-center font-bold text-sm text-slate-100 focus:outline-none focus:border-b border-lime-neon/50 px-1 w-full truncate"
              placeholder="Nome do Treino"
            />
            {isWorkoutStarted ? (
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-lime-neon">
                  <Clock className="h-3 w-3" /> {formatDuration(elapsedSeconds)}
                </span>
                <button
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  title={isTimerPaused ? 'Retomar cronômetro' : 'Pausar cronômetro'}
                >
                  {isTimerPaused ? <Play className="h-3 w-3 text-lime-neon fill-current" /> : <Pause className="h-3 w-3" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Preparando Treino
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsDiscardConfirmOpen(true)}
            className="text-xs text-danger/80 hover:text-danger font-medium p-2 -mr-2 transition-colors"
          >
            Descartar
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="max-w-md mx-auto mt-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span>
              {completedSetsCount} de {totalSetsCount} séries concluídas
            </span>
            <span className="font-mono text-lime-neon font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-card-light rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-neon transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Quick Workout Stats Bar */}
        <div className="grid grid-cols-2 gap-2 bg-slate-card/60 border border-border/60 rounded-2xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-neon/10 text-lime-neon">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Volume Total</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {totalVolumeKg.toLocaleString('pt-BR')} kg
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Exercícios</span>
              <span className="text-sm font-bold text-slate-100 font-mono">{exercises.length}</span>
            </div>
          </div>
        </div>

        {/* Empty Workout State */}
        {exercises.length === 0 && (
          <div className="bg-slate-card border border-border border-dashed rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-lime-neon/10 text-lime-neon flex items-center justify-center mx-auto border border-lime-neon/20">
              <Dumbbell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Nenhum exercício adicionado</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Adicione os exercícios que você vai executar hoje para começar a registrar as cargas e repetições em tempo real.
            </p>
            <button
              onClick={() => setIsAddExerciseModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold text-xs shadow-lg shadow-lime-neon/20 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Adicionar Primeiro Exercício
            </button>
          </div>
        )}

        {/* Exercises List */}
        {exercises.map((ex, exIndex) => {
          const completedInExercise = ex.sets.filter((s) => s.completed).length;

          return (
            <div
              key={ex.id}
              className="bg-slate-card border border-border rounded-3xl p-4 shadow-lg space-y-3"
            >
              {/* Exercise Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lime-neon font-bold text-xs border border-border shrink-0 overflow-hidden relative">
                    {ex.thumbnailUrl ? (
                      <img src={ex.thumbnailUrl} alt={ex.nomeExercicio} className="w-full h-full object-cover" />
                    ) : (
                      exIndex + 1
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-100 leading-snug truncate">{ex.nomeExercicio}</h3>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {ex.muscleGroup} • {completedInExercise}/{ex.sets.length} séries
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenExerciseGuide(ex)}
                    className="p-2 rounded-xl bg-lime-neon/10 hover:bg-lime-neon text-lime-neon hover:text-slate-900 transition-colors border border-lime-neon/20 hover:border-lime-neon shadow-sm"
                    title="Ver execução (GIF e instruções)"
                    aria-label="Ver demonstração do exercício"
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </button>

                  <button
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="p-2 text-slate-500 hover:text-danger rounded-xl transition-colors"
                    title="Remover exercício"
                    aria-label="Remover exercício"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sets Table */}
              <div className="space-y-1.5">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  <div className="col-span-2 text-center">Série</div>
                  <div className="col-span-3 text-center">Anterior</div>
                  <div className="col-span-3 text-center">Carga (kg)</div>
                  <div className="col-span-2 text-center">Reps</div>
                  <div className="col-span-2 text-center">Check</div>
                </div>

                {/* Set Rows */}
                {ex.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-2xl border transition-all ${
                      set.completed
                        ? 'bg-lime-neon/10 border-lime-neon/30 text-slate-100'
                        : 'bg-slate-card-light/40 border-border/40 hover:border-border'
                    }`}
                  >
                    {/* Set Number */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                          set.completed
                            ? 'bg-lime-neon text-slate-900'
                            : 'bg-slate-card-light text-slate-300'
                        }`}
                      >
                        {set.setNumber}
                      </span>
                    </div>

                    {/* Previous Reference */}
                    <div className="col-span-3 text-center">
                      <span className="text-[10px] font-mono text-slate-400 truncate block">
                        {set.previousRef || '-'}
                      </span>
                    </div>

                    {/* Weight Input */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="kg"
                        value={set.cargaKg}
                        onChange={(e) => handleUpdateSet(ex.id, set.id, 'cargaKg', e.target.value)}
                        className={`w-full py-1.5 text-center text-xs font-mono font-bold rounded-xl border focus:outline-none transition-colors ${
                          set.completed
                            ? 'bg-slate-card/60 border-lime-neon/30 text-lime-neon'
                            : 'bg-slate-bg border-border text-slate-100 focus:border-lime-neon'
                        }`}
                      />
                    </div>

                    {/* Reps Input */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="reps"
                        value={set.reps}
                        onChange={(e) => handleUpdateSet(ex.id, set.id, 'reps', e.target.value)}
                        className={`w-full py-1.5 text-center text-xs font-mono font-bold rounded-xl border focus:outline-none transition-colors ${
                          set.completed
                            ? 'bg-slate-card/60 border-lime-neon/30 text-lime-neon'
                            : 'bg-slate-bg border-border text-slate-100 focus:border-lime-neon'
                        }`}
                      />
                    </div>

                    {/* Complete Button */}
                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSetComplete(ex.id, set.id)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                          set.completed
                            ? 'bg-lime-neon text-slate-900 shadow-md shadow-lime-neon/20'
                            : 'bg-slate-card-light text-slate-400 hover:text-slate-100 border border-border hover:border-slate-500'
                        }`}
                        title={set.completed ? 'Desmarcar série' : 'Concluir série (inicia descanso)'}
                      >
                        <Check className={`h-4 w-4 stroke-[3] ${set.completed ? 'text-slate-900' : ''}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Set Actions: Add Set or Remove Last */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleAddSet(ex.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-neon hover:text-lime-neon-hover py-1.5 px-3 rounded-xl bg-lime-neon/10 hover:bg-lime-neon/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" /> Adicionar Série
                </button>

                {ex.sets.length > 1 && (
                  <button
                    onClick={() => handleRemoveSet(ex.id, ex.sets[ex.sets.length - 1].id)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-danger transition-colors py-1 px-2"
                  >
                    Remover última série
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Another Exercise Button */}
        {exercises.length > 0 && (
          <button
            onClick={() => setIsAddExerciseModalOpen(true)}
            className="w-full py-4 rounded-3xl bg-slate-card hover:bg-slate-card-light/70 border border-border border-dashed text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 text-lime-neon stroke-[3]" /> Adicionar Exercício
          </button>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-bg/95 backdrop-blur-lg border-t border-border p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {!isWorkoutStarted ? (
            <button
              onClick={() => {
                if (exercises.length === 0) {
                  alert('Adicione ao menos um exercício antes de iniciar o cronômetro.');
                  return;
                }
                setIsWorkoutStarted(true);
              }}
              className="w-full py-4 px-6 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-black text-sm shadow-xl shadow-lime-neon/25 flex items-center justify-center gap-2.5 transition-all active:scale-95 tracking-wide"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Começar Treino (Iniciar Cronômetro)</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsRestTimerOpen(true)}
                className="p-3.5 rounded-2xl bg-slate-card border border-border text-slate-300 hover:text-lime-neon transition-colors flex items-center gap-2 text-xs font-bold"
                title="Abrir Cronômetro de Descanso"
              >
                <Clock className="h-5 w-5 text-lime-neon" />
                <span className="hidden xs:inline">Descanso</span>
              </button>

              <button
                onClick={handleFinishWorkout}
                disabled={isFinishing || completedSetsCount === 0}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold text-sm shadow-xl shadow-lime-neon/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
              >
                {isFinishing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando Treino...
                  </span>
                ) : (
                  <>
                    <Award className="h-5 w-5" /> Finalizar Treino ({completedSetsCount} séries)
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Rest Timer Modal */}
      <RestTimerModal
        isOpen={isRestTimerOpen}
        initialSeconds={restDuration}
        onClose={() => setIsRestTimerOpen(false)}
        onTimerComplete={() => {
          // optional notification
        }}
      />

      {/* Modal: Add Exercise Selector */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-card border border-border rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-lime-neon" /> Escolher Exercício
              </h2>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-100 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome (ex: Supino, Agachamento)..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full bg-slate-bg border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-lime-neon transition-colors"
              />
            </div>

            {/* Muscle Filter Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {['Todos', ...MUSCLE_GROUPS].map((mg) => (
                <button
                  key={mg}
                  onClick={() => setFilterMuscle(mg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterMuscle === mg
                      ? 'bg-lime-neon text-slate-900 font-bold'
                      : 'bg-slate-card-light text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mg}
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 mt-1">
              {loadingAvailableExercises ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando exercícios...</div>
              ) : (
                availableExercises
                  .filter((ex) => {
                    const matchesSearch = ex.nomeExercicio.toLowerCase().includes(exerciseSearch.toLowerCase());
                    const matchesMuscle = filterMuscle === 'Todos' || ex.muscleGroup === filterMuscle;
                    return matchesSearch && matchesMuscle;
                  })
                  .map((ex) => {
                    const past = latestLogsCache[ex.id];
                    return (
                      <div
                        key={ex.id}
                        className="w-full p-2.5 rounded-2xl bg-slate-card-light/50 hover:bg-slate-card-light border border-border/50 hover:border-lime-neon/40 flex items-center justify-between transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleAddExerciseToWorkout(ex)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0 pr-2"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-border/60 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {ex.thumbnailUrl ? (
                              <img src={ex.thumbnailUrl} alt={ex.nomeExercicio} className="w-full h-full object-cover" />
                            ) : (
                              <Dumbbell className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-100 group-hover:text-lime-neon transition-colors truncate">
                              {ex.nomeExercicio}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {ex.muscleGroup} {past ? `• Último: ${past.cargaKg}kg × ${past.reps}` : ''}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenExerciseGuide(ex);
                            }}
                            className="p-2 rounded-xl bg-lime-neon/10 hover:bg-lime-neon text-lime-neon hover:text-slate-900 transition-colors border border-lime-neon/20 hover:border-lime-neon shadow-sm"
                            title="Ver execução (GIF e instruções)"
                            aria-label="Ver demonstração do exercício"
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddExerciseToWorkout(ex)}
                            className="p-2 rounded-xl bg-slate-card hover:bg-lime-neon text-slate-400 hover:text-slate-900 border border-border hover:border-lime-neon transition-colors"
                            title="Adicionar ao treino"
                            aria-label="Adicionar exercício ao treino"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {isDiscardConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-card border border-border rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto border border-danger/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Descartar treino em andamento?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todas as séries e dados marcados nesta sessão serão excluídos e não poderão ser recuperados.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsDiscardConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 text-xs font-semibold border border-border transition-colors"
              >
                Continuar Treinando
              </button>
              <button
                onClick={handleDiscardWorkout}
                className="flex-1 py-2.5 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold transition-colors"
              >
                Sim, Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration & Summary Modal */}
      {isCelebrationOpen && completedWorkoutStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-card border border-border rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center relative overflow-hidden space-y-5">
            {/* Glow background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-lime-neon/15 blur-3xl pointer-events-none rounded-full" />

            {/* Trophy Icon */}
            <div className="relative z-10 w-16 h-16 rounded-3xl bg-lime-neon/15 border border-lime-neon/30 text-lime-neon flex items-center justify-center mx-auto shadow-lg shadow-lime-neon/20">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>

            <div className="relative z-10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-lime-neon">
                Missão Cumprida!
              </span>
              <h2 className="text-2xl font-black text-slate-100">Treino Concluído!</h2>
              <p className="text-xs text-slate-400">
                Seus registros e cargas foram sincronizados com sucesso no seu perfil.
              </p>
            </div>

            {/* Workout Performance Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-card-light/60 border border-border/40 rounded-2xl p-3">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Duração</span>
                <span className="text-sm font-black text-slate-100 font-mono">
                  {formatDuration(completedWorkoutStats.durationSecs)}
                </span>
              </div>

              <div className="bg-slate-card-light/60 border border-border/40 rounded-2xl p-3">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Volume</span>
                <span className="text-sm font-black text-lime-neon font-mono">
                  {completedWorkoutStats.volumeKg.toLocaleString('pt-BR')}kg
                </span>
              </div>

              <div className="bg-slate-card-light/60 border border-border/40 rounded-2xl p-3">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Séries</span>
                <span className="text-sm font-black text-slate-100 font-mono">
                  {completedWorkoutStats.totalSets}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="relative z-10 space-y-2 pt-2">
              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full py-3.5 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold text-xs shadow-lg shadow-lime-neon/20 transition-all active:scale-95"
              >
                Ver no Dashboard
              </button>
              <button
                onClick={() => router.replace('/strength')}
                className="w-full py-2.5 rounded-2xl bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 font-bold text-xs border border-border transition-colors"
              >
                Ver Histórico de Cargas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exercise Demonstration (GIF + Descrição) */}
      {exerciseGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-card border border-border rounded-3xl p-5 shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/50 pb-3">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-lime-neon/10 text-lime-neon">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm truncate">
                    {exerciseGuideModal.nomeExercicio}
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-lime-neon uppercase tracking-wider block">
                  {exerciseGuideModal.muscleGroup}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExerciseGuideModal(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-card-light transition-colors"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Media / GIF Container */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/80 flex items-center justify-center min-h-[200px] max-h-72">
              {exerciseGuideModal.gifUrl ? (
                <img
                  src={exerciseGuideModal.gifUrl}
                  alt={`Execução de ${exerciseGuideModal.nomeExercicio}`}
                  className="w-full h-full object-contain max-h-72"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (exerciseGuideModal.thumbnailUrl && target.src !== exerciseGuideModal.thumbnailUrl) {
                      target.src = exerciseGuideModal.thumbnailUrl;
                    }
                  }}
                />
              ) : exerciseGuideModal.thumbnailUrl ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                  <img
                    src={exerciseGuideModal.thumbnailUrl}
                    alt={exerciseGuideModal.nomeExercicio}
                    className="w-full h-44 object-contain"
                  />
                  <span className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-border/60">
                    Prévia Estática (GIF em breve)
                  </span>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-lime-neon/10 text-lime-neon flex items-center justify-center mx-auto border border-lime-neon/20">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">Animação em breve</p>
                  <p className="text-[10px] text-slate-500">
                    O GIF demonstrativo deste exercício será disponibilizado em breve.
                  </p>
                </div>
              )}
            </div>

            {/* Description / Instructions (only shown if provided) */}
            {exerciseGuideModal.description ? (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Info className="h-3.5 w-3.5 text-lime-neon shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    Como Executar:
                  </span>
                </div>
                <div className="bg-slate-card-light/40 border border-border/40 p-3 rounded-2xl text-xs text-slate-300 leading-relaxed">
                  {exerciseGuideModal.description}
                </div>
              </div>
            ) : null}

            {/* Close Button */}
            <div className="border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => setExerciseGuideModal(null)}
                className="w-full py-3 rounded-2xl bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold text-xs shadow-lg shadow-lime-neon/20 transition-all active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Carregando treino...</div>}>
      <ActiveWorkoutComponent />
    </Suspense>
  );
}

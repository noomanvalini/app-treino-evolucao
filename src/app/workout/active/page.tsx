'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePalette } from '@/context/PaletteContext';
import {
  PREDEFINED_EXERCISES,
  MUSCLE_GROUPS,
  getExerciseGuide,
  normalizeExerciseName,
  resolveExerciseMigration
} from '@/data/exercises';
import { fetchAndEnsureSavedWorkouts } from '@/data/defaultWorkouts';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Check,
  Dumbbell,
  Clock,
  Flame,
  AlertCircle,
  ChevronRight,
  X,
  Search,
  Sparkles,
  Loader2,
  Info,
  Bookmark,
  FolderDown,
  Save,
  Trophy,
  Pencil
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

interface SavedWorkoutTemplate {
  id: string;
  userId: string;
  title: string;
  muscleGroups: string[];
  exercises: {
    exerciseId: string;
    nomeExercicio: string;
    muscleGroup: string;
    thumbnailUrl?: string;
    gifUrl?: string;
    description?: string;
    sets: {
      setNumber: number;
      cargaKg: number | '';
      reps: number | '';
    }[];
  }[];
  createdAt?: any;
}

interface AvailableExercise {
  id: string;
  nomeExercicio: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
}

const REST_PRESETS = [
  { label: '1:00', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '3:00', seconds: 180 }
];

function ActiveWorkoutComponent() {
  const { user, loading: authLoading } = useAuth();
  const { isContrast } = usePalette();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Workout Metadata
  const [workoutTitle, setWorkoutTitle] = useState('Treino de Hoje');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Accurate wall-clock timing states & refs
  const accumulatedSecondsRef = useRef(0);
  const lastResumeTimeRef = useRef<number | null>(null);
  const isWorkoutStartedRef = useRef(false);
  const isTimerPausedRef = useRef(false);
  const isFinishedRef = useRef(false);
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);

  // Inline Rest Timer State (Floating Dock Pill instead of blocking modal)
  const [restDuration, setRestDuration] = useState(90);
  const [isRestActive, setIsRestActive] = useState(false);
  const [restRemainingSecs, setRestRemainingSecs] = useState(90);
  const restEndTimeRef = useRef<number | null>(null);

  // Add Exercise Modal State
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<AvailableExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string>('Todos');
  const [loadingAvailableExercises, setLoadingAvailableExercises] = useState(false);

  // Latest Logs Cache for smart auto-fill and PR detection
  const [latestLogsCache, setLatestLogsCache] = useState<
    Record<string, { cargaKg: number; reps: number; best1RM?: number }>
  >({});

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

  // Save Workout Template Modal State
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Load Workout Template Modal State
  const [isLoadTemplateModalOpen, setIsLoadTemplateModalOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedWorkoutTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null as string | null);

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
      gifUrl: guide.gifUrl || exercise.gifUrl,
      thumbnailUrl: guide.thumbnailUrl || exercise.thumbnailUrl,
      description: exercise.description || guide.description
    });
  };

  // Timer Interval Reference
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key
  const storageKey = user ? `clipzbody_active_workout_${user.uid}` : null;

  // Helper: calculate 1RM using Brzycki formula
  const calculate1RM = (cargaKg: number, repsCount: number) => {
    if (repsCount <= 0) return 0;
    if (repsCount === 1) return cargaKg;
    return cargaKg * (1 + repsCount / 30);
  };

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
            if (parsed && (parsed.isCompleted || parsed.isFinished)) {
              localStorage.removeItem(storageKey);
            } else if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
              const now = Date.now();
              const lastSaved = parsed.lastSavedAt || parsed.lastResumeTime || now;
              const diffFromSave = Math.floor((now - lastSaved) / 1000);

              // Auto-discard abandoned workouts older than 18 hours
              if (diffFromSave >= 64800) {
                localStorage.removeItem(storageKey);
              } else {
                setWorkoutTitle(parsed.title || 'Treino de Hoje');
                setExercises(parsed.exercises);

                const firstIncomplete = parsed.exercises.find((ex: ActiveExercise) =>
                  ex.sets.some((s) => !s.completed)
                );
                setActiveExerciseId(
                  firstIncomplete ? firstIncomplete.id : parsed.exercises[0]?.id || null
                );

                if (typeof parsed.restDuration === 'number' && parsed.restDuration > 0) {
                  setRestDuration(parsed.restDuration);
                }

                const isStarted = !!parsed.isWorkoutStarted;
                setIsWorkoutStarted(isStarted);
                isWorkoutStartedRef.current = isStarted;

                const isPaused = !!parsed.isTimerPaused;
                setIsTimerPaused(isPaused);
                isTimerPausedRef.current = isPaused;

                const acc =
                  typeof parsed.accumulatedSeconds === 'number'
                    ? parsed.accumulatedSeconds
                    : parsed.elapsedSeconds || 0;
                accumulatedSecondsRef.current = acc;

                if (isStarted && !isPaused && parsed.lastResumeTime) {
                  lastResumeTimeRef.current = parsed.lastResumeTime;
                  const currentSecs =
                    acc + Math.max(0, Math.floor((now - parsed.lastResumeTime) / 1000));
                  setElapsedSeconds(currentSecs);
                } else {
                  lastResumeTimeRef.current = null;
                  setElapsedSeconds(acc);
                }

                setIsInitialized(true);
                return;
              }
            }
          }
        } catch (e) {
          console.error('Error loading workout from localStorage:', e);
        }
      }

      // If no saved workout, check URL params for initial preset or templateId
      const templateIdParam = searchParams.get('templateId');
      const presetGroup = searchParams.get('preset');
      const initialTitle = presetGroup ? `Treino: ${presetGroup}` : 'Treino do Dia';
      setWorkoutTitle(initialTitle);
      setElapsedSeconds(0);
      accumulatedSecondsRef.current = 0;
      lastResumeTimeRef.current = null;
      setIsTimerPaused(false);
      isTimerPausedRef.current = false;
      setIsWorkoutStarted(false);
      isWorkoutStartedRef.current = false;
      setExercises([]);
      setIsInitialized(true);

      if (templateIdParam && user) {
        fetchAndEnsureSavedWorkouts(user.uid)
          .then((templates) => {
            const matched = templates.find(
              (t) => t.id === templateIdParam || t.defaultKey === templateIdParam
            );
            if (matched) {
              setWorkoutTitle(matched.title);
              const reconstructed: ActiveExercise[] = matched.exercises.map((savedEx, idx) => {
                const guide = getExerciseGuide({
                  id: savedEx.exerciseId,
                  name: savedEx.nomeExercicio
                });
                const setsData =
                  Array.isArray(savedEx.sets) && savedEx.sets.length > 0
                    ? savedEx.sets
                    : [
                        { setNumber: 1, cargaKg: '', reps: 10 },
                        { setNumber: 2, cargaKg: '', reps: 10 },
                        { setNumber: 3, cargaKg: '', reps: 10 }
                      ];
                return {
                  id: `ex_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
                  exerciseId: savedEx.exerciseId,
                  nomeExercicio: guide.nome || savedEx.nomeExercicio,
                  muscleGroup: savedEx.muscleGroup || guide.muscleGroup || '',
                  thumbnailUrl: guide.thumbnailUrl || savedEx.thumbnailUrl,
                  gifUrl: guide.gifUrl || savedEx.gifUrl,
                  description: savedEx.description || guide.description,
                  sets: setsData.map((s, sIdx) => ({
                    id: `set_${idx}_${sIdx}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                    setNumber: s.setNumber || sIdx + 1,
                    cargaKg: typeof s.cargaKg === 'number' ? s.cargaKg : '',
                    reps: typeof s.reps === 'number' ? s.reps : '',
                    completed: false
                  }))
                };
              });
              setExercises(reconstructed);
              if (reconstructed.length > 0) {
                setActiveExerciseId(reconstructed[0].id);
              }
            }
          })
          .catch((e) => console.error('Error auto-loading template from URL:', e));
      }
    }
  }, [user, authLoading, storageKey, router, searchParams]);

  // 2. Fetch available exercises and user's past logs for auto-complete
  useEffect(() => {
    if (!user) return;

    const fetchExercisesAndLogs = async () => {
      setLoadingAvailableExercises(true);
      try {
        // Preview mode fallback
        if (user.uid === 'preview_user_uid') {
          const predefinedList: AvailableExercise[] = PREDEFINED_EXERCISES.map((pe) => ({
            id: pe.id,
            nomeExercicio: pe.nome,
            muscleGroup: pe.muscleGroup,
            thumbnailUrl: pe.thumbnailUrl,
            gifUrl: pe.gifUrl,
            description: pe.description
          }));
          setAvailableExercises(predefinedList);
          const previewCache: Record<string, { cargaKg: number; reps: number; best1RM?: number }> = {
            pre_supino_reto_barra: { cargaKg: 84, reps: 8, best1RM: 102.5 },
            pre_supino_inclinado_halteres: { cargaKg: 32, reps: 10, best1RM: 42.6 },
            pre_peck_deck: { cargaKg: 65, reps: 12, best1RM: 91.0 },
            pre_overhead_press: { cargaKg: 50, reps: 8, best1RM: 63.3 },
            pre_lateral_raise: { cargaKg: 14, reps: 12, best1RM: 19.6 },
            pre_triceps_pulley_corda: { cargaKg: 35, reps: 10, best1RM: 46.6 },
            pre_triceps_testa_barra_w: { cargaKg: 30, reps: 10, best1RM: 40.0 }
          };
          setLatestLogsCache(previewCache);
          setExercises((prev) =>
            prev.map((ex) => {
              const past = previewCache[ex.exerciseId];
              if (!past) return ex;
              const prevRef = `${past.cargaKg}kg × ${past.reps}`;
              return {
                ...ex,
                sets: ex.sets.map((s) => ({
                  ...s,
                  previousRef: s.previousRef || prevRef,
                  cargaKg: s.cargaKg === '' ? past.cargaKg : s.cargaKg,
                  reps: s.reps === '' ? past.reps : s.reps
                }))
              };
            })
          );
          setLoadingAvailableExercises(false);
          return;
        }

        // Fetch custom exercises
        const exQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
        const exSnap = await getDocs(exQuery);
        const customList: AvailableExercise[] = [];
        const docToPredefinedId: Record<string, string> = {};

        const hasAlternadoDoc = exSnap.docs.some(
          (d) => normalizeExerciseName(d.data().nomeExercicio || '') === 'alternado'
        );

        exSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const rawNorm = normalizeExerciseName(d.nomeExercicio || '');
          if (hasAlternadoDoc && rawNorm === 'rosca alternada') {
            deleteDoc(docSnap.ref).catch(console.error);
            return;
          }

          const migration = resolveExerciseMigration({
            nomeExercicio: d.nomeExercicio,
            predefinedId: d.predefinedId,
            migratedV2: d.migratedV2
          });

          if (migration.shouldDelete) {
            deleteDoc(docSnap.ref).catch(console.error);
            return;
          }

          let currentName = d.nomeExercicio;
          let currentPredefinedId = d.predefinedId;

          if (migration.newName || migration.newPredefinedId) {
            currentName = migration.newName || currentName;
            currentPredefinedId = migration.newPredefinedId || currentPredefinedId;
            const updatePayload: Record<string, any> = {
              nomeExercicio: currentName
            };
            if (currentPredefinedId) updatePayload.predefinedId = currentPredefinedId;
            if (migration.markMigratedV2) updatePayload.migratedV2 = true;
            updateDoc(docSnap.ref, updatePayload).catch(console.error);
          }

          const guide = getExerciseGuide({
            id: currentPredefinedId || docSnap.id,
            name: currentName
          });
          if (currentPredefinedId) {
            docToPredefinedId[docSnap.id] = currentPredefinedId;
          }
          customList.push({
            id: docSnap.id,
            nomeExercicio: currentName,
            muscleGroup: d.muscleGroup,
            thumbnailUrl: guide.thumbnailUrl || d.thumbnailUrl,
            gifUrl: guide.gifUrl || d.gifUrl,
            description: guide.description || d.description
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
        const unique = combined.filter(
          (v, i, a) =>
            a.findIndex(
              (t) => normalizeExerciseName(t.nomeExercicio) === normalizeExerciseName(v.nomeExercicio)
            ) === i
        );
        unique.sort((a, b) => a.nomeExercicio.localeCompare(b.nomeExercicio));
        setAvailableExercises(unique);

        // Fetch recent strength logs to have past reference loads
        const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
        const logsSnap = await getDocs(logsQuery);
        const latestMap: Record<
          string,
          { cargaKg: number; reps: number; timestamp: number; best1RM: number }
        > = {};

        logsSnap.forEach((d) => {
          const data = d.data();
          const t = data.data?.seconds ? data.data.seconds * 1000 : new Date(data.data).getTime();
          const exId = data.exerciseId;
          const oneRm = data.oneRmCalculado || calculate1RM(data.cargaKg || 0, data.reps || 0);
          if (!latestMap[exId] || t > latestMap[exId].timestamp) {
            latestMap[exId] = {
              cargaKg: data.cargaKg,
              reps: data.reps,
              timestamp: t,
              best1RM: Math.max(oneRm, latestMap[exId]?.best1RM || 0)
            };
          } else if (oneRm > latestMap[exId].best1RM) {
            latestMap[exId].best1RM = oneRm;
          }

          const mappedPredefined = docToPredefinedId[exId];
          if (mappedPredefined) {
            if (!latestMap[mappedPredefined] || t > latestMap[mappedPredefined].timestamp) {
              latestMap[mappedPredefined] = {
                cargaKg: data.cargaKg,
                reps: data.reps,
                timestamp: t,
                best1RM: Math.max(oneRm, latestMap[mappedPredefined]?.best1RM || 0)
              };
            } else if (oneRm > latestMap[mappedPredefined].best1RM) {
              latestMap[mappedPredefined].best1RM = oneRm;
            }
          }
        });

        const cleanMap: Record<string, { cargaKg: number; reps: number; best1RM?: number }> = {};
        Object.entries(latestMap).forEach(([k, v]) => {
          cleanMap[k] = { cargaKg: v.cargaKg, reps: v.reps, best1RM: v.best1RM };
        });
        setLatestLogsCache(cleanMap);

        // Enrich any pre-loaded template exercises with previousRef & past load if empty
        setExercises((prev) =>
          prev.map((ex) => {
            const past = cleanMap[ex.exerciseId];
            if (!past) return ex;
            const prevRef = `${past.cargaKg}kg × ${past.reps}`;
            return {
              ...ex,
              sets: ex.sets.map((s) => ({
                ...s,
                previousRef: s.previousRef || prevRef,
                cargaKg: s.cargaKg === '' ? past.cargaKg : s.cargaKg
              }))
            };
          })
        );
      } catch (err) {
        console.error('Error loading exercises/logs:', err);
      } finally {
        setLoadingAvailableExercises(false);
      }
    };

    fetchExercisesAndLogs();
  }, [user]);

  // 3. Workout Duration Timer (Wall-clock accurate with background resilience)
  useEffect(() => {
    if (
      !isInitialized ||
      !isWorkoutStarted ||
      isTimerPaused ||
      isWorkoutCompleted ||
      isFinishedRef.current
    ) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (!lastResumeTimeRef.current) {
      lastResumeTimeRef.current = Date.now();
    }

    const updateTimer = () => {
      if (isFinishedRef.current || !isWorkoutStartedRef.current || isTimerPausedRef.current) return;
      const now = Date.now();
      const resume = lastResumeTimeRef.current || now;
      const currentSecs =
        accumulatedSecondsRef.current + Math.max(0, Math.floor((now - resume) / 1000));
      setElapsedSeconds(currentSecs);
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isInitialized, isWorkoutStarted, isTimerPaused, isWorkoutCompleted]);

  // 3b. Inline Rest Timer Countdown
  useEffect(() => {
    if (!isRestActive) return;

    if (!restEndTimeRef.current) {
      restEndTimeRef.current = Date.now() + restRemainingSecs * 1000;
    }

    const tick = () => {
      if (!restEndTimeRef.current) return;
      const diff = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000));
      setRestRemainingSecs(diff);
      if (diff <= 0) {
        restEndTimeRef.current = null;
        setIsRestActive(false);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isRestActive]);

  const startInlineRestTimer = (durationSecs = restDuration) => {
    restEndTimeRef.current = Date.now() + durationSecs * 1000;
    setRestRemainingSecs(durationSecs);
    setIsRestActive(true);
  };

  const handleAddRestSeconds = (extraSecs: number) => {
    if (restEndTimeRef.current) {
      restEndTimeRef.current += extraSecs * 1000;
    } else {
      restEndTimeRef.current = Date.now() + (restRemainingSecs + extraSecs) * 1000;
    }
    setRestRemainingSecs((prev) => prev + extraSecs);
  };

  const handleSkipRestTimer = () => {
    restEndTimeRef.current = null;
    setIsRestActive(false);
  };

  // 4. Save to localStorage continuously
  useEffect(() => {
    if (!isInitialized || !storageKey) return;
    if (isFinishedRef.current || isWorkoutCompleted) return;

    if (exercises.length === 0 && !isWorkoutStarted) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Error clearing empty workout from localStorage:', e);
      }
      return;
    }

    try {
      const payload = {
        title: workoutTitle,
        elapsedSeconds,
        accumulatedSeconds: accumulatedSecondsRef.current,
        lastResumeTime: lastResumeTimeRef.current,
        isTimerPaused,
        isWorkoutStarted,
        restDuration,
        isCompleted: false,
        lastSavedAt: Date.now(),
        exercises
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving workout to localStorage:', e);
    }
  }, [
    isInitialized,
    storageKey,
    workoutTitle,
    elapsedSeconds,
    isTimerPaused,
    isWorkoutStarted,
    restDuration,
    exercises,
    isWorkoutCompleted
  ]);

  // Helper: format duration hh:mm:ss or mm:ss
  const formatTimerHud = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const formatRestTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
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
          reps: past ? past.reps : 10,
          completed: false,
          previousRef: prevRef
        },
        {
          id: `set_2_${Date.now()}`,
          setNumber: 2,
          cargaKg: past ? past.cargaKg : '',
          reps: past ? past.reps : 10,
          completed: false,
          previousRef: prevRef
        },
        {
          id: `set_3_${Date.now()}`,
          setNumber: 3,
          cargaKg: past ? past.cargaKg : '',
          reps: past ? past.reps : 10,
          completed: false,
          previousRef: prevRef
        }
      ]
    };

    setExercises((prev) => [...prev, newExercise]);
    setActiveExerciseId(newExercise.id);
    setIsAddExerciseModalOpen(false);
  };

  const handleRemoveExercise = (exerciseInstanceId: string) => {
    setExercises((prev) => {
      const remaining = prev.filter((ex) => ex.id !== exerciseInstanceId);
      if (activeExerciseId === exerciseInstanceId) {
        const nextIncomplete = remaining.find((ex) => ex.sets.some((s) => !s.completed));
        setActiveExerciseId(nextIncomplete ? nextIncomplete.id : remaining[0]?.id || null);
      }
      return remaining;
    });
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
          reps: lastSet ? lastSet.reps : 10,
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
    // Auto-start workout timer if user checks a set while workout hasn't started yet
    if (!isWorkoutStartedRef.current) {
      const now = Date.now();
      accumulatedSecondsRef.current = 0;
      lastResumeTimeRef.current = now;
      isWorkoutStartedRef.current = true;
      isTimerPausedRef.current = false;
      setIsWorkoutStarted(true);
      setIsTimerPaused(false);
    }

    let justCompleted = false;
    let nextActiveExerciseIdToSet: string | null | undefined = undefined;

    setExercises((prev) => {
      const updated = prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const newSets = ex.sets.map((s) => {
          if (s.id === setId) {
            const nextVal = !s.completed;
            if (nextVal) justCompleted = true;
            return { ...s, completed: nextVal };
          }
          return s;
        });
        return { ...ex, sets: newSets };
      });

      // Check if the current exercise just had its final set completed:
      // If so, auto-minimize it and expand the next incomplete exercise!
      const targetEx = updated.find((ex) => ex.id === exerciseInstanceId);
      if (targetEx && justCompleted && targetEx.sets.every((s) => s.completed)) {
        const currentIndex = updated.findIndex((ex) => ex.id === exerciseInstanceId);
        const nextIncompleteAfter = updated
          .slice(currentIndex + 1)
          .find((ex) => ex.sets.some((s) => !s.completed));
        const anyIncomplete = updated.find((ex) => ex.sets.some((s) => !s.completed));
        nextActiveExerciseIdToSet = nextIncompleteAfter
          ? nextIncompleteAfter.id
          : anyIncomplete
          ? anyIncomplete.id
          : null;
      }

      return updated;
    });

    if (nextActiveExerciseIdToSet !== undefined) {
      setActiveExerciseId(nextActiveExerciseIdToSet);
    }

    if (justCompleted) {
      startInlineRestTimer(restDuration);
    }
  };

  // --- WORKOUT TOTAL STATS ---
  let totalSetsCount = 0;
  let completedSetsCount = 0;
  let totalVolumeKg = 0;
  let completedExercisesCount = 0;

  exercises.forEach((ex) => {
    const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
    if (allDone) completedExercisesCount++;
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

  const progressPercent =
    totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  // --- TIMER ACTIONS ---
  const handleStartWorkout = () => {
    if (exercises.length === 0) {
      setIsAddExerciseModalOpen(true);
      return;
    }
    const now = Date.now();
    accumulatedSecondsRef.current = 0;
    lastResumeTimeRef.current = now;
    isWorkoutStartedRef.current = true;
    isTimerPausedRef.current = false;
    setIsWorkoutStarted(true);
    setIsTimerPaused(false);
    setElapsedSeconds(0);

    const firstIncomplete = exercises.find((ex) => ex.sets.some((s) => !s.completed));
    if (firstIncomplete) {
      setActiveExerciseId(firstIncomplete.id);
    }
  };

  const handleTogglePause = () => {
    const nextPaused = !isTimerPaused;
    const now = Date.now();

    if (nextPaused) {
      if (lastResumeTimeRef.current) {
        accumulatedSecondsRef.current += Math.max(
          0,
          Math.floor((now - lastResumeTimeRef.current) / 1000)
        );
      }
      lastResumeTimeRef.current = null;
      setElapsedSeconds(accumulatedSecondsRef.current);
    } else {
      lastResumeTimeRef.current = now;
    }

    isTimerPausedRef.current = nextPaused;
    setIsTimerPaused(nextPaused);
  };

  // --- FINISH WORKOUT ACTION ---
  const handleFinishWorkout = async () => {
    if (!user) return;

    if (completedSetsCount === 0) {
      alert('Marque ao menos uma série como concluída (✓) para finalizar o treino.');
      return;
    }

    setIsFinishing(true);
    try {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      isFinishedRef.current = true;
      setIsWorkoutCompleted(true);
      handleSkipRestTimer();

      const now = new Date();
      const sessionId = `workout_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`;
      const finalDuration = elapsedSeconds;

      if (user.uid !== 'preview_user_uid') {
        const logPromises: Promise<any>[] = [];
        exercises.forEach((ex) => {
          const validSets = ex.sets.filter(
            (s) =>
              s.completed &&
              typeof s.cargaKg === 'number' &&
              s.cargaKg > 0 &&
              typeof s.reps === 'number' &&
              s.reps > 0
          );
          if (validSets.length === 0) return;

          const sortedSets = [...validSets].sort((a, b) => {
            const oneRmA = calculate1RM(a.cargaKg as number, a.reps as number);
            const oneRmB = calculate1RM(b.cargaKg as number, b.reps as number);
            if (oneRmB !== oneRmA) return oneRmB - oneRmA;
            return (b.cargaKg as number) - (a.cargaKg as number);
          });

          const peakSet = sortedSets[0];
          const peakOneRm = calculate1RM(peakSet.cargaKg as number, peakSet.reps as number);

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

        await addDoc(collection(db, 'workout_sessions'), {
          userId: user.uid,
          sessionId: sessionId,
          title: workoutTitle,
          durationSeconds: finalDuration,
          totalVolumeKg: totalVolumeKg,
          completedSetsCount: completedSetsCount,
          exercisesCount: exercises.length,
          exerciseNames: exercises.map((e) => e.nomeExercicio),
          data: now
        });
      }

      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      setExercises([]);

      setCompletedWorkoutStats({
        durationSecs: finalDuration,
        volumeKg: totalVolumeKg,
        totalSets: completedSetsCount,
        exerciseCount: exercises.length
      });
      setIsCelebrationOpen(true);
    } catch (err) {
      console.error('Error saving finished workout:', err);
      isFinishedRef.current = false;
      setIsWorkoutCompleted(false);
      alert('Houve um erro ao salvar o treino. Tente novamente.');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDiscardWorkout = () => {
    isFinishedRef.current = true;
    setIsWorkoutCompleted(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setExercises([]);
    router.replace('/dashboard');
  };

  // --- TEMPLATE ACTIONS ---
  const handleOpenSaveTemplateModal = () => {
    if (exercises.length === 0) {
      alert('Adicione ao menos um exercício antes de salvar o treino.');
      return;
    }
    setTemplateNameInput(workoutTitle || 'Treino do Dia');
    const detected = Array.from(new Set(exercises.map((e) => e.muscleGroup).filter(Boolean)));
    setSelectedMuscleGroups(detected.length > 0 ? detected : ['Peito']);
    setSaveSuccessMessage(null);
    setIsSaveTemplateModalOpen(true);
  };

  const handleToggleMuscleGroup = (mg: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
    );
  };

  const handleSaveTemplate = async () => {
    if (!user) return;
    if (!templateNameInput.trim()) {
      alert('Por favor, informe o nome do treino.');
      return;
    }
    if (selectedMuscleGroups.length === 0) {
      alert('Selecione ao menos um grupo muscular.');
      return;
    }
    if (exercises.length === 0) {
      alert('Adicione ao menos um exercício antes de salvar o treino.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const templateData = {
        userId: user.uid,
        title: templateNameInput.trim(),
        muscleGroups: selectedMuscleGroups,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          nomeExercicio: ex.nomeExercicio,
          muscleGroup: ex.muscleGroup,
          thumbnailUrl: ex.thumbnailUrl || '',
          gifUrl: ex.gifUrl || '',
          description: ex.description || '',
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            cargaKg: typeof s.cargaKg === 'number' ? s.cargaKg : '',
            reps: typeof s.reps === 'number' ? s.reps : ''
          }))
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (user.uid !== 'preview_user_uid') {
        await addDoc(collection(db, 'saved_workouts'), templateData);
      }
      setWorkoutTitle(templateNameInput.trim());
      setSaveSuccessMessage('Treino salvo com sucesso!');
      setTimeout(() => {
        setIsSaveTemplateModalOpen(false);
        setSaveSuccessMessage(null);
      }, 1000);
    } catch (err) {
      console.error('Error saving workout template:', err);
      alert('Houve um erro ao salvar o treino. Tente novamente.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleOpenLoadWorkoutModal = async () => {
    if (!user) return;
    setIsLoadTemplateModalOpen(true);
    setIsLoadingTemplates(true);
    try {
      const list = await fetchAndEnsureSavedWorkouts(user.uid);
      setSavedTemplates(list);
    } catch (err) {
      console.error('Error fetching saved workouts:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSelectTemplateToLoad = (template: SavedWorkoutTemplate) => {
    if (exercises.length > 0) {
      const confirmReplace = confirm(
        `Carregar "${template.title}" substituirá os exercícios atuais da tela. Deseja continuar?`
      );
      if (!confirmReplace) return;
    }

    setWorkoutTitle(template.title);

    const reconstructedExercises: ActiveExercise[] = template.exercises.map((savedEx, idx) => {
      const past = latestLogsCache[savedEx.exerciseId];
      const prevRef = past ? `${past.cargaKg}kg × ${past.reps}` : undefined;
      const guide = getExerciseGuide({ id: savedEx.exerciseId, name: savedEx.nomeExercicio });

      const setsData =
        Array.isArray(savedEx.sets) && savedEx.sets.length > 0
          ? savedEx.sets
          : [
              { setNumber: 1, cargaKg: '', reps: 10 },
              { setNumber: 2, cargaKg: '', reps: 10 },
              { setNumber: 3, cargaKg: '', reps: 10 }
            ];

      return {
        id: `ex_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        exerciseId: savedEx.exerciseId,
        nomeExercicio: guide.nome || savedEx.nomeExercicio,
        muscleGroup: savedEx.muscleGroup || guide.muscleGroup || '',
        thumbnailUrl: guide.thumbnailUrl || savedEx.thumbnailUrl,
        gifUrl: guide.gifUrl || savedEx.gifUrl,
        description: savedEx.description || guide.description,
        sets: setsData.map((s, sIdx) => {
          const finalCarga: number | '' =
            typeof s.cargaKg === 'number' ? s.cargaKg : past ? past.cargaKg : '';
          const finalReps: number | '' =
            typeof s.reps === 'number' ? s.reps : past ? past.reps : 10;
          return {
            id: `set_${idx}_${sIdx}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            setNumber: s.setNumber || sIdx + 1,
            cargaKg: finalCarga,
            reps: finalReps,
            completed: false,
            previousRef: prevRef
          };
        })
      };
    });

    setExercises(reconstructedExercises);
    setActiveExerciseId(reconstructedExercises[0]?.id || null);
    setIsWorkoutStarted(false);
    setIsTimerPaused(false);
    setElapsedSeconds(0);
    accumulatedSecondsRef.current = 0;
    lastResumeTimeRef.current = null;
    setIsLoadTemplateModalOpen(false);
  };

  const handleDeleteSavedTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este treino salvo?')) return;

    setDeletingTemplateId(templateId);
    try {
      await deleteDoc(doc(db, 'saved_workouts', templateId));
      setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      console.error('Error deleting saved workout:', err);
      alert('Erro ao excluir treino salvo.');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isContrast ? 'bg-[#0e0f07]' : 'bg-[#0D1117]'
      } text-[#f8fafc] pb-48 transition-colors`}
    >
      {/* TOP WORKOUT HUD (STICKY CONTEXT - Figma Node 30:1395, without minimize icon) */}
      <header
        className={`sticky top-0 z-30 -mx-4 -mt-6 backdrop-blur-[24px] ${
          isContrast ? 'bg-[rgba(14,15,7,0.95)]' : 'bg-[rgba(13,17,23,0.95)]'
        } px-[16px] py-[12px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]`}
      >
        <div className="max-w-md mx-auto flex flex-col gap-[10px]">
          <div className="flex items-center justify-between w-full gap-2">
            {/* Title + Edit Pencil + Live Monospace Timer */}
            <div className="flex flex-col gap-[2px] items-start min-w-0 flex-1">
              <div className="flex items-center gap-[6px] w-full">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingTitle(false);
                    }}
                    className={`${
                      isContrast
                        ? 'bg-[#151413] border-[#ffb95f]/50'
                        : 'bg-[#202017] border-[#d3e156]/50'
                    } text-[#f8fafc] font-bold text-[15px] leading-[20px] px-2 py-0.5 rounded-[6px] border focus:outline-none w-full max-w-[240px]`}
                    autoFocus
                  />
                ) : (
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="font-bold text-[#f8fafc] text-[15px] leading-[20px] truncate cursor-pointer"
                  >
                    {workoutTitle}
                  </h1>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setTimeout(() => titleInputRef.current?.focus(), 20);
                  }}
                  className="text-[#64748b] hover:text-[#f8fafc] transition-colors shrink-0 p-0.5"
                  title="Editar nome do treino"
                >
                  <Pencil className="w-[12px] h-[12px]" />
                </button>
              </div>

              {/* Live Monospace Tabular Timer (Figma Node 30:1408) */}
              <div className="flex items-center gap-[6px]">
                <span className="relative flex w-[8px] h-[8px] shrink-0">
                  {isWorkoutStarted && !isTimerPaused && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d3e156] opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full w-[8px] h-[8px] ${
                      isWorkoutStarted
                        ? isTimerPaused
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#d3e156]'
                        : 'bg-[#64748b]'
                    }`}
                  />
                </span>
                <span
                  className={`font-mono font-bold text-[12px] tracking-[0.6px] leading-[16px] ${
                    isContrast ? 'text-[#ffb95f]' : 'text-[#effe6f]'
                  }`}
                >
                  {formatTimerHud(elapsedSeconds)}
                </span>
                {isWorkoutStarted && (
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="text-[#64748b] hover:text-[#f8fafc] transition-colors"
                    title={isTimerPaused ? 'Retomar cronômetro' : 'Pausar cronômetro'}
                  >
                    {isTimerPaused ? (
                      <Play className="w-[11px] h-[11px] text-[#d3e156] fill-current" />
                    ) : (
                      <Pause className="w-[11px] h-[11px]" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Action: Descartar (Figma Node 30:1416) */}
            <div className="flex items-center gap-2 shrink-0">
              {!isWorkoutStarted && exercises.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenSaveTemplateModal}
                  className={`${
                    isContrast
                      ? 'bg-[#151413] hover:bg-[#1c1c13] text-[#ffb95f]'
                      : 'bg-[#202017] hover:bg-[#2a2b21] text-[#d3e156]'
                  } px-[8px] py-[4px] rounded-[4px] font-semibold text-[12px] leading-[16px] transition-colors flex items-center gap-1`}
                  title="Salvar esta ficha de treino"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Salvar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDiscardConfirmOpen(true)}
                className={`${
                  isContrast
                    ? 'bg-[#151413] hover:bg-[#1c1c13]'
                    : 'bg-[#202017] hover:bg-[#2a2b21]'
                } px-[8px] py-[4px] rounded-[4px] font-semibold text-[#ff6e61] text-[12px] leading-[16px] transition-colors`}
              >
                Descartar
              </button>
            </div>
          </div>

          {/* Workout Progress Bar (Figma Node 30:1418) */}
          <div className="flex flex-col gap-[4px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-[#64748b] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                PROGRESSO DO VOLUME
              </span>
              <span
                className={`font-mono font-bold text-[10px] tracking-[0.8px] uppercase leading-[14px] ${
                  isContrast ? 'text-[#f8fafc]' : 'text-[#d3e156]'
                }`}
              >
                {completedSetsCount} DE {totalSetsCount} SÉRIES ({progressPercent}%)
              </span>
            </div>
            <div
              className={`${
                isContrast ? 'bg-[#151413]' : 'bg-[#202017]'
              } h-[6px] w-full rounded-full overflow-hidden`}
            >
              <div
                className={`${
                  isContrast ? 'bg-white' : 'bg-[#d3e156]'
                } h-full rounded-full shadow-[0px_0px_12px_0px_rgba(211,225,86,0.6)] transition-all duration-300`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN WORKOUT CONTENT */}
      <main className="max-w-md mx-auto pt-[16px] space-y-[16px]">
        {/* Section - Métricas da sessão (2 Cards without Volume in kg - Figma Node 30:1190) */}
        <section className="grid grid-cols-2 gap-[8px] w-full">
          {/* Card 1: EXERCÍCIOS */}
          <div
            className={`${
              isContrast ? 'bg-black' : 'bg-[rgba(32,32,23,0.7)]'
            } p-[10px] rounded-[12px] flex flex-col items-start justify-between transition-colors`}
          >
            <div className="flex items-center gap-[4px]">
              <Dumbbell className="w-[10px] h-[10px] text-[#64748b]" />
              <span className="font-bold text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                EXERCÍCIOS
              </span>
            </div>
            <div className="pt-[4px] flex items-baseline gap-[3px]">
              <span
                className={`font-heading font-semibold text-[18px] tracking-[-0.45px] leading-[24px] ${
                  isContrast ? 'text-[#ffb95f]' : 'text-[#d3e156]'
                }`}
              >
                {completedExercisesCount}
              </span>
              <span className="font-heading font-semibold text-[#64748b] text-[13px] tracking-[-0.45px] leading-[24px]">
                / {exercises.length}
              </span>
            </div>
          </div>

          {/* Card 2: SÉRIES CONCLUÍDAS */}
          <div
            className={`${
              isContrast ? 'bg-black' : 'bg-[rgba(32,32,23,0.7)]'
            } p-[10px] rounded-[12px] flex flex-col items-start justify-between transition-colors`}
          >
            <div className="flex items-center gap-[4px]">
              <Flame className="w-[10px] h-[10px] text-[#64748b]" />
              <span className="font-bold text-[#64748b] text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                SÉRIES FEITAS
              </span>
            </div>
            <div className="pt-[4px] flex items-baseline gap-[3px]">
              <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.45px] leading-[24px]">
                {completedSetsCount}
              </span>
              <span className="font-heading font-semibold text-[#64748b] text-[13px] tracking-[-0.45px] leading-[24px]">
                / {totalSetsCount}
              </span>
            </div>
          </div>
        </section>

        {/* Empty State when starting a brand new workout from scratch */}
        {exercises.length === 0 && (
          <div
            className={`${
              isContrast
                ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))]'
                : 'bg-[#202017]'
            } rounded-[16px] p-[24px] text-center space-y-[12px] transition-colors`}
          >
            <div
              className={`w-[48px] h-[48px] rounded-[12px] ${
                isContrast
                  ? 'bg-[rgba(255,185,95,0.15)] text-[#ffb95f]'
                  : 'bg-[rgba(211,225,86,0.1)] text-[#d3e156]'
              } flex items-center justify-center mx-auto`}
            >
              <Dumbbell className="w-[24px] h-[24px]" />
            </div>
            <div className="space-y-[4px]">
              <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                Monte sua Ficha de Treino
              </h2>
              <p className="text-[12px] text-[#94a3b8] leading-[18px] max-w-xs mx-auto">
                Adicione o primeiro exercício abaixo ou carregue uma ficha salva para começar.
              </p>
            </div>
            <div className="pt-[4px] flex flex-col gap-[8px]">
              <button
                type="button"
                onClick={() => setIsAddExerciseModalOpen(true)}
                className={`${
                  isContrast
                    ? 'bg-[#ffb95f] hover:bg-[#f59e0b] text-[#151413]'
                    : 'bg-[#d3e156] hover:bg-[#c2cf46] text-[#202017]'
                } font-heading font-semibold text-[16px] uppercase tracking-[0.4px] py-[12px] px-[16px] rounded-full flex items-center justify-center gap-[8px] transition-transform active:scale-[0.98]`}
              >
                <Plus className="w-[16px] h-[16px] stroke-[2.5]" />
                <span>Adicionar Exercício</span>
              </button>
              <button
                type="button"
                onClick={handleOpenLoadWorkoutModal}
                className={`${
                  isContrast
                    ? 'bg-black hover:bg-[#1c1c13]'
                    : 'bg-[#2a2b21] hover:bg-[#323328]'
                } text-[#f8fafc] font-medium text-[12px] py-[10px] px-[16px] rounded-full flex items-center justify-center gap-[6px] transition-colors`}
              >
                <FolderDown
                  className={`w-[14px] h-[14px] ${
                    isContrast ? 'text-[#ffb95f]' : 'text-[#d3e156]'
                  }`}
                />
                <span>Carregar Ficha Salva</span>
              </button>
            </div>
          </div>
        )}

        {/* EXERCISE LIST STACK (Figma Node 30:1221 - 3 Smart Visual States) */}
        <div className="flex flex-col gap-[16px] w-full">
          {exercises.map((ex) => {
            const completedSetsInEx = ex.sets.filter((s) => s.completed).length;
            const isAllSetsCompleted = ex.sets.length > 0 && completedSetsInEx === ex.sets.length;
            const isActiveCard = activeExerciseId === ex.id;
            const past = latestLogsCache[ex.exerciseId];

            // 1. COMPLETED & MINIMIZED STATE (Figma Node 30:1322)
            if (isAllSetsCompleted && !isActiveCard) {
              // Detect if any set beat the historical PR load or 1RM
              const validCompleted = ex.sets.filter(
                (s) =>
                  s.completed &&
                  typeof s.cargaKg === 'number' &&
                  s.cargaKg > 0 &&
                  typeof s.reps === 'number' &&
                  s.reps > 0
              );
              const sortedBy1RM = [...validCompleted].sort((a, b) => {
                const rmA = calculate1RM(a.cargaKg as number, a.reps as number);
                const rmB = calculate1RM(b.cargaKg as number, b.reps as number);
                if (rmB !== rmA) return rmB - rmA;
                return (b.cargaKg as number) - (a.cargaKg as number);
              });
              const peakSet = sortedBy1RM[0];
              const isNewPr =
                peakSet &&
                past &&
                ((peakSet.cargaKg as number) > past.cargaKg ||
                  calculate1RM(peakSet.cargaKg as number, peakSet.reps as number) >
                    (past.best1RM || calculate1RM(past.cargaKg, past.reps)));

              return (
                <article
                  key={ex.id}
                  onClick={() => setActiveExerciseId(ex.id)}
                  className={`${
                    isContrast
                      ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] hover:bg-[#1c1c13]'
                      : 'bg-[rgba(32,32,23,0.6)] hover:bg-[rgba(32,32,23,0.8)]'
                  } rounded-[16px] p-[14px] flex flex-col gap-[10px] w-full cursor-pointer transition-colors`}
                >
                  {/* Header without minimize chevron button */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-[2px] items-start min-w-0">
                      <div className="flex items-center gap-[6px] w-full">
                        <h2 className="font-bold text-[#f8fafc] text-[15px] leading-[20px] truncate">
                          {ex.nomeExercicio}
                        </h2>
                        <span className="bg-[#d3e156] text-[#202017] rounded-full w-[14px] h-[14px] flex items-center justify-center shrink-0">
                          <Check className="w-[9px] h-[9px] stroke-[3]" />
                        </span>
                      </div>
                      <div className="flex items-center gap-[8px]">
                        <span className="font-bold text-[#64748b] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                          {ex.muscleGroup}
                        </span>
                        <span className="text-[#64748b] text-[10px]">•</span>
                        <span className="font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                          {ex.sets.length} de {ex.sets.length} séries concluídas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PR Celebration Badge Box (Figma Node 30:1345) */}
                  {isNewPr && peakSet && (
                    <div
                      className={`${
                        isContrast ? 'bg-black' : 'bg-[rgba(255,185,95,0.1)]'
                      } rounded-[12px] px-[12px] pt-[8px] pb-[6px] flex items-center justify-between w-full`}
                    >
                      <div className="flex items-center gap-[8px]">
                        <Trophy className="w-[16px] h-[16px] text-[#ffb95f] shrink-0" />
                        <span className="font-normal text-[#ffb95f] text-[12px] leading-[16px]">
                          Novo PR Carga Máxima!
                        </span>
                      </div>
                      <div className="flex items-center gap-[4px]">
                        <span className="font-mono font-bold text-[#ffb95f] text-[15px] leading-[20px]">
                          S{peakSet.setNumber}: {peakSet.cargaKg}kg × {peakSet.reps}
                        </span>
                        <Flame className="w-[14px] h-[14px] text-[#ffb95f] fill-[#ffb95f] shrink-0" />
                      </div>
                    </div>
                  )}

                  {/* Compact Completed Metrics (Figma Node 30:1355) */}
                  <div className="flex items-center justify-between flex-wrap gap-2 px-[4px] pt-[4px] w-full">
                    {ex.sets.map((s) => {
                      const isPeak = peakSet && s.id === peakSet.id && isNewPr;
                      return (
                        <div key={s.id} className="flex items-center gap-[2px]">
                          <span
                            className={`font-mono text-[12px] leading-[16px] ${
                              isPeak ? 'font-bold text-[#ffb95f]' : 'font-normal text-[#64748b]'
                            }`}
                          >
                            S{s.setNumber}: {s.cargaKg || 0}kg × {s.reps || 0}
                          </span>
                          {isPeak && (
                            <Flame className="w-[12px] h-[12px] text-[#ffb95f] fill-[#ffb95f] shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            }

            // 2. ACTIVE / IN PROGRESS EXPANDED STATE (Figma Node 30:1222)
            if (isActiveCard) {
              const firstIncompleteSetId = ex.sets.find((s) => !s.completed)?.id;

              return (
                <article
                  key={ex.id}
                  className={`${
                    isContrast ? 'bg-[#f4f4f0]' : 'bg-[#202017]'
                  } rounded-[16px] p-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col gap-[4px] w-full transition-colors`}
                >
                  {/* Top Glow Accent (Figma Node 30:1223) */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[4px] ${
                      isContrast
                        ? 'bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)]'
                        : 'bg-gradient-to-r from-transparent via-[#d3e156] to-transparent'
                    } opacity-90`}
                  />

                  {/* Exercise Card Header (Figma Node 30:1224) */}
                  <div className="flex items-center justify-between pt-[4px] w-full gap-2">
                    <div className="flex flex-col gap-[2px] items-start min-w-0 flex-1">
                      <h2
                        className={`font-bold text-[15px] leading-[18.75px] truncate w-full ${
                          isContrast ? 'text-black' : 'text-[#f8fafc]'
                        }`}
                      >
                        {ex.nomeExercicio}
                      </h2>
                      <div className="flex items-center gap-[8px]">
                        <span
                          className={`font-bold text-[10px] tracking-[0.5px] uppercase leading-[14px] ${
                            isContrast ? 'text-[#f59e0b]' : 'text-[#effe6f]'
                          }`}
                        >
                          {ex.muscleGroup}
                        </span>
                        <span className="text-[#64748b] text-[10px]">•</span>
                        <span
                          className={`font-normal text-[12px] leading-[16px] ${
                            isContrast ? 'text-[#151413]' : 'text-[#94a3b8]'
                          }`}
                        >
                          {completedSetsInEx} de {ex.sets.length} séries
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Assistir execução (▶) + Remover exercício */}
                    <div className="flex items-center gap-[4px] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenExerciseGuide(ex)}
                        className={`${
                          isContrast
                            ? 'bg-black hover:bg-[#151413] text-[#d3e156]'
                            : 'bg-[#393a2f] hover:bg-[#46483b] text-[#d3e156]'
                        } rounded-[8px] w-[32px] h-[32px] flex items-center justify-center transition-colors`}
                        title="Assistir execução (GIF e instruções)"
                      >
                        <Play className="w-[11px] h-[11px] fill-current" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(ex.id)}
                        className={`${
                          isContrast
                            ? 'bg-black hover:bg-[#151413] text-[#94a3b8] hover:text-[#ff6e61]'
                            : 'bg-[#393a2f] hover:bg-[#46483b] text-[#94a3b8] hover:text-[#ff6e61]'
                        } rounded-[8px] w-[32px] h-[32px] flex items-center justify-center transition-colors`}
                        title="Remover exercício da ficha"
                      >
                        <Trash2 className="w-[13px] h-[13px]" />
                      </button>
                    </div>
                  </div>

                  {/* Set Table Header (Figma Node 30:1248) */}
                  <div
                    className={`grid grid-cols-12 gap-[6px] pt-[14px] pb-[4px] px-[8px] w-full text-[10px] font-bold uppercase tracking-[0.8px] leading-[14px] ${
                      isContrast ? 'text-[rgba(13,17,23,0.8)]' : 'text-[#64748b]'
                    }`}
                  >
                    <div className="col-span-2 text-left">SÉRIE</div>
                    <div className="col-span-3 text-left">ANTERIOR</div>
                    <div className="col-span-3 text-center">CARGA (KG)</div>
                    <div className="col-span-2 text-center">REPS</div>
                    <div className="col-span-2 text-right">STATUS</div>
                  </div>

                  {/* Sets Rows (Figma Node 30:1259) */}
                  <div className="flex flex-col gap-[6px] pb-[8px] w-full">
                    {ex.sets.map((set) => {
                      const isCurrentTarget = set.id === firstIncompleteSetId;

                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-12 gap-[6px] items-center p-[8px] rounded-[12px] relative transition-all ${
                            set.completed
                              ? 'bg-[rgba(57,58,47,0.7)]'
                              : isCurrentTarget
                              ? 'bg-[#393a2f] shadow-[inset_0px_0px_0px_1px_rgba(211,225,86,0.4)]'
                              : isContrast
                              ? 'bg-[rgba(57,58,47,0.55)]'
                              : 'bg-[rgba(57,58,47,0.4)]'
                          }`}
                        >
                          {/* Set Number Circle */}
                          <div className="col-span-2 flex items-center">
                            <span
                              className={`w-[20px] h-[20px] rounded-full flex items-center justify-center font-mono font-bold text-[11px] leading-[20px] ${
                                isCurrentTarget
                                  ? isContrast
                                    ? 'bg-[#f59e0b] text-[#49240a] shadow-[0px_0px_3px_rgba(255,185,95,0.8)]'
                                    : 'bg-[#d3e156] text-[#2e3300] shadow-[0px_0px_3px_rgba(211,225,86,0.5)]'
                                  : isContrast
                                  ? 'bg-[#151413] text-[#94a3b8]'
                                  : 'bg-[#202017] text-[#94a3b8]'
                              }`}
                            >
                              {set.setNumber}
                            </span>
                          </div>

                          {/* Previous Reference */}
                          <div className="col-span-3 flex items-center">
                            <span
                              className={`font-mono text-[12px] leading-[16px] truncate ${
                                isContrast
                                  ? 'text-[#f8fafc]'
                                  : isCurrentTarget
                                  ? 'text-[#f8fafc]'
                                  : 'text-[#64748b]'
                              }`}
                            >
                              {set.previousRef || '—'}
                            </span>
                          </div>

                          {/* Weight Input */}
                          <div className="col-span-3 relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="0"
                              value={set.cargaKg}
                              onChange={(e) =>
                                handleUpdateSet(ex.id, set.id, 'cargaKg', e.target.value)
                              }
                              className={`w-full px-[6px] py-[4px] rounded-[8px] text-center font-mono font-bold text-[14px] leading-[20px] focus:outline-none ${
                                isCurrentTarget
                                  ? isContrast
                                    ? 'bg-[#090d16] text-[#f59e0b] shadow-[inset_0px_1px_3px_0px_rgba(0,0,0,0.8)]'
                                    : 'bg-[#090d16] text-[#effe6f] shadow-[inset_0px_1px_3px_0px_rgba(0,0,0,0.8)]'
                                  : 'bg-[rgba(9,13,22,0.6)] text-[#f8fafc]'
                              }`}
                            />
                            {isCurrentTarget && (
                              <span
                                className={`absolute -top-[3px] -right-[3px] w-[8px] h-[8px] rounded-full ${
                                  isContrast ? 'bg-[#ffb95f]' : 'bg-[#effe6f]'
                                }`}
                              />
                            )}
                          </div>

                          {/* Reps Input */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              value={set.reps}
                              onChange={(e) =>
                                handleUpdateSet(ex.id, set.id, 'reps', e.target.value)
                              }
                              className={`w-full p-[4px] rounded-[8px] text-center font-mono font-bold text-[14px] leading-[20px] focus:outline-none ${
                                isCurrentTarget
                                  ? 'bg-[#090d16] text-[#f8fafc] shadow-[inset_0px_1px_3px_0px_rgba(0,0,0,0.8)]'
                                  : 'bg-[rgba(9,13,22,0.6)] text-[#f8fafc]'
                              }`}
                            />
                          </div>

                          {/* Complete Check Button */}
                          <div className="col-span-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleToggleSetComplete(ex.id, set.id)}
                              className={`w-[32px] h-[32px] rounded-[8px] flex items-center justify-center transition-all active:scale-90 ${
                                set.completed
                                  ? isContrast
                                    ? 'bg-[#ffb95f] text-[#151413] shadow-[0px_0px_5px_rgba(255,185,95,0.4)]'
                                    : 'bg-[#d3e156] text-[#202017] shadow-[0px_0px_5px_rgba(211,225,86,0.35)]'
                                  : 'bg-[#090d16] text-[#64748b] hover:text-[#f8fafc]'
                              }`}
                              title={set.completed ? 'Desmarcar série' : 'Concluir série'}
                            >
                              <Check className="w-[14px] h-[14px] stroke-[2.8]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Set Auxiliary Button (Figma Node 30:1317) */}
                  <div className="flex items-center gap-[8px] w-full">
                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      className={`flex-1 ${
                        isContrast
                          ? 'bg-[#090d16] hover:bg-[#151413] text-[#ffb95f]'
                          : 'bg-[#393a2f] hover:bg-[#46483b] text-[#d3e156]'
                      } py-[8px] rounded-[12px] flex items-center justify-center gap-[6px] text-[12px] leading-[16px] transition-colors`}
                    >
                      <Plus className="w-[12px] h-[12px] stroke-[2.5]" />
                      <span>Adicionar Série</span>
                    </button>

                    {ex.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(ex.id, ex.sets[ex.sets.length - 1].id)}
                        className={`${
                          isContrast
                            ? 'bg-[#090d16] hover:bg-[#151413] text-[#94a3b8] hover:text-[#ff6e61]'
                            : 'bg-[#2a2b21] hover:bg-[#393a2f] text-[#64748b] hover:text-[#ff6e61]'
                        } px-[10px] py-[8px] rounded-[12px] text-[11px] leading-[16px] transition-colors shrink-0`}
                        title="Remover última série"
                      >
                        -1 série
                      </button>
                    )}
                  </div>

                  {/* Active Rest Time Selector right below Adicionar Série (Figma Node 56:153) */}
                  <div
                    className={`mt-[6px] ${
                      isContrast
                        ? 'bg-[rgba(30,145,177,0.14)] border border-[rgba(30,145,177,0.49)]'
                        : 'bg-[rgba(9,13,22,0.55)]'
                    } rounded-[12px] px-[10px] py-[8px] flex items-center justify-between gap-2 w-full`}
                  >
                    <div className="flex items-center gap-[6px]">
                      <Clock
                        className={`w-[13px] h-[13px] shrink-0 ${
                          isContrast ? 'text-[#11667e]' : 'text-[#d3e156]'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-medium ${
                          isContrast ? 'text-[#11667e]' : 'text-[#94a3b8]'
                        }`}
                      >
                        Descanso ativo:
                      </span>
                    </div>

                    <div className="flex items-center gap-[4px]">
                      {REST_PRESETS.map((preset) => {
                        const isSelected = restDuration === preset.seconds;
                        return (
                          <button
                            key={preset.seconds}
                            type="button"
                            onClick={() => setRestDuration(preset.seconds)}
                            className={`px-[8px] py-[3px] rounded-[6px] font-mono text-[11px] transition-colors ${
                              isSelected
                                ? isContrast
                                  ? 'bg-[#1e91b1] text-white font-bold'
                                  : 'bg-[#d3e156] text-[#202017] font-bold'
                                : isContrast
                                ? 'bg-white/70 text-[#11667e] hover:bg-white'
                                : 'bg-[#202017] text-[#94a3b8] hover:text-[#f8fafc]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            }

            // 3. UPCOMING / NEXT EXERCISE CARD (Figma Node 30:1364)
            return (
              <article
                key={ex.id}
                onClick={() => setActiveExerciseId(ex.id)}
                className={`${
                  isContrast
                    ? 'bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] hover:bg-[#1c1c13]'
                    : 'bg-[rgba(32,32,23,0.4)] hover:bg-[rgba(32,32,23,0.6)]'
                } rounded-[16px] p-[14px] flex flex-col gap-[10px] w-full cursor-pointer transition-colors`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex flex-col gap-[2px] items-start min-w-0">
                    <h2
                      className={`font-bold text-[15px] leading-[20px] truncate ${
                        isContrast ? 'text-[#f8fafc]' : 'text-[#94a3b8]'
                      }`}
                    >
                      {ex.nomeExercicio}
                    </h2>
                    <div className="flex items-center gap-[8px]">
                      <span className="font-bold text-[#64748b] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                        {ex.muscleGroup}
                      </span>
                      <span className="text-[#64748b] text-[10px]">•</span>
                      <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                        {completedSetsInEx} de {ex.sets.length} séries
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveExerciseId(ex.id);
                    }}
                    className={`${
                      isContrast
                        ? 'bg-[rgba(30,145,177,0.14)] hover:bg-[rgba(30,145,177,0.24)] text-[#6ecddd]'
                        : 'bg-[#202017] hover:bg-[#2a2b21] text-[#d3e156]'
                    } px-[12px] py-[4px] rounded-[8px] text-[12px] leading-[16px] shrink-0 transition-colors`}
                  >
                    Iniciar
                  </button>
                </div>

                {/* Last Workout Reference Bar (Figma Node 30:1383) */}
                <div
                  className={`${
                    isContrast ? 'bg-black' : 'bg-[rgba(32,32,23,0.6)]'
                  } px-[8px] py-[6px] rounded-[8px] flex items-center justify-between w-full`}
                >
                  <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                    Último treino:
                  </span>
                  <span className="font-mono font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                    {past ? `${past.cargaKg} kg × ${past.reps} reps` : 'Sem registro anterior'}
                  </span>
                </div>
              </article>
            );
          })}

          {/* Add Exercise Action Button (Figma Node 30:1389) */}
          {exercises.length > 0 && (
            <div className="pt-[4px] w-full">
              <button
                type="button"
                onClick={() => setIsAddExerciseModalOpen(true)}
                className={`${
                  isContrast
                    ? 'bg-[rgba(255,185,95,0.15)] hover:bg-[rgba(255,185,95,0.25)] text-[#ffb95f]'
                    : 'bg-[rgba(32,32,23,0.4)] hover:bg-[rgba(32,32,23,0.7)] text-[#94a3b8] hover:text-[#f8fafc]'
                } py-[12px] rounded-[16px] flex items-center justify-center gap-[8px] w-full text-[14px] font-medium leading-[20px] transition-colors`}
              >
                <span
                  className={`w-[16px] h-[16px] rounded-full border ${
                    isContrast ? 'border-[#ffb95f]' : 'border-[#94a3b8]'
                  } flex items-center justify-center`}
                >
                  <Plus className="w-[10px] h-[10px]" />
                </span>
                <span>Adicionar Exercício à Ficha</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* STICKY BOTTOM CONTROLS & REST DOCK (Figma Node 30:1427) */}
      {exercises.length > 0 && (
        <footer
          className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-[12px] bg-gradient-to-t ${
            isContrast
              ? 'from-[#0e0f07] via-[rgba(14,15,7,0.95)]'
              : 'from-[#0d1117] via-[rgba(13,17,23,0.95)]'
          } to-transparent px-[16px] py-[12px]`}
        >
          <div className="max-w-md mx-auto flex flex-col gap-[10px]">
            {/* Floating Rest Timer Pill (Figma Node 30:1428 - Inline instead of modal) */}
            {isRestActive && (
              <div
                className={`${
                  isContrast ? 'bg-black' : 'bg-[#202017]'
                } px-[12px] py-[8px] rounded-[12px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.2)] flex items-center justify-between w-full`}
              >
                <div className="flex items-center gap-[10px]">
                  {/* Circular mini progress indicator */}
                  <div className="relative w-[24px] h-[24px] flex items-center justify-center shrink-0">
                    <svg className="w-[24px] h-[24px] -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke={isContrast ? '#6ECDDD' : '#D3E156'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 9}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          9 *
                          (1 - Math.min(1, Math.max(0, restRemainingSecs / restDuration)))
                        }
                      />
                    </svg>
                    <Clock
                      className={`w-[10px] h-[10px] absolute ${
                        isContrast ? 'text-[#6ecddd]' : 'text-[#d3e156]'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col items-start">
                    <span
                      className={`font-medium text-[9px] tracking-[0.45px] uppercase leading-[14px] ${
                        isContrast ? 'text-[#f8fafc]' : 'text-[#64748b]'
                      }`}
                    >
                      DESCANSO ATIVO
                    </span>
                    <span
                      className={`font-mono font-bold text-[12px] leading-[16px] ${
                        isContrast ? 'text-[#6ecddd]' : 'text-[#effe6f]'
                      }`}
                    >
                      {formatRestTime(restRemainingSecs)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-[4px]">
                  <button
                    type="button"
                    onClick={() => handleAddRestSeconds(30)}
                    className={`${
                      isContrast
                        ? 'bg-[#f8fafc] hover:bg-white text-[#64748b]'
                        : 'bg-[#393a2f] hover:bg-[#46483b] text-[#94a3b8] hover:text-[#f8fafc]'
                    } px-[8px] py-[4px] rounded-[4px] font-mono font-bold text-[11px] leading-[20px] transition-colors`}
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipRestTimer}
                    className={`${
                      isContrast
                        ? 'bg-[#f8fafc] hover:bg-white text-[#f59e0b]'
                        : 'bg-[#393a2f] hover:bg-[#46483b] text-[#94a3b8] hover:text-[#f8fafc]'
                    } w-[28px] h-[28px] rounded-[4px] flex items-center justify-center transition-colors`}
                    title="Pular descanso"
                  >
                    <X className="w-[12px] h-[12px]" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Action Pill Buttons */}
            {!isWorkoutStarted ? (
              /* BEFORE WORKOUT STARTS: High-Voltage White Pill Button "INICIAR TREINO" */
              <button
                type="button"
                onClick={handleStartWorkout}
                className="bg-[#f8fafc] hover:bg-white min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full shadow-[0px_8px_20px_-4px_rgba(255,255,255,0.08)] flex items-center justify-between w-full transition-transform active:scale-[0.98]"
              >
                <span className="font-heading font-semibold text-[#202017] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
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
              </button>
            ) : (
              /* WHILE WORKOUT IS RUNNING: "FINALIZAR TREINO" + "PAUSAR" Pill Buttons */
              <div className="flex items-start gap-[8px] w-full">
                {/* Primary Pill Button: FINALIZAR TREINO (Figma Node 54:144) */}
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  disabled={isFinishing || completedSetsCount === 0}
                  className="bg-[#f8fafc] hover:bg-white disabled:opacity-50 flex-1 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full shadow-[0px_8px_20px_-4px_rgba(255,255,255,0.08)] flex items-center justify-between transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#202017] tracking-[0.45px] uppercase leading-[24px] whitespace-nowrap">
                    {isFinishing ? (
                      <span className="text-[16px]">SALVANDO...</span>
                    ) : (
                      <>
                        <span className="text-[18px]">FINALIZAR TREINO </span>
                        <span className="text-[13px]">({completedSetsCount} SÉRIES)</span>
                      </>
                    )}
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
                </button>

                {/* Secondary Pill Button: PAUSAR / RETOMAR (Styled like TROCAR on Dashboard) */}
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="bg-transparent hover:bg-white/5 border border-[#f8fafc] min-w-[132px] min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98] shrink-0"
                >
                  <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[0.45px] uppercase leading-[24px] whitespace-nowrap">
                    {isTimerPaused ? 'RETOMAR' : 'PAUSAR'}
                  </span>
                  <span
                    className={`${
                      isTimerPaused ? 'bg-[#f59e0b]' : 'bg-[#1e91b1]'
                    } rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center`}
                  >
                    {isTimerPaused ? (
                      <Play className="w-[14px] h-[14px] text-[#f8fafc] fill-current ml-0.5" />
                    ) : (
                      <Pause className="w-[14px] h-[14px] text-[#f8fafc] fill-current" />
                    )}
                  </span>
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* Modal: Add Exercise Selector (Restyled with New UI) */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-4 shadow-2xl w-full max-w-md max-h-[82vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)] shrink-0">
              <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase tracking-[-0.18px] flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-[#ffb95f]" /> Escolher Exercício
              </h2>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="p-1.5 text-[#94a3b8] hover:text-[#f8fafc] rounded-[8px] bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <input
                type="text"
                placeholder="Buscar por nome (ex: Supino, Agachamento)..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full bg-black border border-[rgba(255,255,255,0.08)] rounded-[12px] pl-10 pr-4 py-2.5 text-xs text-[#f8fafc] focus:outline-none focus:border-[#ffb95f] transition-colors"
              />
            </div>

            {/* Muscle Filter Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 mb-1 scrollbar-none shrink-0">
              {['Todos', ...MUSCLE_GROUPS].map((mg) => (
                <button
                  key={mg}
                  onClick={() => setFilterMuscle(mg)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    filterMuscle === mg
                      ? 'bg-[#ffb95f] text-[#151413] font-bold'
                      : 'bg-black text-[#94a3b8] hover:text-[#f8fafc]'
                  }`}
                >
                  {mg}
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2 pr-1 mt-1">
              {loadingAvailableExercises ? (
                <div className="py-8 text-center text-xs text-[#94a3b8]">
                  Carregando exercícios...
                </div>
              ) : (
                availableExercises
                  .filter((ex) => {
                    const matchesSearch = ex.nomeExercicio
                      .toLowerCase()
                      .includes(exerciseSearch.toLowerCase());
                    const matchesMuscle =
                      filterMuscle === 'Todos' || ex.muscleGroup === filterMuscle;
                    return matchesSearch && matchesMuscle;
                  })
                  .map((ex) => {
                    const past = latestLogsCache[ex.id];
                    return (
                      <div
                        key={ex.id}
                        className="w-full p-2.5 rounded-[12px] bg-black hover:bg-[#1c1c13] flex items-center justify-between transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleAddExerciseToWorkout(ex)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0 pr-2"
                        >
                          <div className="w-10 h-10 rounded-[8px] bg-[#151413] flex items-center justify-center shrink-0 overflow-hidden relative">
                            {ex.thumbnailUrl ? (
                              <img
                                src={ex.thumbnailUrl}
                                alt={ex.nomeExercicio}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dumbbell className="h-5 w-5 text-[#64748b]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#f8fafc] group-hover:text-[#ffb95f] transition-colors truncate">
                              {ex.nomeExercicio}
                            </p>
                            <p className="text-[10px] text-[#94a3b8] mt-0.5 truncate">
                              {ex.muscleGroup}{' '}
                              {past ? `• Último: ${past.cargaKg}kg × ${past.reps}` : ''}
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
                            className="p-2 rounded-[8px] bg-[#151413] hover:bg-[#ffb95f] text-[#ffb95f] hover:text-[#151413] transition-colors"
                            title="Ver execução (GIF e instruções)"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddExerciseToWorkout(ex)}
                            className="p-2 rounded-[8px] bg-[#ffb95f] text-[#151413] hover:bg-[#f59e0b] transition-colors"
                            title="Adicionar ao treino"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
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
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 shadow-2xl w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-[12px] bg-[#ff6e61]/10 text-[#ff6e61] flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
              Descartar treino em andamento?
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Todas as séries e dados marcados nesta sessão serão excluídos e não poderão ser
              recuperados.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsDiscardConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-full bg-black hover:bg-[#1c1c13] text-[#f8fafc] text-xs font-semibold transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={handleDiscardWorkout}
                className="flex-1 py-2.5 rounded-full bg-[#ff6e61] hover:opacity-90 text-white text-xs font-bold transition-opacity"
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
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-6 shadow-2xl w-full max-w-sm text-center relative overflow-hidden space-y-5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#ffb95f]/15 blur-3xl pointer-events-none rounded-full" />

            <div className="relative z-10 w-16 h-16 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>

            <div className="relative z-10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffb95f]">
                Missão Cumprida!
              </span>
              <h2 className="font-heading font-bold text-2xl uppercase text-[#f8fafc]">
                Treino Concluído!
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Seus registros e cargas foram sincronizados com sucesso no seu perfil.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-2 text-center">
              <div className="bg-black rounded-[12px] p-3">
                <span className="block text-[10px] uppercase font-bold text-[#64748b]">
                  Duração
                </span>
                <span className="text-sm font-bold text-[#f8fafc] font-mono">
                  {formatTimerHud(completedWorkoutStats.durationSecs)}
                </span>
              </div>

              <div className="bg-black rounded-[12px] p-3">
                <span className="block text-[10px] uppercase font-bold text-[#64748b]">
                  Séries Concluídas
                </span>
                <span className="text-sm font-bold text-[#ffb95f] font-mono">
                  {completedWorkoutStats.totalSets}
                </span>
              </div>
            </div>

            <div className="relative z-10 space-y-2 pt-2">
              <button
                onClick={() => {
                  if (storageKey) localStorage.removeItem(storageKey);
                  router.replace('/dashboard');
                }}
                className="w-full py-3 rounded-full bg-[#f8fafc] hover:bg-white text-[#151413] font-heading font-semibold text-[16px] uppercase tracking-[0.4px] transition-all active:scale-95"
              >
                Voltar ao Início
              </button>
              <button
                onClick={() => {
                  if (storageKey) localStorage.removeItem(storageKey);
                  router.replace('/strength');
                }}
                className="w-full py-2.5 rounded-full bg-black hover:bg-[#1c1c13] text-[#f8fafc] font-semibold text-xs transition-colors"
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
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] space-y-4">
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-[6px] bg-[#ffb95f]/15 text-[#ffb95f]">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </div>
                  <h3 className="font-bold text-[#f8fafc] text-sm truncate">
                    {exerciseGuideModal.nomeExercicio}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#ffb95f] uppercase tracking-wider block">
                  {exerciseGuideModal.muscleGroup}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExerciseGuideModal(null)}
                className="text-[#94a3b8] hover:text-[#f8fafc] p-1 rounded-[8px] bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative w-full rounded-[12px] overflow-hidden bg-black flex items-center justify-center min-h-[200px] max-h-72">
              {exerciseGuideModal.gifUrl ? (
                <img
                  src={exerciseGuideModal.gifUrl}
                  alt={`Execução de ${exerciseGuideModal.nomeExercicio}`}
                  className="w-full h-full object-contain max-h-72"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (
                      exerciseGuideModal.thumbnailUrl &&
                      target.src !== exerciseGuideModal.thumbnailUrl
                    ) {
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
                  <span className="mt-2 text-[10px] font-bold text-[#94a3b8] bg-[#151413] px-2.5 py-1 rounded-full">
                    Prévia Estática (GIF em breve)
                  </span>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-[12px] bg-[#ffb95f]/15 text-[#ffb95f] flex items-center justify-center mx-auto">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-[#f8fafc]">Animação em breve</p>
                </div>
              )}
            </div>

            {exerciseGuideModal.description ? (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
                <div className="flex items-center gap-1.5 text-[#f8fafc]">
                  <Info className="h-3.5 w-3.5 text-[#ffb95f] shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Como Executar:
                  </span>
                </div>
                <div className="bg-black p-3 rounded-[12px] text-xs text-[#94a3b8] leading-relaxed">
                  {exerciseGuideModal.description}
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setExerciseGuideModal(null)}
                className="w-full py-2.5 rounded-full bg-[#ffb95f] hover:bg-[#f59e0b] text-[#151413] font-bold text-xs transition-all active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Salvar Treino (Template) */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[10px] bg-[#ffb95f]/15 text-[#ffb95f]">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                    Salvar Ficha de Treino
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    Guarde esta ficha com exercícios, séries e cargas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="p-1.5 text-[#94a3b8] hover:text-[#f8fafc] rounded-[8px] bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveSuccessMessage && (
              <div className="p-3 bg-[#d3e156]/15 text-[#d3e156] rounded-[12px] text-xs font-bold flex items-center gap-2">
                <Check className="h-4 w-4 stroke-[3]" /> {saveSuccessMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block">
                Nome do Treino
              </label>
              <input
                type="text"
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="Ex: Treino A - Peito e Tríceps"
                className="w-full bg-black border border-[rgba(255,255,255,0.08)] focus:border-[#ffb95f] rounded-[12px] px-4 py-3 text-sm text-[#f8fafc] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block">
                Grupos Musculares
              </label>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {MUSCLE_GROUPS.map((mg) => {
                  const isChecked = selectedMuscleGroups.includes(mg);
                  return (
                    <button
                      type="button"
                      key={mg}
                      onClick={() => handleToggleMuscleGroup(mg)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs font-semibold text-left transition-all ${
                        isChecked
                          ? 'bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]'
                          : 'bg-black text-[#94a3b8] hover:text-[#f8fafc]'
                      }`}
                    >
                      <span className="truncate">{mg}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="flex-1 py-2.5 rounded-full bg-black text-[#94a3b8] font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={
                  isSavingTemplate || !templateNameInput.trim() || selectedMuscleGroups.length === 0
                }
                className="flex-1 py-2.5 rounded-full bg-[#ffb95f] text-[#151413] font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Ficha</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Carregar Treino Salvo */}
      {isLoadTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-5 shadow-2xl w-full max-w-md max-h-[82vh] flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[10px] bg-[#ffb95f]/15 text-[#ffb95f]">
                  <FolderDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                    Minhas Fichas Salvas
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    Escolha uma ficha para carregar os exercícios
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoadTemplateModalOpen(false)}
                className="p-1.5 text-[#94a3b8] hover:text-[#f8fafc] rounded-[8px] bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none min-h-[160px]">
              {isLoadingTemplates ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="h-7 w-7 animate-spin text-[#ffb95f]" />
                  <span className="text-xs text-[#94a3b8]">Buscando fichas salvas...</span>
                </div>
              ) : (
                savedTemplates.map((template) => {
                  const totalSetsInTemplate = template.exercises.reduce(
                    (acc, ex) => acc + (ex.sets?.length || 0),
                    0
                  );

                  return (
                    <div
                      key={template.id}
                      className="bg-black hover:bg-[#1c1c13] rounded-[12px] p-4 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#f8fafc] truncate">
                            {template.title}
                          </h4>
                          <span className="text-[11px] text-[#94a3b8]">
                            {template.exercises.length} exercícios • {totalSetsInTemplate} séries
                          </span>
                        </div>

                        {!template.id.startsWith('default_') && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedTemplate(template.id, e)}
                            disabled={deletingTemplateId === template.id}
                            className="p-1.5 text-[#64748b] hover:text-[#ff6e61] rounded-[8px]"
                            title="Excluir treino salvo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-[#94a3b8] line-clamp-1">
                        {template.exercises.map((e) => e.nomeExercicio).join(' • ')}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleSelectTemplateToLoad(template)}
                        className="w-full py-2 px-4 rounded-full bg-[#ffb95f] hover:bg-[#f59e0b] text-[#151413] font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <span>Carregar Ficha</span>
                        <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-xs text-[#94a3b8]">
          Carregando treino...
        </div>
      }
    >
      <ActiveWorkoutComponent />
    </Suspense>
  );
}

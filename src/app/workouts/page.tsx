'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import workoutPlansData from '@/data/workoutPlans.json';
import { PREDEFINED_EXERCISES } from '@/data/exercises';
import {
  generatePersonalizedPlan,
  GeneratedWorkoutSplit,
} from '@/data/workoutPlanGenerator';
import {
  Search,
  Dumbbell,
  Play,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Layers,
  LayoutGrid,
  Plus,
  Bookmark,
  Trash2,
  X,
  Clock,
  Check,
  Loader2,
  User as UserIcon,
} from 'lucide-react';

type GoalFilter = 'todos' | NonNullable<UserProfile['objetivo']>;

interface SavedWorkoutDoc {
  id: string;
  title: string;
  muscleGroups: string[];
  exercises: {
    exerciseId: string;
    nomeExercicio: string;
    muscleGroup: string;
    sets: { setNumber: number; cargaKg: number | ''; reps: number | '' }[];
  }[];
  createdAt?: any;
}

interface WorkoutSplitCatalogItem {
  id: string;
  name: string;
  subtitle: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  goals: GoalFilter[];
  icon: 'sparkles' | 'body' | 'arrows' | 'layers' | 'dumbbell' | 'grid' | 'plus';
  daysLabel: string;
  splits: {
    codigo: string;
    nome: string;
    exercicios: { nome: string; muscleGroup: string; series: number }[];
  }[];
}

const GOAL_FILTERS: { id: GoalFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'hipertrofia', label: 'Hipertrofia' },
  { id: 'forca', label: 'Força' },
  { id: 'definicao', label: 'Definição' },
  { id: 'condicionamento', label: 'Condicionamento' },
];

const WORKOUT_SPLIT_CATALOG: WorkoutSplitCatalogItem[] = [
  {
    id: 'ai_recommended',
    name: 'Deixa a IA escolher',
    subtitle: 'Montamos o split ideal pra você',
    level: 'Iniciante',
    goals: ['todos', 'hipertrofia', 'forca', 'definicao', 'condicionamento'],
    icon: 'sparkles',
    daysLabel: 'Personalizado',
    splits: workoutPlansData.divisoesPorFrequencia['4-5'],
  },
  {
    id: 'full_body',
    name: 'Full Body',
    subtitle: 'Full body em cada treino',
    level: 'Iniciante',
    goals: ['todos', 'hipertrofia', 'definicao', 'condicionamento'],
    icon: 'body',
    daysLabel: '2 a 3 dias/sem',
    splits: workoutPlansData.divisoesPorFrequencia['2-3'],
  },
  {
    id: 'abc',
    name: 'ABC',
    subtitle: 'Divisão por grupo A/B/C',
    level: 'Iniciante',
    goals: ['todos', 'hipertrofia', 'definicao'],
    icon: 'layers',
    daysLabel: '3 dias/sem',
    splits: workoutPlansData.divisoesPorFrequencia.flexivel,
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    subtitle: 'Superior e inferior alternados',
    level: 'Intermediário',
    goals: ['todos', 'hipertrofia', 'forca'],
    icon: 'arrows',
    daysLabel: '4 dias/sem',
    splits: workoutPlansData.divisoesPorFrequencia['4-5'].slice(0, 4),
  },
  {
    id: 'abcd',
    name: 'ABCD',
    subtitle: 'Divisão por grupo A/B/C/D',
    level: 'Intermediário',
    goals: ['todos', 'hipertrofia', 'forca', 'definicao'],
    icon: 'grid',
    daysLabel: '4 dias/sem',
    splits: workoutPlansData.divisoesPorFrequencia['4-5'].slice(0, 4),
  },
  {
    id: 'ppl_fullbody',
    name: 'PPL + Full Body',
    subtitle: 'Push/Pull/Legs com dias extras',
    level: 'Intermediário',
    goals: ['todos', 'hipertrofia', 'condicionamento'],
    icon: 'plus',
    daysLabel: '5 dias/sem',
    splits: [
      ...workoutPlansData.divisoesPorFrequencia['6'].slice(0, 3),
      workoutPlansData.divisoesPorFrequencia['4-5'][4],
    ],
  },
  {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    subtitle: 'Empurrar, puxar e pernas',
    level: 'Avançado',
    goals: ['todos', 'hipertrofia', 'forca'],
    icon: 'dumbbell',
    daysLabel: '6 dias/sem',
    splits: workoutPlansData.divisoesPorFrequencia['6'],
  },
];

function findPredefined(nome: string) {
  const norm = nome.trim().toLowerCase();
  return PREDEFINED_EXERCISES.find((e) => e.nome.trim().toLowerCase() === norm);
}

export default function WorkoutsPage() {
  const { user, profile, isPreviewMode, loading: authLoading } = useAuth();
  const router = useRouter();

  const [goalFilter, setGoalFilter] = useState<GoalFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkoutDoc[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Detail Bottom-Sheet Modal States
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<WorkoutSplitCatalogItem | null>(
    null
  );
  const [selectedSplitIdx, setSelectedSplitIdx] = useState<number>(0);
  const [selectedSavedWorkout, setSelectedSavedWorkout] = useState<SavedWorkoutDoc | null>(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        loadSavedWorkouts();
      }
    }
  }, [user, authLoading, router]);

  const loadSavedWorkouts = async () => {
    if (!user) return;
    setLoadingSaved(true);

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      setSavedWorkouts([
        {
          id: 'prev_saved_a',
          title: 'Treino A • Peito, Tríceps e Ombro',
          muscleGroups: ['Peito', 'Tríceps', 'Ombro'],
          exercises: [
            {
              exerciseId: 'pre_supino_reto_barra',
              nomeExercicio: 'Supino Reto com Barra',
              muscleGroup: 'Peito',
              sets: [
                { setNumber: 1, cargaKg: 80, reps: 10 },
                { setNumber: 2, cargaKg: 82.5, reps: 8 },
                { setNumber: 3, cargaKg: 85, reps: 6 },
              ],
            },
            {
              exerciseId: 'pre_supino_inclinado_halteres',
              nomeExercicio: 'Supino Inclinado com Halteres',
              muscleGroup: 'Peito',
              sets: [
                { setNumber: 1, cargaKg: 32, reps: 10 },
                { setNumber: 2, cargaKg: 32, reps: 10 },
                { setNumber: 3, cargaKg: 32, reps: 9 },
              ],
            },
            {
              exerciseId: 'pre_triceps_pulley_corda',
              nomeExercicio: 'Tríceps Corda na Polia',
              muscleGroup: 'Tríceps',
              sets: [
                { setNumber: 1, cargaKg: 35, reps: 12 },
                { setNumber: 2, cargaKg: 35, reps: 12 },
                { setNumber: 3, cargaKg: 35, reps: 10 },
              ],
            },
          ],
        },
        {
          id: 'prev_saved_b',
          title: 'Treino B • Costas e Bíceps',
          muscleGroups: ['Costas', 'Bíceps'],
          exercises: [
            {
              exerciseId: 'pre_puxada_pulley_pronada',
              nomeExercicio: 'Puxada Alta na Polia',
              muscleGroup: 'Costas',
              sets: [
                { setNumber: 1, cargaKg: 75, reps: 10 },
                { setNumber: 2, cargaKg: 75, reps: 10 },
                { setNumber: 3, cargaKg: 75, reps: 8 },
              ],
            },
            {
              exerciseId: 'pre_remada_curvada',
              nomeExercicio: 'Remada Curvada com Barra',
              muscleGroup: 'Costas',
              sets: [
                { setNumber: 1, cargaKg: 70, reps: 8 },
                { setNumber: 2, cargaKg: 70, reps: 8 },
                { setNumber: 3, cargaKg: 70, reps: 8 },
              ],
            },
          ],
        },
      ]);
      setLoadingSaved(false);
      return;
    }

    try {
      const snap = await getDocs(
        query(collection(db, 'saved_workouts'), where('userId', '==', user.uid))
      );
      const list: SavedWorkoutDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || 'Treino Salvo',
          muscleGroups: Array.isArray(d.muscleGroups) ? d.muscleGroups : [],
          exercises: Array.isArray(d.exercises) ? d.exercises : [],
          createdAt: d.createdAt,
        });
      });
      setSavedWorkouts(list);
    } catch (err) {
      console.error('Error loading saved workouts:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const personalizedPlan = useMemo(() => generatePersonalizedPlan(profile), [profile]);

  const activeGoalRule = useMemo(() => {
    const key =
      goalFilter !== 'todos'
        ? goalFilter
        : profile?.objetivo || 'hipertrofia';
    return workoutPlansData.regrasObjetivo[key] || workoutPlansData.regrasObjetivo.hipertrofia;
  }, [goalFilter, profile?.objetivo]);

  // Filter catalog by goal & search query
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return WORKOUT_SPLIT_CATALOG.filter((item) => {
      if (goalFilter !== 'todos' && !item.goals.includes(goalFilter)) return false;
      if (q) {
        const matchMeta =
          item.name.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.level.toLowerCase().includes(q);
        const matchEx = item.splits.some(
          (s) =>
            s.nome.toLowerCase().includes(q) ||
            s.exercicios.some(
              (e) => e.nome.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)
            )
        );
        if (!matchMeta && !matchEx) return false;
      }
      return true;
    });
  }, [goalFilter, searchQuery]);

  // Filter saved workouts by search query
  const filteredSaved = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedWorkouts;
    return savedWorkouts.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.muscleGroups.some((m) => m.toLowerCase().includes(q)) ||
        w.exercises.some((e) => e.nomeExercicio.toLowerCase().includes(q))
    );
  }, [savedWorkouts, searchQuery]);

  const launchActiveWorkout = (payload: {
    title: string;
    restDurationSeconds: number;
    exercises: {
      exerciseId: string;
      nomeExercicio: string;
      muscleGroup: string;
      sets: { setNumber: number; cargaKg: number | ''; reps: number | '' }[];
    }[];
  }) => {
    if (!user) return;
    const storageKey = `clipzbody_active_workout_${user.uid}`;
    const activeData = {
      title: payload.title,
      startedAt: Date.now(),
      isWorkoutStarted: false,
      elapsedSeconds: 0,
      restDurationSeconds: payload.restDurationSeconds,
      exercises: payload.exercises.map((ex, idx) => {
        const found = findPredefined(ex.nomeExercicio);
        return {
          id: `ex_${Date.now()}_${idx}`,
          exerciseId: found?.id || ex.exerciseId,
          nomeExercicio: ex.nomeExercicio,
          muscleGroup: ex.muscleGroup,
          thumbnailUrl: found?.thumbnailUrl || '',
          gifUrl: found?.gifUrl || '',
          description: found?.description || '',
          sets: ex.sets.map((s) => ({
            ...s,
            completed: false,
          })),
        };
      }),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(activeData));
    }
    router.push('/workout/active');
  };

  const handleStartCatalogSplit = (
    split: {
      codigo: string;
      nome: string;
      exercicios: { nome: string; muscleGroup: string; series: number }[];
    }
  ) => {
    const defaultReps = parseInt(activeGoalRule.reps.split('-')[0], 10) || 10;
    launchActiveWorkout({
      title: `Treino ${split.codigo} • ${split.nome}`,
      restDurationSeconds: activeGoalRule.descansoSegundos,
      exercises: split.exercicios.map((ex) => {
        const found = findPredefined(ex.nome);
        return {
          exerciseId: found?.id || `gen_${ex.nome.toLowerCase().replace(/\s+/g, '_')}`,
          nomeExercicio: found?.nome || ex.nome,
          muscleGroup: found?.muscleGroup || ex.muscleGroup,
          sets: Array.from({ length: ex.series }, (_, idx) => ({
            setNumber: idx + 1,
            cargaKg: '' as number | '',
            reps: defaultReps,
          })),
        };
      }),
    });
  };

  const handleSaveSplitToUserLibrary = async (split: {
    codigo: string;
    nome: string;
    exercicios: { nome: string; muscleGroup: string; series: number }[];
  }) => {
    if (!user) return;
    setSavingToLibrary(true);
    try {
      const defaultReps = parseInt(activeGoalRule.reps.split('-')[0], 10) || 10;
      const muscleGroups = Array.from(new Set(split.exercicios.map((e) => e.muscleGroup)));
      const exercises = split.exercicios.map((ex) => {
        const found = findPredefined(ex.nome);
        return {
          exerciseId: found?.id || `gen_${ex.nome.toLowerCase().replace(/\s+/g, '_')}`,
          nomeExercicio: found?.nome || ex.nome,
          muscleGroup: found?.muscleGroup || ex.muscleGroup,
          sets: Array.from({ length: ex.series }, (_, idx) => ({
            setNumber: idx + 1,
            cargaKg: '' as number | '',
            reps: defaultReps,
          })),
        };
      });

      const title = `Treino ${split.codigo} • ${split.nome}`;

      if (isPreviewMode || user.uid === 'preview_user_uid') {
        const newDoc: SavedWorkoutDoc = {
          id: `saved_${Date.now()}`,
          title,
          muscleGroups,
          exercises,
          createdAt: new Date(),
        };
        setSavedWorkouts((prev) => [newDoc, ...prev]);
      } else {
        const ref = await addDoc(collection(db, 'saved_workouts'), {
          userId: user.uid,
          title,
          muscleGroups,
          exercises,
          createdAt: new Date(),
        });
        setSavedWorkouts((prev) => [
          { id: ref.id, title, muscleGroups, exercises, createdAt: new Date() },
          ...prev,
        ]);
      }

      setSavedFeedback('Salvo em Meus Treinos!');
      setTimeout(() => setSavedFeedback(null), 2500);
    } catch (err) {
      console.error('Error saving workout to library:', err);
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handleDeleteSavedWorkout = async (workoutId: string) => {
    if (!user) return;
    try {
      if (!isPreviewMode && user.uid !== 'preview_user_uid') {
        await deleteDoc(doc(db, 'saved_workouts', workoutId));
      }
      setSavedWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
      setSelectedSavedWorkout(null);
    } catch (err) {
      console.error('Error deleting saved workout:', err);
    }
  };

  const renderSplitIcon = (icon: WorkoutSplitCatalogItem['icon']) => {
    const cls = 'w-[18px] h-[18px] text-[#ffb95f]';
    switch (icon) {
      case 'sparkles':
        return <Sparkles className={cls} />;
      case 'body':
        return <UserIcon className={cls} />;
      case 'arrows':
        return <ArrowUpDown className={cls} />;
      case 'layers':
        return <Layers className={cls} />;
      case 'dumbbell':
        return <Dumbbell className={cls} />;
      case 'grid':
        return <LayoutGrid className={cls} />;
      case 'plus':
        return <Plus className={cls} />;
    }
  };

  const levels: Array<'Iniciante' | 'Intermediário' | 'Avançado'> = [
    'Iniciante',
    'Intermediário',
    'Avançado',
  ];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando treinos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28">
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[18px]">
        {/* Header + Create Button */}
        <section className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[30px]">
              TREINOS
            </h1>
            <p className="text-[12px] text-[#94a3b8]">
              Suas fichas salvas e divisões prontas
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/workout/active')}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-[#100F0F] font-bold text-[12px] px-3.5 py-2 rounded-full flex items-center gap-1 shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>Treino Livre</span>
          </button>
        </section>

        {/* Goal Filter Pills (like Image 2) */}
        <section className="space-y-[10px]">
          <div className="-mx-4 px-4 flex items-center gap-[8px] overflow-x-auto pb-1 scrollbar-none">
            {GOAL_FILTERS.map((f) => {
              const isActive = goalFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setGoalFilter(f.id)}
                  className={`px-[16px] py-[7px] rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#f8fafc] text-[#100F0F] font-bold shadow-sm'
                      : 'bg-[#151413] border border-white/10 text-[#94a3b8] hover:text-white font-medium'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
            <div className="w-2 shrink-0" />
          </div>

          {/* Search Bar (like Image 2) */}
          <div className="relative">
            <Search className="w-[16px] h-[16px] text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome, músculo ou divisão..."
              className="w-full h-[44px] pl-10 pr-4 rounded-[12px] bg-[#151413] border border-white/[0.08] text-[#f8fafc] placeholder:text-[#64748b] text-[13px] focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 1: MEUS TREINOS SALVOS (User's Saved Workouts)
           ================================================================= */}
        <section className="space-y-[10px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[22px]">
                MEUS TREINOS SALVOS
              </h2>
              <span className="text-[11px] text-[#94a3b8]">
                {filteredSaved.length}{' '}
                {filteredSaved.length === 1 ? 'ficha salva' : 'fichas salvas'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push('/workout/active')}
              className="text-[11px] font-semibold text-[#ffb95f] hover:underline flex items-center gap-0.5"
            >
              <span>Criar novo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingSaved ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#f59e0b]" />
            </div>
          ) : filteredSaved.length === 0 ? (
            <div className="bg-[#151413] border border-dashed border-white/10 rounded-[14px] p-5 text-center space-y-2">
              <Bookmark className="w-6 h-6 text-[#64748b] mx-auto" />
              <p className="text-xs text-[#94a3b8]">
                Nenhum treino salvo ainda. Escolha uma divisão abaixo ou monte um treino livre!
              </p>
            </div>
          ) : (
            <div className="-mx-4 px-4 flex gap-[10px] overflow-x-auto pb-1 scrollbar-none">
              {filteredSaved.map((w) => {
                const totalSets = w.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedSavedWorkout(w)}
                    className="w-[210px] shrink-0 text-left bg-[#151413] hover:bg-[#1c1c13] border border-white/[0.08] rounded-[14px] p-[14px] flex flex-col justify-between gap-[10px] transition-colors"
                  >
                    <div className="space-y-[6px]">
                      <div className="flex items-center justify-between">
                        <span className="bg-[#f59e0b]/15 text-[#ffb95f] text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                          Salvo
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#64748b]" />
                      </div>
                      <h3 className="font-bold text-[#f8fafc] text-[14px] leading-[18px] line-clamp-2">
                        {w.title}
                      </h3>
                    </div>

                    <div className="space-y-[4px]">
                      <p className="text-[11px] text-[#94a3b8] truncate">
                        {w.muscleGroups.join(' • ') || 'Personalizado'}
                      </p>
                      <span className="text-[10px] font-mono font-semibold text-[#d3e156] block">
                        {w.exercises.length} exercícios • {totalSets} séries
                      </span>
                    </div>
                  </button>
                );
              })}
              <div className="w-2 shrink-0" />
            </div>
          )}
        </section>

        {/* =================================================================
            SEÇÃO 2: TIPOS DE TREINO / DIVISÕES (from Image 1)
           ================================================================= */}
        <section className="space-y-[10px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[22px]">
                TIPOS DE TREINO
              </h2>
              <span className="text-[11px] text-[#94a3b8]">
                Escolha como dividir sua rotina semanal
              </span>
            </div>
          </div>

          <div className="space-y-[8px]">
            {filteredCatalog.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'ai_recommended') {
                    // Use user's actual personalized plan splits
                    setSelectedCatalogItem({
                      ...item,
                      subtitle: `${personalizedPlan.objetivoLabel} • ${personalizedPlan.frequenciaLabel}`,
                      splits: personalizedPlan.workouts.map((w) => ({
                        codigo: w.codigo,
                        nome: w.nome,
                        exercicios: w.exercicios.map((e) => ({
                          nome: e.nomeExercicio,
                          muscleGroup: e.muscleGroup,
                          series: e.series,
                        })),
                      })),
                    });
                  } else {
                    setSelectedCatalogItem(item);
                  }
                  setSelectedSplitIdx(0);
                }}
                className="w-full text-left bg-[#151413] hover:bg-[#1c1c13] border border-white/[0.08] hover:border-[#f59e0b]/40 rounded-[14px] p-[14px] flex items-center justify-between gap-3 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-[12px] min-w-0">
                  <div className="w-[40px] h-[40px] rounded-[10px] bg-black border border-white/[0.08] flex items-center justify-center shrink-0">
                    {renderSplitIcon(item.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#f8fafc] text-[15px] leading-[19px]">
                        {item.name}
                      </h3>
                      {item.id === 'ai_recommended' && (
                        <span className="text-[9px] font-bold uppercase bg-[#f59e0b] text-[#100F0F] px-1.5 py-0.5 rounded">
                          IA
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#94a3b8] leading-[16px] truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold text-[#64748b] hidden sm:inline">
                    {item.daysLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* =================================================================
            SEÇÃO 3: EXPLORAR POR NÍVEL (Image 2 Horizontal Carousels, No Thumbnails)
           ================================================================= */}
        <section className="space-y-[16px] pt-1">
          {levels.map((lvl) => {
            const itemsForLevel = filteredCatalog.filter(
              (c) => c.level === lvl && c.id !== 'ai_recommended'
            );
            if (itemsForLevel.length === 0) return null;

            return (
              <div key={lvl} className="space-y-[8px]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-[#f8fafc] text-[17px] uppercase leading-[21px]">
                      {lvl}
                    </h3>
                    <span className="text-[11px] text-[#64748b]">
                      {goalFilter === 'todos'
                        ? 'Todos os objetivos'
                        : GOAL_FILTERS.find((g) => g.id === goalFilter)?.label}
                    </span>
                  </div>
                </div>

                <div className="-mx-4 px-4 flex gap-[10px] overflow-x-auto pb-1 scrollbar-none">
                  {itemsForLevel.map((prog) => (
                    <button
                      key={`lvl_${prog.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedCatalogItem(prog);
                        setSelectedSplitIdx(0);
                      }}
                      className="w-[185px] shrink-0 text-left bg-[#151413] hover:bg-[#1c1c13] border border-white/[0.08] rounded-[14px] p-[14px] flex flex-col justify-between gap-[14px] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#ffb95f] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full">
                          {prog.daysLabel}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#64748b]" />
                      </div>

                      <div>
                        <h4 className="font-bold text-[#f8fafc] text-[14px] leading-[18px]">
                          {prog.name}
                        </h4>
                        <p className="text-[11px] text-[#94a3b8] mt-1 line-clamp-2">
                          {prog.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                  <div className="w-2 shrink-0" />
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* =====================================================================
          BOTTOM-SHEET: DETALHES DO TIPO DE TREINO / SPLIT SELECIONADO
         ===================================================================== */}
      {selectedCatalogItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCatalogItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[448px] bg-[#100F0F] border-t sm:border border-white/10 rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

            <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-start justify-between gap-2 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#ffb95f]">
                  {selectedCatalogItem.daysLabel} • {activeGoalRule.reps} reps •{' '}
                  {activeGoalRule.descansoSegundos}s descanso
                </span>
                <h2 className="font-heading font-bold text-[#f8fafc] text-[20px] uppercase leading-[24px] mt-0.5">
                  {selectedCatalogItem.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCatalogItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Selector Pills (Treino A, B, C...) */}
            <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
              {selectedCatalogItem.splits.map((sp, idx) => (
                <button
                  key={`${sp.codigo}_${idx}`}
                  type="button"
                  onClick={() => setSelectedSplitIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                    selectedSplitIdx === idx
                      ? 'bg-[#f59e0b] text-[#100F0F]'
                      : 'bg-[#151413] border border-white/10 text-[#94a3b8] hover:text-white'
                  }`}
                >
                  Treino {sp.codigo}
                </button>
              ))}
            </div>

            {/* Active Split Exercises */}
            {selectedCatalogItem.splits[selectedSplitIdx] && (() => {
              const activeSplit = selectedCatalogItem.splits[selectedSplitIdx];
              const totalSets = activeSplit.exercicios.reduce((a, e) => a + e.series, 0);
              return (
                <>
                  <div className="px-5 py-3 overflow-y-auto flex-1 space-y-2.5 scrollbar-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#f8fafc]">
                        {activeSplit.nome}
                      </span>
                      <span className="text-[11px] text-[#94a3b8] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {totalSets} séries
                      </span>
                    </div>

                    {savedFeedback && (
                      <div className="bg-[#d3e156]/15 border border-[#d3e156]/40 text-[#d3e156] text-xs font-semibold px-3 py-2 rounded-[10px] flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> {savedFeedback}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {activeSplit.exercicios.map((ex, i) => (
                        <div
                          key={`${ex.nome}_${i}`}
                          className="bg-[#151413] border border-white/[0.06] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="block text-[13px] font-semibold text-[#f8fafc] truncate">
                              {ex.nome}
                            </span>
                            <span className="block text-[10px] text-[#64748b]">
                              {ex.muscleGroup}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[12px] text-[#d3e156] shrink-0">
                            {ex.series} × {activeGoalRule.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div className="p-4 border-t border-white/10 bg-[#151413] flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={savingToLibrary}
                      onClick={() => handleSaveSplitToUserLibrary(activeSplit)}
                      className="px-3.5 py-3 rounded-full bg-black hover:bg-white/10 border border-white/15 text-[#ffb95f] text-[12px] font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartCatalogSplit(activeSplit)}
                      className="flex-1 bg-[#f8fafc] hover:bg-white min-h-[46px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
                    >
                      <span className="font-heading font-semibold text-[#202017] text-[15px] tracking-[0.4px] uppercase">
                        INICIAR TREINO {activeSplit.codigo}
                      </span>
                      <span className="w-[32px] h-[32px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                        <Play className="w-[14px] h-[14px] text-[#202017] fill-current ml-0.5" />
                      </span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM-SHEET: DETALHES DO TREINO SALVO PELO USUÁRIO
         ===================================================================== */}
      {selectedSavedWorkout && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedSavedWorkout(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[448px] bg-[#100F0F] border-t sm:border border-white/10 rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

            <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-start justify-between gap-2 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#ffb95f]">
                  TREINO SALVO
                </span>
                <h2 className="font-heading font-bold text-[#f8fafc] text-[19px] uppercase leading-[24px] mt-0.5">
                  {selectedSavedWorkout.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSavedWorkout(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#94a3b8] hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2 scrollbar-none">
              {selectedSavedWorkout.exercises.map((ex, idx) => (
                <div
                  key={`${ex.exerciseId}_${idx}`}
                  className="bg-[#151413] border border-white/[0.06] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[#f8fafc] truncate">
                      {ex.nomeExercicio}
                    </span>
                    <span className="block text-[10px] text-[#64748b]">{ex.muscleGroup}</span>
                  </div>
                  <span className="font-mono font-bold text-[12px] text-[#d3e156] shrink-0">
                    {ex.sets?.length || 3} séries
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#151413] flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteSavedWorkout(selectedSavedWorkout.id)}
                className="w-11 h-11 rounded-full bg-[#ff6e61]/15 hover:bg-[#ff6e61]/25 text-[#ff6e61] flex items-center justify-center shrink-0 transition-colors"
                title="Excluir treino salvo"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  launchActiveWorkout({
                    title: selectedSavedWorkout.title,
                    restDurationSeconds: activeGoalRule.descansoSegundos,
                    exercises: selectedSavedWorkout.exercises,
                  })
                }
                className="flex-1 bg-[#f8fafc] hover:bg-white min-h-[46px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
              >
                <span className="font-heading font-semibold text-[#202017] text-[15px] tracking-[0.4px] uppercase">
                  INICIAR ESTE TREINO
                </span>
                <span className="w-[32px] h-[32px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                  <Play className="w-[14px] h-[14px] text-[#202017] fill-current ml-0.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

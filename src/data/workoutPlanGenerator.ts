import workoutPlansData from './workoutPlans.json';
import { PREDEFINED_EXERCISES } from './exercises';
import type { UserProfile } from '@/context/AuthContext';

export interface GeneratedExerciseItem {
  exerciseId: string;
  nomeExercicio: string;
  muscleGroup: string;
  series: number;
  repsTarget: string;
  defaultRepsNumber: number;
  descansoSegundos: number;
  isFocusBonus?: boolean;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
}

export interface GeneratedWorkoutSplit {
  id: string;
  codigo: string;
  nome: string;
  muscleGroups: string[];
  totalSets: number;
  estimatedMinutes: number;
  repsTarget: string;
  descansoSegundos: number;
  exercicios: GeneratedExerciseItem[];
}

export interface GeneratedPlanSummary {
  objetivo: NonNullable<UserProfile['objetivo']>;
  objetivoLabel: string;
  frequencia: NonNullable<UserProfile['frequenciaSemanal']>;
  frequenciaLabel: string;
  focoGrupo: NonNullable<UserProfile['focoMuscularGrupo']>;
  focoLabel: string;
  repsTarget: string;
  descansoSegundos: number;
  workouts: GeneratedWorkoutSplit[];
}

const OBJETIVO_LABELS: Record<NonNullable<UserProfile['objetivo']>, string> = {
  hipertrofia: 'Ganhar Massa Magra',
  forca: 'Aumentar Força Física',
  definicao: 'Reduzir Gordura Corporal',
  condicionamento: 'Condicionamento Físico',
};

const FREQUENCIA_LABELS: Record<NonNullable<UserProfile['frequenciaSemanal']>, string> = {
  '2-3': '2 a 3 dias/sem',
  '4-5': '4 a 5 dias/sem',
  '6': '6 dias/sem',
  flexivel: 'Dias Flexíveis',
};

const FOCO_LABELS: Record<NonNullable<UserProfile['focoMuscularGrupo']>, string> = {
  corpo_inteiro: 'Corpo Inteiro',
  superiores: 'Membros Superiores',
  inferiores: 'Membros Inferiores',
};

function parseDefaultReps(repsRange: string): number {
  const parts = repsRange.split('-').map((n) => parseInt(n.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return Math.round((parts[0] + parts[1]) / 2);
  }
  const single = parseInt(repsRange, 10);
  return isNaN(single) ? 10 : single;
}

function findPredefinedExercise(nome: string) {
  const normalized = nome.trim().toLowerCase();
  return PREDEFINED_EXERCISES.find((e) => e.nome.trim().toLowerCase() === normalized);
}

/**
 * Generates a personalized workout plan from workoutPlans.json based on the
 * user's onboarding profile (objetivo, frequenciaSemanal, focoMuscularGrupo, focoMuscularLista).
 */
export function generatePersonalizedPlan(profile?: Partial<UserProfile> | null): GeneratedPlanSummary {
  const objetivo: NonNullable<UserProfile['objetivo']> = profile?.objetivo || 'hipertrofia';
  const frequencia: NonNullable<UserProfile['frequenciaSemanal']> =
    profile?.frequenciaSemanal || '4-5';
  const focoGrupo: NonNullable<UserProfile['focoMuscularGrupo']> =
    profile?.focoMuscularGrupo || 'corpo_inteiro';
  const focoMusculos = profile?.focoMuscularLista || ['TODOS'];

  const regra =
    workoutPlansData.regrasObjetivo[objetivo] || workoutPlansData.regrasObjetivo.hipertrofia;
  const baseSplits =
    workoutPlansData.divisoesPorFrequencia[frequencia] ||
    workoutPlansData.divisoesPorFrequencia['4-5'];
  const bonusList = workoutPlansData.bonusFocoMuscular[focoGrupo] || [];

  const defaultRepsNum = parseDefaultReps(regra.reps);
  const seriesAdjustment = objetivo === 'forca' ? 1 : 0;

  const workouts: GeneratedWorkoutSplit[] = baseSplits.map((split, splitIdx) => {
    const exercicios: GeneratedExerciseItem[] = split.exercicios.map((ex) => {
      const found = findPredefinedExercise(ex.nome);
      const isSpecificFocus =
        !focoMusculos.includes('TODOS') && focoMusculos.includes(ex.muscleGroup);
      const baseSeries = Math.max(2, ex.series + seriesAdjustment + (isSpecificFocus ? 1 : 0));

      return {
        exerciseId: found?.id || `gen_${ex.nome.toLowerCase().replace(/\s+/g, '_')}`,
        nomeExercicio: found?.nome || ex.nome,
        muscleGroup: found?.muscleGroup || ex.muscleGroup,
        series: baseSeries,
        repsTarget: regra.reps,
        defaultRepsNumber: defaultRepsNum,
        descansoSegundos: regra.descansoSegundos,
        isFocusBonus: isSpecificFocus,
        thumbnailUrl: found?.thumbnailUrl,
        gifUrl: found?.gifUrl,
        description: found?.description,
      };
    });

    // Inject focus bonus into matching workouts (if not already present)
    if (bonusList.length > 0 && splitIdx < bonusList.length) {
      const bonus = bonusList[splitIdx];
      const existing = exercicios.find(
        (e) => e.nomeExercicio.toLowerCase() === bonus.nome.toLowerCase()
      );
      if (existing) {
        existing.series += bonus.seriesExtras;
        existing.isFocusBonus = true;
      } else {
        const found = findPredefinedExercise(bonus.nome);
        exercicios.push({
          exerciseId: found?.id || `bonus_${bonus.nome.toLowerCase().replace(/\s+/g, '_')}`,
          nomeExercicio: found?.nome || bonus.nome,
          muscleGroup: found?.muscleGroup || 'Geral',
          series: Math.max(2, bonus.seriesExtras),
          repsTarget: regra.reps,
          defaultRepsNumber: defaultRepsNum,
          descansoSegundos: regra.descansoSegundos,
          isFocusBonus: true,
          thumbnailUrl: found?.thumbnailUrl,
          gifUrl: found?.gifUrl,
          description: found?.description,
        });
      }
    }

    const muscleGroups = Array.from(new Set(exercicios.map((e) => e.muscleGroup)));
    const totalSets = exercicios.reduce((acc, e) => acc + e.series, 0);
    const estimatedMinutes = Math.round(totalSets * ((regra.descansoSegundos + 45) / 60));

    return {
      id: `plan_${frequencia}_${split.codigo}`,
      codigo: split.codigo,
      nome: split.nome,
      muscleGroups,
      totalSets,
      estimatedMinutes: Math.max(30, Math.min(85, estimatedMinutes)),
      repsTarget: regra.reps,
      descansoSegundos: regra.descansoSegundos,
      exercicios,
    };
  });

  return {
    objetivo,
    objetivoLabel: OBJETIVO_LABELS[objetivo],
    frequencia,
    frequenciaLabel: FREQUENCIA_LABELS[frequencia],
    focoGrupo,
    focoLabel: FOCO_LABELS[focoGrupo],
    repsTarget: regra.reps,
    descansoSegundos: regra.descansoSegundos,
    workouts,
  };
}

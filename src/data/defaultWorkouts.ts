import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PREDEFINED_EXERCISES } from './exercises';

export interface DefaultWorkoutTemplate {
  id: string;
  defaultKey: 'A' | 'B' | 'C';
  title: string;
  shortTitle: string;
  subtitle: string;
  muscleGroups: string[];
  estimatedMinutes: number;
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
}

function buildTemplateExercise(exerciseId: string, defaultReps: number = 10) {
  const found = PREDEFINED_EXERCISES.find((e) => e.id === exerciseId);
  return {
    exerciseId,
    nomeExercicio: found?.nome || exerciseId,
    muscleGroup: found?.muscleGroup || 'Peito',
    thumbnailUrl: found?.thumbnailUrl || '',
    gifUrl: found?.gifUrl || '',
    description: found?.description || '',
    sets: [
      { setNumber: 1, cargaKg: '' as number | '', reps: defaultReps },
      { setNumber: 2, cargaKg: '' as number | '', reps: defaultReps },
      { setNumber: 3, cargaKg: '' as number | '', reps: defaultReps }
    ]
  };
}

export const DEFAULT_WORKOUT_TEMPLATES: DefaultWorkoutTemplate[] = [
  {
    id: 'default_treino_a',
    defaultKey: 'A',
    title: 'Treino A • Peito, Tríceps e Ombro',
    shortTitle: 'Treino A • Push',
    subtitle: 'Peito, Tríceps e Ombro',
    muscleGroups: ['Peito', 'Tríceps', 'Ombro'],
    estimatedMinutes: 55,
    exercises: [
      buildTemplateExercise('pre_supino_reto_barra', 10),
      buildTemplateExercise('pre_supino_inclinado_halteres', 10),
      buildTemplateExercise('pre_peck_deck', 12),
      buildTemplateExercise('pre_overhead_press', 10),
      buildTemplateExercise('pre_lateral_raise', 12),
      buildTemplateExercise('pre_triceps_pulley_corda', 12),
      buildTemplateExercise('pre_triceps_testa', 10)
    ]
  },
  {
    id: 'default_treino_b',
    defaultKey: 'B',
    title: 'Treino B • Costas, Bíceps e Abdômen',
    shortTitle: 'Treino B • Pull',
    subtitle: 'Costas, Bíceps e Abdômen',
    muscleGroups: ['Costas', 'Bíceps', 'Abdômen'],
    estimatedMinutes: 55,
    exercises: [
      buildTemplateExercise('pre_puxada_pulley_pronada', 10),
      buildTemplateExercise('pre_puxada_alta', 12),
      buildTemplateExercise('pre_remada_curvada', 10),
      buildTemplateExercise('pre_rosca_direta_barra_w', 10),
      buildTemplateExercise('pre_rosca_martelo', 12),
      buildTemplateExercise('pre_abdominal_infra', 15),
      buildTemplateExercise('pre_prancha_isometrica', 1)
    ]
  },
  {
    id: 'default_treino_c',
    defaultKey: 'C',
    title: 'Treino C • Quadríceps, Posteriores e Panturrilha',
    shortTitle: 'Treino C • Legs',
    subtitle: 'Quadríceps, Posteriores e Panturrilha',
    muscleGroups: ['Quadríceps', 'Posterior de Coxa', 'Panturrilha/Canela'],
    estimatedMinutes: 60,
    exercises: [
      buildTemplateExercise('pre_agachamento_livre', 10),
      buildTemplateExercise('pre_leg_press_45', 12),
      buildTemplateExercise('pre_cadeira_extensora', 12),
      buildTemplateExercise('pre_stiff', 10),
      buildTemplateExercise('pre_mesa_flexora', 12),
      buildTemplateExercise('pre_standing_calf', 15),
      buildTemplateExercise('pre_seated_calf', 15)
    ]
  }
];

/**
 * Garante que as 3 fichas básicas (A, B, C) existam na coleção `saved_workouts` do usuário,
 * retornando a lista completa de fichas salvas (do usuário + básicas).
 */
export async function fetchAndEnsureSavedWorkouts(userId: string) {
  const q = query(collection(db, 'saved_workouts'), where('userId', '==', userId));
  const snap = await getDocs(q);

  const existing: Array<{
    id: string;
    userId: string;
    title: string;
    defaultKey?: string;
    muscleGroups: string[];
    exercises: DefaultWorkoutTemplate['exercises'];
    createdAt?: any;
  }> = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    existing.push({
      id: docSnap.id,
      userId: d.userId,
      title: d.title || 'Treino Salvo',
      defaultKey: d.defaultKey,
      muscleGroups: Array.isArray(d.muscleGroups) ? d.muscleGroups : [],
      exercises: Array.isArray(d.exercises) ? d.exercises : [],
      createdAt: d.createdAt
    });
  });

  // Check which of the 3 basic templates (A, B, C) haven't been seeded yet
  for (const def of DEFAULT_WORKOUT_TEMPLATES) {
    const alreadyExists = existing.some(
      (w) =>
        w.defaultKey === def.defaultKey ||
        w.title.toLowerCase().startsWith(`treino ${def.defaultKey.toLowerCase()}`)
    );

    if (!alreadyExists) {
      try {
        const payload = {
          userId,
          defaultKey: def.defaultKey,
          title: def.title,
          muscleGroups: def.muscleGroups,
          exercises: def.exercises,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const docRef = await addDoc(collection(db, 'saved_workouts'), payload);
        existing.push({
          id: docRef.id,
          ...payload
        });
      } catch (e) {
        console.error('Error seeding default workout template:', def.title, e);
        existing.push({
          id: def.id,
          userId,
          defaultKey: def.defaultKey,
          title: def.title,
          muscleGroups: def.muscleGroups,
          exercises: def.exercises,
          createdAt: new Date()
        });
      }
    }
  }

  // Sort: A, B, C first (in order), then custom user templates newest first
  const orderMap: Record<string, number> = { A: 1, B: 2, C: 3 };
  existing.sort((a, b) => {
    const orderA = a.defaultKey ? orderMap[a.defaultKey] || 99 : 99;
    const orderB = b.defaultKey ? orderMap[b.defaultKey] || 99 : 99;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return existing;
}

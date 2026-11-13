export interface PredefinedExercise {
  id: string;
  nome: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
  isPredefined: true;
}

export function normalizeExerciseName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function resolveExerciseMigration(data: {
  nomeExercicio?: string;
  predefinedId?: string;
  migratedV2?: boolean;
}): {
  shouldDelete?: boolean;
  newName?: string;
  newPredefinedId?: string;
  markMigratedV2?: boolean;
} {
  const norm = normalizeExerciseName(data.nomeExercicio || '');
  const pid = data.predefinedId || '';

  // Exercícios removidos
  if (
    pid === 'pre_afundo_no_smith' ||
    norm === 'afundo no smith' ||
    pid === 'pre_triceps_barra_cross' ||
    norm === 'triceps barra no cross' ||
    pid === 'pre_triceps_pulley' ||
    norm === 'triceps pulley'
  ) {
    return { shouldDelete: true };
  }

  // COSTAS
  if (
    pid === 'pre_puxada_alta' ||
    (norm === 'puxada alta na polia' && pid !== 'pre_puxada_pulley_pronada' && !data.migratedV2)
  ) {
    if (norm !== 'puxada alta com triangulo') {
      return {
        newName: 'Puxada Alta com Triângulo',
        newPredefinedId: 'pre_puxada_alta',
        markMigratedV2: true
      };
    }
  }
  if (pid === 'pre_puxada_pulley_pronada' || norm === 'puxada pulley pronada') {
    if (norm !== 'puxada alta na polia') {
      return {
        newName: 'Puxada Alta na Polia',
        newPredefinedId: 'pre_puxada_pulley_pronada',
        markMigratedV2: true
      };
    }
  }

  // PEITO
  if ((pid === 'pre_peck_deck' || norm === 'peck deck') && norm !== 'voador maquina peck deck') {
    return {
      newName: 'Voador Máquina Peck Deck',
      newPredefinedId: 'pre_peck_deck'
    };
  }

  // OMBRO
  if (
    (pid === 'pre_overhead_press' || norm === 'desenvolvimento militar') &&
    norm !== 'desenvolvimento militar com barra'
  ) {
    return {
      newName: 'Desenvolvimento Militar com Barra',
      newPredefinedId: 'pre_overhead_press'
    };
  }

  // BÍCEPS
  if (norm === 'concentrado unilateral') {
    return {
      newName: 'Rosca Concentrada no Banco Scott',
      newPredefinedId: 'pre_rosca_concentrada_banco_scott'
    };
  }
  if (norm === 'alternado') {
    return {
      newName: 'Rosca Alternada',
      newPredefinedId: 'pre_rosca_alternada'
    };
  }

  // TRÍCEPS
  if ((pid === 'pre_triceps_coice' || norm === 'triceps coice') && norm !== 'triceps coice na polia') {
    return {
      newName: 'Tríceps Coice na Polia',
      newPredefinedId: 'pre_triceps_coice'
    };
  }
  if (
    (pid === 'pre_triceps_frances_halter' ||
      (norm === 'triceps frances com halter' &&
        pid !== 'pre_triceps_frances_halter_unilateral' &&
        !data.migratedV2)) &&
    norm !== 'triceps frances com halter bilateral'
  ) {
    return {
      newName: 'Tríceps Francês com Halter Bilateral',
      newPredefinedId: 'pre_triceps_frances_halter',
      markMigratedV2: true
    };
  }
  if (
    (pid === 'pre_triceps_pulley_corda' ||
      norm === 'triceps pulley na corda' ||
      norm === 'triceps pulley corda') &&
    norm !== 'triceps corda na polia'
  ) {
    return {
      newName: 'Tríceps Corda na Polia',
      newPredefinedId: 'pre_triceps_pulley_corda'
    };
  }
  if ((pid === 'pre_triceps_testa' || norm === 'triceps testa') && norm !== 'triceps testa com barra') {
    return {
      newName: 'Tríceps Testa com Barra',
      newPredefinedId: 'pre_triceps_testa'
    };
  }

  // QUADRÍCEPS
  if (norm === 'avanco unilateral maquina') {
    return {
      newName: 'Avanço na Máquina Smith',
      newPredefinedId: 'pre_avanco_maquina_smith'
    };
  }

  // POSTERIOR DE COXA
  if ((pid === 'pre_stiff' || norm === 'stiff') && norm !== 'stiff com barra') {
    return {
      newName: 'Stiff com Barra',
      newPredefinedId: 'pre_stiff'
    };
  }

  // PANTURRILHA
  if (
    (pid === 'pre_seated_calf' || norm === 'gemeos sentado') &&
    norm !== 'elevacao de panturrilha sentado'
  ) {
    return {
      newName: 'Elevação de Panturrilha Sentado',
      newPredefinedId: 'pre_seated_calf'
    };
  }

  return {};
}

export const PREDEFINED_EXERCISES: PredefinedExercise[] = [
  // PEITO
  {
    id: 'pre_supino_reto_barra',
    nome: 'Supino Reto com Barra',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Supino-Reto.gif',
    gifUrl: '/gifs/Supino-Reto.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_halteres',
    nome: 'Supino Inclinado com Halteres',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Supino-Inclinado-com-Halteres.gif',
    gifUrl: '/gifs/Supino-Inclinado-com-Halteres.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_crucifixo_halteres_inclinado',
    nome: 'Crucifixo com Halteres Inclinado',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Crucifixo-com-Halteres-Inclinado.gif',
    gifUrl: '/gifs/Crucifixo-com-Halteres-Inclinado.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_supino_com_alavanca',
    nome: 'Supino com Alavanca',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Supino-com-Alavanca.gif',
    gifUrl: '/gifs/Supino-com-Alavanca.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_na_alavanca',
    nome: 'Supino Inclinado na Alavanca',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Supino-Inclinado-na-Alavanca.gif',
    gifUrl: '/gifs/Supino-Inclinado-na-Alavanca.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_barra',
    nome: 'Supino Inclinado com Barra',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Supino-inclinado-com-barra.gif',
    gifUrl: '/gifs/Supino-inclinado-com-barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_peck_deck',
    nome: 'Voador Máquina Peck Deck',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Voador-Maquina-Peck-Deck.gif',
    gifUrl: '/gifs/Voador-Maquina-Peck-Deck.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_voador_estendido_maquina',
    nome: 'Voador Estendido na Máquina',
    muscleGroup: 'Peito',
    thumbnailUrl: '/gifs/Voador-Estendido-na-Maquina.gif',
    gifUrl: '/gifs/Voador-Estendido-na-Maquina.gif',
    description: '',
    isPredefined: true
  },

  // QUADRÍCEPS
  {
    id: 'pre_agachamento_livre',
    nome: 'Agachamento Livre',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/agachamento-livre-com-barra.gif',
    gifUrl: '/gifs/agachamento-livre-com-barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_leg_press_45',
    nome: 'Leg Press 45º',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/Leg-Press.gif',
    gifUrl: '/gifs/Leg-Press.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_leg_press_unilateral',
    nome: 'Leg Press Unilateral',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/Leg-Press-unilateral.gif',
    gifUrl: '/gifs/Leg-Press-unilateral.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_extensora',
    nome: 'Cadeira Extensora',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/Cadeira-extensora.gif',
    gifUrl: '/gifs/Cadeira-extensora.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_avanco_maquina_smith',
    nome: 'Avanço na Máquina Smith',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/Afundo-na-maquina-Smith.gif',
    gifUrl: '/gifs/Afundo-na-maquina-Smith.gif',
    description: '',
    isPredefined: true
  },

  // COSTAS
  {
    id: 'pre_remada_fechada_maquina',
    nome: 'Remada Fechada na Máquina',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Remada-fechada-na-maquina.gif',
    gifUrl: '/gifs/Remada-fechada-na-maquina.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_banco_inclinado',
    nome: 'Remada no Banco Inclinado',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Remada-no-banco-inclinado.gif',
    gifUrl: '/gifs/Remada-no-banco-inclinado.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_sentada_fechada',
    nome: 'Remada Sentada Fechada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Remada-sentada-fechada.gif',
    gifUrl: '/gifs/Remada-sentada-fechada.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_puxada_pulley_pronada',
    nome: 'Puxada Alta na Polia',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Puxada-alta-na-polia.gif',
    gifUrl: '/gifs/Puxada-alta-na-polia.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_puxada_alta',
    nome: 'Puxada Alta com Triângulo',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Puxada-alta-com-Triangulo.gif',
    gifUrl: '/gifs/Puxada-alta-com-Triangulo.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_puxada_alta_unilateral',
    nome: 'Puxada Alta Unilateral',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Puxada-alta-unilateral.gif',
    gifUrl: '/gifs/Puxada-alta-unilateral.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_curvada',
    nome: 'Remada Curvada com Barra',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Remada Curvada com Barra.gif',
    gifUrl: '/gifs/Remada Curvada com Barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_deadlift',
    nome: 'Levantamento Terra',
    muscleGroup: 'Costas',
    thumbnailUrl: '/gifs/Levantamento-Terra.gif',
    gifUrl: '/gifs/Levantamento-Terra.gif',
    description: '',
    isPredefined: true
  },

  // OMBRO
  {
    id: 'pre_overhead_press',
    nome: 'Desenvolvimento Militar com Barra',
    muscleGroup: 'Ombro',
    thumbnailUrl: '/gifs/Desenvolvimento-militar-com-barra.gif',
    gifUrl: '/gifs/Desenvolvimento-militar-com-barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_lateral_raise',
    nome: 'Elevação Lateral com Halteres',
    muscleGroup: 'Ombro',
    thumbnailUrl: '/gifs/Elevacao-lateral-com-halter.gif',
    gifUrl: '/gifs/Elevacao-lateral-com-halter.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_elevacao_frontal_halter',
    nome: 'Elevação Frontal com Halter',
    muscleGroup: 'Ombro',
    thumbnailUrl: '/gifs/Elevacao-frontal-com-halter.gif',
    gifUrl: '/gifs/Elevacao-frontal-com-halter.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_voador_invertido_maquina',
    nome: 'Voador Invertido na Máquina',
    muscleGroup: 'Ombro',
    thumbnailUrl: '/gifs/Voador-invertido-na-maquina.gif',
    gifUrl: '/gifs/Voador-invertido-na-maquina.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_elevacao_lateral_maquina',
    nome: 'Elevação Lateral na Máquina',
    muscleGroup: 'Ombro',
    thumbnailUrl: '/gifs/Elevacao-lateral-na-maquina.gif',
    gifUrl: '/gifs/Elevacao-lateral-na-maquina.gif',
    description: '',
    isPredefined: true
  },

  // BÍCEPS
  {
    id: 'pre_rosca_concentrada',
    nome: 'Rosca Concentrada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-concentrada.gif',
    gifUrl: '/gifs/Rosca-concentrada.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_concentrada_banco_scott',
    nome: 'Rosca Concentrada no Banco Scott',
    muscleGroup: 'Bíceps',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta_barra_w',
    nome: 'Rosca Direta Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-direta-com-barra-w.gif',
    gifUrl: '/gifs/Rosca-direta-com-barra-w.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_scott_barra_w',
    nome: 'Rosca Scott Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-Scott-com-Barra-W.gif',
    gifUrl: '/gifs/Rosca-Scott-com-Barra-W.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_scott_alavanca',
    nome: 'Rosca Scott com Alavanca',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-Scott-com-Alavanca.gif',
    gifUrl: '/gifs/Rosca-Scott-com-Alavanca.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_no_cabo',
    nome: 'Rosca no Cabo',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-no-Cabo.gif',
    gifUrl: '/gifs/Rosca-no-Cabo.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_alternada',
    nome: 'Rosca Alternada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Alternado.gif',
    gifUrl: '/gifs/Alternado.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta',
    nome: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-Direta-com-Barra.gif',
    gifUrl: '/gifs/Rosca-Direta-com-Barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_martelo',
    nome: 'Rosca Martelo',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/gifs/Rosca-martelo.gif',
    gifUrl: '/gifs/Rosca-martelo.gif',
    description: '',
    isPredefined: true
  },

  // TRÍCEPS
  {
    id: 'pre_triceps_coice',
    nome: 'Tríceps Coice na Polia',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-Coice-com-Halter.gif',
    gifUrl: '/gifs/Triceps-Coice-com-Halter.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_frances_halter',
    nome: 'Tríceps Francês com Halter Bilateral',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-Frances-com-Halter-Bilateral.gif',
    gifUrl: '/gifs/Triceps-Frances-com-Halter-Bilateral.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_frances_halter_unilateral',
    nome: 'Tríceps Francês com Halter',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-Frances-com-Halter.gif',
    gifUrl: '/gifs/Triceps-Frances-com-Halter.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley_corda',
    nome: 'Tríceps Corda na Polia',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-corda-na-polia.gif',
    gifUrl: '/gifs/Triceps-corda-na-polia.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_barra_polia',
    nome: 'Tríceps Barra na Polia',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-barra-na-polia.gif',
    gifUrl: '/gifs/Triceps-barra-na-polia.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_testa',
    nome: 'Tríceps Testa com Barra',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/gifs/Triceps-testa-com-barra.gif',
    gifUrl: '/gifs/Triceps-testa-com-barra.gif',
    description: '',
    isPredefined: true
  },

  // ANTEBRAÇO
  {
    id: 'pre_rosca_inversa',
    nome: 'Rosca Inversa',
    muscleGroup: 'Antebraço',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_flexao_punho',
    nome: 'Flexão de Punho',
    muscleGroup: 'Antebraço',
    description: '',
    isPredefined: true
  },

  // GLÚTEOS
  {
    id: 'pre_hip_thrust',
    nome: 'Elevação Pélvica',
    muscleGroup: 'Glúteos',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_cable_kickback',
    nome: 'Coice na Polia',
    muscleGroup: 'Glúteos',
    description: '',
    isPredefined: true
  },

  // POSTERIOR DE COXA
  {
    id: 'pre_mesa_flexora',
    nome: 'Mesa Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/gifs/Mesa-flexora.gif',
    gifUrl: '/gifs/Mesa-flexora.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_flexora',
    nome: 'Cadeira Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/gifs/Cadeira-flexora.gif',
    gifUrl: '/gifs/Cadeira-flexora.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_stiff',
    nome: 'Stiff com Barra',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/gifs/Stiff-com-barra.gif',
    gifUrl: '/gifs/Stiff-com-barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_stiff_unilateral_barra',
    nome: 'Stiff Unilateral com Barra',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/gifs/Stiff-Unilateral-com-Barra.gif',
    gifUrl: '/gifs/Stiff-Unilateral-com-Barra.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_stiff_halter',
    nome: 'Stiff com Halter',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/gifs/Stiff-com-Halter.gif',
    gifUrl: '/gifs/Stiff-com-Halter.gif',
    description: '',
    isPredefined: true
  },

  // QUADRIL
  {
    id: 'pre_cadeira_adutora',
    nome: 'Cadeira Adutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Adutora.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_abdutora',
    nome: 'Cadeira Abdutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Abdutora.png',
    description: '',
    isPredefined: true
  },

  // PANTURRILHA/CANELA
  {
    id: 'pre_standing_calf',
    nome: 'Gêmeos em Pé',
    muscleGroup: 'Panturrilha/Canela',
    thumbnailUrl: '/gifs/Gemeos-em-pe.gif',
    gifUrl: '/gifs/Gemeos-em-pe.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_seated_calf',
    nome: 'Elevação de Panturrilha Sentado',
    muscleGroup: 'Panturrilha/Canela',
    thumbnailUrl: '/gifs/Elevacao-de-Panturrilha-Sentado.gif',
    gifUrl: '/gifs/Elevacao-de-Panturrilha-Sentado.gif',
    description: '',
    isPredefined: true
  },

  // ABDÔMEN
  {
    id: 'pre_abdominal_infra',
    nome: 'Abdominal Infra',
    muscleGroup: 'Abdômen',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_prancha_isometrica',
    nome: 'Prancha Isométrica',
    muscleGroup: 'Abdômen',
    description: '',
    isPredefined: true
  }
];

export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombro',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Glúteos',
  'Quadríceps',
  'Posterior de Coxa',
  'Quadril',
  'Panturrilha/Canela',
  'Abdômen'
];

/**
 * Helper para buscar mídia (GIF, thumbnail) e descrição de um exercício por ID ou Nome.
 */
export function getExerciseGuide(identifier: { id?: string; name?: string }): {
  gifUrl?: string;
  description?: string;
  thumbnailUrl?: string;
  nome?: string;
  muscleGroup?: string;
} {
  const cleanName = normalizeExerciseName(identifier.name || '');

  // Caso especial para Crucifixo Inclinado Cross
  if (cleanName.includes('crucifixo') && cleanName.includes('cross')) {
    return {
      gifUrl: '/gifs/Crucifixo Inclinado Cross.gif',
      thumbnailUrl: '/gifs/Crucifixo Inclinado Cross.gif',
      description: '',
      nome: identifier.name,
      muscleGroup: 'Peito'
    };
  }

  const ex = PREDEFINED_EXERCISES.find((e) => {
    if (identifier.id && e.id === identifier.id) return true;
    if (!cleanName) return false;
    const eName = normalizeExerciseName(e.nome);
    if (eName === cleanName) return true;

    // Aliases amigáveis para nomes alternativos ou antigos
    if (cleanName === 'supino reto' && e.id === 'pre_supino_reto_barra') return true;
    if (cleanName === 'peck deck' && e.id === 'pre_peck_deck') return true;
    if (cleanName === 'leg press' && e.id === 'pre_leg_press_45') return true;
    if (
      (cleanName === 'avanco unilateral maquina' ||
        cleanName === 'afundo no smith' ||
        cleanName === 'afundo na maquina smith') &&
      e.id === 'pre_avanco_maquina_smith'
    )
      return true;
    if (cleanName === 'puxada pulley pronada' && e.id === 'pre_puxada_pulley_pronada') return true;
    if (cleanName === 'desenvolvimento militar' && e.id === 'pre_overhead_press') return true;
    if (cleanName === 'elevacao lateral com halter' && e.id === 'pre_lateral_raise') return true;
    if (cleanName === 'alternado' && e.id === 'pre_rosca_alternada') return true;
    if (cleanName === 'concentrado unilateral' && e.id === 'pre_rosca_concentrada_banco_scott') return true;
    if ((cleanName === 'triceps coice' || cleanName === 'triceps coice com halter') && e.id === 'pre_triceps_coice')
      return true;
    if ((cleanName === 'triceps pulley na corda' || cleanName === 'triceps pulley corda') && e.id === 'pre_triceps_pulley_corda')
      return true;
    if (cleanName === 'triceps testa' && e.id === 'pre_triceps_testa') return true;
    if (cleanName === 'stiff' && e.id === 'pre_stiff') return true;
    if (cleanName === 'gemeos sentado' && e.id === 'pre_seated_calf') return true;
    if (
      cleanName.includes('crucifixo') &&
      cleanName.includes('inclinado') &&
      !cleanName.includes('cross') &&
      e.id === 'pre_crucifixo_halteres_inclinado'
    )
      return true;
    if (
      cleanName.includes('supino') &&
      cleanName.includes('alavanca') &&
      !cleanName.includes('inclinado') &&
      e.id === 'pre_supino_com_alavanca'
    )
      return true;
    if (
      cleanName.includes('supino') &&
      cleanName.includes('alavanca') &&
      cleanName.includes('inclinado') &&
      e.id === 'pre_supino_inclinado_na_alavanca'
    )
      return true;
    return false;
  });

  return {
    gifUrl: ex?.gifUrl,
    description: ex?.description || '',
    thumbnailUrl: ex?.thumbnailUrl,
    nome: ex?.nome,
    muscleGroup: ex?.muscleGroup
  };
}

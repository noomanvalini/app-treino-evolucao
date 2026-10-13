export interface PredefinedExercise {
  id: string;
  nome: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  description?: string;
  isPredefined: true;
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
    thumbnailUrl: '/images/exercises/supino-inclinado-barra.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_peck_deck',
    nome: 'Peck Deck',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/peck-deck.png',
    description: '',
    isPredefined: true
  },

  // QUADRÍCEPS
  {
    id: 'pre_agachamento_livre',
    nome: 'Agachamento Livre',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/agachamento-livre.png',
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
    id: 'pre_cadeira_extensora',
    nome: 'Cadeira Extensora',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/gifs/Cadeira-extensora.gif',
    gifUrl: '/gifs/Cadeira-extensora.gif',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_afundo_no_smith',
    nome: 'Afundo no Smith',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/Afundo-no-Smith.png',
    description: '',
    isPredefined: true
  },

  // COSTAS
  {
    id: 'pre_remada_fechada_maquina',
    nome: 'Remada Fechada na Máquina',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada-Fechada-Maquina.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_banco_inclinado',
    nome: 'Remada no Banco Inclinado',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Banco Inclinado.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_sentada_fechada',
    nome: 'Remada Sentada Fechada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Sentada Fechada.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_puxada_pulley_pronada',
    nome: 'Puxada Pulley Pronada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Puxada Pulley Pronada.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_puxada_alta',
    nome: 'Puxada Alta na Polia',
    muscleGroup: 'Costas',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_remada_curvada',
    nome: 'Remada Curvada com Barra',
    muscleGroup: 'Costas',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_deadlift',
    nome: 'Levantamento Terra',
    muscleGroup: 'Costas',
    description: '',
    isPredefined: true
  },

  // OMBRO
  {
    id: 'pre_overhead_press',
    nome: 'Desenvolvimento Militar',
    muscleGroup: 'Ombro',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_lateral_raise',
    nome: 'Elevação Lateral com Halteres',
    muscleGroup: 'Ombro',
    description: '',
    isPredefined: true
  },

  // BÍCEPS
  {
    id: 'pre_rosca_concentrada',
    nome: 'Rosca Concentrada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Concentrada.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta_barra_w',
    nome: 'Rosca Direta Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Direta-Barra-W.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_scott_barra_w',
    nome: 'Rosca Scott Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Scott-Barra-W.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_alternada',
    nome: 'Rosca Alternada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Alternada.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta',
    nome: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_rosca_martelo',
    nome: 'Rosca Martelo',
    muscleGroup: 'Bíceps',
    description: '',
    isPredefined: true
  },

  // TRÍCEPS
  {
    id: 'pre_triceps_coice',
    nome: 'Tríceps Coice',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Coice.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_frances_halter',
    nome: 'Tríceps Francês com Halter',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Frances-Halter.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley_corda',
    nome: 'Tríceps Pulley Corda',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-pulley-corda.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_barra_cross',
    nome: 'Tríceps Barra no Cross',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Barra-Cross.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley',
    nome: 'Tríceps Pulley',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-pulley.png',
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_triceps_testa',
    nome: 'Tríceps Testa',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-testa.png',
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
    nome: 'Stiff',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Stiff.png',
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
    description: '',
    isPredefined: true
  },
  {
    id: 'pre_seated_calf',
    nome: 'Gêmeos Sentado',
    muscleGroup: 'Panturrilha/Canela',
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
  const cleanName = identifier.name?.trim().toLowerCase();
  const ex = PREDEFINED_EXERCISES.find((e) => {
    if (identifier.id && e.id === identifier.id) return true;
    if (!cleanName) return false;
    const eName = e.nome.toLowerCase();
    if (eName === cleanName) return true;

    // Aliases amigáveis para nomes alternativos
    if (cleanName === 'supino reto' && e.id === 'pre_supino_reto_barra') return true;
    if (cleanName === 'leg press' && e.id === 'pre_leg_press_45') return true;
    if (cleanName.includes('crucifixo') && cleanName.includes('inclinado') && e.id === 'pre_crucifixo_halteres_inclinado') return true;
    if (cleanName.includes('supino') && cleanName.includes('alavanca') && !cleanName.includes('inclinado') && e.id === 'pre_supino_com_alavanca') return true;
    if (cleanName.includes('supino') && cleanName.includes('alavanca') && cleanName.includes('inclinado') && e.id === 'pre_supino_inclinado_na_alavanca') return true;
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

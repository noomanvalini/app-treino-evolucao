export interface PredefinedExercise {
  id: string;
  nome: string;
  muscleGroup: string;
  thumbnailUrl?: string;
  isPredefined: true;
}

export const PREDEFINED_EXERCISES: PredefinedExercise[] = [
  // PEITO
  {
    id: 'pre_supino_reto_barra',
    nome: 'Supino Reto com Barra',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/supino-reto-barra.png',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_halteres',
    nome: 'Supino Inclinado com Halteres',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/supino-inclinado-halteres.png',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_barra',
    nome: 'Supino Inclinado com Barra',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/supino-inclinado-barra.png',
    isPredefined: true
  },
  {
    id: 'pre_peck_deck',
    nome: 'Peck Deck',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/peck-deck.png',
    isPredefined: true
  },

  // QUADRÍCEPS
  {
    id: 'pre_agachamento_livre',
    nome: 'Agachamento Livre',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/agachamento-livre.png',
    isPredefined: true
  },
  {
    id: 'pre_leg_press_45',
    nome: 'Leg Press 45º',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/leg-press-45.png',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_extensora',
    nome: 'Cadeira Extensora',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/cadeira-extensora.png',
    isPredefined: true
  },
  {
    id: 'pre_afundo_no_smith',
    nome: 'Afundo no Smith',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/Afundo-no-Smith.png',
    isPredefined: true
  },

  // COSTAS
  {
    id: 'pre_remada_fechada_maquina',
    nome: 'Remada Fechada na Máquina',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada-Fechada-Maquina.png',
    isPredefined: true
  },
  {
    id: 'pre_remada_banco_inclinado',
    nome: 'Remada no Banco Inclinado',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Banco Inclinado.png',
    isPredefined: true
  },
  {
    id: 'pre_remada_sentada_fechada',
    nome: 'Remada Sentada Fechada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Sentada Fechada.png',
    isPredefined: true
  },
  {
    id: 'pre_puxada_pulley_pronada',
    nome: 'Puxada Pulley Pronada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Puxada Pulley Pronada.png',
    isPredefined: true
  },
  {
    id: 'pre_puxada_alta',
    nome: 'Puxada Alta na Polia',
    muscleGroup: 'Costas',
    isPredefined: true
  },
  {
    id: 'pre_remada_curvada',
    nome: 'Remada Curvada com Barra',
    muscleGroup: 'Costas',
    isPredefined: true
  },
  {
    id: 'pre_deadlift',
    nome: 'Levantamento Terra',
    muscleGroup: 'Costas',
    isPredefined: true
  },

  // OMBRO
  {
    id: 'pre_overhead_press',
    nome: 'Desenvolvimento Militar',
    muscleGroup: 'Ombro',
    isPredefined: true
  },
  {
    id: 'pre_lateral_raise',
    nome: 'Elevação Lateral com Halteres',
    muscleGroup: 'Ombro',
    isPredefined: true
  },

  // BÍCEPS
  {
    id: 'pre_rosca_concentrada',
    nome: 'Rosca Concentrada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Concentrada.png',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta_barra_w',
    nome: 'Rosca Direta Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Direta-Barra-W.png',
    isPredefined: true
  },
  {
    id: 'pre_rosca_scott_barra_w',
    nome: 'Rosca Scott Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Scott-Barra-W.png',
    isPredefined: true
  },
  {
    id: 'pre_rosca_alternada',
    nome: 'Rosca Alternada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Alternada.png',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta',
    nome: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    isPredefined: true
  },
  {
    id: 'pre_rosca_martelo',
    nome: 'Rosca Martelo',
    muscleGroup: 'Bíceps',
    isPredefined: true
  },

  // TRÍCEPS
  {
    id: 'pre_triceps_coice',
    nome: 'Tríceps Coice',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Coice.png',
    isPredefined: true
  },
  {
    id: 'pre_triceps_frances_halter',
    nome: 'Tríceps Francês com Halter',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Frances-Halter.png',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley_corda',
    nome: 'Tríceps Pulley Corda',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-pulley-corda.png',
    isPredefined: true
  },
  {
    id: 'pre_triceps_barra_cross',
    nome: 'Tríceps Barra no Cross',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Barra-Cross.png',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley',
    nome: 'Tríceps Pulley',
    muscleGroup: 'Tríceps',
    isPredefined: true
  },
  {
    id: 'pre_triceps_testa',
    nome: 'Tríceps Testa',
    muscleGroup: 'Tríceps',
    isPredefined: true
  },

  // ANTEBRAÇO
  {
    id: 'pre_rosca_inversa',
    nome: 'Rosca Inversa',
    muscleGroup: 'Antebraço',
    isPredefined: true
  },
  {
    id: 'pre_flexao_punho',
    nome: 'Flexão de Punho',
    muscleGroup: 'Antebraço',
    isPredefined: true
  },

  // GLÚTEOS
  {
    id: 'pre_hip_thrust',
    nome: 'Elevação Pélvica',
    muscleGroup: 'Glúteos',
    isPredefined: true
  },
  {
    id: 'pre_cable_kickback',
    nome: 'Coice na Polia',
    muscleGroup: 'Glúteos',
    isPredefined: true
  },

  // POSTERIOR DE COXA
  {
    id: 'pre_mesa_flexora',
    nome: 'Mesa Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Mesa-Flexora.png',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_flexora',
    nome: 'Cadeira Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Cadeira-Flexora.png',
    isPredefined: true
  },
  {
    id: 'pre_stiff',
    nome: 'Stiff',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Stiff.png',
    isPredefined: true
  },

  // QUADRIL
  {
    id: 'pre_cadeira_adutora',
    nome: 'Cadeira Adutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Adutora.png',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_abdutora',
    nome: 'Cadeira Abdutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Abdutora.png',
    isPredefined: true
  },

  // PANTURRILHA/CANELA
  {
    id: 'pre_standing_calf',
    nome: 'Gêmeos em Pé',
    muscleGroup: 'Panturrilha/Canela',
    isPredefined: true
  },
  {
    id: 'pre_seated_calf',
    nome: 'Gêmeos Sentado',
    muscleGroup: 'Panturrilha/Canela',
    isPredefined: true
  },

  // ABDÔMEN
  {
    id: 'pre_abdominal_infra',
    nome: 'Abdominal Infra',
    muscleGroup: 'Abdômen',
    isPredefined: true
  },
  {
    id: 'pre_prancha_isometrica',
    nome: 'Prancha Isométrica',
    muscleGroup: 'Abdômen',
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

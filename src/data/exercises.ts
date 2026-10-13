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
    thumbnailUrl: '/images/exercises/supino-reto-barra.png',
    gifUrl: '/gifs/supino-reto-barra.gif',
    description: 'Deite-se no banco mantendo os olhos alinhados com a barra. Apoie os pés firmemente no chão e mantenha as escápulas aduzidas e travadas no banco. Desça a barra de forma controlada até a linha média do peito, mantendo os cotovelos a aproximadamente 45° a 70° em relação ao tronco. Empurre a barra para cima com força sem perder o arco natural da coluna.',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_halteres',
    nome: 'Supino Inclinado com Halteres',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/supino-inclinado-halteres.png',
    gifUrl: '/gifs/supino-inclinado-halteres.gif',
    description: 'Ajuste o banco em uma inclinação entre 30° e 45°. Deite mantendo as escápulas aduzidas. Posicione os halteres na altura do peitoral superior e empurre-os para cima em trajetória convergente, sem bater os halteres no topo. Desça com controle sentindo o alongamento da musculatura peitoral.',
    isPredefined: true
  },
  {
    id: 'pre_supino_inclinado_barra',
    nome: 'Supino Inclinado com Barra',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/supino-inclinado-barra.png',
    gifUrl: '/gifs/supino-inclinado-barra.gif',
    description: 'Deite no banco inclinado (30° a 45°). Segure a barra com pegada ligeiramente mais larga que os ombros. Desça a barra controladamente em direção à clavícula/peitoral superior. Empurre para cima até a extensão quase completa dos braços, mantendo os ombros estabilizados no banco.',
    isPredefined: true
  },
  {
    id: 'pre_peck_deck',
    nome: 'Peck Deck',
    muscleGroup: 'Peito',
    thumbnailUrl: '/images/exercises/peck-deck.png',
    gifUrl: '/gifs/peck-deck.gif',
    description: 'Ajuste a altura do banco de modo que as pegadas fiquem na linha média do peito. Mantenha as escápulas retraídas contra o encosto. Una os braços à frente contraindo com força o peitoral no pico de contração. Retorne de forma lenta e controlada, sentindo o peitoral alongar sem hiperestender os ombros.',
    isPredefined: true
  },

  // QUADRÍCEPS
  {
    id: 'pre_agachamento_livre',
    nome: 'Agachamento Livre',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/agachamento-livre.png',
    gifUrl: '/gifs/agachamento-livre.gif',
    description: 'Apoie a barra sobre a musculatura do trapézio. Pés afastados na largura dos ombros, apontando levemente para fora. Mantenha o core rígido e inicie o movimento projetando o quadril para trás e flexionando os joelhos até que a dobra do quadril passe da linha dos joelhos. Empurre o chão com os calcanhares para retornar.',
    isPredefined: true
  },
  {
    id: 'pre_leg_press_45',
    nome: 'Leg Press 45º',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/leg-press-45.png',
    gifUrl: '/gifs/leg-press-45.gif',
    description: 'Apoie a lombar e o glúteo totalmente no encosto durante todo o movimento. Pés na plataforma na largura dos ombros. Destrave a máquina e desça o peso flexionando os joelhos até aproximadamente 90° de flexão (sem arredondar a lombar do banco). Empurre com firmeza sem travar/hiperextender os joelhos no topo.',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_extensora',
    nome: 'Cadeira Extensora',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/cadeira-extensora.png',
    gifUrl: '/gifs/cadeira-extensora.gif',
    description: 'Ajuste o encosto de modo que o eixo de rotação do aparelho coincida com a articulação dos seus joelhos. O rolo deve ficar sobre os tornozelos. Estenda as pernas até a contração total do quadríceps, segure 1 segundo no topo e retorne com descida controlada.',
    isPredefined: true
  },
  {
    id: 'pre_afundo_no_smith',
    nome: 'Afundo no Smith',
    muscleGroup: 'Quadríceps',
    thumbnailUrl: '/images/exercises/Afundo-no-Smith.png',
    gifUrl: '/gifs/afundo-no-smith.gif',
    description: 'Posicione a barra do Smith sobre os ombros. Dê um passo à frente com uma das pernas e apoie a ponta do pé de trás. Desça verticalmente até que o joelho da perna de trás quase toque o chão e o joelho da frente forme aproximadamente 90°. Suba impulsionando a força pelo calcanhar da perna da frente.',
    isPredefined: true
  },

  // COSTAS
  {
    id: 'pre_remada_fechada_maquina',
    nome: 'Remada Fechada na Máquina',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada-Fechada-Maquina.png',
    gifUrl: '/gifs/remada-fechada-maquina.gif',
    description: 'Apoie o peito no acolchoado e segure as pegadas neutras. Mantenha a coluna ereta. Puxe as pegadas levando os cotovelos para trás junto ao corpo, aproximando as escápulas com firmeza no final do movimento. Retorne controlando o peso até estender os braços.',
    isPredefined: true
  },
  {
    id: 'pre_remada_banco_inclinado',
    nome: 'Remada no Banco Inclinado',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Banco Inclinado.png',
    gifUrl: '/gifs/remada-banco-inclinado.gif',
    description: 'Deite de bruços em um banco inclinado a 30° a 45°. Segure os halteres com os braços estendidos. Puxe os halteres em direção ao quadril, mantendo os cotovelos próximos às costelas e espremendo as escápulas. Desça devagar alongando as dorsais.',
    isPredefined: true
  },
  {
    id: 'pre_remada_sentada_fechada',
    nome: 'Remada Sentada Fechada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Remada Sentada Fechada.png',
    gifUrl: '/gifs/remada-sentada-fechada.gif',
    description: 'Sente-se no aparelho com os joelhos levemente destravados. Segure o triângulo e posicione o tronco na vertical. Puxe o cabo em direção ao umbigo, projetando o peito para fora e retraindo as escápulas. Evite usar o impulso do tronco para puxar o peso.',
    isPredefined: true
  },
  {
    id: 'pre_puxada_pulley_pronada',
    nome: 'Puxada Pulley Pronada',
    muscleGroup: 'Costas',
    thumbnailUrl: '/images/exercises/Puxada Pulley Pronada.png',
    gifUrl: '/gifs/puxada-pulley-pronada.gif',
    description: 'Segure a barra com pegada pronada aberta. Trave as coxas no suporte. Puxe a barra em direção ao peitoral superior, focando em descer os cotovelos para os lados e para baixo. Mantenha o peito aberto e não balance o tronco excessivamente. Retorne controladamente alongando as dorsais.',
    isPredefined: true
  },
  {
    id: 'pre_puxada_alta',
    nome: 'Puxada Alta na Polia',
    muscleGroup: 'Costas',
    gifUrl: '/gifs/puxada-alta.gif',
    description: 'Posicione-se no aparelho e segure a barra. Puxe a barra verticalmente até a altura do queixo/peito superior, concentrando a contração nos grandes dorsais. Mantenha a postura ereta e retorne controlando a subida da carga.',
    isPredefined: true
  },
  {
    id: 'pre_remada_curvada',
    nome: 'Remada Curvada com Barra',
    muscleGroup: 'Costas',
    gifUrl: '/gifs/remada-curvada.gif',
    description: 'Incline o tronco à frente a aproximadamente 45° mantendo a coluna lombar neutra e joelhos levemente flexionados. Segure a barra com pegada pronada ou supinada. Puxe a barra em direção ao umbigo mantendo os cotovelos próximos ao corpo. Desça com controle.',
    isPredefined: true
  },
  {
    id: 'pre_deadlift',
    nome: 'Levantamento Terra',
    muscleGroup: 'Costas',
    gifUrl: '/gifs/levantamento-terra.gif',
    description: 'Pés na largura do quadril, barra rente às canelas. Segure a barra mantendo as escápulas alinhadas sobre ela e a coluna lombar rigorosamente neutra. Pressione o chão com os pés, estendendo joelhos e quadris simultaneamente até ficar ereto. Desça empurrando o quadril para trás.',
    isPredefined: true
  },

  // OMBRO
  {
    id: 'pre_overhead_press',
    nome: 'Desenvolvimento Militar',
    muscleGroup: 'Ombro',
    gifUrl: '/gifs/desenvolvimento-militar.gif',
    description: 'Em pé ou sentado, segure a barra ou halteres na altura da clavícula. Mantenha o abdômen e glúteos travados para estabilizar a coluna. Empurre a carga para cima em linha reta até os braços estenderem acima da cabeça. Desça de forma controlada até a altura dos ombros.',
    isPredefined: true
  },
  {
    id: 'pre_lateral_raise',
    nome: 'Elevação Lateral com Halteres',
    muscleGroup: 'Ombro',
    gifUrl: '/gifs/elevacao-lateral.gif',
    description: 'Em pé com tronco ligeiramente inclinado para a frente. Segure os halteres ao lado do corpo com cotovelos levemente flexionados. Eleve os braços lateralmente até a altura dos ombros, guiando o movimento pelos cotovelos. Pause brevemente no topo e desça controlando.',
    isPredefined: true
  },

  // BÍCEPS
  {
    id: 'pre_rosca_concentrada',
    nome: 'Rosca Concentrada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Concentrada.png',
    gifUrl: '/gifs/rosca-concentrada.gif',
    description: 'Sentado no banco, apoie o cotovelo na parte interna da coxa correspondente. Segure o halter com a palma voltada para cima. Flexione o cotovelo elevando o peso em direção ao ombro, mantendo o braço estático. Concentre a tensão exclusivamente no bíceps e desça devagar.',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta_barra_w',
    nome: 'Rosca Direta Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Direta-Barra-W.png',
    gifUrl: '/gifs/rosca-direta-barra-w.gif',
    description: 'Em pé com postura ereta, segure a barra W na curvatura ergonômica. Mantenha os cotovelos fixos ao lado do tronco. Eleve a barra flexionando os cotovelos até a contração máxima do bíceps. Evite balançar o tronco ou projetar os cotovelos para frente durante a subida.',
    isPredefined: true
  },
  {
    id: 'pre_rosca_scott_barra_w',
    nome: 'Rosca Scott Barra W',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Scott-Barra-W.png',
    gifUrl: '/gifs/rosca-scott-barra-w.gif',
    description: 'Posicione os braços apoiados no banco Scott com o peito bem encostado no topo. Segure a barra W. Flexione os cotovelos trazendo a barra para cima. Desça com controle até quase a extensão completa, sem descolar os braços do acolchoado.',
    isPredefined: true
  },
  {
    id: 'pre_rosca_alternada',
    nome: 'Rosca Alternada',
    muscleGroup: 'Bíceps',
    thumbnailUrl: '/images/exercises/Rosca-Alternada.png',
    gifUrl: '/gifs/rosca-alternada.gif',
    description: 'Em pé ou sentado, segure os halteres ao lado do corpo com pegada neutra. Ao subir um dos halteres, rotacione o punho para fora (supinação) para atingir o pico de contração do bíceps. Desça controlando e repita com o outro braço.',
    isPredefined: true
  },
  {
    id: 'pre_rosca_direta',
    nome: 'Rosca Direta com Barra',
    muscleGroup: 'Bíceps',
    gifUrl: '/gifs/rosca-direta.gif',
    description: 'Segure a barra reta com as palmas voltadas para frente na largura dos ombros. Mantenha os cotovelos travados na lateral do corpo. Flexione os braços levantando a barra sem usar impulso da lombar. Retorne estendendo os braços de maneira controlada.',
    isPredefined: true
  },
  {
    id: 'pre_rosca_martelo',
    nome: 'Rosca Martelo',
    muscleGroup: 'Bíceps',
    gifUrl: '/gifs/rosca-martelo.gif',
    description: 'Segure os halteres com as palmas das mãos voltadas uma para a outra (pegada neutra). Mantenha essa posição durante todo o movimento ao flexionar os cotovelos. Esse exercício foca no braquial e braquiorradial.',
    isPredefined: true
  },

  // TRÍCEPS
  {
    id: 'pre_triceps_coice',
    nome: 'Tríceps Coice',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Coice.png',
    gifUrl: '/gifs/triceps-coice.gif',
    description: 'Apoie um joelho e mão no banco com o tronco paralelo ao chão. Segure o halter com o cotovelo alinhado ao tronco a 90°. Estenda o antebraço para trás até o alinhamento total do braço, contraindo o tríceps. Mantenha o cotovelo imóvel e desça controladamente.',
    isPredefined: true
  },
  {
    id: 'pre_triceps_frances_halter',
    nome: 'Tríceps Francês com Halter',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Frances-Halter.png',
    gifUrl: '/gifs/triceps-frances.gif',
    description: 'Sentado com a coluna ereta, segure um halter com ambas as mãos atrás da cabeça, cotovelos apontando para cima. Estenda os braços empurrando o peso para cima. Flexione os cotovelos descendo o peso atrás da cabeça sentindo o alongamento da cabeça longa do tríceps.',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley_corda',
    nome: 'Tríceps Pulley Corda',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-pulley-corda.png',
    gifUrl: '/gifs/triceps-pulley-corda.gif',
    description: 'Posicione-se em frente à polia alta segurando a corda. Mantenha os cotovelos colados ao tronco. Puxe a corda para baixo estendendo os braços e, no final do movimento, abra as pontas da corda para fora para máxima contração. Retorne até formar 90° nos cotovelos.',
    isPredefined: true
  },
  {
    id: 'pre_triceps_barra_cross',
    nome: 'Tríceps Barra no Cross',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-Barra-Cross.png',
    gifUrl: '/gifs/triceps-barra-cross.gif',
    description: 'Segure a barra reta ou em V conectada à polia alta. Mantenha os cotovelos fixos ao lado do corpo e o tronco levemente inclinado à frente. Empurre a barra para baixo até estender totalmente os braços. Retorne lentamente até a altura do peito.',
    isPredefined: true
  },
  {
    id: 'pre_triceps_pulley',
    nome: 'Tríceps Pulley',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-pulley.png',
    gifUrl: '/gifs/triceps-pulley.gif',
    description: 'Segure a barra reta na polia alta com pegada pronada na largura dos ombros. Mantenha os cotovelos colados ao corpo. Pressione para baixo até estender os cotovelos e sinta a contração do tríceps. Suba controladamente.',
    isPredefined: true
  },
  {
    id: 'pre_triceps_testa',
    nome: 'Tríceps Testa',
    muscleGroup: 'Tríceps',
    thumbnailUrl: '/images/exercises/Triceps-testa.png',
    gifUrl: '/gifs/triceps-testa.gif',
    description: 'Deite no banco segurando a barra W com os braços estendidos sobre o peito. Flexione apenas os cotovelos trazendo a barra em direção à testa/topo da cabeça. Estenda os cotovelos de volta à posição inicial mantendo os braços firmes.',
    isPredefined: true
  },

  // ANTEBRAÇO
  {
    id: 'pre_rosca_inversa',
    nome: 'Rosca Inversa',
    muscleGroup: 'Antebraço',
    gifUrl: '/gifs/rosca-inversa.gif',
    description: 'Em pé com a coluna ereta, segure a barra com pegada pronada (palmas para baixo). Flexione os cotovelos elevando a barra, trabalhando o antebraço e braquiorradial. Mantenha os punhos firmes e alinhados.',
    isPredefined: true
  },
  {
    id: 'pre_flexao_punho',
    nome: 'Flexão de Punho',
    muscleGroup: 'Antebraço',
    gifUrl: '/gifs/flexao-punho.gif',
    description: 'Apoie os antebraços sobre um banco ou sobre as coxas com as palmas voltadas para cima e punhos projetados para fora. Flexione os punhos levantando o peso e desça devagar permitindo que o peso role ligeiramente nos dedos.',
    isPredefined: true
  },

  // GLÚTEOS
  {
    id: 'pre_hip_thrust',
    nome: 'Elevação Pélvica',
    muscleGroup: 'Glúteos',
    gifUrl: '/gifs/elevacao-pelvica.gif',
    description: 'Apoie a parte média/superior das escápulas na borda de um banco acolchoado. Posicione a barra acolchoada sobre o quadril. Pés firmes no chão na largura dos ombros. Empurre pelos calcanhares elevando o quadril até formar uma linha reta entre ombros e joelhos, contraindo os glúteos no topo.',
    isPredefined: true
  },
  {
    id: 'pre_cable_kickback',
    nome: 'Coice na Polia',
    muscleGroup: 'Glúteos',
    gifUrl: '/gifs/coice-polia.gif',
    description: 'Prenda a tornozeleira na polia baixa. Mantenha o tronco inclinado à frente e apoie-se no aparelho. Estenda a perna para trás e ligeiramente para fora, contraindo o glúteo no topo da extensão. Retorne controlando o movimento.',
    isPredefined: true
  },

  // POSTERIOR DE COXA
  {
    id: 'pre_mesa_flexora',
    nome: 'Mesa Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Mesa-Flexora.png',
    gifUrl: '/gifs/mesa-flexora.gif',
    description: 'Deite de bruços no aparelho com o rolo posicionado logo abaixo das panturrilhas, próximo ao tendão de Aquiles. Segure firme nos apoios laterais para manter a pelve colada no banco. Puxe os calcanhares em direção aos glúteos, contraindo fortemente os posteriores. Desça devagar resistindo ao peso.',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_flexora',
    nome: 'Cadeira Flexora',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Cadeira-Flexora.png',
    gifUrl: '/gifs/cadeira-flexora.gif',
    description: 'Sente-se com as costas bem apoiadas no encosto. Ajuste a almofada superior para travar as coxas com firmeza e posicione o rolo atrás dos tornozelos. Flexione os joelhos puxando os calcanhares para baixo e para trás até a contração máxima. Retorne controlando o movimento.',
    isPredefined: true
  },
  {
    id: 'pre_stiff',
    nome: 'Stiff',
    muscleGroup: 'Posterior de Coxa',
    thumbnailUrl: '/images/exercises/Stiff.png',
    gifUrl: '/gifs/stiff.gif',
    description: 'Em pé, pés na largura do quadril, segure a barra à frente das coxas. Mantenha os joelhos semi-flexionados (em ângulo fixo) e a coluna lombar neutra. Empurre o quadril para trás enquanto desce a barra rente às pernas até sentir um forte alongamento nos posteriores de coxa. Suba contraindo os glúteos e posteriores.',
    isPredefined: true
  },

  // QUADRIL
  {
    id: 'pre_cadeira_adutora',
    nome: 'Cadeira Adutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Adutora.png',
    gifUrl: '/gifs/cadeira-adutora.gif',
    description: 'Sente-se no aparelho com a coluna bem apoiada. Posicione as pernas nos apoios com abertura adequada. Feche as pernas aproximando os apoios com força controlada, focando na musculatura adutora da coxa. Retorne lentamente sentindo o alongamento.',
    isPredefined: true
  },
  {
    id: 'pre_cadeira_abdutora',
    nome: 'Cadeira Abdutora',
    muscleGroup: 'Quadril',
    thumbnailUrl: '/images/exercises/Cadeira-Abdutora.png',
    gifUrl: '/gifs/cadeira-abdutora.gif',
    description: 'Sente-se no aparelho com as costas apoiadas (ou ligeiramente inclinado à frente para focar no glúteo médio). Afaste as pernas empurrando os apoios para fora até a contração máxima lateral dos glúteos. Retorne devagar sem bater os pesos.',
    isPredefined: true
  },

  // PANTURRILHA/CANELA
  {
    id: 'pre_standing_calf',
    nome: 'Gêmeos em Pé',
    muscleGroup: 'Panturrilha/Canela',
    gifUrl: '/gifs/gemeos-em-pe.gif',
    description: 'Apoie a ponta dos pés na borda da plataforma com os joelhos estendidos (mas sem hiperextensão). Desça os calcanhares ao máximo sentindo o alongamento da panturrilha. Eleve-se o mais alto possível sobre os dedos, segurando 1 segundo no topo antes de descer.',
    isPredefined: true
  },
  {
    id: 'pre_seated_calf',
    nome: 'Gêmeos Sentado',
    muscleGroup: 'Panturrilha/Canela',
    gifUrl: '/gifs/gemeos-sentado.gif',
    description: 'Sente-se no aparelho com o acolchoado ajustado sobre as coxas, próximo aos joelhos. Pontas dos pés na plataforma. Desça os calcanhares para máximo alongamento do sóleo e suba empurrando a plataforma com a ponta dos pés até a contração total.',
    isPredefined: true
  },

  // ABDÔMEN
  {
    id: 'pre_abdominal_infra',
    nome: 'Abdominal Infra',
    muscleGroup: 'Abdômen',
    gifUrl: '/gifs/abdominal-infra.gif',
    description: 'Deite de costas no colchonete ou apoie-se nas barras paralelas. Flexione os joelhos ou mantenha as pernas semi-estendidas. Eleve a pelve em direção ao tórax, contraindo a porção inferior do abdômen. Evite usar o balanço das pernas para executar o movimento.',
    isPredefined: true
  },
  {
    id: 'pre_prancha_isometrica',
    nome: 'Prancha Isométrica',
    muscleGroup: 'Abdômen',
    gifUrl: '/gifs/prancha-isometrica.gif',
    description: 'Apoie os antebraços e as pontas dos pés no chão. Mantenha o corpo alinhado da cabeça aos calcanhares em linha reta. Contraia firmemente o abdômen e os glúteos, impedindo que o quadril caia ou se eleve demais. Respire de forma constante durante a sustentação.',
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
  const ex = PREDEFINED_EXERCISES.find(
    (e) =>
      (identifier.id && e.id === identifier.id) ||
      (cleanName && e.nome.toLowerCase() === cleanName)
  );

  return {
    gifUrl: ex?.gifUrl,
    description: ex?.description,
    thumbnailUrl: ex?.thumbnailUrl,
    nome: ex?.nome,
    muscleGroup: ex?.muscleGroup
  };
}

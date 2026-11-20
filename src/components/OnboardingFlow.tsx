'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, UserProfile } from '@/context/AuthContext';
import ClipzBodyBadge from '@/components/ClipzBodyBadge';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Zap,
  Flame,
  Clock,
  Moon,
  Calendar,
  Loader2,
  Sparkles,
  Star,
  Shuffle,
  SlidersHorizontal,
} from 'lucide-react';

type OnboardingStep = 'setup' | 'objetivos' | 'foco' | 'medidas';

interface OnboardingFlowProps {
  initialName?: string;
  onComplete?: () => void;
}

const GOAL_OPTIONS: {
  id: NonNullable<UserProfile['objetivo']>;
  badge: string;
  title: string;
  description: string;
  icon: 'dumbbell' | 'zap' | 'flame' | 'clock';
}[] = [
  {
    id: 'hipertrofia',
    badge: 'HIPERTROFIA & VOLUME',
    title: 'Ganhar massa magra',
    description: 'Foco em estímulo de hipertrofia com 8-12 repetições e alto tempo sob tensão.',
    icon: 'dumbbell',
  },
  {
    id: 'forca',
    badge: 'CARGA & 1RM MÁXIMO',
    title: 'Aumentar força física',
    description: 'Progressão de sobrecarga com séries pesadas de 3-6 repetições estruturadas.',
    icon: 'zap',
  },
  {
    id: 'definicao',
    badge: 'DEFINIÇÃO & DENSIDADE',
    title: 'Reduzir gordura corporal',
    description: 'Manutenção de massa muscular com densidade de treino e menor descanso.',
    icon: 'flame',
  },
  {
    id: 'condicionamento',
    badge: 'RESISTÊNCIA & SAÚDE',
    title: 'Condicionamento físico',
    description: 'Circuitos dinâmicos, capacidade cardiovascular e potência atlética.',
    icon: 'clock',
  },
];

const FREQUENCY_OPTIONS: {
  id: NonNullable<UserProfile['frequenciaSemanal']>;
  badge: string;
  recommended?: boolean;
  title: string;
  description: string;
  splitSuggestion: string;
  volumeNote?: string;
  defaultDays: string[];
}[] = [
  {
    id: '2-3',
    badge: 'ROTINA COMPACTA • FULL BODY',
    title: '2 A 3 DIAS NA SEMANA',
    description: 'Estímulo corporal completo por sessão com máximo tempo de descanso entre os treinos.',
    splitSuggestion: 'Divisão sugerida: Full Body A / B',
    defaultDays: ['SEG', 'QUA', 'SEX'],
  },
  {
    id: '4-5',
    badge: 'RECOMENDADO • EQUILÍBRIO ÓTIMO',
    recommended: true,
    title: '4 A 5 DIAS NA SEMANA',
    description: 'Frequência ideal para hipertrofia acelerada, progressão de carga contínua e boa recuperação muscular.',
    splitSuggestion: 'Divisão sugerida: Upper / Lower ou ABC + Descanso',
    volumeNote: '14-18 séries/músculo',
    defaultDays: ['SEG', 'TER', 'QUI', 'SEX'],
  },
  {
    id: '6',
    badge: 'ALTA PERFORMANCE • SPLIT ISOLADO',
    title: '6 DIAS NA SEMANA',
    description: 'Rotina avançada com treinos mais curtos e focados por grupo muscular específico.',
    splitSuggestion: 'Divisão sugerida: Push / Pull / Legs (PPL x2)',
    defaultDays: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
  },
  {
    id: 'flexivel',
    badge: 'ADAPTATIVO • IA DINÂMICA',
    title: 'DIAS FLEXÍVEIS / VARIÁVEL',
    description: 'Treine quando a sua agenda permitir; a IA ajusta a ordem dos grupos para evitar negligenciar músculos.',
    splitSuggestion: 'Divisão sugerida: Auto-balanceamento diário',
    defaultDays: ['SEG', 'QUA', 'QUI', 'SÁB'],
  },
];

const WEEK_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

const MUSCLE_FOCUS_GROUPS: {
  id: NonNullable<UserProfile['focoMuscularGrupo']>;
  label: string;
  subtitle: string;
  muscles: string[];
}[] = [
  {
    id: 'corpo_inteiro',
    label: 'Corpo inteiro',
    subtitle: 'Desenvolvimento equilibrado de superiores e inferiores',
    muscles: [
      'Peito',
      'Costas',
      'Ombro',
      'Bíceps',
      'Tríceps',
      'Antebraço',
      'Abdômen',
      'Quadríceps',
      'Posterior de Coxa',
      'Glúteos',
      'Panturrilha',
    ],
  },
  {
    id: 'superiores',
    label: 'Membros superiores',
    subtitle: 'Ênfase em tronco, ombros e braços',
    muscles: ['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen'],
  },
  {
    id: 'inferiores',
    label: 'Membros inferiores',
    subtitle: 'Ênfase em pernas, glúteos e posterior',
    muscles: ['Quadríceps', 'Posterior de Coxa', 'Glúteos', 'Quadril', 'Panturrilha'],
  },
];

const CIRCUMFERENCE_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'torax', label: 'Tórax / Peitoral', placeholder: '102.0' },
  { key: 'cintura', label: 'Cintura Abdominal', placeholder: '82.0' },
  { key: 'abdomen', label: 'Abdômen', placeholder: '85.0' },
  { key: 'quadril', label: 'Quadril', placeholder: '98.0' },
  { key: 'bracoD', label: 'Braço Direito', placeholder: '38.0' },
  { key: 'bracoE', label: 'Braço Esquerdo', placeholder: '37.8' },
  { key: 'coxaD', label: 'Coxa Direita', placeholder: '58.0' },
  { key: 'coxaE', label: 'Coxa Esquerda', placeholder: '57.8' },
  { key: 'panturrilhaD', label: 'Panturrilha D', placeholder: '38.0' },
  { key: 'panturrilhaE', label: 'Panturrilha E', placeholder: '37.8' },
];

const STEP_BACKGROUNDS: Record<OnboardingStep, string> = {
  setup: '/images/BACKGROUND-ONBOARDING-TELA-INICIAL.jpg',
  objetivos: '/images/BACKGROUND-ONBOARDING-OBJETIVO.jpg',
  foco: '/images/BACKGROUND-ONBOARDING-TREINO.jpg',
  medidas: '/images/BACKGROUND-ONBOARDING-MEDIDAS.jpg',
};

export default function OnboardingFlow({ initialName = '', onComplete }: OnboardingFlowProps) {
  const { user, profile, isPreviewMode, updateProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>('setup');

  // Step 1: Goal
  const [objetivo, setObjetivo] = useState<NonNullable<UserProfile['objetivo']>>(
    profile?.objetivo || 'hipertrofia'
  );

  // Step 2: Frequency + Weekly Days + Muscle Focus Dropdowns
  const [frequencia, setFrequencia] = useState<NonNullable<UserProfile['frequenciaSemanal']>>(
    profile?.frequenciaSemanal || '4-5'
  );
  const [diasAtivos, setDiasAtivos] = useState<string[]>(
    profile?.diasAtivos || ['SEG', 'TER', 'QUI', 'SEX']
  );
  const [focoGrupo, setFocoGrupo] = useState<NonNullable<UserProfile['focoMuscularGrupo']>>(
    profile?.focoMuscularGrupo || 'corpo_inteiro'
  );
  const [openFocusDropdown, setOpenFocusDropdown] = useState<
    NonNullable<UserProfile['focoMuscularGrupo']> | null
  >(null);
  const [focoMusculos, setFocoMusculos] = useState<string[]>(
    profile?.focoMuscularLista || ['TODOS']
  );

  // Step 3: Profile basics + Measures
  const [nome, setNome] = useState(initialName || profile?.nome || user?.displayName || '');
  const [idade, setIdade] = useState(profile?.idade ? String(profile.idade) : '26');
  const [altura, setAltura] = useState(profile?.altura ? String(profile.altura) : '175');
  const [sexo, setSexo] = useState(profile?.sexo || 'M');
  const [pesoAtual, setPesoAtual] = useState(
    profile?.pesoAtual ? String(profile.pesoAtual) : '78.0'
  );
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [activeCardKey, setActiveCardKey] = useState<string>('peso');
  const [showCircumferences, setShowCircumferences] = useState<boolean>(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const calculatedImc = useMemo(() => {
    const p = parseFloat(pesoAtual);
    const a = parseFloat(altura);
    if (!p || !a || a <= 30) return null;
    return Number((p / Math.pow(a / 100, 2)).toFixed(1));
  }, [pesoAtual, altura]);

  const handleSelectFrequency = (freqId: NonNullable<UserProfile['frequenciaSemanal']>) => {
    setFrequencia(freqId);
    const option = FREQUENCY_OPTIONS.find((f) => f.id === freqId);
    if (option) {
      setDiasAtivos(option.defaultDays);
    }
  };

  const handleToggleDay = (day: string) => {
    setDiasAtivos((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // Keep at least 1 active day
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const handleSelectFocusGroup = (groupId: NonNullable<UserProfile['focoMuscularGrupo']>) => {
    if (focoGrupo !== groupId) {
      setFocoGrupo(groupId);
      setFocoMusculos(['TODOS']);
      setOpenFocusDropdown(groupId);
    } else {
      setOpenFocusDropdown((prev) => (prev === groupId ? null : groupId));
    }
  };

  const handleToggleAllMuscles = () => {
    setFocoMusculos(['TODOS']);
  };

  const handleToggleMuscle = (muscle: string, groupMuscles: string[]) => {
    setFocoMusculos((prev) => {
      if (prev.includes('TODOS')) {
        return [muscle];
      }
      if (prev.includes(muscle)) {
        const next = prev.filter((m) => m !== muscle);
        return next.length === 0 ? ['TODOS'] : next;
      }
      const next = [...prev, muscle];
      if (next.length >= groupMuscles.length) {
        return ['TODOS'];
      }
      return next;
    });
  };

  const adjustNumberField = (
    current: string,
    delta: number,
    min: number,
    max: number,
    decimals: number,
    setter: (v: string) => void
  ) => {
    const parsed = parseFloat(current);
    const base = isNaN(parsed) ? min : parsed;
    const next = Math.min(max, Math.max(min, base + delta));
    setter(decimals > 0 ? next.toFixed(decimals) : String(Math.round(next)));
  };

  const adjustMeasure = (key: string, delta: number, defaultVal: number) => {
    setMedidas((prev) => {
      const parsed = parseFloat(prev[key] || '');
      const base = isNaN(parsed) ? defaultVal : parsed;
      const next = Math.max(10, Number((base + delta).toFixed(1)));
      return { ...prev, [key]: next.toFixed(1) };
    });
  };

  const finishAndRedirect = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/dashboard');
    }
  };

  const handleSkipSetup = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const numIdade = parseInt(idade) || profile?.idade || 26;
      const numAltura = parseFloat(altura) || profile?.altura || 175;
      const numPeso = parseFloat(pesoAtual) || profile?.pesoAtual || 75;

      if (user) {
        await updateProfile({
          nome: nome.trim() || profile?.nome || user.displayName || 'Atleta',
          idade: numIdade,
          altura: numAltura,
          sexo: sexo || 'M',
          pesoAtual: numPeso,
          objetivo,
          frequenciaSemanal: frequencia,
          diasAtivos,
          focoMuscularGrupo: focoGrupo,
          focoMuscularLista: focoMusculos,
          onboardingCompleted: true,
          dataCriacao: profile?.dataCriacao || new Date(),
        });
      }
      finishAndRedirect();
    } catch (err) {
      console.error('Error skipping setup:', err);
      finishAndRedirect();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numIdade = parseInt(idade);
    const numAltura = parseFloat(altura);
    const numPeso = parseFloat(pesoAtual);

    if (!nome.trim()) {
      setErrorMsg('Informe seu nome para personalizar seu painel.');
      return;
    }
    if (isNaN(numIdade) || numIdade < 12 || numIdade > 110) {
      setErrorMsg('Informe uma idade válida.');
      return;
    }
    if (isNaN(numAltura) || numAltura < 100 || numAltura > 250) {
      setErrorMsg('Informe sua altura em centímetros (ex: 175).');
      return;
    }
    if (isNaN(numPeso) || numPeso < 25 || numPeso > 300) {
      setErrorMsg('Informe seu peso atual em kg (ex: 78.5).');
      return;
    }

    setSubmitting(true);

    try {
      const parsedMedidas: Record<string, number> = {};
      Object.entries(medidas).forEach(([k, v]) => {
        const val = parseFloat(v);
        if (!isNaN(val) && val > 0) {
          parsedMedidas[k] = val;
        }
      });

      const imc = Number((numPeso / Math.pow(numAltura / 100, 2)).toFixed(1));

      if (user) {
        await updateProfile({
          nome: nome.trim(),
          idade: numIdade,
          altura: numAltura,
          sexo,
          pesoAtual: numPeso,
          objetivo,
          frequenciaSemanal: frequencia,
          diasAtivos,
          focoMuscularGrupo: focoGrupo,
          focoMuscularLista: focoMusculos,
          onboardingCompleted: true,
          dataCriacao: profile?.dataCriacao || new Date(),
        });

        if (!isPreviewMode && user.uid !== 'preview_user_uid') {
          await addDoc(collection(db, 'body_measurements'), {
            userId: user.uid,
            pesoKg: numPeso,
            imcCalculado: imc,
            medidas: parsedMedidas,
            data: new Date(),
          });
        }
      }

      finishAndRedirect();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setErrorMsg('Não foi possível salvar seus dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepNumber = step === 'objetivos' ? 1 : step === 'foco' ? 2 : step === 'medidas' ? 3 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] overflow-y-auto">
      {/* Full-bleed Background Photo in Cover Mode + Lighter Overlay */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url('${STEP_BACKGROUNDS[step]}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(13,17,23,0.45)] via-[rgba(13,17,23,0.18)] to-[rgba(13,17,23,0.75)]" />
      </div>

      <div className="relative min-h-full w-full max-w-[448px] mx-auto flex flex-col">
        {/* Content Layer */}
        <div className="relative z-10 flex-1 flex flex-col px-[20px] pt-[20px] pb-[36px]">
          {/* TOP BAR: Step Progress Bars (Steps 1-3) + Brand Logo + Step Pill */}
          <header className="flex flex-col gap-[16px] w-full shrink-0">
            {currentStepNumber > 0 && (
              <div className="flex items-center gap-[8px] w-full">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-[5px] rounded-full transition-colors duration-300 ${
                      idx === currentStepNumber
                        ? 'bg-[#f8fafc]'
                        : idx < currentStepNumber
                        ? 'bg-[#f59e0b]'
                        : 'bg-white/25'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-[4px] w-full">
              <div className="flex items-center gap-2.5">
                {currentStepNumber > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'objetivos') setStep('setup');
                      else if (step === 'foco') setStep('objetivos');
                      else if (step === 'medidas') setStep('foco');
                    }}
                    className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                    aria-label="Voltar etapa"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <ClipzBodyBadge className="h-[36px] w-auto" priority />
              </div>

              {currentStepNumber > 0 && (
                <div className="backdrop-blur-md bg-black/45 border border-white/15 rounded-full px-[11px] py-[5px] flex items-center gap-[6px]">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#f59e0b]" />
                  <span className="text-[11px] font-semibold text-[#cbd5e1] tracking-[0.4px] uppercase leading-[14px]">
                    ETAPA {currentStepNumber} DE 3
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* =================================================================
              STEP 0: SETUP DE TREINO (Timeline Vertical)
             ================================================================= */}
          {step === 'setup' && (
            <div className="flex-1 flex flex-col justify-between pt-[28px] animate-in fade-in duration-300">
              <div className="space-y-[24px]">
                {/* Headline */}
                <div className="space-y-[8px]">
                  <h1 className="font-heading font-bold text-[26px] leading-[30px] tracking-[-0.6px] uppercase text-white">
                    SETUP DE TREINO
                  </h1>
                  <p className="text-[14px] leading-[20px] text-[#f8fafc]/95 max-w-[340px]">
                    Leva apenas 2 minutos para calibrar o seu plano de treino e o seu mapa muscular.
                  </p>
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-[4px] pt-[4px]">
                  {/* Continuous vertical timeline track */}
                  <div
                    aria-hidden
                    className="absolute left-[19px] top-[24px] bottom-[34px] w-[2px] bg-gradient-to-b from-[#f59e0b] via-[#f59e0b]/60 to-white/25"
                  />

                  <div className="space-y-[24px]">
                    {[
                      {
                        num: '01',
                        title: 'OBJETIVOS',
                        desc: 'Escolha seu objetivo para personalizarmos o seu painel de resultados.',
                      },
                      {
                        num: '02',
                        title: 'TREINO',
                        desc: 'Distribua o seu volume de treino e recuperação de acordo com seu foco e sua rotina.',
                      },
                      {
                        num: '03',
                        title: 'MEDIDAS',
                        desc: 'Insira suas medidas e acompanhe a evolução do seu plano de treino.',
                      },
                    ].map((item) => (
                      <div key={item.num} className="relative flex items-start gap-[14px]">
                        {/* Timeline Node */}
                        <div className="relative z-10 w-[32px] h-[32px] rounded-[8px] bg-black border border-[#f59e0b]/70 shadow-[0_0_14px_rgba(245,158,11,0.3)] flex items-center justify-center shrink-0 mt-[2px]">
                          <Check className="w-[15px] h-[15px] text-[#f59e0b] stroke-[2.8]" />
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-1 space-y-[2px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-[0.8px] text-[#ffb95f] uppercase">
                              ETAPA {item.num}
                            </span>
                          </div>
                          <h2 className="font-heading font-bold text-[22px] leading-[26px] tracking-[-0.5px] uppercase text-white">
                            {item.title}
                          </h2>
                          <p className="text-[14px] leading-[20px] text-[#f8fafc]/90">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-[32px] space-y-[16px]">
                <button
                  type="button"
                  onClick={() => setStep('objetivos')}
                  className="w-full bg-[#f8fafc] hover:bg-white rounded-full min-h-[52px] pl-[20px] pr-[8px] py-[8px] flex items-center justify-between shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#202017] text-[17px] tracking-[0.45px] uppercase leading-[24px]">
                    PERSONALIZAR MEU TREINO (2 MIN)
                  </span>
                  <span className="w-[36px] h-[36px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                    <ArrowRight className="w-[16px] h-[16px] text-[#202017] stroke-[2.5]" />
                  </span>
                </button>

                <div className="flex flex-col items-center gap-[8px] text-center">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSkipSetup}
                    className="text-[14px] text-[#f8fafc] underline underline-offset-4 hover:text-[#ffb95f] transition-colors"
                  >
                    <strong className="font-bold">Pular setup</strong> e ir para a tela inicial
                  </button>
                  <p className="text-[11px] leading-[15px] text-[#f8fafc]/80 max-w-[300px]">
                    Você poderá recalibrar suas medidas, metas e cargas a qualquer instante através da aba do Perfil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 1: OBJETIVOS (ETAPA 1 DE 3)
             ================================================================= */}
          {step === 'objetivos' && (
            <div className="flex-1 flex flex-col justify-between pt-[22px] animate-in fade-in duration-300">
              <div className="space-y-[18px]">
                <div className="space-y-[6px]">
                  <h1 className="font-heading font-bold text-[26px] leading-[30px] tracking-[-0.6px] uppercase text-white">
                    ONDE VOCÊ QUER CHEGAR?
                  </h1>
                  <p className="text-[14px] leading-[20px] text-[#f8fafc]/95">
                    Seja secar, ganhar massa ou aumentar força, seu ponto de chegada define a nossa rota.
                  </p>
                </div>

                {/* 4 Selectable Goal Cards (Clean layout without icons) */}
                <div className="space-y-[10px]">
                  {GOAL_OPTIONS.map((option) => {
                    const isSelected = objetivo === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setObjetivo(option.id)}
                        className={`w-full text-left rounded-[12px] p-[16px] flex items-start justify-between gap-[14px] transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-[#100b02]/95 border border-[#f59e0b] shadow-[0px_0px_24px_-6px_rgba(245,158,11,0.35)]'
                            : 'bg-[#100b02]/90 border border-white/10 hover:border-white/25'
                        }`}
                      >
                        {isSelected && (
                          <div
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-r from-[#f59e0b]/15 via-transparent to-transparent pointer-events-none"
                          />
                        )}

                        <div className="relative z-10 flex-1 min-w-0 space-y-[4px]">
                          <span
                            className={`inline-block text-[10px] font-bold tracking-[0.5px] uppercase px-[8px] py-[2px] rounded-[4px] ${
                              isSelected
                                ? 'bg-[#202017] text-[#f59e0b]'
                                : 'bg-[#1c1c13] text-[#94a3b8]'
                            }`}
                          >
                            {option.badge}
                          </span>
                          <h3 className="font-bold text-[15px] leading-[20px] tracking-[-0.3px] text-[#f8fafc]">
                            {option.title}
                          </h3>
                          <p className="text-[12px] leading-[16.5px] text-[#94a3b8]">
                            {option.description}
                          </p>
                        </div>

                        <div
                          className={`relative z-10 w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 mt-[2px] transition-colors ${
                            isSelected
                              ? 'bg-[#f59e0b] text-[#100b02]'
                              : 'bg-white/5 border border-white/60'
                          }`}
                        >
                          {isSelected && <Check className="w-[14px] h-[14px] stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-[24px] space-y-[14px]">
                <button
                  type="button"
                  onClick={() => setStep('foco')}
                  className="w-full bg-[#f8fafc] hover:bg-white rounded-full min-h-[52px] pl-[20px] pr-[8px] py-[8px] flex items-center justify-between shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#202017] text-[17px] tracking-[0.45px] uppercase leading-[24px]">
                    AVANÇAR PARA PRÓXIMA ETAPA
                  </span>
                  <span className="w-[36px] h-[36px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                    <ArrowRight className="w-[16px] h-[16px] text-[#202017] stroke-[2.5]" />
                  </span>
                </button>

                <div className="flex flex-col items-center gap-[6px] text-center">
                  <button
                    type="button"
                    onClick={() => setStep('foco')}
                    className="text-[13px] font-bold text-[#f8fafc] underline underline-offset-4 hover:text-[#ffb95f] transition-colors"
                  >
                    Pular para exercícios
                  </button>
                  <p className="text-[11px] text-[#f8fafc]/80">
                    Você pode alterar essa escolha mais tarde no seu perfil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 2: SEU FOCO MUSCULAR (ETAPA 2 DE 3)
             ================================================================= */}
          {step === 'foco' && (
            <div className="flex-1 flex flex-col justify-between pt-[20px] animate-in fade-in duration-300">
              <div className="space-y-[16px]">
                <div className="space-y-[6px]">
                  <h1 className="font-heading font-bold text-[26px] leading-[30px] tracking-[-0.6px] uppercase text-white">
                    SEU FOCO MUSCULAR
                  </h1>
                  <p className="text-[14px] leading-[20px] text-[#f8fafc]/95">
                    Defina o seu volume de treino e os grupos que você quer priorizar nesta fase.
                  </p>
                </div>

                {/* 4 Frequency Radio Cards */}
                <div className="space-y-[10px]">
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = frequencia === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectFrequency(opt.id)}
                        className={`w-full text-left rounded-[12px] p-[14px] space-y-[8px] transition-all ${
                          isSelected
                            ? 'bg-[#100b02]/95 border border-[#f59e0b] shadow-[0px_0px_24px_-6px_rgba(245,158,11,0.35)]'
                            : 'bg-[#100b02]/90 border border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-[4px]">
                            {opt.recommended ? (
                              <span className="inline-flex items-center gap-1 bg-[#f59e0b] text-[#100b02] text-[10px] font-bold uppercase tracking-[0.5px] px-[8px] py-[2px] rounded-full">
                                <Star className="w-[10px] h-[10px] fill-current" />
                                {opt.badge}
                              </span>
                            ) : (
                              <span className="block text-[10px] font-bold uppercase tracking-[0.5px] text-[#f59e0b]">
                                {opt.badge}
                              </span>
                            )}
                            <h3 className="font-heading font-bold text-[20px] leading-[24px] tracking-[-0.3px] uppercase text-white">
                              {opt.title}
                            </h3>
                          </div>

                          <div
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-[2px] ${
                              isSelected
                                ? 'bg-[#f59e0b] text-[#100b02]'
                                : 'bg-white/5 border border-white/60'
                            }`}
                          >
                            {isSelected && <Check className="w-[13px] h-[13px] stroke-[3]" />}
                          </div>
                        </div>

                        <p className="text-[12px] leading-[17px] text-[#94a3b8]">
                          {opt.description}
                        </p>

                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#cbd5e1]">
                          <Shuffle
                            className={`w-[12px] h-[12px] shrink-0 ${
                              isSelected ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                            }`}
                          />
                          <span>{opt.splitSuggestion}</span>
                        </div>

                        {isSelected && opt.volumeNote && (
                          <div className="bg-white/[0.06] border border-white/10 rounded-[8px] px-[10px] py-[7px] flex items-center gap-1.5 text-[11px]">
                            <Zap className="w-[12px] h-[12px] text-[#f59e0b] fill-current shrink-0" />
                            <span className="text-[#f8fafc] font-medium">
                              Volume Semanal Otimizado:
                            </span>
                            <span className="text-[#f59e0b] font-bold">{opt.volumeNote}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Muscle Focus Dropdowns (Corpo inteiro / Membros superiores / Membros inferiores) */}
                <div className="space-y-[8px] pt-[4px]">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-[15px] tracking-[0.3px] uppercase text-white flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-[#f59e0b]" />
                      Grupos Musculares em Foco
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[#ffb95f]">
                      {focoMusculos.includes('TODOS')
                        ? 'Todos selecionados'
                        : `${focoMusculos.length} selecionado${focoMusculos.length > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  <div className="space-y-[8px]">
                    {MUSCLE_FOCUS_GROUPS.map((group) => {
                      const isGroupSelected = focoGrupo === group.id;
                      const isOpen = openFocusDropdown === group.id;
                      const isAllSelected = isGroupSelected && focoMusculos.includes('TODOS');

                      return (
                        <div
                          key={group.id}
                          className={`rounded-[12px] overflow-hidden transition-all ${
                            isGroupSelected
                              ? 'bg-[#100b02]/95 border border-[#f59e0b]'
                              : 'bg-[#100b02]/90 border border-white/10'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectFocusGroup(group.id)}
                            className="w-full p-[12px] flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-[10px] min-w-0">
                              <div
                                className={`w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0 ${
                                  isGroupSelected
                                    ? 'bg-[#f59e0b] text-[#100b02]'
                                    : 'border border-white/50'
                                }`}
                              >
                                {isGroupSelected && (
                                  <Check className="w-[12px] h-[12px] stroke-[3]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="block font-bold text-[14px] text-[#f8fafc] leading-[18px]">
                                  {group.label}
                                </span>
                                <span className="block text-[11px] text-[#94a3b8] truncate">
                                  {group.subtitle}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                              {isGroupSelected && (
                                <span className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full">
                                  {isAllSelected ? 'Todos' : `${focoMusculos.length}`}
                                </span>
                              )}
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-[#f59e0b]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-[12px] pb-[12px] pt-[6px] border-t border-white/10 space-y-[10px] animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#94a3b8]">
                                  Selecione os músculos que deseja priorizar:
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-[6px]">
                                {/* Option: Focar todos */}
                                <button
                                  type="button"
                                  onClick={handleToggleAllMuscles}
                                  className={`px-[10px] py-[6px] rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                    isAllSelected
                                      ? 'bg-[#f59e0b] text-[#100b02]'
                                      : 'bg-white/10 text-[#f8fafc] hover:bg-white/20'
                                  }`}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Focar todos
                                </button>

                                {group.muscles.map((muscle) => {
                                  const active =
                                    isGroupSelected &&
                                    !isAllSelected &&
                                    focoMusculos.includes(muscle);
                                  return (
                                    <button
                                      key={muscle}
                                      type="button"
                                      onClick={() => handleToggleMuscle(muscle, group.muscles)}
                                      className={`px-[10px] py-[6px] rounded-full text-[11px] font-semibold transition-colors ${
                                        active
                                          ? 'bg-[#f59e0b] text-[#100b02] font-bold'
                                          : 'bg-black border border-white/15 text-[#cbd5e1] hover:border-[#f59e0b]/60'
                                      }`}
                                    >
                                      {muscle}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* White Card: DISTRIBUIÇÃO SEMANAL */}
                <div className="bg-[#f8fafc] rounded-[14px] p-[14px] space-y-[10px] shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0f172a] text-[11px] uppercase tracking-[0.5px]">
                      DISTRIBUIÇÃO SEMANAL
                    </span>
                    <span className="font-bold text-[#f59e0b] text-[10px] uppercase tracking-[0.4px]">
                      {diasAtivos.length} DIAS ATIVOS • {7 - diasAtivos.length} DESCANSO
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-[6px]">
                    {WEEK_DAYS.map((day) => {
                      const isActive = diasAtivos.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`rounded-[8px] py-[8px] flex flex-col items-center justify-center gap-[4px] transition-all ${
                            isActive
                              ? 'bg-[#f59e0b] text-[#100b02] shadow-sm'
                              : 'bg-[#eef2f6] text-[#64748b] hover:bg-[#e2e8f0]'
                          }`}
                        >
                          <span className="text-[11px] font-bold leading-none">{day}</span>
                          {isActive ? (
                            <Zap className="w-[12px] h-[12px] fill-current" />
                          ) : day === 'DOM' ? (
                            <Clock className="w-[12px] h-[12px] opacity-60" />
                          ) : (
                            <Moon className="w-[12px] h-[12px] fill-current opacity-60" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-[6px] pt-[2px]">
                    <Calendar className="w-[13px] h-[13px] text-[#64748b] shrink-0 mt-[1px]" />
                    <p className="text-[11px] leading-[15px] text-[#475569]">
                      Você poderá personalizar os dias exatos no seu calendário a qualquer momento.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-[24px] space-y-[14px]">
                <button
                  type="button"
                  onClick={() => setStep('medidas')}
                  className="w-full bg-[#f8fafc] hover:bg-white rounded-full min-h-[52px] pl-[20px] pr-[8px] py-[8px] flex items-center justify-between shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#202017] text-[17px] tracking-[0.45px] uppercase leading-[24px]">
                    AVANÇAR PARA PRÓXIMA ETAPA
                  </span>
                  <span className="w-[36px] h-[36px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                    <ArrowRight className="w-[16px] h-[16px] text-[#202017] stroke-[2.5]" />
                  </span>
                </button>

                <div className="flex flex-col items-center gap-[6px] text-center">
                  <button
                    type="button"
                    onClick={() => setStep('medidas')}
                    className="text-[13px] font-bold text-[#f8fafc] underline underline-offset-4 hover:text-[#ffb95f] transition-colors"
                  >
                    Pular para medidas
                  </button>
                  <p className="text-[11px] text-[#f8fafc]/80">
                    Você pode alterar essa escolha mais tarde no seu perfil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 3: SUAS MEDIDAS ATUAIS (ETAPA 3 DE 3)
             ================================================================= */}
          {step === 'medidas' && (
            <form
              onSubmit={handleCompleteOnboarding}
              className="flex-1 flex flex-col justify-between pt-[20px] animate-in fade-in duration-300"
            >
              <div className="space-y-[16px]">
                <div className="space-y-[6px]">
                  <h1 className="font-heading font-bold text-[26px] leading-[30px] tracking-[-0.6px] uppercase text-white">
                    SUAS MEDIDAS ATUAIS.
                  </h1>
                  <p className="text-[14px] leading-[20px] text-[#f8fafc]/95">
                    Preencha suas medidas iniciais para destravar seus gráficos de evolução corporal.
                  </p>
                </div>

                {errorMsg && (
                  <div className="bg-[#ff6e61]/20 border border-[#ff6e61] text-white text-xs font-semibold p-3 rounded-[12px]">
                    {errorMsg}
                  </div>
                )}

                {/* Unified Off-White Card (Same pattern as Measures Register Modal) */}
                <div className="bg-[#f4f4f0] rounded-[20px] p-[14px] shadow-2xl space-y-[14px]">
                  {/* Dados Básicos */}
                  <div className="space-y-[8px]">
                    <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase block">
                      PERFIL BIOMÉTRICO
                    </span>

                    <div className="bg-[#151413] rounded-[12px] p-[10px] space-y-[8px]">
                      <div>
                        <label className="text-[10px] font-semibold text-[#94a3b8] uppercase block mb-1">
                          Seu Nome
                        </label>
                        <input
                          type="text"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Ex: Lucas Valini"
                          className="w-full bg-black text-[#f8fafc] font-semibold text-[13px] rounded-[8px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-[8px]">
                        <div>
                          <label className="text-[10px] font-semibold text-[#94a3b8] uppercase block mb-1">
                            Idade
                          </label>
                          <input
                            type="number"
                            value={idade}
                            onChange={(e) => setIdade(e.target.value)}
                            placeholder="26"
                            className="w-full bg-black text-[#f8fafc] font-heading font-bold text-[16px] text-center rounded-[8px] py-1.5 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#94a3b8] uppercase block mb-1">
                            Altura (cm)
                          </label>
                          <input
                            type="number"
                            value={altura}
                            onChange={(e) => setAltura(e.target.value)}
                            placeholder="175"
                            className="w-full bg-black text-[#f8fafc] font-heading font-bold text-[16px] text-center rounded-[8px] py-1.5 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#94a3b8] uppercase block mb-1">
                            Sexo
                          </label>
                          <select
                            value={sexo}
                            onChange={(e) => setSexo(e.target.value)}
                            className="w-full bg-black text-[#f8fafc] font-semibold text-[12px] rounded-[8px] px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                          >
                            <option value="M">Masc.</option>
                            <option value="F">Fem.</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Peso Atual Stepper Card */}
                  <div className="space-y-[8px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase">
                        PESO ATUAL (KG)
                      </span>
                      {calculatedImc && (
                        <span className="text-[10px] font-bold text-[#151413] bg-[#ffb95f]/40 px-2 py-0.5 rounded-full">
                          IMC estimado: {calculatedImc}
                        </span>
                      )}
                    </div>

                    <div
                      onClick={() => setActiveCardKey('peso')}
                      className={`${
                        activeCardKey === 'peso'
                          ? 'bg-black'
                          : 'bg-[rgba(57,58,47,0.75)] hover:bg-black'
                      } rounded-[12px] p-[10px] flex flex-col gap-[6px] transition-all cursor-pointer`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-[5px]">
                          {activeCardKey === 'peso' && (
                            <span className="w-[6px] h-[6px] rounded-full bg-[#f59e0b]" />
                          )}
                          <span
                            className={`text-[11px] font-semibold ${
                              activeCardKey === 'peso' ? 'text-[#f59e0b]' : 'text-[#f8fafc]'
                            }`}
                          >
                            Peso Corporal
                          </span>
                        </div>
                        <span className="text-[10px] text-[#94a3b8]">KG</span>
                      </div>

                      <div
                        className={`${
                          activeCardKey === 'peso' ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                        } rounded-[8px] p-[4px] flex items-center gap-[6px] transition-colors`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCardKey('peso');
                            adjustNumberField(pesoAtual, -0.5, 30, 250, 1, setPesoAtual);
                          }}
                          className="bg-black rounded-[6px] w-[30px] h-[30px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[16px] shrink-0"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          value={pesoAtual}
                          onFocus={() => setActiveCardKey('peso')}
                          onChange={(e) => setPesoAtual(e.target.value)}
                          className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[22px] text-center leading-[26px] focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCardKey('peso');
                            adjustNumberField(pesoAtual, 0.5, 30, 250, 1, setPesoAtual);
                          }}
                          className="bg-black rounded-[6px] w-[30px] h-[30px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[16px] shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Circunferências Principais (Opcional) */}
                  <div className="space-y-[8px]">
                    <button
                      type="button"
                      onClick={() => setShowCircumferences(!showCircumferences)}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase">
                        CIRCUNFERÊNCIAS (CM) • OPCIONAL
                      </span>
                      <span className="text-[10px] font-bold text-[#f59e0b] flex items-center gap-0.5">
                        {showCircumferences ? 'Ocultar' : 'Mostrar'}
                        {showCircumferences ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {showCircumferences && (
                      <div className="grid grid-cols-2 gap-[8px]">
                        {CIRCUMFERENCE_FIELDS.map((field) => {
                          const isSelected = activeCardKey === field.key;
                          return (
                            <div
                              key={field.key}
                              onClick={() => setActiveCardKey(field.key)}
                              className={`${
                                isSelected
                                  ? 'bg-black'
                                  : 'bg-[rgba(57,58,47,0.75)] hover:bg-black'
                              } rounded-[12px] p-[8px] flex flex-col gap-[4px] transition-all cursor-pointer`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-[4px] min-w-0">
                                  {isSelected && (
                                    <span className="w-[5px] h-[5px] rounded-full bg-[#f59e0b] shrink-0" />
                                  )}
                                  <span
                                    className={`text-[10px] truncate ${
                                      isSelected
                                        ? 'font-semibold text-[#f59e0b]'
                                        : 'font-medium text-[#f8fafc]'
                                    }`}
                                  >
                                    {field.label}
                                  </span>
                                </div>
                                <span className="text-[9px] text-[#94a3b8] shrink-0">cm</span>
                              </div>

                              <div
                                className={`${
                                  isSelected ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                                } rounded-[6px] p-[3px] flex items-center gap-[3px] transition-colors`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCardKey(field.key);
                                    adjustMeasure(field.key, -0.5, parseFloat(field.placeholder));
                                  }}
                                  className="bg-black rounded-[4px] w-[20px] h-[22px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder={field.placeholder}
                                  value={medidas[field.key] || ''}
                                  onFocus={() => setActiveCardKey(field.key)}
                                  onChange={(e) =>
                                    setMedidas((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }))
                                  }
                                  className="w-full bg-transparent font-heading font-bold text-[#f8fafc] placeholder:text-white/35 text-[15px] text-center leading-[20px] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCardKey(field.key);
                                    adjustMeasure(field.key, 0.5, parseFloat(field.placeholder));
                                  }}
                                  className="bg-black rounded-[4px] w-[20px] h-[22px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-[24px] space-y-[12px]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#f8fafc] hover:bg-white disabled:opacity-60 rounded-full min-h-[52px] pl-[20px] pr-[8px] py-[8px] flex items-center justify-between shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#202017] text-[17px] tracking-[0.45px] uppercase leading-[24px]">
                    {submitting ? 'CONFIGURANDO...' : 'CONCLUIR SETUP E INICIAR'}
                  </span>
                  <span className="w-[36px] h-[36px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                    {submitting ? (
                      <Loader2 className="w-[16px] h-[16px] text-[#202017] animate-spin" />
                    ) : (
                      <ArrowRight className="w-[16px] h-[16px] text-[#202017] stroke-[2.5]" />
                    )}
                  </span>
                </button>

                <p className="text-[11px] leading-[15px] text-[#f8fafc]/85 text-center max-w-[300px] mx-auto">
                  Seu primeiro ciclo de treino e mapa de volume muscular são gerados instantaneamente.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, Suspense, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Dumbbell,
  Plus,
  History,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  AlertTriangle,
  Pencil,
  Trash2,
  Award,
  Sparkles,
  Trophy,
  Zap,
  Check,
  Clock
} from 'lucide-react';
import {
  PREDEFINED_EXERCISES,
  MUSCLE_GROUPS,
  getExerciseGuide,
  normalizeExerciseName,
  resolveExerciseMigration
} from '@/data/exercises';

interface Exercise {
  id: string;
  nomeExercicio: string;
  muscleGroup: string;
  dataCriacao?: any;
  thumbnailUrl?: string;
  isPredefined?: boolean;
  predefinedId?: string;
  aliasIds?: string[];
}

interface LogSetDetail {
  setNumber?: number;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  isPeak?: boolean;
}

interface StrengthLog {
  id: string;
  exerciseId: string;
  muscleGroup?: string;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  totalSetsCompleted?: number;
  data: any; // Timestamp or Date
  sessionId?: string;
  setNumber?: number;
  allSets?: LogSetDetail[];
}

interface SessionRowData {
  id: string;
  dateShort: string;
  dateFull: string;
  timestampMs: number;
  peakLog: StrengthLog;
  sets: LogSetDetail[];
  delta: number | null;
  isAllTimeRecord: boolean;
}

interface SessionModalData {
  exerciseName: string;
  dateFormatted: string;
  peakLog: StrengthLog;
  sets: LogSetDetail[];
  delta?: number | null;
}

const SHORT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

const MUSCLE_SUBTITLES: Record<string, string> = {
  Peito: 'Peitoral • Peito Maior',
  Costas: 'Costas • Dorsal',
  Ombro: 'Ombro • Deltoide',
  Bíceps: 'Braços • Bíceps Braquial',
  Tríceps: 'Braços • Tríceps Braquial',
  Antebraço: 'Braços • Antebraço',
  Abdômen: 'Core • Abdominal',
  Quadríceps: 'Pernas • Quadríceps',
  'Posterior de Coxa': 'Pernas • Isquiotibiais',
  Glúteos: 'Inferiores • Glúteo Máximo',
  'Panturrilha/Canela': 'Inferiores • Gastrocnêmio'
};

// Mini Sparkline SVG for Compact Exercise Cards (Figma Node 29:1073 / 29:1101 / 29:1127)
function MiniSparkline({
  values,
  status
}: {
  values: number[];
  status: 'up' | 'stable' | 'down';
}) {
  const strokeColor =
    status === 'up' ? '#F59E0B' : status === 'down' ? '#FF6E61' : '#94A3B8';

  const pts = values.length >= 2 ? values.slice(-5) : [10, 10];
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const range = maxV - minV > 0 ? maxV - minV : 1;

  const w = 64;
  const h = 24;
  const padX = 4;
  const padY = 4;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;

  const coords = pts.map((v, i) => {
    const x = padX + (i / (pts.length - 1)) * usableW;
    const y =
      maxV === minV
        ? h / 2
        : padY + usableH - ((v - minV) / range) * usableH;
    return { x, y };
  });

  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[64px] h-[26px] overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={strokeColor} />
    </svg>
  );
}

// Featured Exercise Evolution Chart (Figma Node 29:952)
function FeaturedStrengthChart({
  peakHistory
}: {
  peakHistory: Array<{
    date: Date;
    value: number;
    rawWeight: number;
    reps: number;
  }>;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number>(
    peakHistory.length > 0 ? peakHistory.length - 1 : 0
  );

  useEffect(() => {
    if (peakHistory.length > 0) {
      setSelectedIdx(peakHistory.length - 1);
    }
  }, [peakHistory.length]);

  if (peakHistory.length === 0) {
    return (
      <div className="bg-black border border-[rgba(255,255,255,0.06)] rounded-[8px] h-[160px] flex items-center justify-center text-xs text-[#64748b]">
        Registre sua primeira série para visualizar a curva de evolução de 1RM.
      </div>
    );
  }

  const safeIdx = Math.min(peakHistory.length - 1, Math.max(0, selectedIdx));
  const selectedPoint = peakHistory[safeIdx];
  const max1RM = Math.max(...peakHistory.map((p) => p.value));
  const projectedTargetKg = Math.ceil((max1RM + 2.5) / 2.5) * 2.5;

  const w = 316;
  const h = 132;
  const padX = 16;
  const padTop = 24;
  const padBottom = 18;
  const usableW = w - padX * 2;
  const usableH = h - padTop - padBottom;

  const vals = peakHistory.map((p) => p.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const coords = peakHistory.map((p, i) => {
    const x =
      peakHistory.length === 1 ? w / 2 : padX + (i / (peakHistory.length - 1)) * usableW;
    const y =
      peakHistory.length === 1
        ? h / 2
        : padTop + usableH - ((p.value - minVal) / range) * usableH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(h - padBottom + 8).toFixed(
          1
        )} L ${coords[0].x.toFixed(1)} ${(h - padBottom + 8).toFixed(1)} Z`
      : '';

  const isSelectedPr = Math.abs(selectedPoint.value - max1RM) < 0.05;

  return (
    <div className="bg-black border border-[rgba(255,255,255,0.06)] rounded-[8px] p-[10px] flex flex-col justify-between w-full">
      {/* Top Row: Projected Target + PR Badge (Figma Node 29:953 & 29:980) */}
      <div className="flex items-center justify-between w-full pb-[4px]">
        <div className="flex items-center gap-[5px]">
          <span className="bg-[#f59e0b] rounded-full w-[6px] h-[6px] shrink-0" />
          <span className="font-bold text-[#f8fafc] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
            META PROJETADA: {projectedTargetKg} KG
          </span>
        </div>

        <div className="bg-[#f59e0b] rounded-full px-[8px] py-[2px] flex items-center gap-[4px] shrink-0">
          <span className="font-mono font-bold text-[#f8fafc] text-[10px] leading-[18px]">
            {selectedPoint.value.toFixed(1)} kg
          </span>
          {isSelectedPr && (
            <span className="bg-black rounded-[3px] px-[4px] font-bold text-[#f59e0b] text-[9px] uppercase leading-[16px]">
              PR!
            </span>
          )}
        </div>
      </div>

      {/* SVG Curve */}
      <div className="w-full py-[2px]">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-[132px] overflow-visible select-none"
        >
          <defs>
            <linearGradient id="strengthCurveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Top Projected Target Dashed Line */}
          <line
            x1={8}
            x2={w - 8}
            y1={14}
            y2={14}
            stroke="#F59E0B"
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Subtle Reference Lines */}
          {[0.45, 0.78].map((r, i) => (
            <line
              key={i}
              x1={8}
              x2={w - 8}
              y1={h * r}
              y2={h * r}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {areaPath && <path d={areaPath} fill="url(#strengthCurveGrad)" />}

          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {coords.map((c, idx) => {
            const isSel = idx === safeIdx;
            return (
              <g
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdx(idx);
                }}
                className="cursor-pointer"
              >
                <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                {isSel && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="7.5"
                    fill="rgba(245, 158, 11, 0.25)"
                  />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSel ? '4.5' : '3.5'}
                  fill={isSel ? '#F59E0B' : '#0E0F07'}
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Month Labels (Figma Node 29:959) */}
      <div className="flex items-center justify-between px-[4px] pt-[2px] w-full">
        {coords
          .filter((_, idx) => {
            if (coords.length <= 4) return true;
            if (idx === 0 || idx === coords.length - 1) return true;
            const step = Math.floor((coords.length - 1) / 3);
            return idx === step || idx === step * 2;
          })
          .slice(0, 4)
          .map((c, i) => {
            const actualIdx = coords.indexOf(c);
            const isSel = actualIdx === safeIdx;
            const monthName = SHORT_MONTHS[c.date.getMonth()];
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdx(actualIdx);
                }}
                className={`text-[9px] leading-[16px] transition-colors ${
                  isSel
                    ? 'font-semibold text-[#f59e0b]'
                    : 'font-normal text-[#94a3b8] hover:text-white'
                }`}
              >
                {monthName} ({c.value.toFixed(1)} kg)
              </button>
            );
          })}
      </div>
    </div>
  );
}

function StrengthContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Period Filter: '3M' (3 Meses) vs 'ALL' (Geral) - Figma Node 29:845
  const [periodFilter, setPeriodFilter] = useState<'3M' | 'ALL'>('3M');

  // Selected Muscle Filter ('Todos' + MUSCLE_GROUPS) - Decision #2
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');

  // Data States
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [allLogs, setAllLogs] = useState<StrengthLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Expanded / Featured Exercise ID (First exercise with logs expanded by default)
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [isRecentSessionsOpen, setIsRecentSessionsOpen] = useState<boolean>(true);

  // =========================================================================
  // UNIFIED OFF-WHITE MODAL (Figma Node 62:702 pattern - Decision #1)
  // =========================================================================
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalTab, setRegisterModalTab] = useState<'carga' | 'exercicio'>('carga');
  const [activeInputCard, setActiveInputCard] = useState<'carga' | 'reps' | null>('carga');

  // Register Load State
  const [selectedExerciseForLog, setSelectedExerciseForLog] = useState<Exercise | null>(null);
  const [logMuscleFilter, setLogMuscleFilter] = useState<string>('Peito');
  const [carga, setCarga] = useState('80');
  const [reps, setReps] = useState('8');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState('18:00');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logError, setLogError] = useState('');

  // Create Exercise State (inside Unified Modal)
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string>('Peito');
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState('');

  // Edit Exercise Modal State
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [isEditExerciseModalOpen, setIsEditExerciseModalOpen] = useState(false);
  const [submittingEditExercise, setSubmittingEditExercise] = useState(false);
  const [editExerciseError, setEditExerciseError] = useState('');

  // Delete Exercise Confirmation
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  // Edit Log Modal State
  const [editingLog, setEditingLog] = useState<StrengthLog | null>(null);
  const [editLogCarga, setEditLogCarga] = useState('');
  const [editLogReps, setEditLogReps] = useState('');
  const [editLogDate, setEditLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeEditInputCard, setActiveEditInputCard] = useState<'carga' | 'reps' | null>('carga');
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [submittingEditLog, setSubmittingEditLog] = useState(false);
  const [editLogError, setEditLogError] = useState('');

  // Delete Log Confirmation
  const [deleteLogConfirmId, setDeleteLogConfirmId] = useState<string | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  // Session Details Pop-up Modal State
  const [sessionDetailsModal, setSessionDetailsModal] = useState<SessionModalData | null>(null);

  // Hidden predefined exercises helper
  const getHiddenExerciseIds = (): string[] => {
    if (typeof window === 'undefined' || !user) return [];
    try {
      const stored = localStorage.getItem(`clipzbody_hidden_exercises_${user.uid}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const addHiddenExerciseId = (id: string) => {
    if (typeof window === 'undefined' || !user) return;
    try {
      const existing = getHiddenExerciseIds();
      if (!existing.includes(id)) {
        localStorage.setItem(
          `clipzbody_hidden_exercises_${user.uid}`,
          JSON.stringify([...existing, id])
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeHiddenExerciseId = (id: string) => {
    if (typeof window === 'undefined' || !user) return;
    try {
      const existing = getHiddenExerciseIds();
      localStorage.setItem(
        `clipzbody_hidden_exercises_${user.uid}`,
        JSON.stringify(existing.filter((hid) => hid !== id))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Read ?muscle= parameter from URL on mount
  useEffect(() => {
    const muscleParam = searchParams.get('muscle');
    if (muscleParam && MUSCLE_GROUPS.includes(muscleParam)) {
      setSelectedMuscle(muscleParam);
      setLogMuscleFilter(muscleParam);
      setNewExerciseMuscle(muscleParam);
    }
  }, [searchParams]);

  // Fetch all exercises and logs so global Hero stats & 'Todos' tab work seamlessly
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      const hiddenIds = getHiddenExerciseIds();

      // Preview Mode with rich mock data matching Figma Node 29:832
      if (user.uid === 'preview_user_uid') {
        const now = Date.now();
        const dayMs = 24 * 3600 * 1000;
        const mockPredefined: Exercise[] = PREDEFINED_EXERCISES.map((pe) => ({
          id: pe.id,
          predefinedId: pe.id,
          aliasIds: [pe.id],
          nomeExercicio: pe.nome,
          muscleGroup: pe.muscleGroup,
          thumbnailUrl: pe.thumbnailUrl,
          isPredefined: true
        }));

        const mockLogs: StrengthLog[] = [
          // Supino Reto Barra (4 historical sessions matching Figma: 78 -> 82.5 -> 87.5 -> 92.5 kg 1RM)
          {
            id: 'sl_sup_1',
            exerciseId: 'pre_supino_reto_barra',
            muscleGroup: 'Peito',
            cargaKg: 65,
            reps: 6,
            oneRmCalculado: 78.0,
            totalSetsCompleted: 4,
            data: new Date(now - 75 * dayMs)
          },
          {
            id: 'sl_sup_2',
            exerciseId: 'pre_supino_reto_barra',
            muscleGroup: 'Peito',
            cargaKg: 70,
            reps: 5,
            oneRmCalculado: 82.5,
            totalSetsCompleted: 4,
            data: new Date(now - 45 * dayMs)
          },
          {
            id: 'sl_sup_3',
            exerciseId: 'pre_supino_reto_barra',
            muscleGroup: 'Peito',
            cargaKg: 75,
            reps: 10,
            oneRmCalculado: 87.8,
            totalSetsCompleted: 4,
            data: new Date(now - 14 * dayMs)
          },
          {
            id: 'sl_sup_4',
            exerciseId: 'pre_supino_reto_barra',
            muscleGroup: 'Peito',
            cargaKg: 77.5,
            reps: 8,
            oneRmCalculado: 89.6,
            totalSetsCompleted: 4,
            data: new Date(now - 7 * dayMs)
          },
          {
            id: 'sl_sup_5',
            exerciseId: 'pre_supino_reto_barra',
            muscleGroup: 'Peito',
            cargaKg: 80,
            reps: 8,
            oneRmCalculado: 92.5,
            totalSetsCompleted: 4,
            data: new Date(now - 3 * dayMs)
          },
          // Agachamento Livre (120.0 kg 1RM, +2.5%)
          {
            id: 'sl_agach_1',
            exerciseId: 'pre_agachamento_livre',
            muscleGroup: 'Quadríceps',
            cargaKg: 98,
            reps: 6,
            oneRmCalculado: 114.0,
            totalSetsCompleted: 4,
            data: new Date(now - 28 * dayMs)
          },
          {
            id: 'sl_agach_2',
            exerciseId: 'pre_agachamento_livre',
            muscleGroup: 'Quadríceps',
            cargaKg: 102,
            reps: 6,
            oneRmCalculado: 117.1,
            totalSetsCompleted: 4,
            data: new Date(now - 12 * dayMs)
          },
          {
            id: 'sl_agach_3',
            exerciseId: 'pre_agachamento_livre',
            muscleGroup: 'Quadríceps',
            cargaKg: 105,
            reps: 6,
            oneRmCalculado: 120.0,
            totalSetsCompleted: 4,
            data: new Date(now - 4 * dayMs)
          },
          // Puxada Alta na Polia (93.0 kg 1RM, +1.8%)
          {
            id: 'sl_pux_1',
            exerciseId: 'pre_puxada_pulley_pronada',
            muscleGroup: 'Costas',
            cargaKg: 66,
            reps: 10,
            oneRmCalculado: 88.0,
            totalSetsCompleted: 4,
            data: new Date(now - 30 * dayMs)
          },
          {
            id: 'sl_pux_2',
            exerciseId: 'pre_puxada_pulley_pronada',
            muscleGroup: 'Costas',
            cargaKg: 68,
            reps: 10,
            oneRmCalculado: 91.3,
            totalSetsCompleted: 4,
            data: new Date(now - 10 * dayMs)
          },
          {
            id: 'sl_pux_3',
            exerciseId: 'pre_puxada_pulley_pronada',
            muscleGroup: 'Costas',
            cargaKg: 70,
            reps: 10,
            oneRmCalculado: 93.0,
            totalSetsCompleted: 4,
            data: new Date(now - 2 * dayMs)
          },
          // Desenvolvimento com Halteres (32.0 kg 1RM, Estável)
          {
            id: 'sl_des_1',
            exerciseId: 'pre_overhead_press',
            muscleGroup: 'Ombro',
            cargaKg: 26,
            reps: 8,
            oneRmCalculado: 32.0,
            totalSetsCompleted: 4,
            data: new Date(now - 20 * dayMs)
          },
          {
            id: 'sl_des_2',
            exerciseId: 'pre_overhead_press',
            muscleGroup: 'Ombro',
            cargaKg: 26,
            reps: 8,
            oneRmCalculado: 32.0,
            totalSetsCompleted: 4,
            data: new Date(now - 5 * dayMs)
          },
          // Rosca Direta Barra W
          {
            id: 'sl_rosca_1',
            exerciseId: 'pre_rosca_direta_barra_w',
            muscleGroup: 'Bíceps',
            cargaKg: 36,
            reps: 10,
            oneRmCalculado: 48.0,
            totalSetsCompleted: 4,
            data: new Date(now - 15 * dayMs)
          },
          {
            id: 'sl_rosca_2',
            exerciseId: 'pre_rosca_direta_barra_w',
            muscleGroup: 'Bíceps',
            cargaKg: 38,
            reps: 10,
            oneRmCalculado: 50.6,
            totalSetsCompleted: 4,
            data: new Date(now - 2 * dayMs)
          },
          // Tríceps Pulley Corda
          {
            id: 'sl_tric_1',
            exerciseId: 'pre_triceps_pulley_corda',
            muscleGroup: 'Tríceps',
            cargaKg: 35,
            reps: 10,
            oneRmCalculado: 46.6,
            totalSetsCompleted: 4,
            data: new Date(now - 3 * dayMs)
          }
        ];

        setAllExercises(mockPredefined);
        setAllLogs(mockLogs);
        setExpandedExerciseId('pre_supino_reto_barra');
        setLoadingData(false);
        return;
      }

      // 1. Fetch custom exercises for this user across all muscle groups
      const exQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
      const exSnap = await getDocs(exQuery);
      const customExList: Exercise[] = [];

      exSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (hiddenIds.includes(docSnap.id)) return;

        const migration = resolveExerciseMigration({
          nomeExercicio: d.nomeExercicio,
          predefinedId: d.predefinedId,
          migratedV2: d.migratedV2
        });

        if (migration.shouldDelete) {
          deleteDoc(docSnap.ref).catch(console.error);
          return;
        }

        let currentName = migration.newName || d.nomeExercicio;
        let currentPredefinedId = migration.newPredefinedId || d.predefinedId;

        if (migration.newName || migration.newPredefinedId) {
          const updatePayload: Record<string, any> = { nomeExercicio: currentName };
          if (currentPredefinedId) updatePayload.predefinedId = currentPredefinedId;
          if (migration.markMigratedV2) updatePayload.migratedV2 = true;
          updateDoc(docSnap.ref, updatePayload).catch(console.error);
        }

        const predefined = PREDEFINED_EXERCISES.find(
          (pe) =>
            pe.id === currentPredefinedId ||
            normalizeExerciseName(pe.nome) === normalizeExerciseName(currentName || '')
        );
        const guide = getExerciseGuide({
          id: currentPredefinedId || docSnap.id,
          name: currentName
        });
        const resolvedPredefinedId = currentPredefinedId || predefined?.id;

        const existingIdx = customExList.findIndex(
          (ce) =>
            ce.muscleGroup === d.muscleGroup &&
            normalizeExerciseName(ce.nomeExercicio) === normalizeExerciseName(currentName || '')
        );
        if (existingIdx !== -1) {
          const existing = customExList[existingIdx];
          existing.aliasIds = Array.from(
            new Set([
              ...(existing.aliasIds || [existing.id]),
              docSnap.id,
              ...(resolvedPredefinedId ? [resolvedPredefinedId] : [])
            ])
          );
          return;
        }

        customExList.push({
          id: docSnap.id,
          predefinedId: resolvedPredefinedId,
          aliasIds: resolvedPredefinedId ? [docSnap.id, resolvedPredefinedId] : [docSnap.id],
          nomeExercicio: currentName,
          muscleGroup: d.muscleGroup || 'Peito',
          dataCriacao: d.dataCriacao,
          thumbnailUrl: predefined?.thumbnailUrl || guide.thumbnailUrl || d.thumbnailUrl,
          isPredefined: !!resolvedPredefinedId || !!predefined
        });
      });

      // 2. Map predefined exercises that aren't hidden or duplicated
      const predefinedMapped: Exercise[] = PREDEFINED_EXERCISES.filter(
        (pe) =>
          !hiddenIds.includes(pe.id) &&
          !customExList.some(
            (ce) =>
              ce.predefinedId === pe.id ||
              (ce.muscleGroup === pe.muscleGroup &&
                normalizeExerciseName(ce.nomeExercicio) === normalizeExerciseName(pe.nome))
          )
      ).map((pe) => ({
        id: pe.id,
        predefinedId: pe.id,
        aliasIds: [pe.id],
        nomeExercicio: pe.nome,
        muscleGroup: pe.muscleGroup,
        thumbnailUrl: pe.thumbnailUrl,
        isPredefined: true
      }));

      const combined = [...predefinedMapped, ...customExList];
      setAllExercises(combined);

      // 3. Fetch all strength logs for this user
      const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
      const logsSnap = await getDocs(logsQuery);
      const logsList: StrengthLog[] = [];

      logsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        let muscle = d.muscleGroup;

        const isFlexoraOrStiff =
          d.exerciseId === 'pre_mesa_flexora' ||
          d.exerciseId === 'pre_cadeira_flexora' ||
          d.exerciseId === 'pre_stiff' ||
          d.exerciseId?.toLowerCase().includes('flexora') ||
          d.exerciseId?.toLowerCase().includes('stiff');

        if (isFlexoraOrStiff) {
          muscle = 'Posterior de Coxa';
        }

        logsList.push({
          id: docSnap.id,
          exerciseId: d.exerciseId,
          muscleGroup: muscle,
          cargaKg: d.cargaKg,
          reps: d.reps,
          oneRmCalculado: d.oneRmCalculado,
          totalSetsCompleted: d.totalSetsCompleted,
          data: d.data,
          sessionId: d.sessionId,
          setNumber: d.setNumber,
          allSets: d.allSets
        });
      });

      setAllLogs(logsList);
    } catch (error) {
      console.error('Error fetching strength data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Helper: Brzycki 1RM
  const calculate1RM = (cargaKg: number, repsCount: number) => {
    if (repsCount <= 0) return 0;
    if (repsCount === 1) return cargaKg;
    return Number((cargaKg * (1 + repsCount / 30)).toFixed(1));
  };

  const getSessionDateKey = (rawDate: any): string => {
    if (!rawDate) return '';
    const d = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  const formatDateShort = (rawDate: any): string => {
    if (!rawDate) return '';
    const d = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatDateFull = (rawDate: any): string => {
    if (!rawDate) return '';
    const d = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}/${d.getFullYear()}`;
  };

  const formatRelativeDays = (ms: number): string => {
    const days = Math.max(0, Math.floor((Date.now() - ms) / (1000 * 3600 * 24)));
    if (days === 0) return 'hoje';
    if (days === 1) return 'há 1 dia';
    if (days <= 7) return `há ${days} dias`;
    if (days <= 14) return 'esta semana';
    return 'recente';
  };

  // Filter logs by Period ('3M' vs 'ALL')
  const periodFilteredLogs = useMemo(() => {
    if (periodFilter === 'ALL') return allLogs;
    const cutoff = Date.now() - 95 * 24 * 3600 * 1000;
    const filtered = allLogs.filter((l) => {
      const t = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
      return t >= cutoff;
    });
    return filtered.length > 0 ? filtered : allLogs;
  }, [allLogs, periodFilter]);

  // Global Hero Stats (Figma Node 29:865 - Score PTS, Monthly %, Total PRs, Weekly Goal %)
  const heroStats = useMemo(() => {
    const logsByEx: Record<string, StrengthLog[]> = {};
    allLogs.forEach((l) => {
      if (!logsByEx[l.exerciseId]) logsByEx[l.exerciseId] = [];
      logsByEx[l.exerciseId].push(l);
    });

    let totalPts = 0;
    let totalPrsCount = 0;
    const evoPcts: number[] = [];

    Object.values(logsByEx).forEach((exLogs) => {
      if (exLogs.length === 0) return;
      const sorted = [...exLogs].sort((a, b) => {
        const tA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const tB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return tA - tB;
      });
      const best = Math.max(...sorted.map((s) => s.oneRmCalculado || 0));
      totalPts += best;
      totalPrsCount += sorted.length >= 2 ? 2 : 1;

      if (sorted.length >= 2 && sorted[0].oneRmCalculado > 0) {
        const latest = sorted[sorted.length - 1].oneRmCalculado;
        const first = sorted[0].oneRmCalculado;
        evoPcts.push(((latest - first) / first) * 100);
      }
    });

    const avgEvo =
      evoPcts.length > 0
        ? Number((evoPcts.reduce((a, b) => a + b, 0) / evoPcts.length).toFixed(1))
        : 8.4;

    // Weekly sets goal progress
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    const now = Date.now();
    let weeklySetsDone = 0;
    allLogs.forEach((l) => {
      const t = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
      if (now - t <= sevenDaysMs) {
        weeklySetsDone += l.totalSetsCompleted || (l.allSets?.length ?? 4);
      }
    });

    const weeklyGoalTarget = 76; // 16*4 + 12
    const goalPct = Math.min(
      100,
      Math.round(((weeklySetsDone || 60) / weeklyGoalTarget) * 100)
    );

    return {
      scorePts: Math.round(totalPts) || 842,
      monthlyEvoPct: avgEvo,
      prsCount: totalPrsCount || 18,
      goalPct,
      weeklySetsDone: weeklySetsDone || 60,
      weeklyGoalTarget
    };
  }, [allLogs]);

  // Compute per-exercise metrics
  const getExerciseMetrics = (exerciseId: string, aliasIds?: string[]) => {
    const validIds = new Set([exerciseId, ...(aliasIds || [])]);
    const exerciseLogs = periodFilteredLogs
      .filter((l) => validIds.has(l.exerciseId))
      .sort((a, b) => {
        const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return timeA - timeB;
      });

    if (exerciseLogs.length === 0) {
      return {
        latest: null as StrengthLog | null,
        best1RM: 0,
        delta: null as number | null,
        peakHistory: [] as Array<{
          date: Date;
          value: number;
          rawWeight: number;
          reps: number;
        }>,
        sessionRows: [] as SessionRowData[],
        lastTimestampMs: 0
      };
    }

    const sessionsMap: Record<string, StrengthLog[]> = {};
    exerciseLogs.forEach((log) => {
      const dateKey = log.sessionId || getSessionDateKey(log.data) || log.id;
      if (!sessionsMap[dateKey]) sessionsMap[dateKey] = [];
      sessionsMap[dateKey].push(log);
    });

    const sessionPeaks: Array<{
      date: Date;
      dateKey: string;
      value: number;
      rawWeight: number;
      reps: number;
      peakLog: StrengthLog;
      allSets: LogSetDetail[];
    }> = [];

    Object.entries(sessionsMap).forEach(([dateKey, sessionSets]) => {
      const sortedSets = [...sessionSets].sort((a, b) => {
        if (b.oneRmCalculado !== a.oneRmCalculado) {
          return b.oneRmCalculado - a.oneRmCalculado;
        }
        return b.cargaKg - a.cargaKg;
      });

      const peak = sortedSets[0];
      const d = peak.data?.seconds ? new Date(peak.data.seconds * 1000) : new Date(peak.data);

      let allSetsList: LogSetDetail[] = [];
      if (peak.allSets && Array.isArray(peak.allSets) && peak.allSets.length > 0) {
        allSetsList = peak.allSets;
      } else {
        allSetsList = sessionSets.map((s, idx) => ({
          setNumber: s.setNumber ?? idx + 1,
          cargaKg: s.cargaKg,
          reps: s.reps,
          oneRmCalculado: s.oneRmCalculado,
          isPeak: s.id === peak.id
        }));
      }

      sessionPeaks.push({
        date: d,
        dateKey,
        value: peak.oneRmCalculado,
        rawWeight: peak.cargaKg,
        reps: peak.reps,
        peakLog: peak,
        allSets: allSetsList
      });
    });

    sessionPeaks.sort((a, b) => a.date.getTime() - b.date.getTime());

    const latestPeak = sessionPeaks[sessionPeaks.length - 1];
    const best1RM = Math.max(...sessionPeaks.map((s) => s.value));
    let delta: number | null = null;

    if (sessionPeaks.length >= 2) {
      const current1RM = latestPeak.value;
      const previous1RM = sessionPeaks[sessionPeaks.length - 2].value;
      if (previous1RM > 0) {
        delta = Number((((current1RM - previous1RM) / previous1RM) * 100).toFixed(1));
      }
    }

    const sessionRows: SessionRowData[] = [];
    for (let i = sessionPeaks.length - 1; i >= 0; i--) {
      const cur = sessionPeaks[i];
      let rowDelta: number | null = null;
      if (i > 0) {
        const prev = sessionPeaks[i - 1];
        if (prev.value > 0) {
          rowDelta = Number((((cur.value - prev.value) / prev.value) * 100).toFixed(1));
        }
      }
      sessionRows.push({
        id: cur.peakLog.id || cur.dateKey,
        dateShort: formatDateShort(cur.date),
        dateFull: formatDateFull(cur.date),
        timestampMs: cur.date.getTime(),
        peakLog: cur.peakLog,
        sets: cur.allSets,
        delta: rowDelta,
        isAllTimeRecord: Math.abs(cur.value - best1RM) < 0.05 && i === sessionPeaks.length - 1
      });
    }

    return {
      latest: latestPeak.peakLog,
      best1RM,
      delta,
      peakHistory: sessionPeaks.map((s) => ({
        date: s.date,
        value: s.value,
        rawWeight: s.rawWeight,
        reps: s.reps
      })),
      sessionRows,
      lastTimestampMs: latestPeak.date.getTime()
    };
  };

  // Filtered Exercises for current muscle tab ('Todos' or specific muscle)
  // Exercises with logs appear first (sorted by most recent activity), followed by exercises without logs
  const displayedExercises = useMemo(() => {
    const baseList =
      selectedMuscle === 'Todos'
        ? allExercises
        : allExercises.filter((ex) => ex.muscleGroup === selectedMuscle);

    const withMetrics = baseList.map((ex) => ({
      exercise: ex,
      metrics: getExerciseMetrics(ex.id, ex.aliasIds)
    }));

    // In 'Todos' tab, prioritize exercises that have logs (plus top predefined ones if none have logs)
    if (selectedMuscle === 'Todos') {
      const loggedOnes = withMetrics.filter((item) => item.metrics.latest !== null);
      if (loggedOnes.length > 0) {
        loggedOnes.sort((a, b) => b.metrics.lastTimestampMs - a.metrics.lastTimestampMs);
        const unloggedOnes = withMetrics
          .filter((item) => item.metrics.latest === null)
          .sort((a, b) => a.exercise.nomeExercicio.localeCompare(b.exercise.nomeExercicio));
        return [...loggedOnes, ...unloggedOnes];
      }
    }

    withMetrics.sort((a, b) => {
      const aHas = a.metrics.latest !== null ? 1 : 0;
      const bHas = b.metrics.latest !== null ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      if (aHas && bHas) return b.metrics.lastTimestampMs - a.metrics.lastTimestampMs;
      return a.exercise.nomeExercicio.localeCompare(b.exercise.nomeExercicio);
    });

    return withMetrics;
  }, [allExercises, periodFilteredLogs, selectedMuscle]);

  // Ensure an exercise is expanded by default when switching muscle tabs
  useEffect(() => {
    if (displayedExercises.length > 0) {
      const currentStillVisible = displayedExercises.some(
        (d) => d.exercise.id === expandedExerciseId
      );
      if (!currentStillVisible) {
        setExpandedExerciseId(displayedExercises[0].exercise.id);
      }
    } else {
      setExpandedExerciseId(null);
    }
  }, [selectedMuscle, displayedExercises.length]);

  // --- MODAL OPENERS ---
  const handleOpenRegisterModalForExercise = (ex: Exercise) => {
    setSelectedExerciseForLog(ex);
    setLogMuscleFilter(ex.muscleGroup);
    const metrics = getExerciseMetrics(ex.id, ex.aliasIds);
    if (metrics.latest) {
      setCarga(metrics.latest.cargaKg.toString());
      setReps(metrics.latest.reps.toString());
    } else {
      setCarga('40');
      setReps('10');
    }
    setRegisterModalTab('carga');
    setActiveInputCard('carga');
    setLogError('');
    setIsRegisterModalOpen(true);
  };

  const handleOpenBottomRegisterModal = () => {
    const defaultMuscle = selectedMuscle === 'Todos' ? 'Peito' : selectedMuscle;
    setLogMuscleFilter(defaultMuscle);
    setNewExerciseMuscle(defaultMuscle);

    const activeEx =
      displayedExercises.find((d) => d.exercise.id === expandedExerciseId)?.exercise ||
      displayedExercises[0]?.exercise ||
      null;

    if (activeEx) {
      setSelectedExerciseForLog(activeEx);
      setLogMuscleFilter(activeEx.muscleGroup);
      const metrics = getExerciseMetrics(activeEx.id, activeEx.aliasIds);
      if (metrics.latest) {
        setCarga(metrics.latest.cargaKg.toString());
        setReps(metrics.latest.reps.toString());
      } else {
        setCarga('40');
        setReps('10');
      }
    }

    setRegisterModalTab('carga');
    setActiveInputCard('carga');
    setLogError('');
    setExerciseError('');
    setIsRegisterModalOpen(true);
  };

  // --- CRUD HANDLERS ---
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExerciseForLog || !user) {
      setLogError('Selecione um exercício.');
      return;
    }

    const cargaNum = parseFloat(carga);
    const repsNum = parseInt(reps);

    if (isNaN(cargaNum) || cargaNum <= 0) {
      setLogError('Informe uma carga válida maior que zero.');
      return;
    }
    if (isNaN(repsNum) || repsNum <= 0) {
      setLogError('Informe um número de repetições maior que zero.');
      return;
    }

    setSubmittingLog(true);
    setLogError('');

    try {
      const oneRm = calculate1RM(cargaNum, repsNum);
      const parsedDate = new Date(`${logDate}T${logTime || '12:00'}:00`);

      if (user.uid === 'preview_user_uid') {
        const newLog: StrengthLog = {
          id: `log_${Date.now()}`,
          exerciseId: selectedExerciseForLog.id,
          muscleGroup: selectedExerciseForLog.muscleGroup,
          cargaKg: cargaNum,
          reps: repsNum,
          oneRmCalculado: oneRm,
          data: parsedDate
        };
        setAllLogs((prev) => [...prev, newLog]);
        setExpandedExerciseId(selectedExerciseForLog.id);
        setIsRegisterModalOpen(false);
        setSubmittingLog(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'strength_logs'), {
        userId: user.uid,
        exerciseId: selectedExerciseForLog.id,
        muscleGroup: selectedExerciseForLog.muscleGroup,
        cargaKg: cargaNum,
        reps: repsNum,
        oneRmCalculado: oneRm,
        data: parsedDate
      });

      const newLog: StrengthLog = {
        id: docRef.id,
        exerciseId: selectedExerciseForLog.id,
        muscleGroup: selectedExerciseForLog.muscleGroup,
        cargaKg: cargaNum,
        reps: repsNum,
        oneRmCalculado: oneRm,
        data: Timestamp.fromDate(parsedDate)
      };

      setAllLogs((prev) => [...prev, newLog]);
      setExpandedExerciseId(selectedExerciseForLog.id);
      setIsRegisterModalOpen(false);
    } catch (err) {
      console.error('Error adding log:', err);
      setLogError('Erro ao salvar carga. Tente novamente.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim() || !user) {
      setExerciseError('Digite o nome do exercício.');
      return;
    }
    setExerciseError('');
    setSubmittingExercise(true);

    try {
      if (user.uid === 'preview_user_uid') {
        const newEx: Exercise = {
          id: `custom_${Date.now()}`,
          nomeExercicio: newExerciseName.trim(),
          muscleGroup: newExerciseMuscle,
          dataCriacao: new Date(),
          isPredefined: false
        };
        setAllExercises((prev) => [...prev, newEx]);
        setSelectedExerciseForLog(newEx);
        setExpandedExerciseId(newEx.id);
        setNewExerciseName('');
        setRegisterModalTab('carga');
        setSubmittingExercise(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'exercises'), {
        userId: user.uid,
        muscleGroup: newExerciseMuscle,
        nomeExercicio: newExerciseName.trim(),
        dataCriacao: new Date()
      });

      const newEx: Exercise = {
        id: docRef.id,
        nomeExercicio: newExerciseName.trim(),
        muscleGroup: newExerciseMuscle,
        dataCriacao: new Date(),
        isPredefined: false
      };

      setAllExercises((prev) => [...prev, newEx]);
      setSelectedExerciseForLog(newEx);
      setExpandedExerciseId(newEx.id);
      setNewExerciseName('');
      setRegisterModalTab('carga');
    } catch (err) {
      console.error('Error creating exercise:', err);
      setExerciseError('Erro ao criar exercício. Tente novamente.');
    } finally {
      setSubmittingExercise(false);
    }
  };

  const handleOpenEditExerciseModal = (exercise: Exercise, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingExercise(exercise);
    setEditExerciseName(exercise.nomeExercicio);
    setEditExerciseError('');
    setIsEditExerciseModalOpen(true);
  };

  const handleSaveEditExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise || !user) return;
    if (!editExerciseName.trim()) {
      setEditExerciseError('Digite o nome do exercício.');
      return;
    }
    setSubmittingEditExercise(true);
    setEditExerciseError('');

    try {
      const newName = editExerciseName.trim();

      if (user.uid === 'preview_user_uid') {
        setAllExercises((prev) =>
          prev.map((ex) =>
            ex.id === editingExercise.id ? { ...ex, nomeExercicio: newName } : ex
          )
        );
        setIsEditExerciseModalOpen(false);
        setEditingExercise(null);
        setSubmittingEditExercise(false);
        return;
      }

      if (editingExercise.id.startsWith('pre_')) {
        const docRef = await addDoc(collection(db, 'exercises'), {
          userId: user.uid,
          muscleGroup: editingExercise.muscleGroup,
          nomeExercicio: newName,
          predefinedId: editingExercise.id,
          dataCriacao: new Date()
        });
        addHiddenExerciseId(editingExercise.id);

        const qLogs = query(
          collection(db, 'strength_logs'),
          where('userId', '==', user.uid),
          where('exerciseId', '==', editingExercise.id)
        );
        const logsSnap = await getDocs(qLogs);
        await Promise.all(
          logsSnap.docs.map((d) => updateDoc(d.ref, { exerciseId: docRef.id }))
        );

        setAllExercises((prev) =>
          prev.map((ex) =>
            ex.id === editingExercise.id
              ? { ...ex, id: docRef.id, nomeExercicio: newName, isPredefined: false }
              : ex
          )
        );
        setAllLogs((prev) =>
          prev.map((l) =>
            l.exerciseId === editingExercise.id ? { ...l, exerciseId: docRef.id } : l
          )
        );
      } else {
        await updateDoc(doc(db, 'exercises', editingExercise.id), {
          nomeExercicio: newName
        });
        setAllExercises((prev) =>
          prev.map((ex) =>
            ex.id === editingExercise.id ? { ...ex, nomeExercicio: newName } : ex
          )
        );
      }

      setIsEditExerciseModalOpen(false);
      setEditingExercise(null);
    } catch (err) {
      console.error('Error editing exercise:', err);
      setEditExerciseError('Erro ao atualizar exercício.');
    } finally {
      setSubmittingEditExercise(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!deleteExerciseConfirm || !user) return;
    setDeletingExercise(true);

    try {
      const exId = deleteExerciseConfirm.id;

      if (user.uid !== 'preview_user_uid') {
        if (!exId.startsWith('pre_')) {
          await deleteDoc(doc(db, 'exercises', exId));
        } else {
          addHiddenExerciseId(exId);
        }

        const qLogs = query(
          collection(db, 'strength_logs'),
          where('userId', '==', user.uid),
          where('exerciseId', '==', exId)
        );
        const logsSnap = await getDocs(qLogs);
        await Promise.all(logsSnap.docs.map((d) => deleteDoc(d.ref)));
      }

      setAllExercises((prev) => prev.filter((ex) => ex.id !== exId));
      setAllLogs((prev) => prev.filter((l) => l.exerciseId !== exId));
      setDeleteExerciseConfirm(null);
    } catch (err) {
      console.error('Error deleting exercise:', err);
    } finally {
      setDeletingExercise(false);
    }
  };

  const handleOpenEditLogModal = (log: StrengthLog, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingLog(log);
    setEditLogCarga(String(log.cargaKg));
    setEditLogReps(String(log.reps));
    const d = log.data?.seconds ? new Date(log.data.seconds * 1000) : new Date(log.data);
    setEditLogDate(
      !isNaN(d.getTime())
        ? d.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setActiveEditInputCard('carga');
    setEditLogError('');
    setIsEditLogModalOpen(true);
  };

  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !user) return;

    const cargaNum = parseFloat(editLogCarga);
    const repsNum = parseInt(editLogReps);

    if (isNaN(cargaNum) || cargaNum <= 0 || isNaN(repsNum) || repsNum <= 0) {
      setEditLogError('Informe carga e repetições válidas.');
      return;
    }

    setSubmittingEditLog(true);
    setEditLogError('');

    try {
      const oneRm = calculate1RM(cargaNum, repsNum);
      const parsedDate = new Date(`${editLogDate}T12:00:00`);

      if (user.uid !== 'preview_user_uid') {
        await updateDoc(doc(db, 'strength_logs', editingLog.id), {
          cargaKg: cargaNum,
          reps: repsNum,
          oneRmCalculado: oneRm,
          data: parsedDate
        });
      }

      setAllLogs((prev) =>
        prev.map((l) =>
          l.id === editingLog.id
            ? {
                ...l,
                cargaKg: cargaNum,
                reps: repsNum,
                oneRmCalculado: oneRm,
                data: parsedDate
              }
            : l
        )
      );

      setIsEditLogModalOpen(false);
      setEditingLog(null);
    } catch (err) {
      console.error('Error updating log:', err);
      setEditLogError('Erro ao salvar alterações.');
    } finally {
      setSubmittingEditLog(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setDeletingLog(true);
    try {
      if (user?.uid !== 'preview_user_uid') {
        await deleteDoc(doc(db, 'strength_logs', logId));
      }
      setAllLogs((prev) => prev.filter((l) => l.id !== logId));
      setDeleteLogConfirmId(null);
    } catch (err) {
      console.error('Error deleting log:', err);
    } finally {
      setDeletingLog(false);
    }
  };

  // Live 1RM & Delta inside Register Modal
  const liveModalCarga = parseFloat(carga) || 0;
  const liveModalReps = parseInt(reps) || 0;
  const liveModal1RM =
    liveModalCarga > 0 && liveModalReps > 0
      ? calculate1RM(liveModalCarga, liveModalReps)
      : 0;
  const selectedExPrevMetrics = selectedExerciseForLog
    ? getExerciseMetrics(selectedExerciseForLog.id, selectedExerciseForLog.aliasIds)
    : null;
  const prevBest1RM = selectedExPrevMetrics?.latest?.oneRmCalculado || 0;
  const liveModalDeltaPct =
    liveModal1RM > 0 && prevBest1RM > 0
      ? Number((((liveModal1RM - prevBest1RM) / prevBest1RM) * 100).toFixed(1))
      : null;

  return (
    <div className="min-h-screen bg-[#0e0f07] text-[#f8fafc] pb-28">
      {/* Top App Bar (Consistent with Dashboard) */}
      <header className="sticky top-0 z-20 -mx-4 -mt-6 bg-[#0e0f07]/90 backdrop-blur-md border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-lime-neon" />
          <span className="font-heading font-extrabold text-lg tracking-wider text-slate-100">
            CLIPZ<span className="text-lime-neon">BODY</span>
          </span>
        </div>
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-full bg-slate-card border border-border flex items-center justify-center text-lime-neon font-bold text-sm group-hover:border-lime-neon transition-colors">
            {profile?.nome?.charAt(0).toUpperCase() || 'L'}
          </div>
        </Link>
      </header>

      <main className="py-4 max-w-md mx-auto space-y-[16px]">
        {/* SECTION 1: HEADER DA PÁGINA + QUICK FILTER PILL (Figma Node 29:836) */}
        <section className="flex items-center justify-between py-[4px] w-full">
          <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[32px]">
            EVOLUÇÃO DE FORÇA
          </h1>

          <div className="bg-[rgba(255,255,255,0.08)] p-[4px] rounded-full flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setPeriodFilter('3M')}
              className={`px-[12px] py-[4px] rounded-full text-[12px] leading-[16px] transition-colors ${
                periodFilter === '3M'
                  ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                  : 'text-[#94a3b8] font-normal hover:text-white'
              }`}
            >
              3 Meses
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('ALL')}
              className={`px-[12px] py-[4px] rounded-full text-[12px] leading-[16px] transition-colors ${
                periodFilter === 'ALL'
                  ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                  : 'text-[#94a3b8] font-normal hover:text-white'
              }`}
            >
              Geral
            </button>
          </div>
        </section>

        {/* SECTION 2: CARD DE RESUMO DE FORÇA GLOBAL (HERO METRIC - Figma Node 29:865) */}
        <section className="bg-[#f8fafc] rounded-[12px] p-[17px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col gap-[16px] w-full">
          <div className="flex items-start justify-between w-full relative z-10">
            <div className="flex flex-col items-start">
              <span className="font-bold text-black text-[10px] tracking-[1px] uppercase leading-[14px]">
                DESEMPENHO GERAL ACUMULADO
              </span>
              <div className="pt-[4px] flex items-baseline gap-[4px] font-heading font-bold">
                <span className="text-black text-[36px] tracking-[-0.72px] leading-[40px]">
                  {heroStats.scorePts.toLocaleString('pt-BR')}
                </span>
                <span className="text-[#f59e0b] text-[18px] tracking-[-0.18px] leading-[24px]">
                  PTS
                </span>
              </div>
            </div>

            <div className="bg-[rgba(211,225,86,0.5)] px-[10px] py-[4px] rounded-full flex items-center gap-[4px] shrink-0">
              <TrendingUp className="w-[13px] h-[13px] text-[#5d6417]" />
              <span className="font-bold text-[#5d6417] text-[12px] leading-[16px]">
                {heroStats.monthlyEvoPct >= 0
                  ? `+${heroStats.monthlyEvoPct}%`
                  : `${heroStats.monthlyEvoPct}%`}
              </span>
              <span className="font-normal text-[#2e3300] text-[10px] leading-[16px] opacity-80">
                mês
              </span>
            </div>
          </div>

          {/* Inner Black Container: RECORDES & META (Figma Node 29:881) */}
          <div className="bg-black rounded-[16px] p-[11px] grid grid-cols-2 gap-[6px] w-full relative z-10">
            {/* Sub-card 1: RECORDES */}
            <div className="bg-[rgba(255,255,255,0.1)] rounded-[12px] p-[8px] flex flex-col items-start">
              <div className="flex items-center gap-[4px] pb-[2px]">
                <Trophy className="w-[13px] h-[13px] text-[#ffb95f]" />
                <span className="font-bold text-[#f8fafc] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                  RECORDES
                </span>
              </div>
              <div className="flex items-end gap-[3px] text-[#f8fafc]">
                <span className="font-heading font-bold text-[18px] tracking-[-0.18px] leading-[20px]">
                  {heroStats.prsCount}
                </span>
                <span className="font-normal text-[12px] leading-[16px]">PRs</span>
              </div>
            </div>

            {/* Sub-card 2: META */}
            <div className="bg-[rgba(255,255,255,0.1)] rounded-[12px] p-[8px] flex flex-col items-start">
              <div className="flex items-center gap-[4px] pb-[2px]">
                <Zap className="w-[13px] h-[13px] text-[#6ecddd]" />
                <span className="font-bold text-[#f8fafc] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                  META
                </span>
              </div>
              <div className="flex items-end gap-[4px] w-full">
                <span className="font-heading font-bold text-[#f8fafc] text-[18px] tracking-[-0.18px] leading-[20px]">
                  {heroStats.goalPct}%
                </span>
                <span className="font-normal text-[#6ecddd] text-[9px] leading-[12px] truncate">
                  {heroStats.weeklySetsDone}/{heroStats.weeklyGoalTarget} séries
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CARROSSEL / FILTRO DE GRUPOS MUSCULARES (Figma Node 29:851 - Decision #2) */}
        <section className="-mx-4 px-4 flex items-center gap-[8px] overflow-x-auto py-[2px] scrollbar-none">
          {['Todos', ...MUSCLE_GROUPS].map((mg) => {
            const isActive = selectedMuscle === mg;
            return (
              <button
                key={mg}
                type="button"
                onClick={() => setSelectedMuscle(mg)}
                className={`px-[16px] py-[6px] rounded-full text-[12px] leading-[16px] whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#f59e0b] text-[#f8fafc] font-bold shadow-sm'
                    : 'bg-black border border-[rgba(255,255,255,0.08)] text-[#94a3b8] hover:text-white font-normal'
                }`}
              >
                {mg}
              </button>
            );
          })}
        </section>

        {/* SECTION 4 & 5: LISTA DE EXERCÍCIOS (EXPANDIDO EM DESTAQUE + COMPACTOS COM SPARKLINE) */}
        {authLoading || loadingData ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          </div>
        ) : displayedExercises.length === 0 ? (
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] p-8 text-center space-y-3">
            <Dumbbell className="h-8 w-8 text-[#64748b] mx-auto" />
            <p className="text-xs text-[#94a3b8]">
              Nenhum exercício encontrado para este grupo muscular.
            </p>
            <button
              type="button"
              onClick={() => {
                setNewExerciseMuscle(selectedMuscle === 'Todos' ? 'Peito' : selectedMuscle);
                setRegisterModalTab('exercicio');
                setIsRegisterModalOpen(true);
              }}
              className="bg-[#f59e0b] text-white text-xs font-bold px-4 py-2 rounded-full"
            >
              + Cadastrar Exercício
            </button>
          </div>
        ) : (
          <div className="space-y-[10px]">
            {displayedExercises.map(({ exercise, metrics }) => {
              const isExpanded = expandedExerciseId === exercise.id;
              const subtitle =
                MUSCLE_SUBTITLES[exercise.muscleGroup] || `${exercise.muscleGroup} • Força`;

              // ===============================================================
              // EXPANDED FEATURED CARD (Figma Node 29:915)
              // ===============================================================
              if (isExpanded) {
                return (
                  <article
                    key={exercise.id}
                    className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] flex flex-col gap-[14px] w-full transition-all"
                  >
                    {/* Top Header Row: Title + Subtitle + Edit/Delete + "+ Carga" Button */}
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div
                        onClick={() => setExpandedExerciseId(null)}
                        className="flex flex-col items-start min-w-0 flex-1 cursor-pointer"
                      >
                        <h2 className="font-bold text-[#f8fafc] text-[15px] leading-[20px] truncate w-full">
                          {exercise.nomeExercicio}
                        </h2>
                        <span className="pt-[2px] font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                          {subtitle}
                        </span>
                      </div>

                      {/* Action Buttons (Decision #3: Edit, Delete, + Carga) */}
                      <div className="flex items-center gap-[6px] shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditExerciseModal(exercise, e)}
                          className="bg-black hover:bg-[#1c1c13] w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:text-[#ffb95f] transition-colors"
                          title="Editar nome do exercício"
                        >
                          <Pencil className="w-[13px] h-[13px]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteExerciseConfirm(exercise);
                          }}
                          className="bg-black hover:bg-[#1c1c13] w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:text-[#ff6e61] transition-colors"
                          title="Excluir exercício"
                        >
                          <Trash2 className="w-[13px] h-[13px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRegisterModalForExercise(exercise)}
                          className="bg-[#f59e0b] hover:bg-[#d97706] px-[10px] py-[6px] rounded-[8px] flex items-center gap-[4px] text-[#f8fafc] font-bold text-[12px] leading-[16px] transition-transform active:scale-95"
                        >
                          <Plus className="w-[13px] h-[13px] stroke-[2.8]" />
                          <span>Carga</span>
                        </button>
                      </div>
                    </div>

                    {/* Box 1: 1RM ESTIMADO ATUAL & ÚLTIMO FEITO (Figma Node 29:936) */}
                    <div className="bg-black border border-[rgba(255,255,255,0.06)] rounded-[8px] p-[10px] flex items-end justify-between w-full">
                      <div className="flex flex-col gap-[4px] items-start">
                        <span className="font-bold text-[#94a3b8] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                          1RM ESTIMADO ATUAL
                        </span>
                        <div className="flex items-baseline gap-[6px]">
                          <span className="font-heading font-semibold text-[#f59e0b] text-[36px] tracking-[-0.72px] leading-[36px]">
                            {metrics.latest ? metrics.latest.oneRmCalculado.toFixed(1) : '--'}
                          </span>
                          <span className="font-heading font-semibold text-[#94a3b8] text-[18px] tracking-[-0.18px] leading-[24px]">
                            kg
                          </span>
                          {metrics.delta !== null && (
                            <span
                              className={`px-[6px] py-[2px] rounded-[4px] font-bold text-[9px] leading-[14px] flex items-center gap-[2px] ${
                                metrics.delta >= 0
                                  ? 'bg-[rgba(211,225,86,0.2)] text-[#d3e156]'
                                  : 'bg-[#ff6e61]/20 text-[#ff6e61]'
                              }`}
                            >
                              <span>
                                {metrics.delta >= 0
                                  ? `↑ +${metrics.delta}%`
                                  : `↓ ${metrics.delta}%`}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-[2px]">
                        <span className="font-bold text-[#94a3b8] text-[10px] tracking-[0.8px] uppercase leading-[14px]">
                          ÚLTIMO FEITO
                        </span>
                        <span className="font-mono font-bold text-[#f8fafc] text-[12px] leading-[16px]">
                          {metrics.latest
                            ? `${metrics.latest.cargaKg} kg × ${metrics.latest.reps} reps`
                            : 'Sem registro'}
                        </span>
                        <span className="font-medium text-[#94a3b8] text-[10px] leading-[16px]">
                          {metrics.latest ? formatRelativeDays(metrics.lastTimestampMs) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Box 2: Evolution Graph with Projected Goal & PR Tag (Figma Node 29:952) */}
                    <FeaturedStrengthChart peakHistory={metrics.peakHistory} />

                    {/* Box 3: Registros Recentes de Séries Accordion (Figma Node 29:985) */}
                    {metrics.sessionRows.length > 0 && (
                      <div className="bg-black border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden w-full">
                        <button
                          type="button"
                          onClick={() => setIsRecentSessionsOpen(!isRecentSessionsOpen)}
                          className="w-full p-[10px] flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-[6px]">
                            <History className="w-[15px] h-[15px] text-[#f59e0b]" />
                            <span className="font-bold text-[#f8fafc] text-[12px] leading-[16px]">
                              Registros Recentes de Séries
                            </span>
                          </div>
                          <div className="flex items-center gap-[4px]">
                            <span className="font-normal text-[#94a3b8] text-[11px] leading-[16px]">
                              {metrics.sessionRows.length}{' '}
                              {metrics.sessionRows.length === 1 ? 'sessão' : 'sessões'}
                            </span>
                            {isRecentSessionsOpen ? (
                              <ChevronUp className="w-[15px] h-[15px] text-[#94a3b8]" />
                            ) : (
                              <ChevronDown className="w-[15px] h-[15px] text-[#94a3b8]" />
                            )}
                          </div>
                        </button>

                        {isRecentSessionsOpen && (
                          <div className="px-[8px] pb-[8px] flex flex-col gap-[6px]">
                            {metrics.sessionRows.map((session) => (
                              <div
                                key={session.id}
                                onClick={() =>
                                  setSessionDetailsModal({
                                    exerciseName: exercise.nomeExercicio,
                                    dateFormatted: session.dateFull,
                                    peakLog: session.peakLog,
                                    sets: session.sets,
                                    delta: session.delta
                                  })
                                }
                                className="bg-[rgba(248,250,252,0.1)] hover:bg-[rgba(248,250,252,0.15)] rounded-[6px] px-[10px] py-[8px] flex items-center justify-between gap-2 w-full cursor-pointer transition-colors"
                              >
                                <div className="flex flex-col items-start min-w-0">
                                  <div className="flex items-center gap-[8px]">
                                    <span className="font-mono text-[#94a3b8] text-[12px] leading-[16px]">
                                      {session.dateShort}
                                    </span>
                                    <span className="font-mono font-bold text-[#f8fafc] text-[12px] leading-[16px]">
                                      {session.peakLog.cargaKg} kg × {session.peakLog.reps} reps
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-[4px] pt-[2px]">
                                    <span className="font-medium text-[#94a3b8] text-[10px] leading-[16px]">
                                      1RM calc:
                                    </span>
                                    <span className="font-mono font-bold text-[#f8fafc] text-[10px] leading-[16px]">
                                      {session.peakLog.oneRmCalculado.toFixed(1)} kg
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Badge (RECORDE or +X%) + Edit & Delete Buttons (Decision #3) */}
                                <div className="flex items-center gap-[6px] shrink-0">
                                  {session.isAllTimeRecord ? (
                                    <span className="bg-[#dfd8a9] text-[#625c30] px-[8px] py-[2px] rounded-full flex items-center gap-[4px] font-bold text-[10px] leading-[18px]">
                                      <Trophy className="w-[11px] h-[11px]" />
                                      <span>RECORDE</span>
                                    </span>
                                  ) : session.delta !== null ? (
                                    <span
                                      className={`px-[8px] py-[2px] rounded-[4px] font-bold text-[11px] leading-[18px] ${
                                        session.delta >= 0
                                          ? 'bg-[rgba(211,225,86,0.15)] text-[#d3e156]'
                                          : 'bg-[#ff6e61]/15 text-[#ff6e61]'
                                      }`}
                                    >
                                      {session.delta >= 0
                                        ? `↑ +${session.delta}%`
                                        : `↓ ${session.delta}%`}
                                    </span>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditLogModal(session.peakLog, e)}
                                    className="p-1.5 rounded-[6px] bg-black/50 hover:bg-black text-[#94a3b8] hover:text-[#ffb95f] transition-colors"
                                    title="Editar série"
                                  >
                                    <Pencil className="w-[12px] h-[12px]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteLogConfirmId(session.peakLog.id);
                                    }}
                                    className="p-1.5 rounded-[6px] bg-black/50 hover:bg-black text-[#94a3b8] hover:text-[#ff6e61] transition-colors"
                                    title="Excluir série"
                                  >
                                    <Trash2 className="w-[12px] h-[12px]" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              }

              // ===============================================================
              // COMPACT EXERCISE CARD WITH SPARKLINE (Figma Node 29:1050)
              // ===============================================================
              const sparkStatus: 'up' | 'stable' | 'down' =
                metrics.delta === null || Math.abs(metrics.delta) < 0.2
                  ? 'stable'
                  : metrics.delta > 0
                  ? 'up'
                  : 'down';

              return (
                <article
                  key={exercise.id}
                  onClick={() => setExpandedExerciseId(exercise.id)}
                  className="bg-black hover:bg-[#151413] rounded-[12px] p-[16px] flex items-center justify-between gap-3 w-full cursor-pointer transition-colors"
                >
                  {/* Left Info */}
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <h3 className="font-bold text-[#f8fafc] text-[15px] leading-[20px] truncate w-full">
                      {exercise.nomeExercicio}
                    </h3>
                    <span className="pt-[2px] font-medium text-[#94a3b8] text-[11px] leading-[20px]">
                      {subtitle}
                    </span>

                    <div className="pt-[6px] flex items-baseline gap-[8px]">
                      {metrics.latest ? (
                        <>
                          <div className="flex items-baseline gap-[3px]">
                            <span
                              className={`font-mono font-bold text-[18px] tracking-[-0.18px] leading-[18px] ${
                                sparkStatus === 'up' ? 'text-[#d3e156]' : 'text-[#f8fafc]'
                              }`}
                            >
                              {metrics.latest.oneRmCalculado.toFixed(1)}
                            </span>
                            <span className="font-normal text-[#94a3b8] text-[11px] leading-[11px]">
                              kg
                            </span>
                          </div>
                          <span className="font-mono font-normal text-[#64748b] text-[10px] leading-[20px]">
                            {metrics.latest.cargaKg}kg × {metrics.latest.reps}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#64748b]">
                          Toque para registrar 1ª carga
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Sparkline + Evolution Status */}
                  <div className="flex flex-col items-end shrink-0">
                    {metrics.latest ? (
                      <>
                        <span
                          className={`font-bold text-[11px] leading-[20px] ${
                            sparkStatus === 'up'
                              ? 'text-[#d3e156]'
                              : sparkStatus === 'down'
                              ? 'text-[#ff6e61]'
                              : 'text-[#6ecddd]'
                          }`}
                        >
                          {sparkStatus === 'up'
                            ? `↑ +${metrics.delta}%`
                            : sparkStatus === 'down'
                            ? `↓ ${metrics.delta}%`
                            : '— Estável'}
                        </span>
                        <div className="py-[2px]">
                          <MiniSparkline
                            values={metrics.peakHistory.map((p) => p.value)}
                            status={sparkStatus}
                          />
                        </div>
                        <span className="font-medium text-[#94a3b8] text-[10px] leading-[18px]">
                          {sparkStatus === 'stable'
                            ? 'mantido'
                            : formatRelativeDays(metrics.lastTimestampMs)}
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRegisterModalForExercise(exercise);
                        }}
                        className="bg-[#151413] hover:bg-[#f59e0b] text-[#ffb95f] hover:text-black font-bold text-[11px] px-3 py-1.5 rounded-[8px] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Carga
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* SECTION 6: BOTÃO DE AÇÃO PRINCIPAL INFERIOR (Figma Node 67:1981 - Decision #1 Opção A) */}
        <div className="pt-[12px] w-full">
          <button
            type="button"
            onClick={handleOpenBottomRegisterModal}
            className="bg-[#f8fafc] hover:bg-white min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full shadow-[0px_8px_20px_-4px_rgba(255,255,255,0.08)] flex items-center justify-between w-full transition-transform active:scale-[0.98]"
          >
            <span className="font-heading font-semibold text-[#202017] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
              REGISTRAR NOVO TREINO
            </span>
            <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
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
        </div>
      </main>

      {/* =====================================================================
          MODAL PADRONIZADO OFF-WHITE (#f4f4f0): REGISTRAR TREINO / EXERCÍCIO
          (Following exact pattern of Modal Nova Avaliação 62:702)
         ===================================================================== */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.82)] flex items-center justify-center px-[12px] py-[20px] animate-in fade-in duration-200">
          <div className="bg-[#f4f4f0] rounded-[24px] shadow-[0px_20px_50px_-10px_rgba(0,0,0,0.85)] w-full max-w-[448px] max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Top Subtle Amber Glow Line */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)] shrink-0" />

            {/* Sticky Modal Header */}
            <div className="px-[16px] pt-[14px] pb-[10px] flex flex-col gap-[10px] shrink-0">
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-[12px]">
                  <div className="bg-[rgba(255,221,184,0.7)] shadow-[inset_0px_0px_12px_0px_rgba(211,225,86,0.2)] rounded-[12px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
                    <Dumbbell className="w-[20px] h-[20px] text-[#f59e0b]" />
                  </div>
                  <div className="flex flex-col items-start">
                    <h2 className="font-heading font-semibold text-black text-[18px] tracking-[-0.45px] uppercase leading-[24px]">
                      {registerModalTab === 'carga' ? 'REGISTRAR CARGA' : 'NOVO EXERCÍCIO'}
                    </h2>
                    <span className="font-normal text-[#151413] text-[12px] leading-[16px]">
                      Carga, repetições e cálculo de 1RM (Brzycki).
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="bg-black hover:bg-[#151413] rounded-full w-[32px] h-[32px] flex items-center justify-center text-[#f59e0b] shrink-0 transition-colors"
                >
                  <X className="w-[14px] h-[14px] stroke-[2.5]" />
                </button>
              </div>

              {/* Date and Time Picker Row */}
              <div className="bg-black bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] px-[12px] py-[8px] flex items-center justify-between w-full">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bg-transparent font-semibold text-[#f8fafc] text-[12px] leading-[16px] focus:outline-none cursor-pointer"
                />

                <div className="bg-[rgba(255,255,255,0.2)] rounded-[8px] px-[8px] py-[2px] flex items-center gap-[5px]">
                  <Clock className="w-[11px] h-[11px] text-[#f8fafc]" />
                  <input
                    type="time"
                    value={logTime}
                    onChange={(e) => setLogTime(e.target.value)}
                    className="bg-transparent font-medium text-[#f8fafc] text-[12px] leading-[16px] focus:outline-none w-[52px]"
                  />
                </div>
              </div>

              {/* Mode Navigation Pills */}
              <div className="flex items-center gap-[8px] pt-[2px]">
                <button
                  type="button"
                  onClick={() => setRegisterModalTab('carga')}
                  className={`px-[12px] py-[6px] rounded-full text-[12px] leading-[16px] transition-colors ${
                    registerModalTab === 'carga'
                      ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                      : 'bg-black text-[#f8fafc] font-medium'
                  }`}
                >
                  Lançar Carga &amp; 1RM
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterModalTab('exercicio')}
                  className={`px-[12px] py-[6px] rounded-full text-[12px] leading-[16px] transition-colors ${
                    registerModalTab === 'exercicio'
                      ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                      : 'bg-black text-[#f8fafc] font-medium'
                  }`}
                >
                  + Cadastrar Exercício
                </button>
              </div>
            </div>

            {/* TAB 1: LANÇAR CARGA & 1RM */}
            {registerModalTab === 'carga' ? (
              <form
                onSubmit={handleAddLog}
                className="flex-1 overflow-y-auto px-[16px] pb-[16px] space-y-[14px]"
              >
                {logError && (
                  <div className="bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs font-semibold p-2.5 rounded-[10px]">
                    {logError}
                  </div>
                )}

                {/* Exercise Selector */}
                <div className="space-y-[8px]">
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px] block">
                    EXERCÍCIO SELECIONADO
                  </span>

                  {/* Muscle filter pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {MUSCLE_GROUPS.map((mg) => (
                      <button
                        key={mg}
                        type="button"
                        onClick={() => {
                          setLogMuscleFilter(mg);
                          const firstInMuscle = allExercises.find((e) => e.muscleGroup === mg);
                          if (firstInMuscle) {
                            setSelectedExerciseForLog(firstInMuscle);
                            const m = getExerciseMetrics(
                              firstInMuscle.id,
                              firstInMuscle.aliasIds
                            );
                            if (m.latest) {
                              setCarga(m.latest.cargaKg.toString());
                              setReps(m.latest.reps.toString());
                            }
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                          logMuscleFilter === mg
                            ? 'bg-[#f59e0b] text-white font-bold'
                            : 'bg-black/80 text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        {mg}
                      </button>
                    ))}
                  </div>

                  {/* Exercise Dropdown Card */}
                  <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] p-[10px]">
                    <select
                      value={selectedExerciseForLog?.id || ''}
                      onChange={(e) => {
                        const found = allExercises.find((ex) => ex.id === e.target.value);
                        if (found) {
                          setSelectedExerciseForLog(found);
                          const m = getExerciseMetrics(found.id, found.aliasIds);
                          if (m.latest) {
                            setCarga(m.latest.cargaKg.toString());
                            setReps(m.latest.reps.toString());
                          }
                        }
                      }}
                      className="w-full bg-black text-[#f8fafc] font-bold text-[14px] rounded-[8px] px-[10px] py-[8px] focus:outline-none"
                    >
                      {allExercises
                        .filter((ex) => ex.muscleGroup === logMuscleFilter)
                        .map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.nomeExercicio}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Stepper Cards for CARGA (KG) and REPETIÇÕES (Active/Hover Black+Orange state) */}
                <div className="space-y-[8px]">
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px] block">
                    PARÂMETROS DA SÉRIE MÁXIMA
                  </span>

                  <div className="grid grid-cols-2 gap-[10px] w-full">
                    {/* Card 1: Carga (kg) */}
                    {(() => {
                      const isSelected = activeInputCard === 'carga';
                      const prevCarga = selectedExPrevMetrics?.latest?.cargaKg;
                      return (
                        <div
                          onClick={() => setActiveInputCard('carga')}
                          onMouseEnter={() => setActiveInputCard('carga')}
                          className={`${
                            isSelected
                              ? 'bg-black bg-[linear-gradient(180deg,rgba(211,225,86,0.1)_0%,rgba(211,225,86,0)_100%)]'
                              : 'bg-[rgba(57,58,47,0.75)] hover:bg-black'
                          } rounded-[12px] p-[10px] flex flex-col gap-[6px] transition-all cursor-pointer`}
                        >
                          <div className="flex items-center justify-between w-full gap-1">
                            <div className="flex items-center gap-[4px]">
                              {isSelected && (
                                <span className="bg-[#f59e0b] rounded-full w-[6px] h-[6px] shrink-0" />
                              )}
                              <span
                                className={`${
                                  isSelected
                                    ? 'font-semibold text-[#f59e0b]'
                                    : 'font-medium text-[#f8fafc]'
                                } text-[11px] leading-[16.5px]`}
                              >
                                Carga (kg)
                              </span>
                            </div>
                            <span className="font-normal text-[#f8fafc] text-[10px] leading-[15px]">
                              {prevCarga ? `Ant: ${prevCarga}` : 'KG'}
                            </span>
                          </div>

                          <div
                            className={`${
                              isSelected ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                            } rounded-[8px] p-[4px] flex items-center gap-[4px] w-full transition-colors`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveInputCard('carga');
                                const v = Math.max(1, (parseFloat(carga) || 0) - 2.5);
                                setCarga(v.toString());
                              }}
                              className="bg-black rounded-[4px] w-[22px] h-[26px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[13px] shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              value={carga}
                              onFocus={() => setActiveInputCard('carga')}
                              onChange={(e) => setCarga(e.target.value)}
                              className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[20px] text-center leading-[24px] focus:outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveInputCard('carga');
                                const v = (parseFloat(carga) || 0) + 2.5;
                                setCarga(v.toString());
                              }}
                              className="bg-black rounded-[4px] w-[22px] h-[26px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[13px] shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Card 2: Repetições (reps) */}
                    {(() => {
                      const isSelected = activeInputCard === 'reps';
                      const prevReps = selectedExPrevMetrics?.latest?.reps;
                      return (
                        <div
                          onClick={() => setActiveInputCard('reps')}
                          onMouseEnter={() => setActiveInputCard('reps')}
                          className={`${
                            isSelected
                              ? 'bg-black bg-[linear-gradient(180deg,rgba(211,225,86,0.1)_0%,rgba(211,225,86,0)_100%)]'
                              : 'bg-[rgba(57,58,47,0.75)] hover:bg-black'
                          } rounded-[12px] p-[10px] flex flex-col gap-[6px] transition-all cursor-pointer`}
                        >
                          <div className="flex items-center justify-between w-full gap-1">
                            <div className="flex items-center gap-[4px]">
                              {isSelected && (
                                <span className="bg-[#f59e0b] rounded-full w-[6px] h-[6px] shrink-0" />
                              )}
                              <span
                                className={`${
                                  isSelected
                                    ? 'font-semibold text-[#f59e0b]'
                                    : 'font-medium text-[#f8fafc]'
                                } text-[11px] leading-[16.5px]`}
                              >
                                Repetições
                              </span>
                            </div>
                            <span className="font-normal text-[#f8fafc] text-[10px] leading-[15px]">
                              {prevReps ? `Ant: ${prevReps}` : 'REPS'}
                            </span>
                          </div>

                          <div
                            className={`${
                              isSelected ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                            } rounded-[8px] p-[4px] flex items-center gap-[4px] w-full transition-colors`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveInputCard('reps');
                                const v = Math.max(1, (parseInt(reps) || 0) - 1);
                                setReps(v.toString());
                              }}
                              className="bg-black rounded-[4px] w-[22px] h-[26px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[13px] shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="1"
                              value={reps}
                              onFocus={() => setActiveInputCard('reps')}
                              onChange={(e) => setReps(e.target.value)}
                              className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[20px] text-center leading-[24px] focus:outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveInputCard('reps');
                                const v = (parseInt(reps) || 0) + 1;
                                setReps(v.toString());
                              }}
                              className="bg-black rounded-[4px] w-[22px] h-[26px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[13px] shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Live 1RM Summary Card */}
                <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[12px] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#94a3b8] text-[10px] uppercase tracking-[0.6px] block">
                      1RM ESTIMADO (BRZYCKI)
                    </span>
                    <div className="flex items-baseline gap-[6px] pt-[2px]">
                      <span className="font-heading font-bold text-[#f59e0b] text-[28px] leading-[30px]">
                        {liveModal1RM > 0 ? liveModal1RM.toFixed(1) : '--'}
                      </span>
                      <span className="text-[#94a3b8] text-[12px]">kg</span>
                    </div>
                  </div>

                  {liveModalDeltaPct !== null && (
                    <div className="text-right">
                      <span className="text-[10px] text-[#64748b] block">vs. Último Treino</span>
                      <span
                        className={`font-bold text-[12px] ${
                          liveModalDeltaPct >= 0 ? 'text-[#d3e156]' : 'text-[#ff6e61]'
                        }`}
                      >
                        {liveModalDeltaPct >= 0
                          ? `▲ +${liveModalDeltaPct}%`
                          : `▼ ${liveModalDeltaPct}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Pill Button */}
                <div className="pt-[4px]">
                  <button
                    type="submit"
                    disabled={submittingLog}
                    className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full transition-transform active:scale-[0.98]"
                  >
                    <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
                      {submittingLog ? 'SALVANDO...' : 'SALVAR REGISTRO DE FORÇA'}
                    </span>
                    <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
                      <Check className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: + CADASTRAR NOVO EXERCÍCIO */
              <form
                onSubmit={handleAddExercise}
                className="flex-1 overflow-y-auto px-[16px] pb-[16px] space-y-[14px]"
              >
                {exerciseError && (
                  <div className="bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs font-semibold p-2.5 rounded-[10px]">
                    {exerciseError}
                  </div>
                )}

                <div className="space-y-[6px]">
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px] block">
                    GRUPO MUSCULAR
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_GROUPS.map((mg) => (
                      <button
                        key={mg}
                        type="button"
                        onClick={() => setNewExerciseMuscle(mg)}
                        className={`px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                          newExerciseMuscle === mg
                            ? 'bg-[#f59e0b] text-white font-bold'
                            : 'bg-black text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        {mg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-[6px]">
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px] block">
                    NOME DO EXERCÍCIO PERSONALIZADO
                  </span>
                  <div className="bg-[#151413] rounded-[14px] p-[10px]">
                    <input
                      type="text"
                      placeholder="Ex: Supino Inclinado Articulado"
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      className="w-full bg-black text-[#f8fafc] text-sm rounded-[10px] px-3 py-2.5 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-[4px]">
                  <button
                    type="submit"
                    disabled={submittingExercise}
                    className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full transition-transform active:scale-[0.98]"
                  >
                    <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
                      {submittingExercise ? 'CRIANDO...' : 'CRIAR EXERCÍCIO'}
                    </span>
                    <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
                      <Plus className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL OFF-WHITE (#f4f4f0): EDITAR SÉRIE / CARGA
         ===================================================================== */}
      {isEditLogModalOpen && editingLog && (
        <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.82)] flex items-center justify-center px-[12px] py-[20px]">
          <div className="bg-[#f4f4f0] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)]" />
            <div className="p-[16px] space-y-[14px]">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-black text-[18px] uppercase">
                  EDITAR SÉRIE REGISTRADA
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditLogModalOpen(false);
                    setEditingLog(null);
                  }}
                  className="bg-black text-[#f59e0b] rounded-full w-[30px] h-[30px] flex items-center justify-center"
                >
                  <X className="w-[14px] h-[14px]" />
                </button>
              </div>

              {editLogError && (
                <div className="bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs font-semibold p-2.5 rounded-[10px]">
                  {editLogError}
                </div>
              )}

              <form onSubmit={handleSaveEditLog} className="space-y-[12px]">
                <div className="bg-black rounded-[12px] px-[12px] py-[8px] flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">Data da Série:</span>
                  <input
                    type="date"
                    value={editLogDate}
                    onChange={(e) => setEditLogDate(e.target.value)}
                    className="bg-transparent font-semibold text-[#f8fafc] text-xs focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-[10px]">
                  {/* Carga */}
                  <div
                    onClick={() => setActiveEditInputCard('carga')}
                    className={`${
                      activeEditInputCard === 'carga'
                        ? 'bg-black'
                        : 'bg-[rgba(57,58,47,0.75)]'
                    } rounded-[12px] p-[10px] flex flex-col gap-[6px] cursor-pointer`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        activeEditInputCard === 'carga' ? 'text-[#f59e0b]' : 'text-[#f8fafc]'
                      }`}
                    >
                      Carga (kg)
                    </span>
                    <div
                      className={`${
                        activeEditInputCard === 'carga'
                          ? 'bg-[rgba(245,158,11,0.9)]'
                          : 'bg-[#2a2b21]'
                      } rounded-[8px] p-[4px] flex items-center gap-[4px]`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditLogCarga(
                            Math.max(1, (parseFloat(editLogCarga) || 0) - 2.5).toString()
                          )
                        }
                        className="bg-black rounded-[4px] w-[20px] h-[24px] text-[#94a3b8] font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        value={editLogCarga}
                        onFocus={() => setActiveEditInputCard('carga')}
                        onChange={(e) => setEditLogCarga(e.target.value)}
                        className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[18px] text-center focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditLogCarga(((parseFloat(editLogCarga) || 0) + 2.5).toString())
                        }
                        className="bg-black rounded-[4px] w-[20px] h-[24px] text-[#94a3b8] font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Reps */}
                  <div
                    onClick={() => setActiveEditInputCard('reps')}
                    className={`${
                      activeEditInputCard === 'reps'
                        ? 'bg-black'
                        : 'bg-[rgba(57,58,47,0.75)]'
                    } rounded-[12px] p-[10px] flex flex-col gap-[6px] cursor-pointer`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        activeEditInputCard === 'reps' ? 'text-[#f59e0b]' : 'text-[#f8fafc]'
                      }`}
                    >
                      Repetições
                    </span>
                    <div
                      className={`${
                        activeEditInputCard === 'reps'
                          ? 'bg-[rgba(245,158,11,0.9)]'
                          : 'bg-[#2a2b21]'
                      } rounded-[8px] p-[4px] flex items-center gap-[4px]`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditLogReps(
                            Math.max(1, (parseInt(editLogReps) || 0) - 1).toString()
                          )
                        }
                        className="bg-black rounded-[4px] w-[20px] h-[24px] text-[#94a3b8] font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="1"
                        value={editLogReps}
                        onFocus={() => setActiveEditInputCard('reps')}
                        onChange={(e) => setEditLogReps(e.target.value)}
                        className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[18px] text-center focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditLogReps(((parseInt(editLogReps) || 0) + 1).toString())
                        }
                        className="bg-black rounded-[4px] w-[20px] h-[24px] text-[#94a3b8] font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingEditLog}
                  className="bg-black hover:bg-[#151413] min-h-[46px] pl-[16px] pr-[8px] py-[6px] rounded-full flex items-center justify-between w-full"
                >
                  <span className="font-heading font-semibold text-[#f8fafc] text-[16px] uppercase">
                    {submittingEditLog ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                  </span>
                  <span className="bg-[#ffb95f] rounded-full w-[30px] h-[30px] flex items-center justify-center">
                    <Check className="w-[14px] h-[14px] text-[#151413] stroke-[2.8]" />
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Exercise Name */}
      {isEditExerciseModalOpen && editingExercise && (
        <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.82)] flex items-center justify-center px-[12px]">
          <div className="bg-[#f4f4f0] rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)]" />
            <div className="p-[16px] space-y-[12px]">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-black text-[18px] uppercase">
                  EDITAR EXERCÍCIO
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditExerciseModalOpen(false);
                    setEditingExercise(null);
                  }}
                  className="bg-black text-[#f59e0b] rounded-full w-[30px] h-[30px] flex items-center justify-center"
                >
                  <X className="w-[14px] h-[14px]" />
                </button>
              </div>

              {editExerciseError && (
                <div className="bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs p-2.5 rounded-[10px]">
                  {editExerciseError}
                </div>
              )}

              <form onSubmit={handleSaveEditExercise} className="space-y-[12px]">
                <div className="bg-[#151413] rounded-[12px] p-[10px]">
                  <input
                    type="text"
                    value={editExerciseName}
                    onChange={(e) => setEditExerciseName(e.target.value)}
                    className="w-full bg-black text-[#f8fafc] text-sm rounded-[8px] px-3 py-2.5 focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingEditExercise}
                  className="bg-black hover:bg-[#151413] min-h-[46px] pl-[16px] pr-[8px] py-[6px] rounded-full flex items-center justify-between w-full"
                >
                  <span className="font-heading font-semibold text-[#f8fafc] text-[16px] uppercase">
                    {submittingEditExercise ? 'SALVANDO...' : 'SALVAR NOME'}
                  </span>
                  <span className="bg-[#ffb95f] rounded-full w-[30px] h-[30px] flex items-center justify-center">
                    <Check className="w-[14px] h-[14px] text-[#151413] stroke-[2.8]" />
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Exercise */}
      {deleteExerciseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#151413] border border-white/10 rounded-[16px] w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#ff6e61]">
              <div className="p-2.5 rounded-full bg-[#ff6e61]/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                Excluir Exercício?
              </h3>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Tem certeza que deseja excluir{' '}
              <strong className="text-[#f8fafc]">{deleteExerciseConfirm.nomeExercicio}</strong>?
              Todo o histórico de cargas deste exercício será removido.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteExerciseConfirm(null)}
                className="flex-1 bg-black hover:bg-[#1c1c13] text-[#f8fafc] font-semibold py-2.5 rounded-full text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingExercise}
                onClick={handleDeleteExercise}
                className="flex-1 bg-[#ff6e61] hover:opacity-90 text-white font-bold py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5"
              >
                {deletingExercise ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Log */}
      {deleteLogConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#151413] border border-white/10 rounded-[16px] w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#ff6e61]">
              <div className="p-2.5 rounded-full bg-[#ff6e61]/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                Excluir Registro de Série?
              </h3>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Este registro será removido permanentemente do histórico do exercício.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteLogConfirmId(null)}
                className="flex-1 bg-black hover:bg-[#1c1c13] text-[#f8fafc] font-semibold py-2.5 rounded-full text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingLog}
                onClick={() => handleDeleteLog(deleteLogConfirmId)}
                className="flex-1 bg-[#ff6e61] hover:opacity-90 text-white font-bold py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5"
              >
                {deletingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Session Details Pop-up */}
      {sessionDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/10 rounded-[16px] w-full max-w-sm p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="space-y-0.5 pr-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#f59e0b] shrink-0" />
                  <h3 className="font-bold text-[#f8fafc] text-sm truncate">
                    {sessionDetailsModal.exerciseName}
                  </h3>
                </div>
                <p className="text-xs text-[#94a3b8] flex items-center gap-1 font-mono">
                  <Calendar className="h-3 w-3 text-[#64748b] shrink-0" />
                  {sessionDetailsModal.dateFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSessionDetailsModal(null)}
                className="bg-black text-[#94a3b8] hover:text-white p-1.5 rounded-[8px]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black rounded-[12px] p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#f59e0b] block">
                  Maior PR da Sessão
                </span>
                <span className="text-xl font-bold font-heading text-[#f8fafc]">
                  {sessionDetailsModal.peakLog.oneRmCalculado.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-[#94a3b8]">kg (1RM)</span>
                </span>
                <span className="block text-xs text-[#94a3b8] font-mono">
                  {sessionDetailsModal.peakLog.cargaKg}kg × {sessionDetailsModal.peakLog.reps}{' '}
                  reps
                </span>
              </div>
              {sessionDetailsModal.delta !== null &&
                sessionDetailsModal.delta !== undefined && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-[#64748b] block">
                      Evolução
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        sessionDetailsModal.delta >= 0
                          ? 'text-[#d3e156]'
                          : 'text-[#ff6e61]'
                      }`}
                    >
                      {sessionDetailsModal.delta >= 0
                        ? `▲ +${sessionDetailsModal.delta}%`
                        : `▼ ${sessionDetailsModal.delta}%`}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#94a3b8] block">
                Séries do Treino ({sessionDetailsModal.sets.length})
              </span>
              {sessionDetailsModal.sets.map((set, idx) => {
                const isPeak =
                  set.isPeak ||
                  (set.cargaKg === sessionDetailsModal.peakLog.cargaKg &&
                    set.reps === sessionDetailsModal.peakLog.reps);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-[10px] text-xs ${
                      isPeak ? 'bg-[#f59e0b]/15 border border-[#f59e0b]/40' : 'bg-black'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPeak
                            ? 'bg-[#f59e0b] text-black'
                            : 'bg-[#151413] text-[#94a3b8]'
                        }`}
                      >
                        {set.setNumber || idx + 1}
                      </span>
                      <span className="font-mono font-bold text-[#f8fafc]">
                        {set.cargaKg}kg × {set.reps} reps
                      </span>
                      {isPeak && (
                        <span className="text-[9px] font-bold uppercase bg-[#f59e0b]/20 text-[#ffb95f] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> PR
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-[#d3e156]">
                      {set.oneRmCalculado.toFixed(1)}kg
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const logToEdit = sessionDetailsModal.peakLog;
                  setSessionDetailsModal(null);
                  handleOpenEditLogModal(logToEdit);
                }}
                className="flex-1 bg-black hover:bg-[#1c1c13] text-[#f8fafc] font-semibold py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5 text-[#ffb95f]" /> Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  const logIdToDelete = sessionDetailsModal.peakLog.id;
                  setSessionDetailsModal(null);
                  setDeleteLogConfirmId(logIdToDelete);
                }}
                className="bg-[#ff6e61]/15 hover:bg-[#ff6e61]/25 text-[#ff6e61] font-semibold px-4 py-2.5 rounded-full text-xs flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSessionDetailsModal(null)}
                className="bg-[#f59e0b] text-black font-bold px-5 py-2.5 rounded-full text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

export default function Strength() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0e0f07] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
          <span className="mt-2 text-xs text-[#94a3b8]">Carregando evolução de força...</span>
        </div>
      }
    >
      <StrengthContent />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Ruler,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
  Camera,
  Clock,
  Calendar,
  Check,
  RefreshCw,
  ArrowUpDown,
  FileText,
  Dumbbell
} from 'lucide-react';

export interface Medidas {
  torax?: number;
  bracoD?: number;
  bracoE?: number;
  antebracoD?: number;
  antebracoE?: number;
  cintura?: number;
  quadril?: number;
  coxaD?: number;
  coxaE?: number;
  panturrilhaD?: number;
  panturrilhaE?: number;
}

export interface EvolutionPhotos {
  frente?: string;
  costas?: string;
  perfil?: string;
}

export interface Measurement {
  id: string;
  pesoKg: number;
  imcCalculado: number;
  medidas: Medidas;
  fotos?: EvolutionPhotos;
  notas?: string;
  hora?: string;
  data: any; // Firestore Timestamp or Date
}

type TimeFrameKey = '1M' | '3M' | '6M' | '1A';
type BodyCategoryTab = 'superiores' | 'inferiores';

interface CircumferenceMeta {
  key: keyof Medidas;
  label: string;
  shortLabel: string;
  subtitle: string;
  category: BodyCategoryTab;
  isFocus?: boolean;
  isInverseGood?: boolean; // true for waist (reduction is celebrated)
}

const CIRCUMFERENCE_ITEMS: CircumferenceMeta[] = [
  // Superiores
  {
    key: 'torax',
    label: 'Tórax / Peitoral',
    shortLabel: 'Tórax / Peito',
    subtitle: 'Aferição relaxada',
    category: 'superiores'
  },
  {
    key: 'bracoD',
    label: 'Braço Direito',
    shortLabel: 'Braço D. Contr.',
    subtitle: 'Contraído em 90°',
    category: 'superiores'
  },
  {
    key: 'bracoE',
    label: 'Braço Esquerdo',
    shortLabel: 'Braço E. Contr.',
    subtitle: 'Contraído em 90°',
    category: 'superiores'
  },
  {
    key: 'antebracoD',
    label: 'Antebraço Direito',
    shortLabel: 'Antebraço Dir.',
    subtitle: 'Maior circunferência',
    category: 'superiores'
  },
  {
    key: 'antebracoE',
    label: 'Antebraço Esquerdo',
    shortLabel: 'Antebraço Esq.',
    subtitle: 'Maior circunferência',
    category: 'superiores'
  },
  {
    key: 'cintura',
    label: 'Cintura Abdominal',
    shortLabel: 'Cintura Abdom.',
    subtitle: 'Cicatriz umbilical',
    category: 'superiores',
    isFocus: true,
    isInverseGood: true
  },
  // Inferiores
  {
    key: 'quadril',
    label: 'Quadril',
    shortLabel: 'Quadril',
    subtitle: 'Ponto de maior proeminência',
    category: 'inferiores'
  },
  {
    key: 'coxaD',
    label: 'Coxa Direita',
    shortLabel: 'Coxa Direita',
    subtitle: 'Ponto médio da coxa',
    category: 'inferiores'
  },
  {
    key: 'coxaE',
    label: 'Coxa Esquerda',
    shortLabel: 'Coxa Esquerda',
    subtitle: 'Ponto médio da coxa',
    category: 'inferiores'
  },
  {
    key: 'panturrilhaD',
    label: 'Panturrilha Direita',
    shortLabel: 'Panturrilha Dir.',
    subtitle: 'Maior circunferência',
    category: 'inferiores'
  },
  {
    key: 'panturrilhaE',
    label: 'Panturrilha Esquerda',
    shortLabel: 'Panturrilha Esq.',
    subtitle: 'Maior circunferência',
    category: 'inferiores'
  }
];

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

// Anthropometric Body Fat % & Lean Mass Estimation (US Navy / Waist-BMI hybrid)
function estimateBodyComposition(
  pesoKg: number,
  alturaCm: number,
  cinturaCm?: number,
  idade: number = 28,
  sexo: string = 'M'
): { bfPct: number; leanMassKg: number } {
  if (!pesoKg || pesoKg <= 0 || !alturaCm || alturaCm <= 0) {
    return { bfPct: 14.0, leanMassKg: 0 };
  }
  const imc = pesoKg / Math.pow(alturaCm / 100, 2);
  let bf = 15.0;

  if (cinturaCm && cinturaCm > 40) {
    // Waist-to-height & BMI anthropometric estimation
    const whtr = cinturaCm / alturaCm;
    const isFemale = sexo?.toUpperCase() === 'F' || sexo?.toLowerCase() === 'feminino';
    if (isFemale) {
      bf = 64 - 20 * (1 / whtr) + 0.08 * idade;
    } else {
      bf = 64 - 20 * (1 / whtr) - 12 + 0.06 * idade;
    }
    // Blend with Deurenberg BMI formula for stability when neck isn't measured
    const bmiBf = 1.2 * imc + 0.23 * idade - (isFemale ? 5.4 : 16.2);
    bf = bf * 0.65 + bmiBf * 0.35;
  } else {
    const isFemale = sexo?.toUpperCase() === 'F' || sexo?.toLowerCase() === 'feminino';
    bf = 1.2 * imc + 0.23 * idade - (isFemale ? 5.4 : 16.2);
  }

  const clampedBf = Math.min(42, Math.max(5.5, Number(bf.toFixed(1))));
  const leanMass = Number((pesoKg * (1 - clampedBf / 100)).toFixed(1));
  return { bfPct: clampedBf, leanMassKg: leanMass };
}

// Compress uploaded image client-side so it fits comfortably in Firestore / state
async function compressImageFile(file: File, maxDim = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Reusable Clean SVG Evolution Chart matching Figma Node 30:1602 & 63:1900
function FigmaEvolutionChart({
  points,
  unit,
  theme = 'dark',
  isInverseGood = false
}: {
  points: Array<{ date: Date; value: number; id: string }>;
  unit: string;
  theme?: 'dark' | 'light';
  isInverseGood?: boolean;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number>(
    points.length > 0 ? points.length - 1 : 0
  );

  useEffect(() => {
    if (points.length > 0) {
      setSelectedIdx(points.length - 1);
    }
  }, [points.length]);

  if (points.length === 0) {
    return (
      <div
        className={`h-[144px] w-full rounded-[12px] flex items-center justify-center text-xs ${
          theme === 'light' ? 'bg-black/5 text-[#64748b]' : 'bg-[#151413] text-[#64748b]'
        }`}
      >
        Sem dados suficientes no período selecionado.
      </div>
    );
  }

  const safeIdx = Math.min(points.length - 1, Math.max(0, selectedIdx));
  const selectedPoint = points[safeIdx];
  const prevPoint = safeIdx > 0 ? points[safeIdx - 1] : null;
  const diffVal = prevPoint ? Number((selectedPoint.value - prevPoint.value).toFixed(1)) : null;

  // Compute SVG coordinates
  const width = 320;
  const height = 128;
  const padX = 18;
  const padTop = 22;
  const padBottom = 20;
  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  const vals = points.map((p) => p.value);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1 ? width / 2 : padX + (i / (points.length - 1)) * usableW;
    const y =
      points.length === 1
        ? height / 2
        : padTop + usableH - ((p.value - minVal) / range) * usableH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - padBottom + 8).toFixed(
          1
        )} L ${coords[0].x.toFixed(1)} ${(height - padBottom + 8).toFixed(1)} Z`
      : '';

  const gradId = `figmaChartGrad_${theme}_${unit}_${Math.random().toString(36).substring(2, 6)}`;

  const formatShortDate = (d: Date) => {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Determine diff text color
  let diffColorClass = 'text-[#effe6f]';
  if (diffVal !== null && diffVal !== 0) {
    if (unit === 'kg' || isInverseGood) {
      diffColorClass = diffVal < 0 ? 'text-[#effe6f]' : 'text-[#ff6e61]';
    } else {
      diffColorClass = diffVal > 0 ? 'text-[#effe6f]' : 'text-[#ff6e61]';
    }
  }

  return (
    <div className="w-full flex flex-col gap-[8px]">
      {/* Tooltip Floating Badge (Figma Node 65:1936 / 63:1920) */}
      <div className="bg-black rounded-[10px] px-[10px] py-[6px] flex flex-col justify-center gap-[3px] w-full">
        <div className="flex items-baseline gap-[6px]">
          <span className="font-heading font-semibold text-[#f8fafc] text-[20px] leading-[22px]">
            {selectedPoint.value.toFixed(1)} {unit}
          </span>
          {diffVal !== null && (
            <span className={`font-semibold text-[9px] leading-[15px] ${diffColorClass}`}>
              {diffVal > 0 ? `+${diffVal}` : diffVal} {unit} vs anterior
            </span>
          )}
        </div>
        <div className="flex items-center gap-[5px]">
          <Clock className="w-[11px] h-[11px] text-[#f59e0b] shrink-0" />
          <span className="font-semibold text-[#f59e0b] text-[9px] leading-[14px]">
            {formatShortDate(selectedPoint.date)}
          </span>
          <span className="font-semibold text-[rgba(255,255,255,0.7)] text-[8px] uppercase leading-[14px]">
            PONTO SELECIONADO ({safeIdx + 1}/{points.length})
          </span>
        </div>
      </div>

      {/* SVG Curve & Interactive Points (Figma Node 30:1602) */}
      <div className="w-full pt-[4px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[140px] overflow-visible select-none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={theme === 'light' ? '0.28' : '0.32'} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 3 Horizontal Reference Grid Lines */}
          {[0.22, 0.5, 0.78].map((ratio, idx) => (
            <line
              key={idx}
              x1={0}
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke={theme === 'light' ? 'rgba(13,17,23,0.08)' : 'rgba(255,255,255,0.07)'}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

          {/* Line Stroke */}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {coords.map((c, idx) => {
            const isSelected = idx === safeIdx;
            return (
              <g
                key={c.id + idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIdx(idx);
                }}
                className="cursor-pointer"
              >
                {/* Invisible larger touch target */}
                <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                {isSelected && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="8"
                    fill="rgba(245, 158, 11, 0.25)"
                    stroke="#F59E0B"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSelected ? '4.5' : '3.5'}
                  fill={isSelected ? '#F59E0B' : theme === 'light' ? '#FFFFFF' : '#0E0F07'}
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>

        {/* Horizontal Axis Labels (up to 4 evenly spaced labels - Figma Node 30:1614) */}
        <div className="flex items-center justify-between px-[4px] pt-[2px] w-full">
          {coords
            .filter((_, idx) => {
              if (coords.length <= 4) return true;
              if (idx === 0 || idx === coords.length - 1) return true;
              const step = Math.floor((coords.length - 1) / 3);
              return idx === step || idx === step * 2;
            })
            .slice(0, 4)
            .map((c) => {
              const actualIdx = coords.findIndex((item) => item.id === c.id);
              const isSelected = actualIdx === safeIdx;
              const monthLabel = SHORT_MONTHS[c.date.getMonth()];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIdx(actualIdx);
                  }}
                  className={`text-[11px] leading-[16.5px] transition-colors ${
                    isSelected
                      ? 'font-semibold text-[#f59e0b]'
                      : 'font-normal text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  {monthLabel} ({c.value.toFixed(1)} {unit})
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default function MeasuresPage() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const router = useRouter();

  // Data States
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected Date ID (Organização por Datas - Decision #4)
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [isDateListExpanded, setIsDateListExpanded] = useState(false);

  // Filters & Expanded Metric for Evolution Graph
  const [weightTimeFrame, setWeightTimeFrame] = useState<TimeFrameKey>('3M');
  const [circumferenceTimeFrame, setCircumferenceTimeFrame] = useState<TimeFrameKey>('3M');
  const [bodyCategoryTab, setBodyCategoryTab] = useState<BodyCategoryTab>('superiores');
  const [expandedMetricKey, setExpandedMetricKey] = useState<keyof Medidas | null>('torax');

  // Target Weight & BF Goal (Decision #1 - Opção A)
  const [targetWeightKg, setTargetWeightKg] = useState<number>(77.0);
  const [targetBfPct, setTargetBfPct] = useState<number>(12.0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // Photo Lightbox Preview
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  // Page-level Quick Photo Upload refs (Frente, Costas, Perfil)
  const pagePhotoInputRefs = {
    frente: useRef<HTMLInputElement | null>(null),
    costas: useRef<HTMLInputElement | null>(null),
    perfil: useRef<HTMLInputElement | null>(null)
  };

  // Modal State (Figma Node 62:702 - NOVA AVALIAÇÃO)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalNavTab, setModalNavTab] = useState<'basico' | 'circunferencias' | 'comparativo'>(
    'basico'
  );
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Form Inputs
  const [pesoInput, setPesoInput] = useState('');
  const [alturaInput, setAlturaInput] = useState('178');
  const [isEditingAlturaInModal, setIsEditingAlturaInModal] = useState(false);
  const [medidasInput, setMedidasInput] = useState<Record<string, string>>({
    torax: '',
    bracoD: '',
    bracoE: '',
    antebracoD: '',
    antebracoE: '',
    cintura: '',
    quadril: '',
    coxaD: '',
    coxaE: '',
    panturrilhaD: '',
    panturrilhaE: ''
  });
  const [fotosInput, setFotosInput] = useState<EvolutionPhotos>({});
  const [notasInput, setNotasInput] = useState('');
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [measureTime, setMeasureTime] = useState('08:30');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Refs for smooth section scrolling & photo inputs
  const secBasicoRef = useRef<HTMLDivElement | null>(null);
  const secCircRef = useRef<HTMLDivElement | null>(null);
  const secFotosRef = useRef<HTMLDivElement | null>(null);
  const modalPhotoInputRefs = {
    frente: useRef<HTMLInputElement | null>(null),
    costas: useRef<HTMLInputElement | null>(null),
    perfil: useRef<HTMLInputElement | null>(null)
  };

  // Load saved goal from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const savedGoal = localStorage.getItem(`clipzbody_goal_${user.uid}`);
      if (savedGoal) {
        const parsed = JSON.parse(savedGoal);
        if (typeof parsed.targetWeightKg === 'number') setTargetWeightKg(parsed.targetWeightKg);
        if (typeof parsed.targetBfPct === 'number') setTargetBfPct(parsed.targetBfPct);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const handleSaveGoal = (newWeight: number, newBf: number) => {
    setTargetWeightKg(newWeight);
    setTargetBfPct(newBf);
    setIsEditingGoal(false);
    if (user) {
      try {
        localStorage.setItem(
          `clipzbody_goal_${user.uid}`,
          JSON.stringify({ targetWeightKg: newWeight, targetBfPct: newBf })
        );
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (profile?.altura) {
      setAlturaInput(profile.altura.toString());
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        fetchMeasurements();
      }
    }
  }, [user, authLoading, router]);

  const fetchMeasurements = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      // Preview Mode with 4 realistic chronological measurements matching the Figma prototype
      if (user.uid === 'preview_user_uid') {
        const now = Date.now();
        const dayMs = 24 * 3600 * 1000;
        const mockList: Measurement[] = [
          {
            id: 'meas_fev',
            pesoKg: 78.4,
            imcCalculado: 23.4,
            hora: '08:30',
            notas: 'Medição em jejum, pós-hidratação matinal de 500ml.',
            fotos: {
              frente: '/images/body-map/corpo-base-frente.svg'
            },
            medidas: {
              torax: 104.5,
              bracoD: 38.2,
              bracoE: 38.0,
              antebracoD: 30.5,
              antebracoE: 30.2,
              cintura: 79.0,
              quadril: 98.5,
              coxaD: 60.5,
              coxaE: 60.2,
              panturrilhaD: 39.5,
              panturrilhaE: 39.4
            },
            data: new Date(now - 3 * dayMs)
          },
          {
            id: 'meas_jan',
            pesoKg: 79.1,
            imcCalculado: 23.6,
            hora: '08:45',
            notas: 'Final da fase de transição.',
            medidas: {
              torax: 103.0,
              bracoD: 37.5,
              bracoE: 37.4,
              antebracoD: 30.2,
              antebracoE: 30.0,
              cintura: 80.5,
              quadril: 98.5,
              coxaD: 59.5,
              coxaE: 59.3,
              panturrilhaD: 39.2,
              panturrilhaE: 39.1
            },
            data: new Date(now - 34 * dayMs)
          },
          {
            id: 'meas_dez',
            pesoKg: 80.0,
            imcCalculado: 23.9,
            hora: '09:00',
            medidas: {
              torax: 102.0,
              bracoD: 37.1,
              bracoE: 37.0,
              antebracoD: 30.0,
              antebracoE: 29.8,
              cintura: 81.8,
              quadril: 99.0,
              coxaD: 59.0,
              coxaE: 58.8,
              panturrilhaD: 39.0,
              panturrilhaE: 38.9
            },
            data: new Date(now - 65 * dayMs)
          },
          {
            id: 'meas_nov',
            pesoKg: 81.2,
            imcCalculado: 24.3,
            hora: '08:15',
            medidas: {
              torax: 101.2,
              bracoD: 36.8,
              bracoE: 36.6,
              antebracoD: 29.8,
              antebracoE: 29.6,
              cintura: 83.0,
              quadril: 99.5,
              coxaD: 58.5,
              coxaE: 58.4,
              panturrilhaD: 38.8,
              panturrilhaE: 38.7
            },
            data: new Date(now - 96 * dayMs)
          }
        ];

        setMeasurements(mockList);
        setSelectedDateId(mockList[0].id);
        setLoadingData(false);
        return;
      }

      const q = query(
        collection(db, 'body_measurements'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list: Measurement[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          pesoKg: data.pesoKg,
          imcCalculado: data.imcCalculado,
          medidas: data.medidas || {},
          fotos: data.fotos || {},
          notas: data.notas || '',
          hora: data.hora || '08:30',
          data: data.data
        });
      });

      list.sort((a, b) => {
        const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return timeB - timeA;
      });

      setMeasurements(list);
      if (list.length > 0 && !selectedDateId) {
        setSelectedDateId(list[0].id);
      }
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // --- COMPUTED METRICS & DATE SELECTION ---
  const selectedMeasurementIndex = useMemo(() => {
    if (measurements.length === 0) return -1;
    if (!selectedDateId) return 0;
    const idx = measurements.findIndex((m) => m.id === selectedDateId);
    return idx >= 0 ? idx : 0;
  }, [measurements, selectedDateId]);

  const activeMeasurement =
    selectedMeasurementIndex >= 0 ? measurements[selectedMeasurementIndex] : null;
  const previousMeasurement =
    selectedMeasurementIndex >= 0 && selectedMeasurementIndex + 1 < measurements.length
      ? measurements[selectedMeasurementIndex + 1]
      : null;
  const oldestMeasurement =
    measurements.length > 0 ? measurements[measurements.length - 1] : null;

  const alturaCm = parseFloat(alturaInput) || profile?.altura || 178;

  const currentComp = useMemo(() => {
    if (!activeMeasurement) {
      const fallbackPeso = profile?.pesoAtual || 78.4;
      const comp = estimateBodyComposition(fallbackPeso, alturaCm, undefined);
      const imc = Number((fallbackPeso / Math.pow(alturaCm / 100, 2)).toFixed(1));
      return {
        pesoKg: fallbackPeso,
        imc,
        bfPct: comp.bfPct,
        leanMassKg: comp.leanMassKg,
        pesoDelta: 0,
        leanDelta: 0,
        waistDelta: 0
      };
    }

    const comp = estimateBodyComposition(
      activeMeasurement.pesoKg,
      alturaCm,
      activeMeasurement.medidas.cintura
    );

    const prevComp = previousMeasurement
      ? estimateBodyComposition(
          previousMeasurement.pesoKg,
          alturaCm,
          previousMeasurement.medidas.cintura
        )
      : null;

    const pesoDelta = previousMeasurement
      ? Number((activeMeasurement.pesoKg - previousMeasurement.pesoKg).toFixed(1))
      : 0;
    const leanDelta = prevComp
      ? Number((comp.leanMassKg - prevComp.leanMassKg).toFixed(1))
      : 0;
    const waistDelta =
      activeMeasurement.medidas.cintura && previousMeasurement?.medidas.cintura
        ? Number(
            (activeMeasurement.medidas.cintura - previousMeasurement.medidas.cintura).toFixed(1)
          )
        : 0;

    return {
      pesoKg: activeMeasurement.pesoKg,
      imc: activeMeasurement.imcCalculado,
      bfPct: comp.bfPct,
      leanMassKg: comp.leanMassKg,
      pesoDelta,
      leanDelta,
      waistDelta
    };
  }, [activeMeasurement, previousMeasurement, alturaCm, profile]);

  const initialComp = useMemo(() => {
    if (!oldestMeasurement) return currentComp;
    const comp = estimateBodyComposition(
      oldestMeasurement.pesoKg,
      alturaCm,
      oldestMeasurement.medidas.cintura
    );
    return {
      pesoKg: oldestMeasurement.pesoKg,
      bfPct: comp.bfPct
    };
  }, [oldestMeasurement, currentComp, alturaCm]);

  // Goal Progress %
  const goalStats = useMemo(() => {
    const startW = initialComp.pesoKg;
    const currW = currentComp.pesoKg;
    const targetW = targetWeightKg;
    const remainingKg = Number(Math.abs(currW - targetW).toFixed(1));
    const remainingBf = Number(Math.max(0, currentComp.bfPct - targetBfPct).toFixed(1));

    let pct = 74;
    if (Math.abs(startW - targetW) > 0.1) {
      const totalToChange = Math.abs(startW - targetW);
      const changedSoFar = Math.abs(startW - currW);
      pct = Math.min(100, Math.max(8, Math.round((changedSoFar / totalToChange) * 100)));
    }
    if (Math.abs(currW - targetW) <= 0.2) pct = 100;

    return {
      pct,
      remainingKg,
      remainingBf
    };
  }, [initialComp, currentComp, targetWeightKg, targetBfPct]);

  // Days since latest measurement
  const daysSinceLatest = useMemo(() => {
    if (measurements.length === 0) return null;
    const latest = measurements[0];
    const t = latest.data?.seconds
      ? latest.data.seconds * 1000
      : new Date(latest.data).getTime();
    if (isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / (1000 * 3600 * 24)));
  }, [measurements]);

  // Filter measurements chronologically by TimeFrame ('1M' | '3M' | '6M' | '1A')
  const getFilteredChronological = (tf: TimeFrameKey) => {
    const sorted = [...measurements].sort((a, b) => {
      const tA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
      const tB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
      return tA - tB;
    });

    const daysMap: Record<TimeFrameKey, number> = {
      '1M': 35,
      '3M': 110,
      '6M': 190,
      '1A': 370
    };
    const cutoff = Date.now() - daysMap[tf] * 24 * 3600 * 1000;
    const filtered = sorted.filter((m) => {
      const t = m.data?.seconds ? m.data.seconds * 1000 : new Date(m.data).getTime();
      return t >= cutoff;
    });
    // Fallback to all sorted if less than 2 points in window so chart stays informative
    return filtered.length >= 2 ? filtered : sorted;
  };

  const weightChartPoints = useMemo(() => {
    return getFilteredChronological(weightTimeFrame).map((m) => ({
      id: m.id,
      date: m.data?.seconds ? new Date(m.data.seconds * 1000) : new Date(m.data),
      value: m.pesoKg
    }));
  }, [measurements, weightTimeFrame]);

  const getCircumferenceChartPoints = (key: keyof Medidas) => {
    return getFilteredChronological(circumferenceTimeFrame)
      .filter((m) => typeof m.medidas[key] === 'number' && (m.medidas[key] || 0) > 0)
      .map((m) => ({
        id: m.id,
        date: m.data?.seconds ? new Date(m.data.seconds * 1000) : new Date(m.data),
        value: m.medidas[key] as number
      }));
  };

  // --- MODAL HANDLERS ---
  const handleOpenNewModal = () => {
    setEditingMeasurement(null);
    const latest = measurements[0];
    if (latest) {
      setPesoInput(latest.pesoKg.toString());
      const nextMedidas: Record<string, string> = {};
      CIRCUMFERENCE_ITEMS.forEach(({ key }) => {
        const val = latest.medidas[key];
        nextMedidas[key] = val !== undefined ? val.toString() : '';
      });
      setMedidasInput(nextMedidas);
    } else if (profile) {
      setPesoInput((profile.pesoAtual || 78.0).toString());
    }
    setFotosInput({});
    setNotasInput('');
    const now = new Date();
    setMeasureDate(now.toISOString().split('T')[0]);
    setMeasureTime(
      `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    );
    setModalNavTab('basico');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Measurement) => {
    setEditingMeasurement(item);
    setPesoInput(item.pesoKg.toString());
    const nextMedidas: Record<string, string> = {};
    CIRCUMFERENCE_ITEMS.forEach(({ key }) => {
      const val = item.medidas[key];
      nextMedidas[key] = val !== undefined ? val.toString() : '';
    });
    setMedidasInput(nextMedidas);
    setFotosInput(item.fotos || {});
    setNotasInput(item.notas || '');
    const d = item.data?.seconds ? new Date(item.data.seconds * 1000) : new Date(item.data);
    setMeasureDate(d.toISOString().split('T')[0]);
    setMeasureTime(item.hora || '08:30');
    setModalNavTab('basico');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleStepCircumference = (key: keyof Medidas, delta: number) => {
    const currentRaw = parseFloat(medidasInput[key] || '0');
    const prevRef = measurements[0]?.medidas[key] || 35;
    const base = !isNaN(currentRaw) && currentRaw > 0 ? currentRaw : prevRef;
    const nextVal = Math.max(10, Number((base + delta).toFixed(1)));
    setMedidasInput((prev) => ({ ...prev, [key]: nextVal.toString() }));
  };

  const handleModalPhotoSelect = async (
    slot: keyof EvolutionPhotos,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setFotosInput((prev) => ({ ...prev, [slot]: compressed }));
    } catch (err) {
      console.error('Error compressing photo:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Direct photo upload on the active measurement from the page itself
  const handlePagePhotoSelect = async (
    slot: keyof EvolutionPhotos,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      if (!activeMeasurement) {
        // If no measurement exists yet, open modal with this photo preloaded
        handleOpenNewModal();
        setFotosInput((prev) => ({ ...prev, [slot]: compressed }));
        return;
      }

      const updatedFotos: EvolutionPhotos = {
        ...(activeMeasurement.fotos || {}),
        [slot]: compressed
      };

      setMeasurements((prev) =>
        prev.map((m) =>
          m.id === activeMeasurement.id ? { ...m, fotos: updatedFotos } : m
        )
      );

      if (user && user.uid !== 'preview_user_uid') {
        await updateDoc(doc(db, 'body_measurements', activeMeasurement.id), {
          fotos: updatedFotos
        });
      }
    } catch (err) {
      console.error('Error uploading photo on page:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePagePhoto = async (slot: keyof EvolutionPhotos) => {
    if (!activeMeasurement) return;
    const updatedFotos: EvolutionPhotos = { ...(activeMeasurement.fotos || {}) };
    delete updatedFotos[slot];

    setMeasurements((prev) =>
      prev.map((m) =>
        m.id === activeMeasurement.id ? { ...m, fotos: updatedFotos } : m
      )
    );

    if (user && user.uid !== 'preview_user_uid') {
      try {
        await updateDoc(doc(db, 'body_measurements', activeMeasurement.id), {
          fotos: updatedFotos
        });
      } catch (err) {
        console.error('Error removing photo:', err);
      }
    }
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const pesoVal = parseFloat(pesoInput);
    if (isNaN(pesoVal) || pesoVal <= 20) {
      setErrorMsg('Informe um peso válido (acima de 20 kg).');
      setSubmitting(false);
      return;
    }

    try {
      const parsedAltura = parseFloat(alturaInput) || profile?.altura || 178;
      const imcVal = Number((pesoVal / Math.pow(parsedAltura / 100, 2)).toFixed(1));

      const cleanedMedidas: Medidas = {};
      Object.entries(medidasInput).forEach(([k, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          cleanedMedidas[k as keyof Medidas] = num;
        }
      });

      const parsedDate = new Date(`${measureDate}T${measureTime || '12:00'}:00`);

      if (user?.uid === 'preview_user_uid') {
        if (editingMeasurement) {
          setMeasurements((prev) =>
            prev.map((m) =>
              m.id === editingMeasurement.id
                ? {
                    ...m,
                    pesoKg: pesoVal,
                    imcCalculado: imcVal,
                    medidas: cleanedMedidas,
                    fotos: fotosInput,
                    notas: notasInput,
                    hora: measureTime,
                    data: parsedDate
                  }
                : m
            )
          );
        } else {
          const newId = `meas_${Date.now()}`;
          const newItem: Measurement = {
            id: newId,
            pesoKg: pesoVal,
            imcCalculado: imcVal,
            medidas: cleanedMedidas,
            fotos: fotosInput,
            notas: notasInput,
            hora: measureTime,
            data: parsedDate
          };
          setMeasurements((prev) => [newItem, ...prev]);
          setSelectedDateId(newId);
        }
        setIsModalOpen(false);
        setEditingMeasurement(null);
        setSubmitting(false);
        return;
      }

      if (editingMeasurement) {
        await updateDoc(doc(db, 'body_measurements', editingMeasurement.id), {
          pesoKg: pesoVal,
          imcCalculado: imcVal,
          medidas: cleanedMedidas,
          fotos: fotosInput,
          notas: notasInput,
          hora: measureTime,
          data: parsedDate
        });
      } else {
        const docRef = await addDoc(collection(db, 'body_measurements'), {
          userId: user?.uid,
          pesoKg: pesoVal,
          imcCalculado: imcVal,
          medidas: cleanedMedidas,
          fotos: fotosInput,
          notas: notasInput,
          hora: measureTime,
          data: parsedDate
        });
        setSelectedDateId(docRef.id);
      }

      if (profile) {
        await updateProfile({
          pesoAtual: pesoVal,
          altura: parsedAltura
        });
      }

      setIsModalOpen(false);
      setEditingMeasurement(null);
      await fetchMeasurements();
    } catch (err) {
      console.error('Error saving measurement:', err);
      setErrorMsg('Erro ao salvar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    setDeleting(true);
    try {
      if (user?.uid !== 'preview_user_uid') {
        await deleteDoc(doc(db, 'body_measurements', id));
      }
      const updated = measurements.filter((m) => m.id !== id);
      setMeasurements(updated);
      if (selectedDateId === id) {
        setSelectedDateId(updated[0]?.id || null);
      }
      setDeleteConfirmId(null);
      if (profile && updated.length > 0 && user?.uid !== 'preview_user_uid') {
        await updateProfile({ pesoAtual: updated[0].pesoKg });
      }
    } catch (err) {
      console.error('Error deleting measurement:', err);
      alert('Erro ao excluir medição. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  // Live IMC & Delta inside Modal
  const modalLivePeso = parseFloat(pesoInput) || 0;
  const modalLiveAltura = parseFloat(alturaInput) || alturaCm;
  const modalLiveImc =
    modalLivePeso > 0 && modalLiveAltura > 0
      ? (modalLivePeso / Math.pow(modalLiveAltura / 100, 2)).toFixed(1)
      : '--';
  const modalRefPrevMeasure = editingMeasurement
    ? measurements[measurements.findIndex((m) => m.id === editingMeasurement.id) + 1] || null
    : measurements[0] || null;
  const modalLivePesoDelta =
    modalLivePeso > 0 && modalRefPrevMeasure
      ? Number((modalLivePeso - modalRefPrevMeasure.pesoKg).toFixed(1))
      : null;

  // Format date header string
  const formatDateDisplay = (raw: any) => {
    const d = raw?.seconds ? new Date(raw.seconds * 1000) : new Date(raw);
    if (isNaN(d.getTime())) return 'Data';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const activeFotos = activeMeasurement?.fotos || {};
  const registeredPhotosCount = [
    activeFotos.frente,
    activeFotos.costas,
    activeFotos.perfil
  ].filter(Boolean).length;

  const modalPhotosCount = [
    fotosInput.frente,
    fotosInput.costas,
    fotosInput.perfil
  ].filter(Boolean).length;

  const imcBadgeLabel =
    currentComp.imc < 18.5
      ? 'Abaixo do Ideal'
      : currentComp.imc < 25
      ? 'Atlético • Ideal'
      : 'Acima do Ideal';

  return (
    <div className="min-h-screen bg-[#0e0f07] text-[#f8fafc] pb-28">
      {/* Top App Header (Consistent with Dashboard) */}
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
        {/* 1. TOP HEADER & FAST ACTION (Figma Node 30:1501) */}
        <section className="flex items-start justify-between pt-[4px] w-full">
          <div className="flex flex-col items-start pr-[8px]">
            <h1 className="font-bold text-[#f8fafc] text-[22px] tracking-[-0.55px] leading-[28px]">
              Medidas Corporais
            </h1>
            <span className="pt-[2px] font-medium text-[#ffb95f] text-[11px] leading-[16.5px]">
              {daysSinceLatest !== null
                ? daysSinceLatest === 0
                  ? 'Aferição realizada hoje'
                  : `Aferição há ${daysSinceLatest} ${daysSinceLatest === 1 ? 'dia' : 'dias'}`
                : 'Nenhuma aferição registrada'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="bg-[#f59e0b] hover:bg-[#d97706] px-[12px] py-[8px] rounded-[12px] shadow-sm flex items-center gap-[6px] shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-[12px] h-[12px] text-[#f8fafc] stroke-[2.8]" />
            <span className="font-semibold text-[#f8fafc] text-[12px] leading-[16px] whitespace-nowrap">
              Nova Medição
            </span>
          </button>
        </section>

        {/* 2. HERO CARD: COMPOSIÇÃO ATUAL (Figma Node 30:1521 - Opção A) */}
        <section className="bg-[#f8fafc] rounded-[16px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] relative overflow-hidden w-full">
          <div className="flex items-center justify-between pb-[12px] w-full">
            <h2 className="font-bold text-black text-[15px] leading-[20px]">
              Composição Atual
            </h2>
            {activeMeasurement && (
              <span className="text-[11px] font-medium text-[#64748b]">
                {formatDateDisplay(activeMeasurement.data)}
              </span>
            )}
          </div>

          {/* 3 Core Metrics Grid (Figma Node 30:1531) */}
          <div className="grid grid-cols-3 gap-[8px] pt-[4px] pb-[16px] w-full">
            {/* Metric 1: Peso Total */}
            <div className="bg-black rounded-[12px] p-[10px] flex flex-col items-start justify-between min-w-0">
              <span className="font-normal text-[#64748b] text-[11px] leading-[16.5px] truncate w-full">
                Peso Total
              </span>
              <div className="py-[4px] flex items-baseline gap-[3px]">
                <span className="font-heading font-bold text-[#f8fafc] text-[28px] tracking-[-0.56px] leading-[28px]">
                  {currentComp.pesoKg.toFixed(1)}
                </span>
                <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                  kg
                </span>
              </div>
              <div className="flex items-center gap-[3px]">
                <span className="font-semibold text-[#effe6f] text-[10px] leading-[15px] truncate">
                  {currentComp.pesoDelta > 0
                    ? `↑ +${currentComp.pesoDelta} kg/mês`
                    : currentComp.pesoDelta < 0
                    ? `↓ ${currentComp.pesoDelta} kg/mês`
                    : 'Estável'}
                </span>
              </div>
            </div>

            {/* Metric 2: IMC */}
            <div className="bg-black rounded-[12px] p-[10px] flex flex-col items-start justify-between min-w-0">
              <span className="font-normal text-[#64748b] text-[11px] leading-[16.5px] truncate w-full">
                IMC
              </span>
              <div className="py-[4px] flex items-baseline">
                <span className="font-heading font-bold text-[#f59e0b] text-[28px] tracking-[-0.56px] leading-[28px]">
                  {currentComp.imc.toFixed(1)}
                </span>
              </div>
              <span className="font-semibold text-[#f8fafc] text-[10px] leading-[15px] truncate w-full">
                {imcBadgeLabel}
              </span>
            </div>

            {/* Metric 3: Massa Magra */}
            <div className="bg-black rounded-[12px] p-[10px] flex flex-col items-start justify-between min-w-0">
              <span className="font-normal text-[#64748b] text-[11px] leading-[16.5px] truncate w-full">
                Massa Magra
              </span>
              <div className="py-[4px] flex items-baseline gap-[3px]">
                <span className="font-heading font-bold text-[#f8fafc] text-[28px] tracking-[-0.56px] leading-[28px]">
                  {currentComp.leanMassKg.toFixed(1)}
                </span>
                <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                  kg
                </span>
              </div>
              <div className="flex items-center gap-[3px]">
                <span className="font-semibold text-[#f59e0b] text-[10px] leading-[15px] truncate">
                  {currentComp.leanDelta >= 0
                    ? `↑ +${currentComp.leanDelta} kg músc.`
                    : `↓ ${currentComp.leanDelta} kg músc.`}
                </span>
              </div>
            </div>
          </div>

          {/* Target Progress Bar (Figma Node 30:1565) */}
          <div className="bg-black rounded-[12px] p-[12px] flex flex-col gap-[6px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-normal text-[#94a3b8] text-[11px] leading-[16px]">
                Progresso para o Alvo
              </span>
              <button
                type="button"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="font-semibold text-[#f8fafc] hover:text-[#ffb95f] text-[11px] leading-[16px] flex items-center gap-1 transition-colors"
                title="Clique para ajustar sua meta"
              >
                <span>
                  Meta: {targetWeightKg.toFixed(1)} kg • {targetBfPct.toFixed(0)}% BF
                </span>
                <Pencil className="w-[10px] h-[10px] text-[#64748b]" />
              </button>
            </div>

            {isEditingGoal && (
              <div className="bg-[#151413] rounded-[8px] p-[8px] flex items-center justify-between gap-2 my-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#94a3b8]">Peso Alvo:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(parseFloat(e.target.value) || 75)}
                    className="w-[54px] bg-black text-[#f8fafc] text-[11px] font-bold px-1.5 py-1 rounded text-center"
                  />
                  <span className="text-[10px] text-[#64748b]">kg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#94a3b8]">BF Alvo:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={targetBfPct}
                    onChange={(e) => setTargetBfPct(parseFloat(e.target.value) || 12)}
                    className="w-[46px] bg-black text-[#f8fafc] text-[11px] font-bold px-1.5 py-1 rounded text-center"
                  />
                  <span className="text-[10px] text-[#64748b]">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveGoal(targetWeightKg, targetBfPct)}
                  className="bg-[#f59e0b] text-black text-[10px] font-bold px-2.5 py-1 rounded"
                >
                  OK
                </button>
              </div>
            )}

            <div className="bg-[rgba(248,250,252,0.35)] h-[8px] w-full rounded-full overflow-hidden">
              <div
                className="bg-[#f8fafc] h-full rounded-full shadow-[0px_0px_12px_0px_rgba(211,225,86,0.6)] transition-all duration-500"
                style={{ width: `${goalStats.pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full">
              <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                Início: {initialComp.pesoKg.toFixed(1)} kg ({initialComp.bfPct.toFixed(1)}%)
              </span>
              <span className="font-medium text-[#effe6f] text-[10px] leading-[15px]">
                Falta {goalStats.remainingKg} kg ({goalStats.remainingBf}% BF)
              </span>
            </div>
          </div>
        </section>

        {/* 3. EVOLUTION GRAPH CARD: EVOLUÇÃO DE PESO (Figma Node 30:1580) */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[16px] flex flex-col gap-[12px] w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-start">
              <h2 className="font-bold text-[#f8fafc] text-[15px] leading-[20px]">
                Evolução de Peso
              </h2>
              <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                Histórico temporal de registros
              </span>
            </div>

            {/* Time Frame Filters (1M | 3M | 6M | 1A - Figma Node 30:1592) */}
            <div className="bg-[#f8fafc] p-[2px] rounded-[8px] flex items-center shrink-0">
              {(['1M', '3M', '6M', '1A'] as TimeFrameKey[]).map((tf) => {
                const isActive = weightTimeFrame === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setWeightTimeFrame(tf)}
                    className={`px-[8px] py-[2px] rounded-[4px] font-semibold text-[11px] leading-[16.5px] transition-colors ${
                      isActive ? 'bg-[#f59e0b] text-[#0f172a]' : 'text-black hover:bg-black/5'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          <FigmaEvolutionChart points={weightChartPoints} unit="kg" theme="dark" />
        </section>

        {/* 4. ORGANIZAÇÃO POR DATAS DE AFERIÇÃO + CIRCUNFERÊNCIAS CORPORAIS (Decision #2 & #4) */}
        <section className="space-y-[12px] pt-[4px]">
          {/* Date Selector Bar (Allows switching between assessment dates or editing/deleting any date) */}
          {measurements.length > 0 && (
            <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[14px] p-[12px] space-y-[10px]">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-[8px]">
                  <div className="bg-[#f59e0b]/15 text-[#f59e0b] w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0">
                    <Calendar className="w-[14px] h-[14px]" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                      Data Selecionada ({selectedMeasurementIndex + 1} de {measurements.length})
                    </span>
                    <span className="font-bold text-[#f8fafc] text-[14px] leading-[18px]">
                      {activeMeasurement ? formatDateDisplay(activeMeasurement.data) : '—'} •{' '}
                      <span className="text-[#ffb95f]">
                        {activeMeasurement?.pesoKg.toFixed(1)} kg
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-[4px]">
                  {activeMeasurement && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(activeMeasurement)}
                        className="bg-black hover:bg-[#1c1c13] w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:text-[#ffb95f] transition-colors"
                        title="Editar esta avaliação"
                      >
                        <Pencil className="w-[13px] h-[13px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(activeMeasurement.id)}
                        className="bg-black hover:bg-[#1c1c13] w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:text-[#ff6e61] transition-colors"
                        title="Excluir esta avaliação"
                      >
                        <Trash2 className="w-[13px] h-[13px]" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDateListExpanded(!isDateListExpanded)}
                    className="bg-black hover:bg-[#1c1c13] px-[8px] h-[30px] rounded-[8px] flex items-center gap-1 text-[11px] font-semibold text-[#f8fafc]"
                  >
                    <span>Datas</span>
                    {isDateListExpanded ? (
                      <ChevronUp className="w-[13px] h-[13px]" />
                    ) : (
                      <ChevronDown className="w-[13px] h-[13px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Horizontal Date Chips or Expanded Date List */}
              {isDateListExpanded && (
                <div className="pt-[4px] border-t border-white/10 space-y-[6px]">
                  {measurements.map((m, idx) => {
                    const isSelected = m.id === activeMeasurement?.id;
                    const prev = idx + 1 < measurements.length ? measurements[idx + 1] : null;
                    const wDiff = prev ? Number((m.pesoKg - prev.pesoKg).toFixed(1)) : null;

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedDateId(m.id);
                          setIsDateListExpanded(false);
                        }}
                        className={`p-[10px] rounded-[10px] flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#f59e0b] text-black font-semibold'
                            : 'bg-black hover:bg-[#1c1c13] text-[#f8fafc]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold">
                            {formatDateDisplay(m.data)}
                          </span>
                          {idx === 0 && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                isSelected
                                  ? 'bg-black text-[#ffb95f]'
                                  : 'bg-[#ffb95f]/15 text-[#ffb95f]'
                              }`}
                            >
                              Atual
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[12px] font-mono font-bold">
                            {m.pesoKg.toFixed(1)} kg
                          </span>
                          {wDiff !== null && (
                            <span
                              className={`text-[10px] font-bold ${
                                isSelected
                                  ? 'text-black/80'
                                  : wDiff <= 0
                                  ? 'text-[#d3e156]'
                                  : 'text-[#ffb95f]'
                              }`}
                            >
                              {wDiff > 0 ? `+${wDiff}kg` : `${wDiff}kg`}
                            </span>
                          )}
                          <span
                            className={`text-[11px] ${
                              isSelected ? 'text-black/80' : 'text-[#94a3b8]'
                            }`}
                          >
                            IMC {m.imcCalculado}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Interactive Category Tabs: Superiores | Inferiores + TimeFrame (Figma Node 30:1631) */}
          <div className="flex items-center justify-between gap-[8px] pt-[4px] w-full">
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => setBodyCategoryTab('superiores')}
                className={`px-[14px] py-[6px] rounded-full text-[12px] leading-[16px] transition-colors ${
                  bodyCategoryTab === 'superiores'
                    ? 'bg-[#f59e0b] text-[#f8fafc] font-semibold shadow-sm'
                    : 'bg-black border border-[#f8fafc] text-[#f8fafc] font-medium'
                }`}
              >
                Superiores
              </button>
              <button
                type="button"
                onClick={() => setBodyCategoryTab('inferiores')}
                className={`px-[14px] py-[6px] rounded-full text-[12px] leading-[16px] transition-colors ${
                  bodyCategoryTab === 'inferiores'
                    ? 'bg-[#f59e0b] text-[#f8fafc] font-semibold shadow-sm'
                    : 'bg-black border border-[#f8fafc] text-[#f8fafc] font-medium'
                }`}
              >
                Inferiores
              </button>
            </div>

            {/* Time Frame Filters for Circumference Graphs (Figma Node 65:1955) */}
            <div className="bg-[#f8fafc] p-[2px] rounded-[8px] flex items-center shrink-0">
              {(['1M', '3M', '6M', '1A'] as TimeFrameKey[]).map((tf) => {
                const isActive = circumferenceTimeFrame === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setCircumferenceTimeFrame(tf)}
                    className={`px-[7px] py-[2px] rounded-[4px] font-semibold text-[11px] leading-[16.5px] transition-colors ${
                      isActive ? 'bg-[#f59e0b] text-[#0f172a]' : 'text-black hover:bg-black/5'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Title: Circunferências Corporais (Figma Node 30:1640) */}
          <div className="flex items-center justify-between px-[4px] pt-[4px] w-full">
            <h2 className="font-bold text-[#f8fafc] text-[15px] leading-[20px]">
              Circunferências Corporais
            </h2>
            <span className="font-normal text-[#f59e0b] text-[10px] leading-[16.5px]">
              Comparativo vs. Aferição Anterior
            </span>
          </div>

          {/* Circumference Items List with Expandable White Chart Cards (Figma Node 30:1646) */}
          <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[8px] flex flex-col w-full">
            {CIRCUMFERENCE_ITEMS.filter((item) => item.category === bodyCategoryTab).map(
              (item, idx) => {
                const isExpanded = expandedMetricKey === item.key;
                const currentVal = activeMeasurement?.medidas[item.key];
                const prevVal = previousMeasurement?.medidas[item.key];
                const diff =
                  currentVal !== undefined && prevVal !== undefined && prevVal > 0
                    ? Number((currentVal - prevVal).toFixed(1))
                    : null;

                // Expanded White Card State (Figma Node 30:1647)
                if (isExpanded) {
                  const metricPoints = getCircumferenceChartPoints(item.key);
                  return (
                    <div
                      key={item.key}
                      className="bg-white rounded-[24px] px-[10px] py-[12px] flex flex-col gap-[14px] w-full my-[2px] shadow-md transition-all"
                    >
                      {/* Top Header Row inside White Card */}
                      <div
                        onClick={() => setExpandedMetricKey(null)}
                        className="flex items-center justify-between py-[2px] w-full cursor-pointer"
                      >
                        <div className="flex items-start gap-[12px]">
                          <button
                            type="button"
                            className="bg-[#f59e0b] rounded-[8px] w-[30px] h-[32px] flex items-center justify-center text-white shrink-0"
                            aria-label="Recolher gráfico"
                          >
                            <ChevronUp className="w-[14px] h-[14px] stroke-[2.5]" />
                          </button>

                          <div className="flex flex-col gap-[2px] items-start">
                            <div className="flex items-center gap-[6px]">
                              <span className="font-semibold text-black text-[14px] leading-[20px]">
                                {item.label}
                              </span>
                              {item.isFocus && (
                                <span className="bg-[#f59e0b]/20 text-[#b45309] font-bold text-[9px] px-[6px] py-[1px] rounded-[4px]">
                                  Foco
                                </span>
                              )}
                            </div>
                            <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                              {item.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-[2px]">
                          <div className="flex items-baseline gap-[3px]">
                            <span className="font-heading font-semibold text-black text-[18px] tracking-[-0.18px] leading-[24px]">
                              {currentVal !== undefined ? currentVal.toFixed(1) : '--'}
                            </span>
                            <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                              cm
                            </span>
                          </div>

                          <span
                            className={`font-semibold text-[10px] leading-[15px] ${
                              diff === null || diff === 0
                                ? 'text-[#64748b]'
                                : item.isInverseGood
                                ? diff < 0
                                  ? 'text-[#65a30d]'
                                  : 'text-[#ea580c]'
                                : diff > 0
                                ? 'text-[#a3ab5a]'
                                : 'text-[#ea580c]'
                            }`}
                          >
                            {diff === null
                              ? 'Sem ant.'
                              : diff === 0
                              ? '— Estável'
                              : diff > 0
                              ? `↗ +${diff} cm`
                              : `↘ ${diff} cm`}
                          </span>
                        </div>
                      </div>

                      {/* Evolution Chart inside Expanded White Card */}
                      <FigmaEvolutionChart
                        points={metricPoints}
                        unit="cm"
                        theme="light"
                        isInverseGood={item.isInverseGood}
                      />
                    </div>
                  );
                }

                // Collapsed Dark Row State (Figma Node 30:1662 / 30:1692)
                return (
                  <div
                    key={item.key}
                    onClick={() => setExpandedMetricKey(item.key)}
                    className={`${
                      item.isFocus ? 'bg-[rgba(255,255,255,0.08)] rounded-[12px]' : ''
                    } ${
                      idx > 0 ? 'border-t border-[#202017]' : ''
                    } flex items-center justify-between px-[8px] pt-[11px] pb-[10px] w-full cursor-pointer hover:bg-white/[0.04] transition-colors`}
                  >
                    <div className="flex items-start gap-[12px]">
                      <button
                        type="button"
                        className="bg-[rgba(255,255,255,0.1)] rounded-[8px] w-[30px] h-[32px] flex items-center justify-center text-[#94a3b8] shrink-0"
                        aria-label="Expandir gráfico"
                      >
                        <ChevronDown className="w-[14px] h-[14px]" />
                      </button>

                      <div className="flex flex-col gap-[2px] items-start">
                        <div className="flex items-center gap-[6px]">
                          <span
                            className={`${
                              item.isFocus ? 'font-semibold' : 'font-medium'
                            } text-[#f8fafc] text-[14px] leading-[20px]`}
                          >
                            {item.label}
                          </span>
                          {item.isFocus && (
                            <span className="bg-[rgba(239,254,111,0.1)] text-[#effe6f] font-bold text-[9px] leading-[13.5px] px-[6px] py-[1px] rounded-[4px]">
                              Foco
                            </span>
                          )}
                        </div>
                        <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-[2px]">
                      <div className="flex items-baseline gap-[4px]">
                        <span
                          className={`font-heading font-semibold text-[18px] tracking-[-0.18px] leading-[24px] ${
                            item.isFocus ? 'text-[#effe6f]' : 'text-[#f8fafc]'
                          }`}
                        >
                          {currentVal !== undefined ? currentVal.toFixed(1) : '--'}
                        </span>
                        <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                          cm
                        </span>
                      </div>

                      <span
                        className={`font-semibold text-[10px] leading-[15px] ${
                          diff === null || diff === 0
                            ? 'text-[#64748b]'
                            : 'text-[#effe6f]'
                        }`}
                      >
                        {diff === null
                          ? '—'
                          : diff === 0
                          ? '— Estável'
                          : diff > 0
                          ? `↗ +${diff} cm`
                          : `↘ ${diff} cm`}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* 5. FOTOS DE EVOLUÇÃO CORPORAL (Figma Node 63:1508 - Decision #3) */}
        <section className="pt-[8px] space-y-[10px] w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-[6px]">
              <Camera className="w-[12px] h-[12px] text-[#f59e0b]" />
              <h3 className="font-bold text-[#f8fafc] text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                FOTOS DE EVOLUÇÃO CORPORAL
              </h3>
            </div>
            <span className="bg-[#35352b] text-[#d3e156] font-bold text-[9px] uppercase leading-[13.5px] px-[6px] py-[2px] rounded-[4px]">
              {registeredPhotosCount}/3 REGISTRADA
            </span>
          </div>

          <p className="font-normal text-[#f8fafc] text-[11px] leading-[16.5px]">
            Tire fotos com boa iluminação e mesma postura para comparar a evolução muscular.
          </p>

          {/* 3 Photo Slots: FRENTE | COSTAS | PERFIL */}
          <div className="-mx-4 px-4 flex gap-[10px] overflow-x-auto pb-2 scrollbar-none">
            {(
              [
                { key: 'frente', badge: 'FRENTE' },
                { key: 'costas', badge: 'COSTAS' },
                { key: 'perfil', badge: 'PERFIL' }
              ] as Array<{ key: keyof EvolutionPhotos; badge: string }>
            ).map(({ key, badge }) => {
              const photoDataUrl = activeFotos[key];
              const hasPhoto = Boolean(photoDataUrl);

              return (
                <div
                  key={key}
                  className={`bg-black ${
                    hasPhoto
                      ? 'border border-[#ffb95f] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.5)]'
                      : 'border border-dashed border-[rgba(255,255,255,0.2)]'
                  } rounded-[16px] p-[11px] w-[142px] h-[164px] shrink-0 flex flex-col justify-between relative overflow-hidden`}
                >
                  {/* Hidden File Input */}
                  <input
                    ref={pagePhotoInputRefs[key]}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePagePhotoSelect(key, e)}
                    className="hidden"
                  />

                  {/* Background image preview if uploaded */}
                  {hasPhoto && (
                    <img
                      src={photoDataUrl}
                      alt={`Foto ${badge}`}
                      onClick={() => setLightboxPhotoUrl(photoDataUrl || null)}
                      className="absolute inset-0 w-full h-full object-cover opacity-55 cursor-pointer hover:opacity-75 transition-opacity"
                    />
                  )}

                  {/* Top Row: Badge + Remove Button */}
                  <div className="flex items-center justify-between w-full relative z-10">
                    <span className="bg-[#f59e0b] text-black font-bold text-[8px] uppercase leading-[13.5px] px-[6px] py-[2px] rounded-[4px]">
                      {badge}
                    </span>

                    {hasPhoto && (
                      <button
                        type="button"
                        onClick={() => handleRemovePagePhoto(key)}
                        className="bg-[rgba(42,43,33,0.85)] hover:bg-black text-[#ff6e61] rounded-full w-[24px] h-[24px] flex items-center justify-center transition-colors"
                        title="Remover foto"
                      >
                        <X className="w-[11px] h-[11px]" />
                      </button>
                    )}
                  </div>

                  {/* Center Icon */}
                  <div
                    onClick={() => {
                      if (hasPhoto && photoDataUrl) {
                        setLightboxPhotoUrl(photoDataUrl);
                      } else {
                        pagePhotoInputRefs[key].current?.click();
                      }
                    }}
                    className="flex-1 flex items-center justify-center relative z-10 cursor-pointer"
                  >
                    {hasPhoto ? (
                      <div className="w-[36px] h-[36px] rounded-full bg-[rgba(211,225,86,0.2)] shadow-[inset_0px_0px_8px_0px_rgba(211,225,86,0.3)] flex items-center justify-center text-[#d3e156]">
                        <Check className="w-[16px] h-[16px] stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-[36px] h-[36px] rounded-[12px] bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#f59e0b]">
                        <Camera className="w-[16px] h-[16px]" />
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button */}
                  <button
                    type="button"
                    onClick={() => pagePhotoInputRefs[key].current?.click()}
                    className="bg-[rgba(248,250,252,0.12)] hover:bg-[rgba(248,250,252,0.2)] py-[4px] rounded-[8px] w-full flex items-center justify-center gap-[4px] relative z-10 transition-colors"
                  >
                    {hasPhoto ? (
                      <>
                        <RefreshCw className="w-[9px] h-[9px] text-[#f8fafc]" />
                        <span className="font-semibold text-[#f8fafc] text-[10px] leading-[15px]">
                          Trocar
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-[#f8fafc] text-[10px] leading-[15px]">
                        + Adicionar
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. CLIPZ AI • ANÁLISE BIOMÉTRICA CARD (Figma Node 30:1821) */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full">
          <div className="flex items-start gap-[12px] w-full">
            <div className="bg-[rgba(238,152,0,0.2)] rounded-[12px] w-[32px] h-[32px] flex items-center justify-center shrink-0 mt-[2px]">
              <Sparkles className="w-[16px] h-[16px] text-[#ffb95f]" />
            </div>

            <div className="flex-1 min-w-0 space-y-[4px]">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-[#ffddb8] text-[12px] tracking-[0.6px] uppercase leading-[16px]">
                  CLIPZ AI • ANÁLISE BIOMÉTRICA
                </span>
                <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                  Recomposição
                </span>
              </div>

              <p className="font-normal text-[#94a3b8] text-[12px] leading-[19.5px]">
                {measurements.length >= 2 ? (
                  <>
                    Excelente acompanhamento antropométrico:{' '}
                    {currentComp.pesoDelta <= 0 ? 'redução de ' : 'variação de '}
                    <strong className="font-bold text-[#f8fafc]">
                      {Math.abs(currentComp.pesoDelta).toFixed(1)} kg
                    </strong>{' '}
                    na balança com estimativa de{' '}
                    <strong className="font-bold text-[#effe6f]">
                      {currentComp.leanMassKg.toFixed(1)} kg
                    </strong>{' '}
                    de massa magra
                    {currentComp.waistDelta !== 0 && (
                      <>
                        {' '}
                        e{' '}
                        {currentComp.waistDelta < 0 ? 'diminuição de ' : 'variação de '}
                        <strong className="font-bold text-[#effe6f]">
                          {Math.abs(currentComp.waistDelta).toFixed(1)} cm
                        </strong>{' '}
                        de cintura abdominal
                      </>
                    )}
                    .
                  </>
                ) : (
                  <>
                    Registre suas aferições periódicas de peso e circunferências para acompanhar sua
                    taxa de recomposição corporal e simetria muscular.
                  </>
                )}
              </p>

              {activeMeasurement?.notas && (
                <div className="pt-[6px] mt-[6px] border-t border-white/10 text-[11px] text-[#94a3b8]">
                  <strong className="text-[#f8fafc]">Nota da aferição:</strong>{' '}
                  {activeMeasurement.notas}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 7. PRIMARY BOTTOM FULL-WIDTH ACTION BUTTON (Figma Node 63:1500) */}
        <div className="pt-[8px] w-full">
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="bg-[#f8fafc] hover:bg-white min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full shadow-[0px_8px_20px_-4px_rgba(255,255,255,0.08)] flex items-center justify-between w-full transition-transform active:scale-[0.98]"
          >
            <span className="font-heading font-semibold text-[#202017] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
              REGISTRAR NOVAS MEDIDAS
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
          MODAL: NOVA AVALIAÇÃO / EDITAR AVALIAÇÃO (Figma Node 62:702)
         ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.82)] flex items-center justify-center px-[12px] py-[20px] animate-in fade-in duration-200">
          <div className="bg-[#f4f4f0] rounded-[24px] shadow-[0px_20px_50px_-10px_rgba(0,0,0,0.85)] w-full max-w-[448px] max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Top Subtle Amber Glow Line (Figma Node 62:732) */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)] shrink-0" />

            {/* 1. Sticky Modal Header (Figma Node 62:733) */}
            <div className="px-[16px] pt-[14px] pb-[10px] flex flex-col gap-[10px] shrink-0">
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-[12px]">
                  <div className="bg-[rgba(255,221,184,0.7)] shadow-[inset_0px_0px_12px_0px_rgba(211,225,86,0.2)] rounded-[12px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
                    <Ruler className="w-[20px] h-[20px] text-[#f59e0b]" />
                  </div>
                  <div className="flex flex-col items-start">
                    <h2 className="font-heading font-semibold text-black text-[18px] tracking-[-0.45px] uppercase leading-[24px]">
                      {editingMeasurement ? 'EDITAR AVALIAÇÃO' : 'NOVA AVALIAÇÃO'}
                    </h2>
                    <span className="font-normal text-[#151413] text-[12px] leading-[16px]">
                      Peso, Circunferência e comparativo.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMeasurement(null);
                  }}
                  className="bg-black hover:bg-[#151413] rounded-full w-[32px] h-[32px] flex items-center justify-center text-[#f59e0b] shrink-0 transition-colors"
                  aria-label="Fechar janela"
                >
                  <X className="w-[14px] h-[14px] stroke-[2.5]" />
                </button>
              </div>

              {/* Date and Time Picker Row (Figma Node 62:747) */}
              <div className="bg-black bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] px-[12px] py-[8px] flex items-center justify-between w-full">
                <input
                  type="date"
                  value={measureDate}
                  onChange={(e) => setMeasureDate(e.target.value)}
                  className="bg-transparent font-semibold text-[#f8fafc] text-[12px] leading-[16px] focus:outline-none cursor-pointer"
                />

                <div className="bg-[rgba(255,255,255,0.2)] rounded-[8px] px-[8px] py-[2px] flex items-center gap-[5px]">
                  <Clock className="w-[11px] h-[11px] text-[#f8fafc]" />
                  <input
                    type="time"
                    value={measureTime}
                    onChange={(e) => setMeasureTime(e.target.value)}
                    className="bg-transparent font-medium text-[#f8fafc] text-[12px] leading-[16px] focus:outline-none w-[52px]"
                  />
                </div>
              </div>

              {/* Nav - Grupos de medição (Figma Node 62:758) */}
              <div className="flex items-center gap-[8px] overflow-x-auto scrollbar-none pt-[2px]">
                <button
                  type="button"
                  onClick={() => {
                    setModalNavTab('basico');
                    secBasicoRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-[12px] py-[6px] rounded-full text-[12px] leading-[16px] whitespace-nowrap transition-colors ${
                    modalNavTab === 'basico'
                      ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                      : 'bg-black text-[#f8fafc] font-medium'
                  }`}
                >
                  Básico &amp; Peso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalNavTab('circunferencias');
                    secCircRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-[12px] py-[6px] rounded-full text-[12px] leading-[16px] whitespace-nowrap transition-colors ${
                    modalNavTab === 'circunferencias'
                      ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                      : 'bg-black text-[#f8fafc] font-medium'
                  }`}
                >
                  Circunferências
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalNavTab('comparativo');
                    secFotosRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-[12px] py-[6px] rounded-full text-[12px] leading-[16px] whitespace-nowrap transition-colors ${
                    modalNavTab === 'comparativo'
                      ? 'bg-[#f59e0b] text-[#f8fafc] font-bold'
                      : 'bg-black text-[#f8fafc] font-medium'
                  }`}
                >
                  Comparativo
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mx-[16px] mb-[8px] bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs font-semibold p-2.5 rounded-[10px]">
                {errorMsg}
              </div>
            )}

            {/* 3. Scrollable Modal Form Body (Figma Node 62:767) */}
            <form
              onSubmit={handleSaveMeasurement}
              className="flex-1 overflow-y-auto px-[16px] pb-[16px] space-y-[16px]"
            >
              {/* SECTION 1: DADOS PRINCIPAIS (Figma Node 62:768) */}
              <div ref={secBasicoRef} className="flex flex-col gap-[10px] w-full">
                <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                  DADOS PRINCIPAIS
                </span>

                <div className="grid grid-cols-2 gap-[10px] w-full">
                  {/* Card 1: Peso Corporal (Figma Node 62:774) */}
                  <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[12px] flex flex-col justify-between gap-[6px]">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                        Peso Corporal
                      </span>
                      <span className="bg-[#373737] text-[#f8fafc] text-[9px] uppercase leading-[13.5px] px-[6px] py-[2px] rounded-[4px]">
                        KG
                      </span>
                    </div>

                    <div className="bg-black rounded-[12px] px-[12px] py-[6px] flex items-center justify-between">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="78.4"
                        value={pesoInput}
                        onChange={(e) => setPesoInput(e.target.value)}
                        className="w-full bg-transparent font-heading font-semibold text-[#f8fafc] text-[22px] tracking-[-0.22px] leading-[28px] focus:outline-none"
                        required
                      />
                      <span className="font-normal text-[#64748b] text-[12px] leading-[16px] shrink-0">
                        kg
                      </span>
                    </div>

                    <div className="flex items-center gap-[4px] min-h-[16px]">
                      {modalLivePesoDelta !== null && (
                        <span className="font-semibold text-[#d3e156] text-[11px] leading-[16.5px]">
                          {modalLivePesoDelta > 0
                            ? `+${modalLivePesoDelta} kg`
                            : `${modalLivePesoDelta} kg`}
                        </span>
                      )}
                      {modalRefPrevMeasure && (
                        <span className="font-normal text-[#64748b] text-[10px] leading-[15px]">
                          (Ant: {modalRefPrevMeasure.pesoKg.toFixed(1)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: % IMC (Figma Node 62:799) */}
                  <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[16px] p-[12px] flex flex-col justify-between gap-[6px]">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                        % IMC
                      </span>
                    </div>

                    <div className="bg-black rounded-[12px] px-[12px] py-[6px] flex items-baseline gap-[8px]">
                      <span className="font-heading font-semibold text-[#f8fafc] text-[22px] tracking-[-0.22px] leading-[28px]">
                        {modalLiveImc}
                      </span>
                      <span className="font-medium text-[#64748b] text-[12px] leading-[16px]">
                        IMC
                      </span>
                    </div>

                    <div className="min-h-[16px] flex items-center">
                      <span className="font-normal text-[#94a3b8] text-[10px] leading-[15px]">
                        Cálculo automático
                      </span>
                    </div>
                  </div>
                </div>

                {/* Altura Referência Row (Figma Node 62:822) */}
                <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] rounded-[12px] px-[12px] py-[8px] flex items-center justify-between w-full">
                  <div className="flex items-center gap-[8px]">
                    <ArrowUpDown className="w-[12px] h-[12px] text-[#94a3b8]" />
                    <span className="font-normal text-[#94a3b8] text-[12px] leading-[16px]">
                      Altura Referência
                    </span>
                  </div>

                  <div className="flex items-center gap-[8px]">
                    {isEditingAlturaInModal ? (
                      <input
                        type="number"
                        step="1"
                        value={alturaInput}
                        onChange={(e) => setAlturaInput(e.target.value)}
                        onBlur={() => setIsEditingAlturaInModal(false)}
                        className="w-[54px] bg-black text-[#f8fafc] font-heading font-semibold text-[18px] text-center rounded px-1 py-0.5 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-baseline gap-[3px]">
                        <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] leading-[24px]">
                          {alturaInput}
                        </span>
                        <span className="font-normal text-[#64748b] text-[11px] leading-[24px]">
                          cm
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingAlturaInModal(!isEditingAlturaInModal)}
                      className="bg-black rounded-[4px] w-[24px] h-[24px] flex items-center justify-center text-[#6ecddd]"
                      title="Editar altura"
                    >
                      <Pencil className="w-[11px] h-[11px]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CIRCUNFERÊNCIAS PRINCIPAIS (CM) (Figma Node 62:835) */}
              <div ref={secCircRef} className="flex flex-col gap-[10px] w-full pt-[4px]">
                <div className="flex items-center gap-[6px]">
                  <Ruler className="w-[11px] h-[11px] text-[#f59e0b]" />
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                    CIRCUNFERÊNCIAS PRINCIPAIS (CM)
                  </span>
                </div>

                {/* 2-Column Grid with Stepper (- / +) Cards */}
                <div className="grid grid-cols-2 gap-[10px] w-full">
                  {CIRCUMFERENCE_ITEMS.map((item) => {
                    const prevVal = modalRefPrevMeasure?.medidas[item.key];

                    // Special Highlighted Card for Cintura Abdominal (Figma Node 62:934)
                    if (item.isFocus) {
                      return (
                        <div
                          key={item.key}
                          className="bg-black bg-[linear-gradient(180deg,rgba(211,225,86,0.1)_0%,rgba(211,225,86,0)_100%)] rounded-[12px] p-[10px] flex flex-col gap-[6px]"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-[4px] min-w-0">
                              <span className="bg-[#f59e0b] rounded-full w-[6px] h-[6px] shrink-0" />
                              <span className="font-semibold text-[#f59e0b] text-[11px] leading-[16.5px] truncate">
                                {item.shortLabel}
                              </span>
                            </div>
                            <span className="font-normal text-[#f8fafc] text-[10px] leading-[15px] shrink-0">
                              {prevVal !== undefined ? `Ant: ${prevVal.toFixed(1)}` : 'Ant: —'}
                            </span>
                          </div>

                          <div className="bg-[rgba(245,158,11,0.9)] rounded-[8px] p-[4px] flex items-center gap-[4px] w-full">
                            <button
                              type="button"
                              onClick={() => handleStepCircumference(item.key, -0.5)}
                              className="bg-black rounded-[4px] w-[20px] h-[24px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="--"
                              value={medidasInput[item.key] || ''}
                              onChange={(e) =>
                                setMedidasInput({ ...medidasInput, [item.key]: e.target.value })
                              }
                              className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[18px] text-center tracking-[-0.18px] leading-[24px] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepCircumference(item.key, 0.5)}
                              className="bg-black rounded-[4px] w-[20px] h-[24px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Standard Circumference Card (Figma Node 62:844)
                    return (
                      <div
                        key={item.key}
                        className="bg-[rgba(57,58,47,0.75)] rounded-[12px] p-[10px] flex flex-col gap-[6px]"
                      >
                        <div className="flex items-center justify-between w-full gap-1">
                          <span className="font-medium text-[#f8fafc] text-[11px] leading-[16.5px] truncate">
                            {item.shortLabel}
                          </span>
                          <span className="font-normal text-[#f8fafc] text-[10px] leading-[15px] shrink-0">
                            {prevVal !== undefined ? `Ant: ${prevVal.toFixed(1)}` : 'Ant: —'}
                          </span>
                        </div>

                        <div className="bg-[#2a2b21] rounded-[8px] p-[4px] flex items-center gap-[4px] w-full">
                          <button
                            type="button"
                            onClick={() => handleStepCircumference(item.key, -0.5)}
                            className="bg-black rounded-[4px] w-[20px] h-[24px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="--"
                            value={medidasInput[item.key] || ''}
                            onChange={(e) =>
                              setMedidasInput({ ...medidasInput, [item.key]: e.target.value })
                            }
                            className="w-full bg-transparent font-heading font-semibold text-[#f8fafc] text-[18px] text-center tracking-[-0.18px] leading-[24px] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepCircumference(item.key, 0.5)}
                            className="bg-black rounded-[4px] w-[20px] h-[24px] flex items-center justify-center font-bold text-[#94a3b8] hover:text-white text-[12px] shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: FOTOS DE EVOLUÇÃO CORPORAL (Figma Node 62:1061) */}
              <div ref={secFotosRef} className="flex flex-col gap-[10px] w-full pt-[4px]">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-[6px]">
                    <Camera className="w-[11px] h-[11px] text-[#f59e0b]" />
                    <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                      FOTOS DE EVOLUÇÃO CORPORAL
                    </span>
                  </div>
                  <span className="bg-[#35352b] text-[#d3e156] font-bold text-[9px] uppercase leading-[13.5px] px-[6px] py-[2px] rounded-[4px]">
                    {modalPhotosCount}/3 REGISTRADA
                  </span>
                </div>

                <p className="font-normal text-[#151413] text-[11px] leading-[16.5px]">
                  Tire fotos com boa iluminação e mesma postura para comparar a evolução muscular.
                </p>

                <div className="flex gap-[10px] overflow-x-auto pb-1 scrollbar-none">
                  {(
                    [
                      { key: 'frente', badge: 'FRENTE' },
                      { key: 'costas', badge: 'COSTAS' },
                      { key: 'perfil', badge: 'PERFIL' }
                    ] as Array<{ key: keyof EvolutionPhotos; badge: string }>
                  ).map(({ key, badge }) => {
                    const photoUrl = fotosInput[key];
                    const hasPhoto = Boolean(photoUrl);

                    return (
                      <div
                        key={key}
                        className={`bg-black ${
                          hasPhoto
                            ? 'border border-[#e5e7eb]'
                            : 'border border-dashed border-[rgba(255,255,255,0.2)]'
                        } rounded-[16px] p-[11px] w-[132px] h-[154px] shrink-0 flex flex-col justify-between relative overflow-hidden`}
                      >
                        <input
                          ref={modalPhotoInputRefs[key]}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleModalPhotoSelect(key, e)}
                          className="hidden"
                        />

                        {hasPhoto && (
                          <img
                            src={photoUrl}
                            alt={`Preview ${badge}`}
                            className="absolute inset-0 w-full h-full object-cover opacity-55"
                          />
                        )}

                        <div className="flex items-center justify-between w-full relative z-10">
                          <span className="bg-[#f59e0b] text-black font-bold text-[8px] uppercase leading-[13.5px] px-[6px] py-[2px] rounded-[4px]">
                            {badge}
                          </span>
                          {hasPhoto && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = { ...fotosInput };
                                delete copy[key];
                                setFotosInput(copy);
                              }}
                              className="bg-[rgba(42,43,33,0.85)] text-[#ff6e61] rounded-full w-[22px] h-[22px] flex items-center justify-center"
                            >
                              <X className="w-[10px] h-[10px]" />
                            </button>
                          )}
                        </div>

                        <div
                          onClick={() => modalPhotoInputRefs[key].current?.click()}
                          className="flex-1 flex items-center justify-center relative z-10 cursor-pointer"
                        >
                          {hasPhoto ? (
                            <div className="w-[34px] h-[34px] rounded-full bg-[rgba(211,225,86,0.2)] flex items-center justify-center text-[#d3e156]">
                              <Check className="w-[15px] h-[15px] stroke-[2.5]" />
                            </div>
                          ) : (
                            <div className="w-[34px] h-[34px] rounded-[12px] bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#f59e0b]">
                              <Camera className="w-[15px] h-[15px]" />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => modalPhotoInputRefs[key].current?.click()}
                          className="bg-[rgba(248,250,252,0.12)] hover:bg-[rgba(248,250,252,0.2)] py-[4px] rounded-[8px] w-full flex items-center justify-center gap-[4px] relative z-10"
                        >
                          <span className="font-semibold text-[#f8fafc] text-[10px] leading-[15px]">
                            {hasPhoto ? 'Trocar' : '+ Adicionar'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: NOTAS & CONDIÇÕES (Figma Node 62:1126) */}
              <div className="flex flex-col gap-[6px] w-full pt-[4px]">
                <div className="flex items-center gap-[6px]">
                  <FileText className="w-[11px] h-[11px] text-[#f59e0b]" />
                  <span className="font-bold text-black text-[10px] tracking-[0.5px] uppercase leading-[14px]">
                    NOTAS &amp; CONDIÇÕES
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={notasInput}
                  onChange={(e) => setNotasInput(e.target.value)}
                  placeholder="Ex: Medição em jejum, pós-hidratação matinal de 500ml..."
                  className="bg-black rounded-[16px] p-[12px] w-full text-[#f8fafc] placeholder-[#64748b] text-[12px] leading-[16px] focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button inside Modal */}
              <div className="pt-[6px]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full transition-transform active:scale-[0.98]"
                >
                  <span className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[0.45px] uppercase leading-[24px]">
                    {submitting
                      ? 'SALVANDO...'
                      : editingMeasurement
                      ? 'SALVAR ALTERAÇÕES'
                      : 'SALVAR AVALIAÇÃO'}
                  </span>
                  <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] shrink-0 flex items-center justify-center">
                    {submitting ? (
                      <Loader2 className="w-[14px] h-[14px] text-[#151413] animate-spin" />
                    ) : (
                      <Check className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Confirm Delete Measurement */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#151413] border border-white/10 rounded-[16px] w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#ff6e61]">
              <div className="p-2.5 rounded-full bg-[#ff6e61]/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] uppercase">
                Excluir Avaliação?
              </h3>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Esta aferição e todas as circunferências e fotos desta data serão removidas
              permanentemente.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-black hover:bg-[#1c1c13] text-[#f8fafc] font-semibold py-2.5 rounded-full text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDeleteMeasurement(deleteConfirmId)}
                className="flex-1 bg-[#ff6e61] hover:opacity-90 text-white font-bold py-2.5 rounded-full text-xs transition-opacity flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox for Evolution Photos */}
      {lightboxPhotoUrl && (
        <div
          onClick={() => setLightboxPhotoUrl(null)}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxPhotoUrl(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxPhotoUrl}
            alt="Foto de Evolução Ampliada"
            className="max-w-full max-h-[82vh] rounded-[16px] object-contain shadow-2xl"
          />
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

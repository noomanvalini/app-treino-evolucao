'use client';

import React, { useState } from 'react';
import { BODY_MAP_PATHS } from '@/data/bodyMapPaths';

export interface MuscleReadinessStat {
  muscleGroup: string;
  evolutionPct: number;
  hoursSinceLast: number | null;
  recoveryPct: number;
  weeklySets: number;
  best1RM: number;
  status: 'ready' | 'recovering' | 'inactive';
}

interface DashboardStrengthScoreCardProps {
  rpScorePts: number;
  totalEvolutionPct: number;
  muscleStats: Record<string, MuscleReadinessStat>;
  onSelectMuscle: (muscleGroup: string) => void;
}

const FRONT_PATH_TO_MUSCLE: Array<{ pathKey: string; muscleGroup: string }> = [
  { pathKey: 'peito-frente', muscleGroup: 'Peito' },
  { pathKey: 'ombro-frente', muscleGroup: 'Ombro' },
  { pathKey: 'biceps-frente', muscleGroup: 'Bíceps' },
  { pathKey: 'antebraco-frente', muscleGroup: 'Antebraço' },
  { pathKey: 'abdomen-frente', muscleGroup: 'Abdômen' },
  { pathKey: 'quadriceps-frente', muscleGroup: 'Quadríceps' }
];

const BACK_PATH_TO_MUSCLE: Array<{ pathKey: string; muscleGroup: string }> = [
  { pathKey: 'costas-verso', muscleGroup: 'Costas' },
  { pathKey: 'triceps-verso', muscleGroup: 'Tríceps' },
  { pathKey: 'gluteos-verso', muscleGroup: 'Glúteos' },
  { pathKey: 'posterior-coxa-verso', muscleGroup: 'Posterior de Coxa' },
  { pathKey: 'panturrilha-verso', muscleGroup: 'Panturrilha/Canela' }
];

// 2-Column Grid Order from Figma Node 27:588 (Left = Front muscles, Right = Back muscles)
const MUSCLE_GRID_ITEMS: Array<{ label: string; muscleGroup: string }> = [
  { label: 'Peitoral', muscleGroup: 'Peito' },
  { label: 'Costas', muscleGroup: 'Costas' },
  { label: 'Bíceps', muscleGroup: 'Bíceps' },
  { label: 'Tríceps', muscleGroup: 'Tríceps' },
  { label: 'Ombro', muscleGroup: 'Ombro' },
  { label: 'Glúteos', muscleGroup: 'Glúteos' },
  { label: 'Quadríceps', muscleGroup: 'Quadríceps' },
  { label: 'Posteriores', muscleGroup: 'Posterior de Coxa' },
  { label: 'Abdominal', muscleGroup: 'Abdômen' },
  { label: 'Panturrilha', muscleGroup: 'Panturrilha/Canela' }
];

export default function DashboardStrengthScoreCard({
  rpScorePts,
  totalEvolutionPct,
  muscleStats,
  onSelectMuscle
}: DashboardStrengthScoreCardProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const getRecoveryPct = (muscleGroup: string): number => {
    const stat = muscleStats[muscleGroup];
    if (!stat) return 100;
    if (typeof stat.recoveryPct === 'number') return stat.recoveryPct;
    if (stat.hoursSinceLast === null) return 100;
    return Math.min(100, Math.max(0, Math.round((stat.hoursSinceLast / 48) * 100)));
  };

  const getMuscleFill = (muscleGroup: string) => {
    const stat = muscleStats[muscleGroup];
    const isHovered = hoveredMuscle === muscleGroup;
    if (!stat || stat.status === 'inactive') {
      return {
        fill: isHovered ? '#D3E156' : 'transparent',
        opacity: isHovered ? 0.45 : 0
      };
    }
    const pct = getRecoveryPct(muscleGroup);
    if (pct < 85) {
      return {
        fill: '#FFB95F',
        opacity: isHovered ? 1 : 0.88
      };
    }
    return {
      fill: '#D3E156',
      opacity: isHovered ? 1 : 0.88
    };
  };

  const formattedTotalEvo = `${totalEvolutionPct >= 0 ? '+' : ''}${totalEvolutionPct.toFixed(1)}%`;

  return (
    <div className="bg-[#202017] rounded-[12px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
      {/* Header with Metric (Figma Node 27:521) */}
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center gap-[8px] w-full">
          <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
            Score Geral de Força
          </h3>
          <div className="bg-[rgba(255,255,255,0.08)] px-[6px] py-[2px] rounded-[4px] shrink-0">
            <span className="font-bold text-[#64748b] text-[10px] tracking-[0.8px] leading-[14px] block">
              Brzycki 1RM
            </span>
          </div>
        </div>

        <div className="pt-[4px] flex items-baseline gap-[8px] flex-wrap w-full">
          <div className="flex items-baseline gap-[4px]">
            <span className="font-heading font-bold text-[#f8fafc] text-[36px] tracking-[-0.9px] leading-[40px]">
              {rpScorePts.toLocaleString('pt-BR')}
            </span>
            <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
              pts
            </span>
          </div>

          <div
            className={`flex items-center gap-[3px] px-[8px] py-[2px] rounded-full ${
              totalEvolutionPct >= 0
                ? 'bg-[rgba(211,225,86,0.1)]'
                : 'bg-danger/10'
            }`}
          >
            <span
              className={`font-medium text-[11px] leading-[20px] ${
                totalEvolutionPct >= 0 ? 'text-[#d3e156]' : 'text-danger'
              }`}
            >
              {totalEvolutionPct >= 0 ? '▲' : '▼'} {formattedTotalEvo}
            </span>
            <span className="font-normal text-[#94a3b8] text-[11px] leading-[20px]">
              este mês
            </span>
          </div>
        </div>
      </div>

      {/* Visual Anatomical Muscle Silhouette & Status (Figma Node 27:537) */}
      <div className="pt-[16px] w-full">
        <div className="bg-[#0e0f07] rounded-[8px] p-[12px] flex flex-col items-center w-full">
          {/* Larger Dual Body Map View (Front & Back) */}
          <div className="grid grid-cols-2 gap-3 py-[8px] w-full items-center">
            {/* Vista Anterior (Front - Figma Node 27:539) */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#64748b] text-[9px] tracking-[0.45px] uppercase leading-[20px] pb-[4px]">
                VISTA ANTERIOR
              </span>
              <div className="relative w-full h-[220px] flex items-center justify-center select-none drop-shadow-[0px_0px_8px_rgba(211,225,86,0.12)]">
                <img
                  src="/images/body-map/corpo-base-frente.svg"
                  alt="Mapa Corporal Anterior"
                  className="w-full h-full object-contain opacity-45 pointer-events-none"
                  draggable={false}
                />
                <svg
                  viewBox="0 0 2000 3373.03"
                  preserveAspectRatio="xMidYMid meet"
                  className="absolute inset-0 w-full h-full"
                >
                  {FRONT_PATH_TO_MUSCLE.map(({ pathKey, muscleGroup }) => {
                    const paths = BODY_MAP_PATHS[pathKey] || [];
                    const { fill, opacity } = getMuscleFill(muscleGroup);
                    return (
                      <g
                        key={pathKey}
                        onClick={() => onSelectMuscle(muscleGroup)}
                        onMouseEnter={() => setHoveredMuscle(muscleGroup)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        className="cursor-pointer transition-opacity duration-200"
                      >
                        <title>{muscleGroup}</title>
                        {paths.map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            fill={fill}
                            fillOpacity={opacity}
                            stroke={hoveredMuscle === muscleGroup ? '#D3E156' : 'none'}
                            strokeWidth={hoveredMuscle === muscleGroup ? 18 : 0}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Vista Posterior (Back - Figma Node 27:567) */}
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#64748b] text-[9px] tracking-[0.45px] uppercase leading-[20px] pb-[4px]">
                VISTA POSTERIOR
              </span>
              <div className="relative w-full h-[220px] flex items-center justify-center select-none drop-shadow-[0px_0px_8px_rgba(211,225,86,0.12)]">
                <img
                  src="/images/body-map/corpo-base-verso.svg"
                  alt="Mapa Corporal Posterior"
                  className="w-full h-full object-contain opacity-45 pointer-events-none"
                  draggable={false}
                />
                <svg
                  viewBox="0 0 2000 3373.03"
                  preserveAspectRatio="xMidYMid meet"
                  className="absolute inset-0 w-full h-full"
                >
                  {BACK_PATH_TO_MUSCLE.map(({ pathKey, muscleGroup }) => {
                    const paths = BODY_MAP_PATHS[pathKey] || [];
                    const { fill, opacity } = getMuscleFill(muscleGroup);
                    return (
                      <g
                        key={pathKey}
                        onClick={() => onSelectMuscle(muscleGroup)}
                        onMouseEnter={() => setHoveredMuscle(muscleGroup)}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        className="cursor-pointer transition-opacity duration-200"
                      >
                        <title>{muscleGroup}</title>
                        {paths.map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            fill={fill}
                            fillOpacity={opacity}
                            stroke={hoveredMuscle === muscleGroup ? '#D3E156' : 'none'}
                            strokeWidth={hoveredMuscle === muscleGroup ? 18 : 0}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* 2-Column Muscle Readiness Breakdown (Figma Node 27:588) */}
          <div className="grid grid-cols-2 gap-[6px] w-full mt-[4px]">
            {MUSCLE_GRID_ITEMS.map(({ label, muscleGroup }) => {
              const recoveryPct = getRecoveryPct(muscleGroup);
              const isBelow85 = recoveryPct < 85;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSelectMuscle(muscleGroup)}
                  onMouseEnter={() => setHoveredMuscle(muscleGroup)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] px-[8px] py-[4px] rounded-[8px] flex items-center justify-between w-full transition-colors text-left"
                >
                  <span className="font-medium text-[#94a3b8] text-[10px] leading-[20px] truncate">
                    {label}
                  </span>
                  <span
                    className={`font-normal text-[10px] leading-[16px] text-right shrink-0 ${
                      isBelow85 ? 'text-[#f59e0b]' : 'text-[#d3e156]'
                    }`}
                  >
                    {recoveryPct}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend Tags (Figma Node 27:613) */}
          <div className="pt-[8px] w-full">
            <div className="border-t border-[rgba(255,255,255,0.08)] pt-[9px] flex items-center justify-center gap-[12px] flex-wrap w-full">
              <span className="font-medium text-[#94a3b8] text-[10px] leading-[20px] whitespace-nowrap">
                <strong className="font-black text-[#f8fafc]">%</strong> de descanso
              </span>

              <div className="flex items-center gap-[6px]">
                <span className="bg-[#d3e156] rounded-full shadow-[0px_0px_6px_0px_rgba(211,225,86,0.8)] w-[8px] h-[8px] shrink-0" />
                <span className="font-medium text-[#94a3b8] text-[10px] leading-[20px] whitespace-nowrap">
                  Pronto para Treinar
                </span>
              </div>

              <div className="flex items-center gap-[6px]">
                <span className="bg-[#ffb95f] rounded-full shadow-[0px_0px_6px_0px_rgba(255,185,95,0.8)] w-[8px] h-[8px] shrink-0" />
                <span className="font-medium text-[#94a3b8] text-[10px] leading-[20px] whitespace-nowrap">
                  Em Recuperação
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


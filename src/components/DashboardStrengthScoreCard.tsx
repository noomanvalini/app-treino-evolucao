'use client';

import React, { useState } from 'react';
import { BODY_MAP_PATHS } from '@/data/bodyMapPaths';

export interface MuscleReadinessStat {
  muscleGroup: string;
  evolutionPct: number;
  hoursSinceLast: number | null;
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

export default function DashboardStrengthScoreCard({
  rpScorePts,
  totalEvolutionPct,
  muscleStats,
  onSelectMuscle
}: DashboardStrengthScoreCardProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const getMuscleFill = (muscleGroup: string) => {
    const stat = muscleStats[muscleGroup];
    const isHovered = hoveredMuscle === muscleGroup;
    if (!stat || stat.status === 'inactive') {
      return {
        fill: isHovered ? '#D3E156' : 'transparent',
        opacity: isHovered ? 0.45 : 0
      };
    }
    if (stat.status === 'recovering') {
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

  // Build combined summary rows for the right column (matching Figma layout)
  const summaryGroups = [
    {
      label: 'Peito / Ombro',
      primaryMuscle: 'Peito',
      muscles: ['Peito', 'Ombro']
    },
    {
      label: 'Costas / Bíceps',
      primaryMuscle: 'Costas',
      muscles: ['Costas', 'Bíceps']
    },
    {
      label: 'Quadríceps',
      primaryMuscle: 'Quadríceps',
      muscles: ['Quadríceps']
    },
    {
      label: 'Posterior / Glúteos',
      primaryMuscle: 'Posterior de Coxa',
      muscles: ['Posterior de Coxa', 'Glúteos']
    }
  ];

  const getGroupDisplay = (muscles: string[]) => {
    const stats = muscles.map((m) => muscleStats[m]).filter(Boolean);
    if (stats.length === 0 || stats.every((s) => s.status === 'inactive')) {
      return {
        dotColor: 'bg-[#46483b]',
        textColor: 'text-[#909284]',
        subtitle: 'Pronto p/ treinar'
      };
    }

    const recoveringStat = stats.find((s) => s.status === 'recovering');
    const avgEvo =
      stats.reduce((acc, curr) => acc + (curr.evolutionPct || 0), 0) / stats.length;
    const evoFormatted = `${avgEvo >= 0 ? '+' : ''}${avgEvo.toFixed(1)}%`;

    if (recoveringStat) {
      const hoursLeft = Math.max(
        6,
        48 - Math.round(recoveringStat.hoursSinceLast ?? 24)
      );
      return {
        dotColor: 'bg-[#ffb95f] shadow-[0_0_8px_rgba(255,185,95,0.5)]',
        textColor: 'text-[#ffb95f]',
        subtitle: `Recup. (${hoursLeft}h) • ${evoFormatted}`
      };
    }

    return {
      dotColor: 'bg-[#d3e156] shadow-[0_0_8px_rgba(211,225,86,0.5)]',
      textColor: 'text-[#d3e156]',
      subtitle: `Pronto • ${evoFormatted}`
    };
  };

  const formattedTotalEvo = `${totalEvolutionPct >= 0 ? '+' : ''}${totalEvolutionPct.toFixed(1)}%`;

  return (
    <div className="bg-[#202017] rounded-3xl p-4 border border-[rgba(70,72,59,0.2)] shadow-xl space-y-3.5">
      {/* Top Score Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
            Score Geral de Força
          </h3>
          <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black font-heading text-[#e3e3d6] tracking-[-0.9px]">
                {rpScorePts.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm font-bold text-[#909284]">pts</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                totalEvolutionPct >= 0
                  ? 'bg-[rgba(211,225,86,0.1)] text-[#d3e156]'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {totalEvolutionPct >= 0 ? '▲' : '▼'} {formattedTotalEvo} este mês
            </span>
          </div>
        </div>

        <div className="bg-[#2a2b21] border border-[rgba(70,72,59,0.3)] rounded-lg px-2.5 py-1.5 shrink-0">
          <span className="text-[10px] font-semibold text-[#c7c7b8] block leading-none">
            Brzycki 1RM
          </span>
        </div>
      </div>

      {/* Anatomical Body Map Dual View + Muscle Readiness Column */}
      <div className="bg-[#0e0f07] border border-[rgba(70,72,59,0.15)] rounded-2xl p-3">
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Vista Anterior (Front) */}
          <div className="col-span-4 flex flex-col items-center">
            <div className="relative w-full h-[165px] flex items-center justify-center select-none">
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
            <span className="text-[9px] font-bold uppercase tracking-[0.45px] text-[#909284] mt-1">
              Anterior
            </span>
          </div>

          {/* Vista Posterior (Back) */}
          <div className="col-span-4 flex flex-col items-center">
            <div className="relative w-full h-[165px] flex items-center justify-center select-none">
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
            <span className="text-[9px] font-bold uppercase tracking-[0.45px] text-[#909284] mt-1">
              Posterior
            </span>
          </div>

          {/* Right Column: Muscle Readiness & Evolution Breakdown */}
          <div className="col-span-4 border-l border-[rgba(70,72,59,0.15)] pl-2.5 flex flex-col justify-center gap-2.5">
            {summaryGroups.map((group) => {
              const display = getGroupDisplay(group.muscles);
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => onSelectMuscle(group.primaryMuscle)}
                  onMouseEnter={() => setHoveredMuscle(group.primaryMuscle)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="text-left group focus:outline-none hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${display.dotColor}`} />
                    <span className="text-[11px] font-bold text-[#e3e3d6] group-hover:text-[#d3e156] transition-colors truncate">
                      {group.label}
                    </span>
                  </div>
                  <span className={`block text-[10px] font-bold pl-3.5 leading-tight ${display.textColor}`}>
                    {display.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="border-t border-[rgba(70,72,59,0.15)] pt-3 flex items-center justify-between flex-wrap gap-2 text-[10px] text-[#909284]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d3e156]" />
            <span>Pronto / Ativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ffb95f]" />
            <span>Em recuperação</span>
          </div>
        </div>
        <span className="text-[10px] text-[#909284]">Toque no músculo p/ detalhes</span>
      </div>
    </div>
  );
}

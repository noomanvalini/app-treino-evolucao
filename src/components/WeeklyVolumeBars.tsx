'use client';

import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { usePalette } from '@/context/PaletteContext';

export interface VolumeLogItem {
  data: any;
  muscleGroup?: string;
  exerciseId?: string;
  cargaKg?: number;
  reps?: number;
  totalSetsCompleted?: number;
  allSets?: Array<any>;
}

interface WeeklyVolumeBarsProps {
  logs?: VolumeLogItem[];
  weeklySetGoals?: {
    peito?: number;
    costas?: number;
    bracos?: number;
    pernas?: number;
    ombros?: number;
  };
}

export default function WeeklyVolumeBars({ logs = [], weeklySetGoals }: WeeklyVolumeBarsProps) {
  const { isContrast } = usePalette();
  const categories = useMemo(() => {
    // Current week window (last 7 days inclusive)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const cutoffMs = sevenDaysAgo.getTime();

    const setsByCategory = {
      peito: 0,
      costas: 0,
      bracos: 0,
      pernas: 0,
      ombros: 0
    };

    logs.forEach((l) => {
      const logTime = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
      if (isNaN(logTime) || logTime < cutoffMs) return;

      const setsCount =
        typeof l.totalSetsCompleted === 'number' && l.totalSetsCompleted > 0
          ? l.totalSetsCompleted
          : Array.isArray(l.allSets) && l.allSets.length > 0
          ? l.allSets.length
          : 3;

      const mg = (l.muscleGroup || '').toLowerCase();
      if (mg.includes('peito')) {
        setsByCategory.peito += setsCount;
      } else if (mg.includes('costas')) {
        setsByCategory.costas += setsCount;
      } else if (
        mg.includes('bíceps') ||
        mg.includes('biceps') ||
        mg.includes('tríceps') ||
        mg.includes('triceps') ||
        mg.includes('antebra')
      ) {
        setsByCategory.bracos += setsCount;
      } else if (
        mg.includes('quadr') ||
        mg.includes('posterior') ||
        mg.includes('glúteo') ||
        mg.includes('gluteo') ||
        mg.includes('panturrilha')
      ) {
        setsByCategory.pernas += setsCount;
      } else if (mg.includes('ombro')) {
        setsByCategory.ombros += setsCount;
      }
    });

    const rows = [
      {
        key: 'peito',
        label: 'Peito',
        sets: setsByCategory.peito,
        target: weeklySetGoals?.peito || 16
      },
      {
        key: 'costas',
        label: 'Costas',
        sets: setsByCategory.costas,
        target: weeklySetGoals?.costas || 16
      },
      {
        key: 'bracos',
        label: 'Braços (Bíc/Tríc)',
        sets: setsByCategory.bracos,
        target: weeklySetGoals?.bracos || 16
      },
      {
        key: 'pernas',
        label: 'Pernas (Inferiores)',
        sets: setsByCategory.pernas,
        target: weeklySetGoals?.pernas || 16
      },
      {
        key: 'ombros',
        label: 'Ombros',
        sets: setsByCategory.ombros,
        target: weeklySetGoals?.ombros || 12
      }
    ];

    return rows.map((r) => {
      const rawPct = r.target > 0 ? Math.round((r.sets / r.target) * 100) : 0;
      const barPct = Math.min(100, rawPct);
      const isGoalMet = rawPct >= 100;
      return {
        ...r,
        rawPct,
        barPct,
        isGoalMet
      };
    });
  }, [logs, weeklySetGoals]);

  // Color scale based on percentage of weekly goal reached:
  // 0% to 59% -> Orange (#ffb95f)
  // 60% to 79% -> Blue (bar #1e91b1, text #6ecddd)
  // 80% to 100%+ -> Green (#d3e156)
  const getTierStyles = (rawPct: number, isGoalMet: boolean) => {
    if (rawPct >= 80) {
      return {
        pctTextColor: 'text-[#d3e156]',
        barColor: isGoalMet
          ? 'bg-[#d3e156] shadow-[0px_0px_8px_0px_rgba(211,225,86,0.6)]'
          : 'bg-[#d3e156]'
      };
    }
    if (rawPct >= 60) {
      return {
        pctTextColor: 'text-[#6ecddd]',
        barColor: 'bg-[#1e91b1]'
      };
    }
    return {
      pctTextColor: 'text-[#ffb95f]',
      barColor: 'bg-[#ffb95f]'
    };
  };

  return (
    <div
      className={`${
        isContrast ? 'bg-[#151413]' : 'bg-[#202017]'
      } rounded-[12px] p-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-colors`}
    >
      {/* Header (Figma Node 27:625 - No icon on the right) */}
      <div className="flex flex-col items-start w-full">
        <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
          Meta de Volume Semanal
        </h3>
        <span className="pt-[2px] font-medium text-[#64748b] text-[11px] leading-[20px]">
          Com base no seu plano de treino
        </span>
      </div>

      {/* Muscle Group Goal Progress Bars (Figma Node 27:635) */}
      <div className="pt-[16px] space-y-[10px] w-full">
        {categories.map((item) => {
          const { pctTextColor, barColor } = getTierStyles(item.rawPct, item.isGoalMet);

          return (
            <div key={item.key} className="w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-[6px] min-w-0">
                  <span className="font-normal text-[#f8fafc] text-[12px] leading-[16px] truncate">
                    {item.label}
                  </span>
                  {item.isGoalMet && (
                    <span className="bg-[rgba(211,225,86,0.1)] flex items-center gap-[3px] px-[5px] py-[1px] rounded-[4px] shrink-0">
                      <span className="font-normal text-[#d3e156] text-[10px] leading-[16px]">
                        Meta batida!
                      </span>
                      <Trophy className="w-[11px] h-[11px] text-[#d3e156] shrink-0" />
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-[4px] shrink-0 text-[12px] leading-[16px]">
                  <span className="font-mono text-[#94a3b8]">
                    {item.sets}/{item.target}
                  </span>
                  <span className={`font-normal ${pctTextColor}`}>
                    ({item.rawPct}%)
                  </span>
                </div>
              </div>

              <div className="pt-[4px] w-full">
                <div className="w-full h-[8px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${item.sets === 0 ? 0 : item.barPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


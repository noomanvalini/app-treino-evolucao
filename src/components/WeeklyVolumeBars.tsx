'use client';

import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

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
  const baseTarget = weeklySetGoals?.peito || 16;

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
      } else if (mg.includes('bíceps') || mg.includes('biceps') || mg.includes('tríceps') || mg.includes('triceps') || mg.includes('antebra')) {
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
      const isGoalMet = r.sets >= r.target;
      const isLow = rawPct > 0 && rawPct < 55;
      return {
        ...r,
        rawPct,
        barPct,
        isGoalMet,
        isLow
      };
    });
  }, [logs, weeklySetGoals]);

  return (
    <div className="bg-[#202017] border border-[rgba(70,72,59,0.2)] rounded-3xl p-4 shadow-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
            Volume Semanal de Séries
          </h3>
          <span className="text-[11px] text-[#c7c7b8] block mt-0.5">
            Meta base: {baseTarget} séries/músculo
          </span>
        </div>

        <div className="bg-[#2a2b21] border border-[rgba(70,72,59,0.3)] rounded-lg p-2 text-[#d3e156]">
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Muscle Group Goal Progress Bars */}
      <div className="space-y-3.5">
        {categories.map((item) => {
          const textColor = item.isGoalMet
            ? 'text-[#d3e156] font-extrabold'
            : item.isLow
            ? 'text-[#ffb95f] font-bold'
            : item.sets === 0
            ? 'text-[#909284] font-bold'
            : 'text-[#d3e156] font-bold';

          const barColor = item.isGoalMet
            ? 'bg-[#d3e156] shadow-[0_0_8px_rgba(211,225,86,0.5)]'
            : item.isLow
            ? 'bg-[#ffb95f]'
            : item.sets === 0
            ? 'bg-[#34352a]'
            : 'bg-[#d3e156]';

          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#e3e3d6]">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  {item.isGoalMet && (
                    <span className="bg-[rgba(211,225,86,0.15)] text-[#d3e156] px-1.5 py-0.5 rounded text-[9px] font-bold">
                      Meta batida! 🏆
                    </span>
                  )}
                  <span className={`text-xs font-heading ${textColor}`}>
                    {item.sets}/{item.target} ({item.rawPct}%)
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-[#0e0f07] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${item.sets === 0 ? 4 : item.barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

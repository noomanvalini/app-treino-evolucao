'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const CALENDAR_WEEK_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const SEQ_WEEK_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const MONTH_NAMES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface WorkoutCalendarAndStreakProps {
  calMonth: Date;
  onChangeMonth: (next: Date) => void;
  trainedDayKeys: string[];
  selectedDayKey?: string | null;
  onSelectDay?: (dayKey: string) => void;
  showSequence?: boolean;
}

export default function WorkoutCalendarAndStreak({
  calMonth,
  onChangeMonth,
  trainedDayKeys,
  selectedDayKey = null,
  onSelectDay,
  showSequence = true,
}: WorkoutCalendarAndStreakProps) {
  const trainedSet = useMemo(() => new Set(trainedDayKeys), [trainedDayKeys]);

  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay(); // DOM=0 .. SÁB=6
    const todayKey = toDayKey(new Date());

    const cells: Array<{
      outside: boolean;
      day: number;
      key: string;
      trained: boolean;
      isToday: boolean;
    }> = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const key = toDayKey(d);
      cells.push({
        outside: true,
        day: prevMonthLastDay - i,
        key,
        trained: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = toDayKey(d);
      cells.push({
        outside: false,
        day,
        key,
        trained: trainedSet.has(key),
        isToday: key === todayKey,
      });
    }

    const remainder = cells.length % 7;
    if (remainder > 0) {
      const needed = 7 - remainder;
      for (let i = 1; i <= needed; i++) {
        const d = new Date(year, month + 1, i);
        const key = toDayKey(d);
        cells.push({
          outside: true,
          day: i,
          key,
          trained: false,
          isToday: false,
        });
      }
    }

    return cells;
  }, [calMonth, trainedSet]);

  const weeklySequence = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);

    return SEQ_WEEK_LABELS.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const key = toDayKey(d);
      return {
        label,
        key,
        trained: trainedSet.has(key),
        isToday: key === toDayKey(today),
      };
    });
  }, [trainedSet]);

  const activeWeekDaysCount = weeklySequence.filter((w) => w.trained).length;

  return (
    <div className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[16px] p-[16px] space-y-[14px]">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="font-heading font-bold text-[#f8fafc] text-[18px] tracking-[0.2px] uppercase">
            {MONTH_NAMES[calMonth.getMonth()]}
          </h2>
          <span className="font-heading font-medium text-[#64748b] text-[16px]">
            {calMonth.getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChangeMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
            }
            className="w-8 h-8 rounded-[8px] bg-black hover:bg-white/10 border border-white/[0.06] flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              onChangeMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
            }
            className="w-8 h-8 rounded-[8px] bg-black hover:bg-white/10 border border-white/[0.06] flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Row (DOM..SÁB) */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {CALENDAR_WEEK_LABELS.map((w) => (
          <span key={w} className="text-[10px] font-bold text-[#64748b] py-1">
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
        {calendarCells.map((cell) => {
          const isSelected = !cell.outside && selectedDayKey === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.outside || !onSelectDay}
              onClick={() => !cell.outside && onSelectDay && onSelectDay(cell.key)}
              className={`h-[42px] rounded-[10px] flex flex-col items-center justify-center transition-all ${
                cell.outside
                  ? 'text-[#334155] cursor-default'
                  : cell.isToday
                  ? 'bg-[#f59e0b] text-[#100F0F] font-bold shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                  : isSelected
                  ? 'bg-white/15 border border-[#f59e0b] text-white font-bold'
                  : cell.trained
                  ? 'text-[#f8fafc] font-bold hover:bg-white/[0.06]'
                  : 'text-[#94a3b8] hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-[13px] leading-none">
                {String(cell.day).padStart(2, '0')}
              </span>
              {cell.isToday ? (
                <span className="text-[8px] font-extrabold uppercase tracking-tight leading-none mt-1">
                  HOJE
                </span>
              ) : (
                <span
                  className={`w-[5px] h-[5px] rounded-full mt-1.5 ${
                    cell.trained && !cell.outside ? 'bg-[#d3e156]' : 'bg-transparent'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
        <span className="w-[7px] h-[7px] rounded-full bg-[#d3e156]" />
        <span>Treino Registrado</span>
      </div>

      {/* Sequência Ativa Strip */}
      {showSequence && (
        <div className="pt-3.5 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#94a3b8]">
              SEQUÊNCIA ATIVA
            </span>
            <span className="text-[12px] font-bold text-[#f59e0b]">
              {activeWeekDaysCount} {activeWeekDaysCount === 1 ? 'dia' : 'dias'}/semana
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weeklySequence.map((day) => (
              <div key={day.key} className="flex flex-col items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold ${
                    day.isToday ? 'text-[#f59e0b]' : 'text-[#64748b]'
                  }`}
                >
                  {day.label}
                </span>
                <div
                  className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
                    day.trained
                      ? 'bg-[#f59e0b] text-[#100F0F] shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                      : 'bg-black/75 border border-white/[0.06] text-[#64748b]'
                  }`}
                >
                  {day.trained ? (
                    <Check className="w-[15px] h-[15px] stroke-[3]" />
                  ) : (
                    <span className="text-[12px] font-bold">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

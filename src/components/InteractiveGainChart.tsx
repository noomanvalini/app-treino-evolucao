'use client';

import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Calendar, Award, Zap, ChevronRight, Activity } from 'lucide-react';

export interface ChartDataPoint {
  date: string | Date;
  value: number; // 1RM or weight
  reps?: number;
  rawWeight?: number;
  label?: string;
}

interface InteractiveGainChartProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  colorTheme?: 'lime' | 'amber';
  unit?: string;
  showTimeframeSelector?: boolean;
}

type Timeframe = '1M' | '3M' | '6M' | '1A' | 'TUDO';

export default function InteractiveGainChart({
  title = 'Evolução de Carga & 1RM',
  subtitle,
  data = [],
  colorTheme = 'lime',
  unit = 'kg',
  showTimeframeSelector = true
}: InteractiveGainChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('TUDO');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme colors
  const strokeColor = colorTheme === 'amber' ? '#F59E0B' : '#D3E156';
  const fillColorId = colorTheme === 'amber' ? 'amberGradient' : 'limeGradient';
  const shadowColor = colorTheme === 'amber' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(211, 225, 86, 0.4)';
  const badgeColor = colorTheme === 'amber' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-lime-neon bg-lime-neon/10 border-lime-neon/20';

  // Format Date Helper
  const parseDate = (d: string | Date): Date => {
    if (d instanceof Date) return d;
    return new Date(d);
  };

  const formatDateShort = (d: Date): string => {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const formatDateFull = (d: Date): string => {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // 1. Sort chronologically
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const ta = parseDate(a.date).getTime();
      const tb = parseDate(b.date).getTime();
      return ta - tb;
    });
  }, [data]);

  // 2. Filter by timeframe
  const filteredData = useMemo(() => {
    if (sortedData.length <= 1 || selectedTimeframe === 'TUDO') return sortedData;

    const now = new Date().getTime();
    const daysMap: Record<Timeframe, number> = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1A': 365,
      'TUDO': Infinity
    };
    const cutoff = now - daysMap[selectedTimeframe] * 24 * 60 * 60 * 1000;
    const res = sortedData.filter((pt) => parseDate(pt.date).getTime() >= cutoff);
    return res.length >= 1 ? res : sortedData;
  }, [sortedData, selectedTimeframe]);

  // Point to highlight (defaults to latest if none selected)
  const currentActivePoint = activeIndex !== null && filteredData[activeIndex]
    ? filteredData[activeIndex]
    : filteredData[filteredData.length - 1];

  const currentActiveIndex = activeIndex !== null ? activeIndex : filteredData.length - 1;

  // Stats calculation
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { min: 0, max: 0, pr: 0, delta: 0 };
    const values = filteredData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = filteredData[0].value;
    const last = filteredData[filteredData.length - 1].value;
    const delta = first > 0 ? ((last - first) / first) * 100 : 0;
    return { min, max, pr: max, delta };
  }, [filteredData]);

  // SVG Coordinates calculation (viewBox 0 0 500 200)
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 30;
  const paddingY = 30;

  const points = useMemo(() => {
    if (filteredData.length === 0) return [];
    if (filteredData.length === 1) {
      return [{ x: svgWidth / 2, y: svgHeight / 2, data: filteredData[0], index: 0 }];
    }

    const minVal = stats.min * 0.95;
    const maxVal = stats.max * 1.05 === minVal ? minVal + 10 : stats.max * 1.05;
    const rangeY = maxVal - minVal;

    return filteredData.map((pt, idx) => {
      const x = paddingX + (idx / (filteredData.length - 1)) * (svgWidth - paddingX * 2);
      const normalizedY = (pt.value - minVal) / rangeY;
      const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
      return { x, y, data: pt, index: idx };
    });
  }, [filteredData, stats]);

  // Smooth Bezier Curve Path Builder
  const { pathLine, pathArea } = useMemo(() => {
    if (points.length === 0) return { pathLine: '', pathArea: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        pathLine: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        pathArea: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${svgHeight} L ${p.x - 20} ${svgHeight} Z`
      };
    }

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (next.x - curr.x) / 2;
      const cpY2 = next.y;
      line += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x} ${svgHeight} L ${first.x} ${svgHeight} Z`;

    return { pathLine: line, pathArea: area };
  }, [points]);

  // Handle Touch/Pointer interaction
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = ((e.clientX - rect.left) / rect.width) * svgWidth;

    // Find closest point
    let closestIndex = 0;
    let minDistance = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - touchX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    setActiveIndex(closestIndex);
  };

  const handlePointerLeave = () => {
    setActiveIndex(null);
  };

  if (data.length === 0) {
    return (
      <div className="bg-slate-card border border-border rounded-3xl p-6 text-center">
        <Activity className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-50" />
        <p className="text-xs font-semibold text-slate-400">Sem dados suficientes para o gráfico</p>
        <span className="text-[10px] text-slate-500">Registre mais séries e cargas para ver sua evolução visual.</span>
      </div>
    );
  }

  const activeCoord = points[currentActiveIndex];
  const activeDate = currentActivePoint ? parseDate(currentActivePoint.date) : new Date();

  // Calculate delta vs previous point if available
  let prevDelta: number | null = null;
  if (currentActiveIndex > 0 && filteredData[currentActiveIndex - 1]) {
    const prevVal = filteredData[currentActiveIndex - 1].value;
    if (prevVal > 0) {
      prevDelta = ((currentActivePoint.value - prevVal) / prevVal) * 100;
    }
  }

  return (
    <div
      ref={containerRef}
      className="bg-slate-card border border-border rounded-3xl p-5 shadow-xl space-y-4 select-none relative overflow-hidden"
    >
      {/* Background radial glow */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 blur-3xl opacity-10 pointer-events-none rounded-full"
        style={{ backgroundColor: strokeColor }}
      />

      {/* Header: Title & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-lime-neon" /> {title}
            </h3>
            {stats.delta !== 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} flex items-center gap-1`}>
                {stats.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stats.delta >= 0 ? `+${stats.delta.toFixed(1)}%` : `${stats.delta.toFixed(1)}%`}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Timeframe Pills */}
        {showTimeframeSelector && (
          <div className="flex items-center gap-1 bg-slate-card-light/70 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
            {(['1M', '3M', '6M', '1A', 'TUDO'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setSelectedTimeframe(tf);
                  setActiveIndex(null);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-lime-neon text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Value Callout (Updates on click/touch) */}
      <div className="flex items-baseline justify-between border-b border-border/50 pb-3 pt-1 relative z-10">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            {activeIndex !== null ? 'Ponto Selecionado' : 'Último Registro'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-heading text-slate-100 tracking-tight">
              {currentActivePoint.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{unit}
            </span>
            {currentActivePoint.rawWeight && currentActivePoint.reps && (
              <span className="text-xs font-semibold text-slate-400 font-mono">
                ({currentActivePoint.rawWeight}kg × {currentActivePoint.reps} reps)
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-slate-300 flex items-center justify-end gap-1 font-mono">
            <Calendar className="h-3.5 w-3.5 text-lime-neon" /> {formatDateShort(activeDate)}
          </span>
          {prevDelta !== null && (
            <span
              className={`text-[10px] font-bold font-mono mt-0.5 block ${
                prevDelta >= 0 ? 'text-lime-neon' : 'text-danger'
              }`}
            >
              {prevDelta >= 0 ? `+${prevDelta.toFixed(1)}%` : `${prevDelta.toFixed(1)}%`} vs anterior
            </span>
          )}
        </div>
      </div>

      {/* Interactive SVG Chart Area */}
      <div className="relative w-full h-44 touch-none cursor-crosshair">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* Volt Lime Gradient */}
            <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D3E156" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#D3E156" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#D3E156" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gold Gradient */}
            <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75].map((factor) => {
            const y = paddingY + factor * (svgHeight - paddingY * 2);
            return (
              <line
                key={factor}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={pathArea} fill={`url(#${fillColorId})`} />

          {/* Main Line with Glow */}
          <path
            d={pathLine}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* Active Vertical Guideline */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              y1={paddingY}
              x2={activeCoord.x}
              y2={svgHeight}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const isSelected = idx === currentActiveIndex;
            return (
              <g key={idx} className="transition-transform duration-150">
                {/* Outer Glow Ring when selected */}
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="10"
                    fill={strokeColor}
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                )}
                {/* Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 3.5}
                  fill="#0D1117"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : 2}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Date Range Labels under X-Axis */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 pt-1 border-t border-border/40">
        <span>{formatDateShort(parseDate(filteredData[0].date))}</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          Toque para inspecionar cargas <ChevronRight className="h-3 w-3" />
        </span>
        <span>{formatDateShort(parseDate(filteredData[filteredData.length - 1].date))}</span>
      </div>

      {/* Quick Stats Grid below chart */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="bg-slate-card-light/40 border border-border/40 rounded-2xl p-2.5">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Recorde (PR)</span>
          <span className="text-sm font-black font-heading text-slate-100">
            {stats.pr.toLocaleString('pt-BR')}{unit}
          </span>
        </div>

        <div className="bg-slate-card-light/40 border border-border/40 rounded-2xl p-2.5">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Sessões</span>
          <span className="text-sm font-black font-heading text-slate-100">
            {filteredData.length}
          </span>
        </div>

        <div className="bg-slate-card-light/40 border border-border/40 rounded-2xl p-2.5">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Progresso</span>
          <span
            className={`text-sm font-black font-heading ${
              stats.delta >= 0 ? 'text-lime-neon' : 'text-danger'
            }`}
          >
            {stats.delta >= 0 ? `+${stats.delta.toFixed(1)}%` : `${stats.delta.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

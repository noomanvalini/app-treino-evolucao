'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

interface BodyMapProps {
  selectedMuscle: string;
  onMuscleSelect: (muscle: string) => void;
}

interface Dot {
  muscle: string;
  left: string;
  top: string;
}

// Map muscles to their respective body side
const MUSCLE_SIDES: Record<string, 'frente' | 'verso'> = {
  'Peito': 'frente',
  'Bíceps': 'frente',
  'Antebraço': 'frente',
  'Quadríceps': 'frente',
  'Abdômen': 'frente',
  'Ombro': 'frente',
  'Costas': 'verso',
  'Tríceps': 'verso',
  'Glúteos': 'verso',
  'Posterior de Coxa': 'verso',
  'Panturrilha/Canela': 'verso',
};

// Map muscles to their SVG filename prefix
const MUSCLE_SVG_PREFIXES: Record<string, string> = {
  'Peito': 'peito-frente',
  'Bíceps': 'biceps-frente',
  'Antebraço': 'antebraco-frente',
  'Quadríceps': 'quadriceps-frente',
  'Abdômen': 'abdomen-frente',
  'Ombro': 'ombro-frente',
  'Costas': 'costas-verso',
  'Tríceps': 'triceps-verso',
  'Glúteos': 'gluteos-verso',
  'Posterior de Coxa': 'posterior-coxa-verso',
  'Panturrilha/Canela': 'panturrilha-verso',
};

// Micro-adjusted dot coordinates based on user visual feedback
const FRONT_DOTS: Dot[] = [
  { muscle: 'Ombro', left: '31%', top: '30%' },
  { muscle: 'Ombro', left: '69%', top: '30%' },
  { muscle: 'Peito', left: '50%', top: '31%' },
  { muscle: 'Bíceps', left: '31%', top: '37%' },
  { muscle: 'Bíceps', left: '69%', top: '37%' },
  { muscle: 'Antebraço', left: '21%', top: '41%' },
  { muscle: 'Antebraço', left: '79%', top: '41%' },
  { muscle: 'Abdômen', left: '50%', top: '43%' },
  { muscle: 'Quadríceps', left: '40%', top: '66%' },
  { muscle: 'Quadríceps', left: '60%', top: '66%' },
];

const BACK_DOTS: Dot[] = [
  { muscle: 'Costas', left: '50%', top: '31%' },
  { muscle: 'Tríceps', left: '31%', top: '37%' },
  { muscle: 'Tríceps', left: '69%', top: '37%' },
  { muscle: 'Glúteos', left: '41%', top: '53%' },
  { muscle: 'Glúteos', left: '59%', top: '53%' },
  { muscle: 'Posterior de Coxa', left: '40%', top: '69%' },
  { muscle: 'Posterior de Coxa', left: '60%', top: '69%' },
  { muscle: 'Panturrilha/Canela', left: '38%', top: '87%' },
  { muscle: 'Panturrilha/Canela', left: '62%', top: '87%' },
];

export default function BodyMap({ selectedMuscle, onMuscleSelect }: BodyMapProps) {
  const [side, setSide] = useState<'frente' | 'verso'>('frente');

  // Auto flip body side if selected muscle is on the other side
  useEffect(() => {
    if (selectedMuscle && MUSCLE_SIDES[selectedMuscle]) {
      setSide(MUSCLE_SIDES[selectedMuscle]);
    }
  }, [selectedMuscle]);

  // Determine current SVG path
  const getSvgPath = () => {
    if (!selectedMuscle || MUSCLE_SIDES[selectedMuscle] !== side) {
      return side === 'frente' 
        ? '/images/body-map/corpo-base-frente.svg' 
        : '/images/body-map/corpo-base-verso.svg';
    }
    const prefix = MUSCLE_SVG_PREFIXES[selectedMuscle];
    return `/images/body-map/${prefix}.svg`;
  };

  const dotsList = side === 'frente' ? FRONT_DOTS : BACK_DOTS;

  return (
    <div className="flex flex-col items-center space-y-4 bg-slate-card border border-border rounded-2xl p-4 shadow-lg w-full max-w-sm mx-auto">
      {/* Interactive Body Image Container with Exact Aspect Ratio (250x422 = 0.592) */}
      <div className="relative w-[250px] h-[422px] overflow-hidden flex items-center justify-center select-none">
        
        {/* Floating Side Info */}
        <div className="absolute top-2 left-2 pointer-events-none z-10">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-900/80 border border-border/50 px-2 py-0.5 rounded backdrop-blur-sm shadow">
            {side}
          </span>
        </div>

        {/* Floating Rotation Button */}
        <button
          type="button"
          onClick={() => {
            const nextSide = side === 'frente' ? 'verso' : 'frente';
            setSide(nextSide);
            // Clear selection if it is on the other side
            if (selectedMuscle && MUSCLE_SIDES[selectedMuscle] !== nextSide) {
              onMuscleSelect('');
            }
          }}
          className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700/80 text-lime-neon p-2.5 rounded-full border border-border/50 backdrop-blur-sm shadow-md transition-all active:scale-95 z-20 cursor-pointer"
          title="Girar Boneco (Frente/Verso)"
          aria-label="Girar boneco"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        {/* SVG Base Image */}
        <img
          src={getSvgPath()}
          alt={`Mapa do corpo - ${side}`}
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Floating Pulsing Indicator Dots Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {dotsList.map((dot, idx) => {
            const isSelected = selectedMuscle === dot.muscle;
            return (
              <div
                key={`${side}-dot-${idx}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30"
                style={{ left: dot.left, top: dot.top }}
              >
                <button
                  type="button"
                  onClick={() => onMuscleSelect(dot.muscle)}
                  className="group relative flex items-center justify-center w-10 h-10 cursor-pointer"
                  title={dot.muscle}
                  aria-label={`Selecionar ${dot.muscle}`}
                >
                  {/* Outer pulsing neon glow halo */}
                  <span className={`absolute w-6 h-6 rounded-full border border-lime-neon/75 bg-lime-neon/15 transition-all ${
                    isSelected 
                      ? 'scale-125 border-lime-neon bg-lime-neon/30 animate-pulse' 
                      : 'scale-100 group-hover:scale-125 group-hover:border-lime-neon animate-ping opacity-60'
                  }`} />
                  
                  {/* Central core dot */}
                  <span className={`w-2.5 h-2.5 rounded-full border border-slate-900 transition-all ${
                    isSelected ? 'bg-lime-neon scale-125' : 'bg-slate-300 group-hover:bg-lime-neon'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Muscle Display & Clear Button */}
      {selectedMuscle && (
        <div className="flex items-center justify-between w-full border-t border-border/40 pt-3">
          <span className="text-xs text-slate-400">Selecionado: <strong className="text-lime-neon">{selectedMuscle}</strong></span>
          <button
            type="button"
            onClick={() => onMuscleSelect('')}
            className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

interface BodyMapProps {
  selectedMuscle: string;
  onMuscleSelect: (muscle: string) => void;
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

  return (
    <div className="flex flex-col items-center space-y-4 bg-slate-card border border-border rounded-2xl p-5 shadow-lg max-w-sm mx-auto">
      {/* Side Toggle */}
      <div className="flex bg-slate-card-light p-1 rounded-xl w-full max-w-[200px]">
        <button
          onClick={() => {
            setSide('frente');
            // If selecting side, clear selection if it was on the other side
            if (selectedMuscle && MUSCLE_SIDES[selectedMuscle] !== 'frente') {
              onMuscleSelect('');
            }
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            side === 'frente' 
              ? 'bg-lime-neon text-slate-900' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Frente
        </button>
        <button
          onClick={() => {
            setSide('verso');
            // If selecting side, clear selection if it was on the other side
            if (selectedMuscle && MUSCLE_SIDES[selectedMuscle] !== 'verso') {
              onMuscleSelect('');
            }
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            side === 'verso' 
              ? 'bg-lime-neon text-slate-900' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Verso
        </button>
      </div>

      {/* Interactive Body Image Container */}
      <div className="relative w-[280px] h-[360px] bg-slate-950/20 rounded-xl border border-border/30 overflow-hidden flex items-center justify-center p-4">
        {/* SVG Base Image */}
        <img
          src={getSvgPath()}
          alt={`Mapa do corpo - ${side}`}
          className="w-full h-full object-contain pointer-events-none select-none transition-all duration-300"
        />

        {/* Absolute Touch Hot-spots */}
        {side === 'frente' ? (
          <>
            {/* Ombro */}
            <button
              onClick={() => onMuscleSelect('Ombro')}
              className="absolute left-[20%] top-[12%] w-[60%] h-[10%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Ombro"
              aria-label="Selecionar Ombro"
            />
            {/* Peito */}
            <button
              onClick={() => onMuscleSelect('Peito')}
              className="absolute left-[28%] top-[21%] w-[44%] h-[9%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Peito"
              aria-label="Selecionar Peito"
            />
            {/* Abdômen */}
            <button
              onClick={() => onMuscleSelect('Abdômen')}
              className="absolute left-[33%] top-[30%] w-[34%] h-[12%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Abdômen"
              aria-label="Selecionar Abdômen"
            />
            {/* Bíceps (Left & Right) */}
            <button
              onClick={() => onMuscleSelect('Bíceps')}
              className="absolute left-[13%] top-[23%] w-[12%] h-[12%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Bíceps"
              aria-label="Selecionar Bíceps"
            />
            <button
              onClick={() => onMuscleSelect('Bíceps')}
              className="absolute right-[13%] top-[23%] w-[12%] h-[12%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Bíceps"
              aria-label="Selecionar Bíceps"
            />
            {/* Antebraço (Left & Right) */}
            <button
              onClick={() => onMuscleSelect('Antebraço')}
              className="absolute left-[6%] top-[35%] w-[14%] h-[16%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Antebraço"
              aria-label="Selecionar Antebraço"
            />
            <button
              onClick={() => onMuscleSelect('Antebraço')}
              className="absolute right-[6%] top-[35%] w-[14%] h-[16%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Antebraço"
              aria-label="Selecionar Antebraço"
            />
            {/* Quadríceps */}
            <button
              onClick={() => onMuscleSelect('Quadríceps')}
              className="absolute left-[28%] top-[45%] w-[44%] h-[20%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Quadríceps"
              aria-label="Selecionar Quadríceps"
            />
          </>
        ) : (
          <>
            {/* Costas */}
            <button
              onClick={() => onMuscleSelect('Costas')}
              className="absolute left-[28%] top-[14%] w-[44%] h-[20%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Costas"
              aria-label="Selecionar Costas"
            />
            {/* Tríceps (Left & Right) */}
            <button
              onClick={() => onMuscleSelect('Tríceps')}
              className="absolute left-[13%] top-[20%] w-[12%] h-[15%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Tríceps"
              aria-label="Selecionar Tríceps"
            />
            <button
              onClick={() => onMuscleSelect('Tríceps')}
              className="absolute right-[13%] top-[20%] w-[12%] h-[15%] rounded-full cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Tríceps"
              aria-label="Selecionar Tríceps"
            />
            {/* Glúteos */}
            <button
              onClick={() => onMuscleSelect('Glúteos')}
              className="absolute left-[28%] top-[37%] w-[44%] h-[12%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Glúteos"
              aria-label="Selecionar Glúteos"
            />
            {/* Posterior de Coxa */}
            <button
              onClick={() => onMuscleSelect('Posterior de Coxa')}
              className="absolute left-[28%] top-[50%] w-[44%] h-[18%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Posterior de Coxa"
              aria-label="Selecionar Posterior de Coxa"
            />
            {/* Panturrilha */}
            <button
              onClick={() => onMuscleSelect('Panturrilha/Canela')}
              className="absolute left-[26%] top-[69%] w-[48%] h-[18%] rounded cursor-pointer hover:bg-lime-neon/10 transition-colors"
              title="Panturrilha/Canela"
              aria-label="Selecionar Panturrilha/Canela"
            />
          </>
        )}
      </div>

      {/* Selected Muscle Display & Clear Button */}
      {selectedMuscle && (
        <div className="flex items-center justify-between w-full border-t border-border/40 pt-3">
          <span className="text-xs text-slate-400">Selecionado: <strong className="text-lime-neon">{selectedMuscle}</strong></span>
          <button
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

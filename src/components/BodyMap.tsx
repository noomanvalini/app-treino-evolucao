'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

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

        {/* Absolute Touch Hot-spots (Mapped to exact SVG viewBox coordinates) */}
        {side === 'frente' ? (
          <>
            {/* Ombro */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Ombro')}
              className="absolute left-[26%] top-[10%] w-[48%] h-[9%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Ombro"
              aria-label="Selecionar Ombro"
            />
            {/* Peito */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Peito')}
              className="absolute left-[36%] top-[19%] w-[28%] h-[9%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Peito"
              aria-label="Selecionar Peito"
            />
            {/* Abdômen */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Abdômen')}
              className="absolute left-[37%] top-[29%] w-[26%] h-[12%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Abdômen"
              aria-label="Selecionar Abdômen"
            />
            {/* Bíceps (Left & Right relative to screen) */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Bíceps')}
              className="absolute left-[20%] top-[21%] w-[13%] h-[10%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Bíceps"
              aria-label="Selecionar Bíceps"
            />
            <button
              type="button"
              onClick={() => onMuscleSelect('Bíceps')}
              className="absolute right-[20%] top-[21%] w-[13%] h-[10%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Bíceps"
              aria-label="Selecionar Bíceps"
            />
            {/* Antebraço (Left & Right relative to screen) */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Antebraço')}
              className="absolute left-[11%] top-[31%] w-[15%] h-[15%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Antebraço"
              aria-label="Selecionar Antebraço"
            />
            <button
              type="button"
              onClick={() => onMuscleSelect('Antebraço')}
              className="absolute right-[11%] top-[31%] w-[15%] h-[15%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Antebraço"
              aria-label="Selecionar Antebraço"
            />
            {/* Quadríceps */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Quadríceps')}
              className="absolute left-[34%] top-[43%] w-[32%] h-[22%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Quadríceps"
              aria-label="Selecionar Quadríceps"
            />
          </>
        ) : (
          <>
            {/* Costas */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Costas')}
              className="absolute left-[34%] top-[13%] w-[32%] h-[22%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Costas"
              aria-label="Selecionar Costas"
            />
            {/* Tríceps (Left & Right relative to screen) */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Tríceps')}
              className="absolute left-[20%] top-[19%] w-[13%] h-[12%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Tríceps"
              aria-label="Selecionar Tríceps"
            />
            <button
              type="button"
              onClick={() => onMuscleSelect('Tríceps')}
              className="absolute right-[20%] top-[19%] w-[13%] h-[12%] rounded-full cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Tríceps"
              aria-label="Selecionar Tríceps"
            />
            {/* Glúteos */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Glúteos')}
              className="absolute left-[34%] top-[35%] w-[32%] h-[10%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Glúteos"
              aria-label="Selecionar Glúteos"
            />
            {/* Posterior de Coxa */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Posterior de Coxa')}
              className="absolute left-[34%] top-[46%] w-[32%] h-[18%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
              title="Posterior de Coxa"
              aria-label="Selecionar Posterior de Coxa"
            />
            {/* Panturrilha */}
            <button
              type="button"
              onClick={() => onMuscleSelect('Panturrilha/Canela')}
              className="absolute left-[32%] top-[65%] w-[36%] h-[20%] rounded cursor-pointer hover:bg-lime-neon/15 active:bg-lime-neon/20 transition-colors"
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

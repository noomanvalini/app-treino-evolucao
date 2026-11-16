'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

export type PaletteMode = 'contrast' | 'olive';

interface PaletteContextType {
  palette: PaletteMode;
  setPalette: (mode: PaletteMode) => void;
  togglePalette: () => void;
  isContrast: boolean;
}

const PaletteContext = createContext<PaletteContextType>({
  palette: 'contrast',
  setPalette: () => {},
  togglePalette: () => {},
  isContrast: true
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteMode>('contrast');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('clipzbody_ui_palette') as PaletteMode | null;
      if (saved === 'contrast' || saved === 'olive') {
        setPaletteState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setPalette = (mode: PaletteMode) => {
    setPaletteState(mode);
    try {
      localStorage.setItem('clipzbody_ui_palette', mode);
    } catch {
      // ignore
    }
  };

  const togglePalette = () => {
    setPalette(palette === 'contrast' ? 'olive' : 'contrast');
  };

  return (
    <PaletteContext.Provider
      value={{
        palette,
        setPalette,
        togglePalette,
        isContrast: palette === 'contrast'
      }}
    >
      {children}

      {/* Floating Palette Switcher for instant A/B visual comparison */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
        <button
          type="button"
          onClick={togglePalette}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.6)] border transition-all active:scale-95 ${
            palette === 'contrast'
              ? 'bg-[#f4f4f0] text-[#0e0f07] border-[#ffb95f]'
              : 'bg-[#2a2b21] text-[#d3e156] border-[#d3e156]/50'
          }`}
          title="Alternar entre as duas paletas para comparação"
        >
          <Palette className="w-3.5 h-3.5 shrink-0 text-[#f97316]" />
          <span>
            Paleta: {palette === 'contrast' ? 'Nova (Contraste)' : 'Verde Oliva'}
          </span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] uppercase ${
              palette === 'contrast'
                ? 'bg-[#0e0f07] text-[#ffb95f]'
                : 'bg-[#151413] text-[#f8fafc]'
            }`}
          >
            Trocar
          </span>
        </button>
      </div>
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}

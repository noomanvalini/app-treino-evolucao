'use client';

import React, { createContext, useContext } from 'react';

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
  return (
    <PaletteContext.Provider
      value={{
        palette: 'contrast',
        setPalette: () => {},
        togglePalette: () => {},
        isContrast: true
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  return useContext(PaletteContext);
}

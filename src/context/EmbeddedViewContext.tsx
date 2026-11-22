'use client';

import React, { createContext, useContext } from 'react';

const EmbeddedViewContext = createContext<boolean>(false);

export function EmbeddedViewProvider({
  embedded = true,
  children,
}: {
  embedded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <EmbeddedViewContext.Provider value={embedded}>
      {children}
    </EmbeddedViewContext.Provider>
  );
}

export function useIsEmbeddedView(): boolean {
  return useContext(EmbeddedViewContext);
}

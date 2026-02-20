'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type NewsPanelContextValue = {
  openNewsPanel: boolean;
  setOpenNewsPanel: (open: boolean) => void;
};

const NewsPanelContext = createContext<NewsPanelContextValue | null>(null);

export function NewsPanelProvider({ children }: { children: ReactNode }) {
  const [openNewsPanel, setOpenNewsPanel] = useState(false);
  return (
    <NewsPanelContext.Provider value={{ openNewsPanel, setOpenNewsPanel }}>
      {children}
    </NewsPanelContext.Provider>
  );
}

export function useNewsPanel() {
  const ctx = useContext(NewsPanelContext);
  if (!ctx) {
    return {
      openNewsPanel: false,
      setOpenNewsPanel: (_: boolean) => {},
    };
  }
  return ctx;
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SettingsLayoutExpandContextValue = {
  contentExpanded: boolean;
  setContentExpanded: (expanded: boolean) => void;
  toggleContentExpanded: () => void;
};

const SettingsLayoutExpandContext = createContext<SettingsLayoutExpandContextValue | null>(
  null
);

export function SettingsLayoutExpandProvider({ children }: { children: ReactNode }) {
  const [contentExpanded, setContentExpanded] = useState(false);
  const toggleContentExpanded = useCallback(
    () => setContentExpanded((prev) => !prev),
    []
  );

  const value = useMemo(
    () => ({
      contentExpanded,
      setContentExpanded,
      toggleContentExpanded,
    }),
    [contentExpanded, toggleContentExpanded]
  );

  return (
    <SettingsLayoutExpandContext.Provider value={value}>
      {children}
    </SettingsLayoutExpandContext.Provider>
  );
}

export function useSettingsLayoutExpand() {
  return useContext(SettingsLayoutExpandContext);
}

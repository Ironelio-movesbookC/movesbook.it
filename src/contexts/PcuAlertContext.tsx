'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { PcuAlertDisplayPayload } from '@/lib/admin/userPcuAlertMsg';
import UserPcuAlertModal from '@/components/user/UserPcuAlertModal';
import { consumePendingPcuAlert } from '@/lib/user/pcuAlertClient';

type PcuAlertContextValue = {
  showAlert: (alert: PcuAlertDisplayPayload, onDismiss?: () => void) => void;
};

const PcuAlertContext = createContext<PcuAlertContextValue | null>(null);

export function PcuAlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState<PcuAlertDisplayPayload | null>(null);
  const [onDismiss, setOnDismiss] = useState<(() => void) | undefined>(undefined);

  const showAlert = useCallback(
    (next: PcuAlertDisplayPayload, dismissCallback?: () => void) => {
      setAlert(next);
      setOnDismiss(() => dismissCallback);
      setOpen(true);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setAlert(null);
    const cb = onDismiss;
    setOnDismiss(undefined);
    cb?.();
  }, [onDismiss]);

  useEffect(() => {
    const pending = consumePendingPcuAlert();
    if (pending) {
      showAlert(pending);
    }
  }, [showAlert]);

  return (
    <PcuAlertContext.Provider value={{ showAlert }}>
      {children}
      <UserPcuAlertModal open={open} alert={alert} onClose={handleClose} />
    </PcuAlertContext.Provider>
  );
}

export function usePcuAlert(): PcuAlertContextValue {
  const ctx = useContext(PcuAlertContext);
  if (!ctx) {
    throw new Error('usePcuAlert must be used within PcuAlertProvider');
  }
  return ctx;
}

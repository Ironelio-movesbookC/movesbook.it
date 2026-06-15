'use client';

import { createElement, Fragment, useCallback, useState } from 'react';
import PromocodeAlertModal from './PromocodeAlertModal';
import PromocodeConfirmModal from './PromocodeConfirmModal';

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function usePromocodeDialogs() {
  const [alertState, setAlertState] = useState<{ title: string; message: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showAlert = useCallback((message: string, title = 'Notice') => {
    setAlertState({ title, message });
  }, []);

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void | Promise<void>, options?: ConfirmOptions) => {
      setConfirmState({
        title: options?.title ?? 'Confirm',
        message,
        confirmLabel: options?.confirmLabel,
        destructive: options?.destructive,
        onConfirm,
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    if (confirmLoading) return;
    setConfirmState(null);
  }, [confirmLoading]);

  const handleConfirm = useCallback(async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmState]);

  const dialogs = createElement(
    Fragment,
    null,
    createElement(PromocodeAlertModal, {
      open: !!alertState,
      title: alertState?.title,
      message: alertState?.message ?? '',
      onClose: () => setAlertState(null),
    }),
    createElement(PromocodeConfirmModal, {
      open: !!confirmState,
      title: confirmState?.title,
      message: confirmState?.message ?? '',
      confirmLabel: confirmState?.confirmLabel,
      destructive: confirmState?.destructive,
      loading: confirmLoading,
      onClose: closeConfirm,
      onConfirm: () => void handleConfirm(),
    })
  );

  return { showAlert, showConfirm, dialogs };
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

type SuperAdminPasswordConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onClose: () => void;
  onVerified: (password: string) => void | Promise<void>;
};

export default function SuperAdminPasswordConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  onClose,
  onVerified,
}: SuperAdminPasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setError(null);
    setBusy(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError('Enter the super admin password.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let username: string | undefined;
      try {
        const raw = localStorage.getItem('adminUser');
        if (raw) {
          const parsed = JSON.parse(raw) as { username?: string; email?: string };
          username = parsed.username?.trim() || parsed.email?.trim();
        }
      } catch {
        username = undefined;
      }

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        setError('Admin session not found. Please log in again.');
        return;
      }

      const res = await fetch('/api/admin/verify-action-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ password: trimmed, username }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        success?: boolean;
        error?: string;
      };
      const ok = res.ok && (data.valid === true || data.success === true);
      if (!ok) {
        setError(data.error || 'Invalid super admin password.');
        return;
      }
      await onVerified(trimmed);
    } catch {
      setError('Could not verify password. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="super-admin-confirm-title"
    >
      <div className="relative w-full max-w-md border border-gray-400 bg-[#f3f3f3] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute right-3 top-3 z-10 rounded p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          id="super-admin-confirm-title"
          className="bg-[#6b1020] px-4 py-2.5 pr-10 text-sm font-semibold text-white"
        >
          {title}
        </div>

        <div className="space-y-4 p-5">
          <div className="text-sm text-gray-700">{description}</div>
          <div>
            <label htmlFor="super-admin-password" className="mb-1 block text-sm text-gray-800">
              Super admin password
            </label>
            <input
              id="super-admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void handleConfirm();
              }}
              autoFocus
              disabled={busy}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
              placeholder="Enter super admin password"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-center gap-4 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirm()}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-8 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                confirmLabel
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-gray-900 bg-gradient-to-b from-gray-700 to-black px-8 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

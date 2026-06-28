'use client';

import React, { useEffect, useState } from 'react';
import { X, Unlink, Loader2 } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  globalEntryId: string;
  planTitle: string;
  /** Label for the item type in UI copy (e.g. "workout", "weekly plan"). */
  itemKind?: string;
  onUnshared?: () => void;
};

export default function UnshareWeeklyPlanModal({
  isOpen,
  onClose,
  globalEntryId,
  planTitle,
  itemKind = 'weekly plan',
  onUnshared,
}: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setError(null);
    setIsSubmitting(false);
  }, [isOpen, globalEntryId]);

  const handleUnshare = async () => {
    if (!password.trim()) {
      setError('Enter your personal password to confirm.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/workouts/unshare-from-global', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          globalEntryId,
          password: password.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unshare');
      }
      alert(
        data.message ||
          `${itemKind.charAt(0).toUpperCase() + itemKind.slice(1)} removed from Global archive of shared workouts & weekly plans.`
      );
      onUnshared?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unshare');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-red-700 to-red-900 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlink className="w-5 h-5" />
              <h2 className="text-lg font-bold">Unshare {itemKind}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isSubmitting}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">
              Remove <strong>{planTitle}</strong> from the{' '}
              <strong>Global archive of shared workouts &amp; weekly plans</strong>. Other users will
              no longer be able to import this {itemKind}.
            </p>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Type your personal Movesbook password to confirm.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmitting) void handleUnshare();
                }}
                autoFocus
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Your password"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUnshare()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Removing…
                </>
              ) : (
                'Unshare'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

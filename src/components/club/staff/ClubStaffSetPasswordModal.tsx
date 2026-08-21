'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  onClose: () => void;
  /** Create: store password in parent form. Edit: persist via API. */
  onSave: (payload: {
    oldPassword: string;
    newPassword: string;
  }) => Promise<void>;
};

export default function ClubStaffSetPasswordModal({ isOpen, mode, onClose, onSave }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forgotHint, setForgotHint] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSaving(false);
    setForgotHint(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Set Staff Password' : 'Change Staff Password';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotHint(false);

    if (mode === 'edit' && !oldPassword) {
      setError('Please enter the old password.');
      return;
    }
    if (!newPassword) {
      setError('Please enter the new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ oldPassword, newPassword });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-staff-password-title"
    >
      <div className="relative w-full max-w-md rounded-md border border-gray-400 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute right-3 top-3 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2
          id="club-staff-password-title"
          className="border-b border-gray-200 px-6 pb-3 pt-5 text-center text-lg font-semibold text-red-700"
        >
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {mode === 'edit' ? (
            <div>
              <label htmlFor="staff-old-password" className="mb-1 block text-sm text-gray-800">
                Old Password
              </label>
              <input
                id="staff-old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={saving}
                autoComplete="current-password"
                className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
              />
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
                onClick={() => setForgotHint(true)}
              >
                Forgot your password?
              </button>
              {forgotHint ? (
                <p className="mt-1 text-xs text-gray-600">
                  Use Forgot password on the login page with this staff username or email.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="staff-new-password" className="mb-1 block text-sm text-gray-800">
              New Password
            </label>
            <input
              id="staff-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="staff-confirm-password" className="mb-1 block text-sm text-gray-800">
              Confirm Password
            </label>
            <input
              id="staff-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <p className="text-xs text-gray-500">
            This password is used to log in to the club account as staff.
          </p>

          <div className="flex justify-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded border border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-8 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded border border-gray-700 bg-gradient-to-b from-gray-600 to-gray-900 px-8 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { UserPlus, UserCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNewUser?: (data: {
    password: string;
    username?: string;
    name?: string;
    email?: string;
  }) => void | Promise<void>;
  onAddExistingUser?: (data: {
    username: string;
    password: string;
  }) => void | Promise<void>;
  entityType?: 'club' | 'team' | 'group' | 'coaching-group';
  /** Hide the “from scratch” option until that flow is implemented. */
  hideNewUserOption?: boolean;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  onAddNewUser,
  onAddExistingUser,
  hideNewUserOption = false,
}: AddMemberModalProps) {
  const [activeOption, setActiveOption] = useState<'new' | 'existing' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [existingUsername, setExistingUsername] = useState('');
  const [existingPassword, setExistingPassword] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setActiveOption(null);
    setExistingUsername('');
    setExistingPassword('');
    setNewUsername('');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setShowPassword(false);
    setSubmitting(false);
    setError('');
  };

  const handleCancel = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleBack = () => {
    if (submitting) return;
    setActiveOption(null);
    setError('');
    setExistingUsername('');
    setExistingPassword('');
    setNewUsername('');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setShowPassword(false);
  };

  const handleSubmitExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingUsername.trim() || !existingPassword || !onAddExistingUser || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await onAddExistingUser({
        username: existingUsername.trim(),
        password: existingPassword,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !onAddNewUser || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await onAddNewUser({
        password: newPassword,
        username: newUsername || undefined,
        name: newName || undefined,
        email: newEmail || undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-red-700 px-6 py-4">
          <h2 className="text-lg font-bold text-white">Add a new member</h2>
          <ArrowRight className="h-5 w-5 text-white" />
        </div>

        {!activeOption && (
          <div className="space-y-3 p-6">
            {!hideNewUserOption && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setActiveOption('new');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-700"
              >
                <UserPlus className="h-5 w-5" />
                <span>Add a new user from scratch</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setError('');
                setActiveOption('existing');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-700"
            >
              <UserCheck className="h-5 w-5" />
              <span>Add an existing user of Movesbook</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-lg bg-gray-800 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        {activeOption === 'existing' && (
          <form onSubmit={handleSubmitExistingUser} className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Enter the Movesbook username and password of the user to add as a club member.
            </p>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={existingUsername}
                onChange={(e) => setExistingUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Type his/her username"
                autoComplete="username"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={existingPassword}
                  onChange={(e) => setExistingPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Type his/her password"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="flex-1 rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
              >
                {submitting ? 'Adding…' : 'OK'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="w-full rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </form>
        )}

        {activeOption === 'new' && (
          <form onSubmit={handleSubmitNewUser} className="space-y-4 p-6">
            {!onAddNewUser ? (
              <p className="text-sm text-amber-700">
                Adding a brand-new user from scratch is not available yet. Use “Add an existing user of
                Movesbook” instead.
              </p>
            ) : null}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Type password"
                  required
                  disabled={submitting || !onAddNewUser}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="flex-1 rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !onAddNewUser}
                className="flex-1 rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
              >
                {submitting ? 'Adding…' : 'OK'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="w-full rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

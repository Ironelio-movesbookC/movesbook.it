'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Key, ChevronRight, User } from 'lucide-react';

type HeaderInfo = {
  fullName: string;
  role: string;
  imageUrl: string | null;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export default function OperatorPasswordSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState<'main' | 'alt' | ''>('');

  const [header, setHeader] = useState<HeaderInfo>({
    fullName: '—',
    role: 'Operator',
    imageUrl: null,
  });

  // Change password (main)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  // Alternate password
  const [alternateOneAccessOnly, setAlternateOneAccessOnly] = useState(false);
  const [alternatePassword, setAlternatePassword] = useState('');
  const [alternateRepeatPassword, setAlternateRepeatPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      setSuccess('');
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setLoadError('Admin session not found. Please login again.');
          return;
        }

        const res = await fetch(`/api/admin/operators/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load operator');
        const o = data?.operator || {};
        const fullName = `${String(o.name ?? '')} ${String(o.surname ?? '')}`.trim() || '—';
        const imageUrl = o.imageUrl ? String(o.imageUrl) : null;
        const role =
          o.kind === 'CO_ADMIN' ? 'Co-admin' : o.kind === 'OPERATOR' ? 'Operator' : 'Operator';
        if (!cancelled) {
          setHeader({ fullName, role, imageUrl });
          setAlternateOneAccessOnly(Boolean(o.alternatePasswordOneAccessOnly));
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load operator');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleResetPassword = async () => {
    setLoadError('');
    setSuccess('');
    if (!oldPassword || !newPassword) {
      setLoadError('Please enter old and new password.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setLoadError('Repeat password does not match.');
      return;
    }
    if (newPassword.length < 6) {
      setLoadError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting('main');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      const res = await fetch(`/api/admin/operators/${id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update password');

      setSuccess('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setRepeatPassword('');
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to update password');
    } finally {
      setSubmitting('');
    }
  };

  const handleResetAlternatePassword = async () => {
    setLoadError('');
    setSuccess('');
    if (!alternatePassword) {
      setLoadError('Please enter alternate password.');
      return;
    }
    if (alternatePassword !== alternateRepeatPassword) {
      setLoadError('Repeat password does not match.');
      return;
    }
    if (alternatePassword.length < 6) {
      setLoadError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting('alt');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      const res = await fetch(`/api/admin/operators/${id}/alternate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: alternatePassword,
          oneAccessOnly: alternateOneAccessOnly,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to set alternate password');

      setSuccess(
        alternateOneAccessOnly
          ? 'Alternate password set. It can be used once; it will be removed after logout.'
          : 'Alternate password set successfully.',
      );
      setAlternatePassword('');
      setAlternateRepeatPassword('');
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to set alternate password');
    } finally {
      setSubmitting('');
    }
  };

  return (
    <div className="min-h-full bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {(loadError || success || loading) && (
          <div
            className={`rounded border px-4 py-3 text-sm ${
              loadError
                ? 'border-red-200 bg-red-50 text-red-700'
                : success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {loadError ? loadError : success ? success : 'Loading...'}
          </div>
        )}

        {/* Header block */}
        <section className="bg-white rounded border border-gray-300 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300 flex-shrink-0">
              {header.imageUrl ? (
                isDataUrl(header.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={header.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={header.imageUrl} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <User className="w-7 h-7 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{header.fullName}</p>
              <p className="text-sm text-red-600 font-medium">{header.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/operators/profile/${id}`)}
            className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded"
          >
            Delete Profile
          </button>
        </section>

        {/* Password (main) */}
        <section className="bg-white rounded border border-gray-300">
          <div className="px-4 py-2 bg-gray-200 border-b border-gray-300 flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-600" />
            <div className="font-semibold text-gray-800">Password</div>
          </div>
          <div className="p-6">
            <div className="font-semibold text-gray-800 mb-4">Change Password</div>
            <div className="space-y-3 max-w-md">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm text-gray-700 text-right">Old Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm text-gray-700 text-right">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm text-gray-700 text-right">Repeat Password</label>
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={submitting !== '' || loading}
                className="flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm rounded mt-2 w-fit"
              >
                {submitting === 'main' ? 'Updating…' : 'Reset Password'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Alternate Password */}
        <section className="bg-white rounded border border-gray-300">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800">Alternate Password</div>
              <div className="text-xs text-red-600">(you can give it to others for temporary use)</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={alternateOneAccessOnly}
                onChange={(e) => setAlternateOneAccessOnly(e.target.checked)}
                className="rounded border-gray-400"
              />
              set as 1 acces only
            </label>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-3 max-w-md">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm text-gray-700 text-right">Password</label>
                <input
                  type="password"
                  value={alternatePassword}
                  onChange={(e) => setAlternatePassword(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                  placeholder="(with this password you cant access to this mask)"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm text-gray-700 text-right">Repeat Password</label>
                <input
                  type="password"
                  value={alternateRepeatPassword}
                  onChange={(e) => setAlternateRepeatPassword(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleResetAlternatePassword}
                disabled={submitting !== '' || loading}
                className="flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm rounded mt-2 w-fit"
              >
                {submitting === 'alt' ? 'Updating…' : 'Reset Password'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


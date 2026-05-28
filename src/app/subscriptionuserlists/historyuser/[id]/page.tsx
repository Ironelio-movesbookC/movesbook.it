'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import UserPcuControlPanel from '@/components/admin/UserPcuControlPanel';
import { navScopeToProfileSegment, type PcuPanelPayload } from '@/lib/admin/userPcuPanel';

type SubscriptionRow = {
  id: string;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  username: string;
  companyName: string;
  e: string;
  status: string;
};

export default function HistoryUserPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<PcuPanelPayload | null>(null);
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionRow[]>([]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please log in as admin.');
        setUser(null);
        return;
      }

      const scopeParam = searchParams?.get('scope') ?? '';
      const segmentParam = searchParams?.get('segment') ?? '';
      const segment =
        navScopeToProfileSegment(segmentParam || scopeParam) ||
        segmentParam ||
        '';

      const qs = new URLSearchParams();
      if (segment) qs.set('segment', segment);

      const res = await fetch(
        `/api/admin/registered-users/${encodeURIComponent(userId)}/profile?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load user profile');

      const panel = data.pcuPanel as PcuPanelPayload | undefined;
      if (!panel || typeof panel !== 'object') {
        throw new Error('Profile data is not available for this user.');
      }

      setUser(panel);
      setSubscriptionRows(Array.isArray(data.subscriptionRows) ? (data.subscriptionRows as SubscriptionRow[]) : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setUser(null);
      setSubscriptionRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, searchParams]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const backHref = (() => {
    const scope = searchParams?.get('scope');
    const q = searchParams?.get('q');
    if (scope) {
      const p = new URLSearchParams();
      p.set('scope', scope);
      if (q) p.set('q', q);
      return `/admin/user-search?${p.toString()}`;
    }
    return user?.adminSegmentPath ?? '/admin/dashboard';
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading user profile…</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="px-6 py-12">
        <div className="max-w-lg mx-auto text-center space-y-4">
          <p className="text-red-700">{error || 'User not found'}</p>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-teal-700 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 sm:px-4">
      <UserPcuControlPanel user={user} backHref={backHref} subscriptionRows={subscriptionRows} />
    </div>
  );
}

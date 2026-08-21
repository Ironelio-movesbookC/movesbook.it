'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AdminPcuUserOverview from '@/components/admin/AdminPcuUserOverview';
import UserPcuControlPanel from '@/components/admin/UserPcuControlPanel';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';
import {
  buildPcuHistoryUserUrl,
  resolvePcuDefaultTab,
  resolvePcuProfileSubTab,
} from '@/lib/admin/pcuHistoryUserUrl';
import { navScopeToProfileSegment, type PcuPanelPayload } from '@/lib/admin/userPcuPanel';
import type { PcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';
import type { ProfilePanelSettings } from '@/lib/admin/userProfilePanelSettings';
import type { PcuSettings } from '@/lib/admin/userPcuSettings';

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
  const [profilePanel, setProfilePanel] = useState<ProfilePanelSettings | undefined>();
  const [pcuAccess, setPcuAccess] = useState<PcuAccessSettings | undefined>();
  const [actionSegment, setActionSegment] = useState('');
  const [pcuSettings, setPcuSettings] = useState<PcuSettings | null>(null);

  const scope = searchParams?.get('scope') ?? '';
  const q = searchParams?.get('q') ?? '';
  const clubId = searchParams?.get('clubId') ?? '';
  const isOverview = searchParams?.get('view') === 'overview';

  const urlOpts = useMemo(() => ({ scope, q, clubId: clubId || null }), [scope, q, clubId]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const token = getAdminBearerToken();
      if (!token) {
        setError('Admin session not found. Please log in as admin.');
        setUser(null);
        return;
      }

      const segmentParam = searchParams?.get('segment') ?? '';
      const segment =
        navScopeToProfileSegment(segmentParam || scope) ||
        (['coaches', 'teams', 'clubs', 'groups', 'single-user', 'all'].includes(segmentParam)
          ? segmentParam
          : '');

      setActionSegment(segment);

      const qs = new URLSearchParams();
      if (segment) qs.set('segment', segment);
      if (scope) qs.set('scope', scope);
      if (q) qs.set('q', q);
      if (clubId) qs.set('clubId', clubId);

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
      setActionSegment(
        typeof data.segment === 'string' && data.segment.trim()
          ? data.segment.trim()
          : segment || panel.segment,
      );
      setSubscriptionRows(Array.isArray(data.subscriptionRows) ? (data.subscriptionRows as SubscriptionRow[]) : []);
      setProfilePanel(
        data.profilePanel && typeof data.profilePanel === 'object'
          ? (data.profilePanel as ProfilePanelSettings)
          : undefined,
      );
      setPcuAccess(
        data.pcuAccess && typeof data.pcuAccess === 'object'
          ? (data.pcuAccess as PcuAccessSettings)
          : undefined,
      );
      setPcuSettings(
        data.pcuSettings && typeof data.pcuSettings === 'object'
          ? (data.pcuSettings as PcuSettings)
          : null,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setUser(null);
      setSubscriptionRows([]);
      setProfilePanel(undefined);
      setPcuAccess(undefined);
      setPcuSettings(null);
    } finally {
      setLoading(false);
    }
  }, [userId, searchParams, scope, q, clubId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const backHref = (() => {
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

  if (isOverview) {
    return (
      <AdminPcuUserOverview
        user={user}
        pcuSettings={pcuSettings}
        backHref={backHref}
        adminSettingsHref={buildPcuHistoryUserUrl(user.userId, { ...urlOpts, tab: 'admin' })}
        profileEditHref={buildPcuHistoryUserUrl(user.userId, { ...urlOpts, tab: 'profile' })}
        purchasesHref={buildPcuHistoryUserUrl(user.userId, { ...urlOpts, tab: 'purchases' })}
        alertEditHref={buildPcuHistoryUserUrl(user.userId, { ...urlOpts, tab: 'alert' })}
        onOpenUserProfile={() => {
          if (user.dashboardPath) {
            window.open(user.dashboardPath, '_blank', 'noopener,noreferrer');
          }
        }}
      />
    );
  }

  return (
    <div className="w-full min-w-0 py-2">
      <UserPcuControlPanel
        key={`${user.userId}-${resolvePcuDefaultTab(searchParams)}-${resolvePcuProfileSubTab(searchParams)}-${clubId}`}
        user={user}
        backHref={backHref}
        subscriptionRows={subscriptionRows}
        profilePanel={profilePanel}
        initialPcuAccess={pcuAccess}
        initialPcuSettings={pcuSettings}
        defaultActiveTab={resolvePcuDefaultTab(searchParams)}
        defaultProfileSubTab={resolvePcuProfileSubTab(searchParams)}
        actionSegment={actionSegment || user.segment}
        overviewHref={buildPcuHistoryUserUrl(user.userId, { ...urlOpts, view: 'overview' })}
        onAccessDatesSaved={loadProfile}
      />
    </div>
  );
}

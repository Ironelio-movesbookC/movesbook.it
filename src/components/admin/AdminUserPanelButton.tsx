'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminClubUserPanelModal, {
  type ClubUserPanelData,
} from '@/components/admin/AdminClubUserPanelModal';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

type AdminUserPanelButtonProps = {
  userId: string;
  /** Optional hint so clubs fetch the richer club panel fields. */
  userType?: string | null;
  className?: string;
};

function mapPanelPayload(panel: Record<string, unknown>): ClubUserPanelData {
  return {
    modalTitle: String(panel.modalTitle ?? 'online_new_User'),
    fullName: String(panel.fullName ?? ''),
    username: String(panel.username ?? ''),
    officialName: String(panel.officialName ?? ''),
    clubname: String(panel.clubname ?? ''),
    country: String(panel.country ?? ''),
    city: String(panel.city ?? ''),
    sport: String(panel.sport ?? ''),
    dateStart: String(panel.dateStart ?? ''),
    dateEnd: panel.dateEnd != null && panel.dateEnd !== '' ? String(panel.dateEnd) : null,
    version: String(panel.version ?? ''),
    paid: typeof panel.paid === 'number' ? panel.paid : parseInt(String(panel.paid ?? '0'), 10) || 0,
    adminImageUrl: panel.adminImageUrl != null ? String(panel.adminImageUrl) : null,
    clubId: panel.clubId != null ? String(panel.clubId) : null,
    typeBadge: String(panel.typeBadge ?? ''),
    visitPagePath:
      panel.visitPagePath != null && String(panel.visitPagePath).trim() !== ''
        ? String(panel.visitPagePath)
        : null,
    websiteUrl:
      panel.websiteUrl != null && String(panel.websiteUrl).trim() !== ''
        ? String(panel.websiteUrl)
        : null,
  };
}

export default function AdminUserPanelButton({
  userId,
  userType,
  className,
}: AdminUserPanelButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ClubUserPanelData | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState(userId);

  const close = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setError('');
    setData(null);
  }, []);

  const openPanel = useCallback(async () => {
    setResolvedUserId(userId);
    setOpen(true);
    setLoading(true);
    setError('');
    setData(null);
    try {
      const token = getAdminBearerToken();
      if (!token) {
        setError('Admin session not found.');
        return;
      }
      const qs = new URLSearchParams({ segment: 'all' });
      if (userType && isClubAccountUserType(userType)) {
        qs.set('segment', 'clubs');
      }
      const res = await fetch(
        `/api/admin/registered-users/${encodeURIComponent(userId)}/profile?${qs}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Failed to load user panel');
      const panel = body.userPanel;
      if (!panel || typeof panel !== 'object') {
        throw new Error('User panel data is not available for this user.');
      }
      setData(mapPanelPayload(panel as Record<string, unknown>));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load user panel');
    } finally {
      setLoading(false);
    }
  }, [userId, userType]);

  /** Same as /admin/all club modal: open the wide registered-user profile panel. */
  const goControlPanel = useCallback(() => {
    close();
    const qs = new URLSearchParams({ openUser: resolvedUserId });
    router.push(`/admin/all?${qs.toString()}`);
  }, [close, router, resolvedUserId]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openPanel()}
        className={
          className ??
          'shrink-0 self-start whitespace-nowrap rounded border border-red-600 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50'
        }
      >
        Open User Panel
      </button>
      <AdminClubUserPanelModal
        isOpen={open}
        loading={loading}
        error={error}
        data={data}
        onClose={close}
        onControlPanel={goControlPanel}
      />
    </>
  );
}

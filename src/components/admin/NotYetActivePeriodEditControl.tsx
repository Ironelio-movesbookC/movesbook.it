'use client';

import { useState } from 'react';
import AdminPcuDatePicker from '@/components/admin/AdminPcuDatePicker';
import { MEMBERSHIP_STATUS_NOT_YET_ACTIVE } from '@/lib/admin/clubSubscriptionStatus';
import {
  membershipDateClassName,
  membershipStatusLabelClassName,
  membershipStatusToneFromLabel,
} from '@/lib/admin/clubSubscriptionStatus';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';

export type SubscriptionPeriodRow = {
  id: string;
  dateStart: string;
  dateEnd: string | null;
  status: string;
};

type NotYetActivePeriodEditControlProps = {
  userId: string;
  entityId?: string | null;
  entityKind?: string | null;
  row: SubscriptionPeriodRow;
  onSaved?: () => void | Promise<void>;
};

export function subscriptionPeriodDateClassName(status: string): string {
  return membershipDateClassName(membershipStatusToneFromLabel(status));
}

export function isNotYetActiveSubscriptionStatus(status: string): boolean {
  return status.trim().toLowerCase() === MEMBERSHIP_STATUS_NOT_YET_ACTIVE.toLowerCase();
}

export default function NotYetActivePeriodEditControl({
  userId,
  entityId,
  entityKind,
  row,
  onSaved,
}: NotYetActivePeriodEditControlProps) {
  const [editing, setEditing] = useState(false);
  const [draftStart, setDraftStart] = useState(row.dateStart);
  const [draftEnd, setDraftEnd] = useState(row.dateEnd ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isNotYetActiveSubscriptionStatus(row.status)) {
    return (
      <span className={membershipStatusLabelClassName(row.status)}>{row.status}</span>
    );
  }

  const beginEdit = () => {
    setDraftStart(row.dateStart);
    setDraftEnd(row.dateEnd ?? '');
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const saveEdit = async () => {
    const token = getAdminBearerToken();
    if (!token) {
      window.alert('Admin session not found. Please log in again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/registered-users/${encodeURIComponent(userId)}/subscription-period`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            periodId: row.id,
            dateStart: draftStart,
            dateEnd: draftEnd,
            clubId: entityId ?? undefined,
            entityId: entityId ?? undefined,
            entityKind: entityKind ?? undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update membership dates');
      setEditing(false);
      await onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update membership dates');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <div className="flex flex-wrap items-center gap-2">
          <AdminPcuDatePicker
            value={draftStart}
            onChange={setDraftStart}
            disabled={saving}
          />
          <AdminPcuDatePicker
            value={draftEnd}
            minDateIso={draftStart || undefined}
            onChange={setDraftEnd}
            disabled={saving}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={saving}
            className="text-xs font-semibold text-white bg-gray-800 px-2 py-1 rounded disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="text-xs font-semibold text-gray-700 underline disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={membershipStatusLabelClassName(row.status)}>{row.status}</span>
      <button
        type="button"
        onClick={beginEdit}
        className="text-xs font-semibold text-red-600 underline hover:text-red-800"
      >
        Edit date
      </button>
    </div>
  );
}

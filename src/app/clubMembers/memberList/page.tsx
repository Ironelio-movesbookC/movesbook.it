'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Pencil, Trash2, UserPlus, User } from 'lucide-react';
import AddMemberModal from '@/components/AddMemberModal';
import MembersTable from '@/components/club/ui/table';
import MemberArchiveTopNav, {
  type MemberArchiveSection,
} from '@/components/club/memberArchive/MemberArchiveTopNav';
import ArchiveEntityProfilePanel from '@/components/club/memberArchive/ArchiveEntityProfilePanel';
import AthletesParentsArchive from '@/components/club/memberArchive/AthletesParentsArchive';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import MemberStats from '@/app/clubMembers/memberList/components/status';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

const DEFAULT_MEMBERS_PURCHASED = 10;

function formatSubscriptionLabel(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function memberTypeBadge(value: unknown) {
  const label = String(value ?? 'Standard').trim() || 'Standard';
  const lower = label.toLowerCase();
  const className =
    lower.includes('premium') || lower.includes('gold')
      ? 'bg-violet-100 text-violet-800'
      : lower.includes('vip')
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function formatDisplayDate(value: unknown) {
  if (!value) return '-';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
  }
  return raw;
}

export default function MemberListPage() {
  const router = useRouter();
  const { selectedClubId: contextClubId } = useClubWorkspace();
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addError, setAddError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [membersPurchased, setMembersPurchased] = useState(DEFAULT_MEMBERS_PURCHASED);
  const [subscriptionExpirationLabel, setSubscriptionExpirationLabel] = useState('');
  const [archiveSection, setArchiveSection] = useState<MemberArchiveSection>('athletes');

  const clubId = useMemo(() => {
    if (contextClubId) return contextClubId;
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedClub');
  }, [contextClubId]);

  const openMemberProfile = useCallback(
    (member: Member, mode: 'view' | 'edit') => {
      const id = member.memberId || member.id;
      if (!id) return;
      const q = new URLSearchParams();
      if (clubId) q.set('clubId', clubId);
      q.set('mode', mode);
      router.push(`/clubMembers/memberProfile/${encodeURIComponent(id)}?${q.toString()}`);
    },
    [clubId, router],
  );

  const handleDeleteMember = useCallback(
    async (member: Member) => {
      const id = member.memberId || member.id;
      const resolvedClubId =
        clubId ||
        (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null);
      if (!id || !resolvedClubId) {
        window.alert('Select a club under My clubs before managing members.');
        return;
      }
      const label = [member.surname, member.name].filter(Boolean).join(' ') || member.username || id;
      if (!window.confirm(`Remove ${label} from this club? Their Movesbook account will not be deleted.`)) {
        return;
      }
      setBusyId(id);
      setError('');
      try {
        const res = await fetch(
          withSelectedClubId(
            `/api/clubs/${encodeURIComponent(resolvedClubId)}/members/${encodeURIComponent(id)}`,
          ),
          { method: 'DELETE', headers: getAuthHeaders() },
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof payload.error === 'string' ? payload.error : 'Failed to remove member',
          );
        }
        setRefreshKey((k) => k + 1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to remove member');
      } finally {
        setBusyId(null);
      }
    },
    [clubId],
  );

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'image',
        header: 'Image',
        render: (value) =>
          value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(value)}
              alt=""
              className="mx-auto h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
              —
            </span>
          ),
      },
      { key: 'surname', header: 'Surname' },
      { key: 'name', header: 'Name' },
      { key: 'gender', header: 'Gender' },
      {
        key: 'dateOfBirth',
        header: 'Date of Birth',
        render: (value, row) =>
          String(row.dateOfBirthDisplay || formatDisplayDate(value) || '-'),
      },
      { key: 'operator', header: 'Operator' },
      {
        key: 'memberType',
        header: 'Member Type',
        render: (value) => memberTypeBadge(value),
      },
      {
        key: 'localCity',
        header: 'Local City',
        render: (value, row) => String(value || row.Localcity || '-'),
      },
      { key: 'phone', header: 'Phone' },
      {
        key: 'insertDate',
        header: 'Insert Date',
        render: (_value, row) =>
          String(row.insertDateDisplay || formatDisplayDate(row.insertDate) || '-'),
      },
      {
        key: 'options',
        header: 'Options',
        render: (_value, row) => {
          const id = row.memberId || row.id || '';
          const busy = busyId === id;
          return (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <button
                type="button"
                title="Open member profile"
                disabled={busy}
                onClick={() => openMemberProfile(row, 'view')}
                className="rounded p-1 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
              >
                <User className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Edit member profile"
                disabled={busy}
                onClick={() => openMemberProfile(row, 'edit')}
                className="rounded p-1 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-40"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Membership calendar (soon)"
                disabled
                className="rounded p-1 opacity-40"
              >
                <CalendarClock className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Remove from club"
                disabled={busy}
                onClick={() => void handleDeleteMember(row)}
                className="rounded p-1 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [busyId, handleDeleteMember, openMemberProfile],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      try {
        const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const admin =
          json?.adminSettings && typeof json.adminSettings === 'object'
            ? json.adminSettings
            : {};
        const pcu =
          admin?.pcu && typeof admin.pcu === 'object'
            ? (admin.pcu as Record<string, unknown>)
            : {};
        const functions =
          pcu.functions && typeof pcu.functions === 'object'
            ? (pcu.functions as Record<string, unknown>)
            : {};
        const members =
          functions.members && typeof functions.members === 'object'
            ? (functions.members as Record<string, unknown>)
            : {};
        const licenses =
          functions.licenses && typeof functions.licenses === 'object'
            ? (functions.licenses as Record<string, unknown>)
            : {};

        setMembersPurchased(
          parsePositiveInt(members.maxMembers, DEFAULT_MEMBERS_PURCHASED),
        );
        setSubscriptionExpirationLabel(
          formatSubscriptionLabel(
            (licenses.subscriptionExpiration as string | undefined) ||
              (json?.endDate as string | undefined) ||
              '',
          ),
        );
      } catch {
        if (!cancelled) {
          setMembersPurchased(DEFAULT_MEMBERS_PURCHASED);
          setSubscriptionExpirationLabel('');
        }
      }
    }
    void loadQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const resolvedClubId =
        clubId ||
        (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null);

      if (!resolvedClubId) {
        if (!cancelled) {
          setRows([]);
          setClubName('');
          setError('Select a club under My clubs before opening Archive of Members.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await fetchClubArchive('members', {
          page: 1,
          pageSize: 500,
          orderBy: 'recent',
          clubId: resolvedClubId,
        });
        if (cancelled) return;
        setRows(res.items as Member[]);

        // Resolve club name for empty-state messaging
        try {
          const clubsRes = await fetch('/api/clubs/my-clubs', { headers: getAuthHeaders() });
          const clubsJson = await clubsRes.json().catch(() => ({}));
          const clubs = Array.isArray(clubsJson?.clubs) ? clubsJson.clubs : [];
          const match = clubs.find((c: { id?: string }) => c?.id === resolvedClubId);
          setClubName(String(match?.name || ''));
        } catch {
          setClubName('');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load members');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, clubId]);

  const currentMembers = rows.length;
  const membersAdded = currentMembers;
  const availableSlots = Math.max(0, membersPurchased - currentMembers);

  const handleAddExistingUser = useCallback(
    async (data: { username: string; password: string }) => {
      setAddError('');
      const resolvedClubId =
        clubId ||
        (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null);
      if (!resolvedClubId) {
        throw new Error('Select a club under My clubs before adding members.');
      }

      const response = await fetch(
        withSelectedClubId(`/api/clubs/${encodeURIComponent(resolvedClubId)}/members/add`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: data.username,
            password: data.password,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : 'Failed to add member',
        );
      }

      setRefreshKey((k) => k + 1);
    },
    [clubId],
  );

  return (
    <div className="px-2 pb-4 sm:px-4">
      {addError ? <p className="mb-2 text-sm text-red-600">{addError}</p> : null}

      <MemberArchiveTopNav active={archiveSection} onChange={setArchiveSection} />

      {archiveSection === 'athletes' ? (
        <div className="space-y-4">
          <ArchiveEntityProfilePanel clubId={clubId} />

          <MemberStats
            currentMembers={currentMembers}
            membersPurchased={membersPurchased}
            membersAdded={membersAdded}
            availableSlots={availableSlots}
            subscriptionExpirationLabel={subscriptionExpirationLabel}
            onPurchaseMembers={() => {
              window.alert(
                'Purchase members will open the club accounts purchase flow (coming soon).',
              );
            }}
            onStatusAccounts={() => {
              window.alert(
                'Status accounts will open Account Status for member seats (coming soon).',
              );
            }}
          />

          <ProcedureArchiveShell
            title="Archive — Members"
            activeTab=""
            tabs={[]}
            error={error || undefined}
            footerHint="Live data from club members in the database."
            headerAction={
              <button
                type="button"
                onClick={() => {
                  setAddError('');
                  setShowAddMemberModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
              >
                <UserPlus className="h-4 w-4" />
                Add a member
              </button>
            }
          >
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Loading members…</div>
            ) : !error && rows.length === 0 ? (
              <div className="space-y-2 p-6 text-sm text-gray-600">
                <p className="font-medium text-gray-800">
                  No members in {clubName || 'this club'} yet.
                </p>
                <p>
                  Use <strong>Add a member</strong>, or switch club under{' '}
                  <strong>My Page → My clubs</strong> if you added the member to a different club
                  (e.g. test-club vs Magix).
                </p>
              </div>
            ) : (
              <div className="px-2 pb-4">
                <MembersTable columns={columns} tableData={rows} />
              </div>
            )}
          </ProcedureArchiveShell>
        </div>
      ) : archiveSection === 'parents' && clubId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <AthletesParentsArchive clubId={clubId} />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            {archiveSection === 'staff' ? 'Staff' : 'Settings'}
          </h2>
          <p>
            {archiveSection === 'staff'
              ? 'Staff archive for this club/team will appear here.'
              : 'Archive settings for this club/team will appear here.'}
          </p>
        </div>
      )}

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        entityType="club"
        onAddExistingUser={handleAddExistingUser}
      />
    </div>
  );
}

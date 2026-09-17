'use client';
import Image from 'next/image';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, Pencil, Trash2, User, UserPlus } from 'lucide-react';
import ClubMemberArchivePage, { memberTypeBadge } from '@/components/club/members/ClubMemberArchivePage';
import AddMemberModal from '@/components/AddMemberModal';
import ClubMemberArchiveHeader from './components/status';
import MemberArchiveTopNav, {
  type MemberArchiveSection,
} from '@/components/club/memberArchive/MemberArchiveTopNav';
import ArchiveEntityProfilePanel from '@/components/club/memberArchive/ArchiveEntityProfilePanel';
import AthletesParentsArchive from '@/components/club/memberArchive/AthletesParentsArchive';
import { clubApiFetch, getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import {
  computeClubMemberCapacity,
  type ClubMemberCapacityStats,
} from '@/lib/club/clubMemberCapacity';
import {
  getUsersAvailableFirstSubscription,
  getUsersAvailableRenewal,
} from '@/lib/admin/subscriptionManageableUsers';
import { SUBSCRIPTION_SETTINGS_UPDATED_EVENT } from '@/lib/admin/subscriptionSettingsMock';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import {
  getArchiveEntityProfileSectionLabel,
  managedEntityKindFromUserType,
} from '@/lib/entity/entityProfileLabels';
import type { Column, Member } from '@/types/clubTable';
import { staffRowTextClass } from '@/lib/club/clubStaff.constants';

type MemberCapacityResponse = {
  subscriptionSettingId: number | null;
  capacity: ClubMemberCapacityStats;
};

const MEMBER_ARCHIVE_SECTIONS: MemberArchiveSection[] = [
  'athletes',
  'pending',
  'not-members',
  'parents',
  'staff',
  'club-profile',
  'settings',
];

function parseArchiveSection(value: string | null): MemberArchiveSection | null {
  return MEMBER_ARCHIVE_SECTIONS.find((section) => section === value) ?? null;
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

function MemberListPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedClubId: contextClubId } = useClubWorkspace();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addError, setAddError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [capacityPayload, setCapacityPayload] = useState<MemberCapacityResponse | null>(null);
  const [settingsRevision, setSettingsRevision] = useState(0);

  const profileSectionLabel = useMemo(
    () =>
      getArchiveEntityProfileSectionLabel(
        managedEntityKindFromUserType(user?.userType),
      ),
    [user?.userType],
  );

  // ?section= is the source of truth so the sidebar (Archives → User archives) and the
  // top nav can never disagree about which section is open.
  const archiveSection =
    parseArchiveSection(searchParams?.get('section') ?? null) ?? 'athletes';

  const setArchiveSection = useCallback(
    (section: MemberArchiveSection) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('section', section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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
      const label =
        [member.surname, member.name].filter(Boolean).join(' ') || member.username || id;
      if (
        !window.confirm(
          `Remove ${label} from this club? Their Movesbook account will not be deleted.`,
        )
      ) {
        return;
      }
      setBusyId(id);
      setAddError('');
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
        setAddError(e instanceof Error ? e.message : 'Failed to remove member');
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
            <Image
              src={String(value)}
              alt=""
              className="mx-auto h-10 w-10 rounded-full object-cover"
              width={40}
              height={40}
              unoptimized
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
      {
        key: 'operator',
        header: 'Operator',
        render: (value, row) => {
          const label = String(value ?? 'Member');
          const colorClass = staffRowTextClass({
            staffType: String(row.staffType ?? ''),
            role: String(row.staffRole ?? ''),
          });
          return <span className={colorClass}>{label}</span>;
        },
      },
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

  const loadCapacity = useCallback(async () => {
    if (!clubId) {
      setCapacityPayload(null);
      return;
    }
    try {
      const response = await clubApiFetch<MemberCapacityResponse>(
        `/api/club/member-capacity?clubId=${encodeURIComponent(clubId)}`,
      );
      setCapacityPayload(response);
    } catch {
      setCapacityPayload(null);
    }
  }, [clubId]);

  useEffect(() => {
    void loadCapacity();
  }, [loadCapacity, refreshKey]);

  useEffect(() => {
    const refresh = () => setSettingsRevision((value) => value + 1);
    window.addEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const capacity = useMemo(() => {
    void settingsRevision;
    if (!capacityPayload?.capacity) return null;

    const base = capacityPayload.capacity;
    const subscriptionSettingId = capacityPayload.subscriptionSettingId;
    if (!subscriptionSettingId) return base;

    return computeClubMemberCapacity({
      membersAdded: base.membersAdded,
      membersPurchasedBase: base.membersPurchasedBase,
      subscriptionSettingId,
      subscriptionPhase: base.subscriptionPhase,
      subscriptionEndDate: base.subscriptionEndDateIso
        ? new Date(`${base.subscriptionEndDateIso}T12:00:00.000Z`)
        : null,
      usersAllowanceFirst: getUsersAvailableFirstSubscription(subscriptionSettingId),
      usersAllowanceRenewal: getUsersAvailableRenewal(subscriptionSettingId),
    });
  }, [capacityPayload, settingsRevision]);

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
    <div className="w-full h-full flex flex-col p-4 gap-4">
      <MemberArchiveTopNav
        active={archiveSection}
        onChange={setArchiveSection}
        profileSectionLabel={profileSectionLabel}
      />

      {archiveSection === 'athletes' ? (
        <>
          {capacity ? (
            <ClubMemberArchiveHeader
              capacity={capacity}
              onPurchaseMembers={() => {
                window.alert(
                  'Purchase members — additional slot packs will be added to Members purchased.',
                );
              }}
              onStatusAccounts={() => {
                window.alert('Status accounts — member account status overview.');
              }}
            />
          ) : null}

          {!capacity && clubId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Loading member capacity from your subscription version…
            </div>
          ) : null}

          {!clubId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Select a club workspace to view member capacity from your subscription version.
            </div>
          ) : null}

          {addError ? <p className="text-sm text-red-600">{addError}</p> : null}
          <ClubMemberArchivePage
            columns={columns}
            refreshKey={refreshKey}
            footerHint="Live data from club members in the database."
            addMemberAction={
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
          />
        </>
      ) : archiveSection === 'pending' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Members in pending</h2>
          <p>
            Athletes who asked to join this club and are still waiting for approval will
            appear here.
          </p>
        </div>
      ) : archiveSection === 'not-members' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Athletes not members</h2>
          <p>
            Athletes linked to this club without an active membership will appear here.
          </p>
        </div>
      ) : archiveSection === 'parents' ? (
        clubId ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <AthletesParentsArchive clubId={clubId} />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a club workspace to view parents &amp; tutors.
          </div>
        )
      ) : archiveSection === 'staff' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Club Staff</h2>
          <p className="mb-3">
            Manage Operator / Collaborator / Coadmin staff for this club.
          </p>
          <a
            href="/club/staff"
            className="inline-flex rounded bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Open Staff archive
          </a>
        </div>
      ) : archiveSection === 'club-profile' ? (
        <ArchiveEntityProfilePanel clubId={clubId} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="mb-2 text-lg font-bold text-gray-900">Settings</h2>
          <p>Archive settings for this club/team will appear here.</p>
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

export default function MemberListPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading…</p>}>
      <MemberListPageContent />
    </Suspense>
  );
}

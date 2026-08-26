'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import ClubMemberProfileEditor, {
  type ProfileTabId,
} from '@/components/club/memberProfile/ClubMemberProfileEditor';
import type { MemberProfileBundle } from '@/lib/club/memberProfileTypes';
import { isMemberUnderage } from '@/lib/club/memberProfileDefaults';
import { PARENTS_TAB_LABEL } from '@/lib/club/memberProfileTypes';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';

type ClubOption = { id: string; name: string };

type TabMeta = { id: ProfileTabId; label: string; clubScoped: boolean };

const SHARED_TABS: TabMeta[] = [
  { id: 'owner-profile', label: 'Owner profile', clubScoped: false },
  { id: 'contacts', label: 'User contacts', clubScoped: false },
  { id: 'activities', label: 'My Activities', clubScoped: false },
  { id: 'references', label: 'References', clubScoped: false },
];

const CLUB_TABS: TabMeta[] = [
  { id: 'pay-for', label: 'Pay for…', clubScoped: true },
  { id: 'other-details', label: "Other member's details", clubScoped: true },
  { id: 'parents', label: PARENTS_TAB_LABEL, clubScoped: true },
  { id: 'settings', label: 'Settings', clubScoped: true },
  { id: 'messages-staff', label: 'Messages from the Staff', clubScoped: true },
  { id: 'notes-coach', label: 'Notes of the Coach', clubScoped: true },
  { id: 'presences', label: 'Graphs of the presences', clubScoped: true },
];

function tabVisibleForMember(tab: TabMeta, data: MemberProfileBundle | null): boolean {
  if (!tab.clubScoped) return true;
  if (!data) return true;
  if (data.viewer.isClubAdmin) return true;

  const v = data.club.visibility;

  switch (tab.id) {
    case 'pay-for':
      return Boolean(v.payFor);
    case 'other-details':
      return Boolean(v.otherDetails);
    case 'parents': {
      const dob = data.owner.personal.dateOfBirth || data.user.birthdate || '';
      if (!isMemberUnderage(dob)) return false;
      return Boolean(v.parents);
    }
    case 'settings':
      return Boolean(v.settings);
    case 'messages-staff':
      return Boolean(v.messagesStaff);
    case 'notes-coach':
      return Boolean(v.notesCoach);
    case 'presences':
      return Boolean(v.presences);
    default:
      return true;
  }
}

function clubTabBlockedMessage(
  tab: TabMeta | undefined,
  data: MemberProfileBundle,
  clubName: string,
): string {
  const label = tab?.label || 'This section';
  return `${label}: the club admin of ${clubName || 'this club'} has not enabled this section for you. Try another club with Change club, or ask the admin to enable reading of this label.`;
}

type Props = {
  userId: string;
  clubs: ClubOption[];
};

export default function MemberSelfProfilePanel({ userId, clubs }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('owner-profile');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingClubTab, setPendingClubTab] = useState<ProfileTabId | null>(null);
  const [data, setData] = useState<MemberProfileBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMeta = useMemo(
    () => [...SHARED_TABS, ...CLUB_TABS].find((t) => t.id === activeTab),
    [activeTab],
  );

  const loadSelf = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/member-profile', { headers: getAuthHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Failed to load profile');
      }
      setData(json as MemberProfileBundle);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClub = useCallback(
    async (clubId: string) => {
      if (!clubId || !userId) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          withSelectedClubId(
            `/api/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}/profile`,
          ),
          { headers: getAuthHeaders() },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof json.error === 'string' ? json.error : 'Failed to load profile');
        }
        setData(json as MemberProfileBundle);
        setSelectedClubId(clubId);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (clubs.length === 0) {
      void loadSelf();
    } else {
      void loadClub(clubs[0].id);
    }
  }, [clubs, loadSelf, loadClub]);

  const profileSource = clubs.length === 0 ? 'self' : 'club';

  // Always show all labels; enforce club-admin visibility after a club is selected.
  const tabs = useMemo(() => [...SHARED_TABS, ...CLUB_TABS], []);

  const clubTabBlocked =
    Boolean(activeMeta?.clubScoped) &&
    Boolean(data) &&
    data!.clubId === selectedClubId &&
    !tabVisibleForMember(activeMeta!, data);

  const openTab = (tab: TabMeta) => {
    if (!tab.clubScoped) {
      setActiveTab(tab.id);
      // Ensure shared data is loaded via any club membership
      if (clubs.length && !data) {
        void loadClub(selectedClubId || clubs[0].id);
      }
      return;
    }

    if (clubs.length === 0) {
      setError('You are not a member of any club yet. Join a club to open this section.');
      return;
    }

    if (clubs.length === 1) {
      setActiveTab(tab.id);
      void loadClub(clubs[0].id);
      return;
    }

    // Multiple clubs → ask which club DB to open (requirement)
    setPendingClubTab(tab.id);
    setPickerOpen(true);
  };

  const confirmClub = (clubId: string) => {
    const tab = pendingClubTab;
    setPickerOpen(false);
    setPendingClubTab(null);
    if (!tab) return;
    setActiveTab(tab);
    void loadClub(clubId);
  };

  const selectedClubName =
    clubs.find((c) => c.id === selectedClubId)?.name || data?.clubName || '';

  const mode: 'view' | 'edit' = activeMeta?.clubScoped ? 'view' : 'edit';

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Member info</h2>
      <p className="mb-4 text-sm text-gray-600">
        Grey labels are shared across all your clubs. Blue labels load data from the club you
        select (same list as My clubs).
      </p>

      {clubs.length === 0 ? (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You are not a member of any club yet. Shared profile labels still work after you join a
          club; blue labels need a club membership.
        </p>
      ) : null}

      <div className="mb-0 flex flex-wrap gap-1 border-b border-gray-300">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => openTab(tab)}
              className={`rounded-t px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-gray-900 text-white'
                  : tab.clubScoped
                    ? 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-b-lg border border-t-0 border-gray-300 bg-white p-4 md:p-5">
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-white ${
            activeMeta?.clubScoped ? 'bg-sky-700' : 'bg-[#2f6fb5]'
          }`}
        >
          <span>
            {activeMeta?.label}
            {activeMeta?.clubScoped
              ? selectedClubName
                ? ` · ${selectedClubName}`
                : ' · select a club'
              : ' · shared profile'}
          </span>
          {activeMeta?.clubScoped && clubs.length > 1 ? (
            <button
              type="button"
              className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30"
              onClick={() => {
                setPendingClubTab(activeTab);
                setPickerOpen(true);
              }}
            >
              Change club
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading profile…
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : clubTabBlocked ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            {clubTabBlockedMessage(activeMeta, data!, selectedClubName)}
          </div>
        ) : data ? (
          <ClubMemberProfileEditor
            data={data}
            activeTab={activeTab}
            mode={mode}
            profileSource={profileSource}
            onChange={setData}
            onReload={() =>
              void (profileSource === 'self'
                ? loadSelf()
                : loadClub(selectedClubId || clubs[0]?.id || ''))
            }
          />
        ) : clubs.length === 0 ? (
          <p className="text-sm text-gray-600">
            Join a club (Become member) to load Owner profile and club sections.
          </p>
        ) : (
          <p className="text-sm text-gray-600">Select a tab to load your profile.</p>
        )}
      </div>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-picker-title"
            className="w-full max-w-md rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 id="club-picker-title" className="text-base font-bold text-gray-900">
                Select which club
              </h3>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                onClick={() => {
                  setPickerOpen(false);
                  setPendingClubTab(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="mb-3 text-sm text-gray-600">
                This section is stored in the club database. Choose which club you want to open
                (same clubs as under My clubs).
              </p>
              <ul className="space-y-2">
                {clubs.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => confirmClub(c.id)}
                      className={`flex w-full items-center gap-2 rounded border px-3 py-2.5 text-left text-sm font-medium hover:border-sky-500 hover:bg-sky-50 ${
                        c.id === selectedClubId
                          ? 'border-sky-600 bg-sky-50 text-sky-900'
                          : 'border-gray-300 text-gray-800'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

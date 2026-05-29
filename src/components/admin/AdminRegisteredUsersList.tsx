'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  LayoutGrid,
  LayoutList,
  Search as SearchIcon,
  X,
} from 'lucide-react';
import type { ClubSubscriptionStatusTone } from '@/lib/admin/clubSubscriptionStatus';
import { flagEmojiFromCountryName } from '@/lib/admin/countryFlag';
import type { FavouritePriority } from '@/lib/admin/userProfilePanelSettings';
import { normalizeFavouritePriority } from '@/lib/admin/userProfilePanelSettings';
import AdminClubsUserProfilePanel from '@/components/admin/AdminClubsUserProfilePanel';
import AdminClubUserPanelModal, {
  type ClubUserPanelData,
} from '@/components/admin/AdminClubUserPanelModal';

export type AdminUserSegment = 'all' | 'single-user' | 'coaches' | 'groups' | 'teams' | 'clubs';

export interface AdminRegisteredUsersListProps {
  segment: AdminUserSegment;
  /** Highlight word in the grey title bar, e.g. "Athlete", "Coach" */
  roleTitle: string;
  /** Purple subtitle bar */
  historicalSubtitle: string;
}

interface ProfilePayload {
  id: string;
  username: string;
  email: string;
  fullName: string;
  country: string;
  location: string;
  officialClubName: string;
  sportLine: string;
  typeBadge: string;
  userType: string;
  imageUrl: string | null;
  subscriptionRows: Array<{
    id: string;
    dateStart: string;
    dateEnd: string | null;
    version: string;
    username: string;
    companyName: string;
    e: string;
    status: string;
  }>;
  profilePanel?: {
    tagged: boolean;
    favouritePriority: FavouritePriority;
  };
}

type ActionTarget = { id: string; email: string; username: string; label: string };

interface RowUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  userType: string;
  country: string | null;
  location: string | null;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  amount: string;
  status: string;
  clubsOwnedCount?: number;
  companyName?: string;
  statusTone?: ClubSubscriptionStatusTone;
}

function CountryFlagCell({ country }: { country: string | null | undefined }) {
  const flag = flagEmojiFromCountryName(country);
  return (
    <td className="px-2 py-2 border-t border-gray-300 text-center text-lg leading-none">
      {flag || '—'}
    </td>
  );
}

function clubAdminStatusClassName(tone?: ClubSubscriptionStatusTone): string {
  switch (tone) {
    case 'expiring':
      return 'text-amber-600 font-semibold';
    case 'partial-expired':
      return 'text-orange-600 font-semibold';
    case 'all-expired':
      return 'text-red-600 font-semibold';
    case 'active':
    default:
      return 'text-green-700 font-semibold';
  }
}

const isDataUrl = (src?: string | null) => typeof src === 'string' && src.startsWith('data:image/');

type MembershipTab = 'all' | 'current' | 'last';

type LoginFilter = 'all' | 'active7' | 'active24h' | 'never';

interface FilterState {
  country: string;
  mainSport: string;
  version: string;
  userTypeCategory: string;
  login: LoginFilter;
  subDay: string;
  subMonth: string;
  subYear: string;
  rangeFrom: string;
  rangeTo: string;
}

const EMPTY_FILTERS: FilterState = {
  country: '',
  mainSport: '',
  version: '',
  userTypeCategory: '',
  login: 'all',
  subDay: '',
  subMonth: '',
  subYear: '',
  rangeFrom: '',
  rangeTo: '',
};

const USER_TYPE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'single-user', label: 'Single User' },
  { value: 'coaches', label: 'Coach' },
  { value: 'groups', label: 'Group' },
  { value: 'teams', label: 'Team' },
  { value: 'clubs', label: 'Club' },
];

const ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ordering' },
  { value: 'username', label: 'by Username' },
  { value: 'fullname', label: 'by Full Name' },
  { value: 'date', label: 'by date' },
  { value: 'date_end', label: 'by date end subscription' },
];

const LOGIN_OPTIONS: { value: LoginFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active24h', label: 'Seen in 24h' },
  { value: 'active7', label: 'Seen in 7 days' },
  { value: 'never', label: 'Never logged in' },
];

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...[
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].map((label, i) => ({ value: String(i + 1), label })),
];

const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
];

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...Array.from({ length: 2026 - 1990 + 1 }, (_, i) => {
    const y = 1990 + i;
    return { value: String(y), label: String(y) };
  }),
];

const VERSION_BY_SEGMENT: Record<AdminUserSegment, string[]> = {
  all: [
    'User — base version',
    'Coach — base',
    'Group account',
    'Team account',
    'Club account',
  ],
  'single-user': ['User — base version'],
  coaches: ['Coach — base'],
  groups: ['Group account'],
  teams: ['Team account'],
  clubs: ['Club account'],
};

/** Version catalog for profile subscription filter (legacy admin UI). */
const PROFILE_SUBSCRIPTION_VERSION_OPTIONS = [
  'All',
  'Trial Base',
  'Trial for club members',
  'User- base version',
  'User- premium',
  'User- professional',
  'Coach Base PFU pay for users',
  "Coach Base don't pay for users",
  'Coach Premium PFU',
  'Coach Premium',
  'Coach Professional PFU',
  'Coach Professional',
  'Team Base PFU pay for users',
  "Team Base don't pay for user",
  'Team Premium PFU',
  'Team Premium',
  'Team Professional PFU',
  'Team Professional',
  'Group Standard Version',
  'Club Base',
] as const;

type ProfileSubFilterIn = 'dateStart' | 'dateEnd';
type ProfileSubOrdering = '' | 'dateStart' | 'dateEnd' | 'version';

interface ProfileSubscriptionFilterState {
  version: string;
  filterIn: ProfileSubFilterIn;
  dateFrom: string;
  dateTo: string;
  ordering: ProfileSubOrdering;
}

const EMPTY_PROFILE_SUB_FILTERS: ProfileSubscriptionFilterState = {
  version: '',
  filterIn: 'dateStart',
  dateFrom: '',
  dateTo: '',
  ordering: '',
};

function isClubUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function inferProfileSegmentFromUserType(userType: string): AdminUserSegment {
  switch (userType) {
    case 'COACH':
      return 'coaches';
    case 'TEAM':
    case 'TEAM_MANAGER':
      return 'teams';
    case 'CLUB':
    case 'CLUB_TRAINER':
      return 'clubs';
    case 'GROUP':
    case 'GROUP_ADMIN':
      return 'groups';
    default:
      return 'single-user';
  }
}

function normalizeVersionKey(s: string): string {
  return s.toLowerCase().replace(/—/g, '-').replace(/\s+/g, ' ').trim();
}

function rowMatchesProfileVersionFilter(rowVersion: string, filterVersion: string): boolean {
  if (!filterVersion || filterVersion === 'All') return true;
  const fv = normalizeVersionKey(filterVersion);
  const rv = normalizeVersionKey(rowVersion);
  return rv.includes(fv) || fv.includes(rv);
}

function parseYmd(s: string | null | undefined): number | null {
  if (!s || s === '—') return null;
  const slice = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slice)) return null;
  const t = new Date(`${slice}T12:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

function profileRowInDateRange(
  row: ProfilePayload['subscriptionRows'][number],
  filterIn: ProfileSubFilterIn,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const raw = filterIn === 'dateStart' ? row.dateStart : row.dateEnd;
  const val = parseYmd(raw ?? '');
  if (val === null) return false;
  const fromT = from ? parseYmd(from) : null;
  const toT = to ? parseYmd(to) : null;
  if (fromT !== null && val < fromT) return false;
  if (toT !== null && val > toT) return false;
  return true;
}

export default function AdminRegisteredUsersList({
  segment,
  roleTitle,
  historicalSubtitle,
}: AdminRegisteredUsersListProps) {
  const [membershipTab, setMembershipTab] = useState<MembershipTab>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [rows, setRows] = useState<RowUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(segment === 'all' ? 'grid' : 'list');
  const [orderBy, setOrderBy] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [metaCountries, setMetaCountries] = useState<string[]>([]);
  const [metaSports, setMetaSports] = useState<{ value: string; label: string }[]>([]);

  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [profileData, setProfileData] = useState<ProfilePayload | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileRowSelected, setProfileRowSelected] = useState<Set<string>>(new Set());
  const [profileSubFilterOpen, setProfileSubFilterOpen] = useState(false);
  const [profileSubFilterDraft, setProfileSubFilterDraft] =
    useState<ProfileSubscriptionFilterState>(EMPTY_PROFILE_SUB_FILTERS);
  const [profileSubFilterApplied, setProfileSubFilterApplied] =
    useState<ProfileSubscriptionFilterState>(EMPTY_PROFILE_SUB_FILTERS);
  const [profileOrdering, setProfileOrdering] = useState<ProfileSubOrdering>('');

  const [clubPanelOpen, setClubPanelOpen] = useState(false);
  const [clubPanelLoading, setClubPanelLoading] = useState(false);
  const [clubPanelError, setClubPanelError] = useState('');
  const [clubPanelData, setClubPanelData] = useState<ClubUserPanelData | null>(null);
  const [clubPanelUserId, setClubPanelUserId] = useState<string | null>(null);

  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [msgTargets, setMsgTargets] = useState<ActionTarget[]>([]);
  const [msgDraft, setMsgDraft] = useState('');
  const [msgSubject, setMsgSubject] = useState('Message from Movesbook Admin');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [profileTagged, setProfileTagged] = useState(false);
  const [profileFavouritePriority, setProfileFavouritePriority] =
    useState<FavouritePriority>('not_selected');
  const [profilePanelSaving, setProfilePanelSaving] = useState(false);

  const filterWrapRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const profileSubFilterWrapRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const versionOptions = useMemo(() => VERSION_BY_SEGMENT[segment], [segment]);
  const isAllSegment = segment === 'all';
  const isClubsSegment = segment === 'clubs';
  const showCompanyColumn = isClubsSegment || isAllSegment;
  const profileSegment =
    isAllSegment && profileData
      ? inferProfileSegmentFromUserType(profileData.userType)
      : segment;
  const profileIsClubsSegment = profileSegment === 'clubs';

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        const res = await fetch(`/api/admin/registered-users/meta?segment=${encodeURIComponent(segment)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        if (Array.isArray(data.countries)) setMetaCountries(data.countries);
        if (Array.isArray(data.sports)) setMetaSports(data.sports);
      } catch {
        /* ignore */
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [segment]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!filterOpen) return;
      const el = filterWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setFilterOpen(false);
        setDraftFilters({ ...appliedFilters });
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [filterOpen, appliedFilters]);

  useEffect(() => {
    function onProfileFilterMouseDown(e: MouseEvent) {
      if (!profileSubFilterOpen) return;
      const el = profileSubFilterWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setProfileSubFilterOpen(false);
        setProfileSubFilterDraft({ ...profileSubFilterApplied });
      }
    }
    document.addEventListener('mousedown', onProfileFilterMouseDown);
    return () => document.removeEventListener('mousedown', onProfileFilterMouseDown);
  }, [profileSubFilterOpen, profileSubFilterApplied]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please log in again.');
        setRows([]);
        return;
      }
      const params = new URLSearchParams({
        segment,
        page: String(page),
        pageSize: String(pageSize),
        q: searchApplied,
      });
      if (orderBy) params.set('order', orderBy);
      if (appliedFilters.country) params.set('country', appliedFilters.country);
      if (appliedFilters.mainSport) params.set('sport', appliedFilters.mainSport);
      if (appliedFilters.version) params.set('version', appliedFilters.version);
      if (appliedFilters.userTypeCategory) {
        params.set('userTypeCategory', appliedFilters.userTypeCategory);
      }
      if (appliedFilters.login !== 'all') params.set('login', appliedFilters.login);
      if (appliedFilters.subDay) params.set('subDay', appliedFilters.subDay);
      if (appliedFilters.subMonth) params.set('subMonth', appliedFilters.subMonth);
      if (appliedFilters.subYear) params.set('subYear', appliedFilters.subYear);
      if (appliedFilters.rangeFrom) params.set('createdFrom', appliedFilters.rangeFrom);
      if (appliedFilters.rangeTo) params.set('createdTo', appliedFilters.rangeTo);

      const res = await fetch(`/api/admin/registered-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setRows(Array.isArray(data?.users) ? data.users : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchApplied, segment, orderBy, appliedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [membershipTab]);

  useEffect(() => {
    setPage(1);
  }, [orderBy]);

  useEffect(() => {
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setOrderBy('');
    setPage(1);
    setSelected(new Set());
    setFilterOpen(false);
  }, [segment]);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const resolveActionTargets = useCallback((): ActionTarget[] => {
    if (selected.size > 0) {
      return rows
        .filter((r) => selected.has(r.id))
        .map((r) => ({
          id: r.id,
          email: r.email,
          username: r.username,
          label: r.displayName || r.username,
        }));
    }
    if (profileState === 'ready' && profileData && profileRowSelected.size > 0) {
      const userIds = new Set<string>();
      profileRowSelected.forEach((rowId) => {
        userIds.add(rowId.startsWith('account-') ? rowId.slice('account-'.length) : profileData.id);
      });
      return Array.from(userIds).map((id) => ({
        id,
        email: profileData.email,
        username: profileData.username,
        label: profileData.fullName || profileData.username,
      }));
    }
    return [];
  }, [selected, rows, profileState, profileData, profileRowSelected]);

  const profileActionTarget = useMemo((): ActionTarget | null => {
    if (profileState !== 'ready' || !profileData) return null;
    return {
      id: profileData.id,
      email: profileData.email,
      username: profileData.username,
      label: profileData.fullName || profileData.username,
    };
  }, [profileState, profileData]);

  const requireActionTargets = useCallback((): ActionTarget[] | null => {
    const targets = resolveActionTargets();
    if (targets.length === 0) {
      window.alert('Select at least one user (checkbox in the list or subscription row in the profile panel).');
      return null;
    }
    return targets;
  }, [resolveActionTargets]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSendMail = useCallback(() => {
    const targets = requireActionTargets();
    if (!targets) return;
    const emails = targets.map((t) => t.email.trim()).filter(Boolean);
    if (emails.length === 0) {
      window.alert('Selected users have no email address.');
      return;
    }
    if (emails.length === 1) {
      window.location.href = `mailto:${encodeURIComponent(emails[0]!)}`;
      return;
    }
    const bcc = emails.map((e) => encodeURIComponent(e)).join(',');
    window.location.href = `mailto:?bcc=${bcc}`;
  }, [requireActionTargets]);

  const openSendMsgModal = useCallback(() => {
    const targets = requireActionTargets();
    if (!targets) return;
    setMsgTargets(targets);
    setMsgError('');
    setMsgDraft('');
    setMsgSubject('Message from Movesbook Admin');
    setMsgModalOpen(true);
  }, [requireActionTargets]);

  const handleSendMsgSubmit = useCallback(async () => {
    const targets = msgTargets;
    if (targets.length === 0) return;
    const message = msgDraft.trim();
    if (!message) {
      setMsgError('Please enter a message.');
      return;
    }
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setMsgError('Admin session not found. Please log in again.');
      return;
    }
    setMsgSending(true);
    setMsgError('');
    try {
      const res = await fetch('/api/admin/registered-users/actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segment,
          userIds: targets.map((t) => t.id),
          message,
          subject: msgSubject.trim() || 'Message from Movesbook Admin',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');

      if (data.mailtoFallback && Array.isArray(data.recipients)) {
        const emails = data.recipients
          .map((r: { email?: string }) => r.email?.trim())
          .filter(Boolean) as string[];
        if (emails.length === 0) {
          throw new Error('No email addresses for selected users.');
        }
        const body = encodeURIComponent(message);
        const subj = encodeURIComponent(msgSubject.trim() || 'Message from Movesbook Admin');
        if (emails.length === 1) {
          window.location.href = `mailto:${encodeURIComponent(emails[0]!)}?subject=${subj}&body=${body}`;
        } else {
          const bcc = emails.map((e) => encodeURIComponent(e)).join(',');
          window.location.href = `mailto:?bcc=${bcc}&subject=${subj}&body=${body}`;
        }
        setMsgModalOpen(false);
        window.alert('Email service is not configured. Your mail client will open with the message prefilled.');
        return;
      }

      const sent = typeof data.sent === 'number' ? data.sent : 0;
      const failed = Array.isArray(data.failed) ? data.failed.length : 0;
      setMsgModalOpen(false);
      setMsgDraft('');
      if (failed > 0) {
        window.alert(`Message sent to ${sent} user(s). ${failed} failed — check email addresses.`);
      } else {
        window.alert(`Message sent to ${sent} user(s).`);
      }
    } catch (e: unknown) {
      setMsgError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setMsgSending(false);
    }
  }, [msgTargets, msgDraft, msgSubject, segment]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchApplied(searchDraft.trim());
    setPage(1);
  };

  const openFilterPanel = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(true);
  };

  const filterOk = () => {
    setAppliedFilters({ ...draftFilters });
    setFilterOpen(false);
    setPage(1);
  };

  const filterExit = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(false);
  };

  const closeUserProfile = useCallback(() => {
    setProfileState('idle');
    setProfileData(null);
    setProfileError('');
    setProfileRowSelected(new Set());
    setProfileSubFilterOpen(false);
    setProfileSubFilterDraft(EMPTY_PROFILE_SUB_FILTERS);
    setProfileSubFilterApplied(EMPTY_PROFILE_SUB_FILTERS);
    setProfileOrdering('');
    setProfileTagged(false);
    setProfileFavouritePriority('not_selected');
    setProfilePanelSaving(false);
  }, []);

  const saveProfilePanelSettings = useCallback(
    async (patch: { tagged?: boolean; favouritePriority?: FavouritePriority }) => {
      if (!profileData?.id) return;
      const prevTagged = profileTagged;
      const prevPriority = profileFavouritePriority;
      if (patch.tagged !== undefined) setProfileTagged(patch.tagged);
      if (patch.favouritePriority !== undefined) setProfileFavouritePriority(patch.favouritePriority);

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setProfileTagged(prevTagged);
        setProfileFavouritePriority(prevPriority);
        window.alert('Admin session not found. Please log in again.');
        return;
      }

      setProfilePanelSaving(true);
      try {
        const res = await fetch(
          `/api/admin/registered-users/${encodeURIComponent(profileData.id)}/profile-panel`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patch),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to save profile settings');
        if (data.profilePanel) {
          setProfileTagged(Boolean(data.profilePanel.tagged));
          setProfileFavouritePriority(
            normalizeFavouritePriority(data.profilePanel.favouritePriority),
          );
          setProfileData((prev) =>
            prev
              ? {
                  ...prev,
                  profilePanel: {
                    tagged: Boolean(data.profilePanel.tagged),
                    favouritePriority: normalizeFavouritePriority(
                      data.profilePanel.favouritePriority,
                    ),
                  },
                }
              : prev,
          );
        }
      } catch (e: unknown) {
        setProfileTagged(prevTagged);
        setProfileFavouritePriority(prevPriority);
        window.alert(e instanceof Error ? e.message : 'Failed to save profile settings');
      } finally {
        setProfilePanelSaving(false);
      }
    },
    [profileData?.id, profileTagged, profileFavouritePriority],
  );

  const deleteSubscriptionsForTargets = useCallback(
    async (targets: ActionTarget[], closeProfileIfDeleted: boolean) => {
      const names = targets.map((t) => t.label).slice(0, 5).join(', ');
      const more = targets.length > 5 ? ` and ${targets.length - 5} more` : '';
      const ok = window.confirm(
        `Delete ${targets.length} subscription(s)?\n\n${names}${more}\n\nThis permanently removes the user account(s) from Movesbook. This cannot be undone.`,
      );
      if (!ok) return;

      const token = localStorage.getItem('adminToken');
      if (!token) {
        window.alert('Admin session not found. Please log in again.');
        return;
      }
      setActionBusy(true);
      try {
        const res = await fetch('/api/admin/registered-users/actions', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            segment,
            userIds: targets.map((t) => t.id),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to delete subscriptions');

        const deleted = typeof data.deleted === 'number' ? data.deleted : 0;
        setSelected(new Set());
        setProfileRowSelected(new Set());
        if (closeProfileIfDeleted && profileData && targets.some((t) => t.id === profileData.id)) {
          closeUserProfile();
        }
        await load();
        window.alert(`Deleted ${deleted} user subscription(s).`);
      } catch (e: unknown) {
        window.alert(e instanceof Error ? e.message : 'Failed to delete subscriptions');
      } finally {
        setActionBusy(false);
      }
    },
    [segment, profileData, closeUserProfile, load],
  );

  const handleDeleteSubscriptions = useCallback(async () => {
    const targets = requireActionTargets();
    if (!targets) return;
    await deleteSubscriptionsForTargets(targets, true);
  }, [requireActionTargets, deleteSubscriptionsForTargets]);

  const handleProfileSendMail = useCallback(() => {
    if (!profileActionTarget?.email) {
      window.alert('This user has no email address.');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(profileActionTarget.email)}`;
  }, [profileActionTarget]);

  const openProfileSendMsgModal = useCallback(() => {
    if (!profileActionTarget) return;
    setMsgTargets([profileActionTarget]);
    setMsgError('');
    setMsgDraft('');
    setMsgSubject('Message from Movesbook Admin');
    setMsgModalOpen(true);
  }, [profileActionTarget]);

  const openUserProfile = useCallback(
    async (userId: string) => {
      setProfileState('loading');
      setProfileError('');
      setProfileData(null);
      setProfileRowSelected(new Set());
      setProfileSubFilterOpen(false);
      setProfileSubFilterDraft(EMPTY_PROFILE_SUB_FILTERS);
      setProfileSubFilterApplied(EMPTY_PROFILE_SUB_FILTERS);
      setProfileOrdering('');
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setProfileError('Admin session not found.');
          setProfileState('error');
          return;
        }
        const res = await fetch(
          `/api/admin/registered-users/${userId}/profile?segment=${encodeURIComponent(segment)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
        const rawRows = Array.isArray(data.subscriptionRows) ? data.subscriptionRows : [];
        setProfileData({
          id: String(data.id),
          username: String(data.username ?? ''),
          email: String(data.email ?? ''),
          fullName: String(data.fullName ?? ''),
          country: String(data.country ?? ''),
          location: String(data.location ?? ''),
          officialClubName: String(data.officialClubName ?? ''),
          sportLine: String(data.sportLine ?? ''),
          typeBadge: String(data.typeBadge ?? ''),
          userType: String(data.userType ?? ''),
          imageUrl: data.imageUrl != null ? String(data.imageUrl) : null,
          subscriptionRows: rawRows.map(
            (r: {
              id: string;
              dateStart: string;
              dateEnd?: string | null;
              version: string;
              username: string;
              companyName?: string;
              e: string;
              status: string;
            }) => ({
              id: String(r.id),
              dateStart: String(r.dateStart),
              dateEnd: r.dateEnd != null && r.dateEnd !== '' ? String(r.dateEnd) : null,
              version: String(r.version),
              username: String(r.username),
              companyName: String(r.companyName ?? data.officialClubName ?? ''),
              e: String(r.e ?? '—'),
              status: String(r.status),
            }),
          ),
          profilePanel: data.profilePanel
            ? {
                tagged: Boolean(data.profilePanel.tagged),
                favouritePriority: normalizeFavouritePriority(data.profilePanel.favouritePriority),
              }
            : undefined,
        });
        setProfileTagged(Boolean(data.profilePanel?.tagged));
        setProfileFavouritePriority(
          normalizeFavouritePriority(data.profilePanel?.favouritePriority),
        );
        setProfileState('ready');
      } catch (e: unknown) {
        setProfileError(e instanceof Error ? e.message : 'Failed to load');
        setProfileState('error');
      }
    },
    [segment],
  );

  const closeClubUserPanel = useCallback(() => {
    setClubPanelOpen(false);
    setClubPanelLoading(false);
    setClubPanelError('');
    setClubPanelData(null);
    setClubPanelUserId(null);
  }, []);

  const openClubUserPanel = useCallback(
    async (userId: string) => {
      setClubPanelUserId(userId);
      setClubPanelOpen(true);
      setClubPanelLoading(true);
      setClubPanelError('');
      setClubPanelData(null);
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setClubPanelError('Admin session not found.');
          setClubPanelLoading(false);
          return;
        }
        const res = await fetch(
          `/api/admin/registered-users/${userId}/profile?segment=clubs`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load club profile');
        const panel = data.userPanel;
        if (!panel || typeof panel !== 'object') {
          throw new Error('Club profile data is not available for this user.');
        }
        setClubPanelData({
          modalTitle: String(panel.modalTitle ?? 'online_old_Club'),
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
          typeBadge: String(panel.typeBadge ?? 'Club'),
          visitPagePath:
            panel.visitPagePath != null && String(panel.visitPagePath).trim() !== ''
              ? String(panel.visitPagePath)
              : null,
          websiteUrl:
            panel.websiteUrl != null && String(panel.websiteUrl).trim() !== ''
              ? String(panel.websiteUrl)
              : null,
        });
      } catch (e: unknown) {
        setClubPanelError(e instanceof Error ? e.message : 'Failed to load club profile');
      } finally {
        setClubPanelLoading(false);
      }
    },
    [],
  );

  const handleClubPanelControlPanel = useCallback(() => {
    if (!clubPanelUserId) return;
    closeClubUserPanel();
    void openUserProfile(clubPanelUserId);
  }, [clubPanelUserId, closeClubUserPanel, openUserProfile]);

  const filteredProfileSubscriptionRows = useMemo(() => {
    if (!profileData?.subscriptionRows?.length) return [];
    let list = [...profileData.subscriptionRows];
    const f = profileSubFilterApplied;
    list = list.filter((r) => rowMatchesProfileVersionFilter(r.version, f.version));
    list = list.filter((r) => profileRowInDateRange(r, f.filterIn, f.dateFrom, f.dateTo));
    if (f.ordering === 'dateStart') {
      list.sort((a, b) => (parseYmd(a.dateStart) ?? 0) - (parseYmd(b.dateStart) ?? 0));
    } else if (f.ordering === 'dateEnd') {
      list.sort((a, b) => (parseYmd(a.dateEnd) ?? 0) - (parseYmd(b.dateEnd) ?? 0));
    } else if (f.ordering === 'version') {
      list.sort((a, b) => a.version.localeCompare(b.version));
    }
    return list;
  }, [profileData, profileSubFilterApplied]);

  const openProfileSubFilter = () => {
    setProfileSubFilterDraft({ ...profileSubFilterApplied });
    setProfileSubFilterOpen(true);
  };

  const profileSubFilterOk = () => {
    setProfileSubFilterApplied({ ...profileSubFilterDraft, ordering: profileOrdering });
    setProfileSubFilterOpen(false);
  };

  const profileSubFilterExit = () => {
    setProfileSubFilterDraft({ ...profileSubFilterApplied });
    setProfileSubFilterOpen(false);
  };

  const profileSubProceed = () => {
    setProfileSubFilterApplied({ ...profileSubFilterDraft, ordering: profileOrdering });
    setProfileSubFilterOpen(false);
  };

  useEffect(() => {
    if (profileState === 'ready' && profilePanelRef.current) {
      profilePanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [profileState]);

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 text-gray-900">
      {!(profileState !== 'idle' && profileIsClubsSegment) && (
        <>
          <div className="bg-[#b8b8b8] px-4 py-3 border border-gray-400">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
              Details of subscription{profileIsClubsSegment ? ' · ' : ' — '}
              <span className="text-red-600">{roleTitle}</span>
            </h1>
          </div>

          <div className="bg-[#6b4c9a] text-white px-4 py-2.5 text-sm sm:text-base font-medium border-x border-b border-[#5a3d82]">
            {historicalSubtitle}
          </div>
        </>
      )}

      {profileState !== 'idle' ? (
        <div ref={profilePanelRef} className="border border-t-0 border-gray-300 bg-[#ececec]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-200 border-b border-gray-300">
            <button
              type="button"
              onClick={closeUserProfile}
              className="text-sm font-semibold text-blue-800 underline hover:text-blue-950"
            >
              ← Back to list
            </button>
          </div>

          {profileState === 'loading' && (
            <div className="py-16 text-center text-gray-600 border-x border-b border-gray-300 bg-white">Loading profile…</div>
          )}

          {profileState === 'error' && (
            <div className="p-6 border-x border-b border-gray-300 bg-white">
              <p className="text-red-700 text-sm">{profileError || 'Could not load profile.'}</p>
            </div>
          )}

          {profileState === 'ready' && profileData && profileIsClubsSegment && (
            <AdminClubsUserProfilePanel
              profileData={profileData}
              historicalSubtitle={historicalSubtitle}
              roleTitle={roleTitle}
              filteredRows={filteredProfileSubscriptionRows}
              profileRowSelected={profileRowSelected}
              setProfileRowSelected={setProfileRowSelected}
              profileSubFilterOpen={profileSubFilterOpen}
              profileSubFilterDraft={profileSubFilterDraft}
              setProfileSubFilterDraft={setProfileSubFilterDraft}
              profileOrdering={profileOrdering}
              setProfileOrdering={setProfileOrdering}
              profileSubFilterWrapRef={profileSubFilterWrapRef}
              onOpenProfileSubFilter={openProfileSubFilter}
              onProfileSubFilterExit={profileSubFilterExit}
              onProfileSubFilterOk={profileSubFilterOk}
              onProfileSubProceed={profileSubProceed}
              onClose={closeUserProfile}
            />
          )}

          {profileState === 'ready' && profileData && !profileIsClubsSegment && (
            <div className="bg-white border-x border-b border-gray-300">
              <div className="bg-[#b8b8b8] px-4 py-3 border-b border-gray-400">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Details of subscription — <span className="text-red-600">{roleTitle}</span>
                </h2>
              </div>
              <div className="bg-[#6b4c9a] text-white px-4 py-2.5 text-sm sm:text-base font-medium border-b border-[#5a3d82]">
                {historicalSubtitle}
              </div>

              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-28 h-36 border-2 border-dashed border-gray-400 bg-gray-50 flex items-center justify-center text-center text-xs text-gray-500 p-2">
                      {profileData.imageUrl ? (
                        isDataUrl(profileData.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileData.imageUrl}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Image
                            src={profileData.imageUrl}
                            alt=""
                            width={112}
                            height={144}
                            className="object-cover w-full h-full"
                          />
                        )
                      ) : (
                        <span className="font-semibold leading-tight">NO IMAGE AVAILABLE</span>
                      )}
                    </div>
                    <div className="w-16 h-16 bg-[#005c99] flex items-center justify-center text-white text-xs font-bold text-center leading-tight border border-gray-700">
                      {profileData.typeBadge}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600"
                        checked={profileTagged}
                        disabled={profilePanelSaving}
                        onChange={(e) => void saveProfilePanelSettings({ tagged: e.target.checked })}
                      />
                      Tag the user
                    </label>
                  </div>

                  <div className="flex-1 grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-gray-600">Full Name: </span>
                      <span className="text-gray-900 font-medium">{profileData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Country: </span>
                      <span className="text-gray-900">{profileData.country || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Username: </span>
                      <span className="text-gray-900 font-medium">{profileData.username}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Location: </span>
                      <span className="text-gray-900">{profileData.location || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Official Clubname: </span>
                      <span className="text-gray-900">{profileData.officialClubName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sport: </span>
                      <span className="text-gray-900">{profileData.sportLine || '—'}</span>
                    </div>
                    <div className="sm:col-span-2 text-xs text-gray-500">Email: {profileData.email}</div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <span className="text-sm text-gray-600">Put as favourite</span>
                    <select
                      className="border border-gray-500 bg-white px-2 py-1.5 text-sm rounded min-w-[140px] disabled:opacity-60"
                      value={profileFavouritePriority}
                      disabled={profilePanelSaving}
                      onChange={(e) =>
                        void saveProfilePanelSettings({
                          favouritePriority: normalizeFavouritePriority(e.target.value),
                        })
                      }
                    >
                      <option value="not_selected">Not selected</option>
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-blue-800 underline mt-4 pt-4 border-t border-gray-200">
                  <button type="button" onClick={handlePrint} className="hover:text-blue-950">
                    Print
                  </button>
                  <button type="button" onClick={openProfileSendMsgModal} className="hover:text-blue-950">
                    Send Msg
                  </button>
                  <button type="button" onClick={handleProfileSendMail} className="hover:text-blue-950">
                    Send Mail
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#d9d9d9] border-b border-gray-300 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filteredProfileSubscriptionRows.length > 0 &&
                      filteredProfileSubscriptionRows.every((r) => profileRowSelected.has(r.id))
                    }
                    onChange={() => {
                      if (
                        filteredProfileSubscriptionRows.length > 0 &&
                        filteredProfileSubscriptionRows.every((r) => profileRowSelected.has(r.id))
                      ) {
                        setProfileRowSelected(new Set());
                      } else {
                        setProfileRowSelected(new Set(filteredProfileSubscriptionRows.map((r) => r.id)));
                      }
                    }}
                    className="rounded border-gray-600"
                  />
                  Select all
                </label>
                <div ref={profileSubFilterWrapRef} className="relative ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => (profileSubFilterOpen ? profileSubFilterExit() : openProfileSubFilter())}
                    className="h-9 px-3 bg-neutral-900 text-white text-sm font-medium border border-black rounded flex items-center gap-1"
                  >
                    Filter <span className="text-[10px]">▾</span>
                  </button>

                  {profileSubFilterOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-2rem,380px)] border border-black bg-[#fff8dc] shadow-lg">
                      <div className="p-4 space-y-3 text-sm">
                        <FilterRow label="Version">
                          <select
                            value={profileSubFilterDraft.version}
                            onChange={(e) =>
                              setProfileSubFilterDraft((f) => ({ ...f, version: e.target.value }))
                            }
                            className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                          >
                            <option value="">All</option>
                            {PROFILE_SUBSCRIPTION_VERSION_OPTIONS.filter((v) => v !== 'All').map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </FilterRow>
                        <FilterRow label="Filter In">
                          <select
                            value={profileSubFilterDraft.filterIn}
                            onChange={(e) =>
                              setProfileSubFilterDraft((f) => ({
                                ...f,
                                filterIn: e.target.value as ProfileSubFilterIn,
                              }))
                            }
                            className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                          >
                            <option value="dateStart">Date Start</option>
                            <option value="dateEnd">Date End</option>
                          </select>
                        </FilterRow>
                        <FilterRow label="From">
                          <input
                            type="date"
                            value={profileSubFilterDraft.dateFrom}
                            onChange={(e) =>
                              setProfileSubFilterDraft((f) => ({ ...f, dateFrom: e.target.value }))
                            }
                            className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                          />
                        </FilterRow>
                        <FilterRow label="To">
                          <input
                            type="date"
                            value={profileSubFilterDraft.dateTo}
                            onChange={(e) =>
                              setProfileSubFilterDraft((f) => ({ ...f, dateTo: e.target.value }))
                            }
                            className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                          />
                        </FilterRow>
                        <FilterRow label="Ordering">
                          <select
                            value={profileSubFilterDraft.ordering}
                            onChange={(e) =>
                              setProfileSubFilterDraft((f) => ({
                                ...f,
                                ordering: e.target.value as ProfileSubOrdering,
                              }))
                            }
                            className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                          >
                            <option value="">Select</option>
                            <option value="dateStart">Date Start</option>
                            <option value="dateEnd">Date End</option>
                          </select>
                        </FilterRow>
                      </div>
                      <div className="flex justify-center gap-4 border-t border-gray-400 bg-[#f5ebc8] py-3">
                        <button
                          type="button"
                          onClick={profileSubFilterOk}
                          className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={profileSubFilterExit}
                          className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                        >
                          Exit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="bg-[#4a8f96] text-white">
                      <th className="w-10 px-2 py-2 text-left font-semibold border-r border-[#3d7a80]" />
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Full name</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Country</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-[#3d7a80] w-14">Flag</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Location</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date Start</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date End</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Version</th>
                      <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Username</th>
                      <th className="px-2 py-2 text-left font-semibold border-r border-[#3d7a80] w-14">E</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfileSubscriptionRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-gray-500 bg-white">
                          No subscription rows match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProfileSubscriptionRows.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                          <td className="px-2 py-2 border-t border-gray-300">
                            <input
                              type="checkbox"
                              checked={profileRowSelected.has(row.id)}
                              onChange={() => {
                                const next = new Set(profileRowSelected);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                setProfileRowSelected(next);
                              }}
                              className="rounded border-gray-500"
                            />
                          </td>
                          <td className="px-3 py-2 border-t border-gray-300 font-medium">
                            {profileData.fullName || '—'}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-300">{profileData.country || '—'}</td>
                          <CountryFlagCell country={profileData.country} />
                          <td className="px-3 py-2 border-t border-gray-300">{profileData.location || '—'}</td>
                          <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.dateStart}</td>
                          <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.dateEnd ?? '—'}</td>
                          <td className="px-3 py-2 border-t border-gray-300">{row.version}</td>
                          <td className="px-3 py-2 border-t border-gray-300 font-medium">{row.username}</td>
                          <td className="px-2 py-2 border-t border-gray-300 text-gray-700">{row.e}</td>
                          <td className="px-3 py-2 border-t border-gray-300">
                            <span
                              className={
                                row.status === 'Expired'
                                  ? 'text-red-600 font-semibold'
                                  : 'text-green-700 font-semibold'
                              }
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Membership tabs + toolbar */}
      <div className="bg-gray-100 border border-t-0 border-gray-300 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'All memberships'],
              ['current', 'Only current memberships'],
              ['last', 'Last membership'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMembershipTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded border transition ${
                membershipTab === key
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-neutral-900 text-white border-black hover:bg-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-3 flex-wrap">
          <div ref={filterWrapRef} className="relative flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => (filterOpen ? filterExit() : openFilterPanel())}
              className="px-3 py-2 bg-neutral-900 text-white text-sm font-medium border border-black rounded flex items-center gap-1"
            >
              Filter <span className="text-[10px]">▾</span>
            </button>

            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="h-9 border border-black bg-white px-3 text-sm rounded min-w-[160px] text-gray-800"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value || 'ordering'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {filterOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-2rem,420px)] border border-black bg-[#fff8dc] shadow-lg">
                <div className="p-4 space-y-3 text-sm">
                  <FilterRow label="Country">
                    <select
                      value={draftFilters.country}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, country: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {metaCountries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  <FilterRow label="Main Sport">
                    <select
                      value={draftFilters.mainSport}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, mainSport: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {metaSports.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  <FilterRow label="Version">
                    <select
                      value={draftFilters.version}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, version: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {versionOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  {isAllSegment && (
                    <FilterRow label="Type of user">
                      <select
                        value={draftFilters.userTypeCategory}
                        onChange={(e) =>
                          setDraftFilters((f) => ({ ...f, userTypeCategory: e.target.value }))
                        }
                        className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                      >
                        {USER_TYPE_CATEGORY_OPTIONS.map((o) => (
                          <option key={o.value || 'all-types'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </FilterRow>
                  )}

                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <span className="font-medium text-gray-900 shrink-0">Subscription</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <select
                        value={draftFilters.subDay}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subDay: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {DAY_OPTIONS.map((d) => (
                          <option key={d.value || 'd0'} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draftFilters.subMonth}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subMonth: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value || 'm0'} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draftFilters.subYear}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subYear: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y.value || 'y0'} value={y.value}>
                            {y.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-medium text-gray-900">Datarange</span>
                    <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-2">
                      <input
                        type="date"
                        value={draftFilters.rangeFrom}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, rangeFrom: e.target.value }))}
                        className="border border-gray-500 bg-white px-2 py-1 text-sm flex-1 min-w-[140px]"
                      />
                      <span className="text-gray-500">—</span>
                      <input
                        type="date"
                        value={draftFilters.rangeTo}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, rangeTo: e.target.value }))}
                        className="border border-gray-500 bg-white px-2 py-1 text-sm flex-1 min-w-[140px]"
                      />
                    </div>
                  </div>

                  <FilterRow label="Login">
                    <select
                      value={draftFilters.login}
                      onChange={(e) =>
                        setDraftFilters((f) => ({ ...f, login: e.target.value as LoginFilter }))
                      }
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      {LOGIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </FilterRow>
                </div>

                <div className="flex justify-center gap-4 border-t border-gray-400 bg-[#f5ebc8] py-3">
                  <button
                    type="button"
                    onClick={filterOk}
                    className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={filterExit}
                    className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={applySearch} className="flex flex-1 flex-wrap items-center gap-2 min-w-[240px]">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Search user</span>
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Fullname, Username"
              className="flex-1 min-w-[160px] h-9 border border-gray-500 px-3 text-sm rounded bg-white"
            />
            <button
              type="submit"
              className="h-9 px-5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded border border-red-800"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded border ${viewMode === 'list' ? 'bg-amber-400 border-amber-600' : 'bg-white border-gray-400'}`}
              title="List view"
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded border ${viewMode === 'grid' ? 'bg-amber-400 border-amber-600' : 'bg-white border-gray-400'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-blue-800 underline">
          <button type="button" onClick={handlePrint} className="hover:text-blue-950">
            Print
          </button>
          <button
            type="button"
            onClick={openSendMsgModal}
            disabled={actionBusy}
            className="hover:text-blue-950 disabled:opacity-50"
          >
            Send Msg
          </button>
          <button
            type="button"
            onClick={handleSendMail}
            disabled={actionBusy}
            className="hover:text-blue-950 disabled:opacity-50"
          >
            Send mail
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteSubscriptions()}
            disabled={actionBusy}
            className="hover:text-red-900 text-red-700 disabled:opacity-50"
          >
            Delete Subscriptions
          </button>
        </div>
      </div>

      {/* Select all + pagination bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#d9d9d9] border border-t-0 border-gray-300 px-3 py-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleSelectAll}
            className="rounded border-gray-600"
          />
          Select all
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 text-sm bg-white border border-gray-500 rounded disabled:opacity-40"
          >
            Prev
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`min-w-[2rem] px-2 py-1 text-sm rounded border ${
                n === page ? 'bg-red-600 text-white border-red-800' : 'bg-white border-gray-500'
              }`}
            >
              {n}
            </button>
          ))}
          {totalPages > pageNumbers[pageNumbers.length - 1]! && (
            <span className="text-sm text-gray-600 px-1">…</span>
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 text-sm bg-white border border-gray-500 rounded disabled:opacity-40"
          >
            Next
          </button>
          <span className="text-xs text-gray-600 ml-2">
            {total} record{total !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          type="button"
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-semibold border border-black rounded sm:ml-4"
        >
          Renewal selected memberships
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-800 text-sm border border-red-200 rounded">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-600">Loading…</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="border border-gray-300 bg-white p-4 rounded shadow-sm text-sm space-y-1"
            >
              <div className="font-semibold">{r.displayName || '—'}</div>
              <div className="text-gray-700">
                {r.country || '—'}{' '}
                {flagEmojiFromCountryName(r.country) && (
                  <span className="ml-1">{flagEmojiFromCountryName(r.country)}</span>
                )}
              </div>
              <div className="text-gray-600">{r.location?.trim() || '—'}</div>
              {isClubsSegment || (isAllSegment && isClubUserType(r.userType)) ? (
                <button
                  type="button"
                  onClick={() => void openClubUserPanel(r.id)}
                  className="text-blue-800 underline hover:text-blue-950 text-left"
                >
                  @{r.username}
                </button>
              ) : (
                <div className="text-gray-600">@{r.username}</div>
              )}
              <div>
                {r.dateStart} — {r.dateEnd ?? '—'}
              </div>
              <div>{r.version}</div>
              {showCompanyColumn && (
                <div className="text-gray-700">
                  Company:{' '}
                  {isAllSegment && r.userType === 'ATHLETE' ? '' : r.companyName || '—'}
                </div>
              )}
              {(isClubsSegment || isAllSegment) && isClubUserType(r.userType) && (
                <div className="text-red-600 font-semibold">
                  Clubs owned: {r.clubsOwnedCount ?? 0}
                </div>
              )}
              <div className={clubAdminStatusClassName(r.statusTone)}>{r.status}</div>
              <button
                type="button"
                onClick={() => void openUserProfile(r.id)}
                className="text-left text-sm text-blue-800 underline hover:text-blue-950"
              >
                View profile (search)
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-t-0 border-gray-300">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="bg-[#4a8f96] text-white">
                <th className="w-10 px-2 py-2 text-left font-semibold border-r border-[#3d7a80]" />
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Full name</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Country</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-[#3d7a80] w-14">Flag</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Location</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date Start</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date End</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Version</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Username</th>
                {showCompanyColumn && (
                  <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] min-w-[8rem]">
                    Company name
                  </th>
                )}
                <th className="px-2 py-2 text-left font-semibold border-r border-[#3d7a80] w-14">E</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Status</th>
                <th className="w-12 px-2 py-2 text-center font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showCompanyColumn ? 13 : 12} className="px-4 py-10 text-center text-gray-500 bg-white">
                    No registered users in this category yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}
                  >
                    <td className="px-2 py-2 border-t border-gray-300">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        className="rounded border-gray-500"
                      />
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300 font-medium">{r.displayName || '—'}</td>
                    <td className="px-3 py-2 border-t border-gray-300">{r.country?.trim() || '—'}</td>
                    <CountryFlagCell country={r.country} />
                    <td className="px-3 py-2 border-t border-gray-300">{r.location?.trim() || '—'}</td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{r.dateStart}</td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">
                      {r.dateEnd ?? '—'}
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300">{r.version}</td>
                    <td className="px-3 py-2 border-t border-gray-300 font-medium">
                      {isClubsSegment || (isAllSegment && isClubUserType(r.userType)) ? (
                        <button
                          type="button"
                          onClick={() => void openClubUserPanel(r.id)}
                          className="text-blue-800 underline hover:text-blue-950 font-medium"
                        >
                          {r.username}
                        </button>
                      ) : (
                        r.username
                      )}
                    </td>
                    {showCompanyColumn && (
                      <td className="px-3 py-2 border-t border-gray-300">
                        {isAllSegment && r.userType === 'ATHLETE'
                          ? ''
                          : r.companyName || '—'}
                      </td>
                    )}
                    <td className="px-2 py-2 border-t border-gray-300 text-gray-700">{r.amount}</td>
                    <td className="px-3 py-2 border-t border-gray-300">
                      <span className={clubAdminStatusClassName(r.statusTone)}>{r.status}</span>
                    </td>
                    <td className="px-2 py-2 border-t border-gray-300 text-center">
                      <button
                        type="button"
                        onClick={() => void openUserProfile(r.id)}
                        className="inline-flex p-1.5 border border-gray-500 bg-white rounded hover:bg-gray-100"
                        title="View profile and subscription details"
                      >
                        <SearchIcon className="w-4 h-4 text-gray-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Data comes from live registrations in Movesbook ({segment}).
        </p>
      )}
        </>
      )}

      {(isClubsSegment || isAllSegment) && (
        <AdminClubUserPanelModal
          isOpen={clubPanelOpen}
          loading={clubPanelLoading}
          error={clubPanelError}
          data={clubPanelData}
          onClose={closeClubUserPanel}
          onControlPanel={handleClubPanelControlPanel}
        />
      )}

      {msgModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setMsgModalOpen(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Send message</h2>
            <p className="mb-4 text-sm text-gray-600">
              To {msgTargets.map((t) => t.label).join(', ')}
            </p>
            <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              className="mb-3 w-full rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
            />
            <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={msgDraft}
              onChange={(e) => setMsgDraft(e.target.value)}
              rows={5}
              placeholder="Write your message…"
              className="mb-3 w-full resize-none rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
            />
            {msgError ? <p className="mb-2 text-sm text-red-600">{msgError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMsgModalOpen(false)}
                className="rounded border border-gray-400 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSendMsgSubmit()}
                disabled={msgSending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {msgSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <span className="font-medium text-gray-900 shrink-0">{label}</span>
      {children}
    </div>
  );
}

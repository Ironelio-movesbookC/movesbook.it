import {
  STATS_USER_KINDS,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';

export type LastLoggedDatePreset = 'today' | 'yesterday' | 'last7' | 'last30';


export type LastLoggedUserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  country: string | null;
  location: string;
  gender: string | null;
  imageUrl: string | null;
  userType: string;
  kind: StatsUserKind | null;
  kindLabel: string;
  roleLabel: string;
  lastLoginAt: string;
};

export type LastLoggedPayload = {
  users: LastLoggedUserRow[];
  total: number;
  countries: string[];
  filters: {
    date: LastLoggedDatePreset;
    from: string;
    to: string;
    userType: StatsUserKind | 'all';
    country: string | null;
  };
};

export const LAST_LOGGED_DATE_OPTIONS: Array<{
  value: LastLoggedDatePreset;
  label: string;
}> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
];

export function parseLastLoggedDatePreset(
  raw: string | null | undefined,
): LastLoggedDatePreset {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'yesterday' || v === 'last7' || v === 'last30') return v;
  return 'today';
}

/** Local calendar range for a date preset (inclusive). */
export function resolveLastLoggedDateRange(preset: LastLoggedDatePreset): {
  from: Date;
  to: Date;
} {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);

  if (preset === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'yesterday') {
    from.setDate(from.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() - 1);
    to.setHours(23, 59, 59, 999);
  } else if (preset === 'last7') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

export function parseLastLoggedUserType(
  raw: string | null | undefined,
): StatsUserKind | 'all' {
  const v = (raw ?? '').trim();
  if (!v || v === 'all') return 'all';
  return STATS_USER_KINDS.includes(v as StatsUserKind) ? (v as StatsUserKind) : 'all';
}

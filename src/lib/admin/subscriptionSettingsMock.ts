import type {
  SubscriptionEditData,
  SubscriptionListRow,
  SubscriptionUserType,
} from '@/types/adminSubscriptionSettings';

export const SUBSCRIPTION_LANGUAGES = [
  { code: 'en', label: 'En' },
  { code: 'fr', label: 'Fr' },
  { code: 'de', label: 'De' },
  { code: 'it', label: 'It' },
  { code: 'es', label: 'Es' },
  { code: 'por', label: 'Por' },
  { code: 'rus', label: 'Rus' },
  { code: 'ind', label: 'Ind' },
  { code: 'chin', label: 'Chin' },
  { code: 'arab', label: 'Arab' },
] as const;

const DEFAULT_TIERS = { trial: true, base: true, premium: true, pro: true };

function notify(...channels: SubscriptionListRow['notifyChannels'][number][]): SubscriptionListRow['notifyChannels'] {
  return channels;
}

export const SUBSCRIPTION_LIST_ROWS: SubscriptionListRow[] = [
  // Athlete
  { id: 1, listOrder: 1, code: 'U00', name: 'Trial Base', userType: 'athlete', days1: 361, days2: 10, price1: 101, price2: 10, credit1: 10, credit2: 20, credit3: 10, credit4: 10, inviteAthletes: -1, inviteTeams: -1, inviteGroups: -1, inviteClubs: -1, notifyChannels: notify('mail', 'network', 'cellular', 'facebook'), isDefault: true },
  { id: 2, listOrder: 2, code: 'U01', name: 'Trial for club members', userType: 'athlete', days1: 365, days2: 10, price1: 10, price2: 10, credit1: 10, credit2: 20, credit3: 10, credit4: 10, inviteAthletes: -1, inviteTeams: -1, inviteGroups: -1, inviteClubs: -1, notifyChannels: notify('mail', 'network', 'cellular', 'facebook') },
  { id: 3, listOrder: 3, code: 'U02', name: 'User- base version', userType: 'athlete', days1: 180, days2: 30, price1: 10, price2: 10, credit1: 10, credit2: 10, credit3: 10, credit4: 10, inviteAthletes: 1, inviteTeams: 1, inviteGroups: 1, inviteClubs: 1, notifyChannels: notify('mail', 'network') },
  { id: 4, listOrder: 4, code: 'U03', name: 'User- premium', userType: 'athlete', days1: 123, days2: 30, price1: 123, price2: 20, credit1: 20, credit2: 20, credit3: 20, credit4: 20, inviteAthletes: 5, inviteTeams: 3, inviteGroups: 2, inviteClubs: 1, notifyChannels: notify('mail', 'network', 'cellular') },
  { id: 5, listOrder: 5, code: 'U04', name: 'User- professional', userType: 'athlete', days1: 300, days2: 30, price1: 60, price2: 50, credit1: 30, credit2: 30, credit3: 30, credit4: 30, inviteAthletes: 10, inviteTeams: 5, inviteGroups: 5, inviteClubs: 3, notifyChannels: notify('mail', 'network', 'cellular', 'facebook') },
  // Coach
  { id: 6, listOrder: 6, code: 'C01', name: 'Coach Base PFU pay for users', userType: 'coach', days1: 365, days2: 30, price1: 50, price2: 20, credit1: 10, credit2: 10, credit3: 10, credit4: 10, inviteAthletes: 5, inviteTeams: 1, inviteGroups: 1, inviteClubs: 1, notifyChannels: notify('mail', 'network', 'cellular', 'facebook'), isDefault: true },
  { id: 7, listOrder: 7, code: 'C02', name: "Coach Base don't pay for users", userType: 'coach', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 15, credit2: 15, credit3: 15, credit4: 15, inviteAthletes: 10, inviteTeams: 3, inviteGroups: 2, inviteClubs: 2, notifyChannels: notify('mail', 'network') },
  { id: 8, listOrder: 8, code: 'C03', name: 'Coach Premium PFU', userType: 'coach', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 20, credit2: 20, credit3: 20, credit4: 20, inviteAthletes: 20, inviteTeams: 5, inviteGroups: 5, inviteClubs: 3, notifyChannels: notify('mail', 'network', 'cellular') },
  { id: 9, listOrder: 9, code: 'C04', name: 'Coach Premium', userType: 'coach', days1: 365, days2: 30, price1: 29, price2: 29, credit1: 5, credit2: 5, credit3: 5, credit4: 5, inviteAthletes: 2, inviteTeams: 1, inviteGroups: 1, inviteClubs: 1, notifyChannels: notify('mail', 'network') },
  { id: 19, listOrder: 10, code: 'C05', name: 'Coach Professional PFU', userType: 'coach', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 20, credit2: 20, credit3: 20, credit4: 20, inviteAthletes: 20, inviteTeams: 5, inviteGroups: 5, inviteClubs: 3, notifyChannels: notify('mail', 'network', 'cellular') },
  // Team
  { id: 10, listOrder: 11, code: 'T01', name: 'Team Base PFU pay for users', userType: 'team', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 10, credit2: 10, credit3: 10, credit4: 10, inviteAthletes: 10, inviteTeams: 1, inviteGroups: 1, inviteClubs: 1, notifyChannels: notify('mail', 'network', 'cellular', 'facebook'), isDefault: true },
  { id: 11, listOrder: 12, code: 'T02', name: "Team Base don't pay for user", userType: 'team', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 15, credit2: 15, credit3: 15, credit4: 15, inviteAthletes: 20, inviteTeams: 2, inviteGroups: 2, inviteClubs: 2, notifyChannels: notify('mail', 'network') },
  { id: 12, listOrder: 13, code: 'T03', name: 'Team Premium PFU', userType: 'team', days1: 365, days2: 30, price1: 1.99, price2: 1.99, credit1: 24, credit2: 24, credit3: 24, credit4: 24, inviteAthletes: 50, inviteTeams: 5, inviteGroups: 5, inviteClubs: 3, notifyChannels: notify('mail', 'network', 'cellular') },
  { id: 22, listOrder: 14, code: 'T04', name: 'Team Premium', userType: 'team', days1: 365, days2: 30, price1: 1.88, price2: 1.88, credit1: 15, credit2: 15, credit3: 15, credit4: 15, inviteAthletes: 20, inviteTeams: 2, inviteGroups: 2, inviteClubs: 2, notifyChannels: notify('mail', 'network') },
  { id: 23, listOrder: 15, code: 'T05', name: 'Team Professional PFU', userType: 'team', days1: 0, days2: 0, price1: 0, price2: 0, credit1: 24, credit2: 24, credit3: 24, credit4: 24, inviteAthletes: 50, inviteTeams: 5, inviteGroups: 5, inviteClubs: 3, notifyChannels: notify('mail', 'network', 'cellular') },
  // Group
  { id: 13, listOrder: 20, code: 'G01', name: 'Group Standard Version', userType: 'group', days1: 365, days2: 30, price1: 30, price2: 15, credit1: 10, credit2: 10, credit3: 10, credit4: 10, inviteAthletes: 10, inviteTeams: 1, inviteGroups: 1, inviteClubs: 1, notifyChannels: notify('mail', 'network') },
  { id: 14, listOrder: 21, code: 'G02', name: 'Group Premium', userType: 'group', days1: 365, days2: 30, price1: 60, price2: 30, credit1: 15, credit2: 15, credit3: 15, credit4: 15, inviteAthletes: 20, inviteTeams: 2, inviteGroups: 2, inviteClubs: 2, notifyChannels: notify('mail', 'network', 'cellular') },
  // Club
  { id: 15, listOrder: 16, code: 'Club Base', name: 'Club Base', userType: 'club', days1: 90, days2: 30, price1: 0, price2: 0, credit1: 20, credit2: 20, credit3: 20, credit4: 20, inviteAthletes: 13, inviteTeams: 1, inviteGroups: 10, inviteClubs: 1, notifyChannels: notify('mail', 'network'), isDefault: true },
  { id: 16, listOrder: 17, code: 'C02', name: 'Club Premium', userType: 'club', days1: 181, days2: 30, price1: 11, price2: 11, credit1: 30, credit2: 30, credit3: 30, credit4: 30, inviteAthletes: 13, inviteTeams: 1, inviteGroups: 10, inviteClubs: 1, notifyChannels: notify('mail', 'network', 'facebook') },
  { id: 17, listOrder: 18, code: 'Club Pro', name: 'Club Professional', userType: 'club', days1: 90, days2: 30, price1: 30, price2: 30, credit1: 40, credit2: 40, credit3: 40, credit4: 40, inviteAthletes: 13, inviteTeams: 1, inviteGroups: 10, inviteClubs: 1, notifyChannels: notify('mail', 'network', 'cellular', 'facebook') },
  { id: 18, listOrder: 19, code: 'C04', name: 'Club Trial', userType: 'club', days1: 30, days2: 10, price1: 0, price2: 0, credit1: 10, credit2: 10, credit3: 10, credit4: 10, inviteAthletes: 13, inviteTeams: 1, inviteGroups: 10, inviteClubs: 1, notifyChannels: notify('mail', 'network'), isTemplate: true },
];

export const CLUB_TEMPLATE_ROWS: SubscriptionListRow[] = Array.from({ length: 12 }, (_, i) => ({
  id: 100 + i,
  listOrder: 19 + i,
  code: '',
  name: '',
  userType: 'club' as const,
  days1: 0,
  days2: 0,
  price1: 0,
  price2: 0,
  credit1: 0,
  credit2: 0,
  credit3: 0,
  credit4: 0,
  inviteAthletes: 13,
  inviteTeams: 1,
  inviteGroups: 10,
  inviteClubs: 1,
  notifyChannels: notify('mail', 'network'),
  isTemplate: true,
}));

const USER_TYPE_LABELS: Record<SubscriptionUserType, string> = {
  athlete: 'Athlete',
  coach: 'Coach',
  team: 'Team',
  group: 'Group',
  club: 'Club',
};

export function getUserTypeLabel(type: SubscriptionUserType): string {
  return USER_TYPE_LABELS[type];
}

export function formatNotifyChannels(channels: SubscriptionListRow['notifyChannels']): string {
  const labels: Record<string, string> = {
    mail: 'Mail',
    network: 'Network',
    cellular: 'Cellular',
    facebook: 'Facebook',
  };
  return channels.map((c) => labels[c]).join('-');
}

export function getSubscriptionRowsByUserType(userType?: SubscriptionUserType | null): SubscriptionListRow[] {
  if (!userType) return SUBSCRIPTION_LIST_ROWS;
  return SUBSCRIPTION_LIST_ROWS.filter((r) => r.userType === userType);
}

export function getSubscriptionByListOrder(listOrder: number): SubscriptionListRow | undefined {
  return SUBSCRIPTION_LIST_ROWS.find((r) => r.listOrder === listOrder);
}

export function getSubscriptionById(id: number): SubscriptionListRow | undefined {
  return SUBSCRIPTION_LIST_ROWS.find((r) => r.id === id);
}

/** Resolve /subscriptions/edit_subscription/[param]/… — accepts subscription id or listOrder. */
export function resolveSubscriptionFromEditRouteParam(
  param: number,
): SubscriptionListRow | undefined {
  if (!Number.isFinite(param)) return undefined;

  const byListOrder = getSubscriptionByListOrder(param);
  const byId = getSubscriptionById(param);

  // e.g. /edit_subscription/15/en → id 15 Club Base, not listOrder 15 Team Pro
  if (byId?.userType === 'club' && byListOrder?.userType !== 'club') {
    return byId;
  }

  return byListOrder ?? byId;
}

export function getClubEditHref(row: SubscriptionListRow): string {
  return `/subscriptions/club_edit_subscription/${row.id}/club`;
}

export function getEditHref(row: SubscriptionListRow): string {
  if (row.userType === 'club') {
    return getClubEditHref(row);
  }
  return `/subscriptions/edit_subscription/${row.id}/en`;
}

function buildDefaultEditData(row: SubscriptionListRow): SubscriptionEditData {
  return {
    id: row.id,
    listOrder: row.listOrder,
    userType: row.userType,
    general: {
      code: row.code,
      name: row.name,
      senderRegisterCredit1: row.userType === 'athlete' ? 10 : 0,
      senderRegisterCredit2: row.userType === 'athlete' ? 20 : 0,
      receiverRegisterCredit1: row.userType === 'athlete' ? 15 : 0,
      receiverRegisterCredit2: row.userType === 'athlete' ? 25 : 0,
      maxDiscount: 10,
      promocodeDurationDays: 10,
      promocodeAssign: false,
      firstSubscriptionDays: row.days1,
      firstSubscriptionPrice: row.price1,
      firstSubscriptionPromoDiscount: 10,
      renewalDays: row.days2,
      renewalPrice: row.price2,
      renewalPromoDiscount: 10,
      tripleDurationDiscount: row.userType === 'coach' ? 40 : 60,
      tripleDurationPrice: row.userType === 'coach' ? 30 : 150,
      sloganByLang: {
        en:
          row.userType === 'athlete'
            ? '<p><em>This is a Test of Insertions of a Trial Base News.</em></p>'
            : row.userType === 'coach'
              ? '<p>Great offer for a 3 years renewal !!</p>'
              : row.userType === 'club'
                ? '<p><strong>Club version</strong> — training management, member sharing, and team tools for your organization.</p>'
                : '',
      },
    },
    settings: {
      coachesLimit: row.userType === 'athlete' ? 2 : 0,
      coachTiers: { ...DEFAULT_TIERS },
      athletesLimit: row.userType === 'coach' ? 5 : 0,
      athleteTiers: { trial: true, base: false, premium: false, pro: false },
      teams: { limit: row.inviteTeams, sharingEnabled: true },
      groups: { limit: row.inviteGroups, sharingEnabled: true },
      clubs: { limit: row.inviteClubs, sharingEnabled: true },
      alertDaysBefore: 0,
      alertDaysAfter: 0,
      alertEveryDay: false,
      notifyMail: row.notifyChannels.includes('mail'),
      notifyNetwork: row.notifyChannels.includes('network'),
      notifyCellular: row.notifyChannels.includes('cellular'),
      notifyFacebook: row.notifyChannels.includes('facebook'),
      inviteEndMode: row.userType === 'coach' ? 'days_after_accept' : 'own_subscription',
      inviteEndDays: 2,
      invitedUserVersion: 'same',
      expirationMessageEnabled: row.userType === 'coach',
      expirationDaysAfter: 30,
      expirationDaysBefore: 30,
      expirationMessageByLang: {
        en:
          row.userType === 'coach'
            ? '<p>Details of subscription C01 - Coach Base PFU pay for users en</p>'
            : '',
      },
      lastNewsByLang: {
        en:
          row.userType === 'athlete'
            ? '<p><em>This is a Test of Insertions of a Trial Base News.</em></p>'
            : row.userType === 'club' && row.code === 'Club Base'
              ? '<p style="text-align:center"><strong style="color:#8b0000;font-size:1.25rem">NEW FEATURES OF <em>CLUB version BASE</em></strong></p><p style="background:#e0e0e0;padding:8px"><strong style="color:#8b0000;font-style:italic">11 Nov 2021</strong></p><p style="color:#888;font-style:italic;font-size:0.875rem">Elio</p>'
              : row.userType === 'coach'
                ? '<p>Great offer for a 3 years renewal !!</p>'
                : '',
      },
    },
  };
}

const editDataCache = new Map<number, SubscriptionEditData>();

export function getSubscriptionEditData(idOrListOrder: number, byListOrder = false): SubscriptionEditData | null {
  const row = byListOrder
    ? getSubscriptionByListOrder(idOrListOrder)
    : getSubscriptionById(idOrListOrder);
  if (!row) return null;

  const cacheKey = row.id;
  if (!editDataCache.has(cacheKey)) {
    editDataCache.set(cacheKey, buildDefaultEditData(row));
  }
  return editDataCache.get(cacheKey)!;
}

export function saveSubscriptionEditData(data: SubscriptionEditData): void {
  editDataCache.set(data.id, data);
}

import type {
  FunctionAvailabilityMap,
  FunctionListItem,
  FunctionSettingCategory,
  FunctionSettingsData,
  FunctionSettingsTab,
} from '@/types/adminFunctionSettings';

export const SOCIAL_FUNCTIONS: FunctionListItem[] = [
  { id: 1, name: 'Polls' },
  { id: 2, name: 'Blogs' },
  { id: 3, name: 'Photo' },
  { id: 4, name: 'Campaign' },
  { id: 5, name: 'Events' },
  { id: 6, name: 'Question&Answer' },
  { id: 7, name: 'Employment' },
  { id: 8, name: 'Bacheca' },
  { id: 9, name: 'Message' },
  { id: 10, name: 'Chat' },
  { id: 11, name: 'Sharing' },
  { id: 12, name: 'Comments' },
  { id: 13, name: 'Fan Clubs' },
  { id: 14, name: 'Friends' },
  { id: 15, name: 'Classified' },
  { id: 16, name: 'Education' },
  { id: 17, name: 'Video' },
  { id: 18, name: 'Music' },
  { id: 19, name: 'Other Media' },
  { id: 20, name: 'Favorite Links' },
  { id: 21, name: 'Forum' },
  { id: 22, name: 'Winks' },
  { id: 23, name: 'Sharing friends' },
];

export const TRAINING_FUNCTIONS: FunctionListItem[] = [
  { id: 1, name: 'Online training diary111' },
  { id: 2, name: 'Social Networking' },
  { id: 3, name: 'Advanced input forms for all sports' },
  { id: 4, name: 'Week plan builder' },
  { id: 5, name: 'All advanced options available' },
  { id: 6, name: 'View totals' },
  { id: 7, name: 'Setting goals and monitor progress' },
  { id: 8, name: 'Measures and weight tables' },
  { id: 9, name: 'Export and share workouts' },
  { id: 10, name: 'Complete reports' },
  { id: 11, name: 'Compare todo and done workouts' },
  { id: 12, name: 'Compare with your other periods' },
  { id: 13, name: "Compare your friends' workouts" },
  { id: 14, name: 'Statistics and graphs' },
  { id: 15, name: 'Yearly and monthly total grids' },
  { id: 16, name: 'View workdata on smartphone' },
  { id: 17, name: 'Manage workouts by 1 to 3 coaches' },
  { id: 18, name: 'Advanced workout builder' },
  { id: 19, name: "Download on athletes' plan" },
  { id: 20, name: "Manage and control athletes' trainings" },
  { id: 21, name: 'Statistics among athletes' },
  { id: 22, name: 'Advanced sharing for team vers.' },
];

export const FUNCTION_SETTING_CATEGORIES: FunctionSettingCategory[] = [
  {
    key: 'singleUser',
    label: 'Single User',
    versions: [
      { key: 'trial_base', label: 'Trial Base' },
      { key: 'trial_club', label: 'Trial for club members' },
      { key: 'user_base', label: 'User- base version' },
      { key: 'user_premium', label: 'User- premium' },
      { key: 'user_professional', label: 'User- professional' },
    ],
  },
  {
    key: 'coach',
    label: 'Coach',
    versions: [
      { key: 'coach_base_pfu', label: 'Coach Base PFU pay for users' },
      { key: 'coach_base_no_pfu', label: "Coach Base don't pay for users" },
      { key: 'coach_premium_pfu', label: 'Coach Premium PFU' },
      { key: 'coach_premium', label: 'Coach Premium' },
      { key: 'coach_pro_pfu', label: 'Coach Professional PFU' },
      { key: 'coach_pro', label: 'Coach Professional' },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    versions: [
      { key: 'team_base_pfu', label: 'Team Base PFU pay for users' },
      { key: 'team_base_no_pfu', label: "Team Base don't pay for user" },
      { key: 'team_premium_pfu', label: 'Team Premium PFU' },
      { key: 'team_premium', label: 'Team Premium' },
      { key: 'team_pro_pfu', label: 'Team Professional PFU' },
      { key: 'team_pro', label: 'Team Professional' },
    ],
  },
  {
    key: 'club',
    label: 'Club',
    versions: [
      { key: 'club_base', label: 'Club Base' },
      { key: 'club_premium', label: 'Club Premium' },
      { key: 'club_pro', label: 'Club Professional' },
      { key: 'club_trial', label: 'Club Trial' },
    ],
  },
  {
    key: 'group',
    label: 'Group',
    versions: [{ key: 'group_standard', label: 'Group Standard Version' }],
  },
];

function allVersionKeys(): string[] {
  return FUNCTION_SETTING_CATEGORIES.flatMap((cat) => cat.versions.map((v) => v.key));
}

function buildAvailability(preset: Record<string, boolean>): FunctionAvailabilityMap {
  const map: FunctionAvailabilityMap = {};
  for (const key of allVersionKeys()) {
    map[key] = preset[key] ?? false;
  }
  return map;
}

const SOCIAL_DEFAULTS: FunctionAvailabilityMap = buildAvailability({
  trial_base: true,
  trial_club: false,
  user_base: true,
  user_premium: true,
  user_professional: true,
  coach_base_pfu: true,
  coach_base_no_pfu: true,
  coach_premium_pfu: true,
  coach_premium: true,
  coach_pro_pfu: true,
  coach_pro: true,
  team_base_pfu: false,
  team_base_no_pfu: false,
  team_premium_pfu: false,
  team_premium: false,
  team_pro_pfu: false,
  team_pro: false,
  club_base: true,
  club_premium: false,
  club_pro: true,
  club_trial: false,
  group_standard: true,
});

const TRAINING_DEFAULTS: FunctionAvailabilityMap = buildAvailability({
  trial_base: true,
  trial_club: true,
  user_base: true,
  user_premium: true,
  user_professional: true,
  coach_base_pfu: true,
  coach_base_no_pfu: true,
  coach_premium_pfu: true,
  coach_premium: true,
  coach_pro_pfu: true,
  coach_pro: true,
  team_base_pfu: true,
  team_base_no_pfu: true,
  team_premium_pfu: true,
  team_premium: true,
  team_pro_pfu: true,
  team_pro: true,
  club_base: false,
  club_premium: false,
  club_pro: true,
  club_trial: false,
  group_standard: true,
});

const settingsCache = new Map<string, FunctionSettingsData>();

function cacheKey(tab: FunctionSettingsTab, functionId: number): string {
  return `${tab}-${functionId}`;
}

export function getFunctionList(tab: FunctionSettingsTab): FunctionListItem[] {
  if (tab === 'training') return TRAINING_FUNCTIONS;
  if (tab === 'social') return SOCIAL_FUNCTIONS;
  return [];
}

export function getFunctionById(tab: FunctionSettingsTab, functionId: number): FunctionListItem | undefined {
  return getFunctionList(tab).find((f) => f.id === functionId);
}

export function getFunctionSettingsData(
  tab: FunctionSettingsTab,
  functionId: number,
): FunctionSettingsData | null {
  const fn = getFunctionById(tab, functionId);
  if (!fn) return null;

  const key = cacheKey(tab, functionId);
  if (!settingsCache.has(key)) {
    settingsCache.set(key, {
      functionId,
      tab,
      availability: {
        ...(tab === 'training' ? TRAINING_DEFAULTS : SOCIAL_DEFAULTS),
      },
    });
  }
  return settingsCache.get(key)!;
}

export function saveFunctionSettingsData(data: FunctionSettingsData): void {
  settingsCache.set(cacheKey(data.tab, data.functionId), data);
}

export function getFunctionSettingsBasePath(tab: FunctionSettingsTab): string {
  if (tab === 'training') return '/subscriptions/function_training_settings';
  if (tab === 'management') return '/subscriptions/function_settings_mang';
  return '/subscriptions/function_settings';
}

export function getFunctionSettingsTabHref(tab: FunctionSettingsTab, lang = 'en'): string {
  if (tab === 'management') return `/subscriptions/function_settings_mang/${lang}`;
  return `${getFunctionSettingsBasePath(tab)}/1`;
}

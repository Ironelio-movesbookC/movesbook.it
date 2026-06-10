import type { ProcedureRowSettings } from '@/lib/admin/userPcuFunctionsSettings';

export type ProcedureTabId = 'social' | 'training' | 'management';

export type ProcedureRow = ProcedureRowSettings;

export type ProcedureRowsByTab = Record<ProcedureTabId, ProcedureRow[]>;

function row(
  id: string,
  label: string,
  status: ProcedureRow['status'] = 'disabled',
  on = false,
): ProcedureRow {
  return { id, label, status, on };
}

export const DEFAULT_PROCEDURE_ROWS_BY_TAB: ProcedureRowsByTab = {
  social: [
    row('polls', 'Polls', 'optional_on', true),
    row('blogs', 'Blogs', 'optional_on', true),
    row('photo', 'Photo', 'disabled', false),
    row('campaign', 'Campaign', 'disabled', false),
    row('events', 'Events', 'optional_on', true),
    row('qa', 'Question&Answer', 'optional_on', true),
    row('employment', 'Employment', 'optional_on', true),
    row('bacheca', 'Bacheca', 'optional_on', true),
    row('message', 'Message', 'optional_on', true),
    row('chat', 'Chat', 'disabled', false),
    row('sharing', 'Sharing', 'optional_on', true),
    row('comments', 'Comments', 'optional_on', true),
    row('fanclubs', 'Fan Clubs', 'optional_on', true),
    row('friends', 'Friends', 'optional_on', true),
    row('classified', 'Classified', 'disabled', false),
    row('education', 'Education', 'optional_on', true),
    row('video', 'Video', 'optional_on', true),
    row('music', 'Music', 'disabled', false),
    row('otherMedia', 'Other Media', 'disabled', false),
    row('favLinks', 'Favorite Links', 'optional_on', true),
    row('forum', 'Forum', 'optional_on', true),
    row('winks', 'Winks', 'optional_on', true),
    row('sharingFriends', 'Sharing friends', 'disabled', false),
  ],
  training: [
    row('onlineTrainingDiary', 'Online training diary111'),
    row('socialNetworking', 'Social Networking'),
    row('advancedInputForms', 'Advanced input forms for all sports'),
    row('weekPlanBuilder', 'Week plan builder'),
    row('allAdvancedOptions', 'All advanced options available'),
    row('viewTotals', 'View totals'),
    row('settingGoals', 'Setting goals and monitor progress'),
    row('measuresWeightTables', 'Measures and weight tables'),
    row('exportShareWorkouts', 'Export and share workouts'),
    row('completeReports', 'Complete reports'),
    row('compareTodoDone', 'Compare todo and done workouts'),
    row('compareOtherPeriods', 'Compare with your other periods'),
    row('compareFriendsWorkouts', "Compare your friends' workouts"),
    row('statisticsGraphs', 'Statistics and graphs'),
    row('yearlyMonthlyGrids', 'Yearly and monthly total grids'),
    row('viewWorkdataSmartphone', 'View workdata on smartphone'),
    row('manageWorkoutsCoaches', "Manage workouts by 1 to 3 coaches"),
    row('advancedWorkoutBuilder', 'Advanced workout builder'),
    row('downloadAthletesPlan', "Download on athletes' plan"),
    row('manageControlAthletes', "Manage and control athletes' trainings"),
    row('statisticsAmongAthletes', 'Statistics among athletes'),
    row('advancedSharingsTeam', 'Advanced sharings for team vers.'),
  ],
  management: [
    row('membersManagement', 'Members management'),
    row('coachesManagement', 'Coaches management'),
    row('teamsManagement', 'Teams management'),
    row('paymentsManagement', 'Payments management'),
    row('subscriptionCosts', 'Subscription costs and deadlines'),
    row('cardsManagement', 'Cards management'),
    row('reportsManagement', 'Reports and statistics'),
    row('clubSettings', 'Club settings'),
    row('operatorsAssignment', 'Operators assignment'),
    row('devicesManagement', 'Devices management'),
  ],
};

function mergeRows(defaults: ProcedureRow[], saved?: ProcedureRow[]): ProcedureRow[] {
  if (!saved?.length) return defaults.map((r) => ({ ...r }));
  const byId = new Map(saved.map((r) => [r.id, r]));
  return defaults.map((def) => {
    const hit = byId.get(def.id);
    if (!hit) return { ...def };
    return {
      id: def.id,
      label: hit.label?.trim() ? hit.label : def.label,
      status: hit.status ?? def.status,
      on: Boolean(hit.on),
    };
  });
}

export function mergeProcedureRowsByTab(saved?: Partial<ProcedureRowsByTab>): ProcedureRowsByTab {
  const tabs: ProcedureTabId[] = ['social', 'training', 'management'];
  const next = {} as ProcedureRowsByTab;
  for (const tab of tabs) {
    next[tab] = mergeRows(DEFAULT_PROCEDURE_ROWS_BY_TAB[tab], saved?.[tab]);
  }
  return next;
}

export function buildProcedureSavePayload(
  rowsByTab: ProcedureRowsByTab,
  tab: ProcedureTabId,
): {
  tab: ProcedureTabId;
  rowsByTab: ProcedureRowsByTab;
  rows: ProcedureRow[];
} {
  return {
    tab,
    rowsByTab,
    /** Legacy field — social tab rows (kept in sync for older readers). */
    rows: rowsByTab.social.map((r) => ({ ...r })),
  };
}

/** Load procedure state from saved JSON (supports legacy `rows` = social only). */
export function parseProcedureFromSaved(
  saved?: {
    tab?: ProcedureTabId;
    rows?: ProcedureRow[];
    rowsByTab?: Partial<ProcedureRowsByTab>;
  } | null,
): { tab: ProcedureTabId; rowsByTab: ProcedureRowsByTab } {
  const tab = saved?.tab ?? 'social';
  const rowsByTab = mergeProcedureRowsByTab({
    social: saved?.rowsByTab?.social ?? saved?.rows,
    training: saved?.rowsByTab?.training,
    management: saved?.rowsByTab?.management,
  });
  return { tab, rowsByTab };
}

/** Merge incoming procedure patch with previously stored procedure. */
export function mergeProcedureSaved(
  prev?: {
    tab?: ProcedureTabId;
    rows?: ProcedureRow[];
    rowsByTab?: Partial<ProcedureRowsByTab>;
  } | null,
  incoming?: {
    tab?: ProcedureTabId;
    rows?: ProcedureRow[];
    rowsByTab?: Partial<ProcedureRowsByTab>;
  } | null,
): ReturnType<typeof buildProcedureSavePayload> {
  const tab = incoming?.tab ?? prev?.tab ?? 'social';
  const rowsByTab = mergeProcedureRowsByTab({
    social:
      incoming?.rowsByTab?.social ??
      incoming?.rows ??
      prev?.rowsByTab?.social ??
      prev?.rows,
    training: incoming?.rowsByTab?.training ?? prev?.rowsByTab?.training,
    management: incoming?.rowsByTab?.management ?? prev?.rowsByTab?.management,
  });
  return buildProcedureSavePayload(rowsByTab, tab);
}

export function applyProcedureRowOnToggle(row: ProcedureRow, on: boolean): ProcedureRow {
  if (on) {
    if (row.status === 'disabled') return { ...row, on: true, status: 'enabled' };
    if (row.status === 'optional_off') return { ...row, on: true, status: 'optional_on' };
    return { ...row, on: true };
  }
  if (row.status === 'enabled') return { ...row, on: false, status: 'disabled' };
  if (row.status === 'optional_on') return { ...row, on: false, status: 'optional_off' };
  return { ...row, on: false };
}

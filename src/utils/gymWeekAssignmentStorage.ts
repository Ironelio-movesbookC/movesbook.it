import type { GymWeekWeekAssignment } from '@/types/gymWeekAssignment';

const STORAGE_KEY = 'movesbook_gym_week_assignments_v1';

type Store = Record<string, GymWeekWeekAssignment>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getGymWeekAssignment(weekId: string): GymWeekWeekAssignment | null {
  return readStore()[weekId] ?? null;
}

export function saveGymWeekAssignment(assignment: GymWeekWeekAssignment) {
  const store = readStore();
  store[assignment.weekId] = { ...assignment, updatedAt: new Date().toISOString() };
  writeStore(store);
}

export function deleteGymWeekAssignment(weekId: string) {
  const store = readStore();
  delete store[weekId];
  writeStore(store);
}

export function weekHasGymPlan(weekId: string): boolean {
  const a = getGymWeekAssignment(weekId);
  return Boolean(a?.slots?.length);
}

export function countAssignedSlots(assignment: GymWeekWeekAssignment | null): number {
  return assignment?.slots?.length ?? 0;
}

/** Routine day indices that already have at least one slot in this assignment. */
export function assignedRoutineDayIndices(assignment: GymWeekWeekAssignment | null): Set<number> {
  const s = new Set<number>();
  for (const slot of assignment?.slots ?? []) {
    s.add(slot.routineDayIndex);
  }
  return s;
}

import {
  WEEKLY_STRUCTURE_PLAN_KEYS,
  WEEKLY_STRUCTURE_SESSIONS,
  type WeeklyStructureDayGrid,
  type WeeklyStructurePlanKey,
  type WeeklyStructurePlanPersist,
} from '@/lib/weeklyStructureTypes';

const STORAGE_PREFIX = 'movesbook_weekly_structure_v1_';

export function newWeeklyStructureId(): string {
  return `pw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isValidPlanPersist(value: unknown): value is WeeklyStructurePlanPersist {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!o.meta || typeof o.meta !== 'object') return false;
  const m = o.meta as Record<string, unknown>;
  if (typeof m.name !== 'string' || typeof m.color !== 'string' || typeof m.periodId !== 'string') {
    return false;
  }
  if (!Array.isArray(o.planned)) return false;
  if (!o.grid || typeof o.grid !== 'object') return false;
  return true;
}

export function normalizeWeeklyStructurePlan(p: WeeklyStructurePlanPersist): WeeklyStructurePlanPersist {
  return {
    meta: {
      name: p.meta?.name ?? '',
      color: p.meta?.color ?? '#f97316',
      periodId: p.meta?.periodId ?? '',
    },
    planned: Array.isArray(p.planned) ? p.planned : [],
    grid: (p.grid && typeof p.grid === 'object' ? p.grid : {}) as WeeklyStructureDayGrid,
  };
}

export function loadWeeklyStructurePlan(key: WeeklyStructurePlanKey): WeeklyStructurePlanPersist {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) throw new Error('empty');
    const p = JSON.parse(raw) as WeeklyStructurePlanPersist;
    if (!p.meta || !Array.isArray(p.planned) || !p.grid) throw new Error('bad');
    return normalizeWeeklyStructurePlan(p);
  } catch {
    return {
      meta: { name: '', color: '#f97316', periodId: '' },
      planned: [],
      grid: {},
    };
  }
}

export function saveWeeklyStructurePlan(key: WeeklyStructurePlanKey, data: WeeklyStructurePlanPersist) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

export function collectWeeklyStructureBlobForServer(): Record<WeeklyStructurePlanKey, WeeklyStructurePlanPersist> {
  const out = {} as Record<WeeklyStructurePlanKey, WeeklyStructurePlanPersist>;
  for (const k of WEEKLY_STRUCTURE_PLAN_KEYS) {
    out[k] = loadWeeklyStructurePlan(k);
  }
  return out;
}

export function applyWeeklyStructureBlobFromServer(blob: unknown) {
  if (!blob || typeof blob !== 'object') return;
  const o = blob as Record<string, unknown>;
  for (const k of WEEKLY_STRUCTURE_PLAN_KEYS) {
    const v = o[k];
    if (isValidPlanPersist(v)) saveWeeklyStructurePlan(k, normalizeWeeklyStructurePlan(v));
  }
}

export function assignedIdsFromGrid(grid: WeeklyStructureDayGrid): Set<string> {
  const s = new Set<string>();
  for (let d = 1; d <= 7; d++) {
    const day = grid[d];
    if (!day) continue;
    for (const sn of WEEKLY_STRUCTURE_SESSIONS) {
      for (const id of day[sn] || []) s.add(id);
    }
  }
  return s;
}

/** Deep-clone a plan with fresh planned-workout ids and remapped grid references. */
export function cloneWeeklyStructurePlanData(source: WeeklyStructurePlanPersist): WeeklyStructurePlanPersist {
  const idMap = new Map<string, string>();
  const planned = source.planned.map((row) => {
    const newId = newWeeklyStructureId();
    idMap.set(row.id, newId);
    return { ...row, id: newId };
  });

  const grid: WeeklyStructureDayGrid = {};
  for (let d = 1; d <= 7; d++) {
    const day = source.grid[d];
    if (!day) continue;
    grid[d] = {};
    for (const sn of WEEKLY_STRUCTURE_SESSIONS) {
      const ids = (day[sn] || []).map((oldId) => idMap.get(oldId)).filter(Boolean) as string[];
      if (ids.length) grid[d][sn] = ids;
    }
  }

  return {
    meta: { ...source.meta },
    planned,
    grid,
  };
}

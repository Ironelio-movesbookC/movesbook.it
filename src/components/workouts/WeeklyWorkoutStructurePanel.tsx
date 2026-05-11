'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { GripVertical, Trash2, Info } from 'lucide-react';
import { SPORTS_LIST } from '@/constants/moveframe.constants';
import { getSportIcon } from '@/utils/sportIcons';

const PLAN_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
type PlanKey = (typeof PLAN_KEYS)[number];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const SESSIONS = [1, 2, 3] as const;

const GOAL_CODES = ['INT', 'FTK', 'AP', 'CL', 'E', 'REC', 'TEM', 'OTH'] as const;

const STORAGE_PREFIX = 'movesbook_weekly_structure_v1_';

const MODAL_BACKDROP_CLASS =
  'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40';

function portalToBody(node: React.ReactNode) {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

export type WeeklyStructurePeriod = { id: string; name: string; color: string };

export type PlannedWorkout = {
  id: string;
  sportKey: string;
  distance: string;
  time: string;
  goalCode: string;
  description: string;
};

type DayGrid = Record<number, Record<number, string[]>>; // day 1-7, session 1-3 -> planned ids

type PlanPersist = {
  meta: { name: string; color: string; periodId: string };
  planned: PlannedWorkout[];
  grid: DayGrid;
};

function isValidPlanPersist(value: unknown): value is PlanPersist {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!o.meta || typeof o.meta !== 'object') return false;
  const m = o.meta as Record<string, unknown>;
  if (typeof m.name !== 'string' || typeof m.color !== 'string' || typeof m.periodId !== 'string') return false;
  if (!Array.isArray(o.planned)) return false;
  if (!o.grid || typeof o.grid !== 'object') return false;
  return true;
}

function normalizePlanPersist(p: PlanPersist): PlanPersist {
  return {
    meta: {
      name: p.meta?.name ?? '',
      color: p.meta?.color ?? '#f97316',
      periodId: p.meta?.periodId ?? ''
    },
    planned: Array.isArray(p.planned) ? p.planned : [],
    grid: (p.grid && typeof p.grid === 'object' ? p.grid : {}) as DayGrid
  };
}

function applyWeeklyStructureBlobFromServer(blob: unknown) {
  if (!blob || typeof blob !== 'object') return;
  const o = blob as Record<string, unknown>;
  for (const k of PLAN_KEYS) {
    const v = o[k];
    if (isValidPlanPersist(v)) savePlan(k, normalizePlanPersist(v));
  }
}

function collectWeeklyStructureBlobForServer(): Record<PlanKey, PlanPersist> {
  const out = {} as Record<PlanKey, PlanPersist>;
  for (const k of PLAN_KEYS) {
    out[k] = loadPlan(k);
  }
  return out;
}

function newId() {
  return `pw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadPlan(key: PlanKey): PlanPersist {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) throw new Error('empty');
    const p = JSON.parse(raw) as PlanPersist;
    if (!p.meta || !Array.isArray(p.planned) || !p.grid) throw new Error('bad');
    return {
      meta: {
        name: p.meta.name || '',
        color: p.meta.color || '#f97316',
        periodId: p.meta.periodId || ''
      },
      planned: p.planned,
      grid: p.grid
    };
  } catch {
    return {
      meta: { name: '', color: '#f97316', periodId: '' },
      planned: [],
      grid: {}
    };
  }
}

function savePlan(key: PlanKey, data: PlanPersist) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function parseMeters(dist: string): number {
  const m = dist.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function assignedIds(grid: DayGrid): Set<string> {
  const s = new Set<string>();
  for (let d = 1; d <= 7; d++) {
    const day = grid[d];
    if (!day) continue;
    for (const sn of SESSIONS) {
      for (const id of day[sn] || []) s.add(id);
    }
  }
  return s;
}

type DropPrompt =
  | null
  | {
      day: number;
      session: number;
      plannedId: string;
      sportKey: string;
    };

function WeeklySportIconThumb({
  sport,
  iconType,
  size,
  className = ''
}: {
  sport: string;
  iconType: 'emoji' | 'icon';
  size: number;
  className?: string;
}) {
  const icon = getSportIcon(sport, iconType);
  const isImage = icon.startsWith('/');
  if (isImage) {
    return (
      <div
        className={`flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={icon}
          alt={sport.replace(/_/g, ' ')}
          width={size}
          height={size}
          className="object-contain"
        />
      </div>
    );
  }
  const emojiPx = Math.max(14, Math.round(size * 0.88));
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 leading-none ${className}`}
      style={{ fontSize: emojiPx }}
      aria-hidden
    >
      {icon}
    </span>
  );
}

export default function WeeklyWorkoutStructurePanel({ periods }: { periods: WeeklyStructurePeriod[] }) {
  const [planKey, setPlanKey] = useState<PlanKey>('A');
  const [meta, setMeta] = useState({ name: '', color: '#f97316', periodId: '' });
  const [planned, setPlanned] = useState<PlannedWorkout[]>([]);
  const [grid, setGrid] = useState<DayGrid>({});
  const [snapshot, setSnapshot] = useState<PlanPersist | null>(null);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  /** When true, planned-workouts table shows only rows currently placed on the week grid */
  const [showOnlyWeekAssignedInList, setShowOnlyWeekAssignedInList] = useState(false);
  const [dropPrompt, setDropPrompt] = useState<DropPrompt>(null);
  const [formOpen, setFormOpen] = useState<{
    sportKey: string;
    editingId?: string;
    distance: string;
    time: string;
    goalCode: string;
    description: string;
  } | null>(null);
  const [listDropHint, setListDropHint] = useState(false);
  const [moveIdx, setMoveIdx] = useState<number | null>(null);
  const [sportIconType, setSportIconType] = useState<'emoji' | 'icon'>('emoji');
  const [weeklyHydrated, setWeeklyHydrated] = useState(false);
  const [savingRemote, setSavingRemote] = useState(false);
  const [planMetaModalOpen, setPlanMetaModalOpen] = useState(false);
  const [planMetaDraft, setPlanMetaDraft] = useState({ name: '', color: '#f97316', periodId: '' });

  useEffect(() => {
    const syncSportIconType = () => {
      const saved = localStorage.getItem('sportIconType');
      setSportIconType(saved === 'icon' ? 'icon' : 'emoji');
    };
    syncSportIconType();
    window.addEventListener('storage', syncSportIconType);
    window.addEventListener('focus', syncSportIconType);
    window.addEventListener('sportIconTypeChange', syncSportIconType);
    return () => {
      window.removeEventListener('storage', syncSportIconType);
      window.removeEventListener('focus', syncSportIconType);
      window.removeEventListener('sportIconTypeChange', syncSportIconType);
    };
  }, []);

  useEffect(() => {
    const modalOpen = dropPrompt != null || planMetaModalOpen || formOpen != null;
    if (!modalOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [dropPrompt, planMetaModalOpen, formOpen]);

  const plannedById = useMemo(() => new Map(planned.map((p) => [p.id, p])), [planned]);
  const assigned = useMemo(() => assignedIds(grid), [grid]);

  const plannedRowsForTable = useMemo(() => {
    if (!showOnlyWeekAssignedInList) return planned;
    return planned.filter((r) => assigned.has(r.id));
  }, [planned, assigned, showOnlyWeekAssignedInList]);

  const loadKey = useCallback((k: PlanKey) => {
    const p = loadPlan(k);
    setMeta(p.meta);
    setPlanned(p.planned);
    setGrid(p.grid);
    setSnapshot(JSON.parse(JSON.stringify(p)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          const res = await fetch('/api/user/settings', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok && !cancelled) {
            const data = await res.json();
            if (data.weeklyStructureV1 && typeof data.weeklyStructureV1 === 'object') {
              applyWeeklyStructureBlobFromServer(data.weeklyStructureV1);
            }
          }
        }
      } catch (e) {
        console.error('Weekly structure: could not load from account', e);
      } finally {
        if (!cancelled) setWeeklyHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!weeklyHydrated) return;
    loadKey(planKey);
  }, [weeklyHydrated, planKey, loadKey]);

  const persist = useCallback(() => {
    const data: PlanPersist = { meta, planned, grid };
    savePlan(planKey, data);
    setSnapshot(JSON.parse(JSON.stringify(data)));
  }, [planKey, meta, planned, grid]);

  const syncWeeklyStructureToAccount = useCallback(async (): Promise<
    { ok: true; remote: boolean } | { ok: false; remote: boolean; message: string }
  > => {
    persist();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return { ok: true, remote: false };
    }
    const blob = collectWeeklyStructureBlobForServer();
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ weeklyStructureV1: blob })
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err?.error) message = err.error;
          else if (err?.details) message = err.details;
        } catch {
          /* ignore */
        }
        return { ok: false, remote: true, message };
      }
      return { ok: true, remote: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error';
      return { ok: false, remote: true, message };
    }
  }, [persist]);

  const sportOrdinalInList = (row: PlannedWorkout, index: number) => {
    let c = 0;
    for (let i = 0; i <= index; i++) {
      if (planned[i].sportKey === row.sportKey) c++;
    }
    return c;
  };

  const totalsBySport = useMemo(() => {
    const m = new Map<string, { count: number; meters: number }>();
    for (const r of planned) {
      const cur = m.get(r.sportKey) || { count: 0, meters: 0 };
      cur.count += 1;
      cur.meters += parseMeters(r.distance);
      m.set(r.sportKey, cur);
    }
    return m;
  }, [planned]);

  /** Sports that appear in the planned list, first-appearance order */
  const sportsPlannedInOrder = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of planned) {
      if (!seen.has(r.sportKey)) {
        seen.add(r.sportKey);
        out.push(r.sportKey);
      }
    }
    return out;
  }, [planned]);

  useEffect(() => {
    if (planMetaModalOpen) {
      setPlanMetaDraft({ name: meta.name, color: meta.color, periodId: meta.periodId });
    }
  }, [planMetaModalOpen, meta.name, meta.color, meta.periodId]);

  const switchToPlan = (k: PlanKey) => {
    if (planKey !== k) persist();
    setPlanKey(k);
  };

  const openPlanMetaModal = (k: PlanKey) => {
    if (planKey !== k) persist();
    setPlanKey(k);
    window.setTimeout(() => setPlanMetaModalOpen(true), 0);
  };

  const handlePlanMetaModalSave = async () => {
    const data: PlanPersist = { meta: planMetaDraft, planned, grid };
    savePlan(planKey, data);
    setMeta(planMetaDraft);
    setSnapshot(JSON.parse(JSON.stringify(data)));
    setPlanMetaModalOpen(false);
    setSavingRemote(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      const blob = collectWeeklyStructureBlobForServer();
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ weeklyStructureV1: blob })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(
          `Plan saved in this browser, but account sync failed: ${err.error || err.details || res.status}. Use Save below to retry.`
        );
      }
    } catch (e) {
      console.error('Plan settings sync failed', e);
      alert('Plan saved locally; could not reach server. Use Save below to retry.');
    } finally {
      setSavingRemote(false);
    }
  };

  const selectSuggestedPeriod = (p: WeeklyStructurePeriod | null) => {
    if (!p) {
      setPlanMetaDraft((d) => ({ ...d, periodId: '' }));
      return;
    }
    setPlanMetaDraft((d) => ({ ...d, periodId: p.id, color: p.color }));
  };

  const openNewForm = (sportKey: string) => {
    setFormOpen({
      sportKey,
      distance: '',
      time: '',
      goalCode: '',
      description: ''
    });
  };

  const openEditForm = (row: PlannedWorkout) => {
    setFormOpen({
      sportKey: row.sportKey,
      editingId: row.id,
      distance: row.distance,
      time: row.time,
      goalCode: row.goalCode,
      description: row.description
    });
  };

  const deletePlannedRow = (id: string) => {
    if (!confirm('Remove this planned workout from the list and unassign it from the week?')) return;
    setPlanned((prev) => prev.filter((r) => r.id !== id));
    setGrid((g) => {
      const next = JSON.parse(JSON.stringify(g)) as DayGrid;
      for (let d = 1; d <= 7; d++) {
        const day = next[d];
        if (!day) continue;
        for (const sn of SESSIONS) {
          day[sn] = (day[sn] || []).filter((x) => x !== id);
        }
      }
      return next;
    });
  };

  const sessionFilled = (day: number, session: number) => (grid[day]?.[session] || []).length > 0;

  const sessionAvailable = (day: number, session: number) => {
    if (session === 1) return true;
    if (session === 2) return sessionFilled(day, 1);
    return sessionFilled(day, 2);
  };

  const tryAssign = (
    day: number,
    session: number,
    plannedId: string,
    mode: 'replace' | 'append'
  ): { ok: true } | { ok: false; reason: string } => {
    const row = plannedById.get(plannedId);
    if (!row) return { ok: false, reason: 'Unknown workout' };
    const cur = grid[day]?.[session] || [];
    const nextGrid = JSON.parse(JSON.stringify(grid)) as DayGrid;
    if (!nextGrid[day]) nextGrid[day] = { 1: [], 2: [], 3: [] };
    let slot = [...(nextGrid[day][session] || [])];

    if (mode === 'replace') {
      slot = [];
    }

    const sportsInSlot = new Set(slot.map((id) => plannedById.get(id)?.sportKey).filter(Boolean) as string[]);
    if (sportsInSlot.has(row.sportKey)) {
      return { ok: false, reason: 'This sport is already in this workout slot.' };
    }
    if (slot.length >= 3) {
      return { ok: false, reason: 'Max 3 sports per workout.' };
    }

    const hypothetical = [...slot, plannedId];
    const distSports = new Set<string>();
    for (const sn of SESSIONS) {
      const ids = sn === session ? hypothetical : nextGrid[day][sn] || [];
      for (const id of ids) {
        const p = plannedById.get(id);
        if (p) distSports.add(p.sportKey);
      }
    }
    if (distSports.size > 4) {
      return { ok: false, reason: 'Max 4 different sports per day.' };
    }

    slot.push(plannedId);
    nextGrid[day][session] = slot;
    setGrid(nextGrid);
    return { ok: true };
  };

  const onDropOnCell = (day: number, session: number, data: { type: 'planned'; id: string } | { type: 'new'; sport: string }) => {
    let plannedId: string;
    let sportKey: string;
    if (data.type === 'new') {
      if (!sessionAvailable(day, session)) return;
      const existingNew = grid[day]?.[session] || [];
      if (existingNew.length > 0) {
        alert(
          'This workout slot already has assignments. Drag a planned workout from the table above to choose Substitute (S) or Add (A), or remove items first.'
        );
        return;
      }
      sportKey = data.sport;
      plannedId = '';
      setFormOpen({
        sportKey,
        distance: '',
        time: '',
        goalCode: '',
        description: ''
      });
      (window as unknown as { __wsPendingDrop?: { day: number; session: number } }).__wsPendingDrop = {
        day,
        session
      };
      return;
    }
    plannedId = data.id;
    const row = plannedById.get(plannedId);
    if (!row) return;
    sportKey = row.sportKey;

    if (!sessionAvailable(day, session)) return;

    const existing = grid[day]?.[session] || [];
    if (existing.length > 0) {
      setDropPrompt({ day, session, plannedId, sportKey });
      return;
    }

    const r = tryAssign(day, session, plannedId, 'replace');
    if (!r.ok) alert(r.reason);
  };

  const confirmDropPrompt = (choice: 'S' | 'A') => {
    if (!dropPrompt) return;
    const { day, session, plannedId } = dropPrompt;
    const r = tryAssign(day, session, plannedId, choice === 'S' ? 'replace' : 'append');
    setDropPrompt(null);
    if (!r.ok) alert(r.reason);
  };

  const removeFromCell = (day: number, session: number, plannedId: string) => {
    const next = JSON.parse(JSON.stringify(grid)) as DayGrid;
    if (!next[day]) return;
    const slot = [...(next[day][session] || [])].filter((id) => id !== plannedId);
    next[day][session] = slot;

    const slotNowEmpty = slot.length === 0;
    const alertLines: string[] = [];

    // WO3: never shift other slots; removed workout returns to planned list (red / unassigned).
    if (session === 3) {
      setGrid(next);
      return;
    }

    if (slotNowEmpty && session === 2) {
      const s3 = next[day][3] || [];
      if (s3.length) {
        next[day][2] = [...s3];
        next[day][3] = [];
        alertLines.push(
          'Workout(s) that were in WO3 have been moved into WO2 to fill the empty slot (they shift to an earlier workout position on this day).'
        );
      }
    }

    if (slotNowEmpty && session === 1) {
      const s2 = [...(next[day][2] || [])];
      const s3 = [...(next[day][3] || [])];
      if (s2.length) {
        next[day][1] = [...s2];
        next[day][2] = [...s3];
        next[day][3] = [];
        if (s3.length) {
          alertLines.push(
            'Workout(s) from WO2 were moved to WO1, and workout(s) from WO3 were moved to WO2 to fill the gap (they shift to earlier workout positions on this day).'
          );
        } else {
          alertLines.push(
            'Workout(s) from WO2 were moved to WO1 to fill the empty slot (they shift to an earlier workout position on this day).'
          );
        }
      } else if (s3.length) {
        next[day][1] = [...s3];
        next[day][2] = [];
        next[day][3] = [];
        alertLines.push(
          'Workout(s) that were in WO3 have been moved into WO1 to fill the empty slot (they shift to an earlier workout position on this day).'
        );
      }
    }

    setGrid(next);
    if (alertLines.length) {
      alert(
        `${alertLines.join('\n\n')}\n\nThe workout you removed is back in the planned list as unassigned (red status).`
      );
    }
  };

  const moveRow = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= planned.length) return;
    setPlanned((prev) => {
      const n = [...prev];
      [n[from], n[to]] = [n[to], n[from]];
      return n;
    });
  };

  const handleSave = async () => {
    setSavingRemote(true);
    try {
      const r = await syncWeeklyStructureToAccount();
      if (!r.ok) {
        alert(
          `Could not save to your account: ${r.message}\n\nYour changes are still saved in this browser.`
        );
        return;
      }
      const tail =
        '\n\nExport to Yearly Plan / Done will be available from copy flows.';
      alert(
        r.remote
          ? `Weekly structure saved to your account and this browser.${tail}`
          : `Weekly structure saved in this browser only. Sign in to sync to your account.${tail}`
      );
    } finally {
      setSavingRemote(false);
    }
  };

  const handleQuickSave = async () => {
    setSavingRemote(true);
    try {
      const r = await syncWeeklyStructureToAccount();
      if (!r.ok) {
        alert(`Could not save to your account: ${r.message}\n\nSaved in this browser only for now.`);
      }
    } finally {
      setSavingRemote(false);
    }
  };

  const handleCancel = () => {
    if (snapshot) {
      setMeta(snapshot.meta);
      setPlanned(snapshot.planned);
      setGrid(snapshot.grid);
    }
  };

  const handleReset = () => {
    if (!confirm('Clear this template plan structure?')) return;
    setPlanned([]);
    setGrid({});
    setMeta({ name: '', color: '#f97316', periodId: '' });
  };

  const saveFormWithOptionalDrop = () => {
    if (!formOpen) return;
    const pending = (window as unknown as { __wsPendingDrop?: { day: number; session: number } }).__wsPendingDrop;
    const { sportKey, editingId, distance, time, goalCode, description } = formOpen;
    let newRow: PlannedWorkout;
    if (editingId) {
      setPlanned((prev) =>
        prev.map((r) =>
          r.id === editingId ? { ...r, distance, time, goalCode, description } : r
        )
      );
      newRow = { id: editingId, sportKey, distance, time, goalCode, description };
    } else {
      newRow = { id: newId(), sportKey, distance, time, goalCode, description };
      setPlanned((prev) => [...prev, newRow]);
    }
    setFormOpen(null);
    if (pending) {
      delete (window as unknown as { __wsPendingDrop?: unknown }).__wsPendingDrop;
      setTimeout(() => {
        setGrid((g) => {
          const sportFor = (id: string): string | undefined => {
            if (id === newRow.id) return newRow.sportKey;
            return planned.find((p) => p.id === id)?.sportKey;
          };
          const next = JSON.parse(JSON.stringify(g)) as DayGrid;
          if (!next[pending.day]) next[pending.day] = { 1: [], 2: [], 3: [] };
          const slot = [...(next[pending.day][pending.session] || [])];
          const sportsInSlot = new Set(slot.map((id) => sportFor(id)).filter(Boolean) as string[]);
          if (sportsInSlot.has(newRow.sportKey)) {
            alert('This sport is already in this workout slot.');
            return g;
          }
          if (slot.length >= 3) {
            alert('Max 3 sports per workout.');
            return g;
          }
          const hypothetical = [...slot, newRow.id];
          const distSports = new Set<string>();
          for (const sn of SESSIONS) {
            const ids = sn === pending.session ? hypothetical : next[pending.day][sn] || [];
            for (const id of ids) {
              const sk = sportFor(id);
              if (sk) distSports.add(sk);
            }
          }
          if (distSports.size > 4) {
            alert('Max 4 different sports per day.');
            return g;
          }
          if (!slot.includes(newRow.id)) slot.push(newRow.id);
          next[pending.day][pending.session] = slot;
          return next;
        });
      }, 0);
    }
  };

  const showDayRow = (dayIndex: number) => {
    const d = dayIndex + 1;
    if (!showAssignedOnly) return true;
    const dayG = grid[d];
    if (!dayG) return false;
    return SESSIONS.some((sn) => (dayG[sn] || []).length > 0);
  };

  if (!weeklyHydrated) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-[1900px] mx-auto">
        <p className="text-sm text-gray-600">Loading weekly structure…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-[1900px] mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Weekly Plans:</span>
        {PLAN_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            title="Click to work on this plan. Double-click to edit plan name, color & suggested period."
            onClick={() => switchToPlan(k)}
            onDoubleClick={(e) => {
              e.preventDefault();
              openPlanMetaModal(k);
            }}
            className={`px-4 py-1.5 rounded font-semibold text-sm border select-none ${
              planKey === k ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            Plan {k}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-bold text-sm">Plan {planKey}</div>
        <input
          type="text"
          className="border rounded px-2 py-1 text-sm min-w-[200px]"
          placeholder="Plan name"
          value={meta.name}
          onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
        />
        <button
          type="button"
          className="px-3 py-1 rounded bg-gray-200 text-sm font-semibold disabled:opacity-50"
          disabled={!weeklyHydrated || savingRemote}
          onClick={() => void handleQuickSave()}
        >
          {savingRemote ? 'Saving…' : 'Save'}
        </button>
        <input
          type="color"
          value={meta.color}
          onChange={(e) => setMeta((m) => ({ ...m, color: e.target.value }))}
          className="h-9 w-12 cursor-pointer rounded border"
          title="Plan color"
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={meta.periodId}
          onChange={(e) => setMeta((m) => ({ ...m, periodId: e.target.value }))}
        >
          <option value="">Period suggested…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <div className="h-6 w-6 rounded border-2 border-gray-400" style={{ backgroundColor: meta.color }} />
            <span className="font-bold">Template Weekly Plan {planKey}</span>
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1 text-sm max-w-md"
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
            />
            <span title="Structure-only; full planning happens after export">
              <Info className="w-5 h-5 text-blue-600" />
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">
              Sports — double-click a tile, or drag a sport into this green area or onto the planned list table below
            </p>
            <div
              className={`max-h-48 overflow-y-auto rounded border p-2 bg-emerald-50/50 ${listDropHint ? 'ring-2 ring-blue-400' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setListDropHint(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setListDropHint(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setListDropHint(false);
                const sport = e.dataTransfer.getData('application/ws-sport');
                if (sport) openNewForm(sport);
              }}
            >
              <div className="flex flex-wrap gap-2">
                {SPORTS_LIST.slice(0, 48).map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/ws-sport', sport);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDoubleClick={() => openNewForm(sport)}
                    className="flex flex-col items-center gap-0.5 px-2 py-1 rounded bg-green-100 border border-green-200 text-[10px] font-semibold text-green-900 hover:bg-green-200"
                  >
                    <WeeklySportIconThumb sport={sport} iconType={sportIconType} size={28} />
                    {sport.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`rounded border border-gray-300 overflow-x-auto bg-white ${listDropHint ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            onDragOver={(e) => {
              const fromSportStrip = Array.from(e.dataTransfer.types).includes('application/ws-sport');
              if (fromSportStrip) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setListDropHint(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setListDropHint(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setListDropHint(false);
              const sport = e.dataTransfer.getData('application/ws-sport');
              if (sport) openNewForm(sport);
            }}
          >
            <table className="w-full min-w-[860px] text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-100 border-b border-gray-300">
                  <th className="w-12 px-1 py-2.5 font-semibold text-blue-700 border-r border-emerald-200/80" aria-label="Reorder" />
                  <th className="w-[76px] px-2 py-2.5 text-center font-semibold text-blue-700 border-r border-emerald-200/80">NWO</th>
                  <th className="w-14 px-2 py-2.5 text-center font-semibold text-blue-700 border-r border-emerald-200/80">Status</th>
                  <th className="min-w-[160px] px-2 py-2.5 text-left font-semibold text-blue-700 border-r border-emerald-200/80">Sport</th>
                  <th className="w-[108px] px-2 py-2.5 text-left font-semibold text-blue-700 border-r border-emerald-200/80">
                    Dist &amp; Time
                  </th>
                  <th className="w-14 px-2 py-2.5 text-center font-semibold text-blue-700 border-r border-emerald-200/80">Goal</th>
                  <th className="min-w-[140px] px-2 py-2.5 text-left font-semibold text-blue-700 border-r border-emerald-200/80">
                    Description
                  </th>
                  <th className="w-16 px-2 py-2.5 text-right font-semibold text-blue-700">Edit</th>
                </tr>
              </thead>
              <tbody>
                {plannedRowsForTable.map((row, displayIdx) => {
                  const globalIdx = planned.findIndex((p) => p.id === row.id);
                  const ord = sportOrdinalInList(row, globalIdx);
                  const isAssigned = assigned.has(row.id);
<<<<<<< HEAD
                  const prevRow = displayIdx > 0 ? plannedRowsForTable[displayIdx - 1] : null;
                  const newSportGroup = prevRow != null && prevRow.sportKey !== row.sportKey;
                  let groupStart = displayIdx;
                  while (groupStart > 0 && plannedRowsForTable[groupStart - 1].sportKey === row.sportKey) {
                    groupStart--;
                  }
                  const withinSportIdx = displayIdx - groupStart;
                  const zebraAlt = withinSportIdx % 2 === 0;
                  const isFavSport = favoriteSportsSet.has(row.sportKey);
                  const rowBg = isFavSport
                    ? zebraAlt
                      ? 'bg-amber-50'
                      : 'bg-amber-100/85'
                    : zebraAlt
                      ? 'bg-[#f2f2f2]'
                      : 'bg-white';
                  const rowHover = isFavSport ? 'hover:bg-amber-100/90' : 'hover:bg-emerald-50/40';
                  const groupSep = newSportGroup ? 'border-t-2 border-t-emerald-400/75' : '';
                  const startPlannedDrag = (e: React.DragEvent) => {
                    e.dataTransfer.setData('application/ws-planned', row.id);
                    e.dataTransfer.setData('text/plain', row.id);
                    // copyMove: some browsers omit custom MIME in `types` during dragover; then we use
                    // dropEffect "move" from text/plain — that is invalid if effectAllowed were only "move".
                    e.dataTransfer.effectAllowed = 'copyMove';
                  };

=======
                  const rowBg = displayIdx % 2 === 0 ? 'bg-[#f2f2f2]' : 'bg-white';
>>>>>>> 4d8b65344826299ede7cbe74a55201e20258431b
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/ws-planned', row.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className={`border-b border-gray-200 ${rowBg} hover:bg-emerald-50/40`}
                      >
                        <td className="align-middle border-r border-gray-200 px-1 py-2">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-900 cursor-grab active:cursor-grabbing"
                              title="Reorder"
                              onClick={() => setMoveIdx(moveIdx === globalIdx ? null : globalIdx)}
                            >
                              <GripVertical className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                              onClick={() => deletePlannedRow(row.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2">
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-400 bg-white text-sm font-bold text-gray-900 shadow-sm"
                              title="Workout order"
                            >
                              {globalIdx + 1}
                            </span>
                            <span
                              className="inline-flex min-h-7 min-w-7 max-w-[52px] shrink-0 items-center justify-center rounded-full border border-red-300 bg-red-50 px-1 text-[9px] font-bold leading-tight text-red-600 text-center"
                              title="Same-sport occurrence"
                            >
                              {ordinal(ord)}
                            </span>
                          </div>
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2 text-center">
                          <span
                            className={`inline-block h-5 w-5 rounded-full border-2 shadow-sm ${
                              isAssigned ? 'bg-green-500 border-green-700' : 'bg-red-500 border-red-700'
                            }`}
                            title={isAssigned ? 'Assigned in week grid' : 'Not assigned'}
                          />
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-300 bg-white shadow-sm">
                              <WeeklySportIconThumb sport={row.sportKey} iconType={sportIconType} size={28} />
                            </div>
                            <span className="truncate font-bold uppercase tracking-wide text-gray-900">
                              {row.sportKey.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2 leading-tight">
                          <div className="font-bold text-gray-900">{row.distance?.trim() || '—'}</div>
                          <div className="text-[11px] text-gray-600 tabular-nums">{row.time?.trim() || '—'}</div>
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2 text-center">
                          <span className="font-bold uppercase text-gray-900">{row.goalCode?.trim() || '—'}</span>
                        </td>
                        <td className="align-middle border-r border-gray-200 px-2 py-2 text-gray-700 max-w-[280px]">
                          <span className="line-clamp-2" title={row.description || undefined}>
                            {row.description?.trim() || '—'}
                          </span>
                        </td>
                        <td className="align-middle px-2 py-2 text-right">
                          <button
                            type="button"
                            className="text-blue-600 font-semibold underline hover:text-blue-800"
                            onClick={() => openEditForm(row)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                      {moveIdx === globalIdx && (
                        <tr className={`${rowBg} border-b border-gray-200`}>
                          <td colSpan={8} className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-600">Reorder:</span>
                              <button
                                type="button"
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-gray-50"
                                onClick={() => moveRow(globalIdx, -1)}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-gray-50"
                                onClick={() => moveRow(globalIdx, 1)}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                className="rounded border border-gray-400 bg-gray-100 px-2 py-1 text-[11px] font-semibold hover:bg-gray-200"
                                onClick={() => setMoveIdx(null)}
                              >
                                Done
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {planned.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-500 border-t border-gray-200">
                No planned workouts yet — double-click a sport above or drag one into the list.
              </p>
            )}
            {planned.length > 0 && plannedRowsForTable.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-amber-800 bg-amber-50 border-t border-amber-200">
                No workouts are on the week grid yet — uncheck &quot;Only show workouts assigned on the week grid&quot; or
                drag rows onto the week below.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-700 text-white" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleReset}>
              Reset
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded bg-red-500 text-white font-semibold disabled:opacity-50"
              disabled={savingRemote}
              onClick={() => void handleSave()}
            >
              {savingRemote ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <aside className="w-full lg:w-60 shrink-0 rounded-lg border border-gray-200 bg-slate-50 p-3 min-h-[220px] flex flex-col gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2">Sports in this plan</h3>
            <div className="min-h-[72px] rounded-md border border-dashed border-gray-300 bg-white/80 p-2 flex flex-wrap gap-2 content-start">
              {sportsPlannedInOrder.length === 0 ? (
                <p className="text-[11px] text-gray-400 w-full text-center py-4">Add workouts to the list — icons appear here</p>
              ) : (
                sportsPlannedInOrder.map((sport) => (
                  <div
                    key={sport}
                    className="flex flex-col items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-1 shadow-sm"
                    title={sport.replace(/_/g, ' ')}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-gray-100 bg-white">
                      <WeeklySportIconThumb sport={sport} iconType={sportIconType} size={26} />
                    </div>
                    <span className="max-w-[56px] truncate text-[9px] font-semibold uppercase text-gray-700">
                      {sport.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2">Totals (planned list)</h3>
            <ul className="space-y-2 text-xs">
              {sportsPlannedInOrder.map((sport) => {
                const t = totalsBySport.get(sport);
                if (!t) return null;
                return (
                  <li key={sport} className="flex justify-between gap-2 items-center">
                    <span className="font-semibold flex items-center gap-1.5 min-w-0">
                      <WeeklySportIconThumb sport={sport} iconType={sportIconType} size={18} />
                      <span className="truncate">{sport.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="text-gray-600 shrink-0 tabular-nums">
                      {t.count} WO · ~{Math.round(t.meters)}m
                    </span>
                  </li>
                );
              })}
              {totalsBySport.size === 0 && <li className="text-gray-500">No workouts yet</li>}
            </ul>
          </div>
        </aside>
      </div>

      <div className="rounded-lg border border-gray-200 bg-slate-50/90 px-3 py-2 space-y-2">
        <label
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
          title="Week grid: show only days with at least one assignment"
          aria-label="Week grid: show only days with at least one assignment"
        >
          <input type="checkbox" checked={showAssignedOnly} onChange={(e) => setShowAssignedOnly(e.target.checked)} />
          <span>Assigned days only (week)</span>
          <Info className="w-3.5 h-3.5 shrink-0 text-gray-500" aria-hidden />
        </label>
        <label
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
          title="Planned list (left): only show workouts already placed on the week grid"
          aria-label="Planned list (left): only show workouts already placed on the week grid"
        >
          <input
            type="checkbox"
            checked={showOnlyWeekAssignedInList}
            onChange={(e) => setShowOnlyWeekAssignedInList(e.target.checked)}
          />
          <span>On week grid only (list)</span>
          <Info className="w-3.5 h-3.5 shrink-0 text-gray-500" aria-hidden />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-[1100px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-sky-100">
              <th className="p-2 text-left border border-gray-300 font-bold text-blue-900">Day</th>
              <th className="p-2 text-center border border-gray-300 font-bold text-blue-900 w-14">WO</th>
              <th className="p-2 text-center border border-gray-300 font-bold text-blue-900 bg-blue-100/90" colSpan={3}>
                Sport 1
              </th>
              <th className="p-2 text-center border border-gray-300 font-bold text-emerald-900 bg-emerald-100/90" colSpan={3}>
                Sport 2
              </th>
              <th className="p-2 text-center border border-gray-300 font-bold text-amber-950 bg-amber-100/90" colSpan={3}>
                Sport 3
              </th>
            </tr>
            <tr className="text-[10px]">
              <th className="p-1.5 border border-gray-300 bg-sky-50" colSpan={2} />
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-emerald-100/70">
                Sport
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-emerald-100/70">
                Duration &amp; Time
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-emerald-100/70">
                Description
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-emerald-900 bg-emerald-100/80">
                Sport
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-emerald-900 bg-emerald-100/80">
                Duration &amp; Time
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-emerald-900 bg-emerald-100/80">
                Description
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-amber-950 bg-amber-100/80">
                Sport
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-amber-950 bg-amber-100/80">
                Duration &amp; Time
              </th>
              <th className="p-1.5 border border-gray-300 font-semibold text-center text-amber-950 bg-amber-100/80">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {DAY_NAMES.map((dn, di) => {
              const d = di + 1;
              if (!showDayRow(di)) return null;
              return SESSIONS.map((sn) => {
                const filled = sessionFilled(d, sn);
                const avail = sessionAvailable(d, sn);
                const slot = grid[d]?.[sn] || [];
                /** Zebra by day: Mon/Wed/… white, Tue/Thu/… light gray (matches week grid screenshot). */
                const dayStripe = di % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]';
                /** Locked WO rows: nearly full row greyed (WO + sport cells; day name cell stays day stripe via rowSpan). */
                const lockedRowBg = 'bg-gray-300 text-gray-600';
                const rowBg = !avail ? lockedRowBg : dayStripe;
                let numCls = 'font-bold tabular-nums';
                let icon: React.ReactNode;
                if (!avail) {
                  numCls = 'text-gray-800 font-bold tabular-nums';
                  icon = (
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-800 bg-gray-700 shadow-inner"
                      title="Locked until the previous workout is assigned"
                    >
                      <span className="block w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
                    </span>
                  );
                } else if (sn === 1 || filled) {
                  numCls = 'text-black font-bold tabular-nums';
                  icon = (
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-green-500 border-2 border-green-700 shadow-sm"
                      title={filled ? 'Assigned' : 'Drop zone (WO1)'}
                    />
                  );
                } else {
                  numCls = 'text-orange-600 font-bold tabular-nums';
                  icon = (
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-orange-500 border border-orange-700 shadow-sm"
                      title="Drop zone"
                    />
                  );
                }

                const handleSportDragEnter = (e: React.DragEvent) => {
                  if (!avail) return;
                  const types = Array.from(e.dataTransfer.types);
                  if (types.includes('Files')) return;
                  const fromSport = types.includes('application/ws-sport');
                  const fromPlannedMime = types.includes('application/ws-planned');
                  const fromPlannedPlain = types.includes('text/plain') && !fromSport;
                  if (!fromSport && !fromPlannedMime && !fromPlannedPlain) return;
                  e.preventDefault();
                };
                const handleSportDragOver = (e: React.DragEvent) => {
                  if (!avail) return;
<<<<<<< HEAD
                  const types = Array.from(e.dataTransfer.types);
                  if (types.includes('Files')) return;
                  const fromSport = types.includes('application/ws-sport');
                  const fromPlannedMime = types.includes('application/ws-planned');
                  const fromPlannedPlain = types.includes('text/plain') && !fromSport;
                  if (!fromSport && !fromPlannedMime && !fromPlannedPlain) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = fromSport ? 'copy' : 'move';
=======
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
>>>>>>> 4d8b65344826299ede7cbe74a55201e20258431b
                };
                const handleSportDrop = (e: React.DragEvent) => {
                  e.preventDefault();
                  if (!avail) return;
<<<<<<< HEAD
                  const pidRaw =
                    e.dataTransfer.getData('application/ws-planned') ||
                    e.dataTransfer.getData('text/plain');
                  const pidDrag = pidRaw.trim();
=======
                  const pidDrag = e.dataTransfer.getData('application/ws-planned');
>>>>>>> 4d8b65344826299ede7cbe74a55201e20258431b
                  const sportDrag = e.dataTransfer.getData('application/ws-sport');
                  if (pidDrag) onDropOnCell(d, sn, { type: 'planned', id: pidDrag });
                  else if (sportDrag) onDropOnCell(d, sn, { type: 'new', sport: sportDrag });
                };
                const dropProps =
                  avail ?
                    {
                      onDragEnter: handleSportDragEnter,
                      onDragOver: handleSportDragOver,
                      onDrop: handleSportDrop
                    }
                  : {};

                const sportCellBg = !avail ? 'bg-gray-300' : dayStripe;

                const tdBase = 'border border-gray-300 p-2 align-top min-w-[72px]';

                const cellsForSportIndex = (sportIdx: number) => {
                  const pid = slot[sportIdx];
                  const tint = sportCellBg;
                  if (!avail) {
                    return (
                      <React.Fragment key={`${sportIdx}-locked`}>
                        <td className={`${tdBase} ${tint} text-center text-gray-500/90`}>—</td>
                        <td className={`${tdBase} ${tint} text-center text-gray-500/90`}>—</td>
                        <td className={`${tdBase} ${tint} text-center text-gray-500/90`}>—</td>
                      </React.Fragment>
                    );
                  }
                  if (!pid) {
                    return (
                      <React.Fragment key={`${sportIdx}-empty`}>
                        <td className={`${tdBase} ${tint} text-gray-500`} {...dropProps}>
                          <span className="text-[10px] italic text-gray-400">Drop here</span>
                        </td>
                        <td className={`${tdBase} ${tint}`} {...dropProps} />
                        <td className={`${tdBase} ${tint}`} {...dropProps} />
                      </React.Fragment>
                    );
                  }
                  const r = plannedById.get(pid);
                  if (!r) {
                    return (
                      <React.Fragment key={`${sportIdx}-bad`}>
                        <td className={`${tdBase} ${tint} text-center text-gray-500`} {...dropProps}>
                          —
                        </td>
                        <td className={`${tdBase} ${tint} text-center text-gray-500`} {...dropProps}>
                          —
                        </td>
                        <td className={`${tdBase} ${tint} text-center text-gray-500`} {...dropProps}>
                          —
                        </td>
                      </React.Fragment>
                    );
                  }
                  const descTip = r.description?.trim() || undefined;
                  return (
                    <React.Fragment key={pid}>
                      <td className={`${tdBase} ${tint}`} {...dropProps}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <WeeklySportIconThumb sport={r.sportKey} iconType={sportIconType} size={22} />
                          <span className="font-bold uppercase tracking-wide text-gray-900 truncate text-[11px]">
                            {r.sportKey.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdBase} ${tint}`} {...dropProps}>
                        <div className="font-bold text-gray-900 leading-tight">{r.distance?.trim() || '—'}</div>
                        <div className="text-[10px] text-gray-600 tabular-nums mt-0.5">{r.time?.trim() || '—'}</div>
                      </td>
                      <td className={`${tdBase} ${tint}`} {...dropProps}>
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className="font-bold text-gray-900 text-[11px]"
                            title={descTip}
                          >
                            {r.goalCode?.trim() || '—'}
                          </span>
                          <button
                            type="button"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-600 text-sm leading-none hover:bg-gray-200"
                            title="Remove from this slot"
                            onClick={() => removeFromCell(d, sn, pid)}
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </React.Fragment>
                  );
                };

                return (
                  <tr key={`${d}-${sn}`} className={`border-b border-gray-300 ${rowBg}`}>
                    {sn === 1 && (
                      <td
                        className={`p-2 border border-gray-300 align-top font-semibold text-gray-900 ${dayStripe}`}
                        rowSpan={3}
                      >
                        {dn}
                      </td>
                    )}
                    <td
                      className={`p-2 border border-gray-300 align-middle whitespace-nowrap ${!avail ? 'bg-gray-300' : dayStripe}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className={numCls}>{sn}</span>
                        {icon}
                      </span>
                    </td>
                    {cellsForSportIndex(0)}
                    {cellsForSportIndex(1)}
                    {cellsForSportIndex(2)}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {dropPrompt &&
        portalToBody(
          <div className={MODAL_BACKDROP_CLASS} role="presentation">
            <div className="relative z-[1] w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl">
              <p className="text-sm font-semibold mb-3">
                A workout is already assigned in this daily area.
                <br />
                Do you want substitute it (S) or add it (A)?
              </p>
              <p className="text-xs text-gray-600 mb-4">
                If you add (A): max 3 sports per workout, max 4 different sports for the whole day, and the same sport
                cannot appear twice in the same workout (e.g. two Swim in WO1 is not allowed).
              </p>
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-3 py-2 rounded bg-gray-200" onClick={() => setDropPrompt(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-orange-500 text-white"
                  onClick={() => confirmDropPrompt('A')}
                >
                  Add (A)
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                  onClick={() => confirmDropPrompt('S')}
                >
                  Substitute (S)
                </button>
              </div>
            </div>
          </div>
        )}

      {planMetaModalOpen &&
        portalToBody(
          <div
            className={MODAL_BACKDROP_CLASS}
            onClick={() => setPlanMetaModalOpen(false)}
            role="presentation"
          >
            <div
              className="relative z-[1] w-full max-w-md rounded-xl border-2 border-purple-200 bg-white p-6 text-gray-900 shadow-2xl"
              role="dialog"
              aria-labelledby="plan-meta-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
            <h2 id="plan-meta-modal-title" className="text-lg font-bold text-gray-900 mb-1">
              Plan {planKey}
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Set the template name, plan color, and suggested period. Choosing a period applies that period&apos;s color to
              this plan.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Plan name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-2 text-sm mb-3"
              placeholder="e.g. Triathlete in winter"
              value={planMetaDraft.name}
              onChange={(e) => setPlanMetaDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <label className="block text-xs font-semibold text-gray-700 mb-1">Plan color</label>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                value={planMetaDraft.color}
                onChange={(e) => setPlanMetaDraft((d) => ({ ...d, color: e.target.value }))}
              />
              <span
                className="h-10 flex-1 rounded border border-gray-200"
                style={{ backgroundColor: planMetaDraft.color }}
              />
            </div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Period suggested</label>
            <div className="max-h-44 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 space-y-1 mb-4">
              <button
                type="button"
                onClick={() => selectSuggestedPeriod(null)}
                className={`w-full flex items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-white ${
                  planMetaDraft.periodId === '' ? 'bg-white ring-2 ring-purple-400' : ''
                }`}
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-gray-400 bg-white" />
                <span className="text-gray-600">None</span>
              </button>
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectSuggestedPeriod(p)}
                  className={`w-full flex items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-white ${
                    planMetaDraft.periodId === p.id ? 'bg-white ring-2 ring-purple-400' : ''
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-gray-600/30 shadow-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium text-gray-900">{p.name}</span>
                </button>
              ))}
              {periods.length === 0 && (
                <p className="text-xs text-gray-500 px-2 py-2">No periods available — add periods in Periodization first.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold"
                onClick={() => setPlanMetaModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-purple-600 text-white font-semibold disabled:opacity-50"
                disabled={savingRemote}
                onClick={() => void handlePlanMetaModalSave()}
              >
                {savingRemote ? 'Saving…' : 'Save plan'}
              </button>
            </div>
          </div>
        </div>
        )}

      {formOpen &&
        portalToBody(
          <div className={MODAL_BACKDROP_CLASS} role="presentation">
            <div className="relative z-[1] w-full max-w-md rounded-xl border-2 border-gray-800 bg-white p-6 text-gray-900 shadow-2xl">
            <div className="flex flex-col items-center gap-2 mb-4">
              <WeeklySportIconThumb sport={formOpen.sportKey} iconType={sportIconType} size={56} />
              <h3 className="text-center font-bold text-lg">{formOpen.sportKey.replace(/_/g, ' ')}</h3>
            </div>
            <label className="block text-xs font-semibold mb-1">Distance</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={formOpen.distance}
              onChange={(e) => setFormOpen({ ...formOpen, distance: e.target.value })}
            />
            <label className="block text-xs font-semibold mb-1">Time</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={formOpen.time}
              onChange={(e) => setFormOpen({ ...formOpen, time: e.target.value })}
              placeholder="hh:mm:ss"
            />
            <div className="bg-pink-50 border border-pink-200 rounded p-2 mb-2">
              <label className="block text-xs font-bold mb-1">Workout goal</label>
              <select
                className="w-full border border-red-300 rounded px-2 py-1"
                value={formOpen.goalCode}
                onChange={(e) => setFormOpen({ ...formOpen, goalCode: e.target.value })}
              >
                <option value="">Select workout goal…</option>
                {GOAL_CODES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <label className="block text-xs font-semibold mb-1">Short description</label>
            <textarea
              className="w-full border border-sky-300 rounded px-2 py-1 mb-4 min-h-[80px]"
              value={formOpen.description}
              onChange={(e) => setFormOpen({ ...formOpen, description: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 rounded bg-gray-800 text-white" onClick={() => setFormOpen(null)}>
                Cancel
              </button>
              <button type="button" className="px-4 py-2 rounded bg-red-500 text-white font-semibold" onClick={saveFormWithOptionalDrop}>
                Save
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
  );
}

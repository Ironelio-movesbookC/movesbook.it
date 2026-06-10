'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2, X } from 'lucide-react';
import type { Period, PeriodizationTemplateBuild } from '@/constants/tools.constants';
import { getMondayOfWeek } from '@/utils/periodizationVirtualWeeks';
import {
  MAX_PERIOD_ATTACHMENTS,
  type PeriodizationAttachmentMeta
} from '@/lib/periodizationAttachments';
import { getAuthToken, getAuthHeaders } from '@/utils/auth.utils';

const TOTAL_WEEKS = 52;

type WeekSeg = {
  periodId: string;
  name: string;
  color: string;
  startWeek: number;
  endWeek: number;
};

function addDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildSegments(weeks: any[]): WeekSeg[] {
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const out: WeekSeg[] = [];
  let cur: WeekSeg | null = null;
  for (const w of sorted) {
    const pid = w.period?.id;
    if (!pid) continue;
    const name = w.period?.name || 'Period';
    const color = w.period?.color || '#94a3b8';
    if (!cur || cur.periodId !== pid) {
      cur = { periodId: pid, name, color, startWeek: w.weekNumber, endWeek: w.weekNumber };
      out.push(cur);
    } else {
      cur.endWeek = w.weekNumber;
    }
  }
  return out;
}

function monthTicks(planMonday: Date | null, weekCount: number): { leftPct: number; label: string }[] {
  if (!planMonday) return [];
  const labels: { leftPct: number; label: string }[] = [];
  let lastKey = '';
  for (let wn = 1; wn <= weekCount; wn++) {
    const mon = addDays(planMonday, (wn - 1) * 7);
    const key = `${mon.getFullYear()}-${mon.getMonth()}`;
    if (key !== lastKey) {
      lastKey = key;
      labels.push({
        leftPct: ((wn - 1) / weekCount) * 100,
        label: mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
  }
  return labels;
}

function segStyle(startWeek: number, endWeek: number, weekCount: number) {
  const left = ((startWeek - 1) / weekCount) * 100;
  const width = ((endWeek - startWeek + 1) / weekCount) * 100;
  return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
}

/** Boundary after week B (left block includes week B). */
function clientXToBoundaryWeek(clientX: number, trackEl: HTMLElement, weekCount: number): number {
  const rect = trackEl.getBoundingClientRect();
  if (rect.width <= 0) return 1;
  const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const w = Math.ceil(frac * weekCount - 1e-6);
  return Math.min(weekCount, Math.max(1, w));
}

function clampBoundaryBetweenSegments(segs: WeekSeg[], boundaryIndex: number, rawB: number): number {
  if (boundaryIndex < 0 || boundaryIndex >= segs.length - 1) return Math.round(rawB);
  const L = segs[boundaryIndex];
  const R = segs[boundaryIndex + 1];
  let B = Math.round(rawB);
  const minB = L.startWeek;
  const maxB = R.endWeek - 1;
  return Math.max(minB, Math.min(maxB, B));
}

function summaryIndexForSegment(summarySegments: WeekSeg[], s: WeekSeg): number {
  return summarySegments.findIndex(
    (x) => x.periodId === s.periodId && x.startWeek === s.startWeek && x.endWeek === s.endWeek
  );
}

/** Resolve HTML notes for a period id (keys are always strings in JSON). */
function notesHtmlForPeriod(notes: Record<string, string>, periodId: string): string {
  const raw = notes[String(periodId)];
  return typeof raw === 'string' ? raw.trim() : '';
}

export type FavouritePeriodizationOverviewBind = {
  weeks: any[];
  notesByPeriodId: Record<string, string>;
  attachmentsByPeriodId: Record<string, PeriodizationAttachmentMeta[]>;
};

export type FavouriteYearlyApplyBind = {
  getBuild: () => PeriodizationTemplateBuild;
  onApplied?: () => void;
};

function defaultTemplatePlanMonday(): Date {
  const y = new Date().getFullYear();
  let d = new Date(y, 0, 1);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== 1) {
    d = addDays(d, 1);
  }
  return d;
}

export default function PeriodizationOverviewPanel({
  periods,
  favouriteDraft,
  yearlyApply,
}: {
  periods: Period[];
  favouriteDraft?: FavouritePeriodizationOverviewBind;
  /** User account: apply favourite template to live yearly plan from Overview */
  yearlyApply?: FavouriteYearlyApplyBind;
}) {
  const isFavouriteDraft = Boolean(favouriteDraft);
  const canApplyToYearly = Boolean(favouriteDraft && yearlyApply);
  const [loading, setLoading] = useState(!isFavouriteDraft || canApplyToYearly);
  const [applyDateIso, setApplyDateIso] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [notesByPeriodId, setNotesByPeriodId] = useState<Record<string, string>>({});
  const [attachmentsByPeriodId, setAttachmentsByPeriodId] = useState<
    Record<string, PeriodizationAttachmentMeta[]>
  >({});
  const [yearlyMeta, setYearlyMeta] = useState<Date | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [dragPreviewB, setDragPreviewB] = useState<number | null>(null);

  const [detailSeg, setDetailSeg] = useState<WeekSeg | null>(null);
  /** Timeline segment click opens notes-first popup (matches Periodization tab). */
  const [periodNotesModalSeg, setPeriodNotesModalSeg] = useState<WeekSeg | null>(null);
  const [startDateModal, setStartDateModal] = useState<{
    open: boolean;
    dateIso: string;
    choice: 'shift' | 'leave' | 'reset';
  } | null>(null);
  const [resetAllConfirm, setResetAllConfirm] = useState(false);
  const [pendingStartAfterReset, setPendingStartAfterReset] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [dateInputKey, setDateInputKey] = useState(0);

  const segsRef = useRef<WeekSeg[]>([]);
  const weeksRef = useRef<any[]>([]);
  const weekCountRef = useRef(52);
  const dragActiveRef = useRef<
    | {
        mode: 'boundary';
        boundaryIndex: number;
        trackEl: HTMLElement;
        pointerId: number;
      }
    | {
        mode: 'segment';
        segmentIndex: number;
        trackEl: HTMLElement;
        pointerId: number;
        startClientX: number;
      }
    | null
  >(null);
  const suppressNextSegmentClickRef = useRef(false);
  const resetNoRef = useRef<HTMLButtonElement>(null);

  const patchPeriodizationMerge = useCallback(
    async (mergeFn: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
      if (!res.ok) return false;
      const settings = await res.json();
      const prevTools = settings.toolsSettings || {};
      const prevPer = (prevTools.periodization || {}) as Record<string, unknown>;
      const nextPer = mergeFn(prevPer);
      const patch = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolsSettings: {
            ...prevTools,
            periodization: nextPer
          }
        })
      });
      return patch.ok;
    },
    []
  );

  useEffect(() => {
    if (!favouriteDraft) return;
    setNotesByPeriodId({ ...favouriteDraft.notesByPeriodId });
    setAttachmentsByPeriodId({ ...favouriteDraft.attachmentsByPeriodId });
    if (!canApplyToYearly) setLoading(false);
  }, [favouriteDraft, canApplyToYearly]);

  useEffect(() => {
    if (!canApplyToYearly) return;
    const loadPlanStart = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/workouts/plan?type=YEARLY_PLAN&section=B&minimal=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : {};
        setPlan(data.plan || null);
        if (data.plan?.startDate) {
          setApplyDateIso(new Date(data.plan.startDate).toISOString().slice(0, 10));
        } else {
          setApplyDateIso(getMondayOfWeek(new Date()).toISOString().slice(0, 10));
        }
      } finally {
        setLoading(false);
      }
    };
    void loadPlanStart();
  }, [canApplyToYearly]);

  const loadAll = useCallback(async () => {
    if (isFavouriteDraft) {
      setLoading(false);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [planRes, settingsRes] = await Promise.all([
        fetch('/api/workouts/plan?type=YEARLY_PLAN&section=B&minimal=true', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/user/settings', { headers: getAuthHeaders() })
      ]);
      const planData = planRes.ok ? await planRes.json() : {};
      setPlan(planData.plan || null);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.yearlyPlanStartDate) {
          setYearlyMeta(new Date(s.yearlyPlanStartDate));
        }
        const ts = s.toolsSettings || {};
        const p = ts.periodization || {};
        const n = p.notesByPeriodId;
        setNotesByPeriodId(n && typeof n === 'object' ? { ...(n as Record<string, string>) } : {});
        if (p.attachmentsByPeriodId && typeof p.attachmentsByPeriodId === 'object') {
          setAttachmentsByPeriodId({ ...(p.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>) });
        } else {
          setAttachmentsByPeriodId({});
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isFavouriteDraft]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshPeriodizationNotes = useCallback(async () => {
    if (isFavouriteDraft && favouriteDraft) {
      setNotesByPeriodId({ ...favouriteDraft.notesByPeriodId });
      return;
    }
    try {
      const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const s = await res.json();
      const p = s.toolsSettings?.periodization || {};
      const n = p.notesByPeriodId;
      setNotesByPeriodId(n && typeof n === 'object' ? { ...(n as Record<string, string>) } : {});
    } catch {
      /* ignore */
    }
  }, [isFavouriteDraft, favouriteDraft]);

  /** Fresh notes when opening a modal (after Save/Apply on another tab or persistence race). */
  useEffect(() => {
    const open = periodNotesModalSeg || detailSeg;
    if (!open) return;
    void refreshPeriodizationNotes();
  }, [detailSeg, periodNotesModalSeg, refreshPeriodizationNotes]);

  const weeks = useMemo(() => {
    if (favouriteDraft?.weeks?.length) {
      return [...favouriteDraft.weeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
    }
    const w = plan?.weeks || [];
    return [...w].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  }, [plan, favouriteDraft?.weeks]);

  const weekCount = Math.max(weeks.length || 0, TOTAL_WEEKS);

  const planMonday = useMemo(() => {
    if (isFavouriteDraft) return defaultTemplatePlanMonday();
    if (!plan?.startDate) return null;
    return new Date(plan.startDate);
  }, [plan, isFavouriteDraft]);

  const summarySegments = useMemo(() => buildSegments(weeks), [weeks]);
  const ticks = useMemo(() => monthTicks(planMonday, weekCount), [planMonday, weekCount]);

  const periodRows = useMemo(() => {
    const ids = new Set(periods.map((p) => p.id));
    const byPid = new Map<string, WeekSeg[]>();
    for (const s of summarySegments) {
      if (!byPid.has(s.periodId)) byPid.set(s.periodId, []);
      byPid.get(s.periodId)!.push(s);
    }
    return periods
      .filter((p) => ids.has(p.id))
      .map((p) => ({
        period: p,
        segments: byPid.get(p.id) || []
      }));
  }, [periods, summarySegments]);

  segsRef.current = summarySegments;
  weeksRef.current = weeks;
  weekCountRef.current = weekCount;

  const applyBoundaryMove = useCallback(
    async (boundaryIndex: number, rawB: number) => {
      if (isFavouriteDraft) return;
      const segs = segsRef.current;
      const weeksList = weeksRef.current;
      if (boundaryIndex < 0 || boundaryIndex >= segs.length - 1) return;
      const left = segs[boundaryIndex];
      const right = segs[boundaryIndex + 1];
      const oldB = left.endWeek;
      const B = clampBoundaryBetweenSegments(segs, boundaryIndex, rawB);
      if (B === oldB) return;
      const token = getAuthToken();
      if (!token) return;
      setActionBusy(true);
      try {
        const updates: { id: string; periodId: string }[] = [];
        if (B > oldB) {
          for (let wn = oldB + 1; wn <= B; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) updates.push({ id: w.id, periodId: left.periodId });
          }
        } else {
          for (let wn = B + 1; wn <= oldB; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) updates.push({ id: w.id, periodId: right.periodId });
          }
        }
        const results = await Promise.all(
          updates.map((u) =>
            fetch(`/api/workouts/weeks/${u.id}/period`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ periodId: u.periodId, updateAllDays: true })
            })
          )
        );
        if (!results.every((r) => r.ok)) {
          alert('Some weeks could not be updated.');
        }
        await loadAll();
      } finally {
        setActionBusy(false);
      }
    },
    [loadAll, isFavouriteDraft]
  );

  const applySegmentShift = useCallback(
    async (segmentIndex: number, rawDelta: number) => {
      if (isFavouriteDraft) return;
      const segs = segsRef.current;
      const weeksList = weeksRef.current;
      if (segmentIndex < 0 || segmentIndex >= segs.length) return;
      const seg = segs[segmentIndex];
      const prev = segmentIndex > 0 ? segs[segmentIndex - 1] : null;
      const next = segmentIndex < segs.length - 1 ? segs[segmentIndex + 1] : null;

      if (!prev || !next) return;

      // Whole-block shift only when the three blocks are contiguous weeks (no unassigned gap).
      const contiguousPrev = seg.startWeek === prev.endWeek + 1;
      const contiguousNext = next.startWeek === seg.endWeek + 1;
      if (!contiguousPrev || !contiguousNext) return;

      let delta = Math.round(rawDelta);
      if (delta === 0) return;

      // Move right (delta > 0): prev grows, next shrinks — next must keep ≥1 week after the move.
      const maxPositive = Math.max(0, next.endWeek - seg.endWeek - 1);
      // Move left (delta < 0): take weeks from prev's tail — prev must keep ≥1 week (down to prev.startWeek).
      const minDelta = -Math.max(0, prev.endWeek - prev.startWeek);

      delta = Math.max(minDelta, Math.min(maxPositive, delta));
      if (delta === 0) return;

      const token = getAuthToken();
      if (!token) return;
      setActionBusy(true);
      try {
        const updates: { id: string; periodId: string }[] = [];
        const byWeekNumber = new Map<number, { id: string; periodId: string }>();

        if (delta > 0) {
          // Move segment to the right:
          // - left vacated weeks become prev period
          // - same amount taken from next becomes segment period
          for (let wn = seg.startWeek; wn <= seg.startWeek + delta - 1; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) byWeekNumber.set(wn, { id: w.id, periodId: prev.periodId });
          }
          for (let wn = seg.endWeek + 1; wn <= seg.endWeek + delta; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) byWeekNumber.set(wn, { id: w.id, periodId: seg.periodId });
          }
        } else {
          const d = -delta;
          // Move segment to the left:
          // - weeks taken from prev become segment period
          // - right vacated weeks become next period
          for (let wn = seg.startWeek - d; wn <= seg.startWeek - 1; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) byWeekNumber.set(wn, { id: w.id, periodId: seg.periodId });
          }
          for (let wn = seg.endWeek - d + 1; wn <= seg.endWeek; wn++) {
            const w = weeksList.find((x: any) => x.weekNumber === wn);
            if (w?.id) byWeekNumber.set(wn, { id: w.id, periodId: next.periodId });
          }
        }

        updates.push(...Array.from(byWeekNumber.values()));
        if (updates.length === 0) return;

        const results = await Promise.all(
          updates.map((u) =>
            fetch(`/api/workouts/weeks/${u.id}/period`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ periodId: u.periodId, updateAllDays: true })
            })
          )
        );
        if (!results.every((r) => r.ok)) {
          alert('Some weeks could not be updated.');
        }
        await loadAll();
      } finally {
        setActionBusy(false);
      }
    },
    [loadAll, isFavouriteDraft]
  );

  const beginBoundaryDrag = useCallback(
    (pointerId: number, clientX: number, boundaryIndex: number, trackEl: HTMLElement) => {
      const wc = weekCountRef.current;
      const segs = segsRef.current;
      const left = segs[boundaryIndex];
      const right = segs[boundaryIndex + 1];
      if (!left || !right) return;
      dragActiveRef.current = {
        mode: 'boundary',
        boundaryIndex,
        trackEl,
        pointerId
      };
      const B0 = clientXToBoundaryWeek(clientX, trackEl, wc);
      setDragPreviewB(clampBoundaryBetweenSegments(segs, boundaryIndex, B0));

      const onMove = (ev: PointerEvent) => {
        if (dragActiveRef.current?.pointerId !== ev.pointerId) return;
        const d = dragActiveRef.current;
        if (!d || d.mode !== 'boundary') return;
        const raw = clientXToBoundaryWeek(ev.clientX, d.trackEl, weekCountRef.current);
        setDragPreviewB(clampBoundaryBetweenSegments(segsRef.current, d.boundaryIndex, raw));
      };

      const onUp = (ev: PointerEvent) => {
        if (dragActiveRef.current?.pointerId !== ev.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const d = dragActiveRef.current;
        dragActiveRef.current = null;
        setDragPreviewB(null);
        if (!d || d.mode !== 'boundary') return;
        const raw = clientXToBoundaryWeek(ev.clientX, d.trackEl, weekCountRef.current);
        void applyBoundaryMove(d.boundaryIndex, raw);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [applyBoundaryMove]
  );

  const startBoundaryDrag = useCallback(
    (e: React.PointerEvent, boundaryIndex: number) => {
      if (actionBusy) return;
      e.preventDefault();
      e.stopPropagation();
      const trackEl = (e.currentTarget as HTMLElement).closest('[data-timeline-track]') as HTMLElement | null;
      if (!trackEl) return;
      beginBoundaryDrag(e.pointerId, e.clientX, boundaryIndex, trackEl);
    },
    [actionBusy, beginBoundaryDrag]
  );

  // segmentRef stores per-gesture state so the closure captures a stable ref
  const segGestureRef = useRef<{ segIdx: number; seg: WeekSeg } | null>(null);

  const startSegmentDrag = useCallback(
    (e: React.PointerEvent, segmentIndex: number, seg: WeekSeg) => {
      if (actionBusy) return;
      // Prevent text-selection during drag but keep pointer capture so we
      // receive pointerup even when released outside the element.
      e.currentTarget.setPointerCapture(e.pointerId);
      const trackEl = (e.currentTarget as HTMLElement).closest('[data-timeline-track]') as HTMLElement | null;
      if (!trackEl) return;
      dragActiveRef.current = {
        mode: 'segment',
        segmentIndex,
        trackEl,
        pointerId: e.pointerId,
        startClientX: e.clientX
      };
      segGestureRef.current = { segIdx: segmentIndex, seg };
      setDragPreviewB(null);
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        if (dragActiveRef.current?.pointerId !== ev.pointerId) return;
        const d = dragActiveRef.current;
        if (!d || d.mode !== 'segment') return;
        if (Math.abs(ev.clientX - d.startClientX) > 6) {
          moved = true;
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (dragActiveRef.current?.pointerId !== ev.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const d = dragActiveRef.current;
        dragActiveRef.current = null;

        if (!d || d.mode !== 'segment') return;

        if (!moved) {
          // Treat as a click → Periodization notes popup
          const g = segGestureRef.current;
          segGestureRef.current = null;
          if (g) setPeriodNotesModalSeg(g.seg);
          return;
        }

        segGestureRef.current = null;
        const rect = d.trackEl.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pxPerWeek = rect.width / weekCountRef.current;
        if (pxPerWeek <= 0) return;
        const deltaWeeks = Math.round((ev.clientX - d.startClientX) / pxPerWeek);
        if (deltaWeeks === 0) return;
        // Suppress the synthetic click that fires after pointerup
        suppressNextSegmentClickRef.current = true;
        void applySegmentShift(d.segmentIndex, deltaWeeks);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [actionBusy, applySegmentShift]
  );

  // Guard: if the browser still fires a click after a drag gesture, eat it
  const handleSegmentClick = useCallback((seg: WeekSeg) => {
    if (suppressNextSegmentClickRef.current) {
      suppressNextSegmentClickRef.current = false;
      return;
    }
    setPeriodNotesModalSeg(seg);
  }, []);

  const callYearlyApi = async (body: Record<string, unknown>) => {
    const token = getAuthToken();
    if (!token) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/workouts/plan/yearly-periodization', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || data.details || 'Request failed');
        return false;
      }
      return true;
    } finally {
      setActionBusy(false);
    }
  };

  const handleSavePeriodization = async () => {
    try {
      const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
      const settings = res.ok ? await res.json() : {};
      const prevTools = settings.toolsSettings || {};
      const prevPer = prevTools.periodization || {};
      const patch = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolsSettings: {
            ...prevTools,
            periodization: {
              ...prevPer,
              notesByPeriodId: { ...prevPer.notesByPeriodId, ...notesByPeriodId },
              attachmentsByPeriodId: {
                ...((prevPer.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>) || {}),
                ...attachmentsByPeriodId
              }
            }
          }
        })
      });
      if (patch.ok) alert('Periodization documents saved.');
      else alert('Could not save.');
    } catch {
      alert('Could not save.');
    }
  };

  const handleApplyToYearlyPlan = async () => {
    if (!yearlyApply || !applyDateIso) {
      alert('Choose an apply start date (Monday).');
      return;
    }
    const build = yearlyApply.getBuild();
    const weekMap = build.weekPeriodByNumber ?? {};
    const assigned = Object.values(weekMap).filter((v) => typeof v === 'string' && v.trim()).length;
    if (assigned === 0) {
      alert('No weeks assigned in this periodization. Build it on the Periodization tab first.');
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    let planStart: Date | null = null;
    if (plan?.startDate) {
      planStart = new Date(plan.startDate);
    } else {
      try {
        const res = await fetch('/api/workouts/plan?type=YEARLY_PLAN&section=B&minimal=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : {};
        if (data.plan?.startDate) planStart = new Date(data.plan.startDate);
      } catch {
        /* ignore */
      }
    }

    const applyMon = getMondayOfWeek(new Date(applyDateIso));
    if (planStart) {
      const planMon = getMondayOfWeek(planStart);
      if (planMon.getTime() !== applyMon.getTime()) {
        const planLabel = planMon.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const applyLabel = applyMon.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const ok = window.confirm(
          `Your yearly plan calendar starts on ${planLabel}, but you chose to apply from ${applyLabel}.\n\nApply this periodization from the selected date anyway?`
        );
        if (!ok) return;
      }
    }

    const weekPeriodByNumber: Record<string, string> = {};
    for (const [k, v] of Object.entries(weekMap)) {
      if (v) weekPeriodByNumber[String(k)] = v;
    }

    setActionBusy(true);
    try {
      const res = await fetch('/api/workouts/plan/yearly-periodization', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'apply_favourite_template',
          applyStartDate: applyMon.toISOString(),
          weekPeriodByNumber,
          notesByPeriodId: build.notesByPeriodId ?? {},
          attachmentsByPeriodId: build.attachmentsByPeriodId ?? {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || data.details || 'Could not apply periodization to yearly plan.');
        return;
      }
      alert(data.message || 'Periodization applied to your yearly plan.');
      yearlyApply.onApplied?.();
    } finally {
      setActionBusy(false);
    }
  };

  const handleClearPeriodRow = async (periodId: string) => {
    if (!confirm('Remove this period from all assigned weeks (weeks will use your default period)?')) return;
    const ok = await callYearlyApi({ mode: 'clear_period_assignments', periodId });
    if (ok) await loadAll();
  };

  const openStartDateFlow = (dateIso: string) => {
    setStartDateModal({
      open: true,
      dateIso: dateIso.slice(0, 10),
      choice: 'shift'
    });
  };

  const confirmStartDateModal = async () => {
    if (!startDateModal) return;
    const iso = new Date(startDateModal.dateIso).toISOString();

    if (startDateModal.choice === 'reset') {
      setPendingStartAfterReset(startDateModal.dateIso);
      setStartDateModal(null);
      setResetAllConfirm(true);
      return;
    }

    const mode = startDateModal.choice === 'shift' ? 'shift_calendar' : 'metadata_only';
    const ok = await callYearlyApi({ mode, newStartDate: iso });
    setStartDateModal(null);
    if (ok) await loadAll();
  };

  const confirmResetAll = async () => {
    const ok = await callYearlyApi({ mode: 'reset_periods' });
    setResetAllConfirm(false);
    if (ok) {
      if (pendingStartAfterReset) {
        await callYearlyApi({
          mode: 'metadata_only',
          newStartDate: new Date(pendingStartAfterReset).toISOString()
        });
        setPendingStartAfterReset(null);
      }
      await loadAll();
      setDateInputKey((k) => k + 1);
    }
  };

  const periodDescription = (periodId: string) => periods.find((p) => p.id === periodId)?.description || '';

  const handleAttachmentUpload = async (periodId: string, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const current = attachmentsByPeriodId[periodId] || [];
    if (current.length >= MAX_PERIOD_ATTACHMENTS) {
      alert(`At most ${MAX_PERIOD_ATTACHMENTS} files per period.`);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setAttachmentBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('periodId', periodId);
      const res = await fetch('/api/workouts/plan/periodization-attachment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Upload failed');
        return;
      }
      const att = data.attachment as PeriodizationAttachmentMeta;
      const mergedList = [...current, att];
      setAttachmentsByPeriodId((prev) => ({ ...prev, [periodId]: mergedList }));
      const ok = await patchPeriodizationMerge((prev) => ({
        ...prev,
        attachmentsByPeriodId: {
          ...((prev.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>) || {}),
          [periodId]: [
            ...(((prev.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>)?.[periodId]) ||
              []),
            att
          ]
        }
      }));
      if (!ok) alert('Could not save attachment metadata. Use Save periodization to retry.');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleRemoveAttachment = async (periodId: string, att: PeriodizationAttachmentMeta) => {
    const token = getAuthToken();
    if (!token) return;
    setAttachmentBusy(true);
    try {
      await fetch('/api/workouts/plan/periodization-attachment', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: att.url })
      });
      const nextList = (attachmentsByPeriodId[periodId] || []).filter((a) => a.id !== att.id);
      setAttachmentsByPeriodId((prev) => ({ ...prev, [periodId]: nextList }));
      const ok = await patchPeriodizationMerge((prev) => {
        const m = {
          ...((prev.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>) || {})
        };
        m[periodId] = (m[periodId] || []).filter((a) => a.id !== att.id);
        return { ...prev, attachmentsByPeriodId: m };
      });
      if (!ok) alert('Could not update saved attachments list.');
    } finally {
      setAttachmentBusy(false);
    }
  };

  useEffect(() => {
    if (!resetAllConfirm) return;
    const id = requestAnimationFrame(() => resetNoRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [resetAllConfirm]);

  useEffect(() => {
    if (!resetAllConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingStartAfterReset(null);
        setResetAllConfirm(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetAllConfirm]);

  useEffect(() => {
    if (!periodNotesModalSeg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodNotesModalSeg(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [periodNotesModalSeg]);

  if (!isFavouriteDraft && !getAuthToken()) {
    return <p className="text-sm text-gray-500">Sign in to view yearly periodization.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading yearly plan…
      </div>
    );
  }

  if (!isFavouriteDraft && (!plan || weeks.length === 0)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-6 text-amber-900 dark:text-amber-100">
        <p className="font-semibold mb-1">No yearly plan found</p>
        <p className="text-sm">
          Create your yearly plan from the Workouts area first. This overview uses Section B (yearly) weeks and
          periods.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <h3 className="text-lg font-bold">Periodization of the current year from the starting date</h3>
        </div>

        <div className="p-4 space-y-4">
          {canApplyToYearly ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Yearly plan start (Monday)
                </label>
                <input
                  type="date"
                  value={applyDateIso}
                  onChange={(e) => setApplyDateIso(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleApplyToYearlyPlan()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Apply in the Yearly Plan
              </button>
            </div>
          ) : isFavouriteDraft ? (
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Preview of your <strong>52-week template</strong> (reference calendar starts{' '}
              {planMonday?.toLocaleDateString() ?? '—'}). Edit assignments on the Periodization tab; drag
              resize is only available on your live yearly plan.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Yearly plan start (Monday)
                </label>
                <input
                  key={dateInputKey}
                  type="date"
                  defaultValue={planMonday ? planMonday.toISOString().slice(0, 10) : ''}
                  id="yearly-start-input"
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  const el = document.getElementById('yearly-start-input') as HTMLInputElement | null;
                  if (!el?.value) return;
                  openStartDateFlow(el.value);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Change start date…
              </button>
            </div>
          )}

          {/* Timeline grid: columns match [lead trash][label w-24][track][trail trash] so Summary aligns with period rows */}
          {/* Month ruler — ticks only above the track column */}
          <div className="grid grid-cols-[auto_6rem_minmax(0,1fr)_auto] gap-x-2 items-end border-b border-gray-200 dark:border-gray-600 pb-1">
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-none invisible flex-shrink-0 p-1"
              aria-hidden
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-24 flex-shrink-0" aria-hidden />
            <div className="relative h-8 min-w-0">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap -translate-x-1/2"
                  style={{ left: `${t.leftPct}%`, top: 0 }}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-none invisible flex-shrink-0 p-1"
              aria-hidden
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Summary strip — drag blue handles to move period boundaries (clamped so prev/next blocks keep ≥1 week) */}
          <div className="grid grid-cols-[auto_6rem_minmax(0,1fr)_auto] gap-x-2 items-center">
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-none invisible flex-shrink-0 p-1"
              aria-hidden
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <span className="w-24 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Summary
            </span>
            <div
              data-timeline-track
              className="group relative h-8 bg-gray-100 dark:bg-gray-800 rounded-md overflow-visible min-w-0"
            >
              {summarySegments.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  title={s.name}
                  onClick={() => handleSegmentClick(s)}
                  onPointerDown={(e) => !isFavouriteDraft && startSegmentDrag(e, i, s)}
                  className={`absolute top-0 h-full border-0 hover:brightness-110 z-10 select-none touch-none ${
                    isFavouriteDraft ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                  }`}
                  style={{
                    ...segStyle(s.startWeek, s.endWeek, weekCount),
                    backgroundColor: s.color
                  }}
                />
              ))}
              {summarySegments.length > 1 &&
                summarySegments.slice(0, -1).map((s, i) => (
                  <div
                    key={`sum-bh-${i}`}
                    role="slider"
                    aria-label="Resize period boundary"
                    aria-valuenow={s.endWeek}
                    aria-valuemin={1}
                    aria-valuemax={weekCount}
                    tabIndex={0}
                    className="absolute top-0 bottom-0 w-3 z-20 cursor-ew-resize touch-none flex items-center justify-center -translate-x-1/2"
                    style={{ left: `${(s.endWeek / weekCount) * 100}%` }}
                    onPointerDown={(e) => !isFavouriteDraft && startBoundaryDrag(e, i)}
                  >
                    {!isFavouriteDraft && (
                      <span className="w-1 h-5 rounded bg-blue-900 dark:bg-blue-200 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                    )}
                  </div>
                ))}
              {!isFavouriteDraft && dragPreviewB !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-[15] pointer-events-none -translate-x-1/2 opacity-90"
                  style={{ left: `${(dragPreviewB / weekCount) * 100}%` }}
                />
              )}
            </div>
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
              title="Clear summary (use per-row trash)"
              disabled
            >
              <Trash2 className="w-4 h-4 opacity-30" />
            </button>
          </div>

          {/* Per-period rows */}
          <div className="space-y-2">
            {periodRows.map(({ period, segments }) => (
              <div key={period.id} className="grid grid-cols-[auto_6rem_minmax(0,1fr)_auto] gap-x-2 items-center">
                <button
                  type="button"
                  className={`p-1 flex-shrink-0 ${
                    isFavouriteDraft
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                  title={
                    isFavouriteDraft
                      ? 'Clear from live plan only'
                      : 'Clear this period from all weeks'
                  }
                  disabled={isFavouriteDraft}
                  onClick={() => !isFavouriteDraft && void handleClearPeriodRow(period.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-24 flex-shrink-0 flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                    style={{ backgroundColor: period.color }}
                  />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {period.title}
                  </span>
                </div>
                <div
                  data-timeline-track
                  className="group relative h-10 bg-gray-100 dark:bg-gray-800 rounded-md overflow-visible min-w-0"
                >
                  {segments.map((s, si) => {
                    const gIdx = summaryIndexForSegment(summarySegments, s);
                    return (
                      <React.Fragment key={si}>
                        <button
                          type="button"
                          onClick={() => handleSegmentClick(s)}
                          onPointerDown={(e) => !isFavouriteDraft && startSegmentDrag(e, gIdx, s)}
                          className={`absolute top-1 bottom-1 rounded-sm border-0 shadow-none hover:brightness-110 z-10 select-none touch-none ${
                            isFavouriteDraft ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                          }`}
                          style={{
                            ...segStyle(s.startWeek, s.endWeek, weekCount),
                            backgroundColor: s.color
                          }}
                          title={`Weeks ${s.startWeek}–${s.endWeek}`}
                        />
                        {gIdx > 0 && (
                          <div
                            role="slider"
                            aria-label="Resize period boundary"
                            aria-valuenow={summarySegments[gIdx - 1].endWeek}
                            aria-valuemin={1}
                            aria-valuemax={weekCount}
                            tabIndex={0}
                            className="absolute top-1 bottom-1 w-3 z-20 cursor-ew-resize touch-none flex items-center justify-center -translate-x-1/2"
                            style={{ left: `${(summarySegments[gIdx - 1].endWeek / weekCount) * 100}%` }}
                            onPointerDown={(e) => startBoundaryDrag(e, gIdx - 1)}
                          >
                            <span className="w-1 h-5 rounded bg-blue-900 dark:bg-blue-200 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                          </div>
                        )}
                        {gIdx >= 0 && gIdx < summarySegments.length - 1 && (
                          <div
                            role="slider"
                            aria-label="Resize period boundary"
                            aria-valuenow={summarySegments[gIdx].endWeek}
                            aria-valuemin={1}
                            aria-valuemax={weekCount}
                            tabIndex={0}
                            className="absolute top-1 bottom-1 w-3 z-20 cursor-ew-resize touch-none flex items-center justify-center -translate-x-1/2"
                            style={{ left: `${(summarySegments[gIdx].endWeek / weekCount) * 100}%` }}
                            onPointerDown={(e) => startBoundaryDrag(e, gIdx)}
                          >
                            <span className="w-1 h-5 rounded bg-blue-900 dark:bg-blue-200 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {dragPreviewB !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-[15] pointer-events-none -translate-x-1/2 opacity-90"
                      style={{ left: `${(dragPreviewB / weekCount) * 100}%` }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className={`p-1 flex-shrink-0 ${
                    isFavouriteDraft
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                  title={
                    isFavouriteDraft
                      ? 'Clear from live plan only'
                      : 'Clear this period from all weeks'
                  }
                  disabled={isFavouriteDraft}
                  onClick={() => !isFavouriteDraft && void handleClearPeriodRow(period.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
        {!canApplyToYearly && (
          <button
            type="button"
            onClick={() => void handleSavePeriodization()}
            className="px-5 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            Save periodization
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => void loadAll()}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          >
            Update
          </button>
          <button
            type="button"
            onClick={() => {
              setDateInputKey((k) => k + 1);
              void loadAll();
            }}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => setResetAllConfirm(true)}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white"
          >
            Reset all
          </button>
        </div>
      </div>

      {/* Periodization notes (timeline segment click) */}
      {periodNotesModalSeg && (
        <div
          className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overview-period-notes-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPeriodNotesModalSeg(null);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[min(80vh,560px)] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2
                id="overview-period-notes-title"
                className="text-base font-semibold text-gray-900 dark:text-white pr-2"
              >
                Periodization notes
              </h2>
              <button
                type="button"
                onClick={() => setPeriodNotesModalSeg(null)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none flex-1 min-h-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 not-prose">
                {periodNotesModalSeg.name}
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  {' '}
                  · Weeks {periodNotesModalSeg.startWeek}–{periodNotesModalSeg.endWeek}
                </span>
              </p>
              {(() => {
                const nh = notesHtmlForPeriod(notesByPeriodId, periodNotesModalSeg.periodId);
                return nh ? (
                  <div dangerouslySetInnerHTML={{ __html: nh }} />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 not-prose">
                    No periodization notes for this period yet.
                  </p>
                );
              })()}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => {
                  const s = periodNotesModalSeg;
                  setPeriodNotesModalSeg(null);
                  setDetailSeg(s);
                }}
              >
                Description & attachments…
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold"
                onClick={() => setPeriodNotesModalSeg(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block detail */}
      {detailSeg && (
        <div
          className="fixed inset-0 z-[200000] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDetailSeg(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{detailSeg.name}</h4>
            <p className="text-xs text-gray-500 mb-1">Weeks {detailSeg.startWeek} – {detailSeg.endWeek}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Description of the period
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  {periodDescription(detailSeg.periodId) || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Document in attachment — written notes
                </p>
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none rounded-lg bg-sky-50 dark:bg-gray-800 p-3 border border-sky-200 dark:border-gray-600 max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html:
                      notesHtmlForPeriod(notesByPeriodId, detailSeg.periodId) ||
                      '<p class="text-gray-500 italic">No notes yet. Add them under the Periodization tab.</p>'
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Document in attachment — files
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 p-3 space-y-2">
                  <label className="flex flex-wrap items-center gap-2 cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <span>Add file (PDF, Word, images, text — max 10MB)</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.txt,image/*"
                      disabled={attachmentBusy}
                      onChange={(e) => {
                        void handleAttachmentUpload(detailSeg.periodId, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {attachmentBusy && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Working…
                    </p>
                  )}
                  {(attachmentsByPeriodId[detailSeg.periodId] || []).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No files attached yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(attachmentsByPeriodId[detailSeg.periodId] || []).map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                        >
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-0 truncate underline hover:text-blue-600 dark:hover:text-blue-400"
                            download={att.name}
                          >
                            {att.name}
                          </a>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {(att.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Remove file"
                            disabled={attachmentBusy}
                            onClick={() => void handleRemoveAttachment(detailSeg.periodId, att)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mt-4 w-full py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold"
              onClick={() => setDetailSeg(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Start date choice */}
      {startDateModal?.open && (
        <div className="fixed inset-0 z-[200000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">Yearly plan start date</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              New start (Monday will be used):{' '}
              <strong>{new Date(startDateModal.dateIso).toLocaleDateString()}</strong>
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex gap-2 items-start cursor-pointer">
                <input
                  type="radio"
                  name="sd"
                  checked={startDateModal.choice === 'shift'}
                  onChange={() => setStartDateModal({ ...startDateModal, choice: 'shift' })}
                />
                <span>Move the periods from new starting date</span>
              </label>
              <label className="flex gap-2 items-start cursor-pointer">
                <input
                  type="radio"
                  name="sd"
                  checked={startDateModal.choice === 'leave'}
                  onChange={() => setStartDateModal({ ...startDateModal, choice: 'leave' })}
                />
                <span>Leave the periods as they are now</span>
              </label>
              <label className="flex gap-2 items-start cursor-pointer">
                <input
                  type="radio"
                  name="sd"
                  checked={startDateModal.choice === 'reset'}
                  onChange={() => setStartDateModal({ ...startDateModal, choice: 'reset' })}
                />
                <span>Reset all period assignments</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold"
                onClick={() => setStartDateModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
                onClick={() => void confirmStartDateModal()}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset all confirmation (default No) */}
      {resetAllConfirm && (
        <div className="fixed inset-0 z-[200000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Reset all period assignments?</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Every week in your yearly plan will be set to your first period (by display order).
            </p>
            <div className="flex gap-2">
              <button
                ref={resetNoRef}
                type="button"
                autoFocus
                className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  setPendingStartAfterReset(null);
                  setResetAllConfirm(false);
                }}
              >
                No
              </button>
              <button
                type="button"
                disabled={actionBusy}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50"
                onClick={() => void confirmResetAll()}
              >
                Yes, reset all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

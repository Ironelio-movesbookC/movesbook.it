'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, FileText, GripVertical, Loader2, Paperclip, X } from 'lucide-react';
import type { Period } from '@/constants/tools.constants';
import {
  MAX_PERIOD_ATTACHMENTS,
  type PeriodizationAttachmentMeta
} from '@/lib/periodizationAttachments';
import { getAuthToken, getAuthHeaders } from '@/utils/auth.utils';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

type PlanMode = 'yearly' | 'template';

/** How to list assignments under "Periods and assigned weeks". */
type PeriodWeekListMode = 'byPeriod' | 'byWeek';

export interface PeriodizationPersisted {
  displayOrder?: string[];
  notesByPeriodId?: Record<string, string>;
  attachmentsByPeriodId?: Record<string, PeriodizationAttachmentMeta[]>;
  planMode?: PlanMode;
}

function weekDateRangeLabel(week: any, includeDates: boolean): string {
  const weekDays = week.days || [];
  const sorted = [...weekDays].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  if (!includeDates || sorted.length === 0) return '';
  const startDate = sorted[0]?.date
    ? new Date(sorted[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const endDate = sorted[sorted.length - 1]?.date
    ? new Date(sorted[sorted.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return startDate && endDate ? ` (${startDate} - ${endDate})` : '';
}

/** Calendar span across all days belonging to assigned week numbers (yearly plan only). */
function periodCalendarSpanLabel(sortedWeeks: any[], weekNumbers: number[], includeDates: boolean): string {
  if (!includeDates || !sortedWeeks?.length || weekNumbers.length === 0) return '';
  const set = new Set(weekNumbers);
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const w of sortedWeeks) {
    if (!set.has(w.weekNumber)) continue;
    const days = w.days || [];
    for (const d of days) {
      if (!d?.date) continue;
      const t = new Date(d.date).getTime();
      if (!Number.isFinite(t)) continue;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
  }
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return '';
  const start = new Date(minTime);
  const end = new Date(maxTime);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function compressWeekRanges(weekNumbers: number[]): string {
  if (weekNumbers.length === 0) return '—';
  const u = Array.from(new Set(weekNumbers)).sort((a, b) => a - b);
  const parts: string[] = [];
  let start = u[0];
  let prev = u[0];
  for (let i = 1; i < u.length; i++) {
    const n = u[i];
    if (n !== prev + 1) {
      parts.push(start === prev ? `Week ${start}` : `Weeks ${start}–${prev}`);
      start = n;
    }
    prev = n;
  }
  parts.push(start === prev ? `Week ${start}` : `Weeks ${start}–${prev}`);
  return parts.join(', ');
}

function PeriodPickerDropdown({
  periods,
  value,
  onChange
}: {
  periods: Period[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = periods.find((p) => p.id === value) ?? null;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-left"
      >
        {selected ? (
          <>
            <span
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-500"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{selected.title}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400 dark:text-gray-500">Select period…</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 mt-1 w-full max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-xl">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                p.id === value ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-500"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{p.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekPickerDropdown({
  weeks,
  value,
  onChange,
  includeDates,
  id
}: {
  weeks: any[];
  value: number;
  onChange: (n: number) => void;
  includeDates: boolean;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedWeek = weeks.find((w) => w.weekNumber === value);
  const getInfo = (week: any) => {
    const name: string = week.period?.name || '';
    const color: string = week.period?.color || '';
    const dr = weekDateRangeLabel(week, includeDates);
    return { name, color, assigned: !!week.period?.id, dr };
  };

  const sel = selectedWeek ? getInfo(selectedWeek) : { name: '', color: '', assigned: false, dr: '' };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[12rem]" id={id}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-left min-w-0"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-500"
          style={{ backgroundColor: sel.assigned ? sel.color : '#9ca3af' }}
        />
        <span className={`truncate ${sel.assigned ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'}`}>
          {sel.assigned ? sel.name : 'Not yet assigned'}
        </span>
        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">-</span>
        <span className="text-gray-700 dark:text-gray-200 flex-shrink-0">
          Week {selectedWeek?.weekNumber ?? value}
        </span>
        {sel.dr && (
          <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">{sel.dr}</span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 mt-1 w-full max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-xl">
          {weeks.map((week: any) => {
            const { name, color, assigned, dr } = getInfo(week);
            const isSelected = week.weekNumber === value;
            return (
              <button
                key={week.id}
                type="button"
                onClick={() => { onChange(week.weekNumber); setOpen(false); }}
                className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-500"
                  style={{ backgroundColor: assigned ? color : '#9ca3af' }}
                />
                <span className={`truncate ${assigned ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                  {assigned ? name : 'Not yet assigned'}
                </span>
                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">-</span>
                <span className="text-gray-700 dark:text-gray-300 flex-shrink-0">
                  Week {week.weekNumber}
                </span>
                {dr && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">{dr}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PeriodizationTabPanel({ periods }: { periods: Period[] }) {
  const [planMode, setPlanMode] = useState<PlanMode>('yearly');
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [sortedWeeks, setSortedWeeks] = useState<any[]>([]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [weekRangeStart, setWeekRangeStart] = useState(1);
  const [weekRangeEnd, setWeekRangeEnd] = useState(1);
  const [editorHtml, setEditorHtml] = useState('');
  const [notesByPeriodId, setNotesByPeriodId] = useState<Record<string, string>>({});
  const [attachmentsByPeriodId, setAttachmentsByPeriodId] = useState<
    Record<string, PeriodizationAttachmentMeta[]>
  >({});
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [orderedPeriodIds, setOrderedPeriodIds] = useState<string[]>([]);
  const [persistedSnapshot, setPersistedSnapshot] = useState<PeriodizationPersisted | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [assignmentSectionOpen, setAssignmentSectionOpen] = useState(true);
  const [periodNotesModalId, setPeriodNotesModalId] = useState<string | null>(null);
  const [periodWeekListMode, setPeriodWeekListMode] = useState<PeriodWeekListMode>('byPeriod');

  const includeDates = planMode === 'yearly';

  const loadPlan = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setPlanError('Please sign in to load your plan.');
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    setPlanError(null);
    try {
      const type = planMode === 'yearly' ? 'YEARLY_PLAN' : 'TEMPLATE_WEEKS';
      const section = planMode === 'yearly' ? 'B' : 'A';
      const res = await fetch(`/api/workouts/plan?type=${type}&section=${section}&minimal=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanError(data?.error || 'Could not load plan.');
        setSortedWeeks([]);
        return;
      }
      const weeks = (data.plan?.weeks || []).slice().sort((a: any, b: any) => a.weekNumber - b.weekNumber);
      setSortedWeeks(weeks);
      if (weeks.length > 0) {
        setWeekRangeStart((prev) =>
          weeks.some((w: any) => w.weekNumber === prev) ? prev : weeks[0].weekNumber
        );
        setWeekRangeEnd((prev) =>
          weeks.some((w: any) => w.weekNumber === prev) ? prev : weeks[0].weekNumber
        );
      }
    } catch (e) {
      setPlanError('Failed to load plan.');
      setSortedWeeks([]);
    } finally {
      setPlanLoading(false);
    }
  }, [planMode]);

  const loadPersisted = useCallback(async () => {
    try {
      const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const settings = await res.json();
      const ts = settings.toolsSettings || {};
      const p: PeriodizationPersisted = ts.periodization || {};
      setPersistedSnapshot(p);
      if (p.notesByPeriodId) setNotesByPeriodId({ ...p.notesByPeriodId });
      if (p.attachmentsByPeriodId && typeof p.attachmentsByPeriodId === 'object') {
        setAttachmentsByPeriodId({ ...p.attachmentsByPeriodId });
      } else {
        setAttachmentsByPeriodId({});
      }
      if (p.planMode === 'yearly' || p.planMode === 'template') setPlanMode(p.planMode);
      if (p.displayOrder?.length) {
        setOrderedPeriodIds(p.displayOrder);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (periods.length) {
      setOrderedPeriodIds((prev) => {
        if (prev.length === 0) return periods.map((p) => p.id);
        const set = new Set(periods.map((p) => p.id));
        const kept = prev.filter((id) => set.has(id));
        const extra = periods.map((p) => p.id).filter((id) => !kept.includes(id));
        return [...kept, ...extra];
      });
    }
  }, [periods]);

  useEffect(() => {
    void loadPersisted();
  }, [loadPersisted]);

  useEffect(() => {
    if (!selectedPeriodId && periods[0]?.id) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    if (!selectedPeriodId) return;
    setEditorHtml(notesByPeriodId[selectedPeriodId] || '');
  }, [selectedPeriodId, notesByPeriodId]);

  useEffect(() => {
    if (!periodNotesModalId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodNotesModalId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [periodNotesModalId]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const periodWeekSummary = useMemo(() => {
    const byPeriod: Record<string, number[]> = {};
    for (const w of sortedWeeks) {
      const pid = w.period?.id;
      if (!pid) continue;
      if (!byPeriod[pid]) byPeriod[pid] = [];
      byPeriod[pid].push(w.weekNumber);
    }
    const rows: {
      periodId: string;
      title: string;
      color: string;
      weeksLabel: string;
      minWeek: number;
      calendarSpanLabel: string;
    }[] = [];
    for (const id of Object.keys(byPeriod)) {
      const nums = byPeriod[id];
      if (!nums?.length) continue;
      const p = periods.find((x) => x.id === id);
      if (!p) continue;
      const uniqNums = Array.from(new Set(nums)).sort((a, b) => a - b);
      rows.push({
        periodId: id,
        title: p.title,
        color: p.color,
        weeksLabel: compressWeekRanges(nums),
        minWeek: Math.min(...uniqNums),
        calendarSpanLabel: periodCalendarSpanLabel(sortedWeeks, uniqNums, includeDates)
      });
    }
    // Always sort by the first assigned week so the list is chronological
    rows.sort((a, b) => a.minWeek - b.minWeek);
    return rows;
  }, [sortedWeeks, periods, includeDates]);

  /**
   * Display-by-week: chronological segments — consecutive weeks with the same period merge into one row
   * (e.g. Weeks 2–6). Order follows week numbers; a new segment starts when the period changes or weeks are not consecutive.
   */
  const weekProgressiveSegments = useMemo(() => {
    const sorted = [...sortedWeeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
    const out: {
      startWeek: number;
      endWeek: number;
      periodId: string | null;
      title: string;
      color: string;
      weeksLabel: string;
      calendarSpanLabel: string;
    }[] = [];

    const periodMeta = (w: any) => {
      const pid = (w.period?.id as string | undefined) ?? null;
      const fromTools = pid ? periods.find((x) => x.id === pid) : undefined;
      const title =
        (fromTools?.title ?? (typeof w.period?.name === 'string' ? w.period.name : '')) || 'Not assigned';
      const color = fromTools?.color ?? w.period?.color ?? '#94a3b8';
      return { pid, title, color };
    };

    for (const w of sorted) {
      const wn = w.weekNumber as number;
      const { pid, title, color } = periodMeta(w);
      const last = out[out.length - 1];
      if (last && last.periodId === pid && wn === last.endWeek + 1) {
        last.endWeek = wn;
        last.weeksLabel =
          last.startWeek === last.endWeek ? `Week ${last.startWeek}` : `Weeks ${last.startWeek}–${last.endWeek}`;
        const nums = Array.from({ length: last.endWeek - last.startWeek + 1 }, (_, i) => last.startWeek + i);
        last.calendarSpanLabel = periodCalendarSpanLabel(sortedWeeks, nums, includeDates);
      } else {
        out.push({
          startWeek: wn,
          endWeek: wn,
          periodId: pid,
          title,
          color,
          weeksLabel: `Week ${wn}`,
          calendarSpanLabel: periodCalendarSpanLabel(sortedWeeks, [wn], includeDates)
        });
      }
    }
    return out;
  }, [sortedWeeks, periods, includeDates]);

  // Periods sorted chronologically by their earliest assigned week (unassigned go last)
  const chronologicalPeriods = useMemo(() => {
    const firstWeek: Record<string, number> = {};
    for (const w of sortedWeeks) {
      const pid = w.period?.id;
      if (!pid) continue;
      if (firstWeek[pid] === undefined || w.weekNumber < firstWeek[pid]) {
        firstWeek[pid] = w.weekNumber;
      }
    }
    return [...periods].sort((a, b) => {
      const wa = firstWeek[a.id] ?? Infinity;
      const wb = firstWeek[b.id] ?? Infinity;
      return wa - wb;
    });
  }, [periods, sortedWeeks]);

  const patchPeriodizationMerge = useCallback(async (mergeFn: (prev: Record<string, unknown>) => Record<string, unknown>) => {
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
  }, []);

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
      setAttachmentsByPeriodId((prev) => ({ ...prev, [periodId]: [...(prev[periodId] || []), att] }));
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
      if (!ok) alert('Could not save attachment metadata. Click Save to retry.');
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
      setAttachmentsByPeriodId((prev) => ({
        ...prev,
        [periodId]: (prev[periodId] || []).filter((a) => a.id !== att.id)
      }));
      const ok = await patchPeriodizationMerge((prev) => {
        const m = {
          ...((prev.attachmentsByPeriodId as Record<string, PeriodizationAttachmentMeta[]>) || {})
        };
        m[periodId] = (m[periodId] || []).filter((a) => a.id !== att.id);
        return { ...prev, attachmentsByPeriodId: m };
      });
      if (!ok) alert('Could not update saved attachments.');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleApply = async () => {
    if (!selectedPeriod) {
      alert('Select a period first.');
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    const weeksInRange = sortedWeeks.filter(
      (w: any) => w.weekNumber >= weekRangeStart && w.weekNumber <= weekRangeEnd
    );
    if (weeksInRange.length === 0) {
      alert('No weeks in this range. Create or load a plan first.');
      return;
    }
    setNotesByPeriodId((prev) => ({ ...prev, [selectedPeriod.id]: editorHtml }));
    setApplyBusy(true);
    try {
      const results = await Promise.all(
        weeksInRange.map((week: any) =>
          fetch(`/api/workouts/weeks/${week.id}/period`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ periodId: selectedPeriod.id, updateAllDays: true })
          })
        )
      );
      if (!results.every((r) => r.ok)) {
        alert('Some weeks could not be updated. Please try again.');
      } else {
        // Persist notes for this period so Overview (and other views) load them from the server — same store as Save.
        await patchPeriodizationMerge((prev) => ({
          ...prev,
          notesByPeriodId: {
            ...((prev.notesByPeriodId as Record<string, string>) || {}),
            [selectedPeriod.id]: editorHtml
          }
        }));
      }
      await loadPlan();
    } catch {
      alert('Error applying period to weeks.');
    } finally {
      setApplyBusy(false);
    }
  };

  const handleSave = async () => {
    const token = getAuthToken();
    if (!token) return;
    setSaveBusy(true);
    try {
      const res = await fetch('/api/user/settings', { headers: getAuthHeaders() });
      const settings = res.ok ? await res.json() : {};
      const prevTools = settings.toolsSettings || {};
      const periodization: PeriodizationPersisted = {
        displayOrder: orderedPeriodIds,
        notesByPeriodId: { ...notesByPeriodId, ...(selectedPeriodId ? { [selectedPeriodId]: editorHtml } : {}) },
        attachmentsByPeriodId: { ...attachmentsByPeriodId },
        planMode
      };
      const patch = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolsSettings: {
            ...prevTools,
            periodization
          }
        })
      });
      if (patch.ok) {
        setPersistedSnapshot(periodization);
        setNotesByPeriodId(periodization.notesByPeriodId || {});
        setAttachmentsByPeriodId(periodization.attachmentsByPeriodId || {});
        alert('Periodization notes, attachments, and list order saved.');
      } else {
        alert('Could not save settings.');
      }
    } catch {
      alert('Could not save settings.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCancel = () => {
    if (persistedSnapshot?.notesByPeriodId) {
      setNotesByPeriodId({ ...persistedSnapshot.notesByPeriodId });
    }
    if (persistedSnapshot?.attachmentsByPeriodId) {
      setAttachmentsByPeriodId({ ...persistedSnapshot.attachmentsByPeriodId });
    } else {
      setAttachmentsByPeriodId({});
    }
    if (persistedSnapshot?.displayOrder?.length) {
      setOrderedPeriodIds(persistedSnapshot.displayOrder);
    }
    if (persistedSnapshot?.planMode) setPlanMode(persistedSnapshot.planMode);
    void loadPlan();
    if (selectedPeriodId) {
      setEditorHtml((persistedSnapshot?.notesByPeriodId || {})[selectedPeriodId] || '');
    }
  };

  const onEditorChange = (html: string) => {
    setEditorHtml(html);
    if (selectedPeriodId) {
      setNotesByPeriodId((prev) => ({ ...prev, [selectedPeriodId]: html }));
    }
  };


  if (!periods.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-6 text-amber-900 dark:text-amber-200">
        <p className="font-semibold mb-1">No periods defined</p>
        <p className="text-sm">Create periods under the Period settings tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan:</span>
          <select
            value={planMode}
            onChange={(e) => setPlanMode(e.target.value as PlanMode)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="yearly">Yearly plan (52 weeks)</option>
            <option value="template">Template weekly plan (3 weeks)</option>
          </select>
        </div>
        {planLoading && (
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading plan…
          </span>
        )}
      </div>

      {planError && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {planError}
        </div>
      )}

      {assignmentSectionOpen && (
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Assign period to weeks
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              This sets the period for each selected week and updates all days in those weeks (same as in the
              workout planner).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssignmentSectionOpen(false)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-expanded={true}
            aria-controls="period-assignment-section"
            title="Hide assignment controls"
          >
            <ChevronUp className="w-4 h-4" />
            Hide
          </button>
        </div>

        <div id="period-assignment-section" className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Select a period
            </label>
            <PeriodPickerDropdown
              periods={chronologicalPeriods}
              value={selectedPeriodId}
              onChange={setSelectedPeriodId}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              readOnly
              value={selectedPeriod?.description || ''}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 resize-none"
            />
          </div>

          {selectedPeriod && sortedWeeks.length > 0 && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Apply to week range</div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">From week:</label>
                <WeekPickerDropdown
                  id="from-week"
                  weeks={sortedWeeks}
                  value={weekRangeStart}
                  includeDates={includeDates}
                  onChange={(start) => {
                    setWeekRangeStart(start);
                    if (weekRangeEnd < start) setWeekRangeEnd(start);
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">To week:</label>
                <WeekPickerDropdown
                  id="to-week"
                  weeks={sortedWeeks}
                  value={weekRangeEnd}
                  includeDates={includeDates}
                  onChange={(end) => {
                    setWeekRangeEnd(end);
                    if (weekRangeStart > end) setWeekRangeStart(end);
                  }}
                />
              </div>
              <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300">
                <strong>Preview:</strong> &quot;{selectedPeriod.title}&quot; →{' '}
                {weekRangeStart === weekRangeEnd
                  ? `Week ${weekRangeStart}`
                  : `Weeks ${weekRangeStart}–${weekRangeEnd} (${weekRangeEnd - weekRangeStart + 1} weeks)`}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Periodization notes (training strategies for this period)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditorChange('<p>Sample: volume progression, deload week 4, focus on technique.</p>')}
                  className="text-xs px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => onEditorChange('')}
                  className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="ckeditor-wrapper border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <CKEditorComponent value={editorHtml} onChange={onEditorChange} placeholder="Describe strategies…" />
            </div>
          </div>

          {selectedPeriodId && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Attached documents (PDF, Word, images, text — max 10MB each)
              </label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 p-3 space-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <Paperclip className="w-4 h-4" />
                  <span>Add file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    disabled={attachmentBusy}
                    onChange={(e) => {
                      void handleAttachmentUpload(selectedPeriodId, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                {attachmentBusy && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Working…
                  </p>
                )}
                {(attachmentsByPeriodId[selectedPeriodId] || []).length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No files for this period.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(attachmentsByPeriodId[selectedPeriodId] || []).map((att) => (
                      <li
                        key={att.id}
                        className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                      >
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 truncate underline"
                          download={att.name}
                        >
                          {att.name}
                        </a>
                        <button
                          type="button"
                          className="p-1 rounded text-gray-400 hover:text-red-600"
                          disabled={attachmentBusy}
                          onClick={() => void handleRemoveAttachment(selectedPeriodId, att)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              disabled={applyBusy || !selectedPeriod || sortedWeeks.length === 0}
              onClick={() => void handleApply()}
              className="px-5 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {applyBusy ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Periods and assigned weeks
            </p>
            <div
              className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-900/80 shadow-inner"
              role="group"
              aria-label="Display mode"
            >
              <button
                type="button"
                onClick={() => setPeriodWeekListMode('byPeriod')}
                aria-pressed={periodWeekListMode === 'byPeriod'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  periodWeekListMode === 'byPeriod'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700'
                }`}
              >
                Display by period
              </button>
              <button
                type="button"
                onClick={() => setPeriodWeekListMode('byWeek')}
                aria-pressed={periodWeekListMode === 'byWeek'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  periodWeekListMode === 'byWeek'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700'
                }`}
              >
                Display by week
              </button>
            </div>
          </div>
          {!assignmentSectionOpen && (
            <button
              type="button"
              onClick={() => setAssignmentSectionOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-800 text-blue-800 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-950/50 shadow-sm flex-shrink-0"
              aria-controls="period-assignment-section"
              title="Show assignment to weeks"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Show assignment
            </button>
          )}
        </div>
        <div className="space-y-2">
          {sortedWeeks.length === 0 && !planLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              Load a plan to see week assignments.
            </p>
          )}
          {sortedWeeks.length > 0 &&
            periodWeekListMode === 'byPeriod' &&
            periodWeekSummary.length === 0 &&
            !planLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                {assignmentSectionOpen
                  ? 'No assignments yet. Choose a period, set From/To weeks, and press Apply.'
                  : 'No assignments yet. Click Show assignment to open the form, then choose a period and Apply.'}
              </p>
            )}
          {periodWeekListMode === 'byPeriod' &&
            periodWeekSummary.map((row, idx) => (
              <div
                key={row.periodId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                <span className="w-5 h-5 flex-shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500 text-center leading-5">
                  {idx + 1}
                </span>
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: row.color }}
                />
                <div className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setPeriodNotesModalId(row.periodId)}
                      className="font-semibold text-gray-900 dark:text-white text-left hover:underline hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                      {row.title}
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      — {row.weeksLabel}
                    </span>
                  </div>
                  {row.calendarSpanLabel ? (
                    <span
                      className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums"
                      title="Calendar span for assigned weeks"
                    >
                      {row.calendarSpanLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          {periodWeekListMode === 'byWeek' &&
            weekProgressiveSegments.map((seg, idx) => (
              <div
                key={`${seg.startWeek}-${seg.endWeek}-${seg.periodId ?? 'na'}-${idx}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                <span className="w-5 h-5 flex-shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500 text-center leading-5">
                  {idx + 1}
                </span>
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{seg.weeksLabel}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      —{' '}
                      {seg.periodId ? (
                        <button
                          type="button"
                          onClick={() => setPeriodNotesModalId(seg.periodId!)}
                          className="font-semibold text-gray-900 dark:text-white text-left hover:underline hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded inline"
                        >
                          {seg.title}
                        </button>
                      ) : (
                        <span className="italic text-gray-500 dark:text-gray-400">Not assigned</span>
                      )}
                    </span>
                  </div>
                  {seg.calendarSpanLabel ? (
                    <span
                      className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums"
                      title="Calendar span for these weeks"
                    >
                      {seg.calendarSpanLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2.5 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saveBusy}
          onClick={() => void handleSave()}
          className="px-6 py-2.5 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
        >
          {saveBusy ? 'Saving…' : 'Save'}
        </button>
      </div>

      {periodNotesModalId && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="period-notes-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPeriodNotesModalId(null);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[min(80vh,560px)] flex flex-col border border-gray-200 dark:border-gray-600">
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <h2
                id="period-notes-modal-title"
                className="text-base font-semibold text-gray-900 dark:text-white pr-2"
              >
                Periodization notes
              </h2>
              <button
                type="button"
                onClick={() => setPeriodNotesModalId(null)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto text-sm text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 not-prose">
                {periods.find((p) => p.id === periodNotesModalId)?.title ?? 'Period'}
              </p>
              {notesByPeriodId[periodNotesModalId]?.trim() ? (
                <div
                  className="period-notes-modal-html"
                  dangerouslySetInnerHTML={{ __html: notesByPeriodId[periodNotesModalId] }}
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 not-prose">
                  No periodization notes for this period yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

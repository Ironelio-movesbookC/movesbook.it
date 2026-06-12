'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  LayoutGrid,
  CalendarDays,
  Trash2,
  Pencil,
  ArrowRightLeft,
  Clock3,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

const GRID_PAGE_SIZE = 10;
type TemplateRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  nameByLanguage: string | null;
  descriptionByLanguage: string | null;
};

type ActionRow = {
  id: string;
  templateId: string | null;
  nameSnapshot: string;
  iconSnapshot: string | null;
  colorSnapshot: string;
  description: string | null;
  textColor: string | null;
  backgroundColor: string | null;
  url: string | null;
  workoutDay: { id: string; date: string; weekNumber: number };
};

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Calendar YYYY-MM-DD keys for a stored date (UTC + local) — avoids "no day" when API uses UTC midnight. */
function calendarKeysForStoredDate(dateVal: string | Date): Set<string> {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return new Set();
  const utc = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const local = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return new Set([utc, local]);
}

function findDayIdInPlan(
  plan: any,
  dateInput: string,
  section: 'B' | 'C'
): string | null {
  const raw = dateInput.trim();
  const targetKey =
    raw.length >= 10 ? raw.slice(0, 10) : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetKey)) return null;

  const wantZone = section === 'B' ? 'B' : 'C';
  for (const w of plan?.weeks || []) {
    for (const d of w.days || []) {
      if (!calendarKeysForStoredDate(d.date).has(targetKey)) continue;
      if (d.storageZone === wantZone) return d.id;
    }
  }
  for (const w of plan?.weeks || []) {
    for (const d of w.days || []) {
      if (calendarKeysForStoredDate(d.date).has(targetKey)) return d.id;
    }
  }
  return null;
}

function formatDay(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

const ACTION_TIME_TAG = /\[ACTION_TIME\](\d{2}:\d{2})\[\/ACTION_TIME\]/;
const ACTION_TITLE_TAG = /\[ACTION_TITLE\]([\s\S]*?)\[\/ACTION_TITLE\]/;

function extractActionStartTime(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  const m = rawDescription.match(ACTION_TIME_TAG);
  return m?.[1] ?? '';
}

function stripActionTimeTag(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  return rawDescription.replace(ACTION_TIME_TAG, '').trim();
}

function extractActionShortTitle(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  const m = rawDescription.match(ACTION_TITLE_TAG);
  return (m?.[1] || '').trim();
}

function stripActionTitleTag(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  return rawDescription.replace(ACTION_TITLE_TAG, '').trim();
}

function stripActionMetaTags(rawDescription: string | null | undefined): string {
  return stripActionTitleTag(stripActionTimeTag(rawDescription || ''));
}

function ActionsPageSelector({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: React.ReactNode[] = [];

  const pushPage = (n: number) => {
    pages.push(
      <button
        key={n}
        type="button"
        onClick={() => onPageChange(n)}
        className={`min-w-[2.25rem] px-3 py-1.5 text-sm font-semibold rounded transition ${
          page === n
            ? 'bg-gray-800 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {n}
      </button>
    );
  };

  pushPage(1);
  if (page > 3) {
    pages.push(
      <span key="ellipsis-start" className="px-1 text-gray-500">
        …
      </span>
    );
  }
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i++) {
    if (i !== 1 && i !== totalPages) pushPage(i);
  }
  if (page < totalPages - 2) {
    pages.push(
      <span key="ellipsis-end" className="px-1 text-gray-500">
        …
      </span>
    );
  }
  if (totalPages > 1) pushPage(totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t border-gray-200 bg-gray-50 px-3 py-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ←
      </button>
      {pages}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        →
      </button>
      <span className="ml-2 text-xs text-gray-600">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

function withActionMetaTags(description: string, startTime: string, shortTitle: string): string {
  const clean = stripActionMetaTags(description).trim();
  const time = startTime.trim();
  const title = shortTitle.trim();
  const tags: string[] = [];
  if (title) tags.push(`[ACTION_TITLE]${title}[/ACTION_TITLE]`);
  if (time) tags.push(`[ACTION_TIME]${time}[/ACTION_TIME]`);
  if (tags.length === 0) return clean;
  const meta = tags.join('\n');
  return clean ? `${clean}\n${meta}` : meta;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workoutPlan: any;
  activeSection: 'B' | 'C';
  onSaved: () => Promise<void>;
};

export default function InsertActionsModal({
  isOpen,
  onClose,
  workoutPlan,
  activeSection,
  onSaved,
}: Props) {
  const planType = activeSection === 'B' ? 'YEARLY_PLAN' : 'WORKOUTS_DONE';

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'timeline'>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddPanel, setShowAddPanel] = useState(true);

  const [dateStr, setDateStr] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [textColor, setTextColor] = useState('#111827');
  const [bgColor, setBgColor] = useState('#f1f5f9');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterTemplateId, setFilterTemplateId] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'action'>('date');
  /** Newest dates first (most recent at top of the grid). */
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [gridPage, setGridPage] = useState(1);

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/workouts/planned-action-templates', {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (res.ok) setTemplates(data.templates || []);
  }, []);

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ planType, sortBy, sortDir });
      if (filterFrom) q.set('dateFrom', filterFrom);
      if (filterTo) q.set('dateTo', filterTo);
      if (filterTemplateId) q.set('templateId', filterTemplateId);
      const res = await fetch(`/api/workouts/day-planned-actions?${q}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) setActions(data.actions || []);
    } finally {
      setLoading(false);
    }
  }, [planType, filterFrom, filterTo, filterTemplateId, sortBy, sortDir]);

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
    loadActions();
  }, [isOpen, loadTemplates, loadActions]);

  useEffect(() => {
    setGridPage(1);
  }, [filterFrom, filterTo, filterTemplateId, sortBy, sortDir, actions.length]);

  const totalGridPages = Math.max(1, Math.ceil(actions.length / GRID_PAGE_SIZE));

  useEffect(() => {
    if (gridPage > totalGridPages) setGridPage(totalGridPages);
  }, [gridPage, totalGridPages]);

  const pagedActions = useMemo(() => {
    const start = (gridPage - 1) * GRID_PAGE_SIZE;
    return actions.slice(start, start + GRID_PAGE_SIZE);
  }, [actions, gridPage]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setShortTitle('');
    setStartTime('');
    setUrl('');
    setTextColor('#111827');
    setBgColor('#f1f5f9');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !templateId) {
      alert('Choose a date and an action type.');
      return;
    }
    const workoutDayId = findDayIdInPlan(workoutPlan, dateStr, activeSection);
    if (!workoutDayId) {
      alert('No plan day found for that date in this section. Check your yearly/done plan.');
      return;
    }

    const body = {
      workoutDayId,
      templateId,
      description: withActionMetaTags(description, startTime, shortTitle),
      textColor,
      backgroundColor: bgColor,
      url: url.trim() || null,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/workouts/day-planned-actions/${editingId}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Update failed');
          return;
        }
      } else {
        const res = await fetch('/api/workouts/day-planned-actions', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Create failed');
          return;
        }
      }
      resetForm();
      await loadActions();
      await onSaved();
    } catch {
      alert('Request failed');
    }
  };

  const startEdit = (row: ActionRow) => {
    setShowAddPanel(true);
    setEditingId(row.id);
    setTemplateId(row.templateId || '');
    setDescription(stripActionMetaTags(row.description || ''));
    setShortTitle(extractActionShortTitle(row.description || ''));
    setStartTime(extractActionStartTime(row.description || ''));
    setTextColor(row.textColor || '#111827');
    setBgColor(row.backgroundColor || '#f1f5f9');
    setUrl(row.url || '');
    const d = new Date(row.workoutDay.date);
    setDateStr(d.toISOString().slice(0, 10));
  };

  const deleteOne = async (id: string) => {
    if (!confirm('Delete this planned action?')) return;
    const res = await fetch(`/api/workouts/day-planned-actions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadActions();
      await onSaved();
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected action(s)?`)) return;
    const res = await fetch('/api/workouts/day-planned-actions/bulk-delete', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    if (res.ok) {
      setSelected(new Set());
      await loadActions();
      await onSaved();
    }
  };

  const moveToDate = async (row: ActionRow) => {
    const next = prompt('Move to date (YYYY-MM-DD):');
    if (!next) return;
    const workoutDayId = findDayIdInPlan(workoutPlan, next, activeSection);
    if (!workoutDayId) {
      alert('No day on that date in this plan.');
      return;
    }
    const res = await fetch(`/api/workouts/day-planned-actions/${row.id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutDayId }),
    });
    if (res.ok) {
      await loadActions();
      await onSaved();
    } else {
      const err = await res.json();
      alert(err.error || 'Move failed');
    }
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const timelineGroups = useMemo(() => {
    const m = new Map<string, ActionRow[]>();
    for (const a of actions) {
      const key = new Date(a.workoutDay.date).toISOString().slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    }
    return Array.from(m.entries()).sort(([a], [b]) =>
      sortDir === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [actions, sortDir]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Action settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddPanel((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
              title={showAddPanel ? 'Hide Add section' : 'Show Add section'}
            >
              {showAddPanel ? (
                <>
                  <ChevronUp className="w-4 h-4 shrink-0" />
                  Hide Add section
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                  Show Add section
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {showAddPanel && (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-gray-200 p-4 space-y-3 bg-slate-50/80"
            >
            <h3 className="font-semibold text-gray-800">
              {editingId ? 'Edit planned action' : 'Add planned action'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Action
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  required
                >
                  <option value="">Select…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  URL (optional)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={shortTitle}
                  onChange={(e) => setShortTitle(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Short title"
                  maxLength={80}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description (this occurrence)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Text color
                  </label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-9 w-14 border rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Background
                  </label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-9 w-14 border rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start time
                  </label>
                  <div className="flex items-center gap-1">
                    <Clock3 className="w-4 h-4 text-gray-500" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-9 border rounded px-2 text-sm"
                      step={60}
                    />
                  </div>
                </div>
              </div>
            </div>
            {selectedTemplate && (
              <div className="flex items-center gap-3 text-sm text-gray-700 border border-dashed border-gray-300 rounded p-2">
                <span
                  className="text-2xl"
                  title={selectedTemplate.name}
                >
                  {selectedTemplate.icon}
                </span>
                <span
                  className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                  style={{ backgroundColor: selectedTemplate.color }}
                />
                <span className="font-medium">{selectedTemplate.name}</span>
                {shortTitle.trim() && (
                  <span
                    className="px-2 py-0.5 rounded border text-xs font-medium"
                    style={{
                      backgroundColor: bgColor || '#f1f5f9',
                      color: textColor || '#111827',
                      borderColor: selectedTemplate.color || '#cbd5e1',
                    }}
                  >
                    {shortTitle.trim()}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {editingId ? 'Save changes' : 'Insert'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
                >
                  Cancel edit
                </button>
              )}
            </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                  view === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView('timeline')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 border-l border-gray-300 ${
                  view === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Timeline
              </button>
            </div>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg disabled:opacity-40"
            >
              Delete selected ({selected.size})
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-end border border-gray-100 rounded-lg p-3 bg-gray-50">
            <div>
              <label className="block text-xs text-gray-600">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Action type</label>
              <select
                value={filterTemplateId}
                onChange={(e) => setFilterTemplateId(e.target.value)}
                className="border rounded px-2 py-1 text-sm min-w-[140px]"
              >
                <option value="">All</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Sort</label>
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [a, b] = e.target.value.split('-') as [
                    'date' | 'action',
                    'asc' | 'desc',
                  ];
                  setSortBy(a);
                  setSortDir(b);
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="date-desc">Date ↓ (newest first)</option>
                <option value="date-asc">Date ↑ (oldest first)</option>
                <option value="action-asc">Action A–Z</option>
                <option value="action-desc">Action Z–A</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => loadActions()}
              className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg"
            >
              Apply filters
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading…</div>
          ) : view === 'grid' ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2 w-10" />
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Icon</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedActions.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSel(row.id)}
                        />
                      </td>
                      <td className="p-2">
                        <span
                          className="inline-block w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: row.colorSnapshot }}
                        />
                      </td>
                      <td className="p-2 text-lg">{row.iconSnapshot || '•'}</td>
                      <td className="p-2">
                        <span
                          className="font-medium cursor-help border-b border-dotted border-gray-400"
                          title={stripActionMetaTags(row.description || '')}
                        >
                          {row.nameSnapshot}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {formatDay(row.workoutDay.date)}
                        {extractActionStartTime(row.description || '') && (
                          <span className="ml-2 text-xs text-gray-500">
                            {extractActionStartTime(row.description || '')}
                          </span>
                        )}
                      </td>
                      <td className="p-2 max-w-[320px]">
                        <span
                          className="block truncate text-gray-700"
                          title={stripActionTimeTag(row.description || '')}
                        >
                          {stripActionMetaTags(row.description || '') || '—'}
                        </span>
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveToDate(row)}
                          className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                          title="Move date"
                        >
                          <ArrowRightLeft className="w-4 h-4 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteOne(row.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {actions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No planned actions in this range.
                </div>
              )}
              <ActionsPageSelector
                page={gridPage}
                totalPages={totalGridPages}
                onPageChange={setGridPage}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {timelineGroups.map(([dayKey, rows]) => (
                <div key={dayKey}>
                  <div className="text-sm font-semibold text-gray-700 border-b pb-1 mb-2">
                    {formatDay(dayKey)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-lg border-2 px-3 py-2 text-sm max-w-xs"
                        style={{
                          backgroundColor: row.backgroundColor || '#f8fafc',
                          color: row.textColor || '#111827',
                          borderColor: row.colorSnapshot || '#cbd5e1',
                        }}
                        title={stripActionMetaTags(row.description || '') || row.nameSnapshot}
                      >
                        <span className="mr-1">{row.iconSnapshot}</span>
                        <span className="font-medium">{row.nameSnapshot}</span>
                        {extractActionShortTitle(row.description || '') && (
                          <span
                            className="ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium border"
                            style={{
                              backgroundColor: row.backgroundColor || '#f8fafc',
                              color: row.textColor || '#111827',
                              borderColor: row.colorSnapshot || '#cbd5e1',
                            }}
                          >
                            {extractActionShortTitle(row.description || '')}
                          </span>
                        )}
                        {extractActionStartTime(row.description || '') && (
                          <div className="text-xs mt-1 opacity-80">
                            {extractActionStartTime(row.description || '')}
                          </div>
                        )}
                        {row.url && (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs underline mt-1 truncate"
                          >
                            {row.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {timelineGroups.length === 0 && (
                <div className="text-center text-gray-500 py-8">No actions.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

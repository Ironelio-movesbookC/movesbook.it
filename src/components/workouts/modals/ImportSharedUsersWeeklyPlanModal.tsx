'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  Search,
  Star,
  Copy,
  Eye,
  SlidersHorizontal,
  LayoutList,
  FolderTree,
  Users,
} from 'lucide-react';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';
import { getSportFastPlanningCategory } from '@/constants/moveframe.constants';
import {
  ARCHIVE_DISPLAY_LANGUAGES,
  type WorkoutArchiveGridRecord,
} from '@/types/workoutArchiveGrid';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

type WorkoutCategory = 'all' | 'aerobic' | 'non_aerobic' | 'weight';
type ViewMode = 'tree' | 'table';

interface ImportSharedUsersWeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
}

function formatSavedFrom(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatLastUsedRelative(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return diffDays + ' days ago';
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : weeks + ' weeks ago';
  }
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months === 1 ? '1 month ago' : months + ' months ago';
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : years + ' years ago';
}

function parseTags(tags?: string | null): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function matchesCategory(record: WorkoutArchiveGridRecord, category: WorkoutCategory): boolean {
  if (category === 'all') return true;
  const sport = record.mainSport;
  if (!sport) return true;
  const c = getSportFastPlanningCategory(sport);
  if (category === 'aerobic') return c === 'A';
  if (category === 'weight') return c === 'B';
  if (category === 'non_aerobic') return c === 'C';
  return true;
}

function sharedByLabel(record: WorkoutArchiveGridRecord): string {
  const flag = record.authorCountryFlag ?? '';
  const user = record.sharedByUsername ?? record.authorFullName ?? 'User';
  return flag ? flag + ' ' + user : user;
}

function AuthorAvatar({ record }: { record: WorkoutArchiveGridRecord }) {
  if (record.authorAvatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={record.authorAvatarUrl}
        alt=""
        className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
      <Users className="w-4 h-4 text-gray-500" />
    </div>
  );
}

export default function ImportSharedUsersWeeklyPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportSharedUsersWeeklyPlanModalProps) {
  const [records, setRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [category, setCategory] = useState<WorkoutCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const sortedYearlyWeeks = useMemo(
    () => [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [yearlyWeeks]
  );

  const anchorIndex = useMemo(
    () => sortedYearlyWeeks.findIndex((w) => w.weekNumber === anchorWeek.weekNumber),
    [sortedYearlyWeeks, anchorWeek.weekNumber]
  );

  const maxConsecutiveWeeks = Math.max(0, sortedYearlyWeeks.length - anchorIndex - 1);

  const targetWeeks = useMemo(() => {
    if (anchorIndex === -1 || consecutiveCount < 1) return [];
    return sortedYearlyWeeks.slice(anchorIndex + 1, anchorIndex + 1 + consecutiveCount);
  }, [sortedYearlyWeeks, anchorIndex, consecutiveCount]);

  const anyTargetHasContent = useMemo(
    () => targetWeeks.some((w) => !isWeekEmpty(w)),
    [targetWeeks]
  );

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRecords([]);
        return;
      }
      const params = new URLSearchParams();
      if (language !== 'all') params.set('language', language);

      const res = await fetch(
        '/api/workouts/shared-weekly-plans?' + params.toString(),
        {
          headers: { Authorization: 'Bearer ' + token },
        }
      );
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!isOpen) return;
    setViewMode('tree');
    setCategory('all');
    setFilterTag('all');
    setLanguage('all');
    setSortBy('recent');
    setShowFilters(false);
    setSelectedId(null);
    setConsecutiveCount(1);
    setConfirmOverwrite(false);
    void loadRecords();
  }, [isOpen, loadRecords]);

  const allTags = useMemo(() => {
    return Array.from(new Set(records.flatMap((r) => parseTags(r.tags)))).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        if (!matchesCategory(record, category)) return false;
        const q = searchQuery.trim().toLowerCase();
        const tagList = parseTags(record.tags);
        const matchesSearch =
          !q ||
          record.title.toLowerCase().includes(q) ||
          (record.shortDescription ?? '').toLowerCase().includes(q) ||
          (record.sharedByUsername ?? '').toLowerCase().includes(q) ||
          sportLabel(record.mainSport).toLowerCase().includes(q);
        const matchesTag = filterTag === 'all' || tagList.includes(filterTag);
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.title.localeCompare(b.title);
        return (
          new Date(b.sharedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.sharedAt ?? a.createdAt ?? 0).getTime()
        );
      });
  }, [records, category, searchQuery, filterTag, sortBy]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const selectPlan = (recordId: string) => {
    setSelectedId((prev) => (prev === recordId ? null : recordId));
    setConfirmOverwrite(false);
  };

  const handleCopy = async () => {
    if (!selectedRecord || targetWeeks.length === 0) return;
    if (anyTargetHasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        anchorWeekNumber: anchorWeek.weekNumber,
        overwrite: anyTargetHasContent,
        source: {
          type: 'general_archive',
          source: { kind: 'global', entryId: selectedRecord.id },
          targetWeekIds: targetWeeks.map((w) => w.id),
        },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const formatWeekTargetMeta = (week: any) => {
    const date = week?.days?.[0]?.date
      ? new Date(week.days[0].date).toLocaleDateString(undefined, {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        })
      : 'N/A';
    return date;
  };

  const renderConsecutiveConfig = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Consecutive Weeks
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={1}
            max={Math.max(1, maxConsecutiveWeeks)}
            value={consecutiveCount}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setConsecutiveCount(
                Math.min(Math.max(1, val), Math.max(1, maxConsecutiveWeeks))
              );
              setConfirmOverwrite(false);
            }}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={isImporting}
          />
          <p className="text-sm text-gray-700 flex-1">
            Copy to the next{' '}
            <span className="font-semibold text-violet-600">{consecutiveCount}</span> week(s) after
            Week {anchorWeek.weekNumber}. Maximum: {maxConsecutiveWeeks} week(s) available.
          </p>
        </div>
      </div>

      {targetWeeks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Preview of target weeks:</p>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            {targetWeeks.map((week, idx) => (
              <div
                key={week.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 last:border-b-0 bg-violet-50"
              >
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-gray-900 text-sm">Week {week.weekNumber}</span>
                <span className="text-xs text-gray-500">{formatWeekTargetMeta(week)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
        <strong>Note:</strong> This will copy all workouts, moveframes, and movelaps from the shared
        week to {consecutiveCount} target week(s). Day-specific info (date, notes) will remain
        unchanged in the target weeks.
      </div>
    </div>
  );

  const renderCard = (record: WorkoutArchiveGridRecord) => {
    const selected = selectedId === record.id;
    const lastUsed = record.sharedAt ?? record.createdAt;
    return (
      <div
        key={record.id}
        className={
          'bg-white rounded-xl border-2 p-5 transition shadow-sm ' +
          (selected
            ? 'border-violet-500 ring-2 ring-violet-200'
            : 'border-gray-200 hover:border-violet-300')
        }
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AuthorAvatar record={record} />
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
            <h3 className="font-bold text-gray-900 truncate">{record.title}</h3>
          </div>
        </div>

        <div className="space-y-1.5 mb-4 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Shared by:</span>
            <span className="font-semibold text-gray-900 truncate">{sharedByLabel(record)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Saved from:</span>
            <span className="font-semibold text-gray-900">{formatSavedFrom(record.sharedAt ?? record.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Week starts:</span>
            <span className="font-semibold text-gray-900">Monday</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Workouts:</span>
            <span className="font-semibold text-gray-900">{record.workoutCount ?? 0}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Last used:</span>
            <span className="font-semibold text-gray-900">{formatLastUsedRelative(lastUsed)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => selectPlan(record.id)}
            className={
              'flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition ' +
              (selected ? 'bg-violet-700 text-white' : 'bg-violet-600 text-white hover:bg-violet-700')
            }
          >
            {selected ? 'Selected' : 'Use Plan'}
          </button>
          <button
            type="button"
            onClick={() => alert('Preview for shared user plans is not available yet.')}
            className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            title="Preview week"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              alert(
                'To save a copy, import this plan into your Yearly Plan, then export to your Archive.'
              )
            }
            className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            title="Save reference"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {selected && (
          <div className="mt-4 pt-4 border-t border-gray-200">{renderConsecutiveConfig()}</div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-violet-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a weekly plan</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full"
              disabled={isImporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-violet-600 hover:text-violet-800 underline"
            >
              ← Import mode
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 py-2 px-4 bg-white border border-gray-200 rounded-xl">
                <Users className="w-8 h-8 text-violet-600 shrink-0" />
                <span className="font-semibold text-gray-900">
                  Import from <span className="text-violet-700">Weekly plans shared by users</span>
                </span>
              </div>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium ' +
                    (viewMode === 'tree'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50')
                  }
                >
                  <FolderTree className="w-4 h-4" />
                  Tree
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-300 ' +
                    (viewMode === 'table'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50')
                  }
                >
                  <LayoutList className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-900">
              Plans listed here are weekly plans that other users exported to their{' '}
              <strong>General Archive of Workouts</strong> and tagged as{' '}
              <strong>shareable</strong>. To share your own plan, copy a week to your Archive and
              publish it with the <strong>shareable</strong> tag.
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['aerobic', 'Aerobic workouts'],
                  ['non_aerobic', 'Non-aerobic workouts'],
                  ['weight', 'Weight trainings'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory((c) => (c === key ? 'all' : key))}
                  className={
                    'px-4 py-2 rounded-lg text-sm font-semibold transition ' +
                    (category === key
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-600 text-white hover:bg-gray-700')
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="recent">Recently Used</option>
                <option value="name">Name</option>
              </select>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Language</option>
                {ARCHIVE_DISPLAY_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ' +
                  (showFilters
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-600 text-white hover:bg-gray-700')
                }
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {showFilters && (
              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Only weekly plans tagged <strong>shareable</strong> in a user&apos;s Archive appear
                here. Filter by sport category, language, tags, or search by title / username.
              </p>
            )}

            {viewMode === 'table' && (
              <div className="grid grid-cols-7 gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <span>Sport</span>
                <span>Goal</span>
                <span>Level</span>
                <span>Period</span>
                <span>Duration</span>
                <span>Shared by</span>
                <span>Date creation</span>
              </div>
            )}

            {loading ? (
              <p className="text-center py-10 text-gray-500 text-sm">Loading shared plans…</p>
            ) : filteredRecords.length === 0 ? (
              <p className="text-center py-10 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                No shareable weekly plans from other users yet. Users must export a week to their
                General Archive and tag it as <strong>shareable</strong>.
              </p>
            ) : viewMode === 'tree' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecords.map(renderCard)}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record) => {
                  const selected = selectedId === record.id;
                  return (
                    <div key={record.id} className="space-y-2">
                      <div
                        className={
                          'grid grid-cols-7 gap-2 items-center px-3 py-3 border rounded-lg text-sm ' +
                          (selected
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-300')
                        }
                      >
                        <span className="truncate">{sportLabel(record.mainSport)}</span>
                        <span className="truncate">{record.mainGoal ?? '—'}</span>
                        <span className="truncate">{record.trainingLevel ?? '—'}</span>
                        <span className="truncate">{record.period ?? '—'}</span>
                        <span className="truncate">
                          {formatArchiveDuration(record.totalTimeSeconds ?? 0)}
                        </span>
                        <span className="truncate text-xs">{sharedByLabel(record)}</span>
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="truncate text-xs text-gray-600">
                            {formatSavedFrom(record.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={() => selectPlan(record.id)}
                            className={
                              'shrink-0 px-2 py-1 text-xs font-semibold rounded ' +
                              (selected
                                ? 'bg-violet-700 text-white'
                                : 'bg-violet-600 text-white hover:bg-violet-700')
                            }
                          >
                            {selected ? 'Selected' : 'Use'}
                          </button>
                        </div>
                      </div>
                      {selected && (
                        <div className="border border-violet-200 rounded-lg p-4 bg-white space-y-3">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {record.title}
                          </p>
                          {renderConsecutiveConfig()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedRecord && anyTargetHasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Target week(s) in your Yearly Plan already contain workouts. Confirm to replace
                  them with the shared plan.
                </span>
              </label>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-500">
              {selectedRecord && targetWeeks.length > 0
                ? targetWeeks.length + ' week(s) selected'
                : 'No weeks selected'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={
                  isImporting ||
                  !selectedRecord ||
                  targetWeeks.length === 0 ||
                  (anyTargetHasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting
                  ? 'Copying...'
                  : 'Copy to ' + (selectedRecord ? targetWeeks.length : 0) + ' Week(s)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

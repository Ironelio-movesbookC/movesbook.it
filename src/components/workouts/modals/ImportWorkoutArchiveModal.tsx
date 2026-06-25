'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  Search,
  Star,
  Eye,
  Calendar,
  SlidersHorizontal,
  LayoutList,
  FolderTree,
  Archive,
} from 'lucide-react';
import { isSeriesBasedSport } from '@/constants/moveframe.constants';
import { getSportFastPlanningCategory } from '@/constants/moveframe.constants';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mapPersonalArchiveToGridRecords, getSportDisplayName } from '@/lib/personalArchiveGridMapper';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';
import { getSportIcon } from '@/utils/sportIcons';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import type { ImportWorkoutPayload } from './ImportWorkoutModal';

type WorkoutCategory = 'all' | 'aerobic' | 'non_aerobic' | 'weight';
type ViewMode = 'tree' | 'table';

interface ImportWorkoutArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  activeSection: 'A' | 'B' | 'C' | 'D';
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseTags(tags?: string | null): string[] {
  if (!tags?.trim()) return [];
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
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

function getMoveframesFromRecord(record: WorkoutArchiveGridRecord | null): any[] {
  if (!record) return [];
  if (record.archiveSource === 'global') {
    const entry = record._raw as { payloadData?: string } | undefined;
    if (entry?.payloadData) {
      try {
        const p = JSON.parse(entry.payloadData) as { moveframes?: unknown[] };
        return Array.isArray(p.moveframes) ? p.moveframes : [];
      } catch {
        return [];
      }
    }
    return [];
  }
  const raw = record._raw as { workout?: { moveframes?: unknown[] }; moveframes?: unknown[] } | undefined;
  if (raw?.workout?.moveframes) return raw.workout.moveframes as any[];
  if (Array.isArray(raw?.moveframes)) return raw.moveframes as any[];
  return [];
}

function moveframeDescription(mf: any): string {
  const raw = mf.manualMode ? mf.notes || mf.description || '' : mf.description || '';
  return stripHtml(raw) || '—';
}

function moveframeDuration(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions ? `${mf.repetitions} series` : '—';
    const count = mf.movelaps?.length ?? 0;
    return count ? `${count} series` : '—';
  }
  let dist = 0;
  for (const lap of mf.movelaps ?? []) {
    dist += parseInt(lap.distance, 10) || 0;
  }
  return dist ? `${dist}m` : '—';
}

function moveframeRipSets(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions != null ? String(mf.repetitions) : '—';
    let reps = 0;
    for (const lap of mf.movelaps ?? []) {
      reps += parseInt(lap.reps, 10) || 0;
    }
    if (reps) return String(reps);
    const laps = mf.movelaps?.length ?? 0;
    return laps ? String(laps) : '—';
  }
  const laps = mf.movelaps?.length ?? 0;
  return laps ? String(laps) : '—';
}

function intensityClass(intensity?: string | null): string {
  switch (intensity?.toLowerCase()) {
    case 'low':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'very high':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatCreated(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

export default function ImportWorkoutArchiveModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  onConfirm,
}: ImportWorkoutArchiveModalProps) {
  const [records, setRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [category, setCategory] = useState<WorkoutCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'session' | 'global_archive' | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const hasContent = (targetWorkout.moveframes?.length ?? 0) > 0;

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRecords([]);
        return;
      }

      const archiveWeeks = await fetchPlanWeeks(token, 'ARCHIVE');
      const personal = mapPersonalArchiveToGridRecords({ weeks: archiveWeeks }).filter(
        (r) => r.recordType === 'WORKOUT'
      );

      let global: WorkoutArchiveGridRecord[] = [];
      const globalRes = await fetch('/api/workouts/global-archive?recordType=WORKOUT', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (globalRes.ok) {
        const data = await globalRes.json();
        global = (data.records ?? []).map((r: WorkoutArchiveGridRecord) => ({
          ...r,
          archiveSource: 'global' as const,
        }));
      }

      setRecords([...personal, ...global]);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setViewMode('tree');
    setCategory('all');
    setSearchQuery('');
    setFilterTag('all');
    setSortBy('recent');
    setShowFilters(false);
    setSelectedRecordId(null);
    setSelectedSource(null);
    setConfirmOverwrite(false);
    void loadRecords();
  }, [isOpen, loadRecords]);

  const allTags = useMemo(
    () => Array.from(new Set(records.flatMap((r) => parseTags(r.tags)))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    return records
      .filter((record) => {
        if (!matchesCategory(record, category)) return false;
        const q = searchQuery.trim().toLowerCase();
        const tagList = parseTags(record.tags);
        const matchesSearch =
          !q ||
          [record.title, record.code ?? '', record.mainSport ?? '', record.mainGoal ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q) ||
          tagList.some((t) => t.toLowerCase().includes(q));
        const matchesTag = filterTag === 'all' || tagList.includes(filterTag);
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.title.localeCompare(b.title);
        const da = new Date(a.sharedAt ?? a.createdAt ?? 0).getTime();
        const db = new Date(b.sharedAt ?? b.createdAt ?? 0).getTime();
        return db - da;
      });
  }, [records, category, searchQuery, filterTag, sortBy]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  const previewMoveframes = useMemo(() => {
    const mfs = getMoveframesFromRecord(selectedRecord);
    return [...mfs].sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        String(a.letter ?? '').localeCompare(String(b.letter ?? ''))
    );
  }, [selectedRecord]);

  const selectRecord = (record: WorkoutArchiveGridRecord) => {
    setSelectedRecordId(record.id);
    if (record.archiveSource === 'global') {
      setSelectedSource('global_archive');
    } else {
      setSelectedSource('session');
    }
    setConfirmOverwrite(false);
  };

  const resolveImportIds = (): { id: string; source: 'session' | 'global_archive' } | null => {
    if (!selectedRecord || !selectedSource) return null;
    if (selectedSource === 'global_archive') {
      return { id: selectedRecord.id, source: 'global_archive' };
    }
    return { id: selectedRecord.id, source: 'session' };
  };

  const handleImport = async () => {
    const resolved = resolveImportIds();
    if (!resolved) return;
    if (hasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        targetDayId: targetDay.id,
        sessionNumber: targetWorkout.sessionNumber,
        overwrite: hasContent,
        source:
          resolved.source === 'global_archive'
            ? { type: 'global_archive', globalEntryId: resolved.id }
            : { type: 'session', sourceWorkoutId: resolved.id },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const renderMoveframesPanel = () => {
    if (!selectedRecord) return null;
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-violet-900">Moveframes</span>
          <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
            {previewMoveframes.length} total
          </span>
        </div>
        {previewMoveframes.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">No moveframes in this archive entry.</p>
        ) : (
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full border-collapse text-xs min-w-[520px]">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-6">#</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 w-10">MF</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                    Section
                  </th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                    Sport
                  </th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                    Description
                  </th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                    Dur
                  </th>
                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                    Rip\sets
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewMoveframes.map((mf: any, mfIdx: number) => (
                  <tr key={mf.id ?? mfIdx} className="bg-white/70">
                    <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                      {mfIdx + 1}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                      {mf.letter || mf.code || '—'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      {mf.section?.name ?? '—'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <span className="inline-flex items-center gap-1">
                        {mf.sport ? (
                          <span className="text-sm">{getSportIcon(mf.sport, 'emoji')}</span>
                        ) : null}
                        {mf.sport?.replace(/_/g, ' ') ?? '—'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1 max-w-[140px] truncate">
                      {moveframeDescription(mf)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {moveframeDuration(mf)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-red-700 font-semibold">
                      {moveframeRipSets(mf)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderCard = (record: WorkoutArchiveGridRecord) => {
    const selected = selectedRecordId === record.id;
    const mfCount = getMoveframesFromRecord(record).length;
    const duration =
      record.totalTimeSeconds && record.totalTimeSeconds > 0
        ? formatArchiveDuration(record.totalTimeSeconds)
        : record.totalMeters
          ? `${record.totalMeters}m`
          : record.totalSeries
            ? `${record.totalSeries} series`
            : '—';

    return (
      <div
        key={record.id}
        onClick={() => selectRecord(record)}
        className={
          'rounded-xl border-2 p-5 transition shadow-sm cursor-pointer ' +
          (selected
            ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300'
            : 'border-gray-200 bg-white hover:border-blue-300')
        }
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
            <h3 className="font-bold text-gray-900 truncate">{record.title}</h3>
          </div>
        </div>

        {record.code ? (
          <div className="mb-3">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-sm">
              {record.code}
            </span>
          </div>
        ) : null}

        <div className="space-y-1.5 mb-4 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Moveframes:</span>
            <span className="font-semibold text-gray-900">{mfCount}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-gray-500">Sports:</span>
            <span className="font-semibold text-gray-900">—</span>
          </div>
          {record.mainSport ? (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Main Sport:</span>
              <span className="font-semibold text-gray-900">
                {getSportIcon(record.mainSport, 'emoji')}{' '}
                {getSportDisplayName(record.mainSport)}
              </span>
            </div>
          ) : null}
          {record.mainGoal ? (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Goal:</span>
              <span className="font-semibold text-gray-900 truncate">{record.mainGoal}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-2 items-center">
            <span className="text-gray-500">Intensity:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${intensityClass(record.trainingLevel)}`}
            >
              {record.trainingLevel ?? 'Medium'}
            </span>
          </div>
        </div>

        {parseTags(record.tags).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {parseTags(record.tags).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => selectRecord(record)}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              selected ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {selected ? 'Selected' : 'Use in my planner'}
          </button>
          <button
            type="button"
            onClick={() => selectRecord(record)}
            className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            title="Preview moveframes"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {viewMode === 'table' && (
          <p className="text-[10px] text-gray-500 mt-2 truncate">
            {sportLabel(record.mainSport)} · {record.period ?? '—'} · {duration} ·{' '}
            {formatCreated(record.createdAt)}
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-blue-600 underline">
              ← Import mode
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 py-2 px-4 bg-white border border-gray-200 rounded-xl mx-auto sm:mx-0">
                <Archive className="w-8 h-8 text-blue-600 shrink-0" />
                <span className="font-semibold text-gray-900">Import from General Archive</span>
              </div>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('tree')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
                    viewMode === 'tree'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  Tree
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-300 ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  Table
                </button>
              </div>
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
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    category === key
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Sort by
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="recent">Recently Used</option>
                  <option value="name">Name</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                  showFilters ? 'bg-gray-700 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {showFilters && (
              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Workouts from your personal archive and the shared Movesbook catalog. Filter by sport
                category, search, or tags.
              </p>
            )}

            {viewMode === 'table' && (
              <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <span>Sport</span>
                <span>Goal</span>
                <span>Level</span>
                <span>Period</span>
                <span>Duration</span>
                <span>Date creation</span>
              </div>
            )}

            {loading ? (
              <p className="text-center py-10 text-gray-500 text-sm">Loading archive…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                No workouts found in your General Archive.
              </p>
            ) : viewMode === 'table' ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[36vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {filtered.map((record) => {
                      const selected = selectedRecordId === record.id;
                      return (
                        <tr
                          key={record.id}
                          onClick={() => selectRecord(record)}
                          className={
                            'cursor-pointer border-b border-gray-100 last:border-b-0 ' +
                            (selected ? 'bg-yellow-100' : 'hover:bg-gray-50')
                          }
                        >
                          <td className="px-3 py-2">{sportLabel(record.mainSport)}</td>
                          <td className="px-3 py-2">{record.mainGoal ?? '—'}</td>
                          <td className="px-3 py-2">{record.trainingLevel ?? '—'}</td>
                          <td className="px-3 py-2">{record.period ?? '—'}</td>
                          <td className="px-3 py-2">
                            {record.totalTimeSeconds && record.totalTimeSeconds > 0
                              ? formatArchiveDuration(record.totalTimeSeconds)
                              : record.totalMeters
                                ? `${record.totalMeters}m`
                                : record.totalSeries
                                  ? `${record.totalSeries} series`
                                  : '—'}
                          </td>
                          <td className="px-3 py-2">{formatCreated(record.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[36vh] overflow-y-auto">
                {filtered.map(renderCard)}
              </div>
            )}

            {renderMoveframesPanel()}

            {selectedRecordId && hasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Replace existing moveframes in Workout #{targetWorkout.sessionNumber}.
                </span>
              </label>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-500 truncate">
              {selectedRecord ? `Selected: ${selectedRecord.title}` : 'No workout selected'}
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={
                  isImporting || !selectedRecordId || (hasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

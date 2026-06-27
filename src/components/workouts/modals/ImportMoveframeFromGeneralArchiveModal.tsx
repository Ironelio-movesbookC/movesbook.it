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
import { getSportDisplayName, getSportFastPlanningCategory } from '@/constants/moveframe.constants';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mapPersonalArchiveToGridRecords, getSportDisplayName as mapSportName } from '@/lib/personalArchiveGridMapper';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';
import { getSportIcon } from '@/utils/sportIcons';
import {
  getMoveframesFromArchiveRecord,
  moveframeDescription,
  moveframeDuration,
  moveframeRipSets,
} from '@/lib/importMoveframePreview';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import type { ImportMoveframePayload } from './ImportMoveframeModal';

type WorkoutCategory = 'all' | 'aerobic' | 'non_aerobic' | 'weight';
type ViewMode = 'tree' | 'table';

interface ImportMoveframeFromGeneralArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetWorkout: { id: string; sessionNumber: number };
  onConfirm: (payload: ImportMoveframePayload) => Promise<void>;
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

function moveframeKey(mf: any, index: number): string {
  if (typeof mf.id === 'string') return mf.id;
  return `idx:${index}:letter:${mf.letter ?? String.fromCharCode(65 + index)}`;
}

type MovelapRow = {
  repetitionNumber?: number;
  muscularSector?: string | null;
  exercise?: string | null;
  reps?: number | null;
  pause?: string | null;
  style?: string | null;
  distance?: number | null;
};

function movelapsForMoveframe(mf: any): MovelapRow[] {
  if (!mf?.movelaps || !Array.isArray(mf.movelaps)) return [];
  return mf.movelaps;
}

function sectionForMoveframe(mf: any) {
  return mf?.section ?? null;
}

function formatMovelapReps(ml: MovelapRow): string {
  if (ml.reps != null) return String(ml.reps);
  if (ml.distance != null) return String(ml.distance);
  return '—';
}

function formatExerciseLabel(ml: MovelapRow, index: number): string {
  const num = String(ml.repetitionNumber ?? index + 1).padStart(2, '0');
  const exercise = (ml.exercise || '').trim();
  const sector = (ml.muscularSector || ml.style || '').trim();
  if (exercise) return `#${num} ${exercise}`;
  if (sector) return `#${num} Exercise — ${sector}`;
  return `#${num} —`;
}

type ArchivePhase = 'browse' | 'confirm';

export default function ImportMoveframeFromGeneralArchiveModal({
  isOpen,
  onClose,
  onBack,
  targetWorkout,
  onConfirm,
}: ImportMoveframeFromGeneralArchiveModalProps) {
  const [records, setRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [category, setCategory] = useState<WorkoutCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedMoveframeKey, setSelectedMoveframeKey] = useState('');
  const [phase, setPhase] = useState<ArchivePhase>('browse');
  const [isImporting, setIsImporting] = useState(false);

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
        headers: { Authorization: `Bearer ${token}` },
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
    setViewMode('table');
    setCategory('all');
    setSearchQuery('');
    setFilterTag('all');
    setSortBy('recent');
    setShowFilters(false);
    setSelectedRecordId(null);
    setSelectedMoveframeKey('');
    setPhase('browse');
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
        const mfCount = getMoveframesFromArchiveRecord(record).length;
        if (mfCount === 0) return false;
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
    const mfs = getMoveframesFromArchiveRecord(selectedRecord);
    return [...mfs].sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        String(a.letter ?? '').localeCompare(String(b.letter ?? ''))
    );
  }, [selectedRecord]);

  useEffect(() => {
    if (!selectedRecordId || phase === 'confirm') return;
    const first = previewMoveframes[0];
    setSelectedMoveframeKey(first ? moveframeKey(first, 0) : '');
  }, [selectedRecordId, previewMoveframes, phase]);

  const selectedMoveframe = useMemo(() => {
    if (!selectedMoveframeKey || !previewMoveframes.length) return null;
    if (selectedMoveframeKey.startsWith('idx:')) {
      const match = selectedMoveframeKey.match(/^idx:(\d+)/);
      const idx = match ? parseInt(match[1], 10) : 0;
      return previewMoveframes[idx] ?? null;
    }
    return previewMoveframes.find((mf: any) => mf.id === selectedMoveframeKey) ?? null;
  }, [previewMoveframes, selectedMoveframeKey]);

  const selectRecord = (record: WorkoutArchiveGridRecord) => {
    setSelectedRecordId(record.id);
    setSelectedMoveframeKey('');
    if (phase === 'confirm') setPhase('browse');
  };

  const goToConfirmPhase = () => {
    if (!selectedRecord || !selectedMoveframe) return;
    setPhase('confirm');
  };

  const detailMovelaps = useMemo(
    () => (selectedMoveframe ? movelapsForMoveframe(selectedMoveframe) : []),
    [selectedMoveframe]
  );

  const handleImport = async () => {
    if (!selectedRecord || !selectedMoveframe) return;
    setIsImporting(true);
    try {
      if (selectedRecord.archiveSource === 'global') {
        const idx = previewMoveframes.indexOf(selectedMoveframe);
        await onConfirm({
          targetWorkoutId: targetWorkout.id,
          source: {
            type: 'global_archive',
            globalEntryId: selectedRecord.id,
            moveframeLetter: selectedMoveframe.letter,
            moveframeIndex: idx >= 0 ? idx : undefined,
          },
        });
      } else if (selectedMoveframe.id) {
        await onConfirm({
          targetWorkoutId: targetWorkout.id,
          source: { type: 'moveframe', sourceMoveframeId: selectedMoveframe.id },
        });
      } else {
        await onConfirm({
          targetWorkoutId: targetWorkout.id,
          source: { type: 'snapshot', moveframe: selectedMoveframe },
        });
      }
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const recordDuration = (record: WorkoutArchiveGridRecord) => {
    if (record.totalTimeSeconds && record.totalTimeSeconds > 0) {
      return formatArchiveDuration(record.totalTimeSeconds);
    }
    if (record.totalMeters) return `${record.totalMeters}m`;
    if (record.totalSeries) return `${record.totalSeries} series`;
    return '—';
  };

  const renderCard = (record: WorkoutArchiveGridRecord) => {
    const selected = selectedRecordId === record.id;
    const mfCount = getMoveframesFromArchiveRecord(record).length;

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
          {record.mainSport ? (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Main Sport:</span>
              <span className="font-semibold text-gray-900">
                {getSportIcon(record.mainSport, 'emoji')}{' '}
                {mapSportName(record.mainSport)}
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
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRecordId(record.id);
              const mfs = getMoveframesFromArchiveRecord(record);
              const first = mfs[0];
              if (first) {
                setSelectedMoveframeKey(moveframeKey(first, 0));
                setPhase('confirm');
              }
            }}
            className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            title="Preview moveframe detail"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderMoveframesPanel = (options?: { onRowDoubleClick?: () => void }) => {
    if (!selectedRecord) return null;
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-100 border-b border-violet-200">
          <span className="text-xs font-bold text-violet-900">Moveframes</span>
          <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
            {previewMoveframes.length} total
          </span>
          {phase === 'browse' && (
            <span className="text-xs text-violet-700 ml-auto">
              Select a moveframe, then Continue
            </span>
          )}
        </div>
        {previewMoveframes.length === 0 ? (
          <p className="text-xs text-gray-500 px-3 py-4">No moveframes in this archive entry.</p>
        ) : (
          <div className="overflow-x-auto max-h-52 overflow-y-auto">
            <table className="w-full border-collapse text-xs min-w-[640px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-6">⋮⋮</th>
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
                {previewMoveframes.map((mf: any, mfIdx: number) => {
                  const key = moveframeKey(mf, mfIdx);
                  const isMfSelected = selectedMoveframeKey === key;
                  return (
                    <tr
                      key={key}
                      onClick={() => setSelectedMoveframeKey(key)}
                      onDoubleClick={() => {
                        setSelectedMoveframeKey(key);
                        options?.onRowDoubleClick?.();
                      }}
                      className={
                        'cursor-pointer ' +
                        (isMfSelected
                          ? 'bg-yellow-100 ring-2 ring-inset ring-red-400'
                          : 'bg-white/70 hover:bg-violet-50')
                      }
                    >
                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-400">
                        ⋮⋮
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                        {mfIdx + 1}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                        {mf.letter || mf.code || String.fromCharCode(65 + mfIdx)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        {mf.section?.name ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: mf.section?.color || '#3b82f6' }}
                            />
                            {mf.section.name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <span className="inline-flex items-center gap-1">
                          {mf.sport ? (
                            <span className="text-sm">{getSportIcon(mf.sport, 'emoji')}</span>
                          ) : null}
                          {mf.sport ? getSportDisplayName(mf.sport) : '—'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-1 max-w-[180px] truncate">
                        {moveframeDescription(mf)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {moveframeDuration(mf)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-red-700 font-semibold">
                        {moveframeRipSets(mf)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedMoveframe) return null;
    const section = sectionForMoveframe(selectedMoveframe);
    const sport = selectedMoveframe.sport ?? selectedRecord?.mainSport;

    return (
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 border-b border-gray-200">
          Detail moveframe selected
        </div>
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-white sticky top-0 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Workout section</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Sport</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Muscular</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">
                  Exercise
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Reps</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Pause</th>
              </tr>
            </thead>
            <tbody>
              {detailMovelaps.length === 0 ? (
                <tr className="border-t">
                  <td className="px-3 py-2">
                    {section ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: section.color || '#3b82f6' }}
                        />
                        {section.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">{sport ? getSportDisplayName(sport) : '—'}</td>
                  <td className="px-3 py-2" colSpan={4}>
                    {moveframeDescription(selectedMoveframe)} (no movelap rows)
                  </td>
                </tr>
              ) : (
                detailMovelaps.map((ml, index) => {
                  const muscular = (ml.muscularSector || ml.style || '').trim();
                  return (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {section ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: section.color || '#3b82f6' }}
                            />
                            {section.name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {sport ? getSportDisplayName(sport) : '—'}
                      </td>
                      <td className="px-3 py-2 max-w-[120px]">
                        {muscular ? (
                          <span className="text-[10px] leading-tight text-gray-700 line-clamp-3">
                            {muscular}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">{formatExerciseLabel(ml, index)}</td>
                      <td className="px-3 py-2">{formatMovelapReps(ml)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{ml.pause || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderArchiveBadge = () => (
    <div className="flex items-center gap-3 py-2 px-4 bg-white border border-gray-200 rounded-xl">
      <Archive className="w-8 h-8 text-blue-600 shrink-0" />
      <span className="font-semibold text-gray-900">
        Import from <strong>General Archive</strong>
      </span>
    </div>
  );

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
              <h2 className="text-lg font-bold">Import a Moveframe</h2>
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
            {phase === 'browse' ? (
              <>
                <button type="button" onClick={onBack} className="text-sm text-blue-600 underline">
                  ← Import mode
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="mx-auto sm:mx-0">{renderArchiveBadge()}</div>
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
                      showFilters
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </button>
                </div>

                {showFilters && (
                  <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    Phase I: pick a workout, select a moveframe, then Continue to review details
                    before importing into Workout #{targetWorkout.sessionNumber}.
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
                    No workouts with moveframes found in your General Archive.
                  </p>
                ) : viewMode === 'table' ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[28vh] overflow-y-auto">
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
                              <td className="px-3 py-2 w-[16%]">{sportLabel(record.mainSport)}</td>
                              <td className="px-3 py-2 w-[16%]">{record.mainGoal ?? '—'}</td>
                              <td className="px-3 py-2 w-[16%]">{record.trainingLevel ?? '—'}</td>
                              <td className="px-3 py-2 w-[16%]">{record.period ?? '—'}</td>
                              <td className="px-3 py-2 w-[16%]">{recordDuration(record)}</td>
                              <td className="px-3 py-2 w-[16%]">{formatCreated(record.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[28vh] overflow-y-auto">
                    {filtered.map(renderCard)}
                  </div>
                )}

                {renderMoveframesPanel({ onRowDoubleClick: goToConfirmPhase })}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPhase('browse')}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Back
                </button>

                <div className="flex justify-center sm:justify-start">{renderArchiveBadge()}</div>

                {selectedRecord && (
                  <p className="text-sm text-gray-600">
                    Workout: <strong>{selectedRecord.title}</strong>
                    {selectedRecord.code ? (
                      <span className="ml-2 font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {selectedRecord.code}
                      </span>
                    ) : null}
                  </p>
                )}

                {renderMoveframesPanel()}
                {renderDetailPanel()}
              </>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-500 truncate">
              {phase === 'confirm' && selectedRecord && selectedMoveframe
                ? `Confirm import · ${selectedRecord.title} · MF ${selectedMoveframe.letter ?? '?'}`
                : selectedRecord && selectedMoveframe
                  ? `${selectedRecord.title} · MF ${selectedMoveframe.letter ?? '?'} — Continue to review`
                  : selectedRecord
                    ? `${selectedRecord.title} — select a moveframe`
                    : 'No workout selected'}
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                disabled={isImporting}
              >
                Cancel
              </button>
              {phase === 'browse' ? (
                <button
                  type="button"
                  onClick={goToConfirmPhase}
                  disabled={!selectedRecord || !selectedMoveframe}
                  className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={isImporting || !selectedRecord || !selectedMoveframe}
                  className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Archive,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Languages,
  LayoutList,
  Search,
  Square,
  User,
} from 'lucide-react';
import ExerciseBankSportIconFilter from '@/components/settings/ExerciseBankSportIconFilter';
import {
  ARCHIVE_DISPLAY_LANGUAGES,
  type WorkoutArchiveGridMode,
  type WorkoutArchiveGridRecord,
  type WorkoutArchiveRecordType,
} from '@/types/workoutArchiveGrid';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';

export type WorkoutArchivePrimaryTab =
  | 'WORKOUT_WEEKLY'
  | 'STRUCTURED'
  | 'COACH_PLANS';

export interface WorkoutArchiveGridShellProps {
  mode: WorkoutArchiveGridMode;
  title: string;
  subtitle?: string;
  records: WorkoutArchiveGridRecord[];
  loading?: boolean;
  /** Favourite sports for personal mode; global uses full exercise library grid */
  favoriteSports?: string[];
  recordTypeFilter: WorkoutArchiveRecordType | 'ALL';
  onRecordTypeFilterChange?: (t: WorkoutArchiveRecordType | 'ALL') => void;
  primaryTab?: WorkoutArchivePrimaryTab;
  onPrimaryTabChange?: (t: WorkoutArchivePrimaryTab) => void;
  selectedId: string | null;
  onSelectRecord: (record: WorkoutArchiveGridRecord | null) => void;
  renderRecordActions?: (record: WorkoutArchiveGridRecord) => React.ReactNode;
  headerExtra?: React.ReactNode;
  onToggleDisabled?: (record: WorkoutArchiveGridRecord, disabled: boolean) => void;
  onDeleteRecord?: (record: WorkoutArchiveGridRecord) => void;
}

const GRID_COLUMNS = [
  'Title',
  'Main sport',
  'Main goal',
  'Training level',
  'Period',
  'Tags',
] as const;

export default function WorkoutArchiveGridShell({
  mode,
  title,
  subtitle,
  records,
  loading = false,
  favoriteSports = [],
  recordTypeFilter,
  onRecordTypeFilterChange,
  primaryTab = 'WORKOUT_WEEKLY',
  onPrimaryTabChange,
  selectedId,
  onSelectRecord,
  renderRecordActions,
  headerExtra,
  onToggleDisabled,
  onDeleteRecord,
}: WorkoutArchiveGridShellProps) {
  const [sportFilter, setSportFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLanguage, setDisplayLanguage] = useState('en');
  const [showDisabled, setShowDisabled] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'label'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [detailTab, setDetailTab] = useState('short');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (recordTypeFilter !== 'ALL' && r.recordType !== recordTypeFilter) return false;
      if (!showDisabled && r.disabled) return false;
      if (favoritesOnly && !r.isFavorite) return false;
      if (sportFilter !== 'all' && r.mainSport !== sportFilter) return false;
      if (favoriteSports.length > 0 && sportFilter === 'all') {
        if (r.mainSport && !favoriteSports.includes(r.mainSport)) return false;
      }
      if (q) {
        const hay = `${r.title} ${r.tags ?? ''} ${r.shortDescription ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    records,
    recordTypeFilter,
    showDisabled,
    favoritesOnly,
    sportFilter,
    favoriteSports,
    searchQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showAuthorPanel = mode === 'global';

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Archive className="h-7 w-7 text-sky-700" />
              {title}
            </h2>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-gray-600">{subtitle}</p>}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <Languages className="h-4 w-4" /> DISPLAY LANGUAGE
            </span>
            <select
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm min-w-[9rem]"
            >
              {ARCHIVE_DISPLAY_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {headerExtra}
      </div>

      {/* Primary tabs (mockup) */}
      {onPrimaryTabChange && (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {(
            [
              ['WORKOUT_WEEKLY', 'Workouts & Weekly plans', Calendar],
              ['STRUCTURED', 'Structured programs', LayoutList],
              ['COACH_PLANS', 'Workout plans by coaches', User],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              disabled={key !== 'WORKOUT_WEEKLY'}
              onClick={() => onPrimaryTabChange(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                primaryTab === key
                  ? 'bg-sky-700 text-white'
                  : key === 'WORKOUT_WEEKLY'
                    ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Sport filters */}
      {mode === 'global' ? (
        <ExerciseBankSportIconFilter
          activeLibraryFilter={sportFilter}
          onLibraryFilterChange={setSportFilter}
        />
      ) : favoriteSports.length > 0 ? (
        <ExerciseBankSportIconFilter
          activeLibraryFilter={sportFilter}
          onLibraryFilterChange={setSportFilter}
        />
      ) : null}

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        {onRecordTypeFilterChange && (
          <label className="text-sm">
            <span className="font-medium text-gray-700">Type</span>
            <select
              value={recordTypeFilter}
              onChange={(e) =>
                onRecordTypeFilterChange(e.target.value as WorkoutArchiveRecordType | 'ALL')
              }
              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="ALL">All types</option>
              <option value="WORKOUT">Workouts</option>
              <option value="WEEKLY_PLAN">Weekly plans</option>
            </select>
          </label>
        )}
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, tags…"
            className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
          />
          Display disabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          Display favourites
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded px-2 py-1 text-xs font-semibold ${
              viewMode === 'grid' ? 'bg-sky-600 text-white' : 'bg-gray-100'
            }`}
          >
            <Grid3X3 className="inline h-3.5 w-3.5" /> Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('label')}
            className={`rounded px-2 py-1 text-xs font-semibold ${
              viewMode === 'label' ? 'bg-sky-600 text-white' : 'bg-gray-100'
            }`}
          >
            Label
          </button>
        </div>
      </div>

      {/* Main: grid + detail */}
      <div className="flex gap-4 min-h-[24rem]">
        <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-300 bg-white">
          {loading ? (
            <p className="p-8 text-center text-gray-500">Loading…</p>
          ) : pageRecords.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No records match your filters.</p>
          ) : viewMode === 'grid' ? (
            <table className="w-full text-sm">
              <thead className="bg-sky-800 text-white sticky top-0">
                <tr>
                  <th className="w-8 p-2" />
                  {GRID_COLUMNS.map((col) => (
                    <th key={col} className="p-2 text-left font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  {renderRecordActions && <th className="p-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => {
                  const isSelected = selectedId === record.id;
                  const isChecked = selectedIds.has(record.id);
                  return (
                    <tr
                      key={record.id}
                      onClick={() => onSelectRecord(record)}
                      className={`cursor-pointer border-b border-gray-100 hover:bg-sky-50 ${
                        isSelected ? 'bg-sky-100' : record.disabled ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => toggleSelect(record.id)}>
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-sky-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-2 font-medium max-w-[12rem] truncate">{record.title}</td>
                      <td className="p-2">{sportLabel(record.mainSport)}</td>
                      <td className="p-2 max-w-[8rem] truncate">{record.mainGoal || '—'}</td>
                      <td className="p-2">{record.trainingLevel || '—'}</td>
                      <td className="p-2 max-w-[8rem] truncate">{record.period || '—'}</td>
                      <td className="p-2 max-w-[10rem] truncate">{record.tags || '—'}</td>
                      {renderRecordActions && (
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          {renderRecordActions(record)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="divide-y">
              {pageRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onSelectRecord(record)}
                  className={`w-full px-4 py-3 text-left hover:bg-sky-50 ${
                    selectedId === record.id ? 'bg-sky-100' : ''
                  }`}
                >
                  <span className="font-semibold">{record.title}</span>
                  <span className="ml-2 text-xs text-gray-500">{sportLabel(record.mainSport)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span>
              Page {page}/{totalPages} · {filtered.length} record(s)
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Detail sidebar */}
        <aside className="w-72 shrink-0 rounded-lg border border-gray-300 bg-white flex flex-col overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b font-bold text-sm">Details</div>
          {!selectedRecord ? (
            <p className="p-4 text-sm text-gray-500">Select a record to view details.</p>
          ) : (
            <>
              <div className="flex gap-1 border-b text-[10px] font-semibold overflow-x-auto">
                {['short', 'info', 'overview'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`px-2 py-1.5 capitalize whitespace-nowrap ${
                      detailTab === tab ? 'bg-white border-b-2 border-sky-600 text-sky-800' : 'text-gray-600'
                    }`}
                  >
                    {tab === 'short' ? 'Short description' : tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {detailTab === 'short' && (
                  <>
                    <p className="font-semibold text-gray-900">{selectedRecord.title}</p>
                    {mode === 'global' && selectedRecord.shortDescription && (
                      <p className="text-gray-700">{selectedRecord.shortDescription}</p>
                    )}
                    {mode === 'global' && selectedRecord.originalLanguages && (
                      <p>
                        <span className="text-gray-500">Original languages: </span>
                        {selectedRecord.originalLanguages}
                      </p>
                    )}
                    {mode === 'global' && selectedRecord.expirationDate && (
                      <p>
                        <span className="text-gray-500">Expiration: </span>
                        {new Date(selectedRecord.expirationDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="rounded bg-gray-50 p-2 text-xs space-y-1">
                      <p>
                        Workouts: <strong>{selectedRecord.workoutCount ?? 1}</strong>
                      </p>
                      <p>
                        Total distance:{' '}
                        <strong>
                          {selectedRecord.totalMeters != null
                            ? `${selectedRecord.totalMeters} m`
                            : '—'}
                        </strong>
                      </p>
                      <p>
                        Total time:{' '}
                        <strong>
                          {formatArchiveDuration(selectedRecord.totalTimeSeconds ?? 0)}
                        </strong>
                      </p>
                      <p>
                        Total series: <strong>{selectedRecord.totalSeries ?? '—'}</strong>
                      </p>
                    </div>
                  </>
                )}

                {showAuthorPanel && (
                  <div className="rounded border border-gray-200 p-2 space-y-2">
                    <p className="text-xs font-bold uppercase text-gray-500">Author info</p>
                    <div className="flex items-center gap-2">
                      {selectedRecord.authorAvatarUrl ? (
                        <Image
                          src={selectedRecord.authorAvatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">
                          {selectedRecord.sharedByUsername ?? '—'}
                          {selectedRecord.authorCountryFlag && (
                            <span className="ml-1">{selectedRecord.authorCountryFlag}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {selectedRecord.authorFullName ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedRecord.authorCountryName ?? selectedRecord.authorCountry ?? '—'}
                        </p>
                      </div>
                    </div>
                    {selectedRecord.createdAt && (
                      <p className="text-xs">
                        <span className="text-gray-500">Created: </span>
                        {new Date(selectedRecord.createdAt).toLocaleDateString()}
                      </p>
                    )}
                    {selectedRecord.sharedAt && (
                      <p className="text-xs">
                        <span className="text-gray-500">Shared: </span>
                        {new Date(selectedRecord.sharedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {mode === 'global' && onToggleDisabled && (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleDisabled(selectedRecord, !selectedRecord.disabled)
                    }
                    className="w-full rounded border border-amber-400 bg-amber-50 py-1.5 text-xs font-semibold text-amber-900"
                  >
                    {selectedRecord.disabled ? 'Enable record' : 'Disable record'}
                  </button>
                )}
                {mode === 'global' && onDeleteRecord && (
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(selectedRecord)}
                    className="w-full rounded border border-red-300 bg-red-50 py-1.5 text-xs font-semibold text-red-800"
                  >
                    Delete from global archive
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

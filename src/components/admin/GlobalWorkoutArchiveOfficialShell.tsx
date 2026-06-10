'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  Languages,
  LayoutList,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import ExerciseBankSportIconFilter from '@/components/settings/ExerciseBankSportIconFilter';
import GlobalArchivePicturesPanel from '@/components/admin/GlobalArchivePicturesPanel';
import { useSettingsLayoutExpand } from '@/contexts/SettingsLayoutExpandContext';
import type { GlobalArchiveBulkAction } from '@/lib/globalWorkoutArchivePictures';
import {
  ARCHIVE_DISPLAY_LANGUAGES,
  type WorkoutArchiveGridRecord,
  type WorkoutArchiveRecordType,
} from '@/types/workoutArchiveGrid';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';
import {
  filterArchiveRecords,
  formatArchiveExpDate,
  type ArchiveDurationFilter,
  type ArchivePrimaryTab,
  type ArchiveSearchField,
  type ArchiveSortKey,
} from '@/lib/workoutArchiveOfficialShared';
import {
  ArchiveOfficialSortableHeader,
  useArchiveOfficialColumnOrder,
} from '@/components/workouts/archive/ArchiveOfficialSortableHeader';
import { ArchiveOfficialTableRow } from '@/components/workouts/archive/ArchiveOfficialTableRow';
import { LS_ARCHIVE_COLUMNS_GLOBAL } from '@/components/workouts/archive/archiveOfficialColumns';

export type GlobalArchivePrimaryTab = ArchivePrimaryTab;

type SearchField = ArchiveSearchField;
type SortKey = ArchiveSortKey;
type DurationFilter = ArchiveDurationFilter;

export interface GlobalWorkoutArchiveOfficialShellProps {
  records: WorkoutArchiveGridRecord[];
  loading?: boolean;
  recordTypeFilter: WorkoutArchiveRecordType | 'ALL';
  onRecordTypeFilterChange?: (t: WorkoutArchiveRecordType | 'ALL') => void;
  primaryTab?: GlobalArchivePrimaryTab;
  onPrimaryTabChange?: (t: GlobalArchivePrimaryTab) => void;
  selectedId: string | null;
  onSelectRecord: (record: WorkoutArchiveGridRecord | null) => void;
  onToggleDisabled?: (record: WorkoutArchiveGridRecord, disabled: boolean) => void;
  onDeleteRecord?: (record: WorkoutArchiveGridRecord) => void;
  onBulkAction?: (ids: string[], action: GlobalArchiveBulkAction) => Promise<boolean>;
  onUpdatePictures?: (
    record: WorkoutArchiveGridRecord,
    thumbnailUrl: string | null,
    pictureUrls: string[]
  ) => Promise<void>;
  onCreateEntry?: (recordType: 'STRUCTURED_PROGRAM' | 'COACH_PLAN', title: string) => Promise<void>;
  savingPictures?: boolean;
  headerExtra?: React.ReactNode;
}

export default function GlobalWorkoutArchiveOfficialShell({
  records,
  loading = false,
  recordTypeFilter,
  onRecordTypeFilterChange,
  primaryTab = 'WORKOUT_WEEKLY',
  onPrimaryTabChange,
  selectedId,
  onSelectRecord,
  onToggleDisabled,
  onDeleteRecord,
  onBulkAction,
  onUpdatePictures,
  onCreateEntry,
  savingPictures = false,
  headerExtra,
}: GlobalWorkoutArchiveOfficialShellProps) {
  const layoutExpand = useSettingsLayoutExpand();

  const [sportFilter, setSportFilter] = useState('all');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [displayLanguage, setDisplayLanguage] = useState('en');
  const [showDisabled, setShowDisabled] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'label' | 'miniatures'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('nameAsc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailTab, setDetailTab] = useState<'short' | 'info' | 'overview'>('short');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAuthorInfo, setShowAuthorInfo] = useState(true);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const { columnOrder, sensors, handleDragEnd } = useArchiveOfficialColumnOrder(
    LS_ARCHIVE_COLUMNS_GLOBAL
  );

  useEffect(() => {
    if (!showBulkMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setShowBulkMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showBulkMenu]);

  const authors = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.sharedByUsername) set.add(r.sharedByUsername);
    });
    return Array.from(set).sort();
  }, [records]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const c = r.authorCountryName ?? r.authorCountry;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [records]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const filtered = useMemo(
    () =>
      filterArchiveRecords(records, {
        recordTypeFilter,
        primaryTab,
        showDisabled,
        favoritesOnly,
        sportFilter,
        authorFilter,
        countryFilter,
        durationFilter,
        appliedSearch,
        searchField,
        sortKey,
        sportLabel,
      }),
    [
      records,
      recordTypeFilter,
      primaryTab,
      showDisabled,
      favoritesOnly,
      sportFilter,
      authorFilter,
      countryFilter,
      durationFilter,
      appliedSearch,
      searchField,
      sortKey,
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRecords = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const currentTags = selectedRecord?.tags?.trim() || '—';

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected =
    pageRecords.length > 0 && pageRecords.every((r) => selectedIds.has(r.id));
  const somePageSelected = pageRecords.some((r) => selectedIds.has(r.id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRecords.forEach((r) => next.delete(r.id));
      } else {
        pageRecords.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const runBulkAction = async (action: GlobalArchiveBulkAction) => {
    if (!onBulkAction || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'delete') {
      if (!confirm(`Delete ${ids.length} selected record(s) from the global archive?`)) return;
    }
    setBulkBusy(true);
    setShowBulkMenu(false);
    try {
      const ok = await onBulkAction(ids, action);
      if (ok) setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const handleAddCatalogEntry = async () => {
    if (!onCreateEntry) return;
    const recordType =
      primaryTab === 'STRUCTURED' ? 'STRUCTURED_PROGRAM' : ('COACH_PLAN' as const);
    const label = primaryTab === 'STRUCTURED' ? 'structured program' : 'coach plan';
    const title = window.prompt(`Title for new ${label}:`)?.trim();
    if (!title) return;
    await onCreateEntry(recordType, title);
  };

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setPage(1);
  };

  const totalsSummary = selectedRecord
    ? `Total time ${formatArchiveDuration(selectedRecord.totalTimeSeconds ?? 0)} · Total distance ${
        selectedRecord.totalMeters != null ? `${selectedRecord.totalMeters} m` : '—'
      } · Total reps ${selectedRecord.totalSeries ?? '—'}`
    : 'Total time + total distance + Total reps';

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Header — official mockup title */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Archive className="h-7 w-7 shrink-0 text-sky-700" aria-hidden />
              Global archive of workouts and plans of workouts.
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Super Admin catalog — workouts and weekly plans shared by Movesbook users. Filter by sport,
              author, and country; manage visibility and review metadata.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-end justify-end gap-2 sm:gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Languages className="h-4 w-4" /> Display language
              </span>
              <select
                value={displayLanguage}
                onChange={(e) => setDisplayLanguage(e.target.value)}
                className="min-w-[9rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                {ARCHIVE_DISPLAY_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {layoutExpand ? (
              <button
                type="button"
                onClick={layoutExpand.toggleContentExpanded}
                className={`flex h-[42px] w-[42px] items-center justify-center rounded-lg border-2 shadow-sm transition ${
                  layoutExpand.contentExpanded
                    ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
                    : 'border-gray-400 bg-white text-gray-800 hover:border-sky-500 hover:bg-sky-50'
                }`}
                title={
                  layoutExpand.contentExpanded
                    ? 'Show settings menu (exit expanded view)'
                    : 'Expand page — hide left settings menu for more workspace'
                }
                aria-pressed={layoutExpand.contentExpanded}
              >
                {layoutExpand.contentExpanded ? (
                  <Minimize2 className="h-5 w-5" aria-hidden />
                ) : (
                  <Maximize2 className="h-5 w-5" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        </div>
        {headerExtra}
      </div>

      {/* Primary tabs */}
      {onPrimaryTabChange && (
        <div className="flex flex-wrap gap-2">
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
              onClick={() => {
                onPrimaryTabChange(key);
                setPage(1);
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-sm ${
                primaryTab === key
                  ? key === 'COACH_PLANS'
                    ? 'bg-[#a51d2d] text-white'
                    : 'bg-gray-900 text-white'
                  : key === 'COACH_PLANS'
                    ? 'bg-rose-50 text-rose-900 ring-1 ring-rose-200 hover:bg-rose-100'
                    : 'bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {(primaryTab === 'STRUCTURED' || primaryTab === 'COACH_PLANS') && onCreateEntry && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleAddCatalogEntry()}
            className="flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <Plus className="h-4 w-4" />
            Add catalog entry
          </button>
        </div>
      )}

      {/* Sport icon grid */}
      <ExerciseBankSportIconFilter
        activeLibraryFilter={sportFilter}
        onLibraryFilterChange={(v) => {
          setSportFilter(v);
          setPage(1);
        }}
      />

      {/* Filter row — type, duration, author, country */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        {onRecordTypeFilterChange && primaryTab === 'WORKOUT_WEEKLY' && (
          <label className="text-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">Type of workout</span>
            <select
              value={recordTypeFilter}
              onChange={(e) => {
                onRecordTypeFilterChange(e.target.value as WorkoutArchiveRecordType | 'ALL');
                setPage(1);
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
            >
              <option value="ALL">All types</option>
              <option value="WORKOUT">Workouts</option>
              <option value="WEEKLY_PLAN">Weekly plans</option>
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Duration</span>
          <select
            value={durationFilter}
            onChange={(e) => {
              setDurationFilter(e.target.value as DurationFilter);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
          >
            <option value="all">All durations</option>
            <option value="short">Under 30 min</option>
            <option value="medium">30 – 60 min</option>
            <option value="long">1 – 2 hours</option>
            <option value="extraLong">Over 2 hours</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Author</span>
          <select
            value={authorFilter}
            onChange={(e) => {
              setAuthorFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
          >
            <option value="all">Shared by — all</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Country author</span>
          <select
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
          >
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Search + options row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
          />
          Display disabled
        </label>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          Display favorites
        </label>
        <div className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Search…"
            className="w-full rounded border border-gray-300 py-2 pl-8 pr-2 text-sm bg-white"
          />
        </div>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
          className="rounded border border-gray-300 px-2 py-2 text-sm bg-white"
        >
          <option value="all">in the field — all</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="tags">Tags</option>
          <option value="sport">Sport</option>
        </select>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Apply
        </button>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded border border-gray-300 px-2 py-2 text-sm bg-white"
        >
          <option value="nameAsc">Sort: Name A-Z</option>
          <option value="nameDesc">Sort: Name Z-A</option>
          <option value="dateNewest">Sort: Newest first</option>
          <option value="dateOldest">Sort: Oldest first</option>
        </select>
        <button
          type="button"
          className="rounded bg-gray-800 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-900"
        >
          Filters
        </button>
        <div className="relative" ref={bulkMenuRef}>
          <button
            type="button"
            disabled={selectedIds.size === 0 || bulkBusy || !onBulkAction}
            onClick={() => setShowBulkMenu((v) => !v)}
            className="flex items-center gap-1 rounded bg-[#a51d2d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8e1023] disabled:opacity-40"
          >
            Options on selected
            <ChevronDown className="h-4 w-4" />
          </button>
          {showBulkMenu && onBulkAction && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {(
                [
                  ['enable', 'Enable selected'],
                  ['disable', 'Disable selected'],
                  ['favorite', 'Mark as favorite'],
                  ['unfavorite', 'Remove favorite'],
                  ['delete', 'Delete selected'],
                ] as const
              ).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => void runBulkAction(action)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    action === 'delete' ? 'text-red-700' : 'text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination + tags + view toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-700">Page</span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1 text-sm ml-2"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
          <span className="ml-4 text-gray-600">
            Current Tags: <strong>{currentTags}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">View:</span>
          {(['grid', 'label', 'miniatures'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded px-2 py-1 text-xs font-semibold capitalize ${
                viewMode === mode ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {mode === 'grid' ? (
                <>
                  <Grid3X3 className="inline h-3.5 w-3.5 mr-1" />
                  Grid
                </>
              ) : (
                mode
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid + detail sidebar */}
      <div className="flex gap-4 min-h-[28rem]">
        <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-300 bg-white">
          {loading ? (
            <p className="p-8 text-center text-gray-500">Loading catalog…</p>
          ) : pageRecords.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No records match your filters.</p>
          ) : viewMode === 'label' ? (
            <div className="divide-y">
              {pageRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onSelectRecord(record)}
                  className={`w-full px-4 py-3 text-left hover:bg-amber-50 ${
                    selectedId === record.id ? 'bg-amber-100' : ''
                  }`}
                >
                  <span className="font-semibold">{record.code ? `${record.code} — ` : ''}{record.title}</span>
                  <span className="ml-2 text-xs text-gray-500">{sportLabel(record.mainSport)}</span>
                </button>
              ))}
            </div>
          ) : viewMode === 'miniatures' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
              {pageRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onSelectRecord(record)}
                  className={`rounded-lg border p-2 text-left hover:border-sky-400 ${
                    selectedId === record.id ? 'border-sky-600 bg-sky-50' : 'border-gray-200'
                  }`}
                >
                  <div className="aspect-square rounded bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                    {record.thumbnailUrl ? (
                      <Image
                        src={record.thumbnailUrl}
                        alt=""
                        width={120}
                        height={120}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Archive className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs font-bold truncate">{record.code}</p>
                  <p className="text-sm font-semibold truncate">{record.title}</p>
                </button>
              ))}
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm min-w-[1100px]">
              <ArchiveOfficialSortableHeader
                columnOrder={columnOrder}
                sensors={sensors}
                onDragEnd={handleDragEnd}
                selectAllChecked={allPageSelected}
                selectAllIndeterminate={somePageSelected && !allPageSelected}
                onSelectAllChange={toggleSelectAllPage}
              />
              <tbody>
                {pageRecords.map((record, rowIdx) => (
                  <ArchiveOfficialTableRow
                    key={record.id}
                    record={record}
                    columnOrder={columnOrder}
                    rowIdx={rowIdx}
                    isSelected={selectedId === record.id}
                    isChecked={selectedIds.has(record.id)}
                    authorLabel={record.sharedByUsername ?? '—'}
                    authorClassName="max-w-[8rem] truncate block"
                    onSelect={() => onSelectRecord(record)}
                    onToggleCheck={() => toggleSelect(record.id)}
                    renderActions={
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Toggle disabled"
                          onClick={() => onToggleDisabled?.(record, !record.disabled)}
                          className="rounded p-1 hover:bg-gray-200"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          type="button"
                          title="View"
                          onClick={() => onSelectRecord(record)}
                          className="rounded p-1 hover:bg-gray-200"
                        >
                          <Eye className="h-4 w-4 text-sky-700" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => onDeleteRecord?.(record)}
                          className="rounded p-1 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </button>
                      </div>
                    }
                  />
                ))}
              </tbody>
            </table>
          )}

          <p className="border-t px-3 py-2 text-[10px] text-gray-500 italic">
            Drag column headers (except checkbox and ACTIONS) to reorder. Order is saved in this browser.
          </p>

          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span>
              {filtered.length} record(s) · Page {safePage}/{totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Details sidebar — official mockup */}
        <aside className="w-80 shrink-0 rounded-lg border border-gray-300 bg-white flex flex-col overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b">
            <p className="font-bold text-sm">Details</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{totalsSummary}</p>
          </div>
          {!selectedRecord ? (
            <p className="p-4 text-sm text-gray-500">Select a record to view details.</p>
          ) : (
            <>
              <div className="flex gap-1 border-b text-[10px] font-semibold overflow-x-auto">
                {(['short', 'info', 'overview'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`px-2 py-1.5 capitalize whitespace-nowrap ${
                      detailTab === tab
                        ? 'bg-white border-b-2 border-sky-600 text-sky-800'
                        : 'text-gray-600'
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
                    {selectedRecord.shortDescription ? (
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedRecord.shortDescription}</p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No short description.</p>
                    )}
                    {selectedRecord.originalLanguages && (
                      <p className="text-xs">
                        <span className="text-gray-500">Original languages: </span>
                        {selectedRecord.originalLanguages}
                      </p>
                    )}
                    {selectedRecord.expirationDate && (
                      <p className="text-xs">
                        <span className="text-gray-500">Expiration: </span>
                        {formatArchiveExpDate(selectedRecord.expirationDate)}
                      </p>
                    )}
                  </>
                )}

                {detailTab === 'info' && (
                  <div className="rounded border border-gray-200 p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase text-gray-500">Author info</p>
                      <button
                        type="button"
                        onClick={() => setShowAuthorInfo((v) => !v)}
                        className="text-[10px] font-semibold text-sky-700 hover:underline"
                      >
                        Info author
                      </button>
                    </div>
                    {showAuthorInfo && (
                      <>
                    <div className="flex items-center gap-2">
                      {selectedRecord.authorAvatarUrl ? (
                        <Image
                          src={selectedRecord.authorAvatarUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">
                          {selectedRecord.sharedByUsername ?? '—'}
                          {selectedRecord.authorCountryFlag && (
                            <span className="ml-1">{selectedRecord.authorCountryFlag}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">{selectedRecord.authorFullName ?? '—'}</p>
                        <p className="text-xs text-gray-500">
                          {selectedRecord.authorCountryName ?? selectedRecord.authorCountry ?? '—'}
                        </p>
                      </div>
                    </div>
                    {selectedRecord.createdAt && (
                      <p className="text-xs">
                        <span className="text-gray-500">Date of creation: </span>
                        {new Date(selectedRecord.createdAt).toLocaleDateString()}
                      </p>
                    )}
                    {selectedRecord.expirationDate && (
                      <p className="text-xs">
                        <span className="text-gray-500">Date of expiration: </span>
                        {formatArchiveExpDate(selectedRecord.expirationDate)}
                      </p>
                    )}
                    {selectedRecord.sharedAt && (
                      <p className="text-xs">
                        <span className="text-gray-500">Date shared: </span>
                        {new Date(selectedRecord.sharedAt).toLocaleDateString()}
                      </p>
                    )}
                      </>
                    )}
                  </div>
                )}

                {detailTab === 'overview' && (
                  <div className="rounded bg-gray-50 p-2 text-xs space-y-1">
                    <p>
                      Workouts: <strong>{selectedRecord.workoutCount ?? 1}</strong>
                    </p>
                    <p>
                      Total distance:{' '}
                      <strong>
                        {selectedRecord.totalMeters != null ? `${selectedRecord.totalMeters} m` : '—'}
                      </strong>
                    </p>
                    <p>
                      Total time:{' '}
                      <strong>{formatArchiveDuration(selectedRecord.totalTimeSeconds ?? 0)}</strong>
                    </p>
                    <p>
                      Total reps: <strong>{selectedRecord.totalSeries ?? '—'}</strong>
                    </p>
                  </div>
                )}

                {onUpdatePictures ? (
                  <GlobalArchivePicturesPanel
                    record={selectedRecord}
                    saving={savingPictures}
                    onSave={(thumbnailUrl, pictureUrls) =>
                      onUpdatePictures(selectedRecord, thumbnailUrl, pictureUrls)
                    }
                  />
                ) : (
                  <div className="rounded border border-dashed border-gray-300 p-3 text-center">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">Pictures</p>
                    {selectedRecord.thumbnailUrl ? (
                      <Image
                        src={selectedRecord.thumbnailUrl}
                        alt=""
                        width={120}
                        height={120}
                        unoptimized
                        className="mx-auto rounded object-cover"
                      />
                    ) : (
                      <p className="text-xs text-gray-400">No pictures attached.</p>
                    )}
                  </div>
                )}

                {onToggleDisabled && (
                  <button
                    type="button"
                    onClick={() => onToggleDisabled(selectedRecord, !selectedRecord.disabled)}
                    className="w-full rounded border border-amber-400 bg-amber-50 py-1.5 text-xs font-semibold text-amber-900"
                  >
                    {selectedRecord.disabled ? 'Enable record' : 'Disable record'}
                  </button>
                )}
                {onDeleteRecord && (
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

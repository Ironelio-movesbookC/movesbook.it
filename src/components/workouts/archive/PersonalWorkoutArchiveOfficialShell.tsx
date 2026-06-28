'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Archive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Globe,
  Grid3X3,
  Heart,
  Languages,
  LayoutList,
  Search,
  User,
  Users,
} from 'lucide-react';
import PersonalArchiveSportFilter from '@/components/workouts/archive/PersonalArchiveSportFilter';
import {
  ArchiveOfficialSortableHeader,
  useArchiveOfficialColumnOrder,
} from '@/components/workouts/archive/ArchiveOfficialSortableHeader';
import { ArchiveOfficialTableRow } from '@/components/workouts/archive/ArchiveOfficialTableRow';
import { LS_ARCHIVE_COLUMNS_PERSONAL } from '@/components/workouts/archive/archiveOfficialColumns';
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
  type ArchiveTrainingFilter,
  type PersonalArchiveSource,
} from '@/lib/workoutArchiveOfficialShared';

export interface PersonalWorkoutArchiveOfficialShellProps {
  records: WorkoutArchiveGridRecord[];
  loading?: boolean;
  archiveSource: PersonalArchiveSource;
  onArchiveSourceChange: (source: PersonalArchiveSource) => void;
  favoriteSports: string[];
  favoriteSportsLoading?: boolean;
  recordTypeFilter: WorkoutArchiveRecordType | 'ALL';
  onRecordTypeFilterChange?: (t: WorkoutArchiveRecordType | 'ALL') => void;
  primaryTab?: ArchivePrimaryTab;
  onPrimaryTabChange?: (t: ArchivePrimaryTab) => void;
  selectedId: string | null;
  onSelectRecord: (record: WorkoutArchiveGridRecord | null) => void;
  renderRecordActions?: (record: WorkoutArchiveGridRecord) => React.ReactNode;
  headerExtra?: React.ReactNode;
  onImportGlobalRecord?: (record: WorkoutArchiveGridRecord) => void;
}

export default function PersonalWorkoutArchiveOfficialShell({
  records,
  loading = false,
  archiveSource,
  onArchiveSourceChange,
  favoriteSports,
  favoriteSportsLoading = false,
  recordTypeFilter,
  onRecordTypeFilterChange,
  primaryTab = 'WORKOUT_WEEKLY',
  onPrimaryTabChange,
  selectedId,
  onSelectRecord,
  renderRecordActions,
  headerExtra,
  onImportGlobalRecord,
}: PersonalWorkoutArchiveOfficialShellProps) {
  const [sportFilter, setSportFilter] = useState('all');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searchField, setSearchField] = useState<ArchiveSearchField>('all');
  const [durationFilter, setDurationFilter] = useState<ArchiveDurationFilter>('all');
  const [trainingCategoryFilter, setTrainingCategoryFilter] =
    useState<ArchiveTrainingFilter>('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [displayLanguage, setDisplayLanguage] = useState('en');
  const [showDisabled, setShowDisabled] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'label' | 'miniatures'>('grid');
  const [sortKey, setSortKey] = useState<ArchiveSortKey>('nameAsc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [gridDetailTab, setGridDetailTab] = useState<
    'short' | 'workoutInfo' | 'annotations' | 'overview' | 'moveframes'
  >('short');
  const [sidebarTab, setSidebarTab] = useState<'short' | 'info' | 'overview'>('short');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { columnOrder, sensors, handleDragEnd } = useArchiveOfficialColumnOrder(
    LS_ARCHIVE_COLUMNS_PERSONAL
  );

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
        trainingCategoryFilter,
        appliedSearch,
        searchField,
        sortKey,
        favoriteSports,
        restrictToFavoriteSportsWhenAll: archiveSource === 'personal' && sportFilter === 'all',
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
      trainingCategoryFilter,
      appliedSearch,
      searchField,
      sortKey,
      favoriteSports,
      archiveSource,
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRecords = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const currentTags = selectedRecord?.tags?.trim() || '—';
  const isGlobalView = archiveSource === 'global';

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-rose-50/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold uppercase tracking-wide text-[#a51d2d]">
              General Archive of Workouts
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Browse workouts and weekly plans from your personal archive or the shared Movesbook
              catalog. Filter by training type, sport, duration, author, and more.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm shrink-0">
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
        </div>
      </div>

      {/* Import / source cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            onArchiveSourceChange('personal');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
            archiveSource === 'personal'
              ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-200'
              : 'border-dashed border-blue-300 bg-blue-50/60 hover:border-blue-500'
          }`}
        >
          <Download className="h-10 w-10 shrink-0 text-blue-600" />
          <div>
            <p className="font-bold text-blue-900">Import from My General Archive</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Workouts &amp; weekly plans you saved in your personal archive
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            onArchiveSourceChange('global');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
            archiveSource === 'global'
              ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
              : 'border-dashed border-indigo-300 bg-indigo-50/60 hover:border-indigo-500'
          }`}
        >
          <Users className="h-10 w-10 shrink-0 text-indigo-600" />
          <div>
            <p className="font-bold text-indigo-900">
              Import from plans shared by friends /{' '}
              <span className="text-[#a51d2d]">Global archive of Movesbook</span>
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Official catalog shared for all Movesbook users
            </p>
          </div>
        </button>
      </div>

      {headerExtra}

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

      {/* Favourite sports + dropdown */}
      <PersonalArchiveSportFilter
        favoriteSports={favoriteSports}
        activeSport={sportFilter}
        onSportChange={(v) => {
          setSportFilter(v);
          setPage(1);
        }}
        loading={favoriteSportsLoading}
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
        {onRecordTypeFilterChange && primaryTab === 'WORKOUT_WEEKLY' && (
          <label className="text-sm">
            <span className="block text-xs font-semibold text-gray-500 mb-1">Class</span>
            <select
              value={recordTypeFilter}
              onChange={(e) => {
                onRecordTypeFilterChange(e.target.value as WorkoutArchiveRecordType | 'ALL');
                setPage(1);
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
            >
              <option value="ALL">All classes</option>
              <option value="WORKOUT">Workout</option>
              <option value="WEEKLY_PLAN">Weekly plan</option>
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Type of training</span>
          <select
            value={trainingCategoryFilter}
            onChange={(e) => {
              setTrainingCategoryFilter(e.target.value as ArchiveTrainingFilter);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[10rem]"
          >
            <option value="all">All training types</option>
            <option value="aerobic">Aerobic</option>
            <option value="non-aerobic">Non-aerobic</option>
            <option value="weight training">Weight training</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-gray-500 mb-1">Duration</span>
          <select
            value={durationFilter}
            onChange={(e) => {
              setDurationFilter(e.target.value as ArchiveDurationFilter);
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

      {/* Search row */}
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
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Display favourites <Heart className="h-3.5 w-3.5 text-rose-500" />
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
          onChange={(e) => setSearchField(e.target.value as ArchiveSearchField)}
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
          onChange={(e) => setSortKey(e.target.value as ArchiveSortKey)}
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
        <button
          type="button"
          disabled={selectedIds.size === 0}
          className="rounded bg-[#a51d2d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8e1023] disabled:opacity-40"
        >
          Options on selected
        </button>
      </div>

      {/* Pagination + view */}
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
          {isGlobalView && (
            <span className="ml-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
              <Globe className="inline h-3 w-3 mr-1" />
              Global catalog
            </span>
          )}
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

      {/* Grid detail tabs (mockup) */}
      <div className="flex gap-1 border-b border-gray-200 text-[11px] font-semibold overflow-x-auto">
        {(
          [
            ['short', 'Short description'],
            ['workoutInfo', 'Workout Info'],
            ['annotations', 'Annotations'],
            ['overview', 'Overview'],
            ['moveframes', 'Moveframes'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGridDetailTab(key)}
            className={`px-3 py-1.5 whitespace-nowrap ${
              gridDetailTab === key
                ? 'border-b-2 border-sky-600 text-sky-800 bg-sky-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main grid + sidebar */}
      <div className="flex gap-4 min-h-[28rem]">
        <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-300 bg-white">
          {loading ? (
            <p className="p-8 text-center text-gray-500">Loading archive…</p>
          ) : pageRecords.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              {isGlobalView
                ? 'No shared plans in the global catalog match your filters.'
                : 'No records in your personal archive match your filters.'}
            </p>
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
                  <span className="font-semibold">
                    {record.code ? `${record.code} — ` : ''}
                    {record.title}
                  </span>
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={record.thumbnailUrl}
                        alt=""
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
            <table className="w-full text-xs sm:text-sm min-w-[1800px]">
              <ArchiveOfficialSortableHeader
                columnOrder={columnOrder}
                sensors={sensors}
                onDragEnd={handleDragEnd}
              />
              <tbody>
                {pageRecords.map((record, rowIdx) => {
                  const fromGlobal = record.archiveSource === 'global';
                  const actions =
                    renderRecordActions?.(record) ??
                    (fromGlobal && onImportGlobalRecord ? (
                      <button
                        type="button"
                        onClick={() => onImportGlobalRecord(record)}
                        className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700"
                      >
                        Import
                      </button>
                    ) : null);
                  return (
                    <ArchiveOfficialTableRow
                      key={record.id}
                      record={record}
                      columnOrder={columnOrder}
                      rowIdx={rowIdx}
                      isSelected={selectedId === record.id}
                      isChecked={selectedIds.has(record.id)}
                      authorLabel={fromGlobal ? record.sharedByUsername ?? 'Movesbook' : 'You'}
                      authorClassName={fromGlobal ? 'text-blue-700 font-medium max-w-[8rem] truncate block' : 'max-w-[8rem] truncate block'}
                      onSelect={() => onSelectRecord(record)}
                      onToggleCheck={() => toggleSelect(record.id)}
                      renderActions={actions}
                    />
                  );
                })}
              </tbody>
            </table>
          )}

          <p className="border-t px-3 py-2 text-[10px] text-gray-500 italic">
            Drag column headers (except checkbox and ACTIONS) to reorder. Order is saved in this browser.
          </p>
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
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

        {/* Details sidebar */}
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
                    onClick={() => setSidebarTab(tab)}
                    className={`px-2 py-1.5 capitalize whitespace-nowrap ${
                      sidebarTab === tab
                        ? 'bg-white border-b-2 border-sky-600 text-sky-800'
                        : 'text-gray-600'
                    }`}
                  >
                    {tab === 'short' ? 'Short description' : tab === 'info' ? 'Author info' : tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {sidebarTab === 'short' && (
                  <>
                    <p className="text-xs font-bold uppercase text-[#a51d2d]">Short description</p>
                    <p className="font-semibold text-gray-900">{selectedRecord.title}</p>
                    {selectedRecord.shortDescription ? (
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedRecord.shortDescription}</p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No short description.</p>
                    )}
                  </>
                )}

                {sidebarTab === 'info' && selectedRecord.archiveSource === 'global' && (
                  <div className="rounded border border-gray-200 p-2 space-y-2">
                    <p className="text-xs font-bold uppercase text-gray-500">Author info</p>
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
                        <p className="font-semibold text-blue-800">
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
                    {selectedRecord.sharedAt && (
                      <p className="text-xs">
                        <span className="text-gray-500">Date of sharing: </span>
                        {new Date(selectedRecord.sharedAt).toLocaleDateString()}
                      </p>
                    )}
                    {selectedRecord.expirationDate && (
                      <p className="text-xs">
                        <span className="text-gray-500">Date of expiration: </span>
                        {formatArchiveExpDate(selectedRecord.expirationDate)}
                      </p>
                    )}
                  </div>
                )}

                {sidebarTab === 'info' && selectedRecord.archiveSource !== 'global' && (
                  <p className="text-sm text-gray-500">This record belongs to your personal archive.</p>
                )}

                {sidebarTab === 'overview' && (
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

                <div className="rounded border border-dashed border-gray-300 p-3 text-center">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-2">Pictures</p>
                  {selectedRecord.thumbnailUrl ? (
                    <Image
                      src={selectedRecord.thumbnailUrl}
                      alt=""
                      width={120}
                      height={120}
                      className="mx-auto rounded object-cover"
                    />
                  ) : (
                    <p className="text-xs text-gray-400">No pictures attached.</p>
                  )}
                </div>

                {selectedRecord.archiveSource === 'global' && onImportGlobalRecord && (
                  <button
                    type="button"
                    onClick={() => onImportGlobalRecord(selectedRecord)}
                    className="w-full rounded bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Import to my personal archive
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

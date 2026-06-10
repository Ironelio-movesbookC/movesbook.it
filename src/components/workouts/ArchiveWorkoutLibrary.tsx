'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Globe, Plus, Star } from 'lucide-react';
import { useFavoriteSports } from '@/hooks/useFavoriteSports';
import { saveWeekToFavorites } from '@/lib/saveFavoriteWeek';
import { mapPersonalArchiveToGridRecords } from '@/lib/personalArchiveGridMapper';
import {
  mapFavoritePlansToCoachGridRecords,
  mapPeriodizationTemplatesToGridRecords,
  parsePeriodizationTemplatesFromToolsSettings,
} from '@/lib/personalArchiveExtendedMapper';
import type { ArchivePrimaryTab, PersonalArchiveSource } from '@/lib/workoutArchiveOfficialShared';
import CloneArchiveWeekModal from './modals/CloneArchiveWeekModal';
import ExportWeekToPlanModal from './modals/ExportWeekToPlanModal';
import WeekTotalsModal from './modals/WeekTotalsModal';
import PersonalWorkoutArchiveOfficialShell from './archive/PersonalWorkoutArchiveOfficialShell';
import type { WorkoutArchiveGridRecord, WorkoutArchiveRecordType } from '@/types/workoutArchiveGrid';

export interface ArchiveWorkoutLibraryProps {
  workoutPlan: any;
  reloadWorkouts?: () => Promise<void>;
  onCloneWorkout?: (workout: any, day: any) => void;
  onExportWorkoutToYearly?: (workout: any) => void;
  onSaveFavoriteWorkout?: (workout: any, day: any) => void | Promise<void>;
  onOverviewWorkout?: (workout: any, day: any) => void;
  onEditWorkout?: (workout: any, day: any) => void;
  onDeleteWorkout?: (workout: any, day: any) => void | Promise<void>;
  compact?: boolean;
}

function getToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('adminToken');
}

export default function ArchiveWorkoutLibrary({
  workoutPlan,
  reloadWorkouts,
  onCloneWorkout,
  onExportWorkoutToYearly,
  onSaveFavoriteWorkout,
  onOverviewWorkout,
  onEditWorkout,
  onDeleteWorkout,
  compact = false,
}: ArchiveWorkoutLibraryProps) {
  const { favoriteSports, loading: favoriteSportsLoading } = useFavoriteSports();
  const [archiveSource, setArchiveSource] = useState<PersonalArchiveSource>('personal');
  const [primaryTab, setPrimaryTab] = useState<ArchivePrimaryTab>('WORKOUT_WEEKLY');
  const [recordTypeFilter, setRecordTypeFilter] = useState<WorkoutArchiveRecordType | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalRecords, setGlobalRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [structuredRecords, setStructuredRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [coachRecords, setCoachRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [personalExtrasLoading, setPersonalExtrasLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [cloneWeekSource, setCloneWeekSource] = useState<any>(null);
  const [exportWeekSource, setExportWeekSource] = useState<any>(null);
  const [overviewWeek, setOverviewWeek] = useState<any>(null);
  const [showWeekTotals, setShowWeekTotals] = useState(false);
  const [creatingWeek, setCreatingWeek] = useState(false);

  const workoutWeeklyRecords = useMemo(
    () => mapPersonalArchiveToGridRecords(workoutPlan),
    [workoutPlan]
  );

  const loadPersonalExtras = useCallback(async () => {
    setPersonalExtrasLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setStructuredRecords([]);
        setCoachRecords([]);
        return;
      }
      const [settingsRes, favRes] = await Promise.all([
        fetch('/api/user/settings/get', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workouts/plans/favorites', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const templates = parsePeriodizationTemplatesFromToolsSettings(data.settings?.toolsSettings);
        setStructuredRecords(mapPeriodizationTemplatesToGridRecords(templates));
      } else {
        setStructuredRecords([]);
      }
      if (favRes.ok) {
        const data = await favRes.json();
        setCoachRecords(mapFavoritePlansToCoachGridRecords(data.plans ?? []));
      } else {
        setCoachRecords([]);
      }
    } finally {
      setPersonalExtrasLoading(false);
    }
  }, []);

  const loadGlobalRecords = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setGlobalRecords([]);
        return;
      }
      const params = new URLSearchParams();
      if (primaryTab === 'STRUCTURED') params.set('recordType', 'STRUCTURED_PROGRAM');
      else if (primaryTab === 'COACH_PLANS') params.set('recordType', 'COACH_PLAN');

      const response = await fetch(`/api/workouts/global-archive?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGlobalRecords(data.records ?? []);
      } else {
        setGlobalRecords([]);
      }
    } finally {
      setGlobalLoading(false);
    }
  }, [primaryTab]);

  useEffect(() => {
    void loadPersonalExtras();
  }, [loadPersonalExtras]);

  useEffect(() => {
    if (archiveSource === 'global') void loadGlobalRecords();
  }, [archiveSource, loadGlobalRecords]);

  useEffect(() => {
    setSelectedId(null);
  }, [archiveSource, primaryTab]);

  const personalRecords = useMemo(() => {
    switch (primaryTab) {
      case 'STRUCTURED':
        return structuredRecords;
      case 'COACH_PLANS':
        return coachRecords;
      default:
        return workoutWeeklyRecords;
    }
  }, [primaryTab, structuredRecords, coachRecords, workoutWeeklyRecords]);

  const records = archiveSource === 'personal' ? personalRecords : globalRecords;
  const loading =
    archiveSource === 'global'
      ? globalLoading
      : primaryTab !== 'WORKOUT_WEEKLY' && personalExtrasLoading;

  const handleCreateArchiveWeek = async () => {
    setCreatingWeek(true);
    try {
      const token = getToken();
      if (!token) {
        alert('Please log in first');
        return;
      }
      const response = await fetch('/api/workouts/archive/weeks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create archive week');
      }
      if (reloadWorkouts) await reloadWorkouts();
      alert('New archive week created.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create week');
    } finally {
      setCreatingWeek(false);
    }
  };

  const handleCloneArchiveWeek = async (targetWeekId: string) => {
    const sourceWeek = cloneWeekSource;
    if (!sourceWeek?.id) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch('/api/workouts/weeks/copy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceWeekId: sourceWeek.id, targetWeekId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to clone week');
    }
    setCloneWeekSource(null);
    alert('Week cloned in Archive successfully.');
    if (reloadWorkouts) await reloadWorkouts();
  };

  const handleExportWeekToYearly = async (targetWeekIdOrIds: string | string[]) => {
    const targetIds = Array.isArray(targetWeekIdOrIds) ? targetWeekIdOrIds : [targetWeekIdOrIds];
    const sourceWeek = exportWeekSource;
    if (!sourceWeek?.id || targetIds.length === 0) return;
    const token = getToken();
    if (!token) return;
    for (const targetWeekId of targetIds) {
      const response = await fetch('/api/workouts/weeks/copy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceWeekId: sourceWeek.id, targetWeekId }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to export week');
      }
    }
    setExportWeekSource(null);
    alert(`Week exported to ${targetIds.length} Yearly Plan week(s).`);
    if (reloadWorkouts) await reloadWorkouts();
  };

  const handleSaveWeekFavorite = async (week: any) => {
    const result = await saveWeekToFavorites(
      { ...week, workoutPlanId: workoutPlan?.id },
      {
        name: `Archive Week ${week.weekNumber ?? '?'}`,
        description: `Saved from archive on ${new Date().toLocaleDateString()}`,
      }
    );
    if (result.ok) alert(result.message);
    else if (!result.skipped) alert(result.error);
  };

  const handleImportGlobalRecord = async (record: WorkoutArchiveGridRecord) => {
    const token = getToken();
    if (!token) {
      alert('Please log in first');
      return;
    }
    setImportingId(record.id);
    try {
      const response = await fetch('/api/workouts/global-archive/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ globalEntryId: record.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }
      alert(data.message || 'Imported successfully.');
      if (record.recordType === 'STRUCTURED_PROGRAM') {
        await loadPersonalExtras();
        setArchiveSource('personal');
        setPrimaryTab('STRUCTURED');
      } else {
        if (reloadWorkouts) await reloadWorkouts();
        setArchiveSource('personal');
        setPrimaryTab(
          record.recordType === 'COACH_PLAN' ? 'COACH_PLANS' : 'WORKOUT_WEEKLY'
        );
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const renderPersonalActions = (record: WorkoutArchiveGridRecord) => {
    if (record.recordType === 'STRUCTURED_PROGRAM') {
      return (
        <span className="text-[10px] text-gray-500">Open in Periodization tools</span>
      );
    }
    if (record.recordType === 'COACH_PLAN') {
      const plan = record._raw as { id?: string; name?: string };
      return (
        <button
          type="button"
          title="View in favourites"
          className="rounded border border-gray-300 px-1 text-[10px] font-bold"
          onClick={() => alert(`Coach plan "${plan?.name ?? record.title}" — apply from Favourites.`)}
        >
          View
        </button>
      );
    }
    if (record.recordType === 'WEEKLY_PLAN') {
      const week = record._raw;
      return (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            title="Clone week"
            onClick={() => setCloneWeekSource(week)}
            className="rounded bg-gray-800 p-1 text-white hover:bg-gray-900"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Export to Yearly"
            onClick={() => setExportWeekSource(week)}
            className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700"
          >
            <Globe className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Save to Favourites"
            onClick={() => void handleSaveWeekFavorite(week)}
            className="rounded bg-yellow-500 p-1 text-white hover:bg-yellow-600"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Overview"
            onClick={() => {
              setOverviewWeek(week);
              setShowWeekTotals(true);
            }}
            className="rounded border border-gray-300 p-1 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    const raw = record._raw as { workout: any; day: any } | undefined;
    if (!raw) return null;
    const { workout, day } = raw;
    return (
      <div className="flex flex-wrap gap-1">
        {onCloneWorkout && (
          <button
            type="button"
            title="Clone"
            onClick={() => onCloneWorkout(workout, day)}
            className="rounded bg-gray-800 p-1 text-white hover:bg-gray-900"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        {onExportWorkoutToYearly && (
          <button
            type="button"
            title="Export Yearly"
            onClick={() => onExportWorkoutToYearly(workout)}
            className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700"
          >
            <Globe className="h-3.5 w-3.5" />
          </button>
        )}
        {onSaveFavoriteWorkout && (
          <button
            type="button"
            title="Favourites"
            onClick={() => void onSaveFavoriteWorkout(workout, day)}
            className="rounded bg-yellow-500 p-1 text-white hover:bg-yellow-600"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
        {onOverviewWorkout && (
          <button
            type="button"
            title="Overview"
            onClick={() => onOverviewWorkout(workout, day)}
            className="rounded border border-gray-300 p-1 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
        {onEditWorkout && (
          <button
            type="button"
            onClick={() => onEditWorkout(workout, day)}
            className="rounded border border-blue-300 px-1 text-[10px] font-bold text-blue-700"
          >
            Edit
          </button>
        )}
        {onDeleteWorkout && (
          <button
            type="button"
            onClick={() => void onDeleteWorkout(workout, day)}
            className="rounded border border-red-300 px-1 text-[10px] font-bold text-red-700"
          >
            Del
          </button>
        )}
      </div>
    );
  };

  const renderGlobalImportAction = (record: WorkoutArchiveGridRecord) => (
    <button
      type="button"
      disabled={importingId === record.id}
      onClick={() => void handleImportGlobalRecord(record)}
      className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {importingId === record.id ? '…' : 'Import'}
    </button>
  );

  return (
    <>
      <PersonalWorkoutArchiveOfficialShell
        records={records}
        loading={loading}
        archiveSource={archiveSource}
        onArchiveSourceChange={setArchiveSource}
        favoriteSports={favoriteSports}
        favoriteSportsLoading={favoriteSportsLoading}
        recordTypeFilter={recordTypeFilter}
        onRecordTypeFilterChange={setRecordTypeFilter}
        primaryTab={primaryTab}
        onPrimaryTabChange={setPrimaryTab}
        selectedId={selectedId}
        onSelectRecord={(r) => setSelectedId(r?.id ?? null)}
        renderRecordActions={
          archiveSource === 'personal' ? renderPersonalActions : renderGlobalImportAction
        }
        onImportGlobalRecord={handleImportGlobalRecord}
        headerExtra={
          !compact && archiveSource === 'personal' && primaryTab === 'WORKOUT_WEEKLY' ? (
            <div className="mt-2">
              <button
                type="button"
                disabled={creatingWeek}
                onClick={() => void handleCreateArchiveWeek()}
                className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {creatingWeek ? 'Creating…' : 'New archive week'}
              </button>
            </div>
          ) : null
        }
      />

      <CloneArchiveWeekModal
        isOpen={Boolean(cloneWeekSource)}
        sourceWeek={cloneWeekSource}
        onClose={() => setCloneWeekSource(null)}
        onConfirm={handleCloneArchiveWeek}
      />

      <ExportWeekToPlanModal
        isOpen={Boolean(exportWeekSource)}
        sourceWeek={exportWeekSource}
        sourceLabel={
          exportWeekSource ? `Archive, Week ${exportWeekSource.weekNumber ?? '?'}` : 'Archive'
        }
        destination="YEARLY_PLAN"
        onClose={() => setExportWeekSource(null)}
        onConfirm={handleExportWeekToYearly}
      />

      {showWeekTotals && overviewWeek && (
        <WeekTotalsModal
          isOpen={showWeekTotals}
          onClose={() => {
            setShowWeekTotals(false);
            setOverviewWeek(null);
          }}
          week={overviewWeek}
          activeSection="D"
        />
      )}
    </>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import GlobalWorkoutArchiveOfficialShell, {
  type GlobalArchivePrimaryTab,
} from '@/components/admin/GlobalWorkoutArchiveOfficialShell';
import type { GlobalArchiveBulkAction } from '@/lib/globalWorkoutArchivePictures';
import type { WorkoutArchiveGridRecord, WorkoutArchiveRecordType } from '@/types/workoutArchiveGrid';

function getAdminToken(): string | null {
  return localStorage.getItem('adminToken') || localStorage.getItem('token');
}

export default function GlobalWorkoutArchiveClient() {
  const [records, setRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordTypeFilter, setRecordTypeFilter] = useState<WorkoutArchiveRecordType | 'ALL'>('ALL');
  const [primaryTab, setPrimaryTab] = useState<GlobalArchivePrimaryTab>('WORKOUT_WEEKLY');
  const [savingPictures, setSavingPictures] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) {
        setRecords([]);
        return;
      }
      const params = new URLSearchParams({ includeDisabled: 'true' });
      if (recordTypeFilter !== 'ALL' && primaryTab === 'WORKOUT_WEEKLY') {
        params.set('recordType', recordTypeFilter);
      } else if (primaryTab === 'STRUCTURED') {
        params.set('recordType', 'STRUCTURED_PROGRAM');
      } else if (primaryTab === 'COACH_PLANS') {
        params.set('recordType', 'COACH_PLAN');
      }

      const response = await fetch(`/api/admin/global-workout-archive?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records ?? []);
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  }, [recordTypeFilter, primaryTab]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handleToggleDisabled = async (record: WorkoutArchiveGridRecord, disabled: boolean) => {
    const token = getAdminToken();
    if (!token) return;
    const response = await fetch(`/api/admin/global-workout-archive/${record.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ disabled }),
    });
    if (response.ok) await loadRecords();
  };

  const handleDelete = async (record: WorkoutArchiveGridRecord) => {
    if (!confirm(`Delete "${record.title}" from the global archive?`)) return;
    const token = getAdminToken();
    if (!token) return;
    const response = await fetch(`/api/admin/global-workout-archive/${record.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      setSelectedId(null);
      await loadRecords();
    }
  };

  const handleBulkAction = async (
    ids: string[],
    action: GlobalArchiveBulkAction
  ): Promise<boolean> => {
    const token = getAdminToken();
    if (!token) return false;
    const response = await fetch('/api/admin/global-workout-archive/bulk', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, action }),
    });
    if (!response.ok) return false;
    if (action === 'delete' && selectedId && ids.includes(selectedId)) {
      setSelectedId(null);
    }
    await loadRecords();
    return true;
  };

  const handleUpdatePictures = async (
    record: WorkoutArchiveGridRecord,
    thumbnailUrl: string | null,
    pictureUrls: string[]
  ) => {
    const token = getAdminToken();
    if (!token) return;
    setSavingPictures(true);
    try {
      const response = await fetch(`/api/admin/global-workout-archive/${record.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thumbnailUrl, pictureUrls }),
      });
      if (response.ok) await loadRecords();
    } finally {
      setSavingPictures(false);
    }
  };

  const handleCreateEntry = async (
    recordType: 'STRUCTURED_PROGRAM' | 'COACH_PLAN',
    title: string
  ) => {
    const token = getAdminToken();
    if (!token) return;
    const response = await fetch('/api/admin/global-workout-archive', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recordType, title }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.record?.id) setSelectedId(data.record.id);
      await loadRecords();
    } else {
      const err = await response.json().catch(() => ({}));
      alert(err.error ?? 'Failed to create entry');
    }
  };

  return (
    <GlobalWorkoutArchiveOfficialShell
      records={records}
      loading={loading}
      recordTypeFilter={recordTypeFilter}
      onRecordTypeFilterChange={setRecordTypeFilter}
      primaryTab={primaryTab}
      onPrimaryTabChange={setPrimaryTab}
      selectedId={selectedId}
      onSelectRecord={(r) => setSelectedId(r?.id ?? null)}
      onToggleDisabled={handleToggleDisabled}
      onDeleteRecord={handleDelete}
      onBulkAction={handleBulkAction}
      onUpdatePictures={handleUpdatePictures}
      onCreateEntry={handleCreateEntry}
      savingPictures={savingPictures}
      headerExtra={
        <button
          type="button"
          onClick={() => void loadRecords()}
          className="mt-3 rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Refresh catalog
        </button>
      }
    />
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  Search,
  CalendarHeart,
  SlidersHorizontal,
} from 'lucide-react';
import FavoriteWorkoutCard from '@/components/workouts/FavoriteWorkoutCard';
import WorkoutOverviewModal from '@/components/workouts/WorkoutOverviewModal';
import type { ImportWorkoutPayload } from './ImportWorkoutModal';

type FavoriteRecord = {
  id: string;
  name: string;
  description?: string | null;
  workoutData?: string;
  sports?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

interface ImportWorkoutFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  activeSection: 'A' | 'B' | 'C' | 'D';
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
}

function parseFavoriteTags(record: FavoriteRecord): string[] {
  try {
    if (record.workoutData) {
      const parsed = JSON.parse(record.workoutData);
      const raw = parsed?.workout?.tags;
      if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }
  if (record.sports) {
    return record.sports.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function formatLastUsed(dateStr?: string): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function ImportWorkoutFavoriteModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  onConfirm,
}: ImportWorkoutFavoriteModalProps) {
  const [records, setRecords] = useState<FavoriteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed'>('lastUsed');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewWorkout, setPreviewWorkout] = useState<FavoriteRecord | null>(null);
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
      const res = await fetch('/api/workouts/favorites', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json();
      const list: FavoriteRecord[] = Array.isArray(data)
        ? data
        : (data.favorites ?? data.workouts ?? []);

      const valid = list.filter((fav) => {
        if (!fav.workoutData) return true;
        try {
          JSON.parse(fav.workoutData);
          return true;
        } catch {
          return false;
        }
      });
      setRecords(valid);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setFilterTag('all');
    setSortBy('lastUsed');
    setShowFilters(false);
    setSelectedId(null);
    setPreviewWorkout(null);
    setConfirmOverwrite(false);
    void loadRecords();
  }, [isOpen, loadRecords]);

  const allTags = useMemo(() => {
    return Array.from(new Set(records.flatMap(parseFavoriteTags))).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records
      .filter((record) => {
        const q = searchQuery.trim().toLowerCase();
        const tags = parseFavoriteTags(record);
        const matchesSearch =
          !q ||
          record.name.toLowerCase().includes(q) ||
          (record.description ?? '').toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q));
        const matchesTag = filterTag === 'all' || tags.includes(filterTag);
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (
          formatLastUsed(b.updatedAt ?? b.createdAt) -
          formatLastUsed(a.updatedAt ?? a.createdAt)
        );
      });
  }, [records, searchQuery, filterTag, sortBy]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const selectRecord = (id: string) => {
    setSelectedId(id);
    setConfirmOverwrite(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/workouts/favorites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete');
        return;
      }
      if (selectedId === id) setSelectedId(null);
      await loadRecords();
    } catch {
      alert('Failed to delete favourite');
    }
  };

  const handleDuplicate = async (record: FavoriteRecord) => {
    const name = prompt('Name for the copy:', `${record.name} (copy)`);
    if (!name?.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/workouts/favorites', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duplicateFromFavoriteId: record.id,
          name: name.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to duplicate');
        return;
      }
      await loadRecords();
    } catch {
      alert('Failed to duplicate favourite');
    }
  };

  const handleImport = async () => {
    if (!selectedId) return;
    if (hasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        targetDayId: targetDay.id,
        sessionNumber: targetWorkout.sessionNumber,
        overwrite: hasContent,
        source: { type: 'favorite', favoriteId: selectedId },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
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
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Import mode
            </button>

            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                <CalendarHeart className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-semibold text-gray-800">Import from Favourites</span>
              </div>
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'lastUsed')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lastUsed">Recently Used</option>
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
                Favourite workouts saved from your planner, archive, or weekly structure. Use search
                and tags to find the workout to import into slot #{targetWorkout.sessionNumber}.
              </p>
            )}

            {loading ? (
              <p className="text-center py-10 text-gray-500 text-sm">Loading favourites…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                No favourite workouts saved yet. Use the star button on a workout to save it here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((record) => {
                  const selected = selectedId === record.id;
                  return (
                    <div
                      key={record.id}
                      onClick={() => selectRecord(record.id)}
                      className={`cursor-pointer rounded-xl transition ${
                        selected
                          ? 'ring-4 ring-yellow-400 ring-offset-2'
                          : 'hover:ring-2 hover:ring-blue-200 hover:ring-offset-1'
                      }`}
                    >
                      <FavoriteWorkoutCard
                        workout={record}
                        onDelete={(id) => void handleDelete(id)}
                        onOverview={(w) => setPreviewWorkout(w)}
                        onUseInPlanner={(w) => selectRecord(w.id)}
                        onDuplicate={(w) => void handleDuplicate(w)}
                        onUpdate={() => void loadRecords()}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {selectedId && hasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Workout #{targetWorkout.sessionNumber} already has moveframes. Confirm to replace
                  with &ldquo;{selectedRecord?.name ?? 'selected favourite'}&rdquo;.
                </span>
              </label>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-500 truncate">
              {selectedRecord
                ? `Selected: ${selectedRecord.name}`
                : 'No workout selected'}
            </p>
            <div className="flex gap-2 shrink-0">
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
                onClick={() => void handleImport()}
                disabled={isImporting || !selectedId || (hasContent && !confirmOverwrite)}
                className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewWorkout && (
        <WorkoutOverviewModal
          workout={previewWorkout}
          onClose={() => setPreviewWorkout(null)}
        />
      )}
    </>
  );
}

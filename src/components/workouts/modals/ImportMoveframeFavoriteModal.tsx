'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, Search, CalendarHeart, SlidersHorizontal } from 'lucide-react';
import { getSportDisplayName } from '@/constants/moveframe.constants';
import {
  moveframeDescription,
  moveframeDuration,
  moveframeRipSets,
} from '@/lib/importMoveframePreview';
import MoveframeImportDetailTable from './MoveframeImportDetailTable';
import type { ImportMoveframePayload } from './ImportMoveframeModal';

type MovelapRow = {
  repetitionNumber?: number;
  muscularSector?: string | null;
  exercise?: string | null;
  reps?: number | null;
  pause?: string | null;
  style?: string | null;
  distance?: number | null;
  speed?: string | null;
};

type FavoriteMoveframe = {
  id: string;
  name: string;
  description?: string;
  sport: string;
  letter: string;
  lapsCount: number;
  workoutName?: string;
  lastUsed?: string | Date;
  createdAt?: string | Date;
  section?: { name: string; color: string | null } | null;
  moveframeData?: {
    letter?: string;
    sport?: string;
    description?: string;
    section?: { name: string; color: string | null } | null;
    movelaps?: MovelapRow[];
  };
};

interface ImportMoveframeFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetWorkout: { id: string; sessionNumber: number };
  onConfirm: (payload: ImportMoveframePayload) => Promise<void>;
}

function formatLastUsed(dateStr?: string | Date): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sectionForRecord(record: FavoriteMoveframe) {
  return record.section ?? record.moveframeData?.section ?? null;
}

function movelapsForRecord(record: FavoriteMoveframe | null): MovelapRow[] {
  if (!record?.moveframeData?.movelaps) return [];
  return record.moveframeData.movelaps;
}

export default function ImportMoveframeFavoriteModal({
  isOpen,
  onClose,
  onBack,
  targetWorkout,
  onConfirm,
}: ImportMoveframeFavoriteModalProps) {
  const [records, setRecords] = useState<FavoriteMoveframe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed'>('lastUsed');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRecords([]);
        return;
      }
      const res = await fetch('/api/workouts/moveframes/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json();
      setRecords(Array.isArray(data.moveframes) ? data.moveframes : []);
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
    void loadRecords();
  }, [isOpen, loadRecords]);

  const allTags = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.sport).filter(Boolean))).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records
      .filter((record) => {
        const q = searchQuery.trim().toLowerCase();
        const sectionName = sectionForRecord(record)?.name ?? '';
        const matchesSearch =
          !q ||
          record.name.toLowerCase().includes(q) ||
          (record.description ?? '').toLowerCase().includes(q) ||
          record.sport.toLowerCase().includes(q) ||
          sectionName.toLowerCase().includes(q);
        const matchesTag = filterTag === 'all' || record.sport === filterTag;
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return formatLastUsed(b.lastUsed ?? b.createdAt) - formatLastUsed(a.lastUsed ?? a.createdAt);
      });
  }, [records, searchQuery, filterTag, sortBy]);

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const previewMf = selected?.moveframeData ?? selected;
  const detailMovelaps = movelapsForRecord(selected);

  const handleImport = async () => {
    if (!selectedId) return;
    setIsImporting(true);
    try {
      await onConfirm({
        targetWorkoutId: targetWorkout.id,
        source: { type: 'moveframe', sourceMoveframeId: selectedId },
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
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
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
                <span className="text-sm font-semibold text-gray-800">
                  Import from <strong>Favourites</strong>
                </span>
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
                    {getSportDisplayName(tag)}
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
                Favourite moveframes saved from your workouts. Filter by sport tag, search by name or
                section, then select a row to preview movelaps before importing into Workout #
                {targetWorkout.sessionNumber}.
              </p>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Section</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Sport</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[200px]">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Duration</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Rip\sets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                          Loading favourites…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-amber-800 bg-amber-50">
                          No favourite moveframes saved yet. Open a workout, click{' '}
                          <strong>Options</strong> on a moveframe row, then choose{' '}
                          <strong>Save to Favs</strong>.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((mf) => {
                        const section = sectionForRecord(mf);
                        const data = mf.moveframeData ?? mf;
                        const isSelected = selectedId === mf.id;
                        return (
                          <tr
                            key={mf.id}
                            onClick={() => setSelectedId(mf.id)}
                            className={`border-t cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-400'
                                : 'hover:bg-blue-50/50'
                            }`}
                          >
                            <td className="px-3 py-2">
                              {section ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{ backgroundColor: section.color || '#3b82f6' }}
                                  />
                                  <span className="truncate max-w-[80px]">{section.name}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {getSportDisplayName(mf.sport)}
                            </td>
                            <td className="px-3 py-2">{moveframeDescription(data)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {moveframeDuration(data)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-red-600 font-medium">
                              {moveframeRipSets(data)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <MoveframeImportDetailTable
              section={selected ? sectionForRecord(selected) : null}
              sport={selected?.sport}
              movelaps={selected ? detailMovelaps : []}
              emptyMessage="Select a moveframe from the list above"
              fallbackDescription={
                selected && detailMovelaps.length === 0
                  ? `${moveframeDescription(previewMf)} (no movelap rows)`
                  : undefined
              }
            />
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-500 truncate">
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
                disabled={isImporting || !selectedId}
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

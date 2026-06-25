'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, Search } from 'lucide-react';
import { getSportFastPlanningCategory } from '@/constants/moveframe.constants';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mapPersonalArchiveToGridRecords, getSportDisplayName } from '@/lib/personalArchiveGridMapper';
import { sportLabel } from '@/lib/globalWorkoutArchiveMapper';
import { getSportIcon } from '@/utils/sportIcons';
import {
  getMoveframesFromArchiveRecord,
  moveframeDescription,
  moveframeDuration,
  moveframeRipSets,
} from '@/lib/importMoveframePreview';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import type { ImportMoveframePayload } from './ImportMoveframeModal';

type CatalogMode = 'general_archive' | 'shared_users' | 'shared_friends';

interface ImportMoveframeFromCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetWorkout: { id: string; sessionNumber: number };
  catalogMode: CatalogMode;
  onConfirm: (payload: ImportMoveframePayload) => Promise<void>;
}

const TITLES: Record<CatalogMode, string> = {
  general_archive: 'Import from General Archive',
  shared_users: 'Import from shared by users',
  shared_friends: 'Import from shared by your friends',
};

export default function ImportMoveframeFromCatalogModal({
  isOpen,
  onClose,
  onBack,
  targetWorkout,
  catalogMode,
  onConfirm,
}: ImportMoveframeFromCatalogModalProps) {
  const [records, setRecords] = useState<WorkoutArchiveGridRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedMoveframeKey, setSelectedMoveframeKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRecords([]);
        return;
      }

      if (catalogMode === 'general_archive') {
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
        return;
      }

      const endpoint =
        catalogMode === 'shared_friends'
          ? '/api/workouts/shared-friends-weekly-plans?recordType=WORKOUT'
          : '/api/workouts/shared-weekly-plans?recordType=WORKOUT';

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.records) ? data.records : [];
      setRecords(
        list.map(
          (entry: any) =>
            ({
              id: entry.id,
              recordType: 'WORKOUT' as const,
              title: entry.title || 'Shared workout',
              mainSport: entry.mainSport,
              archiveSource: 'global',
              sharedByUsername: entry.authorUsername ?? entry.sharedByUsername,
              _raw: entry,
            }) as WorkoutArchiveGridRecord
        )
      );
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [catalogMode]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSelectedRecordId(null);
    setSelectedMoveframeKey('');
    void loadRecords();
  }, [isOpen, loadRecords]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        sportLabel(r.mainSport ?? '')?.toLowerCase().includes(q) ||
        r.sharedByUsername?.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  const moveframes = useMemo(
    () => getMoveframesFromArchiveRecord(selectedRecord),
    [selectedRecord]
  );

  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedMoveframeKey('');
      return;
    }
    const first = moveframes[0];
    if (first) {
      const key =
        typeof first.id === 'string'
          ? first.id
          : `idx:${0}:letter:${first.letter ?? 'A'}`;
      setSelectedMoveframeKey(key);
    } else {
      setSelectedMoveframeKey('');
    }
  }, [selectedRecordId, moveframes]);

  const selectedMoveframe = useMemo(() => {
    if (!selectedMoveframeKey || !moveframes.length) return null;
    if (selectedMoveframeKey.startsWith('idx:')) {
      const match = selectedMoveframeKey.match(/^idx:(\d+)/);
      const idx = match ? parseInt(match[1], 10) : 0;
      return moveframes[idx] ?? null;
    }
    return moveframes.find((mf: any) => mf.id === selectedMoveframeKey) ?? null;
  }, [moveframes, selectedMoveframeKey]);

  const moveframeKey = (mf: any, index: number) =>
    typeof mf.id === 'string' ? mf.id : `idx:${index}:letter:${mf.letter ?? 'A'}`;

  const handleImport = async () => {
    if (!selectedRecord || !selectedMoveframe) return;
    setIsImporting(true);
    try {
      if (selectedRecord.archiveSource === 'global') {
        const idx = moveframes.indexOf(selectedMoveframe);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-purple-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <h2 className="text-lg font-bold">{TITLES[catalogMode]}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-purple-600 underline">
              ← Import mode
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workouts…"
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No workouts found.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {filtered.map((record) => {
                    const mfs = getMoveframesFromArchiveRecord(record);
                    if (!mfs.length) return null;
                    return (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setSelectedRecordId(record.id)}
                        className={`w-full text-left p-3 border-2 rounded-lg transition-colors ${
                          selectedRecordId === record.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{record.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {record.mainSport && (
                            <span>{getSportIcon(record.mainSport, 'emoji')}</span>
                          )}
                          <span>
                            {record.mainSport
                              ? getSportDisplayName(record.mainSport)
                              : '—'}
                          </span>
                          <span>· {mfs.length} MF</span>
                          {record.sharedByUsername && <span>· @{record.sharedByUsername}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedRecord && moveframes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-purple-100 px-3 py-2 text-sm font-bold text-purple-900">
                      Select moveframe
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 w-8" />
                          <th className="px-2 py-1 text-left">MF</th>
                          <th className="px-2 py-1 text-left">Sport</th>
                          <th className="px-2 py-1 text-left">Description</th>
                          <th className="px-2 py-1 text-left">Dur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moveframes.map((mf: any, index: number) => {
                          const key = moveframeKey(mf, index);
                          return (
                            <tr
                              key={key}
                              className={`border-t cursor-pointer ${
                                selectedMoveframeKey === key ? 'bg-purple-50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedMoveframeKey(key)}
                            >
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="radio"
                                  checked={selectedMoveframeKey === key}
                                  onChange={() => setSelectedMoveframeKey(key)}
                                />
                              </td>
                              <td className="px-2 py-1 font-bold">{mf.letter ?? String.fromCharCode(65 + index)}</td>
                              <td className="px-2 py-1">{mf.sport}</td>
                              <td className="px-2 py-1">{moveframeDescription(mf)}</td>
                              <td className="px-2 py-1">{moveframeDuration(mf)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {selectedMoveframe && (
                      <div className="px-3 py-2 text-xs text-gray-600 border-t bg-gray-50">
                        Rip/sets: {moveframeRipSets(selectedMoveframe)} · Category:{' '}
                        {getSportFastPlanningCategory(selectedMoveframe.sport) ?? '—'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={!selectedMoveframe || isImporting}
              className="px-5 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {isImporting ? 'Importing…' : 'Import moveframe'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

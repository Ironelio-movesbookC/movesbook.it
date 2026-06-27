'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  Search,
  Star,
  Edit2,
  Trash2,
  Copy,
  Eye,
  CalendarHeart,
  SlidersHorizontal,
} from 'lucide-react';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import { favoritePlanDataToDisplayWeek } from '@/lib/favoriteWeekPlan';
import WeekTotalsModal from '@/components/workouts/modals/WeekTotalsModal';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

export type FavoriteWeeklyPlanCard = {
  id: string;
  name: string;
  description: string;
  weekStart: string;
  daysCount: number;
  workoutsCount: number;
  lastUsed: string;
  createdAt: string;
  tags: string[];
  planData?: unknown;
};

interface ImportFavoriteWeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
}

function formatSavedFrom(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/** Relative "last used" label — guards invalid dates (avoids NaN months ago). */
function formatLastUsedRelative(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

function mapApiPlan(plan: Record<string, unknown>): FavoriteWeeklyPlanCard {
  const lastUsedRaw =
    (typeof plan.lastUsed === 'string' && plan.lastUsed) ||
    (typeof plan.updatedAt === 'string' && plan.updatedAt) ||
    (typeof plan.createdAt === 'string' && plan.createdAt) ||
    new Date().toISOString();
  const createdAt =
    (typeof plan.createdAt === 'string' && plan.createdAt) || lastUsedRaw;

  return {
    id: String(plan.id),
    name: String(plan.name || 'Unnamed week'),
    description: String(plan.description || ''),
    weekStart: 'Monday',
    daysCount: Number(plan.daysCount) || 0,
    workoutsCount: Number(plan.workoutsCount) || 0,
    lastUsed: lastUsedRaw,
    createdAt,
    tags: Array.isArray(plan.tags) ? (plan.tags as string[]) : [],
    planData: plan.planData,
  };
}

export default function ImportFavoriteWeeklyPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportFavoriteWeeklyPlanModalProps) {
  const [plans, setPlans] = useState<FavoriteWeeklyPlanCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed'>('lastUsed');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewPlan, setViewPlan] = useState<FavoriteWeeklyPlanCard | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPlans([]);
        return;
      }
      const res = await fetch('/api/workouts/plans/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPlans([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.plans) ? data.plans : [];
      setPlans(list.map((p: Record<string, unknown>) => mapApiPlan(p)));
    } catch {
      setPlans([]);
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
    setSelectedIds([]);
    setViewPlan(null);
    setConfirmOverwrite(false);
    void loadPlans();
  }, [isOpen, loadPlans]);

  const allTags = useMemo(() => {
    return Array.from(new Set(plans.flatMap((p) => p.tags))).sort();
  }, [plans]);

  const filteredPlans = useMemo(() => {
    return plans
      .filter((plan) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          plan.name.toLowerCase().includes(q) ||
          plan.description.toLowerCase().includes(q);
        const matchesTag = filterTag === 'all' || plan.tags.includes(filterTag);
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });
  }, [plans, searchQuery, filterTag, sortBy]);

  const targetWeeks = useMemo(() => {
    const sorted = [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const startIdx = sorted.findIndex((w) => w.weekNumber === anchorWeek.weekNumber);
    if (startIdx === -1) return [];
    return sorted.slice(startIdx, startIdx + Math.max(1, selectedIds.length));
  }, [yearlyWeeks, anchorWeek.weekNumber, selectedIds.length]);

  const anyTargetHasContent = useMemo(
    () => targetWeeks.some((w) => !isWeekEmpty(w)),
    [targetWeeks]
  );

  const toggleSelect = (planId: string) => {
    setSelectedIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
    setConfirmOverwrite(false);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Remove this favourite week from your list?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/workouts/plans/favorites?id=${encodeURIComponent(planId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete');
        return;
      }
      setSelectedIds((prev) => prev.filter((id) => id !== planId));
      await loadPlans();
    } catch {
      alert('Failed to delete favourite');
    }
  };

  const handleDuplicate = async (plan: FavoriteWeeklyPlanCard) => {
    const name = prompt('Name for the copy:', `${plan.name} (copy)`);
    if (!name?.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/workouts/plans/favorites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duplicateFromFavoriteId: plan.id,
          name: name.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to duplicate');
        return;
      }
      await loadPlans();
    } catch {
      alert('Failed to duplicate favourite');
    }
  };

  const handleCopy = async () => {
    if (selectedIds.length === 0) return;
    if (anyTargetHasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        anchorWeekNumber: anchorWeek.weekNumber,
        overwrite: anyTargetHasContent,
        source: { type: 'favorite', favoriteIds: selectedIds },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const previewWeek = viewPlan?.planData
    ? favoritePlanDataToDisplayWeek(viewPlan.planData)
    : null;

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
              <div className="flex items-center gap-2">
                <CalendarHeart className="w-5 h-5 opacity-90" />
                <h2 className="text-lg font-bold">Import a weekly plan</h2>
              </div>
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

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
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
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'lastUsed')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lastUsed">Recently Used</option>
                <option value="name">Name</option>
              </select>
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
                Showing favourites with workouts saved from your Yearly Plan, Archive, or Weekly
                Structure. Use search and tags to narrow the list.
              </p>
            )}

            {loading ? (
              <p className="text-center py-10 text-gray-500 text-sm">Loading favourites…</p>
            ) : filteredPlans.length === 0 ? (
              <p className="text-center py-10 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                No favourite weekly plans found. Save a week from your Yearly Plan using the Save
                (star) button on a week header.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPlans.map((plan) => {
                  const selected = selectedIds.includes(plan.id);
                  return (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-xl border-2 p-5 transition shadow-sm ${
                        selected
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
                          <h3 className="font-bold text-gray-900 truncate">{plan.name}</h3>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              alert('To rename a favourite, open My Settings → Favourites.')
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit name in Favourites settings"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(plan.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove from favourites"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 mb-4 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Saved from:</span>
                          <span className="font-semibold text-gray-900">
                            {formatSavedFrom(plan.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Week starts:</span>
                          <span className="font-semibold text-gray-900">{plan.weekStart}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Training days:</span>
                          <span className="font-semibold text-gray-900">
                            {plan.daysCount} days
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Workouts:</span>
                          <span className="font-semibold text-gray-900">{plan.workoutsCount}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Last used:</span>
                          <span className="font-semibold text-gray-900">
                            {formatLastUsedRelative(plan.lastUsed)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelect(plan.id)}
                          className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition ${
                            selected
                              ? 'bg-blue-700 text-white'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {selected ? 'Selected' : 'Use Plan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDuplicate(plan)}
                          className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                          title="Duplicate favourite"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewPlan(plan)}
                          className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                          title="Preview week"
                          disabled={!plan.planData}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedIds.length > 0 && anyTargetHasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Target week(s) in your Yearly Plan already contain workouts. Confirm to replace
                  them with the selected favourite(s).
                </span>
              </label>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-500">
              {selectedIds.length === 0
                ? 'No weeks selected'
                : `${selectedIds.length} week${selectedIds.length === 1 ? '' : 's'} selected`}
            </p>
            <div className="flex gap-2">
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
                onClick={() => void handleCopy()}
                disabled={
                  isImporting ||
                  selectedIds.length === 0 ||
                  (anyTargetHasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting
                  ? 'Copying…'
                  : `Copy to ${selectedIds.length} Week(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewWeek && (
        <WeekTotalsModal
          isOpen={Boolean(viewPlan)}
          week={previewWeek}
          onClose={() => setViewPlan(null)}
        />
      )}
    </>
  );
}

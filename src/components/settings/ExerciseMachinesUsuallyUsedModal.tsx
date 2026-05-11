'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export type CatalogMachineRow = {
  id: string;
  nameEnglish: string;
  originalName: string;
  companyName: string;
  code: string;
  pictureAUrl: string | null;
  pictureBUrl: string | null;
};

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('adminToken')
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const PAGE_SIZE = 10;

type Props = {
  open: boolean;
  initialSelectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
};

export default function ExerciseMachinesUsuallyUsedModal({
  open,
  initialSelectedIds,
  onClose,
  onSave,
}: Props) {
  const [machines, setMachines] = useState<CatalogMachineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const baselineRef = useRef<string[]>([]);

  const loadMachines = useCallback(async (filterName: string) => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (filterName.trim()) q.set('filterName', filterName.trim());
      const res = await fetch(`/api/workouts/sport-machines?${q.toString()}`, { headers: authHeaders() });
      if (!res.ok) {
        setMachines([]);
        setError(
          res.status === 401
            ? 'Sign in to load your Sport Machines catalog (Technical Settings → Machines).'
            : 'Could not load machines.'
        );
        return;
      }
      const data = await res.json();
      setMachines(Array.isArray(data.machines) ? data.machines : []);
    } catch {
      setMachines([]);
      setError('Network error while loading machines.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Stable for effect deps when the parent passes a new array reference with the same ids. */
  const initialSelectedIdsKey = JSON.stringify(initialSelectedIds);

  useEffect(() => {
    if (!open) return;
    const ids = JSON.parse(initialSelectedIdsKey) as string[];
    baselineRef.current = [...ids];
    setSelected(new Set(ids));
    setSearchDraft('');
    setPage(1);
    void loadMachines('');
  }, [open, initialSelectedIdsKey, loadMachines]);

  const pageCount = Math.max(1, Math.ceil(machines.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount);
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return machines.slice(start, start + PAGE_SIZE);
  }, [machines, pageSafe]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const firstSelected = useMemo(() => {
    const id = Array.from(selected)[0];
    if (!id) return null;
    return machines.find((m) => m.id === id) ?? null;
  }, [selected, machines]);

  const runSearch = () => {
    setPage(1);
    void loadMachines(searchDraft);
  };

  const handleReset = () => {
    setSearchDraft('');
    setPage(1);
    void loadMachines('');
    setSelected(new Set(baselineRef.current));
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog">
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-violet-700 px-4 py-3 text-white">
          <h3 className="text-lg font-bold">Machines usually used</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              Reset
            </button>
            <span className="text-xs text-gray-600">
              Selected ({selected.size}) · {machines.length} in list
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-[2rem] rounded px-2 py-1 text-sm font-semibold ${
                  n === pageSafe ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="shrink-0 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="shrink-0 px-4 py-2 text-sm text-gray-600">Loading…</p> : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          <div className="flex min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
              Equipments usable with this exercise
            </div>
            <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(ev) => setSearchDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') {
                      ev.preventDefault();
                      runSearch();
                    }
                  }}
                  placeholder="Search by name, company, or code…"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  aria-label="Search machines"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  Search
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {pageSlice.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-start gap-2 rounded border border-transparent px-2 py-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-gray-900">{m.nameEnglish || m.originalName || '—'}</span>
                    <span className="block text-xs text-gray-500">
                      {m.companyName}
                      {m.code ? ` · ${m.code}` : ''}
                    </span>
                  </span>
                </label>
              ))}
              {!loading && pageSlice.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">No machines match this search.</p>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-sky-600 bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Equipment selected</div>
            <div className="flex flex-1 flex-col items-center justify-center bg-amber-50/40 p-4">
              {firstSelected?.pictureAUrl || firstSelected?.pictureBUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(firstSelected.pictureAUrl || firstSelected.pictureBUrl) as string}
                  alt=""
                  className="max-h-64 max-w-full rounded-lg border border-amber-200 object-contain shadow-sm"
                />
              ) : (
                <p className="text-center text-sm text-gray-600">
                  {firstSelected
                    ? 'No preview image on file for this machine.'
                    : 'Select one or more machines on the left to preview the first selection.'}
                </p>
              )}
              {firstSelected ? (
                <p className="mt-3 text-center text-xs font-medium text-gray-800">{firstSelected.nameEnglish || firstSelected.originalName}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { ExercisePathologyCatalogItem } from '@/constants/tools.constants';

type Props = {
  pathologies: ExercisePathologyCatalogItem[];
  setPathologies: React.Dispatch<React.SetStateAction<ExercisePathologyCatalogItem[]>>;
};

function newPathologyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `path-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export default function ExercisePathologiesCatalogSection({ pathologies, setPathologies }: Props) {
  const sorted = [...pathologies].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= sorted.length) return;
    const copy = [...sorted];
    const [row] = copy.splice(from, 1);
    copy.splice(to, 0, row);
    setPathologies(copy.map((p, i) => ({ ...p, order: i })));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">Pathologies (contraindications catalog)</h3>
        <p className="mt-2 text-sm text-gray-700">
          Define reusable tags for conditions where an exercise should <span className="font-semibold">not</span> be
          suggested. In <span className="font-semibold">Technical Settings → Exercise Bank</span>, each exercise can
          multi-tag these entries (same idea as sports multitag). The bank table shows only counts until you click them.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold uppercase tracking-wide text-rose-800">Catalog entries</h4>
          <button
            type="button"
            onClick={() =>
              setPathologies((prev) => {
                const next = [...prev, { id: newPathologyId(), name: '', order: prev.length }];
                return next.map((p, i) => ({ ...p, order: i }));
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            No pathology tags yet. Press <span className="font-semibold">Add</span> to create the first one.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {sorted.map((row, idx) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-center"
              >
                <span className="shrink-0 text-xs font-bold text-gray-500">#{idx + 1}</span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(ev) =>
                    setPathologies((prev) =>
                      prev.map((p) => (p.id === row.id ? { ...p, name: ev.target.value } : p))
                    )
                  }
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Uncontrolled hypertension"
                />
                <div className="flex shrink-0 flex-wrap gap-1">
                  <button
                    type="button"
                    title="Move up"
                    disabled={idx === 0}
                    onClick={() => reorder(idx, idx - 1)}
                    className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={idx === sorted.length - 1}
                    onClick={() => reorder(idx, idx + 1)}
                    className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() =>
                      setPathologies((prev) => {
                        const next = prev.filter((p) => p.id !== row.id);
                        return next.map((p, i) => ({ ...p, order: i }));
                      })
                    }
                    className="rounded border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

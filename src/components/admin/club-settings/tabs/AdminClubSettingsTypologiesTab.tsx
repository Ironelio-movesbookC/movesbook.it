'use client';

import { useMemo, useState } from 'react';

type TypologyRow = {
  id: string;
  areaActivity: string;
  blocked: boolean;
  activityName: string;
  room: string;
  cost: string;
  limit: string;
  audio: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function AdminClubSettingsTypologiesTab() {
  // Placeholder: will be wired to API later.
  const [rows] = useState<TypologyRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length, pageSize]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, pageSize, safePage]);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageRows.forEach((r) => next.delete(r.id));
      } else {
        pageRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold rounded border transition border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200"
        >
          Add new
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold rounded border transition border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          disabled={selected.size !== 1}
          title={selected.size !== 1 ? 'Select exactly 1 row to modify' : undefined}
        >
          Modify
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold rounded border transition border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          disabled={selected.size === 0}
          title={selected.size === 0 ? 'Select at least 1 row to delete' : undefined}
        >
          Delete
        </button>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-[#4a8f96] text-white">
                <th className="w-10 px-2 py-2 text-left font-semibold border-r border-[#3d7a80]">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="rounded border-gray-500"
                    aria-label="Select all rows on page"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Area activity
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Block
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Name of activity
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Room
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Cost
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Limit
                </th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80] whitespace-nowrap">
                  Audio
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    No typologies yet.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                    <td className="px-2 py-2 border-t border-gray-300">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="rounded border-gray-500"
                        aria-label={`Select ${row.activityName}`}
                      />
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300">{row.areaActivity}</td>
                    <td className="px-3 py-2 border-t border-gray-300">
                      <button
                        type="button"
                        className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold border ${
                          row.blocked
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                        // placeholder: real toggle later
                        onClick={() => undefined}
                      >
                        {row.blocked ? 'Blocked' : 'Unblocked'}
                      </button>
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300 font-medium">{row.activityName}</td>
                    <td className="px-3 py-2 border-t border-gray-300">{row.room}</td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.cost}</td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.limit}</td>
                    <td className="px-3 py-2 border-t border-gray-300">{row.audio}</td>
                    <td className="px-3 py-2 border-t border-gray-300">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs font-semibold rounded border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        …
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-300 bg-white px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
              className="h-9 border border-gray-300 bg-white px-2 text-sm rounded"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              className="h-9 px-3 rounded border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </button>
            <div className="text-sm text-gray-700">
              Page <span className="font-semibold">{safePage}</span> / {totalPages}
            </div>
            <button
              type="button"
              className="h-9 px-3 rounded border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


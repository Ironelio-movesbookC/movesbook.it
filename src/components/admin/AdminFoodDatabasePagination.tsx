'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminFoodDatabasePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export default function AdminFoodDatabasePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: AdminFoodDatabasePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-t-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm">
      <span className="text-gray-600">
        {total === 0 ? 'No rows' : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-gray-600">
            <span className="text-xs">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded-sm px-2 py-1 text-sm bg-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40 hover:bg-gray-100"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="text-gray-700 min-w-[5rem] text-center">
          Page {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 disabled:opacity-40 hover:bg-gray-100"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

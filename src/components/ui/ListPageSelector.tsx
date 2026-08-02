'use client';

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export default function ListPageSelector({
  page,
  totalPages,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: Props) {
  if (totalPages <= 0) return null;

  const pages: number[] = [];
  const maxButtons = 6;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-900"
        aria-label="Items per page"
      >
        {pageSizeOptions.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-700 text-white disabled:opacity-40"
      >
        Prev
      </button>

      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`min-w-[2rem] px-2 py-1 text-xs font-semibold rounded border ${
            page === n
              ? 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-800 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

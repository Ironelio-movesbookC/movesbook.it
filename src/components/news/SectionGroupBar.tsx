'use client';

import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

type DisplayMode = 'default' | 'list' | 'miniature' | 'section' | 'grid' | 'browser';

interface SectionGroupBarProps {
  currentMode?: DisplayMode;
  currentLimit?: number;
  onLimitChange?: (limit: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  hideShowStatus?: boolean;
  onHideShowChange?: (status: boolean) => void;
}

export default function SectionGroupBar({
  currentMode = 'default',
  currentLimit = 10,
  onLimitChange,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  hideShowStatus = false,
  onHideShowChange,
}: SectionGroupBarProps) {
  const limits = currentMode === 'grid' 
    ? [9, 15, 21, 24]
    : [5, 10, 15, 20];

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value);
    onLimitChange?.(newLimit);
  };

  const handleHideShow = () => {
    onHideShowChange?.(!hideShowStatus);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {currentMode !== 'section' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Items per page:</label>
              <select
                value={currentLimit}
                onChange={handleLimitChange}
                className="px-3 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {limits.map((lim) => (
                  <option key={lim} value={lim}>
                    {lim}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleHideShow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {hideShowStatus ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Show Sidebar</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

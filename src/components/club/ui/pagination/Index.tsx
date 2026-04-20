'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { Pagination } from 'react-headless-pagination';

import { updateSearchParams } from '@/utils/common';

export const PaginationBar = ({
  pageCount,
  onPageChange,
  className = '',
  edgePageCount = 2,
}: {
  pageCount: number;
  onPageChange?: (page: number) => void; // 1-based for API consistency
  className?: string;
  edgePageCount?: number;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();


  // URL is 1-based → convert to 0-based for UI
  const getInitialPage = () => {
    const pageFromUrl = Number(searchParams?.get('page') ?? '1');
    return Math.max(pageFromUrl - 1, 0);
  };

  const [page, setPage] = useState<number>(getInitialPage());

  // Sync when URL changes (back/forward navigation)
  useEffect(() => {
    setPage(getInitialPage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changePage = useCallback(
    (newPage: number) => {
      setPage(newPage);

      // convert UI (0-based) → API/URL (1-based)
      const apiPage = newPage + 1;

      if (onPageChange) {
        onPageChange(apiPage);
      } else {
        updateSearchParams(router, searchParams, 'page', String(apiPage));
      }
    },
    [router, searchParams, onPageChange]
  );

  if (pageCount <= 1) return null;

  return (
    <div className={className}>
      <Pagination
        totalPages={pageCount}
        edgePageCount={edgePageCount}
        middlePagesSiblingCount={2}
        currentPage={page}
        setCurrentPage={changePage}
        truncableText="..."
        className="text-gray-700 flex items-center justify-center gap-3"
      >
        <nav>
          <ul className="flex items-center gap-2">
            {/* PREV BUTTON */}
            <Pagination.PrevButton className="px-3 py-2 border rounded-lg text-sm font-medium border-gray-600 text-gray-500 hover:bg-gray-700">
              Prev
            </Pagination.PrevButton>

            {/* PAGE BUTTONS */}
            <Pagination.PageButton
              activeClassName="bg-gray-800 text-white border-gray-600"
              inactiveClassName="hover:bg-gray-500 hover:text-white"
              className="text-gray-500 min-w-8 px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium transition-colors"
            />

            {/* NEXT BUTTON */}
            <Pagination.NextButton className="px-3 py-2 border rounded-lg text-sm font-medium border-gray-600 text-gray-500 hover:bg-gray-700">
              Next
            </Pagination.NextButton>
          </ul>
        </nav>
      </Pagination>
    </div>
  );
};
'use client';

import ProcedureArchiveTabs from './ProcedureArchiveTabs';
import type { ProcedureArchiveShellProps } from './types';

export default function ProcedureArchiveShell({
  title,
  activeTab,
  tabs,
  headerAction,
  tabsTrailing,
  error,
  footerHint,
  children,
  pagination,
}: ProcedureArchiveShellProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center bg-teal-800 text-white px-4 py-3 rounded-t-lg">
        <h1 className="text-lg font-semibold">{title}</h1>
        {headerAction}
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        {tabs.length > 0 && (
          <ProcedureArchiveTabs tabs={tabs} activeTab={activeTab} trailing={tabsTrailing} />
        )}
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {children}
        {pagination}
        {footerHint && <p className="text-xs text-gray-500 mt-2">{footerHint}</p>}
      </div>
    </div>
  );
}

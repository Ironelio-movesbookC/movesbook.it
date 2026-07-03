'use client';

import React from 'react';
import { Upload } from 'lucide-react';
import {
  FOOD_DATABASE_DISPLAY_MENU,
  type FoodDatabaseSourceId,
} from '@/constants/foodDatabaseSources';

interface MenuSourceStatus {
  configured?: boolean;
  missingEnv?: string[];
  importStatus?: { imported: boolean; foodCount: number; recipeCount: number };
}

interface AdminFoodDatabaseSourceMenuProps {
  activeSourceId: FoodDatabaseSourceId;
  sourceStatuses: Record<string, MenuSourceStatus>;
  selecting?: boolean;
  importingId?: FoodDatabaseSourceId | null;
  onSelect: (sourceId: FoodDatabaseSourceId) => void;
  onImport?: (sourceId: FoodDatabaseSourceId) => void;
}

export default function AdminFoodDatabaseSourceMenu({
  activeSourceId,
  sourceStatuses,
  selecting = false,
  importingId = null,
  onSelect,
  onImport,
}: AdminFoodDatabaseSourceMenuProps) {
  return (
    <div className="mb-4 rounded-lg border border-slate-300 bg-white overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
        Food composition database
      </div>
      <div className="divide-y divide-slate-200">
        {FOOD_DATABASE_DISPLAY_MENU.map((source) => {
          const active = activeSourceId === source.id;
          const status = sourceStatuses[source.id];
          const needsSetup = status?.configured === false;
          const isImportMode = source.accessMode === 'import';
          const imported = Boolean(status?.importStatus?.imported);
          const notImported = isImportMode && !imported;
          const busy = importingId === source.id;
          const showImportBtn = isImportMode && onImport && !needsSetup;

          return (
            <div
              key={source.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                active ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'
              }`}
            >
              <button
                type="button"
                disabled={selecting || needsSetup}
                onClick={() => onSelect(source.id)}
                className={`min-w-0 flex-1 text-left flex items-start gap-3 transition ${
                  needsSetup ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <span
                  className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {source.menuIndex}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {source.label}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">{source.description}</span>
                  {needsSetup && status?.missingEnv?.length ? (
                    <span className="block text-xs text-red-600 mt-1 font-medium">
                      {status.missingEnv[0]?.startsWith('Missing file:')
                        ? `Bundled file not found: ${status.missingEnv[0].replace('Missing file: ', '')}`
                        : `Setup required: ${status.missingEnv.join(', ')}`}
                    </span>
                  ) : null}
                  <span className="mt-1 inline-flex flex-wrap gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        source.accessMode === 'live'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {source.accessMode === 'live' ? 'Live search' : 'Local copy'}
                    </span>
                    {notImported && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        Not imported yet
                      </span>
                    )}
                    {isImportMode && imported && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                        {status?.importStatus?.foodCount ?? 0} foods
                        {(status?.importStatus?.recipeCount ?? 0) > 0
                          ? ` · ${status?.importStatus?.recipeCount} recipes`
                          : ''}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              {showImportBtn && (
                <button
                  type="button"
                  disabled={!!importingId || selecting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onImport(source.id);
                  }}
                  className="shrink-0 mt-0.5 inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  title={
                    imported
                      ? 'Re-import this database (replaces only this source)'
                      : 'Import this database into local storage'
                  }
                >
                  <Upload className="w-3.5 h-3.5" />
                  {busy ? 'Importing…' : 'Import'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

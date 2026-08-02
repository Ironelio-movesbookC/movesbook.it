'use client';

import React from 'react';
import { Database, Upload } from 'lucide-react';
import {
  IMPORTABLE_FOOD_DATABASE_SOURCES,
  LIVE_FOOD_DATABASE_SOURCES,
  type FoodDatabaseSourceId,
} from '@/constants/foodDatabaseSources';

interface SourceRow {
  id: FoodDatabaseSourceId;
  label: string;
  description: string;
  accessMode: 'import' | 'live';
  configured?: boolean;
  missingEnv?: string[];
  importStatus?: {
    imported: boolean;
    importedAt: string | null;
    foodCount: number;
    recipeCount: number;
    summary: string | null;
  };
}

interface AdminFoodDatabaseSettingsProps {
  sources: SourceRow[];
  importingId: FoodDatabaseSourceId | null;
  onImport: (sourceId: FoodDatabaseSourceId, replace: boolean) => void;
  onImportBundled: (replace: boolean) => void;
}

export default function AdminFoodDatabaseSettings({
  sources,
  importingId,
  onImport,
  onImportBundled,
}: AdminFoodDatabaseSettingsProps) {
  const importable = sources.filter((s) => s.accessMode === 'import');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Food &amp; Recipes Settings</h3>
        <p className="text-sm text-slate-600 mt-1">
          Swiss (FOSAV) and Italy table II are imported from files in{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">public/nutritions/</code>. Large catalogs
          (USDA, Open Food Facts) are searched live when selected in the menu.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase text-slate-700">
          Importable databases (local storage)
        </div>
        <ul className="divide-y divide-slate-200">
          {importable.map((source) => {
            const busy = importingId === source.id;
            const imported = source.importStatus?.imported;
            const canImport = source.configured !== false;

            return (
              <li key={source.id} className="px-4 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{source.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{source.description}</p>
                  {source.missingEnv?.length ? (
                    <p className="text-xs text-red-600 mt-1">Configure: {source.missingEnv.join(', ')}</p>
                  ) : null}
                  {imported ? (
                    <p className="text-xs text-green-700 mt-1">
                      Imported — {source.importStatus?.foodCount ?? 0} foods
                      {(source.importStatus?.recipeCount ?? 0) > 0
                        ? `, ${source.importStatus?.recipeCount} recipes`
                        : ''}
                      {source.importStatus?.importedAt
                        ? ` · ${new Date(source.importStatus.importedAt).toLocaleString()}`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1">Not imported yet</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {source.id === 'movesbook_bundled' ? (
                    <>
                      <button
                        type="button"
                        disabled={!!importingId || !canImport}
                        onClick={() => onImportBundled(false)}
                        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Database className="w-4 h-4" />
                        {busy ? 'Importing…' : 'Import'}
                      </button>
                      {imported && (
                        <button
                          type="button"
                          disabled={!!importingId}
                          onClick={() => onImportBundled(true)}
                          className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                        >
                          Replace
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!!importingId || !canImport}
                        onClick={() => onImport(source.id, false)}
                        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {busy ? 'Importing…' : imported ? 'Re-import' : 'Import'}
                      </button>
                      {imported && (
                        <button
                          type="button"
                          disabled={!!importingId || !canImport}
                          onClick={() => onImport(source.id, true)}
                          className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                        >
                          Replace
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Live databases (no import)</p>
        <ul className="mt-2 space-y-2">
          {LIVE_FOOD_DATABASE_SOURCES.map((source) => (
            <li key={source.id} className="text-sm text-emerald-800">
              <span className="font-medium">{source.label}</span> — select in the menu above; foods are searched
              directly from the provider API.
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        Tip: after importing a local database, click its name in the menu to browse foods and recipes stored on
        your server.
      </p>
    </div>
  );
}

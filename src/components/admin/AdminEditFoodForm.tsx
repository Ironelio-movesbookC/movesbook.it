'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { X, Languages } from 'lucide-react';
import { getAuthToken } from '@/utils/auth.utils';
import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import {
  buildTranslationsFromEnglish,
  parseTranslations,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import AdminFoodTranslationsModal from '@/components/admin/AdminFoodTranslationsModal';
import { NUTRIENT_DISPLAY_COLUMNS, NutrientTotals } from '@/utils/nutritionMealTotals';

export interface FoodEditSection {
  id: string;
  name: string;
}

export interface FoodEditItem {
  id: string;
  sectionId: string;
  name: string;
  isLiquid: boolean;
  imageUrl?: string | null;
  nameTranslations?: string | null;
  [key: string]: unknown;
}

interface AdminEditFoodFormProps {
  item: FoodEditItem;
  sections: FoodEditSection[];
  isNew?: boolean;
  saving?: boolean;
  onChange: (item: FoodEditItem) => void;
  onClose: () => void;
  onSave: () => void;
}

const MACRO_ROWS: { key: keyof NutrientTotals; label: string }[] = [
  { key: 'calories', label: 'Calories' },
  { key: 'proteins', label: 'Protein' },
  { key: 'carbohydrates', label: 'Carbs' },
  { key: 'fats', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
];

const MICRO_ROWS = NUTRIENT_DISPLAY_COLUMNS.filter(
  (c) => !['calories', 'proteins', 'carbohydrates', 'fats', 'fiber'].includes(c.key)
);

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="py-2 pr-4 align-top whitespace-nowrap">
        <span className="text-[#0066cc] font-medium text-sm">{label}</span>
      </td>
      <td className="py-2 w-full">{children}</td>
    </tr>
  );
}

export default function AdminEditFoodForm({
  item,
  sections,
  isNew = false,
  saving = false,
  onChange,
  onClose,
  onSave,
}: AdminEditFoodFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMicros, setShowMicros] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const nutrients = dbRowToNutrients(item as unknown as Record<string, unknown>);

  const setNutrient = (key: keyof NutrientTotals, val: string) => {
    onChange({ ...item, [key]: parseFloat(val.replace(',', '.')) || 0 });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = getAuthToken();
      const res = await fetch('/api/admin/food-database/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange({ ...item, imageUrl: data.path });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 overflow-y-auto py-8 px-4">
      <div className="bg-white w-full max-w-[640px] shadow-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-gray-100">
          <h2 className="text-xl font-normal text-gray-900">
            {isNew ? 'Add New Food' : 'Edit Food'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <table className="w-full border-collapse">
            <tbody>
              <FormRow label="Food Section">
                <select
                  value={item.sectionId}
                  onChange={(e) => onChange({ ...item, sectionId: e.target.value })}
                  className="w-full max-w-md border border-gray-300 rounded-sm px-2 py-1.5 text-sm bg-white"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="Food Name">
                <div className="flex flex-wrap items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      onChange({
                        ...item,
                        name: e.target.value.toUpperCase(),
                        nameTranslations: JSON.stringify(
                          buildTranslationsFromEnglish(e.target.value, parseTranslations(item.nameTranslations))
                        ),
                      })
                    }
                    className="flex-1 min-w-[200px] border border-gray-300 rounded-sm px-2 py-1.5 text-sm uppercase"
                    placeholder="TUNA CARPACCIO"
                  />
                  <button
                      type="button"
                      onClick={() => setLangOpen(true)}
                      className="inline-flex items-center gap-1 text-xs text-[#0066cc] underline whitespace-nowrap"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      Other languages
                    </button>
                </div>
              </FormRow>

              {MACRO_ROWS.map(({ key, label }) => (
                <FormRow key={key} label={label}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(nutrients[key] ?? '')}
                    onChange={(e) => setNutrient(key, e.target.value)}
                    className="w-full max-w-md border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
                  />
                </FormRow>
              ))}

              <FormRow label="">
                <button
                  type="button"
                  onClick={() => setShowMicros((v) => !v)}
                  className="text-sm text-[#0066cc] underline"
                >
                  {showMicros ? 'Hide' : 'Show'} vitamins & minerals (per 100g)
                </button>
              </FormRow>

              {showMicros && (
                <tr>
                  <td colSpan={2} className="pb-3">
                    <div className="overflow-x-auto border border-gray-200 rounded-sm max-w-full">
                      <table className="text-xs min-w-[520px] w-full">
                        <tbody>
                          {MICRO_ROWS.map(({ key, label }) => (
                            <tr key={key} className="border-b border-gray-100 last:border-0">
                              <td className="py-1.5 px-2 text-[#0066cc] whitespace-nowrap w-[120px]">{label}</td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={String(nutrients[key] ?? '')}
                                  onChange={(e) => setNutrient(key, e.target.value)}
                                  className="w-full border border-gray-300 rounded-sm px-2 py-1"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}

              <FormRow label="Upload">
                <div className="space-y-2">
                  {item.imageUrl && (
                    <div className="relative w-24 h-24 border border-gray-200 rounded overflow-hidden bg-gray-50">
                      <Image
                        src={item.imageUrl}
                        alt={item.name || 'Food'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="text-sm"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = '';
                    }}
                  />
                  {uploading && <p className="text-xs text-gray-500">Uploading…</p>}
                  {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                </div>
              </FormRow>

              {item.imageUrl && (
                <FormRow label="">
                  <button
                    type="button"
                    onClick={() => onChange({ ...item, imageUrl: null })}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Remove Picture
                  </button>
                </FormRow>
              )}

              <FormRow label="">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!item.isLiquid}
                    onChange={(e) => onChange({ ...item, isLiquid: e.target.checked })}
                  />
                  Liquid (measure in ml)
                </label>
              </FormRow>
            </tbody>
          </table>

          <div className="mt-6">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !item.name.trim() || !item.sectionId}
              className="bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-sm text-sm"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <AdminFoodTranslationsModal
        isOpen={langOpen}
        title="Food Name"
        translations={buildTranslationsFromEnglish(item.name, parseTranslations(item.nameTranslations))}
        onClose={() => setLangOpen(false)}
        onSave={(map: TranslationMap) => {
          onChange({
            ...item,
            name: map.en || item.name,
            nameTranslations: JSON.stringify(map),
          });
          setLangOpen(false);
        }}
      />
    </div>
  );
}

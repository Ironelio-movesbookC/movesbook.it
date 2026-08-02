'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, UtensilsCrossed, Archive, Globe } from 'lucide-react';
import { NUTRITION_TERMINOLOGY } from '@/config/nutrition.constants';
import {
  MEAL_LABELS,
  MEAL_SLOT_COUNT,
  sumNutrientTotals,
} from '@/utils/nutritionMealTotals';
import {
  buildDietframeApiPayload,
  cartLineToPayload,
  DietBuilderCartLine,
} from '@/utils/dietframePayload';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import DietBuilderFoodPicker from '@/components/nutrition/modals/DietBuilderFoodPicker';
import {
  DietArchiveEntry,
  DietArchiveFilter,
  deleteDietArchiveEntries,
  filterArchiveEntries,
  formatArchiveDate,
  loadDietArchive,
  saveDietArchiveEntry,
  sumArchiveNutrients,
} from '@/utils/dietBuilderArchive';
import {
  getToolsProfileLanguageDisplayName,
  resolveProfileLanguageCodeForToolsLoad,
} from '@/utils/toolsProfileLanguage';

interface AddDietframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payloads: ReturnType<typeof buildDietframeApiPayload>[]) => void | Promise<void>;
  meal: { id: string; sessionNumber?: number; name?: string | null };
  mealLabel?: string;
  isSaving?: boolean;
}

export default function AddDietframeModal({
  isOpen,
  onClose,
  onSave,
  meal,
  mealLabel: mealLabelProp,
  isSaving = false,
}: AddDietframeModalProps) {
  const fixedMealLabel =
    mealLabelProp ||
    MEAL_LABELS[meal.sessionNumber ?? 1] ||
    meal.name ||
    NUTRITION_TERMINOLOGY.meal;

  const [profileLang, setProfileLang] = useState('en');
  const [cart, setCart] = useState<DietBuilderCartLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [archiveFilter, setArchiveFilter] = useState<DietArchiveFilter>('list');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [archiveEntries, setArchiveEntries] = useState<DietArchiveEntry[]>([]);
  const [archiveSelection, setArchiveSelection] = useState<Set<string>>(new Set());
  const [showTotalsModal, setShowTotalsModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const lang = resolveProfileLanguageCodeForToolsLoad();
    setProfileLang(lang);
    setArchiveEntries(loadDietArchive());
  }, [isOpen]);

  const cartTotal = useMemo(() => sumNutrientTotals(cart.map((c) => c.nutrients)), [cart]);

  const visibleArchive = useMemo(
    () => filterArchiveEntries(archiveEntries, archiveFilter, dateFrom || undefined, dateTo || undefined),
    [archiveEntries, archiveFilter, dateFrom, dateTo]
  );
  const archiveTotals = useMemo(() => sumArchiveNutrients(visibleArchive), [visibleArchive]);

  const resetBuilder = useCallback(() => {
    setCart([]);
    setError(null);
  }, []);

  const handleSave = async () => {
    setError(null);
    if (cart.length === 0) {
      setError('Add at least one food before saving.');
      return;
    }
    const payloads = cart.map((line) => cartLineToPayload(line, meal.id));
    const entry: DietArchiveEntry = {
      id: `archive-${Date.now()}`,
      savedAt: new Date().toISOString(),
      mealLabel: fixedMealLabel,
      nutritionMealId: meal.id,
      totalGrams: cart.reduce((s, c) => s + c.grams, 0),
      foodDescription: cart.map((c) => `${c.name} (${c.amount}${c.unit})`).join(', '),
      nutrients: cartTotal,
      lines: cart.map((c) => ({ name: c.name, grams: c.grams, unit: c.unit })),
    };
    try {
      await onSave(payloads);
      saveDietArchiveEntry(entry);
      setArchiveEntries(loadDietArchive());
      resetBuilder();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    }
  };

  const toggleArchiveSelect = (id: string) => {
    setArchiveSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteArchiveSelected = () => {
    if (archiveSelection.size === 0) return;
    deleteDietArchiveEntries(Array.from(archiveSelection));
    setArchiveSelection(new Set());
    setArchiveEntries(loadDietArchive());
  };

  if (!isOpen) return null;

  const langDisplay = getToolsProfileLanguageDisplayName(profileLang);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-200">
        {/* Header — A: meal */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Diet Builder</h2>
              <p className="text-xs text-slate-500">Select foods, set quantity, save to your meal plan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <Globe size={12} />
              {langDisplay}
            </span>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">Meal</span>
              <select
                className="rounded-lg border-0 bg-transparent py-0 pl-1 pr-6 text-sm font-medium text-slate-900 focus:ring-0"
                value={meal.sessionNumber ?? 1}
                disabled
                title="Meal is set from the planner row"
              >
                {Array.from({ length: MEAL_SLOT_COUNT }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {MEAL_LABELS[i + 1]}
                  </option>
                ))}
              </select>
            </label>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {fixedMealLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <DietBuilderFoodPicker
            displayLanguage={profileLang}
            cart={cart}
            onCartChange={setCart}
          />
        </div>

        {/* E — archive */}
        <section className="shrink-0 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-600 text-xs font-bold text-white">
              E
            </span>
            <Archive size={14} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Saved meals archive</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-5 py-3">
            {(['day', 'week', 'list'] as DietArchiveFilter[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setArchiveFilter(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  archiveFilter === mode
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode === 'list' ? 'List' : mode}
              </button>
            ))}
            <span className="hidden text-slate-300 sm:inline">|</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs shadow-sm"
              title="From date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs shadow-sm"
              title="To date"
            />
            <button
              type="button"
              onClick={() => setArchiveFilter('list')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Go
            </button>
            <button
              type="button"
              onClick={() => setShowTotalsModal(true)}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              Totals
            </button>
            <button
              type="button"
              onClick={deleteArchiveSelected}
              className="ml-auto text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete selected
            </button>
          </div>

          <div className="max-h-[160px] overflow-y-auto px-5 pb-3">
            {visibleArchive.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No archived meals for this filter</p>
            ) : (
              <DietBuilderNutrientGrid
                compact
                maxHeight="140px"
                showCheckbox
                prefixHeaders={['Date', 'Meal']}
                rows={visibleArchive.map((e) => ({
                  id: e.id,
                  selected: archiveSelection.has(e.id),
                  name: e.foodDescription,
                  grams: e.totalGrams,
                  nutrients: e.nutrients,
                  prefixCells: [formatArchiveDate(e.savedAt), e.mealLabel],
                }))}
                onToggleSelect={toggleArchiveSelect}
              />
            )}
          </div>
        </section>

        {error && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || cart.length === 0}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save meal'}
          </button>
        </div>
      </div>

      {showTotalsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Archive totals —{' '}
                {archiveFilter === 'day' ? 'Today' : archiveFilter === 'week' ? 'This week' : 'Filtered list'} (
                {visibleArchive.length} entries)
              </h3>
              <button
                type="button"
                onClick={() => setShowTotalsModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <DietBuilderNutrientGrid
              rows={[
                {
                  id: 'totals',
                  name: 'Combined total',
                  grams: visibleArchive.reduce((s, e) => s + e.totalGrams, 0),
                  nutrients: archiveTotals,
                },
              ]}
              maxHeight="320px"
            />
          </div>
        </div>
      )}
    </div>
  );
}

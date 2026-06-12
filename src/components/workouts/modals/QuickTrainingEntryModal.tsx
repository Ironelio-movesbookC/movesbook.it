'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { WORKOUT_GOALS } from '@/constants/workoutGoals';
import {
  MACRO_FINAL_OPTIONS,
  REST_TYPES,
  SPORTS_LIST,
  getSportConfig,
  getSportDisplayName,
} from '@/constants/moveframe.constants';
import { getSportIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { useToolsData } from '@/hooks/useToolsData';
import Image from 'next/image';
import {
  QUICK_ENTRY_SPORT_SHORTCUTS,
  MUSCULAR_SECTORS_WITH_ALL,
  buildQuickEntryDescription,
  countOptions,
  createDefaultQuickTrainingForm,
  getAerobicTotalMeters,
  getPauseOptionsForSport,
  getQuickEntryInputType,
  isMuscularAllAreas,
  type QuickEntryContext,
  type QuickTrainingEntryForm,
} from '@/lib/quickTrainingEntry';

const AEROBIC_GOAL_VALUES = new Set([
  'AEROBIC_POWER',
  'AEROBIC_CAPACITY',
  'ALACTIC_POWER',
  'ALACTIC_CAPACITY',
  'LACTIC_CAPACITY',
  'SPEED_ENDURANCE',
  'SPEED',
  'ACCELERATION',
  'SPORT_RELATED',
]);

const SURFACE_OPTIONS = [
  '',
  'Track',
  'Road',
  'Trail',
  'Indoor',
  'Pool',
  'Grass',
  'Sand',
  'Snow',
  'Gym floor',
  'Other',
];

interface QuickTrainingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: QuickEntryContext;
  workout?: { id?: string; sessionNumber?: number; name?: string | null } | null;
  structureSlot?: { day: number; session: number };
  onStructureSlotChange?: (slot: { day: number; session: number }) => void;
  onSave: (form: QuickTrainingEntryForm) => Promise<void>;
}

export default function QuickTrainingEntryModal({
  isOpen,
  onClose,
  context,
  workout,
  structureSlot,
  onStructureSlotChange,
  onSave,
}: QuickTrainingEntryModalProps) {
  const iconType = useSportIconType();
  const { equipment } = useToolsData();
  const [mode, setMode] = useState<'standard' | 'advanced'>('standard');
  const [form, setForm] = useState<QuickTrainingEntryForm>(() =>
    createDefaultQuickTrainingForm('SWIM')
  );
  const [saving, setSaving] = useState(false);
  const [customMetersMode, setCustomMetersMode] = useState(false);

  const inputType = getQuickEntryInputType(form.sport);
  const showAdvancedTab = context === 'C' && inputType === 'A';
  const allAreas = isMuscularAllAreas(form.muscularArea);
  const sportConfig = getSportConfig(form.sport);
  const meterOptions: string[] =
    sportConfig && 'meters' in sportConfig && Array.isArray((sportConfig as { meters?: readonly string[] }).meters)
      ? [...(sportConfig as { meters: readonly string[] }).meters]
      : ['100', '200', '400', 'input'];
  const speedOptions: string[] = sportConfig?.speeds ? [...sportConfig.speeds] : ['A1', 'A2', 'B1'];
  const pauseOptions = getPauseOptionsForSport(form.sport, form.restType);

  const goalOptions = useMemo(() => {
    if (inputType === 'A') {
      return WORKOUT_GOALS.filter((g) => AEROBIC_GOAL_VALUES.has(g.value));
    }
    return WORKOUT_GOALS.filter((g) => !AEROBIC_GOAL_VALUES.has(g.value) || g.value === 'SPORT_RELATED');
  }, [inputType]);

  const equipmentNames = useMemo(
    () =>
      (equipment ?? [])
        .map((e: { name?: string }) => e?.name)
        .filter(Boolean) as string[],
    [equipment]
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(createDefaultQuickTrainingForm('SWIM'));
    setMode('standard');
    setCustomMetersMode(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showAdvancedTab && mode === 'advanced') setMode('standard');
  }, [showAdvancedTab, mode]);

  const patch = useCallback(
    (partial: Partial<QuickTrainingEntryForm>) =>
      setForm((prev) => ({ ...prev, ...partial })),
    []
  );

  const patchAdvanced = useCallback(
    (partial: Partial<QuickTrainingEntryForm['advanced']>) =>
      setForm((prev) => ({ ...prev, advanced: { ...prev.advanced, ...partial } })),
    []
  );

  const handleSportChange = (sport: string) => {
    const next = createDefaultQuickTrainingForm(sport);
    next.workoutGoal = form.workoutGoal;
    next.shortDescription = form.shortDescription;
    setForm(next);
    setCustomMetersMode(false);
  };

  const handleSave = async (continueAfter: boolean) => {
    setSaving(true);
    try {
      const toSave = {
        ...form,
        shortDescription: form.shortDescription.trim() || buildQuickEntryDescription(form),
      };
      await onSave(toSave);
      if (continueAfter) {
        const keepSport = form.sport;
        setForm(createDefaultQuickTrainingForm(keepSport));
        setMode('standard');
      } else {
        onClose();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderSportIcon = (sport: string, size = 40) => {
    const icon = getSportIcon(sport, iconType);
    if (iconType === 'icon' && typeof icon === 'string' && icon.startsWith('/')) {
      return <Image src={icon} alt="" width={size} height={size} className="object-contain" />;
    }
    return <span className="text-2xl">{icon}</span>;
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100001] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Quick training entry</h2>
            </div>
            <p className="text-sm opacity-90 mt-1">
              The fastest way to plan and insert your workouts
              {workout?.sessionNumber != null && (
                <span className="ml-2 opacity-75">· Workout #{workout.sessionNumber}</span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b shrink-0">
          <button
            type="button"
            onClick={() => setMode('standard')}
            className={`flex-1 py-2.5 text-sm font-semibold ${
              mode === 'standard'
                ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Standard mode
          </button>
          {showAdvancedTab && (
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`flex-1 py-2.5 text-sm font-semibold ${
                mode === 'advanced'
                  ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Advanced mode
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {context === 'W' && structureSlot && onStructureSlotChange && (
            <div className="grid grid-cols-2 gap-3 bg-violet-50 border border-violet-200 rounded-lg p-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Structure day</label>
                <select
                  value={structureSlot.day}
                  onChange={(e) =>
                    onStructureSlotChange({ ...structureSlot, day: Number(e.target.value) })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Session</label>
                <select
                  value={structureSlot.session}
                  onChange={(e) =>
                    onStructureSlotChange({ ...structureSlot, session: Number(e.target.value) })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      Session {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {mode === 'standard' ? (
            <>
              <div className="flex flex-wrap justify-center gap-3">
                {QUICK_ENTRY_SPORT_SHORTCUTS.map(({ sport, label }) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportChange(sport)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 min-w-[72px] transition-colors ${
                      form.sport === sport
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    {renderSportIcon(sport)}
                    <span className="text-[10px] font-semibold text-gray-700">{label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => handleSportChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {SPORTS_LIST.map((code) => (
                    <option key={code} value={code}>
                      {getSportDisplayName(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                <label className="text-xs font-bold text-gray-800 block mb-1">
                  Workout goal
                  {inputType !== 'A' && (
                    <span className="font-normal text-red-600 ml-1">(goals of not aerobic sports)</span>
                  )}
                </label>
                <select
                  value={form.workoutGoal}
                  onChange={(e) => patch({ workoutGoal: e.target.value })}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select workout goal…</option>
                  {goalOptions.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Time</label>
                  <input
                    type="text"
                    value={form.time}
                    onChange={(e) => patch({ time: e.target.value })}
                    placeholder="hh:mm:ss"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {inputType === 'A' ? 'Distance Warmup' : 'Warmup'}
                  </label>
                  <input
                    type="text"
                    value={form.warmup}
                    onChange={(e) => patch({ warmup: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {inputType === 'A' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Meters</label>
                    <select
                      value={customMetersMode ? 'input' : form.meters}
                      onChange={(e) => {
                        if (e.target.value === 'input') {
                          setCustomMetersMode(true);
                          patch({ meters: 'input' });
                        } else {
                          setCustomMetersMode(false);
                          patch({ meters: e.target.value });
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {(meterOptions).map((m) => (
                        <option key={m} value={m}>
                          {m === 'input' ? 'Custom…' : `${m}m`}
                        </option>
                      ))}
                    </select>
                    {customMetersMode && (
                      <input
                        type="number"
                        value={form.customMeters}
                        onChange={(e) => patch({ customMeters: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                        placeholder="Meters"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Repetitions</label>
                    <select
                      value={form.repetitions}
                      onChange={(e) => patch({ repetitions: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {countOptions(20).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Series\Batteries\Groups
                    </label>
                    <select
                      value={form.seriesBatteries}
                      onChange={(e) => patch({ seriesBatteries: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {countOptions(9).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Muscular area</label>
                    <select
                      value={form.muscularArea}
                      onChange={(e) => patch({ muscularArea: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {MUSCULAR_SECTORS_WITH_ALL.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      {allAreas ? 'Total exercises' : 'Number of exercises'}
                    </label>
                    <select
                      value={form.numberOfExercises}
                      onChange={(e) => patch({ numberOfExercises: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {countOptions(20).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      {allAreas ? 'Total series' : 'Series for exercise'}
                    </label>
                    <select
                      value={form.seriesForExercise}
                      onChange={(e) => patch({ seriesForExercise: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {countOptions(20).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      {allAreas ? 'Total batteries' : 'Batteries for series'}
                    </label>
                    <select
                      value={form.batteriesForSeries}
                      onChange={(e) => patch({ batteriesForSeries: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      {countOptions(9).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {inputType === 'A' && (
                <p className="text-sm font-semibold text-green-700">
                  Total: {getAerobicTotalMeters(form)}m
                </p>
              )}

              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 mb-2">SPEED / PACE</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Speed</label>
                    <select
                      value={form.speed}
                      onChange={(e) => patch({ speed: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {(speedOptions).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">TIME (optional)</label>
                    <input
                      type="text"
                      value={form.speedTime}
                      onChange={(e) => patch({ speedTime: e.target.value })}
                      placeholder="0'00&quot;"
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 mb-2">REST\PAUSE &amp; MACROPAUSE</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Rest Type</label>
                    <select
                      value={form.restType}
                      onChange={(e) => patch({ restType: e.target.value, pause: '20"' })}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {Object.values(REST_TYPES).map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Pause</label>
                    <select
                      value={form.pause}
                      onChange={(e) => patch({ pause: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {pauseOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Macro pause</label>
                    <select
                      value={form.macroFinal}
                      onChange={(e) => patch({ macroFinal: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      {MACRO_FINAL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Short description</label>
                <textarea
                  value={form.shortDescription}
                  onChange={(e) => patch({ shortDescription: e.target.value })}
                  rows={3}
                  className="w-full border border-sky-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={buildQuickEntryDescription(form)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Advanced metrics for Workouts Done (aerobic). Stored with the moveframe.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['bpm', 'BPM'],
                    ['bpmMax', 'BPM max'],
                    ['bpmAvg', 'Average BPM'],
                    ['lactateLap', 'Lactate Lap'],
                    ['lactateMax', 'Lactate max'],
                    ['lactateAvg', 'Average Lactate'],
                    ['wattLap', 'Watt Lap'],
                    ['wattsMax', 'Watts max'],
                    ['wattsAvg', 'Average Watts'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-600 block mb-1">{label}</label>
                    <input
                      type="text"
                      value={form.advanced[key] ?? ''}
                      onChange={(e) => patchAdvanced({ [key]: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-gray-700 pt-2">Others</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Altitude (m)</label>
                  <input
                    type="text"
                    value={form.advanced.altitude ?? ''}
                    onChange={(e) => patchAdvanced({ altitude: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Height difference (m)</label>
                  <input
                    type="text"
                    value={form.advanced.heightDifference ?? ''}
                    onChange={(e) => patchAdvanced({ heightDifference: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Temperature</label>
                  <input
                    type="text"
                    value={form.advanced.temperature ?? ''}
                    onChange={(e) => patchAdvanced({ temperature: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Humidity</label>
                  <input
                    type="text"
                    value={form.advanced.humidity ?? ''}
                    onChange={(e) => patchAdvanced({ humidity: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Feeling status</label>
                  <input
                    type="text"
                    value={form.advanced.feelingStatus ?? ''}
                    onChange={(e) => patchAdvanced({ feelingStatus: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Surface</label>
                  <select
                    value={form.advanced.surface ?? ''}
                    onChange={(e) => patchAdvanced({ surface: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  >
                    {SURFACE_OPTIONS.map((s) => (
                      <option key={s || 'empty'} value={s}>
                        {s || 'Select…'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Clothing</label>
                  <input
                    list="qte-clothing-list"
                    type="text"
                    value={form.advanced.clothing ?? ''}
                    onChange={(e) => patchAdvanced({ clothing: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                  <datalist id="qte-clothing-list">
                    {equipmentNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Shoes</label>
                  <input
                    list="qte-shoes-list"
                    type="text"
                    value={form.advanced.shoes ?? ''}
                    onChange={(e) => patchAdvanced({ shoes: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                  <datalist id="qte-shoes-list">
                    {equipmentNames.map((n) => (
                      <option key={`sh-${n}`} value={n} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-4 flex gap-2 shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-600 disabled:opacity-50"
          >
            Save and continue
          </button>
        </div>
      </div>
    </div>
  );
}

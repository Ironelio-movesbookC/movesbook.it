'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import {
  CardTimetableForm,
  PERMIT_MINUTE_OPTIONS,
  TIMETABLE_DAY_KEYS,
  TIMETABLE_DAY_LABELS,
  TimetableDayKey,
  createEmptyTimetableForm,
  minutesToDisplayTime
} from '@/lib/clubCardTimetable';

type TypologyOption = {
  id: string;
  name: string;
};

const TYPOLOGY_LIST_PATH = '/club/settings/typology_subscription';

type ClubCardTimetablePageProps = {
  initialTypologyId?: string;
};

export default function ClubCardTimetablePage({ initialTypologyId = '' }: ClubCardTimetablePageProps) {
  const router = useRouter();
  const [typologies, setTypologies] = useState<TypologyOption[]>([]);
  const [form, setForm] = useState<CardTimetableForm>(() => createEmptyTimetableForm(initialTypologyId));
  const [selectedTypologyId, setSelectedTypologyId] = useState(initialTypologyId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTypologyName = useMemo(
    () => typologies.find((item) => item.id === selectedTypologyId)?.name ?? '',
    [typologies, selectedTypologyId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const query = selectedTypologyId
          ? `?typologyId=${encodeURIComponent(selectedTypologyId)}`
          : '';
        const response = await fetch(`/api/club/settings/card-timetable${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load timetable.');
        }

        if (cancelled) return;

        setTypologies(Array.isArray(data.typologies) ? data.typologies : []);

        if (data.timetable) {
          setForm(data.timetable as CardTimetableForm);
        } else if (selectedTypologyId) {
          setForm(createEmptyTimetableForm(selectedTypologyId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load timetable.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedTypologyId]);

  useEffect(() => {
    if (initialTypologyId && initialTypologyId !== selectedTypologyId) {
      setSelectedTypologyId(initialTypologyId);
    }
  }, [initialTypologyId, selectedTypologyId]);

  const updateDay = (key: TimetableDayKey, patch: Partial<CardTimetableForm['days'][TimetableDayKey]>) => {
    setForm((current) => ({
      ...current,
      days: {
        ...current.days,
        [key]: {
          ...current.days[key],
          ...patch
        }
      }
    }));
  };

  const updateDayRange = (key: TimetableDayKey, rangeStart: number, rangeEnd: number) => {
    const safeEnd = rangeEnd > rangeStart ? rangeEnd : rangeStart + 15;
    updateDay(key, {
      rangeStart,
      rangeEnd: safeEnd,
      amTime: minutesToDisplayTime(rangeStart),
      pmTime: minutesToDisplayTime(safeEnd)
    });
  };

  const handleLoadTypology = () => {
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }
    router.push(`/club/settings/typology_subscription/timetable/${encodeURIComponent(selectedTypologyId)}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/card-timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...form,
          typologyId: selectedTypologyId
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save timetable.');
      }

      window.alert('Timetable saved successfully.');
      router.push(TYPOLOGY_LIST_PATH);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save timetable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 print:p-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.push(TYPOLOGY_LIST_PATH)}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to typologies
        </button>
        <span className="text-sm text-gray-500">Club&apos;s management / General settings</span>
      </div>

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <ClubSettingsTypologyTabs timetableTypologyId={selectedTypologyId || null} />

        <form onSubmit={handleSubmit}>
          <div className="px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-950">Setting typologies of subscription to the club</h1>
            <p className="mt-1 text-sm text-gray-500">Timetable · {selectedTypologyName || 'Select a typology'}</p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading timetable
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
          ) : (
            <>
              <div className="mx-4 mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 shadow-sm">
                <div className="flex min-w-max flex-nowrap items-center gap-3">
                  <span className="shrink-0 text-sm font-medium text-gray-700 whitespace-nowrap">
                    Select typology you want manage
                  </span>
                  <select
                    value={selectedTypologyId}
                    onChange={(event) => setSelectedTypologyId(event.target.value)}
                    className="h-10 w-[220px] shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">Select</option>
                    {typologies.map((typology) => (
                      <option key={typology.id} value={typology.id}>
                        {typology.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLoadTypology}
                    className="h-10 shrink-0 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold whitespace-nowrap text-gray-800 shadow-sm hover:bg-gray-100"
                  >
                    Load Timetable
                  </button>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.editableSubscriptionTimetable}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          editableSubscriptionTimetable: event.target.checked
                        }))
                      }
                      className="h-4 w-4 shrink-0 accent-gray-900"
                    />
                    Editable for each subscription
                  </label>
                </div>
              </div>

              <div className="mx-4 mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <label className="text-sm font-medium text-gray-800">
                  Maximum number of current reservation available from each person:
                  <select
                    value={form.reserveMaxNumber}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, reserveMaxNumber: event.target.value }))
                    }
                    className="ml-2 h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                  >
                    {['1', '2', '3', '4', '5'].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="px-4 py-4">
                <div className="mb-3 grid grid-cols-[72px_1fr_120px_120px] gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Day</span>
                  <span>Time range (0–24h)</span>
                  <span>From</span>
                  <span>To</span>
                </div>

                <div className="space-y-3">
                  {TIMETABLE_DAY_KEYS.map((key) => {
                    const day = form.days[key];
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[72px_1fr_120px_120px] items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3"
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(event) => updateDay(key, { enabled: event.target.checked })}
                            className="h-4 w-4 accent-gray-900"
                          />
                          {TIMETABLE_DAY_LABELS[key]}
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={1440}
                            step={15}
                            disabled={!day.enabled}
                            value={day.rangeStart}
                            onChange={(event) =>
                              updateDayRange(key, Number(event.target.value), day.rangeEnd)
                            }
                            className="w-full accent-gray-900 disabled:opacity-40"
                          />
                          <input
                            type="range"
                            min={0}
                            max={1440}
                            step={15}
                            disabled={!day.enabled}
                            value={day.rangeEnd}
                            onChange={(event) =>
                              updateDayRange(key, day.rangeStart, Number(event.target.value))
                            }
                            className="w-full accent-gray-900 disabled:opacity-40"
                          />
                        </div>
                        <span className="text-sm text-gray-700">{day.amTime}</span>
                        <span className="text-sm text-gray-700">{day.pmTime}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-gray-700">
                    Minutes in advance permitted for access
                    <select
                      value={form.permitMinuteAccess}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, permitMinuteAccess: event.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                    >
                      <option value="">Select</option>
                      {PERMIT_MINUTE_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-gray-700">
                    Minutes early for blocking access on the official time to the end of the course
                    <select
                      value={form.blockingMinuteAccess}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, blockingMinuteAccess: event.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                    >
                      <option value="">Select</option>
                      {PERMIT_MINUTE_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() => router.push(TYPOLOGY_LIST_PATH)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedTypologyId}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

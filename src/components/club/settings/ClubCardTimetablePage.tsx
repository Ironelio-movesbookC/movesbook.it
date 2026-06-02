'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import TimetableDayRow from '@/components/club/settings/TimetableDayRow';
import TimetableBookingPropertiesTable from '@/components/club/settings/TimetableBookingPropertiesTable';
import {
  CardTimetableForm,
  PERMIT_MINUTE_OPTIONS,
  TIMETABLE_DAY_KEYS,
  TIMETABLE_DAY_LABELS,
  TimetableDayKey,
  TimetableOperator,
  createEmptyTimetableForm,
  resetAllDays,
  validateTimetableForm
} from '@/lib/clubCardTimetable';

type TypologyOption = {
  id: string;
  name: string;
};

type ViewMode = 'schedule' | 'properties' | 'bookings';

const TYPOLOGY_LIST_PATH = '/club/settings/typology_subscription';
const COURSE_TIMETABLE_SUMMARY_PATH = '/club/settings/typology_subscription/timetable/summary';

type ClubCardTimetablePageProps = {
  initialTypologyId?: string;
};

export default function ClubCardTimetablePage({ initialTypologyId = '' }: ClubCardTimetablePageProps) {
  const router = useRouter();
  const [typologies, setTypologies] = useState<TypologyOption[]>([]);
  const [importSources, setImportSources] = useState<TypologyOption[]>([]);
  const [operators, setOperators] = useState<TimetableOperator[]>([]);
  const [form, setForm] = useState<CardTimetableForm>(() => createEmptyTimetableForm(initialTypologyId));
  const [selectedTypologyId, setSelectedTypologyId] = useState(initialTypologyId);
  const [activeDay, setActiveDay] = useState<TimetableDayKey>('mon');
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [copyFromId, setCopyFromId] = useState('');
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTypologyName = useMemo(
    () => typologies.find((item) => item.id === selectedTypologyId)?.name ?? '',
    [typologies, selectedTypologyId]
  );

  const loadTimetable = useCallback(async (typologyId: string, sourceTypologyId?: string) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (typologyId) params.set('typologyId', typologyId);
    if (sourceTypologyId) params.set('copyFrom', sourceTypologyId);

    const response = await fetch(`/api/club/settings/card-timetable?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to load timetable.');
    }

    setTypologies(Array.isArray(data.typologies) ? data.typologies : []);
    setImportSources(Array.isArray(data.importSources) ? data.importSources : []);
    setOperators(Array.isArray(data.operators) ? data.operators : []);

    if (data.timetable) {
      setForm(data.timetable as CardTimetableForm);
    } else if (typologyId) {
      setForm(createEmptyTimetableForm(typologyId));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        await loadTimetable(selectedTypologyId);
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
  }, [selectedTypologyId, loadTimetable]);

  useEffect(() => {
    if (initialTypologyId && initialTypologyId !== selectedTypologyId) {
      setSelectedTypologyId(initialTypologyId);
    }
  }, [initialTypologyId, selectedTypologyId]);

  const handleLoadTypology = async () => {
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }
    const confirmed = window.confirm('Are you sure you want to proceed with this typology?');
    if (!confirmed) return;

    try {
      setLoading(true);
      await loadTimetable(selectedTypologyId);
      router.push(`/club/settings/typology_subscription/timetable/${encodeURIComponent(selectedTypologyId)}`);
      setViewMode('schedule');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to load timetable.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSources = async () => {
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }
    setImportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/club/settings/card-timetable?typologyId=${encodeURIComponent(selectedTypologyId)}&listImport=1`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load import list.');
      }
      setImportSources(Array.isArray(data.importSources) ? data.importSources : []);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to load import list.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCopyLoad = async () => {
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }
    if (!copyFromId) {
      window.alert('Please select an option');
      return;
    }

    setCopyLoading(true);
    try {
      await loadTimetable(selectedTypologyId, copyFromId);
      setViewMode('schedule');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to copy timetable.');
    } finally {
      setCopyLoading(false);
    }
  };

  const updateDay = (key: TimetableDayKey, day: CardTimetableForm['days'][TimetableDayKey]) => {
    setForm((current) => ({
      ...current,
      days: {
        ...current.days,
        [key]: day
      }
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTypologyId) {
      window.alert('Please select a typology first.');
      return;
    }

    const validationError = validateTimetableForm(form);
    if (validationError) {
      window.alert(validationError);
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

  const btnClass =
    'inline-flex h-9 items-center rounded-md border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50';

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
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-950">
              Setting typologies of subscription to the club
            </h1>
            <p className="mt-1 text-sm text-gray-500">Timetable · {selectedTypologyName || 'Select a typology'}</p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white px-4 py-3">
            <button type="button" className={btnClass} disabled>
              Print
            </button>
            <button
              type="button"
              onClick={handleImportSources}
              disabled={importLoading || !selectedTypologyId}
              className={btnClass}
            >
              {importLoading ? 'Loading…' : 'Click here to import a timetable'}
            </button>
            <select
              value={copyFromId}
              onChange={(event) => setCopyFromId(event.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
            >
              <option value="">Select Option</option>
              {importSources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopyLoad}
              disabled={copyLoading}
              className={btnClass}
            >
              {copyLoading ? 'Loading…' : 'Load'}
            </button>
          </div>

          <div className="mx-4 mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 shadow-sm">
            <div className="flex min-w-max flex-nowrap items-center gap-3">
              <span className="shrink-0 whitespace-nowrap text-sm font-medium text-gray-700">
                Select typology you want manage
              </span>
              <select
                value={selectedTypologyId}
                onChange={(event) => setSelectedTypologyId(event.target.value)}
                className="h-10 w-[220px] shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm"
              >
                <option value="">Select</option>
                {typologies.map((typology) => (
                  <option key={typology.id} value={typology.id}>
                    {typology.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleLoadTypology} className={btnClass}>
                Load Timetable
              </button>
              <Link href={COURSE_TIMETABLE_SUMMARY_PATH} className={btnClass}>
                Summary
              </Link>
              <button
                type="button"
                onClick={() => setViewMode('bookings')}
                className={btnClass}
              >
                Bookings
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'properties' ? 'schedule' : 'properties')}
                className={btnClass}
              >
                Set Propriety
              </button>
              <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.editableSubscriptionTimetable}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      editableSubscriptionTimetable: event.target.checked
                    }))
                  }
                  className="h-4 w-4 accent-gray-900"
                />
                Editable for each subscription
              </label>
            </div>
          </div>

          <div className="mx-4 mt-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
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
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
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
              {viewMode === 'schedule' && (
                <div className="px-4 py-4">
                  <div className="mb-3 overflow-x-auto" style={{paddingLeft: 83, paddingRight: 111}}>
                    <div className="flex justify-between text-xs text-gray-500">
                      {Array.from({ length: 25 }, (_, hour) => (
                        <span key={hour} className="w-4 text-center">
                          {hour}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {TIMETABLE_DAY_KEYS.map((key) => (
                      <TimetableDayRow
                        key={key}
                        dayKey={key}
                        label={TIMETABLE_DAY_LABELS[key]}
                        day={form.days[key]}
                        active={activeDay === key}
                        onSelect={() => setActiveDay(key)}
                        onChange={(day) => updateDay(key, day)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm('Reset all time ranges?');
                        if (confirmed) {
                          setForm((current) => resetAllDays(current));
                        }
                      }}
                      className={btnClass}
                    >
                      Reset all
                    </button>
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
                          <option key={value} value={value}>
                            {value}
                          </option>
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
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {viewMode === 'properties' && (
                <div className="px-4 py-4">
                  <TimetableBookingPropertiesTable
                    form={form}
                    operators={operators}
                    onChange={setForm}
                  />
                </div>
              )}

              {viewMode === 'bookings' && (
                <div className="px-4 py-10 text-center text-sm text-gray-600">
                  Member bookings list (booked / waiting list) uses legacy club reservation APIs and is not yet ported.
                  Use Set Propriety to configure slot booking rules for this typology.
                </div>
              )}

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

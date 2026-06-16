'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTypologyIconUrlWithDefault } from '@/lib/typologyIcon';
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Square,
  Trash2,
  Volume2,
  X
} from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';

type TypologyRow = {
  id: string;
  area: string;
  blockAccess: boolean;
  image: string;
  activityName: string;
  room: string;
  cost: string;
  limit: string;
  limitEnabled: boolean;
  audioUrl: string | null;
  isDefault: boolean;
};

type BookingSettings = {
  applyCourseSetting: 'Y' | 'N';
  applyTemporarySetting: 'Y' | 'N';
  confirmationOption: 'no' | 'ask' | 'yes';
  selfBook: 'Y' | 'N';
  authorizeExpired: 'Y' | 'N';
};

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  applyCourseSetting: 'Y',
  applyTemporarySetting: 'N',
  confirmationOption: 'no',
  selfBook: 'N',
  authorizeExpired: 'N'
};

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

function getSmartPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', totalPages];
}

export default function TypologySubscriptionPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TypologyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [savingBooking, setSavingBooking] = useState(false);
  const [copying, setCopying] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingAudioId(null);
  };

  const handleAudioClick = (row: TypologyRow, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!row.audioUrl) return;

    if (playingAudioId === row.id) {
      stopAudio();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = row.audioUrl;
    audio.load();
    void audio.play()
      .then(() => setPlayingAudioId(row.id))
      .catch(() => {
        window.alert('Unable to play audio.');
        setPlayingAudioId(null);
      });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/club/settings/typology-subscription', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error('Unable to load typologies');
        }

        const data = await response.json();
        if (!cancelled) {
          setRows(data.items ?? []);
          setBookingSettings(data.bookingSettings ?? DEFAULT_BOOKING_SETTINGS);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load typologies');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.area, row.activityName, row.room, row.cost, row.limit]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, filteredRows.length);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const requireSelection = () => {
    if (!selectedRow) {
      window.alert('Please select a typology first.');
      return null;
    }
    return selectedRow;
  };

  const openEditPage = () => {
    const row = requireSelection();
    if (!row) return;

    if (row.id.startsWith('local-')) {
      window.alert('Save this typology to the database before editing the full form.');
      return;
    }

    router.push(`/club/settings/typology_subscription/edit/${encodeURIComponent(row.id)}`);
  };

  const openTimetableForRow = (row: TypologyRow) => {
    if (row.id.startsWith('local-')) {
      window.alert('Save this typology to the database before managing its timetable.');
      return;
    }

    router.push(`/club/settings/typology_subscription/timetable/${encodeURIComponent(row.id)}`);
  };

  const copySelected = async () => {
    const row = requireSelection();
    if (!row) return;

    if (row.id.startsWith('local-')) {
      window.alert('Save this typology to the database before copying it.');
      return;
    }

    const confirmed = window.confirm('Do you want to copy this item?');
    if (!confirmed) return;

    setCopying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'copy-typology',
          sourceId: row.id
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to copy this typology.');
      }

      const newId = String(data.id ?? '');
      const activityName = String(data.activityName ?? `${row.activityName} copy`);
      if (!newId) {
        throw new Error('Copy did not return a new typology id.');
      }

      const copyRow: TypologyRow = {
        ...row,
        id: newId,
        activityName,
        isDefault: false
      };

      setRows((current) => [copyRow, ...current]);
      setSelectedId(copyRow.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to copy this typology.');
    } finally {
      setCopying(false);
    }
  };

  const deleteSelected = async () => {
    const row = requireSelection();
    if (!row) return;

    const confirmed = window.confirm(
      'Warning! If you delete a course, it will not be possible anymore to view the bookings of the course. Remove this course?'
    );
    if (!confirmed) return;

    const previous = rows;
    setRows((current) => current.filter((item) => item.id !== row.id));
    setSelectedId(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/club/settings/typology-subscription?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }
    } catch {
      setRows(previous);
      setSelectedId(row.id);
      window.alert('Unable to delete this typology.');
    }
  };

  const removeSelection = () => {
    setSelectedId(null);
  };

  const updateBlockAccess = async (row: TypologyRow, blockAccess: boolean) => {
    const previous = rows;
    setRows((current) =>
      current.map((item) => item.id === row.id ? { ...item, blockAccess } : item)
    );

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'block', id: row.id, blockAccess })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }
    } catch {
      setRows(previous);
      window.alert('Unable to update block status.');
    }
  };

  const setDefaultTypology = async (row: TypologyRow) => {
    const previous = rows;
    setRows((current) =>
      current.map((item) => ({ ...item, isDefault: item.id === row.id }))
    );

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'default', id: row.id })
      });

      if (!response.ok) {
        throw new Error('Default update failed');
      }
    } catch {
      setRows(previous);
      window.alert('Unable to save default typology.');
    }
  };

  const saveBookingSettings = async () => {
    setSavingBooking(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'booking-settings',
          ...bookingSettings
        })
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }
      setBookingOpen(false);
    } catch {
      window.alert('Unable to save booking settings.');
    } finally {
      setSavingBooking(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 print:p-0">
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <ClubSettingsTypologyTabs timetableTypologyId={selectedId} listPriceTypologyId={selectedId} />

        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-950">Setting typologies of subscription to the club</h1>
              <p className="mt-1 text-sm text-gray-500">Club's management / General settings</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="h-9 w-52 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none focus:border-gray-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>per page</span>
              <span className="ml-1 text-gray-400">|</span>
              <span>
                Showing <strong className="font-semibold text-gray-900">{visibleStart}-{visibleEnd}</strong> of{' '}
                <strong className="font-semibold text-gray-900">{filteredRows.length}</strong>
              </span>
            </div>
            <SmartPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <ToolbarButton icon={Plus} label="Add new" onClick={() => router.push('/club/settings/typology_subscription/add')} />
            <ToolbarButton icon={Pencil} label="Modify" onClick={openEditPage} disabled={!selectedRow} />
            <ToolbarButton
              icon={Copy}
              label={copying ? 'Copying…' : 'Copy'}
              onClick={copySelected}
              disabled={!selectedRow || copying}
            />
            <ToolbarButton icon={Printer} label="Print" onClick={() => window.print()} />
            <ToolbarButton icon={Trash2} label="Delete" onClick={deleteSelected} disabled={!selectedRow} danger />
            <ToolbarButton icon={X} label="Remove selection" onClick={removeSelection} disabled={!selectedRow} />
            <ToolbarButton
              icon={CalendarCheck}
              label="Setting bookings for all courses"
              onClick={() => setBookingOpen(true)}
              variant="dark"
            />
          </div>
        </div>

        <div className="min-h-[360px] overflow-x-auto">
          {loading ? (
            <div className="flex h-72 items-center justify-center text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading typologies
            </div>
          ) : error ? (
            <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-red-600">
              {error}
            </div>
          ) : (
            <table className="min-w-[920px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="w-12 px-3 py-3"></th>
                  <th className="px-4 py-3">Area activity</th>
                  <th className="w-24 px-4 py-3 text-center">Block</th>
                  <th className="px-4 py-3">Name activity</th>
                  <th className="w-24 px-4 py-3 text-center">Room</th>
                  <th className="w-24 px-4 py-3 text-center">Cost</th>
                  <th className="w-24 px-4 py-3 text-center">Limit</th>
                  <th className="w-24 px-4 py-3 text-center">Audio</th>
                  <th className="w-24 px-4 py-3 text-center">Default</th>
                  <th className="w-14 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-gray-500">
                      No typologies found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const selected = row.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className={`cursor-pointer border-b border-gray-100 transition ${
                          selected ? 'bg-yellow-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="radio"
                            checked={selected}
                            onChange={() => setSelectedId(row.id)}
                            className="h-4 w-4 accent-gray-900"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.area}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.blockAccess}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateBlockAccess(row, event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          <div className="flex items-center gap-2">
                            <Image
                              src={getTypologyIconUrlWithDefault(row.image)}
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 shrink-0 object-contain"
                            />
                            <span>{row.activityName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.room || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.cost || '-'}</td>
                        <td className={`px-4 py-3 text-center ${row.limitEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {row.limit || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={!row.audioUrl}
                            onClick={(event) => handleAudioClick(row, event)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
                              row.audioUrl
                                ? playingAudioId === row.id
                                  ? 'border-gray-900 bg-gray-100 text-gray-900'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                                : 'border-gray-200 text-gray-300'
                            }`}
                            title={
                              row.audioUrl
                                ? playingAudioId === row.id
                                  ? 'Stop audio'
                                  : 'Play audio'
                                : 'No audio'
                            }
                          >
                            {playingAudioId === row.id ? (
                              <Square className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isDefault}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => setDefaultTypology(row)}
                            className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                          />
                        </td>
                        <td className="relative px-3 py-3 text-center text-gray-400">
                          <details className="group relative inline-block" onClick={(event) => event.stopPropagation()}>
                            <summary className="cursor-pointer list-none">
                              <MoreHorizontal className="mx-auto h-4 w-4" />
                            </summary>
                            <div className="absolute right-0 z-20 mt-1 hidden min-w-[120px] rounded-md border border-gray-300 bg-white py-1 text-left shadow-lg group-open:block">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/club/settings/typology_subscription/pricelist?typologyId=${encodeURIComponent(row.id)}`
                                  )
                                }
                                className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                              >
                                List prices
                              </button>
                              <button
                                type="button"
                                onClick={() => openTimetableForRow(row)}
                                className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                              >
                                Timetable
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

      </section>

      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-md bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gray-900 px-5 py-4 text-white">
              <h2 className="text-lg font-semibold">Bookings</h2>
            </div>
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-700">
              Authorize booking in time slots of different instructors
            </div>
            <div className="space-y-4 px-5 py-5">
              <label className="flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="radio"
                  name="bookingMode"
                  checked={bookingSettings.applyCourseSetting === 'Y'}
                  onChange={() => setBookingSettings({
                    ...bookingSettings,
                    applyCourseSetting: 'Y',
                    applyTemporarySetting: 'N',
                    confirmationOption: 'no'
                  })}
                  className="h-4 w-4 accent-gray-900"
                />
                Apply the setting made for each course
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="radio"
                  name="bookingMode"
                  checked={bookingSettings.applyTemporarySetting === 'Y'}
                  onChange={() => setBookingSettings({
                    ...bookingSettings,
                    applyCourseSetting: 'N',
                    applyTemporarySetting: 'Y'
                  })}
                  className="h-4 w-4 accent-gray-900"
                />
                Apply temporarily this setting for all the courses
              </label>

              <div className={`grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3 ${
                bookingSettings.applyTemporarySetting === 'Y' ? '' : 'opacity-50'
              }`}>
                {[
                  ['no', 'No'],
                  ['ask', 'Yes, but ask for confirmation'],
                  ['yes', 'Yes']
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      disabled={bookingSettings.applyTemporarySetting !== 'Y'}
                      checked={bookingSettings.confirmationOption === value}
                      onChange={() => setBookingSettings({
                        ...bookingSettings,
                        confirmationOption: value as BookingSettings['confirmationOption']
                      })}
                      className="h-4 w-4 accent-gray-900"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={bookingSettings.selfBook === 'Y'}
                    onChange={(event) => setBookingSettings({
                      ...bookingSettings,
                      selfBook: event.target.checked ? 'Y' : 'N'
                    })}
                    className="h-4 w-4 accent-gray-900"
                  />
                  Authorizes the user to self-book
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-red-700">
                  <input
                    type="checkbox"
                    checked={bookingSettings.authorizeExpired === 'Y'}
                    onChange={(event) => setBookingSettings({
                      ...bookingSettings,
                      authorizeExpired: event.target.checked ? 'Y' : 'N'
                    })}
                    className="h-4 w-4 accent-red-700"
                  />
                  Authorize also members with subscription expired
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={() => setBookingOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                Exit
              </button>
              <button
                type="button"
                onClick={saveBookingSettings}
                disabled={savingBooking}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingAudioId(null)} />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  variant = 'default'
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  variant?: 'default' | 'dark';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        variant === 'dark'
          ? 'border-gray-800 bg-gray-900 text-white hover:bg-gray-800'
          : danger
            ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
            : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SmartPagination({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pageItems = getSmartPageItems(currentPage, totalPages);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Typology pagination">
      <PaginationIconButton
        label="First page"
        disabled={!canGoBack}
        onClick={() => goToPage(1)}
      >
        <ChevronsLeft className="h-4 w-4" />
      </PaginationIconButton>
      <PaginationIconButton
        label="Previous page"
        disabled={!canGoBack}
        onClick={() => goToPage(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </PaginationIconButton>

      {pageItems.map((item) => {
        if (typeof item !== 'number') {
          return (
            <span key={item} className="flex h-9 min-w-9 items-center justify-center px-2 text-sm font-semibold text-gray-400">
              ...
            </span>
          );
        }

        const active = item === currentPage;
        return (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            aria-current={active ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold transition ${
              active
                ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-100'
            }`}
          >
            {item}
          </button>
        );
      })}

      <PaginationIconButton
        label="Next page"
        disabled={!canGoForward}
        onClick={() => goToPage(currentPage + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </PaginationIconButton>
      <PaginationIconButton
        label="Last page"
        disabled={!canGoForward}
        onClick={() => goToPage(totalPages)}
      >
        <ChevronsRight className="h-4 w-4" />
      </PaginationIconButton>
    </nav>
  );
}

function PaginationIconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 min-w-9 items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-gray-700 transition hover:border-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

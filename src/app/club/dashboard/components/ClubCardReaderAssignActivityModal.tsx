'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

export type AssignActivityRow = {
  id: string;
  area: string;
  activityName: string;
  room: string;
  selected: boolean;
};

type ClubCardReaderAssignActivityModalProps = {
  isOpen: boolean;
  readerId: string | null;
  clubId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ClubCardReaderAssignActivityModal({
  isOpen,
  readerId,
  clubId,
  onClose,
  onSaved,
}: ClubCardReaderAssignActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<AssignActivityRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!isOpen || !readerId) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
        const response = await fetch(
          `/api/club/settings/card-readers/${readerId}/activities${qs}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load activities.');
        }
        if (cancelled) return;
        const activities = Array.isArray(data.activities) ? data.activities : [];
        setHeader(String(data.header ?? ''));
        setDescription(String(data.description ?? ''));
        setRows(activities);
        setSelected(
          new Set(
            activities.filter((r: AssignActivityRow) => r.selected).map((r: AssignActivityRow) => r.id)
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load activities.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, readerId, clubId]);

  if (!isOpen) return null;

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(rows.map((row) => row.id)));
    } else {
      setSelected(new Set());
    }
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!readerId) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const response = await fetch(
        `/api/club/settings/card-readers/${readerId}/activities${qs}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ activityIds: [...selected] }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save activities.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save activities.');
    } finally {
      setSaving(false);
    }
  }

  const btnClass =
    'px-4 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:opacity-60';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-activity-title"
    >
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border border-gray-500 bg-[#f5f5f5] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-400 bg-[#4a8f96] px-4 py-3 text-white">
          <h2 id="assign-activity-title" className="text-lg font-semibold">
            Assign activities to the reader
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 hover:bg-white/20 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading activities…
            </div>
          ) : (
            <>
              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {header && (
                <p className="text-center text-sm font-semibold text-gray-900">{header}</p>
              )}
              {description && (
                <p className="rounded border border-blue-200 bg-[#dff3f9] px-3 py-2 text-center text-base font-bold text-[#8a0a21]">
                  {description}
                </p>
              )}
              <div className="overflow-x-auto rounded border border-gray-300 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Area activity</th>
                      <th className="px-3 py-2 text-left font-semibold">Name activity</th>
                      <th className="px-3 py-2 text-left font-semibold">Room</th>
                      <th className="px-3 py-2 text-center font-semibold">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleAll(e.target.checked)}
                          aria-label="Select all activities"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                          No typology activities found. Add typologies in club settings first.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">{row.area || '—'}</td>
                          <td className="px-3 py-2">{row.activityName || '—'}</td>
                          <td className="px-3 py-2">{row.room || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={selected.has(row.id)}
                              onChange={(e) => toggleRow(row.id, e.target.checked)}
                              aria-label={`Select ${row.activityName}`}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-gray-300 bg-gray-100 px-4 py-3">
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            OK
          </button>
          <button type="button" onClick={onClose} disabled={saving} className={btnClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CardReaderOption } from '@/types/clubCardReaders';
import {
  initialCardReaderForm,
  instructionForType,
  linkedIdCardsForType,
  type CardReaderAddForm,
} from './clubCardReaderFormUtils';

type ClubCardReaderFormModalProps = {
  mode: 'add' | 'edit';
  readerId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  clubId?: string | null;
  readerTypes: CardReaderOption[];
  controlModes: CardReaderOption[];
  onSaved: () => void;
};

export default function ClubCardReaderFormModal({
  mode,
  readerId,
  isOpen,
  onClose,
  clubId,
  readerTypes,
  controlModes,
  onSaved,
}: ClubCardReaderFormModalProps) {
  const [form, setForm] = useState<CardReaderAddForm>(() => initialCardReaderForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingReader, setLoadingReader] = useState(false);

  const selectedType = readerTypes.find((t) => t.id === form.readerTypeId);

  const instruction = useMemo(
    () => instructionForType(form.readerTypeId),
    [form.readerTypeId]
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSaving(false);
    if (mode === 'add') {
      setForm(initialCardReaderForm());
      setLoadingReader(false);
      return;
    }

    if (!readerId) return;

    let cancelled = false;
    async function loadReader() {
      setLoadingReader(true);
      try {
        const token = localStorage.getItem('token');
        const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
        const response = await fetch(`/api/club/settings/card-readers/${readerId}${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Unable to load reader.');
        }
        const data = await response.json();
        if (cancelled) return;
        setForm({
          description: data.description ?? '',
          numOrder: data.numOrder != null ? String(data.numOrder) : '',
          readerTypeId: data.readerTypeId != null ? String(data.readerTypeId) : '',
          ipLocal: data.ipLocal ?? '',
          ip: data.ip ?? '',
          enabled: data.enabled !== false,
          controlModeId: data.controlModeId != null ? String(data.controlModeId) : '',
          idCards: data.idCards ?? '',
        });
      } catch (err) {
        if (!cancelled) {
          setErrors({
            form: err instanceof Error ? err.message : 'Unable to load reader.',
          });
        }
      } finally {
        if (!cancelled) setLoadingReader(false);
      }
    }

    void loadReader();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, readerId, clubId]);

  useEffect(() => {
    if (!isOpen || mode !== 'add') return;
    if (!form.readerTypeId || !selectedType) {
      setForm((f) => ({ ...f, idCards: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      idCards: linkedIdCardsForType(selectedType.name, selectedType.id),
    }));
  }, [form.readerTypeId, selectedType, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== 'edit') return;
    if (!form.readerTypeId || !selectedType) return;
    setForm((f) => ({
      ...f,
      idCards: linkedIdCardsForType(selectedType.name, selectedType.id),
    }));
  }, [form.readerTypeId, selectedType, isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.readerTypeId) nextErrors.readerTypeId = 'Please select reader type.';
    if (!form.controlModeId) nextErrors.controlModeId = 'Please select reader mode.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const payload = {
        description: form.description,
        numOrder: form.numOrder,
        readerTypeId: form.readerTypeId,
        ipLocal: form.ipLocal,
        ip: form.ip,
        enabled: form.enabled,
        controlModeId: form.controlModeId,
      };

      const url =
        mode === 'edit' && readerId
          ? `/api/club/settings/card-readers/${readerId}${qs}`
          : `/api/club/settings/card-readers${qs}`;

      const response = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.fieldErrors) {
          setErrors(data.fieldErrors);
          return;
        }
        throw new Error(
          data?.error || (mode === 'edit' ? 'Failed to update reader.' : 'Failed to add reader.')
        );
      }

      onSaved();
      onClose();
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : mode === 'edit'
              ? 'Failed to update reader.'
              : 'Failed to add reader.',
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'h-9 w-full rounded border border-gray-400 bg-white px-2 text-sm text-gray-900';
  const labelClass = 'text-sm font-medium text-gray-800';
  const btnClass =
    'px-4 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:opacity-60';

  const busy = saving || loadingReader;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-reader-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-500 bg-[#f5f5f5] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-400 bg-[#4a8f96] px-4 py-3 text-white">
          <h2 id="card-reader-form-title" className="text-lg font-semibold">
            Reader
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 hover:bg-white/20 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingReader && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading reader…
            </div>
          )}

          {!loadingReader && errors.form && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </p>
          )}

          {!loadingReader && (
            <>
              <section className="rounded border border-gray-300 bg-white p-4 space-y-3">
                <h3 className="border-b border-gray-200 pb-2 font-semibold text-gray-900">
                  Lettore
                </h3>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className={labelClass}>Description</label>
                    <input
                      className={inputClass}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="sm:w-24">
                    <label className={labelClass}>Ord.</label>
                    <input
                      className={inputClass}
                      value={form.numOrder}
                      onChange={(e) => setForm({ ...form, numOrder: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      className={inputClass}
                      value={form.readerTypeId}
                      onChange={(e) => {
                        setErrors((prev) => ({ ...prev, readerTypeId: '' }));
                        setForm({ ...form, readerTypeId: e.target.value });
                      }}
                    >
                      <option value="">Please select</option>
                      {readerTypes.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    {errors.readerTypeId && (
                      <p className="mt-1 text-xs text-red-600">{errors.readerTypeId}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>IP local</label>
                    <input
                      className={inputClass}
                      value={form.ipLocal}
                      onChange={(e) => setForm({ ...form, ipLocal: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>IP public</label>
                    <input
                      className={inputClass}
                      value={form.ip}
                      onChange={(e) => setForm({ ...form, ip: e.target.value })}
                    />
                  </div>
                </div>

                {instruction && (
                  <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    {instruction}
                  </p>
                )}
              </section>

              <section className="rounded border border-gray-300 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Enable</h3>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="rounded border-gray-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label className={labelClass}>Mode of control</label>
                    <select
                      className={inputClass}
                      value={form.controlModeId}
                      onChange={(e) => {
                        setErrors((prev) => ({ ...prev, controlModeId: '' }));
                        setForm({ ...form, controlModeId: e.target.value });
                      }}
                    >
                      <option value="">Please select</option>
                      {controlModes.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    {errors.controlModeId && (
                      <p className="mt-1 text-xs text-red-600">{errors.controlModeId}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Database ID cards linked</label>
                    <input className={`${inputClass} bg-gray-100`} value={form.idCards} readOnly />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-gray-300 bg-gray-100 px-4 py-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            OK
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btnClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

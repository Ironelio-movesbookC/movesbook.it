'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import {
  createEmptyListpriceForm,
  type TypologyListpriceForm as FormState
} from '@/lib/clubTypologyListprice';

const LIST_PATH = '/club/settings/typology_subscription/pricelist';

type Props = {
  mode: 'add' | 'edit';
  listpriceId?: string;
  initialTypologyId?: string;
};

export default function TypologyListpriceForm({ mode, listpriceId, initialTypologyId = '' }: Props) {
  const router = useRouter();
  const [typologies, setTypologies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState>(() => createEmptyListpriceForm(initialTypologyId));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const query =
          mode === 'edit' && listpriceId
            ? `?id=${encodeURIComponent(listpriceId)}`
            : '';
        const response = await fetch(`/api/club/settings/typology-listprice${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Unable to load.');
        if (cancelled) return;
        setTypologies(Array.isArray(data.typologies) ? data.typologies : []);
        if (mode === 'edit' && data.listprice) {
          setForm({ ...createEmptyListpriceForm(), ...data.listprice });
        } else if (initialTypologyId) {
          setForm((c) => ({ ...c, typologyId: initialTypologyId }));
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Unable to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, listpriceId, initialTypologyId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFieldErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      return n;
    });
    setForm((c) => ({ ...c, [key]: value }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/club/settings/typology-listprice', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(mode === 'edit' ? { id: listpriceId, ...form } : form)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data?.error || 'Save failed');
      }
      const q = form.typologyId ? `?typologyId=${encodeURIComponent(form.typologyId)}` : '';
      router.push(`${LIST_PATH}${q}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="p-6">
        <p className="text-red-600">{loadError}</p>
        <button type="button" onClick={() => router.push(LIST_PATH)} className="mt-4 text-sm font-semibold">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <section className="rounded-md border border-gray-200 bg-white shadow-sm">
        <ClubSettingsTypologyTabs listPriceTypologyId={form.typologyId || null} />
        <form onSubmit={onSubmit} className="divide-y divide-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-4">
            <h1 className="text-xl font-semibold">
              {mode === 'edit' ? 'Modify list price' : 'Add list price'}
            </h1>
            <button
              type="button"
              onClick={() => router.push(LIST_PATH)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          <div className="space-y-6 p-4">
            <Section title="Typology">
              <select
                value={form.typologyId}
                onChange={(e) => set('typologyId', e.target.value)}
                className="h-10 max-w-md rounded-md border border-gray-300 px-3 text-sm"
              >
                <option value="">Select</option>
                {typologies.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {fieldErrors.typologyId && <Err msg={fieldErrors.typologyId} />}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activeStatus}
                  onChange={(e) => set('activeStatus', e.target.checked)}
                />
                Active
              </label>
            </Section>

            <Section title="Name and cost">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name of subscription" error={fieldErrors.subscriptionName}>
                  <input
                    value={form.subscriptionName}
                    onChange={(e) => set('subscriptionName', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
                <Field label="Code (5 chars)" error={fieldErrors.searchKeyword}>
                  <input
                    maxLength={5}
                    value={form.searchKeyword}
                    onChange={(e) => set('searchKeyword', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
                <Field label="Cost">
                  <input value={form.cost} onChange={(e) => set('cost', e.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
                </Field>
                <Field label="Discount (%)">
                  <input value={form.discount} onChange={(e) => set('discount', e.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
                </Field>
                <Field label="Expiry date">
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => set('expiryDate', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Installments">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Installments">
                  <input value={form.installnment} onChange={(e) => set('installnment', e.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
                </Field>
                <Field label="1st installment cost">
                  <input
                    value={form.firstCostInstallnment}
                    onChange={(e) => set('firstCostInstallnment', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
                <Field label="Days recursion">
                  <input value={form.daysRecursion} onChange={(e) => set('daysRecursion', e.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
                </Field>
              </div>
            </Section>

            <Section title="Conditions of sale">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Duration months">
                  <input
                    value={form.saleDurationMonths}
                    onChange={(e) => set('saleDurationMonths', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
                <Field label="Max accesses">
                  <input value={form.saleMaxNumber} onChange={(e) => set('saleMaxNumber', e.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" />
                </Field>
                <Field label="Number of accesses">
                  <input
                    value={form.saleNumberAccess}
                    onChange={(e) => set('saleNumberAccess', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
                <Field label="Related days">
                  <input
                    value={form.saleRelatedDays}
                    onChange={(e) => set('saleRelatedDays', e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.conditionRenewalStatus}
                  onChange={(e) => set('conditionRenewalStatus', e.target.checked)}
                />
                Conditions for renewal
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.recursiveExpires}
                  onChange={(e) => set('recursiveExpires', e.target.checked)}
                />
                Recursive subscription
              </label>
            </Section>
          </div>

          <div className="flex justify-end gap-2 bg-gray-50 px-4 py-4">
            <button type="button" onClick={() => router.push(LIST_PATH)} className="rounded-md border px-4 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h2 className="text-sm font-semibold uppercase text-gray-600">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <Err msg={error} />}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <p className="mt-1 text-sm text-red-600">{msg}</p>;
}

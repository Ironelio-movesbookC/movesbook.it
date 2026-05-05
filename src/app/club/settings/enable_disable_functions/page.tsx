'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CreditCard,
  Loader2,
  RotateCcw,
  Save,
  Stamp,
  Users,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FunctionKey = 'account' | 'membership' | 'cards' | 'subscriptionCostAndDeadline';

type EnableDisableSettings = Record<FunctionKey, boolean>;

type FunctionItem = {
  key: FunctionKey;
  title: string;
  description: string;
  Icon: LucideIcon;
};

type PendingChange = {
  key: FunctionKey;
  nextValue: boolean;
};

const API_PATH = '/api/club/settings/enable-disable-functions';

const DEFAULT_SETTINGS: EnableDisableSettings = {
  account: false,
  membership: false,
  cards: true,
  subscriptionCostAndDeadline: true
};

const FUNCTIONS: FunctionItem[] = [
  {
    key: 'account',
    title: 'Accounts',
    description: 'Disable the request of assignment of an account when insert a new member',
    Icon: Stamp
  },
  {
    key: 'membership',
    title: 'Memberships',
    description: 'Disable the request of memberships',
    Icon: Users
  },
  {
    key: 'cards',
    title: 'Cards',
    description: 'Disable the request of cards during the process of subscription',
    Icon: CreditCard
  },
  {
    key: 'subscriptionCostAndDeadline',
    title: 'Subscription costs and their deadlines',
    description: "Disable the input of costs during the subscriptions and don't create deadlines",
    Icon: CalendarDays
  }
];

function areSameSettings(a: EnableDisableSettings, b: EnableDisableSettings): boolean {
  return FUNCTIONS.every((item) => a[item.key] === b[item.key]);
}

function normalizeSettings(value: unknown): EnableDisableSettings {
  const source = value && typeof value === 'object' ? value as Partial<EnableDisableSettings> : {};
  return {
    account: Boolean(source.account),
    membership: Boolean(source.membership),
    cards: Boolean(source.cards),
    subscriptionCostAndDeadline: Boolean(source.subscriptionCostAndDeadline)
  };
}

function ToggleSwitch({
  checked,
  label,
  disabled,
  onClick
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-[22px] w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-gray-200'
      }`}
    >
      <span
        className={`h-[18px] w-[18px] rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ${
          checked ? 'translate-x-[21px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function StatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <span
      className={`inline-flex h-7 min-w-[78px] items-center justify-center rounded-full border px-3 text-xs font-semibold ${
        disabled
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {disabled ? 'Disabled' : 'Enabled'}
    </span>
  );
}

export default function EnableDisableFunctionsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<EnableDisableSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<EnableDisableSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const isDirty = useMemo(() => !areSameSettings(settings, savedSettings), [settings, savedSettings]);
  const pendingItem = pendingChange
    ? FUNCTIONS.find((item) => item.key === pendingChange.key) ?? null
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch(API_PATH, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error('Unable to load function settings');
        }

        const data = await response.json();
        const next = normalizeSettings(data.settings);

        if (!cancelled) {
          setSettings(next);
          setSavedSettings(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load function settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestToggle = (key: FunctionKey) => {
    if (loading || saving) return;
    setSuccess(null);
    setPendingChange({
      key,
      nextValue: !settings[key]
    });
  };

  const confirmToggle = () => {
    if (!pendingChange) return;
    setSettings((current) => ({
      ...current,
      [pendingChange.key]: pendingChange.nextValue
    }));
    setPendingChange(null);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Unable to save function settings');
      }

      const data = await response.json();
      const next = normalizeSettings(data.settings);
      setSettings(next);
      setSavedSettings(next);
      setSuccess('Setting updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save function settings');
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setSettings(savedSettings);
    router.push('/club/dashboard');
  };

  return (
    <div className="p-4 lg:p-6">
      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-950">Enable-disable functions</h1>
              <p className="mt-1 text-sm text-gray-500">Club's management / General settings</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isDirty && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                disabled={!isDirty || loading || saving}
                onClick={() => {
                  setSettings(savedSettings);
                  setSuccess(null);
                  setError(null);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                disabled={loading || saving}
                onClick={saveSettings}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`border-b px-4 py-3 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
            {error || success}
          </div>
        )}

        <div className="min-h-[360px]">
          {loading ? (
            <div className="flex h-80 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading function settings
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {FUNCTIONS.map((item) => {
                const Icon = item.Icon;
                const disabled = settings[item.key];

                return (
                  <div key={item.key} className="grid gap-3 px-4 py-4 transition hover:bg-gray-50 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-6">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                        disabled
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}>
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-gray-950">{item.title}</h2>
                        </div>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center md:justify-end">
                      <StatusBadge disabled={disabled} />
                    </div>

                    <div className="flex items-center justify-end md:w-16">
                      <ToggleSwitch
                        checked={disabled}
                        label={`${disabled ? 'Enable' : 'Disable'} ${item.title}`}
                        disabled={saving}
                        onClick={() => requestToggle(item.key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={cancelChanges}
            className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </section>

      {pendingChange && pendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-md border border-gray-300 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-950">Confirm function change</h2>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm leading-6 text-gray-700">
                {pendingChange.nextValue ? 'Disable' : 'Enable'} {pendingItem.title.toLowerCase()}?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                className="inline-flex h-8 items-center gap-1 rounded border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggle}
                className="inline-flex h-8 items-center gap-1 rounded border border-sky-700 bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700"
              >
                <Check className="h-3.5 w-3.5" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

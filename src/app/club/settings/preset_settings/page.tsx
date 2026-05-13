'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  HardDrive,
  Import,
  Monitor,
  Search,
  Settings,
  Users
} from 'lucide-react';

type SourceId = 'pc' | 'device';
type ImportItemId = 'masterData' | 'settings' | 'memberships';

const importItems: Array<{
  id: ImportItemId;
  label: string;
  Icon: typeof Users;
  completion: number;
}> = [
  { id: 'masterData', label: 'master data', Icon: Users, completion: 84 },
  { id: 'settings', label: 'Settings', Icon: Settings, completion: 44 },
  { id: 'memberships', label: 'Memberships and subscriptions', Icon: CreditCard, completion: 4 }
];

const sourceButtons: Array<{
  id: SourceId;
  label: string;
  Icon: typeof Monitor;
}> = [
  { id: 'pc', label: 'PC that runs Gym Access', Icon: Monitor },
  { id: 'device', label: 'Search Dbase on a device', Icon: Search }
];

const defaultSelections: Record<ImportItemId, boolean> = {
  masterData: false,
  settings: false,
  memberships: false
};

export default function PresetSettingsPage() {
  const [software, setSoftware] = useState('Gym Access 2.5/3.0');
  const [source, setSource] = useState<SourceId>('pc');
  const [selectedItems, setSelectedItems] = useState(defaultSelections);

  const selectedCount = useMemo(
    () => Object.values(selectedItems).filter(Boolean).length,
    [selectedItems]
  );

  const toggleImportItem = (id: ImportItemId) => {
    setSelectedItems((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <main className="min-h-full bg-gray-50 p-4 lg:p-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:-mt-6 lg:px-6">
        <div>
          <p className="text-sm font-medium text-gray-500">Club&apos;s management / General settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">Load database from other apps</h1>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Section
          title="Import database"
          subtitle="Only for Italian customers"
          icon={<Database className="h-4 w-4" />}
        >
          <Panel title="Select your software">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Software
                </span>
                <select
                  value={software}
                  onChange={(event) => setSoftware(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                >
                  <option>Gym Access 2.5/3.0</option>
                </select>
              </label>

              <div className="flex flex-col items-stretch gap-2 sm:mx-auto sm:w-64">
                {sourceButtons.map((item) => {
                  const Icon = item.Icon;
                  const active = source === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSource(item.id)}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                        active
                          ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Choose what data you want import">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="space-y-3">
                {importItems.map((item) => (
                  <ImportChoice
                    key={item.id}
                    checked={selectedItems[item.id]}
                    completion={item.completion}
                    icon={<item.Icon className="h-4 w-4" />}
                    label={item.label}
                    onChange={() => toggleImportItem(item.id)}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={selectedCount === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-900 bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 xl:min-w-32"
              >
                Proceed
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Panel>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 bg-sky-700 px-4 py-3 text-white">
        {icon}
        <h2 className="text-sm font-semibold">
          {title} <span className="text-xs font-semibold text-sky-100">({subtitle})</span>
        </h2>
      </div>
      <div className="space-y-4 p-4 lg:p-5">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <legend className="ml-1 rounded-sm border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-gray-900">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function ImportChoice({
  checked,
  completion,
  icon,
  label,
  onChange
}: {
  checked: boolean;
  completion: number;
  icon: ReactNode;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
      <label className="flex min-h-8 items-center gap-3 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 accent-gray-900"
        />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600">
          {icon}
        </span>
        <span>{label}</span>
        {checked && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      </label>

      <div className="flex items-center gap-3">
        <div className="h-4 flex-1 rounded-sm border border-gray-900 bg-white">
          <div className="h-full bg-red-600" style={{ width: `${completion}%` }} />
        </div>
        <span className="w-9 text-right text-xs font-semibold text-gray-500">{completion}%</span>
      </div>
    </div>
  );
}

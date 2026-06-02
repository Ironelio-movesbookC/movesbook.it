'use client';

type TabKey = 'typologies' | 'list_prices' | 'timetable' | 'rfid' | 'overview';

export type AdminClubSettingsTabKey = TabKey;

type TabItem = {
  key: TabKey;
  label: string;
  enabled: boolean;
};

const TABS: TabItem[] = [
  { key: 'typologies', label: 'Typologies', enabled: true },
  { key: 'list_prices', label: 'List prices', enabled: true },
  { key: 'timetable', label: 'Timetable', enabled: true },
  { key: 'rfid', label: 'Rfld/Card readers', enabled: true },
  { key: 'overview', label: 'Overview', enabled: true }
];

export default function AdminClubSettingsTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (next: TabKey) => void;
}) {
  return (
    <div className="border-b border-gray-300 bg-gray-100 px-3 sm:px-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const base = 'relative -mb-px px-1 py-3 text-sm font-semibold transition select-none';
          const className = `${base} ${
            isActive
              ? 'text-gray-950'
              : tab.enabled
                ? 'text-gray-500 hover:text-gray-950'
                : 'cursor-not-allowed text-gray-400'
          }`;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (!tab.enabled) return;
                onChange(tab.key);
              }}
              disabled={!tab.enabled}
              className={className}
              title={tab.enabled ? undefined : 'Build this section later'}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-red-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


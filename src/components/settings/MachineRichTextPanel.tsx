'use client';

import RichTextEditor from '@/components/settings/RichTextEditor';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

export type MachineRichTabId =
  | 'machineTypes'
  | 'musclesPositioning'
  | 'correctExecution'
  | 'criticalMistakes'
  | 'description';

export const MACHINE_RICH_TABS: { id: MachineRichTabId; label: string; tag: string }[] = [
  { id: 'machineTypes', label: 'Types of Machines', tag: 'Machine types' },
  {
    id: 'musclesPositioning',
    label: 'Muscles Involved and Positioning',
    tag: 'Muscles & positioning',
  },
  { id: 'correctExecution', label: 'Correct Execution', tag: 'Execution' },
  {
    id: 'criticalMistakes',
    label: 'Critical Mistakes to Avoid',
    tag: 'Critical mistakes',
  },
  { id: 'description', label: 'Description', tag: 'Description' },
];

function languageFlagEmoji(code: string): string {
  const c = code.toLowerCase().split('-')[0];
  const map: Record<string, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    it: '🇮🇹',
    de: '🇩🇪',
    es: '🇪🇸',
    pt: '🇵🇹',
    ru: '🇷🇺',
    hi: '🇮🇳',
    ja: '🇯🇵',
    id: '🇮🇩',
    zh: '🇨🇳',
    ar: '🇸🇦',
  };
  return map[c] || '🌐';
}

type Props = {
  activeTab: MachineRichTabId;
  onTabChange: (tab: MachineRichTabId) => void;
  getValue: (langCode: string) => string;
  setValue: (langCode: string, html: string) => void;
};

export default function MachineRichTextPanel({
  activeTab,
  onTabChange,
  getValue,
  setValue,
}: Props) {
  const meta =
    MACHINE_RICH_TABS.find((t) => t.id === activeTab) ?? MACHINE_RICH_TABS[0];

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-slate-50/50 p-4 dark:border-gray-700">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
          Machine details (multilingual)
        </h4>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Same structure as Exercise → Execution, Suggestions, Breathing — one section at a time, all
          languages below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white/80 pb-3 pt-1 dark:border-gray-600 dark:bg-gray-900/40">
        {MACHINE_RICH_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === id
                ? 'bg-gray-900 text-white shadow dark:bg-indigo-600'
                : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[12rem] space-y-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="rounded-lg border-l-4 border-indigo-600 bg-gradient-to-r from-indigo-50/95 to-slate-50/90 p-4 shadow-sm dark:from-indigo-950/40 dark:to-gray-900/40">
          <h5 className="text-xs font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
            {meta.tag}
          </h5>
          <p className="mt-1.5 text-base font-bold text-gray-900 dark:text-white">{meta.label}</p>
        </div>

        <div className="rounded-xl border-2 border-indigo-100 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-indigo-900 dark:from-gray-800 dark:to-gray-900">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xl leading-none" aria-hidden>
              {languageFlagEmoji('en')}
            </span>
            <h5 className="text-base font-bold text-gray-900 dark:text-white">English</h5>
          </div>
          <RichTextEditor
            language="English"
            value={getValue('en')}
            onChange={(html) => setValue('en', html)}
            minHeight="12rem"
            placeholder={`Enter ${meta.label.toLowerCase()} in English…`}
          />
        </div>

        {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
          <div
            key={`machine-rich-${activeTab}-${lang.code}`}
            className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/50"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-lg leading-none" aria-hidden>
                {languageFlagEmoji(lang.code)}
              </span>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {lang.name} ({lang.code.toUpperCase()})
              </span>
            </div>
            <RichTextEditor
              language={lang.name}
              value={getValue(lang.code)}
              onChange={(html) => setValue(lang.code, html)}
              minHeight="10rem"
              placeholder={`Translation for ${lang.name}…`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

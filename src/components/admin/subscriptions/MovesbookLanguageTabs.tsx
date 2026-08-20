'use client';

import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

const SHORT_LABELS: Record<string, string> = {
  en: 'En',
  fr: 'Fr',
  it: 'It',
  de: 'De',
  es: 'Es',
  pt: 'Por',
  ru: 'Rus',
  hi: 'Ind',
  ja: 'Ja',
  id: 'Id',
  zh: 'Chin',
  ar: 'Arab',
};

type MovesbookLanguageTabsProps = {
  activeLang: string;
  onChange: (lang: string) => void;
  label?: string;
};

export default function MovesbookLanguageTabs({
  activeLang,
  onChange,
  label,
}: MovesbookLanguageTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
      {label ? <span className="text-sm text-gray-700 mr-2">{label}</span> : null}
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = activeLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            title={lang.name}
            className={`min-w-[40px] px-2 py-0.5 text-xs font-semibold border transition-colors ${
              isActive
                ? 'bg-[#f0ad4e] border-[#eea236] text-gray-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {SHORT_LABELS[lang.code] ?? lang.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

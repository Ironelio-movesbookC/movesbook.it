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

type MovesbookLanguageGridProps = {
  activeLang: string;
  onChange: (lang: string) => void;
};

export default function MovesbookLanguageGrid({
  activeLang,
  onChange,
}: MovesbookLanguageGridProps) {
  return (
    <div className="grid grid-cols-5 gap-1 w-fit">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = activeLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            title={lang.name}
            className={`min-w-[44px] px-2 py-1 text-xs font-semibold border ${
              isActive
                ? 'bg-[#f0ad4e] border-[#eea236] text-gray-900'
                : 'bg-white border-gray-400 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {SHORT_LABELS[lang.code] ?? lang.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

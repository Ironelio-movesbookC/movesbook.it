'use client';

import { SUBSCRIPTION_LANGUAGES } from '@/lib/admin/subscriptionSettingsMock';

type SubscriptionLanguageTabsProps = {
  activeLang: string;
  onChange: (lang: string) => void;
  label?: string;
  variant?: 'upper' | 'lower';
};

export default function SubscriptionLanguageTabs({
  activeLang,
  onChange,
  label,
  variant = 'upper',
}: SubscriptionLanguageTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-[#f5f5f5] px-3 py-2">
      {label ? <span className="text-sm text-gray-700 mr-2">{label}</span> : null}
      {SUBSCRIPTION_LANGUAGES.map((lang) => {
        const isActive = activeLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            className={`min-w-[36px] px-2 py-0.5 text-xs font-semibold border transition-colors ${
              isActive
                ? 'bg-[#f0ad4e] border-[#eea236] text-gray-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {variant === 'upper' ? lang.label : lang.label.toLowerCase()}
          </button>
        );
      })}
    </div>
  );
}

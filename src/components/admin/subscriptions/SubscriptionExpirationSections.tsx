'use client';

import type { SubscriptionEditSettings } from '@/types/adminSubscriptionSettings';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import RichTextEditor from '@/components/shared/RichTextEditor';

type SubscriptionExpirationSectionsProps = {
  settings: SubscriptionEditSettings;
  activeLang: string;
  onLangChange: (lang: string) => void;
  onChange: (settings: SubscriptionEditSettings) => void;
};

export default function SubscriptionExpirationSections({
  settings,
  activeLang,
  onLangChange,
  onChange,
}: SubscriptionExpirationSectionsProps) {
  const update = (patch: Partial<SubscriptionEditSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const updateExpirationMessage = (html: string) => {
    onChange({
      ...settings,
      expirationMessageByLang: { ...settings.expirationMessageByLang, [activeLang]: html },
    });
  };

  const updateLastNews = (html: string) => {
    onChange({
      ...settings,
      lastNewsByLang: { ...settings.lastNewsByLang, [activeLang]: html },
    });
  };

  return (
    <>
      <div className="border border-gray-300 mb-4">
        <div className="bg-[#f0ad4e] text-white px-4 py-2 font-bold text-sm">
          Message to be displayed first of expiration and after the expiration but only if not yet
          renewed
        </div>
        <div className="p-4 bg-white space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.expirationMessageEnabled}
              onChange={(e) => update({ expirationMessageEnabled: e.target.checked })}
            />
            Enable message
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <select
              value={settings.expirationDaysAfter}
              onChange={(e) => update({ expirationDaysAfter: Number(e.target.value) })}
              className="border border-gray-300 px-2 py-1 bg-white"
            >
              {Array.from({ length: 90 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Days after Expiration ({d})
                </option>
              ))}
            </select>
            <span>days</span>
            <select
              value={settings.expirationDaysBefore}
              onChange={(e) => update({ expirationDaysBefore: Number(e.target.value) })}
              className="border border-gray-300 px-2 py-1 bg-white"
            >
              {Array.from({ length: 120 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Days before expiration ({d})
                </option>
              ))}
            </select>
            <span>days</span>
          </div>
          <SubscriptionLanguageTabs
            activeLang={activeLang}
            onChange={onLangChange}
            label="Edit for each language"
            variant="lower"
          />
          <RichTextEditor
            value={settings.expirationMessageByLang[activeLang] ?? ''}
            onChange={updateExpirationMessage}
            minHeight="250px"
          />
        </div>
      </div>

      <div className="border border-gray-300 mb-4">
        <div className="bg-[#d9534f] text-white px-4 py-2 font-bold text-sm">
          Last news about this version
        </div>
        <SubscriptionLanguageTabs
          activeLang={activeLang}
          onChange={onLangChange}
          label="Edit last news for each language"
        />
        <div className="p-2 bg-white">
          <RichTextEditor
            value={settings.lastNewsByLang[activeLang] ?? ''}
            onChange={updateLastNews}
            minHeight="250px"
          />
        </div>
      </div>
    </>
  );
}

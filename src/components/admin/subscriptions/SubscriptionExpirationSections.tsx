'use client';

import { useState } from 'react';
import type { SubscriptionEditSettings } from '@/types/adminSubscriptionSettings';
import RegistrationVersionLastNewsBlock from '@/components/register/RegistrationVersionLastNewsBlock';
import { translateEnglishRichTextToAllLangs } from '@/lib/admin/subscriptionMultilangTranslate';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import RichTextEditor from '@/components/shared/RichTextEditor';

type SubscriptionExpirationSectionsProps = {
  settings: SubscriptionEditSettings;
  activeLang: string;
  onLangChange: (lang: string) => void;
  onChange: (settings: SubscriptionEditSettings) => void;
  versionName?: string;
};

export default function SubscriptionExpirationSections({
  settings,
  activeLang,
  onLangChange,
  onChange,
  versionName,
}: SubscriptionExpirationSectionsProps) {
  const [translatingLastNews, setTranslatingLastNews] = useState(false);

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

  const handleLastNewsTranslate = async () => {
    const enHtml = settings.lastNewsByLang.en ?? '';
    setTranslatingLastNews(true);
    try {
      const record = await translateEnglishRichTextToAllLangs(enHtml, settings.lastNewsByLang);
      onChange({
        ...settings,
        lastNewsByLang: { ...settings.lastNewsByLang, ...record },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      window.alert(
        `Translation failed.\n\n${msg}\n\nYou can edit other languages manually. Same API as Settings → Technical → Pathologies.`
      );
    } finally {
      setTranslatingLastNews(false);
    }
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
        <p className="border-b border-gray-200 bg-[#fdf5f5] px-4 py-2 text-xs text-gray-600">
          Displayed during registration in Package → Last news tab. Shown in the user&apos;s
          language; if that language is empty, the English text is used.
        </p>
        <SubscriptionLanguageTabs
          activeLang={activeLang}
          onChange={onLangChange}
          label="Edit last news for each language"
          actions={
            <button
              type="button"
              disabled={translatingLastNews}
              onClick={() => void handleLastNewsTranslate()}
              className="rounded border border-[#337ab7] bg-white px-3 py-1 text-xs font-semibold text-[#337ab7] hover:bg-[#eef5fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {translatingLastNews ? 'Translating…' : 'Translate'}
            </button>
          }
        />
        <div className="p-2 bg-white">
          <RichTextEditor
            value={settings.lastNewsByLang[activeLang] ?? ''}
            onChange={updateLastNews}
            minHeight="250px"
          />
        </div>
        <div className="border-t border-gray-200 bg-[#f9f9f9] p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">
            Registration preview — Last news tab
          </div>
          <RegistrationVersionLastNewsBlock
            lastNewsByLang={settings.lastNewsByLang}
            lang={activeLang}
            versionName={versionName}
            variant="admin-preview"
          />
        </div>
      </div>
    </>
  );
}

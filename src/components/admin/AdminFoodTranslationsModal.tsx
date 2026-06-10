'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  FOOD_LANG_FLAGS,
  getSupportedFoodLanguages,
  normalizeLangCode,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';

interface AdminFoodTranslationsModalProps {
  isOpen: boolean;
  title: string;
  translations: TranslationMap;
  multiline?: boolean;
  onClose: () => void;
  onSave: (translations: TranslationMap) => void | Promise<void>;
  saving?: boolean;
}

export default function AdminFoodTranslationsModal({
  isOpen,
  title,
  translations: initialTranslations,
  multiline = false,
  onClose,
  onSave,
  saving = false,
}: AdminFoodTranslationsModalProps) {
  const languages = useMemo(() => getSupportedFoodLanguages(), []);
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [selectedLang, setSelectedLang] = useState('en');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTranslations({ ...initialTranslations });
      setSelectedLang('en');
      setDraft(initialTranslations.en || '');
    }
  }, [isOpen, initialTranslations]);

  const applyDraft = () => {
    const code = normalizeLangCode(selectedLang);
    setTranslations((prev) => ({
      ...prev,
      [code]: multiline ? draft : draft.toUpperCase(),
    }));
  };

  const selectLanguage = (code: string) => {
    setSelectedLang(code);
    setDraft(translations[normalizeLangCode(code)] || '');
  };

  const handleSave = async () => {
    const code = normalizeLangCode(selectedLang);
    const next = {
      ...translations,
      ...(draft.trim() ? { [code]: multiline ? draft.trim() : draft.trim().toUpperCase() } : {}),
    };
    await onSave(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-[520px] shadow-2xl border border-gray-300">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-start gap-2">
            <select
              value={selectedLang}
              onChange={(e) => selectLanguage(e.target.value)}
              className="border border-gray-300 rounded-sm px-2 py-1.5 text-sm min-w-[100px]"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {FOOD_LANG_FLAGS[l.code] || '🌐'} {l.code}
                </option>
              ))}
            </select>

            {multiline ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="flex-1 min-w-[200px] border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
                placeholder="Preparation steps…"
              />
            ) : (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 min-w-[200px] border border-gray-300 rounded-sm px-2 py-1.5 text-sm uppercase"
                placeholder="Translated name"
              />
            )}

            <button
              type="button"
              onClick={applyDraft}
              className="bg-[#c0392b] hover:bg-[#a93226] text-white text-sm font-semibold px-4 py-1.5 rounded-sm"
            >
              Apply
            </button>
          </div>

          <div className="border border-gray-200 rounded-sm max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {languages.map((lang) => {
                  const value = translations[lang.code] || '';
                  const isSelected = selectedLang === lang.code;
                  return (
                    <tr
                      key={lang.code}
                      className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50/50 ${
                        isSelected ? 'bg-yellow-50' : ''
                      }`}
                      onClick={() => selectLanguage(lang.code)}
                    >
                      <td className="px-3 py-2 w-12 text-center">{FOOD_LANG_FLAGS[lang.code] || '🌐'}</td>
                      <td className="px-2 py-2 w-10 font-mono text-xs text-gray-500">{lang.code}</td>
                      <td className="px-2 py-2 text-gray-800 break-words">
                        {value || <span className="text-gray-400 italic">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-1.5 text-sm rounded-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-50 text-white px-5 py-1.5 text-sm font-semibold rounded-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

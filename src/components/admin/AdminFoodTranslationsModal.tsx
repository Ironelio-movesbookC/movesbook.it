'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [selectedLang, setSelectedLang] = useState('en');
  const [draft, setDraft] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateReady, setTranslateReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTranslations({ ...initialTranslations });
      setSelectedLang('en');
      setDraft(initialTranslations.en || '');
      setTranslateReady(
        Object.keys(initialTranslations).filter((k) => k !== 'en' && initialTranslations[k]?.trim()).length > 0
      );
      setIsTranslating(false);
    }
  }, [isOpen, initialTranslations]);

  const formatValue = (value: string) => (multiline ? value.trim() : value.trim().toUpperCase());

  const resolveEnglishSource = () => {
    if (selectedLang === 'en' && draft.trim()) return draft.trim();
    return (translations.en || draft || '').trim();
  };

  const applyDraft = () => {
    const code = normalizeLangCode(selectedLang);
    setTranslations((prev) => ({
      ...prev,
      [code]: formatValue(draft),
    }));
  };

  const selectLanguage = (code: string) => {
    setSelectedLang(code);
    setDraft(translations[normalizeLangCode(code)] || '');
  };

  const handleAutoTranslate = async () => {
    const englishSource = resolveEnglishSource();
    if (!englishSource) {
      alert('Please enter the English title first.');
      return;
    }

    const enValue = formatValue(englishSource);
    setIsTranslating(true);
    setTranslateReady(false);

    try {
      const targetLanguages = languages.filter((l) => l.code !== 'en').map((l) => l.code);

      const response = await fetch('/api/translate', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishSource, targetLanguages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
      }

      const data = await response.json();
      if (!data.translations) {
        throw new Error('Invalid translation response — no translations field found');
      }

      const trans = data.translations as Record<string, unknown>;
      const updated: TranslationMap = { ...translations, en: enValue };

      targetLanguages.forEach((lang) => {
        const incoming = trans[lang];
        if (typeof incoming === 'string' && incoming.trim() !== '') {
          updated[lang] = formatValue(incoming);
        } else if (!updated[lang]) {
          updated[lang] = '';
        }
      });

      setTranslations(updated);
      setTranslateReady(true);

      if (selectedLang === 'en') {
        setDraft(enValue);
      } else if (updated[selectedLang]) {
        setDraft(updated[selectedLang]);
      }

      const missingLanguages = targetLanguages.filter((lang) => {
        const v = trans[lang];
        return typeof v !== 'string' || v.trim() === '';
      });
      if (missingLanguages.length > 0) {
        alert(
          `Translation completed with partial results.\n\nMissing: ${missingLanguages.join(', ')}\nYou can fill them manually and Save.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Translation failed.\n\n${message}\n\nYou can enter translations manually and Save.`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    const code = normalizeLangCode(selectedLang);
    const next = {
      ...translations,
      ...(draft.trim() ? { [code]: formatValue(draft) } : {}),
    };
    await onSave(next);
  };

  if (!isOpen || !mounted) return null;

  const englishSource = resolveEnglishSource();

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white w-full max-w-[520px] shadow-2xl border border-gray-300">
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

            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={isTranslating || !englishSource}
              className="px-4 py-1.5 text-sm font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranslating ? 'Translating…' : 'Translate'}
            </button>
          </div>

          {translateReady && (
            <div className="bg-green-50 border-l-4 border-green-500 px-3 py-2 rounded text-sm text-green-900 font-medium">
              Translations ready! Review the grid below and edit if needed.
            </div>
          )}

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
    </div>,
    document.body
  );
}

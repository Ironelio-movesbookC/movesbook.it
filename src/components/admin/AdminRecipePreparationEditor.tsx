'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import RichTextEditor from '@/components/settings/RichTextEditor';
import { FLAG_FILES } from '@/constants/language.constants';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';
import { parseTranslations, TranslationMap } from '@/lib/foodDatabaseTranslations';
import {
  hasRichTextContent,
  plainTextToRichHtml,
  richTextToPlainText,
} from '@/utils/richTextTranslation';

function flagSrc(code: string): string {
  const file = FLAG_FILES[code] || `${code}.png`;
  return `/flags/${file}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface AdminRecipePreparationEditorProps {
  preparationTranslations?: string | null;
  description?: string | null;
  onChange: (translations: TranslationMap, plainDescription: string | null) => void;
}

export default function AdminRecipePreparationEditor({
  preparationTranslations,
  description,
  onChange,
}: AdminRecipePreparationEditorProps) {
  const [englishText, setEnglishText] = useState('');
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [translateReady, setTranslateReady] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const prep = parseTranslations(preparationTranslations);
    const en = prep.en || description || '';
    setEnglishText(en);
    setTranslations({ ...prep, ...(en ? { en } : {}) });
    setTranslateReady(
      Object.keys(prep).filter((k) => k !== 'en' && prep[k]?.trim()).length > 0
    );
  }, [preparationTranslations, description]);

  const emitChange = (map: TranslationMap, en: string) => {
    onChange(map, stripHtml(en) || null);
  };

  const updateEnglish = (v: string) => {
    setEnglishText(v);
    const next = { ...translations, en: v };
    setTranslations(next);
    emitChange(next, v);
  };

  const updateLang = (code: string, v: string) => {
    const next = { ...translations, [code]: v };
    setTranslations(next);
    emitChange(next, englishText);
  };

  const handleAutoTranslate = async () => {
    if (!hasRichTextContent(englishText)) {
      alert('Please enter English preparation text first');
      return;
    }

    const plainSource = richTextToPlainText(englishText);
    if (!plainSource) {
      alert('Please enter English preparation text first');
      return;
    }

    setIsTranslating(true);
    setTranslateReady(false);

    try {
      const targetLanguages = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

      const response = await fetch('/api/translate', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainSource, targetLanguages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
      }

      const data = await response.json();
      if (!data.translations) {
        throw new Error('Invalid translation response');
      }

      const trans = data.translations as Record<string, unknown>;
      const updated: TranslationMap = { ...translations, en: englishText };

      targetLanguages.forEach((lang) => {
        const incoming = trans[lang];
        if (typeof incoming === 'string' && incoming.trim() !== '') {
          updated[lang] = plainTextToRichHtml(incoming);
        } else if (!updated[lang]) {
          updated[lang] = '';
        }
      });

      setTranslations(updated);
      setTranslateReady(true);
      emitChange(updated, englishText);

      const missingLanguages = targetLanguages.filter((lang) => {
        const v = trans[lang];
        return typeof v !== 'string' || v.trim() === '';
      });
      if (missingLanguages.length > 0) {
        alert(
          `Translation completed with partial results.\n\nMissing: ${missingLanguages.join(', ')}\nYou can fill them manually.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Translation failed.\n\n${message}\n\nYou can enter translations manually.`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg overflow-hidden relative shrink-0">
            <Image src={flagSrc('en')} alt="English" fill sizes="32px" className="object-cover" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg">English (Source)</h4>
            <p className="text-sm text-gray-600">
              Enter preparation steps in English — same workflow as Language Long Texts
            </p>
          </div>
        </div>

        <RichTextEditor
          value={englishText}
          onChange={updateEnglish}
          placeholder="Type preparation instructions here…"
          minHeight="200px"
          language="English"
        />

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={isTranslating || !hasRichTextContent(englishText)}
            className="px-6 py-2.5 font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isTranslating ? 'Translating…' : 'Translate'}
          </button>
          <button
            type="button"
            onClick={() => setTranslateReady(true)}
            className="px-6 py-2.5 font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Manual Edit
          </button>
        </div>
      </div>

      {translateReady && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-5">
          <p className="text-sm text-green-900 font-semibold">
            Translations ready! Review and edit if needed.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
          <div key={lang.code} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-5 py-2.5 flex items-center gap-3 border-b">
              <div className="w-6 h-6 rounded overflow-hidden relative shrink-0">
                <Image
                  src={flagSrc(lang.code)}
                  alt={lang.name}
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-gray-900">{lang.name}</span>
            </div>
            <div className="p-4">
              <RichTextEditor
                value={translations[lang.code] || ''}
                onChange={(v) => updateLang(lang.code, v)}
                placeholder={`${lang.name} translation…`}
                minHeight="150px"
                language={lang.name}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

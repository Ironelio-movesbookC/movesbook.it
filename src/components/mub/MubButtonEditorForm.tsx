'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MUB_BUTTON_COLORS,
  MUB_LANGUAGE_OPTIONS,
  MUB_PAGE_OPEN_OPTIONS,
  MUB_TEXT_COLORS,
  MUB_TEXT_FONTS,
  mubButtonColorLabel,
} from '@/lib/mub/constants';
import MubButtonPreview from '@/components/mub/MubButtonPreview';
import MubLanguagesModal from '@/components/mub/MubLanguagesModal';

export type MubButtonFormState = {
  id?: string;
  buttonColor: string;
  textFont: string;
  textColor: string;
  iconPath: string;
  iconFileName: string;
  iconSource: 'INTERNAL' | 'EXTERNAL';
  urlToOpen: string;
  pageToOpen: string;
  editLang: string;
  translations: Record<string, { shortText: string; extendedText: string }>;
};

export function emptyMubButtonForm(lang = 'en'): MubButtonFormState {
  return {
    buttonColor: '#000000',
    textFont: 'Arial',
    textColor: 'yellow',
    iconPath: '',
    iconFileName: '',
    iconSource: 'INTERNAL',
    urlToOpen: '',
    pageToOpen: 'same_label',
    editLang: lang,
    translations: { [lang]: { shortText: '', extendedText: '' } },
  };
}

type MubButtonEditorFormProps = {
  form: MubButtonFormState;
  setForm: React.Dispatch<React.SetStateAction<MubButtonFormState>>;
  saving: boolean;
  uploadingIcon: boolean;
  onSave: () => void;
  onCancel: () => void;
  onIconUpload: (file: File) => void;
};

function rowClass() {
  return 'grid gap-2 border-b border-gray-200 py-2 sm:grid-cols-[140px_1fr] sm:items-center';
}

export default function MubButtonEditorForm({
  form,
  setForm,
  saving,
  uploadingIcon,
  onSave,
  onCancel,
  onIconUpload,
}: MubButtonEditorFormProps) {
  const [langModalOpen, setLangModalOpen] = useState(false);
  const colorIndex = Math.max(
    0,
    MUB_BUTTON_COLORS.findIndex((c) => c.value.toLowerCase() === form.buttonColor.toLowerCase()),
  );
  const currentTranslation = form.translations[form.editLang] ?? { shortText: '', extendedText: '' };

  const setTranslationField = (field: 'shortText' | 'extendedText', value: string) => {
    setForm((f) => ({
      ...f,
      translations: {
        ...f.translations,
        [f.editLang]: {
          ...(f.translations[f.editLang] ?? { shortText: '', extendedText: '' }),
          [field]: value,
        },
      },
    }));
  };

  const cycleColor = (dir: -1 | 1) => {
    const next = (colorIndex + dir + MUB_BUTTON_COLORS.length) % MUB_BUTTON_COLORS.length;
    setForm((f) => ({ ...f, buttonColor: MUB_BUTTON_COLORS[next].value }));
  };

  return (
    <div className="border-b border-gray-400 bg-white">
      <div className="flex items-center justify-end gap-2 border-b border-gray-300 bg-[#ececec] px-3 py-2">
        <button type="button" onClick={onSave} disabled={saving || uploadingIcon} className="rounded bg-red-700 px-8 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded bg-gray-900 px-6 py-1.5 text-sm font-semibold text-white hover:bg-gray-800">
          Cancel
        </button>
      </div>

      <div className="px-4 py-2 text-sm">
        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Button Color</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={mubButtonColorLabel(form.buttonColor)}
              className="min-w-[12rem] flex-1 rounded border border-gray-300 bg-white px-2 py-1"
            />
            <button type="button" onClick={() => cycleColor(-1)} className="rounded border border-gray-400 px-2 py-1 hover:bg-gray-100" aria-label="Previous color">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="inline-block h-8 w-12 rounded border border-gray-400" style={{ backgroundColor: form.buttonColor }} />
            <button type="button" onClick={() => cycleColor(1)} className="rounded border border-gray-400 px-2 py-1 hover:bg-gray-100" aria-label="Next color">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Button text font</span>
          <select value={form.textFont} onChange={(e) => setForm((f) => ({ ...f, textFont: e.target.value }))} className="max-w-xs rounded border border-gray-300 px-2 py-1">
            {MUB_TEXT_FONTS.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Button Icon</span>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="radio" name="mub-icon-source" checked={form.iconSource === 'INTERNAL'} onChange={() => setForm((f) => ({ ...f, iconSource: 'INTERNAL' }))} />
                Internal
              </label>
              <label className="inline-flex items-center gap-1 text-sm">
                <input type="radio" name="mub-icon-source" checked={form.iconSource === 'EXTERNAL'} onChange={() => setForm((f) => ({ ...f, iconSource: 'EXTERNAL' }))} />
                External
              </label>
            </div>
            {form.iconSource === 'INTERNAL' ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <span className="rounded border border-gray-400 bg-[#eef3fb] px-3 py-1 text-sm text-gray-800 hover:bg-[#dfe8f6]">
                    Choose file
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onIconUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="text-xs text-gray-600">{form.iconFileName || 'No file selected'}</span>
                {uploadingIcon ? <span className="text-xs text-gray-500">Uploading…</span> : null}
              </div>
            ) : (
              <input
                value={form.iconPath}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    iconPath: e.target.value,
                    iconFileName: e.target.value ? e.target.value.split('/').pop() ?? '' : '',
                  }))
                }
                placeholder="https://… or /path/to/icon.png"
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            )}
          </div>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Button text color</span>
          <select value={form.textColor} onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))} className="max-w-xs rounded border border-gray-300 px-2 py-1">
            {MUB_TEXT_COLORS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">URL to open</span>
          <input value={form.urlToOpen} onChange={(e) => setForm((f) => ({ ...f, urlToOpen: e.target.value }))} className="w-full rounded border border-gray-300 px-2 py-1" />
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Short text</span>
          <div className="flex flex-wrap items-center gap-2">
            <input value={currentTranslation.shortText} onChange={(e) => setTranslationField('shortText', e.target.value)} className="min-w-[10rem] flex-1 rounded border border-gray-300 px-2 py-1" />
            <select value={form.editLang} onChange={(e) => setForm((f) => ({ ...f, editLang: e.target.value }))} className="rounded border border-gray-300 px-2 py-1 text-sm">
              {MUB_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setLangModalOpen(true)} className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800">
              Set text in languages
            </button>
          </div>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Extended text</span>
          <div className="flex flex-wrap items-center gap-2">
            <input value={currentTranslation.extendedText} onChange={(e) => setTranslationField('extendedText', e.target.value)} className="min-w-[10rem] flex-1 rounded border border-gray-300 px-2 py-1" />
            <select value={form.editLang} onChange={(e) => setForm((f) => ({ ...f, editLang: e.target.value }))} className="rounded border border-gray-300 px-2 py-1 text-sm">
              {MUB_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setLangModalOpen(true)} className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800">
              Set text in languages
            </button>
          </div>
        </div>

        <div className={rowClass()}>
          <span className="font-medium text-gray-800">Page to open</span>
          <select value={form.pageToOpen} onChange={(e) => setForm((f) => ({ ...f, pageToOpen: e.target.value }))} className="max-w-xs rounded border border-gray-300 px-2 py-1">
            {MUB_PAGE_OPEN_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded border border-sky-300 bg-sky-50 p-3">
        <div className="mb-2 text-sm font-semibold text-red-700">Preview</div>
        <MubButtonPreview
          button={{
            buttonColor: form.buttonColor,
            textFont: form.textFont,
            textColor: form.textColor,
            iconPath: form.iconPath,
            shortText: currentTranslation.shortText,
            extendedText: currentTranslation.extendedText,
          }}
        />
      </div>

      {langModalOpen ? (
        <MubLanguagesModal
          translations={form.translations}
          onClose={() => setLangModalOpen(false)}
          onSave={(translations) => {
            setForm((f) => ({ ...f, translations }));
            setLangModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

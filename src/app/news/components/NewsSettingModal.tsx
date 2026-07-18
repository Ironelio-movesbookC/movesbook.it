'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface OgpVisibilitySettings {
  userTypes: string[];
  countries: string[];
  languages: string[];
  sports: string[];
  expiresAt: string | null; // ISO date string or null
}

const defaultSettings: OgpVisibilitySettings = {
  userTypes: [],
  countries: [],
  languages: [],
  sports: [],
  expiresAt: null,
};

/** Normalize ISO or date string to YYYY-MM-DD for <input type="date">. */
function toDateInputValue(expiresAt: string | null | undefined): string {
  if (expiresAt == null || expiresAt === '') return '';
  const s = String(expiresAt).trim();
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return '';
  }
}

interface Option {
  value: string;
  label: string;
}

interface NewsSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: OgpVisibilitySettings | null;
  onSave: (settings: OgpVisibilitySettings) => void;
  onDeleteSettings?: () => void;
  options: {
    userTypes: Option[];
    countries: string[];
    languages: Option[];
    sports: Option[];
  } | null;
}

export default function NewsSettingModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
  onDeleteSettings,
  options,
}: NewsSettingModalProps) {
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [enableUserTypes, setEnableUserTypes] = useState(false);
  const [enableCountries, setEnableCountries] = useState(false);
  const [enableLanguages, setEnableLanguages] = useState(false);
  const [enableSports, setEnableSports] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = initialSettings ?? defaultSettings;
      const nextCountries = s.countries ?? [];
      setUserTypes(s.userTypes ?? []);
      setCountries(nextCountries);
      setLanguages(s.languages ?? []);
      setSports(s.sports ?? []);
      setExpiresAt(toDateInputValue(s.expiresAt ?? null));
      setEnableUserTypes((s.userTypes?.length ?? 0) > 0);
      // Country master = "all selected"; partial/manual picks keep it off.
      setEnableCountries(
        !!options?.countries.length &&
          nextCountries.length === options.countries.length &&
          options.countries.every((c) => nextCountries.includes(c))
      );
      setEnableLanguages((s.languages?.length ?? 0) > 0);
      setEnableSports((s.sports?.length ?? 0) > 0);
    }
  }, [isOpen, initialSettings, options]);

  const handleSave = () => {
    onSave({
      userTypes: enableUserTypes ? userTypes : [],
      // Persist whatever countries are checked (including manual picks while master is off).
      countries,
      languages: enableLanguages ? languages : [],
      sports: enableSports ? sports : [],
      expiresAt: expiresAt.trim() || null,
    });
    onClose();
  };

  const syncCountryMaster = (next: string[]) => {
    if (!options) {
      setEnableCountries(false);
      return;
    }
    setEnableCountries(
      options.countries.length > 0 &&
        next.length === options.countries.length &&
        options.countries.every((c) => next.includes(c))
    );
  };

  const toggleCountry = (value: string) => {
    const next = countries.includes(value)
      ? countries.filter((x) => x !== value)
      : [...countries, value];
    setCountries(next);
    syncCountryMaster(next);
  };

  const handleDeleteSettings = () => {
    onSave(defaultSettings);
    onDeleteSettings?.();
    onClose();
  };

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    if (list.includes(value)) set(list.filter((x) => x !== value));
    else set([...list, value]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-setting-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 id="news-setting-title" className="text-lg font-semibold text-gray-900">
            News Setting
          </h2>
          <div className="flex items-center gap-2">
            {onDeleteSettings && (
              <button
                type="button"
                onClick={handleDeleteSettings}
                className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Delete Settings
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Duration */}

          <p className="text-sm font-medium text-gray-700">Who can see it?</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (expiration date)</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setExpiresAt('2099-12-31')}
                disabled={expiresAt === '2099-12-31'}
                className="shrink-0 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
                aria-label="No expiration"
                title="No expiration"
              >
                No Expiration
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              After this date the article is hidden from users. Super admin and admin still see it.
            </p>
          </div>

          {options && (
            <>
              {/* Users Sports */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={enableSports}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableSports(checked);
                      if (checked) setSports(options.sports.map((s) => s.value));
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Users Sports</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {options.sports.map((s) => (
                      <label key={s.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={sports.includes(s.value)}
                          onChange={() => toggle(sports, s.value, setSports)}
                          disabled={!enableSports}
                          className="rounded border-gray-300"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Type */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={enableUserTypes}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableUserTypes(checked);
                      if (checked) setUserTypes(options.userTypes.map((t) => t.value));
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Users Type</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {options.userTypes.map((t) => (
                      <label key={t.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={userTypes.includes(t.value)}
                          onChange={() => toggle(userTypes, t.value, setUserTypes)}
                          disabled={!enableUserTypes}
                          className="rounded border-gray-300"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={enableLanguages}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableLanguages(checked);
                      if (checked) setLanguages(options.languages.map((l) => l.value));
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Language</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {options.languages.map((l) => (
                      <label key={l.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={languages.includes(l.value)}
                          onChange={() => toggle(languages, l.value, setLanguages)}
                          disabled={!enableLanguages}
                          className="rounded border-gray-300"
                        />
                        {l.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Country: master selects/clears all; individuals stay editable when master is off */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={enableCountries}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableCountries(checked);
                      setCountries(checked ? options.countries.slice() : []);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Country</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-1.5">
                    {options.countries.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={countries.includes(c)}
                          onChange={() => toggleCountry(c)}
                          className="rounded border-gray-300"
                        />
                        {c}
                      </label>
                    ))}
                    {options.countries.length === 0 && (
                      <p className="text-xs text-gray-500">No countries available.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
          >
            Back as before
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export { defaultSettings };

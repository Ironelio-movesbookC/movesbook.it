'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type ChatUserFilterSettings = {
  sports: string[];
  userTypes: string[];
  countries: string[];
};

export const defaultChatUserFilterSettings: ChatUserFilterSettings = {
  sports: [],
  userTypes: [],
  countries: [],
};

type Option = { value: string; label: string };

type ChatSettingsUsersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: ChatUserFilterSettings | null;
  onSave: (settings: ChatUserFilterSettings) => void;
  onDeleteSettings?: () => void;
  options: {
    sports: Option[];
    userTypes: Option[];
    countries: string[];
  } | null;
};

export default function ChatSettingsUsersModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
  onDeleteSettings,
  options,
}: ChatSettingsUsersModalProps) {
  const [sports, setSports] = useState<string[]>([]);
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [enableSports, setEnableSports] = useState(false);
  const [enableUserTypes, setEnableUserTypes] = useState(false);
  const [enableCountries, setEnableCountries] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const s = initialSettings ?? defaultChatUserFilterSettings;
    const nextCountries = s.countries ?? [];
    setSports(s.sports ?? []);
    setUserTypes(s.userTypes ?? []);
    setCountries(nextCountries);
    setEnableSports((s.sports?.length ?? 0) > 0);
    setEnableUserTypes((s.userTypes?.length ?? 0) > 0);
    setEnableCountries(
      !!options?.countries.length &&
        nextCountries.length === options.countries.length &&
        options.countries.every((c) => nextCountries.includes(c)),
    );
  }, [isOpen, initialSettings, options]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    if (list.includes(value)) set(list.filter((x) => x !== value));
    else set([...list, value]);
  };

  const syncCountryMaster = (next: string[]) => {
    if (!options) {
      setEnableCountries(false);
      return;
    }
    setEnableCountries(
      options.countries.length > 0 &&
        next.length === options.countries.length &&
        options.countries.every((c) => next.includes(c)),
    );
  };

  const toggleCountry = (value: string) => {
    const next = countries.includes(value)
      ? countries.filter((x) => x !== value)
      : [...countries, value];
    setCountries(next);
    syncCountryMaster(next);
  };

  const handleSave = () => {
    onSave({
      sports: enableSports ? sports : [],
      userTypes: enableUserTypes ? userTypes : [],
      countries,
    });
    onClose();
  };

  const handleDeleteSettings = () => {
    onSave(defaultChatUserFilterSettings);
    onDeleteSettings?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-settings-users-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md border border-[#c8c8c8] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ddd] px-4 py-3">
          <h2 id="chat-settings-users-title" className="text-base font-semibold text-[#222]">
            Settings users
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSettings}
              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm font-medium text-gray-700">Who can see it?</p>

          {options && (
            <>
              <div>
                <label className="mb-2 flex items-center gap-2">
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
                <div className="max-h-32 overflow-y-auto rounded border border-gray-200 p-3">
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

              <div>
                <label className="mb-2 flex items-center gap-2">
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
                <div className="max-h-32 overflow-y-auto rounded border border-gray-200 p-3">
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

              <div>
                <label className="mb-2 flex items-center gap-2">
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
                <div className="max-h-48 overflow-y-auto rounded border border-gray-200 p-3">
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
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded border border-gray-300 bg-[#e8e8e8] px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
          >
            Back as before
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

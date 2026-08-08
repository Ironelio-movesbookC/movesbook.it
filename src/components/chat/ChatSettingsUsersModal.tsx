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
    // Country master = "all selected"; partial/manual picks keep it off.
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
      // Persist whatever countries are checked (including manual picks while master is off).
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
        className="flex h-[min(82vh,720px)] max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-sm border border-[#bdbdbd] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — light lime like legacy Settings users */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#c8c8c8] bg-[#e8f0b0] px-3 py-2.5">
          <h2 id="chat-settings-users-title" className="text-[15px] font-semibold text-[#222]">
            Settings users
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDeleteSettings}
              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50/80"
            >
              Delete Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-black/5"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <p className="text-sm font-medium text-gray-800">Who can see it?</p>

          {!options && (
            <p className="text-sm text-gray-500">Loading filter options…</p>
          )}

          {options && (
            <>
              {/* Users Sports — master selects all; children editable only when enabled */}
              <div>
                <label className="mb-1.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableSports}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableSports(checked);
                      setSports(checked ? options.sports.map((s) => s.value) : []);
                    }}
                    className="rounded border-gray-400"
                  />
                  <span className="text-sm font-medium text-gray-800">Users Sports</span>
                </label>
                <div className="max-h-[140px] overflow-y-auto rounded-sm border border-[#d0d0d0] bg-[#ececec] p-2.5">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3">
                    {options.sports.map((s) => (
                      <label key={s.value} className="flex items-center gap-1.5 text-[13px] text-gray-800">
                        <input
                          type="checkbox"
                          checked={sports.includes(s.value)}
                          onChange={() => toggle(sports, s.value, setSports)}
                          disabled={!enableSports}
                          className="rounded border-gray-400"
                        />
                        <span className={!enableSports ? 'text-gray-400' : undefined}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Type */}
              <div>
                <label className="mb-1.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableUserTypes}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableUserTypes(checked);
                      setUserTypes(checked ? options.userTypes.map((t) => t.value) : []);
                    }}
                    className="rounded border-gray-400"
                  />
                  <span className="text-sm font-medium text-gray-800">Users Type</span>
                </label>
                <div className="max-h-[100px] overflow-y-auto rounded-sm border border-[#d0d0d0] bg-[#ececec] p-2.5">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {options.userTypes.map((t) => (
                      <label key={t.value} className="flex items-center gap-1.5 text-[13px] text-gray-800">
                        <input
                          type="checkbox"
                          checked={userTypes.includes(t.value)}
                          onChange={() => toggle(userTypes, t.value, setUserTypes)}
                          disabled={!enableUserTypes}
                          className="rounded border-gray-400"
                        />
                        <span className={!enableUserTypes ? 'text-gray-400' : undefined}>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Country: master selects/clears all; individuals stay editable when master is off */}
              <div>
                <label className="mb-1.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableCountries}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableCountries(checked);
                      setCountries(checked ? options.countries.slice() : []);
                    }}
                    className="rounded border-gray-400"
                  />
                  <span className="text-sm font-medium text-gray-800">Country</span>
                </label>
                <div className="max-h-[220px] overflow-y-auto rounded-sm border border-[#d0d0d0] bg-[#ececec] p-2.5">
                  <div className="flex flex-col gap-1">
                    {options.countries.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-[13px] text-gray-800">
                        <input
                          type="checkbox"
                          checked={countries.includes(c)}
                          onChange={() => toggleCountry(c)}
                          className="rounded border-gray-400"
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

        <div className="flex shrink-0 gap-2 border-t border-[#d0d0d0] p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-sm border border-[#bdbdbd] bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back as before
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

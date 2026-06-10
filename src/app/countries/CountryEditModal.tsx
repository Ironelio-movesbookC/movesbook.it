'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CountryEditSavePayload, CountryExtendedSettings } from './countryEditTypes';
import { CountryPartnersListModal } from './CountryPartnersListModal';
import { CountryRegionsModal } from './CountryRegionsModal';
import {
  loadCountryExtendedSettings,
  saveCountryExtendedSettings,
} from '@/lib/countries/countrySettingsStorage';
import { countryFlagSrc } from '@/lib/countries/countryFlag';

export type CountryRow = {
  id: number;
  name: string;
  iso2: string;
  continent: string;
  population: number;
  officialLanguage: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  eurRate: number;
  usdRate: number;
  currencyCode: string;
  regions: number;
  /** Admin “setting completed” flag; used for list filtering */
  settingCompleted?: boolean;
};

const CONTINENTS = [
  'West Asia',
  'West Europe',
  'North Africa',
  'South America',
  'East Europe',
  'Central America',
  'Oceania',
  'East Asia',
  'North America',
  'Caribbean',
  'South Asia',
];

const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'French',
  'Spanish',
  'Arabic',
  'German',
  'Russian',
  'Italian',
  'Dutch',
  'Urdu',
  'Bengali',
  'Albanian',
  'Azerbaijani',
  'Portuguese',
  '—',
];

const INCOME_CURRENCIES = ['EUR', 'USD', 'GBP'];

const CURRENCY_NAMES: Record<string, string> = {
  AFN: 'Afghani',
  ALL: 'Lek',
  DZD: 'Dinar',
  ARS: 'Peso',
  AMD: 'Dram',
  AWG: 'Florin',
  AUD: 'Dollar',
  EUR: 'Euro',
  AZN: 'Manat',
  USD: 'Dollar',
  BHD: 'Dinar',
  BDT: 'Taka',
  BBD: 'Dollar',
};

function describeCurrency(code: string) {
  return CURRENCY_NAMES[code] ?? code;
}

function rowToForm(row: CountryRow, extended: CountryExtendedSettings) {
  const safeEur = row.eurRate || 1;
  const safeUsd = row.usdRate || 1;
  return {
    completed: row.settingCompleted ?? false,
    abbreviation: row.iso2.toUpperCase(),
    population: String(row.population),
    annualIncome: extended.annualIncome,
    incomeCurrency: extended.incomeCurrency,
    ratioWithUs: extended.ratioWithUs,
    percentageOr: extended.percentageOr,
    virtualCost: extended.virtualCost,
    continent: row.continent,
    officialLanguage: row.officialLanguage,
    primaryLanguage: row.primaryLanguage,
    secondaryLanguage: row.secondaryLanguage === '—' ? '—' : row.secondaryLanguage,
    currencyCode: row.currencyCode,
    currencyDescription: extended.currencyDescription || describeCurrency(row.currencyCode),
    exchangeEurPerAfn: extended.exchangeEurPerUnit || (1 / safeEur).toFixed(4),
    exchange1EurAfn: extended.exchange1Eur || safeEur.toFixed(3),
    exchangeUsdPerAfn: extended.exchangeUsdPerUnit || (1 / safeUsd).toFixed(4),
    exchange1UsdAfn: extended.exchange1Usd || safeUsd.toFixed(3),
    flagSrc: countryFlagSrc(row.iso2),
    countryPictureName: extended.countryPictureName,
    countryPictureDataUrl: extended.countryPictureDataUrl ?? '',
    countryPicturePreview: extended.countryPictureDataUrl || null,
  };
}

function formToSavePayload(form: FormState, extended: CountryExtendedSettings): CountryEditSavePayload {
  const eurRate = Number.parseFloat(form.exchange1EurAfn) || 1;
  const usdRate = Number.parseFloat(form.exchange1UsdAfn) || 1;

  return {
    settingCompleted: form.completed,
    iso2: form.abbreviation.toLowerCase(),
    population: Number.parseInt(form.population, 10) || 0,
    continent: form.continent,
    officialLanguage: form.officialLanguage,
    primaryLanguage: form.primaryLanguage,
    secondaryLanguage: form.secondaryLanguage,
    currencyCode: form.currencyCode,
    eurRate,
    usdRate,
    regions: extended.regions.length,
    extended: {
      ...extended,
      annualIncome: form.annualIncome,
      incomeCurrency: form.incomeCurrency,
      ratioWithUs: form.ratioWithUs,
      percentageOr: form.percentageOr,
      virtualCost: form.virtualCost,
      currencyDescription: form.currencyDescription,
      exchangeEurPerUnit: form.exchangeEurPerAfn,
      exchange1Eur: form.exchange1EurAfn,
      exchangeUsdPerUnit: form.exchangeUsdPerAfn,
      exchange1Usd: form.exchange1UsdAfn,
      countryPictureName: form.countryPictureName,
      countryPictureDataUrl: form.countryPictureDataUrl || undefined,
    },
  };
}

type FormState = ReturnType<typeof rowToForm>;

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(140px,38%)_1fr] gap-x-3 gap-y-1 items-center py-2 border-b border-gray-200 text-sm">
      <label className="font-semibold text-gray-800">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type Props = {
  row: CountryRow | null;
  onClose: () => void;
  onSave: (countryId: number, payload: CountryEditSavePayload) => void;
  onRegionsCountChange?: (countryId: number, regionsCount: number) => void;
};

type SubModal = 'regions' | 'distributors' | 'dealers' | null;

export function CountryEditModal({ row, onClose, onSave, onRegionsCountChange }: Props) {
  const titleId = useId();
  const flagInputId = useId();
  const [form, setForm] = useState<FormState | null>(null);
  const [extended, setExtended] = useState<CountryExtendedSettings | null>(null);
  const [subModal, setSubModal] = useState<SubModal>(null);

  useEffect(() => {
    if (row) {
      const loaded = loadCountryExtendedSettings(row.id, row.name);
      setExtended(loaded);
      setForm(rowToForm(row, loaded));
      setSubModal(null);
    } else {
      setExtended(null);
      setForm(null);
      setSubModal(null);
    }
  }, [row]);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [row, onClose]);

  const updateExtended = (next: CountryExtendedSettings) => {
    setExtended(next);
    if (row) saveCountryExtendedSettings(row.id, next);
  };

  const handleSave = () => {
    if (!row || !form || !extended) return;
    const payload = formToSavePayload(form, extended);
    saveCountryExtendedSettings(row.id, payload.extended);
    onSave(row.id, payload);
    onClose();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const persistExtended = (next: CountryExtendedSettings) => {
    updateExtended(next);
    if (row) onRegionsCountChange?.(row.id, next.regions.length);
  };

  const onFlagFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    const url = URL.createObjectURL(file);
    if (form.flagSrc.startsWith('blob:')) URL.revokeObjectURL(form.flagSrc);
    update('flagSrc', url);
  };

  const clearFlag = () => {
    if (!form || !row) return;
    if (form.flagSrc.startsWith('blob:')) URL.revokeObjectURL(form.flagSrc);
    update('flagSrc', countryFlagSrc(row.iso2));
  };

  const onCountryPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setForm({
        ...form,
        countryPictureName: file.name,
        countryPictureDataUrl: dataUrl,
        countryPicturePreview: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const clearCountryPicture = () => {
    if (!form) return;
    setForm({
      ...form,
      countryPictureName: '',
      countryPictureDataUrl: '',
      countryPicturePreview: null,
    });
  };

  const continentOptions = useMemo(() => {
    if (!row) return CONTINENTS;
    const set = new Set(CONTINENTS);
    if (!set.has(row.continent)) return [row.continent, ...CONTINENTS];
    return CONTINENTS;
  }, [row]);

  const primaryLangOptions = useMemo(() => {
    if (!form) return LANGUAGE_OPTIONS;
    const s = new Set(LANGUAGE_OPTIONS);
    if (!s.has(form.primaryLanguage)) return [form.primaryLanguage, ...LANGUAGE_OPTIONS];
    return LANGUAGE_OPTIONS;
  }, [form]);

  const secondaryLangOptions = useMemo(() => {
    if (!form) return LANGUAGE_OPTIONS;
    const s = new Set(LANGUAGE_OPTIONS);
    if (!s.has(form.secondaryLanguage)) return [form.secondaryLanguage, ...LANGUAGE_OPTIONS];
    return LANGUAGE_OPTIONS;
  }, [form]);

  if (!row || !form || !extended) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-gray-300 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col rounded-sm">
        <div className="flex items-center justify-between bg-[#2563eb] text-white px-3 py-2 shrink-0">
          <h2 id={titleId} className="text-sm font-bold">
            Country — {row.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#4b5563] hover:bg-[#374151] text-white w-7 h-7 flex items-center justify-center text-sm leading-none"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2 flex gap-2 shrink-0 border-b border-gray-200">
          {(
            [
              ['regions', 'Regions'],
              ['distributors', 'Distributors'],
              ['dealers', 'Dealers'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-sm hover:bg-gray-900"
              onClick={() => setSubModal(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-3 pb-4">
          <FormRow label="Completed">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(e) => update('completed', e.target.checked)}
              className="align-middle"
            />
          </FormRow>

          <FormRow label="Country abbreviation">
            <input
              type="text"
              value={form.abbreviation}
              onChange={(e) => update('abbreviation', e.target.value.toUpperCase())}
              className="w-full max-w-[200px] border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label="Flag">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={clearFlag}
                className="self-start rounded-full bg-gray-400 hover:bg-gray-500 text-white w-5 h-5 text-xs leading-none mb-0.5"
                aria-label="Reset flag"
              >
                ×
              </button>
              <div className="flex items-center gap-2 max-w-[280px]">
                <div className="flex-1 flex items-center border border-gray-300 px-2 py-1 bg-white gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.flagSrc} alt="" width={28} height={21} className="border border-gray-200" />
                  <input type="file" accept="image/*" className="hidden" id={flagInputId} onChange={onFlagFile} />
                  <label
                    htmlFor={flagInputId}
                    className="ml-auto border border-gray-400 bg-gray-100 px-2 py-0.5 text-xs cursor-pointer hover:bg-gray-200"
                  >
                    …
                  </label>
                </div>
              </div>
            </div>
          </FormRow>

          <FormRow label="Country picture">
            <div className="space-y-2">
              <input type="file" accept="image/*" onChange={onCountryPicture} className="text-xs max-w-full" />
              <div className="border border-gray-300 bg-gray-50 h-28 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                {form.countryPicturePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.countryPicturePreview} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span>No preview</span>
                )}
              </div>
              {form.countryPictureName ? (
                <button type="button" onClick={clearCountryPicture} className="text-xs text-red-600 underline">
                  Clear picture
                </button>
              ) : null}
            </div>
          </FormRow>

          <FormRow label="Population">
            <input
              type="text"
              value={form.population}
              onChange={(e) => update('population', e.target.value.replace(/\D/g, ''))}
              className="w-full max-w-[200px] border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label="Annual income">
            <input
              type="text"
              value={form.annualIncome}
              onChange={(e) => update('annualIncome', e.target.value)}
              className="w-full max-w-[200px] border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label="Currency">
            <select
              value={form.incomeCurrency}
              onChange={(e) => update('incomeCurrency', e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm max-w-[200px]"
            >
              {INCOME_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Ratio with us">
            <input
              type="text"
              value={form.ratioWithUs}
              onChange={(e) => update('ratioWithUs', e.target.value)}
              className="w-full max-w-[200px] border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label=" ">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-red-600 font-bold text-sm">OR</span>
              <button
                type="button"
                className="border border-gray-400 w-7 h-7 text-sm font-bold bg-white hover:bg-gray-100"
                onClick={() => update('percentageOr', Math.max(0, form.percentageOr - 1))}
              >
                −
              </button>
              <div className="flex-1 min-w-[120px] max-w-[200px] flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">0</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.percentageOr}
                  onChange={(e) => update('percentageOr', Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">100%</span>
              </div>
              <button
                type="button"
                className="border border-gray-400 w-7 h-7 text-sm font-bold bg-white hover:bg-gray-100"
                onClick={() => update('percentageOr', Math.min(100, form.percentageOr + 1))}
              >
                +
              </button>
            </div>
          </FormRow>

          <FormRow label="Virtual cost">
            <input
              type="text"
              value={form.virtualCost}
              onChange={(e) => update('virtualCost', e.target.value)}
              className="w-full max-w-[200px] border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label="Continent">
            <select
              value={form.continent}
              onChange={(e) => update('continent', e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm max-w-[240px] w-full"
            >
              {continentOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Official Language">
            <input
              type="text"
              value={form.officialLanguage}
              onChange={(e) => update('officialLanguage', e.target.value)}
              className="w-full border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <FormRow label="Primary Language">
            <select
              value={form.primaryLanguage}
              onChange={(e) => update('primaryLanguage', e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm w-full max-w-[240px]"
            >
              {primaryLangOptions
                .filter((l) => l !== '—')
                .map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
            </select>
          </FormRow>

          <FormRow label="Secondary Language">
            <select
              value={form.secondaryLanguage}
              onChange={(e) => update('secondaryLanguage', e.target.value)}
              className="border border-gray-300 px-2 py-1 text-sm w-full max-w-[240px]"
            >
              {secondaryLangOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Currency">
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) => update('currencyCode', e.target.value.toUpperCase())}
              className="w-full max-w-[120px] border border-gray-300 px-2 py-1 text-sm font-medium"
            />
          </FormRow>

          <FormRow label="Description">
            <input
              type="text"
              value={form.currencyDescription}
              onChange={(e) => update('currencyDescription', e.target.value)}
              className="w-full border border-gray-300 px-2 py-1 text-sm"
            />
          </FormRow>

          <div className="mt-4 space-y-3">
            <div className="border border-gray-400 p-3 space-y-2">
              <div className="text-xs font-bold text-gray-800">Exchange EUR</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="text"
                  value={form.exchangeEurPerAfn}
                  onChange={(e) => update('exchangeEurPerAfn', e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 tabular-nums"
                />
                <span className="text-gray-600">For 1 {form.currencyCode}</span>
              </div>
              <div className="text-xs font-bold text-gray-800">Exchange 1 EUR</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="text"
                  value={form.exchange1EurAfn}
                  onChange={(e) => update('exchange1EurAfn', e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 tabular-nums"
                />
                <span className="text-red-600 font-semibold">{form.currencyCode}</span>
              </div>
            </div>

            <div className="border border-gray-400 p-3 space-y-2">
              <div className="text-xs font-bold text-gray-800">Exchange USD</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="text"
                  value={form.exchangeUsdPerAfn}
                  onChange={(e) => update('exchangeUsdPerAfn', e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 tabular-nums"
                />
                <span className="text-gray-600">For 1 {form.currencyCode}</span>
              </div>
              <div className="text-xs font-bold text-gray-800">Exchange 1 USD</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="text"
                  value={form.exchange1UsdAfn}
                  onChange={(e) => update('exchange1UsdAfn', e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 tabular-nums"
                />
                <span className="text-red-600 font-semibold">{form.currencyCode}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              className="bg-gradient-to-b from-[#444] to-[#222] text-white px-6 py-2 text-sm font-bold rounded-sm border border-black hover:from-[#555] hover:to-[#333]"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              type="button"
              className="bg-gradient-to-b from-[#444] to-[#222] text-white px-6 py-2 text-sm font-bold rounded-sm border border-black hover:from-[#555] hover:to-[#333]"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {subModal === 'regions' ? (
        <CountryRegionsModal
          countryName={row.name}
          regions={extended.regions}
          onChange={(regions) => persistExtended({ ...extended, regions })}
          onClose={() => setSubModal(null)}
        />
      ) : null}

      {subModal === 'distributors' ? (
        <CountryPartnersListModal
          countryName={row.name}
          titlePrefix="Distributor"
          records={extended.distributors}
          onChange={(distributors) => persistExtended({ ...extended, distributors })}
          onClose={() => setSubModal(null)}
        />
      ) : null}

      {subModal === 'dealers' ? (
        <CountryPartnersListModal
          countryName={row.name}
          titlePrefix="Dealer"
          records={extended.dealers}
          onChange={(dealers) => persistExtended({ ...extended, dealers })}
          onClose={() => setSubModal(null)}
        />
      ) : null}
    </div>
  );
}

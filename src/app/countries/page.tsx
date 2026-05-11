'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { CountryEditModal, type CountryRow } from './CountryEditModal';
import {
  CountriesFilterModal,
  DEFAULT_COUNTRIES_FILTER,
  type CountriesFilterState,
} from './CountriesFilterModal';

const DEMO_COUNTRIES: CountryRow[] = [
  {
    id: 1,
    name: 'Afghanistan',
    iso2: 'af',
    continent: 'West Asia',
    population: 38042754,
    officialLanguage: 'Afgano',
    primaryLanguage: 'English',
    secondaryLanguage: 'Hindi',
    eurRate: 91.35,
    usdRate: 77.2,
    currencyCode: 'AFN',
    regions: 33,
    settingCompleted: true,
  },
  {
    id: 2,
    name: 'Albania',
    iso2: 'al',
    continent: 'West Europe',
    population: 2845955,
    officialLanguage: 'Albanian',
    primaryLanguage: 'English',
    secondaryLanguage: 'French',
    eurRate: 123.52,
    usdRate: 102.43,
    currencyCode: 'ALL',
    regions: 12,
  },
  {
    id: 3,
    name: 'Algeria',
    iso2: 'dz',
    continent: 'North Africa',
    population: 43053054,
    officialLanguage: 'Arabic',
    primaryLanguage: 'Arabic',
    secondaryLanguage: 'French',
    eurRate: 158.87,
    usdRate: 132.91,
    currencyCode: 'DZD',
    regions: 48,
  },
  {
    id: 4,
    name: 'Argentina',
    iso2: 'ar',
    continent: 'South America',
    population: 43432376,
    officialLanguage: 'Spanish',
    primaryLanguage: 'Spanish',
    secondaryLanguage: 'Italian',
    eurRate: 100.2,
    usdRate: 88.16,
    currencyCode: 'ARS',
    regions: 24,
  },
  {
    id: 5,
    name: 'Armenia',
    iso2: 'am',
    continent: 'East Europe',
    population: 2963234,
    officialLanguage: 'Hayastan',
    primaryLanguage: 'Russian',
    secondaryLanguage: 'English',
    eurRate: 825.92,
    usdRate: 521.8,
    currencyCode: 'AMD',
    regions: 3,
  },
  {
    id: 6,
    name: 'Aruba',
    iso2: 'aw',
    continent: 'Central America',
    population: 106765,
    officialLanguage: 'Dutch',
    primaryLanguage: 'English',
    secondaryLanguage: 'Spanish',
    eurRate: 2.01,
    usdRate: 1.79,
    currencyCode: 'AWG',
    regions: 0,
  },
  {
    id: 7,
    name: 'Australia',
    iso2: 'au',
    continent: 'Oceania',
    population: 25499884,
    officialLanguage: 'English',
    primaryLanguage: 'English',
    secondaryLanguage: '—',
    eurRate: 1.65,
    usdRate: 1.52,
    currencyCode: 'AUD',
    regions: 8,
  },
  {
    id: 8,
    name: 'Austria',
    iso2: 'at',
    continent: 'West Europe',
    population: 9006698,
    officialLanguage: 'German',
    primaryLanguage: 'German',
    secondaryLanguage: 'English',
    eurRate: 1,
    usdRate: 1.08,
    currencyCode: 'EUR',
    regions: 9,
    settingCompleted: true,
  },
  {
    id: 9,
    name: 'Azerbaijan',
    iso2: 'az',
    continent: 'East Asia',
    population: 10139177,
    officialLanguage: 'Azerbaijani',
    primaryLanguage: 'Russian',
    secondaryLanguage: 'English',
    eurRate: 2.08,
    usdRate: 1.85,
    currencyCode: 'AZN',
    regions: 10,
  },
  {
    id: 10,
    name: 'Bahamas',
    iso2: 'bs',
    continent: 'North America',
    population: 393248,
    officialLanguage: 'English',
    primaryLanguage: 'English',
    secondaryLanguage: 'French',
    eurRate: 1.15,
    usdRate: 1,
    currencyCode: 'USD',
    regions: 15,
  },
  {
    id: 11,
    name: 'Bahrain',
    iso2: 'bh',
    continent: 'West Asia',
    population: 1701583,
    officialLanguage: 'Arabic',
    primaryLanguage: 'English',
    secondaryLanguage: 'Urdu',
    eurRate: 0.42,
    usdRate: 0.38,
    currencyCode: 'BHD',
    regions: 4,
  },
  {
    id: 12,
    name: 'Bangladesh',
    iso2: 'bd',
    continent: 'South Asia',
    population: 164689383,
    officialLanguage: 'Bengali',
    primaryLanguage: 'English',
    secondaryLanguage: 'Hindi',
    eurRate: 110.5,
    usdRate: 92.3,
    currencyCode: 'BDT',
    regions: 64,
  },
  {
    id: 13,
    name: 'Barbados',
    iso2: 'bb',
    continent: 'Caribbean',
    population: 287371,
    officialLanguage: 'English',
    primaryLanguage: 'English',
    secondaryLanguage: 'French',
    eurRate: 2.4,
    usdRate: 2.0,
    currencyCode: 'BBD',
    regions: 11,
  },
];

function flagUrl(iso2: string) {
  return `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`;
}

function rowMatchesCountriesFilter(row: CountryRow, f: CountriesFilterState): boolean {
  if (f.continent !== 'All' && row.continent !== f.continent) return false;
  const q = f.officialLanguage.trim().toLowerCase();
  if (q && !row.officialLanguage.toLowerCase().includes(q)) return false;
  if (f.primaryLanguage !== 'All' && row.primaryLanguage !== f.primaryLanguage) return false;
  if (f.secondaryLanguage !== 'All' && row.secondaryLanguage !== f.secondaryLanguage) return false;
  const done = row.settingCompleted === true;
  if (f.settingCompleted === 'yes' && !done) return false;
  if (f.settingCompleted === 'no' && done) return false;
  return true;
}

type OrderMode =
  | 'reset'
  | 'continent'
  | 'primary_lang'
  | 'secondary_lang'
  | 'setting_completed'
  | 'setting_not_completed';

const ORDER_OPTIONS: { value: OrderMode; label: string }[] = [
  { value: 'reset', label: 'Reset ordering' },
  { value: 'continent', label: 'Continent' },
  { value: 'primary_lang', label: 'Primary language' },
  { value: 'secondary_lang', label: 'Secondary language' },
  { value: 'setting_completed', label: 'Setting completed' },
  { value: 'setting_not_completed', label: 'Setting not completed' },
];

function sortCountries(rows: CountryRow[], mode: OrderMode): CountryRow[] {
  const copy = [...rows];
  if (mode === 'reset') {
    copy.sort((a, b) => a.id - b.id);
    return copy;
  }
  if (mode === 'continent') {
    copy.sort((a, b) => a.continent.localeCompare(b.continent) || a.name.localeCompare(b.name));
    return copy;
  }
  if (mode === 'primary_lang') {
    copy.sort(
      (a, b) => a.primaryLanguage.localeCompare(b.primaryLanguage) || a.name.localeCompare(b.name),
    );
    return copy;
  }
  if (mode === 'secondary_lang') {
    copy.sort(
      (a, b) =>
        a.secondaryLanguage.localeCompare(b.secondaryLanguage) || a.name.localeCompare(b.name),
    );
    return copy;
  }
  if (mode === 'setting_completed') {
    copy.sort((a, b) => {
      const ad = a.settingCompleted === true ? 1 : 0;
      const bd = b.settingCompleted === true ? 1 : 0;
      if (bd !== ad) return bd - ad;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }
  if (mode === 'setting_not_completed') {
    copy.sort((a, b) => {
      const ad = a.settingCompleted === true ? 1 : 0;
      const bd = b.settingCompleted === true ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }
  return copy;
}

export default function CountriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editingCountry, setEditingCountry] = useState<CountryRow | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<CountriesFilterState>(DEFAULT_COUNTRIES_FILTER);
  const [draftFilter, setDraftFilter] = useState<CountriesFilterState>(DEFAULT_COUNTRIES_FILTER);

  const filterSelectOptions = useMemo(() => {
    const continents = [...new Set(DEMO_COUNTRIES.map((r) => r.continent))].sort();
    const primary = [...new Set(DEMO_COUNTRIES.map((r) => r.primaryLanguage))].sort();
    const secondary = [...new Set(DEMO_COUNTRIES.map((r) => r.secondaryLanguage))].sort();
    return { continents, primary, secondary };
  }, []);

  const filteredCountries = useMemo(
    () => DEMO_COUNTRIES.filter((row) => rowMatchesCountriesFilter(row, appliedFilter)),
    [appliedFilter],
  );

  const [orderingSelect, setOrderingSelect] = useState<OrderMode>('reset');
  const [appliedOrderMode, setAppliedOrderMode] = useState<OrderMode>('reset');
  const [annualIncomeEur, setAnnualIncomeEur] = useState('0.00');
  const [costVirtualProduct, setCostVirtualProduct] = useState('0.00');
  const [usdEurField, setUsdEurField] = useState('');

  const displayedCountries = useMemo(
    () => sortCountries(filteredCountries, appliedOrderMode),
    [filteredCountries, appliedOrderMode],
  );

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    try {
      JSON.parse(adminData);
      setLoading(false);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminToken');
      router.push('/');
    }
  }, [router]);

  if (loading) return null;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-[#a51d2d] text-white py-2 font-bold text-center text-xl uppercase shadow-md relative z-10 border-b-4 border-[#800000]">
        System Dashboard
      </div>

      <div className="flex flex-1 max-w-[1920px] mx-auto w-full">
        <div className="flex-1 bg-white border-x border-[#c53030] border-b flex flex-col min-w-0">
          <div className="bg-[#5b9bd5] text-white font-bold text-base md:text-lg px-4 py-2.5 shrink-0">
            Countries
          </div>

          <div className="px-3 md:px-4 py-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm border-b border-gray-100">
            <button
              type="button"
              className="bg-[#222] hover:bg-black text-white px-3 py-1.5 rounded-md font-bold inline-flex items-center gap-1.5 border border-black/20"
              onClick={() => {
                setDraftFilter(appliedFilter);
                setFilterOpen(true);
              }}
            >
              Filter
              <ChevronDown className="w-4 h-4 text-white shrink-0" aria-hidden />
            </button>
            <div className="relative">
              <select
                value={orderingSelect}
                onChange={(e) => setOrderingSelect(e.target.value as OrderMode)}
                className="appearance-none bg-white border border-gray-400 px-3 py-1.5 pr-8 rounded-md text-gray-800 min-w-[180px] text-sm"
              >
                {ORDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="button"
              className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-3 py-1.5 rounded-md font-bold border border-[#a02622]"
              onClick={() => setAppliedOrderMode(orderingSelect)}
            >
              Proceed
            </button>
            <button
              type="button"
              className="bg-[#222] hover:bg-black text-white px-3 py-1.5 rounded-md font-bold border border-black/20"
              onClick={() => window.print()}
            >
              Print
            </button>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 ml-auto justify-end">
              <label className="flex items-center gap-1.5 text-gray-700 text-xs whitespace-nowrap">
                <span>Our annual income EUR</span>
                <input
                  type="text"
                  value={annualIncomeEur}
                  onChange={(e) => setAnnualIncomeEur(e.target.value)}
                  className="border border-gray-400 rounded-sm bg-white px-1.5 py-1 w-[4.5rem] text-xs text-gray-900"
                />
              </label>
              <label className="flex items-center gap-1.5 text-gray-700 text-xs whitespace-nowrap">
                <span>Cost virtual product</span>
                <input
                  type="text"
                  value={costVirtualProduct}
                  onChange={(e) => setCostVirtualProduct(e.target.value)}
                  className="border border-gray-400 rounded-sm bg-white px-1.5 py-1 w-[4.5rem] text-xs text-gray-900"
                />
              </label>
              <label className="flex items-center gap-1.5 text-gray-700 text-xs whitespace-nowrap">
                <span>USD-€</span>
                <input
                  type="text"
                  value={usdEurField}
                  onChange={(e) => setUsdEurField(e.target.value)}
                  className="border border-gray-400 rounded-sm bg-white px-1.5 py-1 w-14 text-xs text-gray-900"
                />
              </label>
              <button
                type="button"
                className="bg-[#222] hover:bg-black text-white px-3 py-1 text-xs font-bold rounded-md border border-black/20"
              >
                Save
              </button>
              <Link
                href="/operators"
                className="inline-flex items-center justify-center bg-[#222] hover:bg-black text-white px-3 py-2 text-xs font-bold rounded-md border border-black/20 text-center max-w-[220px] leading-tight self-end mt-0.5 sm:mt-0"
              >
                Operators & Agents of whole world
              </Link>
            </div>
          </div>

          <div className="px-3 md:px-4 py-4 flex-1 min-w-0">
          <div className="mb-2">
            <div className="bg-[#d6e4ff] text-gray-900 font-bold text-sm py-2 px-3 border border-gray-300 border-b-0">
              Parameters about the nations
            </div>
            <div className="overflow-x-auto border border-gray-300">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-[#e8e0f0] text-gray-800 border-b border-gray-300">
                    <th className="py-2 px-2 w-10 text-left font-bold border-r border-gray-200">
                      <input type="checkbox" aria-label="Select all" className="align-middle" />
                    </th>
                    <th className="py-2 px-2 text-left font-bold border-r border-gray-200 whitespace-nowrap">
                      Country
                    </th>
                    <th className="py-2 px-2 text-center font-bold border-r border-gray-200 w-14">
                      Flag
                    </th>
                    <th className="py-2 px-2 text-left font-bold border-r border-gray-200 whitespace-nowrap">
                      Continent
                    </th>
                    <th className="py-2 px-2 text-right font-bold border-r border-gray-200 whitespace-nowrap">
                      Population
                    </th>
                    <th className="py-2 px-2 text-left font-bold border-r border-gray-200 whitespace-nowrap">
                      Official language
                    </th>
                    <th className="py-2 px-2 text-left font-bold border-r border-gray-200 whitespace-nowrap">
                      Primary language
                    </th>
                    <th className="py-2 px-2 text-left font-bold border-r border-gray-200 whitespace-nowrap">
                      Secondary language
                    </th>
                    <th className="py-2 px-2 text-right font-bold border-r border-gray-200 whitespace-nowrap">
                      Currency 1EUR
                    </th>
                    <th className="py-2 px-2 text-right font-bold border-r border-gray-200 whitespace-nowrap">
                      Currency 1USD
                    </th>
                    <th className="py-2 px-2 text-center font-bold border-r border-gray-200">Curr</th>
                    <th className="py-2 px-2 text-right font-bold border-r border-gray-200">Regions</th>
                    <th className="py-2 px-2 text-center font-bold whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCountries.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#f7f7fb]'
                      } hover:bg-amber-50/40`}
                    >
                      <td className="py-1.5 px-2 border-r border-gray-100">
                        <input type="checkbox" aria-label={`Select ${row.name}`} />
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-gray-800">{row.name}</td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={flagUrl(row.iso2)}
                          alt=""
                          width={24}
                          height={18}
                          className="inline-block border border-gray-200"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-gray-700">
                        {row.continent}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-right text-gray-800">
                        {row.population.toLocaleString('en-US')}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-gray-700">
                        {row.officialLanguage}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-gray-700">
                        {row.primaryLanguage}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-gray-700">
                        {row.secondaryLanguage}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-right tabular-nums">
                        {row.eurRate.toFixed(row.eurRate < 10 ? 4 : 2)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-right tabular-nums">
                        {row.usdRate.toFixed(row.usdRate < 10 ? 4 : 2)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-center font-medium">
                        {row.currencyCode}
                      </td>
                      <td className="py-1.5 px-2 border-r border-gray-100 text-right tabular-nums">
                        {row.regions}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="p-1 rounded text-[#333] hover:bg-gray-200"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded text-[#333] hover:bg-gray-200"
                            title="Edit"
                            onClick={() => setEditingCountry(row)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded text-[#333] hover:bg-gray-200"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 mt-3 text-xs">
            <button
              type="button"
              className="px-2 py-1 border border-gray-300 bg-white hover:bg-gray-100 rounded-sm"
            >
              Prev
            </button>
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2 py-1 border rounded-sm ${
                  p === 1
                    ? 'bg-[#a51d2d] text-white border-[#800000]'
                    : 'border-gray-300 bg-white hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-gray-500">…</span>
            {[12, 13].map((p) => (
              <button
                key={p}
                type="button"
                className="px-2 py-1 border border-gray-300 bg-white hover:bg-gray-100 rounded-sm"
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="px-2 py-1 border border-gray-300 bg-white hover:bg-gray-100 rounded-sm"
            >
              Next
            </button>
          </div>
          </div>
        </div>
      </div>

      <CountryEditModal row={editingCountry} onClose={() => setEditingCountry(null)} />

      <CountriesFilterModal
        open={filterOpen}
        draft={draftFilter}
        onDraftChange={setDraftFilter}
        continentOptions={filterSelectOptions.continents}
        primaryLanguageOptions={filterSelectOptions.primary}
        secondaryLanguageOptions={filterSelectOptions.secondary}
        onOk={() => {
          setAppliedFilter(draftFilter);
          setFilterOpen(false);
        }}
        onExit={() => setFilterOpen(false)}
      />
    </div>
  );
}

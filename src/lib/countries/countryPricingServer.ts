import fs from 'fs';
import path from 'path';

export type CountryPricingEntry = {
  annualIncome?: string;
  ratioWithUs?: string;
};

export type CountryPricingStore = {
  ourAnnualIncomeEur: string;
  countries: Record<string, CountryPricingEntry>;
};

const FILE = path.join(process.cwd(), 'data', 'country-pricing.json');

function emptyStore(): CountryPricingStore {
  return { ourAnnualIncomeEur: '0.00', countries: {} };
}

export function loadCountryPricingStore(): CountryPricingStore {
  try {
    if (!fs.existsSync(FILE)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<CountryPricingStore>;
    return {
      ourAnnualIncomeEur:
        typeof parsed.ourAnnualIncomeEur === 'string' ? parsed.ourAnnualIncomeEur : '0.00',
      countries:
        parsed.countries && typeof parsed.countries === 'object' ? parsed.countries : {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveCountryPricingStore(store: CountryPricingStore): void {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
}

export function upsertCountryPricing(
  countryName: string,
  entry: CountryPricingEntry,
  ourAnnualIncomeEur?: string
): CountryPricingStore {
  const store = loadCountryPricingStore();
  const name = countryName.trim();
  if (name) {
    store.countries[name] = {
      ...store.countries[name],
      ...entry,
    };
  }
  if (ourAnnualIncomeEur != null && ourAnnualIncomeEur.trim()) {
    store.ourAnnualIncomeEur = ourAnnualIncomeEur.trim();
  }
  saveCountryPricingStore(store);
  return store;
}

/** Version price multiplier from Countries → annual income / ratio with us. */
export function getCountryPriceCoefficient(countryName: string): number {
  const name = countryName.trim();
  if (!name) return 1;
  const store = loadCountryPricingStore();
  const entry = store.countries[name];
  if (!entry) return 1;

  const ratio = Number.parseFloat(String(entry.ratioWithUs ?? ''));
  if (Number.isFinite(ratio) && ratio > 0) {
    return ratio > 2 ? ratio / 100 : ratio;
  }

  const our = Number.parseFloat(store.ourAnnualIncomeEur);
  const theirs = Number.parseFloat(String(entry.annualIncome ?? ''));
  if (Number.isFinite(our) && our > 0 && Number.isFinite(theirs) && theirs > 0) {
    return theirs / our;
  }
  return 1;
}

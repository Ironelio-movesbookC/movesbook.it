import { NextRequest, NextResponse } from 'next/server';
import {
  loadCountryPricingStore,
  saveCountryPricingStore,
  upsertCountryPricing,
} from '@/lib/countries/countryPricingServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(loadCountryPricingStore());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const countryName = typeof body.countryName === 'string' ? body.countryName : '';
    const annualIncome = typeof body.annualIncome === 'string' ? body.annualIncome : undefined;
    const ratioWithUs = typeof body.ratioWithUs === 'string' ? body.ratioWithUs : undefined;
    const ourAnnualIncomeEur =
      typeof body.ourAnnualIncomeEur === 'string' ? body.ourAnnualIncomeEur : undefined;

    if (ourAnnualIncomeEur != null && !countryName) {
      const store = loadCountryPricingStore();
      store.ourAnnualIncomeEur = ourAnnualIncomeEur;
      saveCountryPricingStore(store);
      return NextResponse.json({ ok: true, store });
    }

    const store = upsertCountryPricing(
      countryName,
      { annualIncome, ratioWithUs },
      ourAnnualIncomeEur
    );
    return NextResponse.json({ ok: true, store });
  } catch (e) {
    console.error('country-pricing POST:', e);
    return NextResponse.json({ error: 'Failed to save country pricing' }, { status: 500 });
  }
}

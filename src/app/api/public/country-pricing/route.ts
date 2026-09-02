import { NextRequest, NextResponse } from 'next/server';
import { getCountryPriceCoefficient } from '@/lib/countries/countryPricingServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')?.trim() ?? '';
  const coefficient = getCountryPriceCoefficient(country);
  return NextResponse.json({ country, coefficient });
}

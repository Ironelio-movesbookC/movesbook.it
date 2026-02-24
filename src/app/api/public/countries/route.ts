import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const countries = await prisma.$queryRaw<Array<{ id: number | string; name: string }>>`
      SELECT id, name FROM countries ORDER BY name ASC
    `;

    const formattedCountries = countries.map((country: any) => ({
      id: String(country.id),
      name: String(country.name || '')
    }));

    return NextResponse.json(formattedCountries);
  } catch (error: any) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

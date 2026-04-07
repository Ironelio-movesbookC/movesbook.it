import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const companies = await prisma.sportMachineCompany.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ companies });
  } catch (e) {
    console.error('sport-machine-companies GET:', e);
    return NextResponse.json(
      { error: 'Failed to load companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, logoUrl, iconUrl, country, description, url } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const company = await prisma.sportMachineCompany.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl?.trim() || null,
        iconUrl: iconUrl?.trim() || null,
        country: country?.trim() || null,
        description: description?.trim() || null,
        url: url?.trim() || null,
      },
    });

    return NextResponse.json({ company });
  } catch (e) {
    console.error('sport-machine-companies POST:', e);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

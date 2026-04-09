import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, logoUrl, iconUrl, country, description, url } = body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { error: 'Company name cannot be empty' },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.sportMachineCompany.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const company = await prisma.sportMachineCompany.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
        ...(iconUrl !== undefined && { iconUrl: iconUrl?.trim() || null }),
        ...(country !== undefined && { country: country?.trim() || null }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(url !== undefined && { url: url?.trim() || null }),
      },
    });

    return NextResponse.json({ company });
  } catch (e) {
    console.error('sport-machine-companies PATCH:', e);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.sportMachineCompany.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.sportMachineCompany.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('sport-machine-companies DELETE:', e);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}

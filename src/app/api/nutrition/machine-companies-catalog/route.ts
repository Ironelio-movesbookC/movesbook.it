import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';

export const dynamic = 'force-dynamic';

/** Read-only list of Super Admin companies for machine forms (any logged-in user). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const companies = await prisma.sportMachineCompany.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, country: true, logoUrl: true },
    });

    return NextResponse.json({ companies });
  } catch (e) {
    console.error('machine-companies-catalog', e);
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 });
  }
}

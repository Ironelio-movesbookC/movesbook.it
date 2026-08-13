import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prismaConnect } from '@/lib/prisma';
import {
  getMubPage,
  parseMubCategory,
  parseMubScope,
  parseRoleTemplate,
  updateMubPageSettings,
} from '@/lib/mub/mubService';

export const dynamic = 'force-dynamic';

function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

function parsePageQuery(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = parseMubScope(searchParams.get('scope'));
  const category = parseMubCategory(searchParams.get('category'));
  const roleTemplate = parseRoleTemplate(searchParams.get('roleTemplate'));
  const ownerId = searchParams.get('ownerId') ?? null;
  const lang = searchParams.get('lang') ?? 'en';
  return { scope, category, roleTemplate, ownerId, lang };
}

export async function GET(request: NextRequest) {
  try {
    const userId = getTokenUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const { scope, category, roleTemplate, ownerId, lang } = parsePageQuery(request);
    const effectiveOwnerId = scope === 'USER' ? ownerId ?? userId : ownerId;

    const page = await getMubPage(
      { scope, category, roleTemplate, ownerId: effectiveOwnerId },
      lang,
    );
    return NextResponse.json({ page });
  } catch (error) {
    console.error('GET /api/mub/page failed:', error);
    return NextResponse.json({ error: 'Failed to load MUB page' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = getTokenUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const { scope, category, roleTemplate, ownerId, lang } = parsePageQuery(request);
    const body = (await request.json()) as { backgroundColor?: string; displayMode?: number };
    const effectiveOwnerId = scope === 'USER' ? ownerId ?? userId : ownerId;

    await updateMubPageSettings(
      { scope, category, roleTemplate, ownerId: effectiveOwnerId },
      {
        ...(body.backgroundColor != null ? { backgroundColor: body.backgroundColor } : {}),
        ...(body.displayMode != null ? { displayMode: body.displayMode === 2 ? 2 : 1 } : {}),
      },
    );

    const page = await getMubPage(
      { scope, category, roleTemplate, ownerId: effectiveOwnerId },
      lang,
    );
    return NextResponse.json({ page });
  } catch (error) {
    console.error('PATCH /api/mub/page failed:', error);
    return NextResponse.json({ error: 'Failed to update MUB page' }, { status: 500 });
  }
}

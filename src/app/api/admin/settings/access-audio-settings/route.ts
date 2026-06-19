import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { outcomeService } from '@/lib/outcomes';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) return { userId: decoded.userId };

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { userType: true },
  });
  if (user?.userType === 'ADMIN') return { userId: decoded.userId };

  return null;
}

function parseLang(value: string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Legacy path — delegates to greenfield /api/admin/outcomes service layer. */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const lang = parseLang(request.nextUrl.searchParams.get('lang'));
    const languages = await outcomeService.listLanguages();
    const items = await outcomeService.fetchAdminItems(lang);

    return NextResponse.json({
      lang,
      isDefaultLang: lang === 0,
      languages: languages.map((l) => ({
        id: l.legacyLangId ?? 0,
        name: l.name,
      })),
      introParagraph:
        lang === 0
          ? 'Edit descriptions and codes on the Default tab. These defaults apply across all languages.'
          : 'Messages on this tab are shown to members whose country/nationality uses this language.',
      items,
    });
  } catch (error) {
    console.error('GET /api/admin/settings/access-audio-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const url = new URL('/api/admin/outcomes', request.url);
  const proxy = new Request(url, {
    method: 'PATCH',
    headers: request.headers,
    body: await request.text(),
  });
  const { PATCH } = await import('@/app/api/admin/outcomes/route');
  return PATCH(proxy as NextRequest);
}

export async function POST(request: NextRequest) {
  const url = new URL('/api/admin/outcomes', request.url);
  const proxy = new Request(url, {
    method: 'POST',
    headers: request.headers,
    body: await request.text(),
  });
  const { POST } = await import('@/app/api/admin/outcomes/route');
  return POST(proxy as NextRequest);
}

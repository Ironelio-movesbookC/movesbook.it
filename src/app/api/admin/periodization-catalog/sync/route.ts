import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { normalizePeriodizationTemplates } from '@/constants/tools.constants';

export const dynamic = 'force-dynamic';

/**
 * POST — Publish Super Admin periodization presets to toolsDefaults for a language.
 * Body: { language: string, templates: unknown[] }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { userType: true },
    });
    const isAdmin =
      user?.userType === 'ADMIN' ||
      user?.userType === 'CLUB_TRAINER' ||
      user?.userType === 'CLUB' ||
      user?.userType === 'TEAM_MANAGER' ||
      user?.userType === 'TEAM' ||
      user?.userType === 'GROUP_ADMIN' ||
      user?.userType === 'GROUP' ||
      user?.userType === 'COACH';

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const language = String(body.language ?? '')
      .toLowerCase()
      .trim()
      .split('-')[0];
    if (!language) {
      return NextResponse.json({ success: false, error: 'language required' }, { status: 400 });
    }

    const templates = normalizePeriodizationTemplates(body.templates).map((t) => ({
      ...t,
      language: t.language || language,
      isUserCreated: false,
    }));

    const existing = await prisma.toolsDefaults.findUnique({ where: { language } });
    let toolsData: Record<string, unknown> = {};
    if (existing?.data) {
      try {
        toolsData =
          typeof existing.data === 'string'
            ? (JSON.parse(existing.data) as Record<string, unknown>)
            : (existing.data as Record<string, unknown>);
      } catch {
        toolsData = {};
      }
    }

    toolsData.periodizationTemplates = templates;

    await prisma.toolsDefaults.upsert({
      where: { language },
      update: { data: JSON.stringify(toolsData), updatedAt: new Date() },
      create: { language, data: JSON.stringify(toolsData) },
    });

    return NextResponse.json({
      success: true,
      message: `Published ${templates.length} periodization preset(s) for ${language}`,
      count: templates.length,
    });
  } catch (e) {
    console.error('periodization-catalog sync:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

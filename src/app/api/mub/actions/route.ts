import { NextRequest, NextResponse } from 'next/server';
import { prismaConnect } from '@/lib/prisma';
import {
  importStaffMubTemplate,
  parseRoleTemplate,
  removeImportedMubButtons,
  resetMubPage,
} from '@/lib/mub/mubService';
import type { MubRoleTemplate } from '@/lib/mub/types';
import {
  getMubTokenUserId,
  parseMubPageRequest,
  resolveMubPageQuery,
} from '@/lib/mub/mubApiHelpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = getMubTokenUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const parsed = parseMubPageRequest(request);
    const query = resolveMubPageQuery(parsed, userId);
    const body = (await request.json()) as { action?: string; roleTemplate?: string };

    switch (body.action) {
      case 'reset': {
        const page = await resetMubPage(query, parsed.lang);
        return NextResponse.json({ page });
      }
      case 'remove_default': {
        const page = await removeImportedMubButtons(query, parsed.lang);
        return NextResponse.json({ page });
      }
      case 'import': {
        const roleTemplate = (parseRoleTemplate(String(body.roleTemplate ?? 'CLUB')) ?? 'CLUB') as MubRoleTemplate;
        const result = await importStaffMubTemplate(query, roleTemplate, parsed.lang);
        return NextResponse.json({ page: result.page, importedCount: result.importedCount });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/mub/actions failed:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

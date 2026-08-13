import { NextRequest, NextResponse } from 'next/server';
import { prismaConnect } from '@/lib/prisma';
import { deleteMubButton, saveMubButton } from '@/lib/mub/mubService';
import type { SaveMubButtonInput } from '@/lib/mub/types';
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
    const body = (await request.json()) as { button?: SaveMubButtonInput };

    if (!body.button) {
      return NextResponse.json({ error: 'Button payload required' }, { status: 400 });
    }

    const page = await saveMubButton(query, body.button, parsed.lang);
    return NextResponse.json({ page });
  } catch (error) {
    console.error('POST /api/mub/buttons failed:', error);
    return NextResponse.json({ error: 'Failed to save button' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getMubTokenUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const parsed = parseMubPageRequest(request);
    const query = resolveMubPageQuery(parsed, userId);
    const buttonId = new URL(request.url).searchParams.get('id');

    if (!buttonId) {
      return NextResponse.json({ error: 'Button id required' }, { status: 400 });
    }

    const page = await deleteMubButton(query, buttonId, parsed.lang);
    return NextResponse.json({ page });
  } catch (error) {
    console.error('DELETE /api/mub/buttons failed:', error);
    return NextResponse.json({ error: 'Failed to delete button' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  getClubLegalDocuments,
  mergeClubLegalDocumentsForSave,
  type ClubLegalDocuments,
} from '@/lib/club/clubLegalDocuments';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ?? null;
}

async function canAccessClub(clubId: string, userId: string): Promise<{
  ok: boolean;
  isAdmin: boolean;
  clubName: string;
  description: string | null;
}> {
  const clubs = await prisma.$queryRaw<
    { id: string; name: string; adminId: string; description: string | null }[]
  >`
    SELECT id, name, adminId, description FROM clubs_new WHERE id = ${clubId} LIMIT 1
  `;
  const club = clubs[0];
  if (!club) return { ok: false, isAdmin: false, clubName: '', description: null };

  const isAdmin = club.adminId === userId;
  if (isAdmin) {
    return {
      ok: true,
      isAdmin: true,
      clubName: club.name,
      description: club.description,
    };
  }

  const member = await prisma.clubMember.findFirst({
    where: { clubId, memberId: userId },
    select: { id: true },
  });
  if (!member) {
    return { ok: false, isAdmin: false, clubName: '', description: null };
  }

  return {
    ok: true,
    isAdmin: false,
    clubName: club.name,
    description: club.description,
  };
}

/** Club admin or member: read Rules / Private policy HTML. */
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await canAccessClub(params.clubId, userId);
  if (!access.ok) {
    return NextResponse.json({ error: 'Club not found or access denied' }, { status: 404 });
  }

  const documents = getClubLegalDocuments(access.description);
  return NextResponse.json({
    clubId: params.clubId,
    clubName: access.clubName,
    canEdit: access.isAdmin,
    documents,
  });
}

/** Club admin: save Rules / Private policy HTML (Documents Editor). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await canAccessClub(params.clubId, userId);
  if (!access.ok || !access.isAdmin) {
    return NextResponse.json({ error: 'Only the club admin can edit documents' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const incoming = (body || {}) as { documents?: Partial<ClubLegalDocuments> };
  const current = getClubLegalDocuments(access.description);
  const next: ClubLegalDocuments = {
    rulesHtml:
      typeof incoming.documents?.rulesHtml === 'string'
        ? incoming.documents.rulesHtml
        : current.rulesHtml,
    privacyPolicyHtml:
      typeof incoming.documents?.privacyPolicyHtml === 'string'
        ? incoming.documents.privacyPolicyHtml
        : current.privacyPolicyHtml,
  };

  const description = mergeClubLegalDocumentsForSave(access.description, next);
  await prisma.$executeRaw`
    UPDATE clubs_new SET description = ${description} WHERE id = ${params.clubId}
  `;

  return NextResponse.json({ success: true, documents: next });
}

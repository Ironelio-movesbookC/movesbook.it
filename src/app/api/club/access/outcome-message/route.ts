import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveAccessOutcomeMessage } from '@/lib/accessOutcomeMessages';
import { findExistingTable, text } from '@/lib/outcomeSettingsDb';

export const dynamic = 'force-dynamic';

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'users'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getLegacyClubId(clubId: string): Promise<string | null> {
  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'clubs'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    clubId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string; adminId: string }[]>`
      SELECT id, name, adminId
      FROM clubs_new
      WHERE id = ${requestedClubId}
        AND adminId = ${userId}
      LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string; adminId: string }[]>`
    SELECT id, name, adminId
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

/**
 * Resolve the outcome message/audio shown at access control for a member.
 * Language tabs in admin map to countries.country_lang_id — when the club enables
 * country-language outcomes, the member's nationality/country language is used.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = String(decoded.userId);
    const clubId = request.nextUrl.searchParams.get('clubId');
    const memberUserId = request.nextUrl.searchParams.get('memberUserId');
    const messageTypeId = request.nextUrl.searchParams.get('messageTypeId');
    const code = request.nextUrl.searchParams.get('code');
    const languageModeParam = text(request.nextUrl.searchParams.get('languageMode'));

    if (!memberUserId) {
      return NextResponse.json({ error: 'memberUserId is required.' }, { status: 400 });
    }
    if (!messageTypeId && !code) {
      return NextResponse.json({ error: 'messageTypeId or code is required.' }, { status: 400 });
    }

    const club = await getOwnedClub(userId, clubId);
    if (!club) {
      return NextResponse.json({ error: 'Club not found.' }, { status: 404 });
    }

    const legacyUserId = await getLegacyUserId(userId);
    const legacyMemberId = await getLegacyUserId(memberUserId);
    const legacyClubId = await getLegacyClubId(club.id);

    const clubOwnerUserIds = Array.from(
      new Set([userId, legacyUserId, club.adminId].filter(Boolean) as string[])
    );
    const memberUserIds = Array.from(
      new Set([memberUserId, legacyMemberId].filter(Boolean) as string[])
    );
    const clubIds = Array.from(new Set([club.id, legacyClubId].filter(Boolean) as string[]));

    const languageMode =
      languageModeParam === 'primary' ||
      languageModeParam === 'country' ||
      languageModeParam === 'custom' ||
      languageModeParam === 'auto'
        ? languageModeParam
        : 'auto';

    const outcome = await resolveAccessOutcomeMessage({
      clubIds,
      clubOwnerUserIds,
      memberUserIds,
      messageTypeId: messageTypeId ?? undefined,
      code: code ?? undefined,
      languageMode,
      clubStorageId: clubIds[0],
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome message not found.' }, { status: 404 });
    }

    return NextResponse.json({
      ...outcome,
      memberUserId,
      clubId: club.id,
    });
  } catch (error) {
    console.error('GET /api/club/access/outcome-message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

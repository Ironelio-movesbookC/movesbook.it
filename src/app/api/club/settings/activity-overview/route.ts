import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthorizedContext, getReaderTable, text } from '@/lib/clubCardReadersApi';
import type { ActivityOverviewArea } from '@/lib/clubActivityOverview';

export const dynamic = 'force-dynamic';

const AREA_TABLE_CANDIDATES = ['club_setting_areas', 'club_setting_area'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology'
];
const LISTPRICE_TABLE_CANDIDATES = [
  'club_setting_typology_listprices',
  'club_setting_typology_listprice'
];

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((c) => existing.has(c)) ?? null;
}

function parseIdList(raw: unknown): string[] {
  return text(raw)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const { userIds, club } = context;
    const clubId = club?.id ?? null;
    const userPlaceholders = userIds.map(() => '?').join(',');

    const areaTable = await findExistingTable(AREA_TABLE_CANDIDATES);
    const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
    const listpriceTable = await findExistingTable(LISTPRICE_TABLE_CANDIDATES);
    const readerTable = await getReaderTable();

    let areas: { id: string; name: string }[] = [];
    if (areaTable) {
      const areaColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        areaTable
      );
      const hasClubId = areaColumns.some((c) => c.COLUMN_NAME === 'club_id');
      const clubFilter = clubId && hasClubId ? ' AND club_id = ?' : '';

      const areaRows = await prisma.$queryRawUnsafe<{ id: string | number; area: string | null }[]>(
        `SELECT id, area FROM \`${areaTable}\`
         WHERE user_id IN (${userPlaceholders}) ${clubFilter}
         ORDER BY area ASC`,
        ...userIds,
        ...(clubFilter ? [clubId] : [])
      );

      areas = areaRows.map((row) => ({
        id: String(row.id),
        name: text(row.area) || `Area ${row.id}`
      }));
    }

    const readerRows = await prisma.$queryRawUnsafe<{ reader_name: string | null; activity_list: string | null }[]>(
      `SELECT reader_name, activity_list FROM \`${readerTable}\`
       WHERE user_id IN (${userPlaceholders})
       ${clubId ? 'AND club_id = ?' : ''}`,
      ...userIds,
      ...(clubId ? [clubId] : [])
    );

    const readers = readerRows.map((row) => ({
      name: text(row.reader_name) || 'Reader',
      activityIds: parseIdList(row.activity_list)
    }));

    const typologies: { id: string; areaActivity: string }[] = [];
    if (typologyTable) {
      const typologyColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        typologyTable
      );
      const hasClubId = typologyColumns.some((c) => c.COLUMN_NAME === 'club_id');
      const clubFilter = clubId && hasClubId ? ' AND club_id = ?' : '';

      const typologyRows = await prisma.$queryRawUnsafe<{ id: string | number; area_activity: string | null }[]>(
        `SELECT id, area_activity FROM \`${typologyTable}\`
         WHERE user_id IN (${userPlaceholders}) ${clubFilter}`,
        ...userIds,
        ...(clubFilter ? [clubId] : [])
      );

      for (const row of typologyRows) {
        typologies.push({
          id: String(row.id),
          areaActivity: text(row.area_activity)
        });
      }
    }

    const listPrices: { id: string; typologyId: string; subscriptionName: string }[] = [];
    if (listpriceTable) {
      const listpriceColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        listpriceTable
      );
      const hasClubId = listpriceColumns.some((c) => c.COLUMN_NAME === 'club_id');
      const clubFilter = clubId && hasClubId ? ' AND club_id = ?' : '';

      const priceRows = await prisma.$queryRawUnsafe<{
        id: string | number;
        typology_id: string | number;
        subscription_name: string | null;
      }[]>(
        `SELECT id, typology_id, subscription_name FROM \`${listpriceTable}\`
         WHERE user_id IN (${userPlaceholders}) ${clubFilter}
         ORDER BY subscription_name ASC`,
        ...userIds,
        ...(clubFilter ? [clubId] : [])
      );

      for (const row of priceRows) {
        listPrices.push({
          id: String(row.id),
          typologyId: String(row.typology_id),
          subscriptionName: text(row.subscription_name) || 'Untitled'
        });
      }
    }

    const typologyIdsByArea = new Map<string, Set<string>>();
    for (const area of areas) {
      const ids = new Set<string>();
      for (const typology of typologies) {
        if (
          typology.areaActivity === area.id ||
          typology.areaActivity === area.name
        ) {
          ids.add(typology.id);
        }
      }
      typologyIdsByArea.set(area.id, ids);
    }

    const items: ActivityOverviewArea[] = areas.map((area) => {
      const typologyIds = typologyIdsByArea.get(area.id) ?? new Set<string>();

      const readerNames = readers
        .filter((reader) => {
          if (reader.activityIds.includes(area.id)) return true;
          return reader.activityIds.some((activityId) => typologyIds.has(activityId));
        })
        .map((reader) => reader.name);

      const subscriptions = listPrices
        .filter((price) => typologyIds.has(price.typologyId))
        .map((price) => ({
          id: price.id,
          subscriptionName: price.subscriptionName,
          typologyId: price.typologyId
        }));

      return {
        id: area.id,
        name: area.name,
        readerNames: Array.from(new Set(readerNames)),
        subscriptions
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('GET /api/club/settings/activity-overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

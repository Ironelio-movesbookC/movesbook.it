import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  assertReaderAccess,
  getAuthorizedContext,
  getTableColumns,
  text,
} from '@/lib/clubCardReadersApi';

export const dynamic = 'force-dynamic';

const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology',
];
const AREA_TABLE_CANDIDATES = ['club_setting_areas', 'club_setting_area'];
const READER_TYPE_TABLE_CANDIDATES = ['club_card_reader_types', 'club_card_reader_type'];
const CONTROL_MODE_TABLE_CANDIDATES = ['club_card_control_modes', 'club_card_control_mode'];

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((candidate) => existing.has(candidate)) ?? null;
}

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const { readerTable } = access;
    const typeTable = await findExistingTable(READER_TYPE_TABLE_CANDIDATES);
    const modeTable = await findExistingTable(CONTROL_MODE_TABLE_CANDIDATES);
    const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);

    const typeJoin = typeTable
      ? `LEFT JOIN \`${typeTable}\` rt ON rt.id = r.reader_type_id`
      : '';
    const modeJoin = modeTable
      ? `LEFT JOIN \`${modeTable}\` cm ON cm.id = r.control_mode_id`
      : '';
    const typeSelect = typeTable ? 'COALESCE(rt.name, \'\') AS readerType' : '\'\' AS readerType';
    const modeSelect = modeTable ? 'COALESCE(cm.name, \'\') AS controlMode' : '\'\' AS controlMode';

    const readerRows = await prisma.$queryRawUnsafe<
      {
        readerName: string | null;
        description: string | null;
        readerPort: string | null;
        readerType: string | null;
        controlMode: string | null;
        activityList: string | null;
      }[]
    >(
      `SELECT
        COALESCE(r.reader_name, '') AS readerName,
        COALESCE(r.description, '') AS description,
        COALESCE(r.reader_port, '') AS readerPort,
        ${typeSelect},
        ${modeSelect},
        COALESCE(r.activity_list, '') AS activityList
      FROM \`${readerTable}\` r
      ${typeJoin}
      ${modeJoin}
      WHERE r.id = ?
      LIMIT 1`,
      id
    );

    const reader = readerRows[0];
    if (!reader) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const selectedIds = new Set(
      text(reader.activityList)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );

    const activities: {
      id: string;
      area: string;
      activityName: string;
      room: string;
      selected: boolean;
    }[] = [];

    if (typologyTable) {
      const areaTable = await findExistingTable(AREA_TABLE_CANDIDATES);
      const userPlaceholders = auth.userIds.map(() => '?').join(',');
      const areaSelect = areaTable
        ? 'COALESCE(a.area, t.area_activity, \'\') AS area'
        : 'COALESCE(t.area_activity, \'\') AS area';
      const areaJoin = areaTable ? `LEFT JOIN \`${areaTable}\` a ON a.id = t.area_activity` : '';

      const clubId = auth.club?.id ?? null;
      const baseSql = `
        SELECT
          t.id AS id,
          ${areaSelect},
          COALESCE(t.activity_name, '') AS activityName,
          COALESCE(t.room, '') AS room
        FROM \`${typologyTable}\` t
        ${areaJoin}
        WHERE t.user_id IN (${userPlaceholders})
      `;

      type TypologyRow = {
        id: string | number;
        area: string | null;
        activityName: string | null;
        room: string | null;
      };

      let rows: TypologyRow[] = [];
      if (clubId) {
        rows = await prisma.$queryRawUnsafe<TypologyRow[]>(
          `${baseSql} AND t.club_id = ? ORDER BY t.id ASC`,
          ...auth.userIds,
          clubId
        );
      }
      if (rows.length === 0) {
        rows = await prisma.$queryRawUnsafe<TypologyRow[]>(
          `${baseSql} ORDER BY t.id ASC`,
          ...auth.userIds
        );
      }

      for (const row of rows) {
        const typologyId = String(row.id);
        activities.push({
          id: typologyId,
          area: text(row.area),
          activityName: text(row.activityName),
          room: text(row.room),
          selected: selectedIds.has(typologyId),
        });
      }
    }

    const header = [
      text(reader.readerName),
      text(reader.controlMode),
      text(reader.readerType),
      reader.readerPort ? `on ${text(reader.readerPort)}` : '',
    ]
      .filter(Boolean)
      .join(' - ');

    return NextResponse.json({
      readerId: id,
      header,
      description: text(reader.description),
      activities,
      selectedIds: [...selectedIds],
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-readers/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const body = await request.json();
    const activityIds = Array.isArray(body.activityIds)
      ? body.activityIds.map((v: unknown) => text(v)).filter(Boolean)
      : [];

    const { readerTable } = access;
    const columns = await getTableColumns(readerTable);
    if (!columns.has('activity_list')) {
      return NextResponse.json({ error: 'Activity list not supported.' }, { status: 400 });
    }

    const userPlaceholders = auth.userIds.map(() => '?').join(',');
    const activityList = activityIds.join(',');

    await prisma.$executeRawUnsafe(
      `UPDATE \`${readerTable}\` SET activity_list = ?
       WHERE id = ? AND user_id IN (${userPlaceholders})`,
      activityList,
      id,
      ...auth.userIds
    );

    return NextResponse.json({ success: true, message: 'Activities update successfully.' });
  } catch (error) {
    console.error('PUT /api/club/settings/card-readers/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

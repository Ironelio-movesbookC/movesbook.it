import { ProcedureRecordStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { PROCEDURE_TYPE_CODES } from './types';

function decodePhpSegment(segment: string): string {
  const raw = segment.split('*')[0]?.trim() ?? segment;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8').trim();
    return decoded || raw;
  } catch {
    return raw;
  }
}

async function resolveMemberUserId(segment: string): Promise<string | null> {
  const trimmed = segment.trim();
  if (!trimmed) return null;

  if (trimmed.length > 12 && !/^\d+$/.test(trimmed)) {
    const user = await prisma.user.findUnique({ where: { id: trimmed }, select: { id: true } });
    if (user) return user.id;
  }

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (mappingTable) {
    const rows = await prisma.$queryRawUnsafe<{ new_id: string }[]>(
      `SELECT new_id FROM \`${mappingTable}\`
       WHERE legacy_table = 'users' AND legacy_id = ?
       LIMIT 1`,
      trimmed
    );
    if (rows[0]?.new_id) return rows[0].new_id;
  }

  const usersTable = await findExistingTable(['users_new', 'users']);
  if (usersTable && /^\d+$/.test(trimmed)) {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
      trimmed
    );
    if (rows[0]?.id) return String(rows[0].id);
  }

  return null;
}

/** Map PHP `/users/deadline_detail/{enc}/{memberId}` segments to a procedure record id. */
export async function resolveDeadlinePaymentRecordId(
  clubId: string,
  segments: string[]
): Promise<string | null> {
  if (segments.length === 0) return null;

  const last = segments[segments.length - 1]?.trim();
  const first = segments[0]?.trim();

  if (last && last.length >= 20 && !/^\d+$/.test(last)) {
    const record = await prisma.procedureRecord.findFirst({
      where: {
        id: last,
        clubId,
        status: ProcedureRecordStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (record) return record.id;
  }

  if (first && first.length >= 20 && segments.length === 1) {
    const record = await prisma.procedureRecord.findFirst({
      where: { id: first, clubId, status: ProcedureRecordStatus.ACTIVE },
      select: { id: true },
    });
    if (record) return record.id;
  }

  const memberSegment = last ?? first;
  if (!memberSegment) return null;

  const memberUserId = await resolveMemberUserId(memberSegment);
  if (!memberUserId) return null;

  const procedureType = await prisma.procedureType.findFirst({
    where: { code: PROCEDURE_TYPE_CODES.SERVICE_SALE, isActive: true },
    select: { id: true },
  });
  if (!procedureType) return null;

  const typologyHint = segments.length > 1 ? decodePhpSegment(segments[0]).toLowerCase() : '';

  const record = await prisma.procedureRecord.findFirst({
    where: {
      clubId,
      memberId: memberUserId,
      procedureTypeId: procedureType.id,
      status: ProcedureRecordStatus.ACTIVE,
      balanceAmount: { gt: 0 },
      ...(typologyHint.includes('service') || typologyHint.includes('membership')
        ? {}
        : {}),
    },
    orderBy: [{ dueDate: 'asc' }, { recordDate: 'asc' }],
    select: { id: true },
  });

  return record?.id ?? null;
}

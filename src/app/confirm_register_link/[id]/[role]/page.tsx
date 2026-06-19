import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';
import { getLegacyUsersTable } from '@/lib/promocodes/legacyDb';

export const dynamic = 'force-dynamic';

function decodeBase64Param(value: string): string {
  try {
    return Buffer.from(decodeURIComponent(value), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function deleteExpiredQuickRegisterUser(userId: number, roleId: string): Promise<void> {
  const usersTable = await getLegacyUsersTable();
  if (usersTable) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${usersTable}\` WHERE id = ?`, userId);
  }

  const profileTable =
    roleId === '8'
      ? await findExistingTable(['clubs', 'club'])
      : await findExistingTable(['athletes', 'athlete']);

  if (profileTable) {
    const profileColumns = await getTableColumns(profileTable);
    if (profileColumns.has('user_id')) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${profileTable}\` WHERE user_id = ?`, userId);
    }
  }

  await prisma.user.delete({ where: { id: `legacy_${userId}` } }).catch(() => undefined);
}

async function confirmRegistration(encodedId: string, encodedRole: string): Promise<'done' | 'expired'> {
  const id = Number(decodeBase64Param(encodedId));
  const roleId = decodeBase64Param(encodedRole);
  if (!Number.isFinite(id) || id < 1) return 'expired';

  const usersTable = await getLegacyUsersTable();
  if (!usersTable) return 'expired';

  const columns = await getTableColumns(usersTable);
  const createdSelect = columns.has('created') ? 'created' : 'NOW() AS created';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, ${createdSelect} FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
    id
  );
  const user = rows[0];
  if (!user) return 'expired';

  const created = user.created ? new Date(String(user.created)) : new Date();
  if (!Number.isNaN(created.getTime())) {
    const expires = new Date(created);
    expires.setDate(expires.getDate() + 7);
    if (ymd(new Date()) > ymd(expires)) {
      await deleteExpiredQuickRegisterUser(id, roleId);
      return 'expired';
    }
  }

  if (columns.has('verification_status')) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${usersTable}\` SET verification_status = 'T' WHERE id = ?`,
      id
    );
  }

  return 'done';
}

export default async function ConfirmRegisterLinkPage({
  params,
}: {
  params: Promise<{ id: string; role: string }>;
}) {
  const { id, role } = await params;
  const status = await confirmRegistration(id, role);
  redirect(`/confirm_register_success?${status}=1`);
}

import { NextRequest, NextResponse } from 'next/server';
import { validateEnabledPromocode } from '@/lib/promocodes/sendInviteService';
import { getPromocodeSettingsTable } from '@/lib/promocodes/legacyDb';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('promocode')?.trim() ?? '';
  if (!code) {
    return NextResponse.json({
      success: false,
      message: 'Please enter a promocode.',
      data: {},
    });
  }

  const check = await validateEnabledPromocode(code);
  if (!check.ok) {
    return NextResponse.json({
      success: false,
      message: check.message,
      data: {},
    });
  }

  const table = await getPromocodeSettingsTable();
  if (!table) {
    return NextResponse.json({
      success: false,
      message: 'Promocode settings not available.',
      data: {},
    });
  }

  const rows = await prisma.$queryRawUnsafe<
    { discount: number | string | null; valid_from: string | Date | null; valid_to: string | Date | null }[]
  >(
    `SELECT discount, valid_from, valid_to FROM \`${table}\` WHERE id = ? LIMIT 1`,
    check.id
  );
  const row = rows[0];
  const discount = row?.discount != null ? String(row.discount) : '0';

  return NextResponse.json({
    success: true,
    message: `Promocode applied. Discount: ${discount}%`,
    data: {
      discount,
      valid_from: row?.valid_from != null ? String(row.valid_from).slice(0, 10) : null,
      valid_to: row?.valid_to != null ? String(row.valid_to).slice(0, 10) : null,
    },
  });
}

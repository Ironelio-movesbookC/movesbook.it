import { prisma } from '@/lib/prisma';

/** Remove temporary alternate password after a one-access-only delegate session ends. */
export async function clearStaffAlternatePassword(staffAccountId: string): Promise<void> {
  await prisma.staffAccount.update({
    where: { id: staffAccountId },
    data: {
      alternatePassword: null,
      alternatePasswordOneAccessOnly: false,
    },
  });
}

export async function closeOpenStaffLoginLog(staffAccountId: string): Promise<void> {
  const now = new Date();
  const open = await prisma.staffAccountLoginLog.findFirst({
    where: { staffAccountId, logoutAt: null },
    orderBy: { loginAt: 'desc' },
    select: { id: true },
  });
  if (open) {
    await prisma.staffAccountLoginLog.update({
      where: { id: open.id },
      data: { logoutAt: now },
    });
  }
}

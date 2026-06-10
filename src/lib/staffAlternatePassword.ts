import { prisma } from '@/lib/prisma';
export { closeOpenStaffLoginLog } from '@/lib/loginLogSession';

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

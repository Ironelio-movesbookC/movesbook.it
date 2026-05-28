import { prisma } from '@/lib/prisma';

/** Operators linked to this co-admin (assigned by Super Admin). */
export async function getOperatorIdsLinkedToCoAdmin(coAdminId: string): Promise<string[]> {
  const links = await prisma.staffOperatorCoAdminLink.findMany({
    where: { coAdminId },
    select: { operatorId: true },
  });
  return links.map((l) => l.operatorId);
}

export async function isOperatorLinkedToCoAdmin(
  coAdminId: string,
  operatorId: string,
): Promise<boolean> {
  const link = await prisma.staffOperatorCoAdminLink.findFirst({
    where: { coAdminId, operatorId },
    select: { id: true },
  });
  return Boolean(link);
}

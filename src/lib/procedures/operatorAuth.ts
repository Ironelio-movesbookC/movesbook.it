import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function verifyOperatorPassword(
  operatorId: string,
  password: string
): Promise<boolean> {
  const trimmed = password.trim();
  if (!trimmed) return false;

  const user = await prisma.user.findUnique({
    where: { id: operatorId },
    select: { password: true },
  });
  if (!user?.password) return false;

  return verifyPassword(trimmed, user.password);
}

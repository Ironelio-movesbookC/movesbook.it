import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function verifySuperAdminPassword(password: string): Promise<boolean> {
  if (!password.trim()) return false;

  const anySuperAdmin = await prisma.superAdmin.findFirst({
    where: { isActive: true },
  });
  if (anySuperAdmin && (await bcrypt.compare(password, anySuperAdmin.password))) {
    return true;
  }

  const settings = await prisma.superAdminSettings.findFirst();
  if (settings && (await bcrypt.compare(password, settings.password))) {
    return true;
  }

  const fallbackPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
  return password === fallbackPassword;
}

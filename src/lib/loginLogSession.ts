import { ensureLoginLogPrismaModels, prisma } from '@/lib/prisma';

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

export async function recordStaffLoginLog(staffAccountId: string): Promise<void> {
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
  await prisma.staffAccountLoginLog.create({
    data: { staffAccountId, loginAt: now },
  });
}

export async function closeOpenSuperAdminLoginLog(superAdminId: string): Promise<void> {
  await ensureLoginLogPrismaModels();
  const now = new Date();
  const open = await prisma.superAdminLoginLog.findFirst({
    where: { superAdminId, logoutAt: null },
    orderBy: { loginAt: 'desc' },
    select: { id: true },
  });
  if (open) {
    await prisma.superAdminLoginLog.update({
      where: { id: open.id },
      data: { logoutAt: now },
    });
  }
}

export async function recordSuperAdminLoginLog(superAdminId: string): Promise<void> {
  await ensureLoginLogPrismaModels();
  const now = new Date();
  await closeOpenSuperAdminLoginLog(superAdminId);
  await prisma.superAdminLoginLog.create({
    data: { superAdminId, loginAt: now },
  });
}

export async function closeOpenUserLoginLog(userId: string): Promise<void> {
  await ensureLoginLogPrismaModels();
  const now = new Date();
  const open = await prisma.userLoginLog.findFirst({
    where: { userId, logoutAt: null },
    orderBy: { loginAt: 'desc' },
    select: { id: true },
  });
  if (open) {
    await prisma.userLoginLog.update({
      where: { id: open.id },
      data: { logoutAt: now },
    });
  }
}

export async function recordUserLoginLog(userId: string): Promise<void> {
  await ensureLoginLogPrismaModels();
  const now = new Date();
  await closeOpenUserLoginLog(userId);
  await prisma.userLoginLog.create({
    data: { userId, loginAt: now },
  });
}

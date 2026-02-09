import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.startsWith('file:')) {
  const relativePath = databaseUrl.replace('file:', '');
  const candidates = [relativePath, './prisma/dev.db', './prisma/prisma/dev.db'];
  const existingPath = candidates.find((candidate) =>
    fs.existsSync(path.resolve(process.cwd(), candidate))
  );
  if (existingPath && existingPath !== relativePath) {
    process.env.DATABASE_URL = `file:${existingPath}`;
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// PrismaClient is attached to the `global` object to prevent exhausting the
// database connection limit across hot-reloads (dev) AND across warm serverless
// invocations (production).  The client must always be cached globally so the
// engine is already connected when a request arrives.
// See: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Resolve SQLite path variants (local development only)
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

// Always cache — in production this keeps the engine alive between warm
// invocations; in development it avoids creating a new client on every HMR.
globalForPrisma.prisma = prisma;

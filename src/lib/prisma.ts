import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

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

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaConnectPromise?: Promise<void>;
  prismaDevMutexChain?: Promise<void>;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Prisma 6 + Next.js dev can crash the query engine when multiple requests hit the DB
 * at once ("Response from the Engine was empty"). Serialize calls in development only.
 *
 * Always await prismaConnect() first so API routes never query before the engine is ready
 * (avoids "Engine is not yet connected" when requests race instrumentation.register()).
 */
function runExclusiveDev<T>(operation: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === 'production') {
    return prismaConnect().then(() => operation());
  }
  if (!globalForPrisma.prismaDevMutexChain) {
    globalForPrisma.prismaDevMutexChain = Promise.resolve();
  }
  const run = globalForPrisma.prismaDevMutexChain.then(() =>
    prismaConnect().then(() => operation()),
  );
  globalForPrisma.prismaDevMutexChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const skipDevMutex = new Set(['$connect', '$disconnect', '$on', '$extends']);

function wrapModelDelegate(delegate: object): object {
  return new Proxy(delegate, {
    get(_target, prop, receiver) {
      const value = Reflect.get(delegate, prop, receiver);
      if (typeof value === 'function') {
        return (...args: unknown[]) =>
          runExclusiveDev(
            () => (value as (...a: unknown[]) => unknown).apply(delegate, args) as Promise<unknown>
          );
      }
      return value;
    },
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();

    if (typeof prop === 'symbol') {
      return Reflect.get(client, prop, receiver);
    }

    const value = Reflect.get(client, prop, receiver);

    if (typeof value === 'function') {
      if (skipDevMutex.has(prop as string)) {
        return (value as (...a: unknown[]) => unknown).bind(client);
      }
      return (...args: unknown[]) =>
        runExclusiveDev(
          () => (value as (...a: unknown[]) => unknown).apply(client, args) as Promise<unknown>
        );
    }

    if (value !== null && typeof value === 'object') {
      return wrapModelDelegate(value as object);
    }

    return value;
  },
});

/**
 * Disconnect and drop the cached client so the next access builds a fresh engine.
 * Use after PrismaClientUnknownRequestError ("Engine was empty" / "not yet connected").
 */
export async function resetPrismaClient(): Promise<void> {
  const prev = globalForPrisma.prisma;
  if (prev) {
    await prev.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaConnectPromise = undefined;
  globalForPrisma.prismaDevMutexChain = undefined;
}

/**
 * Await before DB work. Singleflight $connect() for the current client instance.
 */
export function prismaConnect(): Promise<void> {
  const client = getClient();
  if (!globalForPrisma.prismaConnectPromise) {
    globalForPrisma.prismaConnectPromise = client.$connect();
  }
  return globalForPrisma.prismaConnectPromise;
}

function hasLoginLogDelegates(client: PrismaClient): boolean {
  return (
    typeof client.userLoginLog?.findMany === 'function' &&
    typeof client.superAdminLoginLog?.findMany === 'function'
  );
}

async function assignFreshPrismaClient(): Promise<void> {
  await resetPrismaClient();
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaConnectPromise = undefined;
}

/**
 * Dev hot-reload can cache a PrismaClient from before UserLoginLog existed.
 * Reset and assign a new client so delegates exist on the global instance.
 */
export async function ensureLoginLogPrismaModels(): Promise<void> {
  if (hasLoginLogDelegates(getClient())) {
    await prismaConnect();
    return;
  }

  await assignFreshPrismaClient();
  if (hasLoginLogDelegates(getClient())) {
    await prismaConnect();
    return;
  }

  // Next.js dev may keep a stale @prisma/client module; dynamic import picks up the latest generate.
  await resetPrismaClient();
  const { PrismaClient: FreshPrismaClient } = await import('@prisma/client');
  globalForPrisma.prisma = new FreshPrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  globalForPrisma.prismaConnectPromise = undefined;

  if (!hasLoginLogDelegates(getClient())) {
    throw new Error(
      'Prisma client is missing login log models. Run `npx prisma generate` and restart `npm run dev`.',
    );
  }
  await prismaConnect();
}

/** Use after {@link ensureLoginLogPrismaModels} when calling login-log delegates directly. */
export function getPrismaClient(): PrismaClient {
  return getClient();
}
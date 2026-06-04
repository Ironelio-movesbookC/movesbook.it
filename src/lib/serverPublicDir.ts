import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, normalize } from 'path';

/**
 * Absolute path to the `public` folder that Next.js serves for static URLs.
 * Upload routes must write here or `/img/...` and `/outcome_messages/...` return 404.
 *
 * - `npm run dev` / `next start` from repo root → `{cwd}/public`
 * - Docker / PM2 running `node server.js` inside standalone → `{cwd}/public` (cwd is standalone dir)
 * - Override with `MOVESBOOK_PUBLIC_DIR` (absolute path) when layout differs
 *
 * Do not use `.next/standalone/public` when the app runs via `next start` from the repo root;
 * that folder is only for the standalone server bundle, not for `next start` static serving.
 */
export function getServerPublicDir(): string {
  const env = process.env.MOVESBOOK_PUBLIC_DIR?.trim();
  if (env) {
    return normalize(env);
  }

  const cwd = process.cwd();

  // `node server.js` from inside `.next/standalone` (Docker CMD, PM2 cwd = standalone).
  if (existsSync(join(cwd, 'server.js')) && existsSync(join(cwd, 'public'))) {
    return normalize(join(cwd, 'public'));
  }

  return normalize(join(cwd, 'public'));
}

export function resolvePublicPath(...segments: string[]): string {
  return join(getServerPublicDir(), ...segments);
}

/** True if path exists, is a non-empty file (post-upload sanity check). */
export async function verifyPublicFile(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

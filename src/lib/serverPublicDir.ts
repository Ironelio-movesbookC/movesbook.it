import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, normalize, sep } from 'path';

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

/**
 * Public roots to search when serving uploaded media (read path may differ from write path).
 * Set `MOVESBOOK_LEGACY_PUBLIC_DIR` when legacy CakePHP webroot still holds outcome audio.
 */
export function getPublicDirCandidates(): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (dir: string | undefined | null) => {
    if (!dir) return;
    const normalized = normalize(dir);
    if (seen.has(normalized) || !existsSync(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  push(process.env.MOVESBOOK_PUBLIC_DIR?.trim());
  push(getServerPublicDir());
  push(process.env.MOVESBOOK_LEGACY_PUBLIC_DIR?.trim());

  const cwd = process.cwd();
  push(join(cwd, 'public'));
  push(join(cwd, '.next', 'standalone', 'public'));
  push(join(cwd, '..', 'public'));

  return candidates;
}

function isUnderOutcomeRoot(filePath: string, outcomeRoot: string): boolean {
  const file = normalize(filePath);
  const root = normalize(outcomeRoot);
  return file === root || file.startsWith(root + sep);
}

/** Resolve an outcome audio file on disk, checking every known public root. */
export async function resolveOutcomeAudioDiskPath(...segments: string[]): Promise<string | null> {
  for (const root of getPublicDirCandidates()) {
    const diskPath = normalize(join(root, 'outcome_messages', ...segments));
    const outcomeRoot = normalize(join(root, 'outcome_messages'));
    if (!isUnderOutcomeRoot(diskPath, outcomeRoot)) continue;
    if (await verifyPublicFile(diskPath)) return diskPath;
  }
  return null;
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

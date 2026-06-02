import { existsSync } from 'fs';
import { join, normalize } from 'path';

/**
 * Absolute path to the `public` folder the running Node process uses for static files.
 * Upload routes write here; URLs like `/uploads/...` only work if this matches what Next serves.
 *
 * On VPS with `output: 'standalone'`, if PM2 runs `node .next/standalone/server.js` while
 * `process.cwd()` is the repo root, uploads defaulted to `repo/public` but static files may
 * be served from `.next/standalone/public` — set `MOVESBOOK_PUBLIC_DIR` to that folder (absolute).
 */
export function getServerPublicDir(): string {
  const env = process.env.MOVESBOOK_PUBLIC_DIR?.trim();
  if (env) {
    return normalize(env);
  }

  const cwd = process.cwd();

  // `node server.js` from inside `.next/standalone` (typical PM2 layout).
  if (existsSync(join(cwd, 'server.js')) && existsSync(join(cwd, 'public'))) {
    return normalize(join(cwd, 'public'));
  }

  if (process.env.NODE_ENV === 'production') {
    const standalonePublic = join(cwd, '.next', 'standalone', 'public');
    if (
      existsSync(standalonePublic) &&
      existsSync(join(cwd, '.next', 'standalone', 'server.js'))
    ) {
      return normalize(standalonePublic);
    }
  }

  return normalize(join(cwd, 'public'));
}

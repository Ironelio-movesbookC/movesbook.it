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
  return normalize(join(process.cwd(), 'public'));
}

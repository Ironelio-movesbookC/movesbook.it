import {
  MUB_BACKGROUND_OPTIONS,
  MUB_BUTTON_COLORS,
  MUB_PAGE_OPEN_OPTIONS,
  MUB_TEXT_COLORS,
  MUB_TEXT_FONTS,
} from '@/lib/mub/constants';
import type { MubIconSource } from '@/lib/mub/types';

/**
 * Schemes a MUB button may navigate to. `javascript:` / `data:` / `vbscript:`
 * are rejected — button URLs are free text and imported staff buttons render
 * inside every user's page, so an unchecked href is stored XSS.
 */
const ALLOWED_LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const ALLOWED_ASSET_SCHEMES = new Set(['http', 'https']);

/**
 * Drop characters a browser ignores when it resolves a scheme, so that
 * `java<TAB>script:alert(1)` cannot slip past the allowlist below.
 * Control chars, DEL, zero-width joiners and the BOM.
 */
function stripInvisible(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f) continue;
    if (code === 0x7f) continue;
    if (code >= 0x200b && code <= 0x200d) continue;
    if (code === 0xfeff) continue;
    out += ch;
  }
  return out;
}

function schemeOf(value: string): string | null {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value);
  return match ? match[1].toLowerCase() : null;
}

function sanitizeWithSchemes(raw: string | null | undefined, allowed: Set<string>): string | null {
  if (!raw) return null;
  const cleaned = stripInvisible(raw).trim();
  if (!cleaned) return null;

  const scheme = schemeOf(cleaned);
  // No scheme → relative path, query or anchor. Cannot execute script.
  if (!scheme) return cleaned;
  return allowed.has(scheme) ? cleaned : null;
}

/** Safe `href` for a MUB button, or null when the URL is not navigable. */
export function sanitizeMubUrl(raw: string | null | undefined): string | null {
  return sanitizeWithSchemes(raw, ALLOWED_LINK_SCHEMES);
}

/** Safe `src` for a MUB button icon, or null. */
export function sanitizeMubIconPath(raw: string | null | undefined): string | null {
  return sanitizeWithSchemes(raw, ALLOWED_ASSET_SCHEMES);
}

function pickAllowed(raw: string | null | undefined, allowed: readonly string[], fallback: string): string {
  const value = (raw ?? '').trim();
  return allowed.includes(value) ? value : fallback;
}

const BUTTON_COLOR_VALUES = MUB_BUTTON_COLORS.map((c) => c.value);
const TEXT_COLOR_IDS = MUB_TEXT_COLORS.map((c) => c.id);
const BACKGROUND_IDS = MUB_BACKGROUND_OPTIONS.map((o) => o.id);
const PAGE_OPEN_IDS = MUB_PAGE_OPEN_OPTIONS.map((o) => o.id);

export function sanitizeMubButtonColor(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toLowerCase();
  return BUTTON_COLOR_VALUES.find((v) => v.toLowerCase() === value) ?? '#000000';
}

export function sanitizeMubTextFont(raw: string | null | undefined): string {
  return pickAllowed(raw, MUB_TEXT_FONTS, 'Arial');
}

export function sanitizeMubTextColor(raw: string | null | undefined): string {
  return pickAllowed(raw, TEXT_COLOR_IDS, 'yellow');
}

export function sanitizeMubBackground(raw: string | null | undefined): string {
  return pickAllowed(raw, BACKGROUND_IDS, 'white');
}

export function sanitizeMubPageToOpen(raw: string | null | undefined): string {
  return pickAllowed(raw, PAGE_OPEN_IDS, 'same_label');
}

export function sanitizeMubIconSource(raw: string | null | undefined): MubIconSource {
  return raw === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
}

/** Button text is rendered as text (never HTML) — only length is bounded. */
export const MUB_SHORT_TEXT_MAX = 120;
export const MUB_EXTENDED_TEXT_MAX = 500;

export function sanitizeMubText(raw: string | null | undefined, max: number): string {
  return stripInvisible(raw ?? '').trim().slice(0, max);
}

/** Language codes MUB accepts, so a request cannot create unbounded translation rows. */
export function sanitizeMubLang(raw: string | null | undefined, fallback = 'en'): string {
  const value = (raw ?? '').trim().toLowerCase();
  return /^[a-z]{2}(-[a-z]{2})?$/.test(value) ? value : fallback;
}

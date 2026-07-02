import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import { getHelpHtmlPagesTable, getLanguageValuesTable } from './legacyDb';
import {
  legacyLanguageCodeFromId,
  normalizeLegacyLanguageCode,
} from './legacyLanguageCode';
import { formatPromocodeLanguageLabel } from './promocodeLanguages';

/**
 * Language Settings → Long text (`/settings/language`) → variable_name.
 * PHP production DB: promocode invite opening paragraph (paired with HTML attachment).
 */
export const PROMOCODE_INVITE_LANGUAGE_VARIABLE = 'dim';

type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T>;

export async function defaultInviteQuery<T>(sql: string, params: unknown[] = []): Promise<T> {
  return prisma.$queryRawUnsafe<T>(sql, ...params);
}

function isBlankHtml(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

/** PHP uses `language_values.lang_name` as the `language_paragraphs` column key. */
export async function resolveLanguageParagraphColumn(
  languageId: string,
  query: QueryFn = defaultInviteQuery
): Promise<string> {
  const paraColumns = await getTableColumns('language_paragraphs');
  const langTable = await getLanguageValuesTable();

  if (langTable) {
    const columns = await getTableColumns(langTable);
    const nameCol = columns.has('lang_name') ? 'lang_name' : columns.has('name') ? 'name' : null;
    if (nameCol) {
      const rows = await query<{ lang_name: string | null }[]>(
        `SELECT \`${nameCol}\` AS lang_name FROM \`${langTable}\` WHERE id = ? LIMIT 1`,
        [Number(languageId) || languageId]
      );
      const rawName = rows[0]?.lang_name;
      if (rawName) {
        for (const candidate of [
          String(rawName),
          String(rawName).toLowerCase(),
          normalizeLegacyLanguageCode(String(rawName)),
        ]) {
          if (paraColumns.has(candidate)) return candidate;
        }
      }
    }
  }

  const fallback = normalizeLegacyLanguageCode(legacyLanguageCodeFromId(languageId));
  return paraColumns.has(fallback) ? fallback : 'en';
}

/** Load invite opening text from Language → Long text (`variable_name = dim`). */
export async function loadPromocodeInviteLanguageParagraph(
  languageId: string,
  query: QueryFn = defaultInviteQuery
): Promise<string> {
  const column = await resolveLanguageParagraphColumn(languageId, query);

  const dedicated = await query<Record<string, unknown>[]>(
    `SELECT * FROM language_paragraphs WHERE variable_name = ? LIMIT 1`,
    [PROMOCODE_INVITE_LANGUAGE_VARIABLE]
  ).catch(() => [] as Record<string, unknown>[]);

  if (dedicated.length > 0) {
    const text = dedicated[0][column];
    if (text != null && !isBlankHtml(text)) return String(text);
  }

  const rows = await query<Record<string, unknown>[]>(
    `SELECT * FROM language_paragraphs ORDER BY id ASC LIMIT 1`
  ).catch(() => [] as Record<string, unknown>[]);

  if (rows.length === 0) return '';
  const text = rows[0][column];
  return text != null ? String(text) : '';
}

export async function getLanguageListForHelpPage(pageTitle: string): Promise<{ id: number; value: string }[]> {
  const helpTable = await getHelpHtmlPagesTable();
  const langTable = await getLanguageValuesTable();

  if (!langTable) return [];

  const languageDetl = await prisma.$queryRawUnsafe<{ id: number | bigint; lang_name: string | null }[]>(
    `SELECT id, lang_name FROM \`${langTable}\` ORDER BY id ASC`
  );
  const langMap = new Map(languageDetl.map((l) => [Number(l.id), l.lang_name ? String(l.lang_name) : '']));

  const allLanguages = () =>
    languageDetl
      .map((l) => ({
        id: Number(l.id),
        value: formatPromocodeLanguageLabel(langMap.get(Number(l.id)) ?? `Lang ${l.id}`),
      }))
      .filter((l) => Number.isFinite(l.id));

  if (!helpTable || !pageTitle.trim()) return allLanguages();

  const pages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, page_title, lang_id, uniqueid FROM \`${helpTable}\``
  );

  const normalizedTitle = pageTitle.trim();
  const matchingPages = pages.filter((p) => String(p.page_title ?? '') === normalizedTitle);
  if (matchingPages.length === 0) return allLanguages();

  const resultLangIds = new Set<number>();

  for (const page of matchingPages) {
    for (const sibling of pages) {
      if (String(sibling.page_title ?? '') !== normalizedTitle) continue;
      const langId = sibling.lang_id != null ? Number(sibling.lang_id) : NaN;
      if (Number.isFinite(langId)) resultLangIds.add(langId);
    }

    const uniqueid =
      page.uniqueid != null && String(page.uniqueid).trim()
        ? String(page.uniqueid)
        : matchingPages.find((p) => p.uniqueid != null && String(p.uniqueid).trim())?.uniqueid;

    if (uniqueid) {
      for (const bound of pages) {
        if (String(bound.uniqueid ?? '') !== String(uniqueid)) continue;
        const langId = bound.lang_id != null ? Number(bound.lang_id) : NaN;
        if (Number.isFinite(langId)) resultLangIds.add(langId);
      }
    }
  }

  if (resultLangIds.size === 0) return allLanguages();

  return Array.from(resultLangIds)
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      value: formatPromocodeLanguageLabel(langMap.get(id) ?? `Lang ${id}`),
    }));
}

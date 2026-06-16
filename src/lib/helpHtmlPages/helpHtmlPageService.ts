import { prisma } from '@/lib/prisma';
import { findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';
import { ensurePromocodeMetaTables } from '@/lib/promocodes/ensureMetaTables';
import type {
  HelpHtmlPageLanguage,
  HelpHtmlPageNewsPost,
  HelpHtmlPageRecord,
  HelpHtmlPageViewModel,
} from './types';

const HELP_PAGES_TABLE = ['help_html_pages'];
const LANGUAGE_TABLE = ['language_values'];
const NEWS_TABLE = ['news', 'News'];

function decodePageName(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
  } catch {
    return raw.replace(/\+/g, ' ').trim();
  }
}

function rowContent(value: unknown): string {
  if (value == null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((c) => columns.has(c)) ?? null;
}

async function ensureContentColumn(table: string): Promise<void> {
  const columns = await getTableColumns(table);
  if (columns.has('content')) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN content MEDIUMTEXT NULL`
  );
}

export async function getHelpHtmlPageByTitle(
  pageTitle: string,
  langId: number
): Promise<HelpHtmlPageRecord | null> {
  await ensurePromocodeMetaTables();

  const table = (await findExistingTable(HELP_PAGES_TABLE)) ?? 'help_html_pages';
  await ensureContentColumn(table);

  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const titleCol = pickColumn(columns, ['page_title', 'title']) ?? 'page_title';
  const langCol = pickColumn(columns, ['lang_id', 'language_id']) ?? 'lang_id';
  const contentCol = pickColumn(columns, ['content']) ?? 'content';

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title, \`${contentCol}\` AS content, \`${langCol}\` AS lang_id
     FROM \`${table}\`
     WHERE \`${titleCol}\` = ? AND \`${langCol}\` = ?
     LIMIT 1`,
    pageTitle,
    langId
  );

  if (rows.length === 0) {
    const fallbackRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title, \`${contentCol}\` AS content, \`${langCol}\` AS lang_id
       FROM \`${table}\`
       WHERE \`${titleCol}\` = ?
       ORDER BY \`${langCol}\` ASC
       LIMIT 1`,
      pageTitle
    );
    if (fallbackRows.length === 0) return null;
    const row = fallbackRows[0];
    return {
      id: Number(row.id),
      pageTitle: String(row.page_title ?? pageTitle),
      content: rowContent(row.content),
      langId: Number(row.lang_id ?? langId),
    };
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    pageTitle: String(row.page_title ?? pageTitle),
    content: rowContent(row.content),
    langId: Number(row.lang_id ?? langId),
  };
}

export async function loadHelpHtmlPageLanguages(): Promise<HelpHtmlPageLanguage[]> {
  await ensurePromocodeMetaTables();
  const table = (await findExistingTable(LANGUAGE_TABLE)) ?? 'language_values';
  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const nameCol = pickColumn(columns, ['lang_name', 'name', 'language_name']) ?? 'lang_name';

  const rows = await prisma.$queryRawUnsafe<{ id: number | bigint; lang_name: string | null }[]>(
    `SELECT \`${idCol}\` AS id, \`${nameCol}\` AS lang_name FROM \`${table}\` ORDER BY \`${idCol}\` ASC`
  );

  return rows
    .map((row) => ({
      id: Number(row.id),
      name: row.lang_name ? String(row.lang_name).trim() : '',
    }))
    .filter((row) => row.name !== '');
}

export async function loadRelatedNewsPosts(limit = 20): Promise<HelpHtmlPageNewsPost[]> {
  const table = await findExistingTable(NEWS_TABLE);
  if (!table) return [];

  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const titleCol = pickColumn(columns, ['title', 'news_title']) ?? 'title';
  const createdCol = pickColumn(columns, ['created', 'created_at', 'createdAt']);
  const categoryCol = pickColumn(columns, ['news_category_id', 'newsCategoryId', 'category_id']);

  let sql = `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS title`;
  sql += createdCol ? `, \`${createdCol}\` AS created` : `, NULL AS created`;
  sql += ` FROM \`${table}\``;
  const params: unknown[] = [];
  if (categoryCol) {
    sql += ` WHERE \`${categoryCol}\` = ?`;
    params.push(13);
  }
  sql += ` ORDER BY \`${idCol}\` DESC LIMIT ?`;
  params.push(limit);

  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: number | bigint; title: string | null; created: Date | string | null }[]
    >(sql, ...params);
    return rows.map((row) => ({
      id: Number(row.id),
      title: row.title ? String(row.title).trim() : '',
      created: row.created != null ? String(row.created) : null,
    }));
  } catch {
    return [];
  }
}

export async function loadHelpHtmlPageView(
  rawPageName: string,
  langId: number
): Promise<HelpHtmlPageViewModel> {
  const pageName = decodePageName(rawPageName);
  const [page, newsPosts, languages] = await Promise.all([
    getHelpHtmlPageByTitle(pageName, langId),
    loadRelatedNewsPosts(),
    loadHelpHtmlPageLanguages(),
  ]);

  return {
    page,
    newsPosts,
    languages,
    langId,
    pageName,
  };
}

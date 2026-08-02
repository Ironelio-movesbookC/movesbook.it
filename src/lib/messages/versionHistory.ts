import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';
import { ensurePromocodeMetaTables } from '@/lib/promocodes/ensureMetaTables';
import { richTextToPlainText } from '@/utils/richTextTranslation';
import { legacyCodeFromLangId, legacyLanguageIdFromCode } from '@/lib/messages/versionHistoryLang';

const SECTIONS_TABLE = ['why_movesbook_sections'];
const LANGUAGE_TABLE = ['language_values'];
export const VERSION_MODULE = 'version_hisotry';

export type VersionHistoryLanguage = { id: string; name: string; code: string };

export type VersionHistoryArticle = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  langId: string;
  languageCode: string;
  languageName: string;
  createdAt: string;
  articleGroup: string | null;
};

export type VersionHistoryArticleDetail = VersionHistoryArticle & {
  translations: Record<string, { id: string | null; title: string; content: string }>;
};

export type SaveVersionHistoryInput = {
  password: string;
  sourceLangCode: string;
  articleGroup?: string | null;
  editArticleId?: string | null;
  translations: Record<string, { title: string; content: string }>;
};

function rowText(value: unknown): string {
  if (value == null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

function pickDate(row: Record<string, unknown>, columns: Set<string>): string {
  for (const col of ['modified', 'updated_at', 'updatedAt', 'created', 'created_at', 'createdAt']) {
    if (!columns.has(col)) continue;
    const v = row[col];
    if (v instanceof Date) return v.toISOString();
    if (v != null && String(v) !== '' && String(v) !== '0000-00-00 00:00:00') {
      const d = new Date(String(v));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function excerptFromHtml(html: string, maxLen = 400): string {
  const plain = richTextToPlainText(html).replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

async function loadLanguageNames(): Promise<Map<number, string>> {
  const table = await findExistingTable(LANGUAGE_TABLE);
  const map = new Map<number, string>();
  if (!table) return map;

  const rows = await prisma.$queryRawUnsafe<{ id: number | string; lang_name: string | null }[]>(
    `SELECT id, lang_name FROM \`${table}\` ORDER BY id ASC`,
  );
  for (const row of rows) {
    map.set(Number(row.id), row.lang_name ? String(row.lang_name) : `Lang ${row.id}`);
  }
  return map;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    tableName,
  );
  return rows.length > 0;
}

let versionHistoryTablesEnsured = false;

/** Create legacy `why_movesbook_sections` in the app DB when missing (local/dev bootstrap). */
export async function ensureVersionHistoryTables(): Promise<void> {
  if (!(process.env.DATABASE_URL || '').startsWith('mysql')) return;
  if (versionHistoryTablesEnsured) return;

  await ensurePromocodeMetaTables();

  if (!(await tableExists('why_movesbook_sections'))) {
    try {
      await prisma.$executeRawUnsafe(`
      CREATE TABLE why_movesbook_sections (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        section_name VARCHAR(255) NOT NULL DEFAULT '',
        content MEDIUMTEXT NULL,
        lang_id INT NOT NULL DEFAULT 1,
        module VARCHAR(64) NOT NULL DEFAULT '',
        article_group VARCHAR(36) NULL,
        created DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        modified DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_why_movesbook_module_lang (module, lang_id),
        INDEX idx_why_movesbook_article_group (article_group)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    } catch (err) {
      console.error('ensureVersionHistoryTables: CREATE why_movesbook_sections failed:', err);
    }
  } else {
    const columns = await getTableColumns('why_movesbook_sections');
    if (!columns.has('article_group')) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE why_movesbook_sections ADD COLUMN article_group VARCHAR(36) NULL`,
        );
      } catch {
        /* ignore */
      }
    }
    if (!columns.has('created')) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE why_movesbook_sections ADD COLUMN created DATETIME NULL DEFAULT CURRENT_TIMESTAMP`,
        );
      } catch {
        /* ignore */
      }
    }
    if (!columns.has('modified')) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE why_movesbook_sections ADD COLUMN modified DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
        );
      } catch {
        /* ignore */
      }
    }
  }

  if (!(await tableExists('why_movesbook_sections'))) {
    return;
  }

  versionHistoryTablesEnsured = true;
}

async function getSectionsTable(): Promise<{ table: string; columns: Set<string> } | null> {
  await ensureVersionHistoryTables();
  const table = await findExistingTable(SECTIONS_TABLE);
  if (!table) return null;
  const columns = await getTableColumns(table);
  return { table, columns };
}

async function ensureArticleGroupColumn(table: string, columns: Set<string>): Promise<Set<string>> {
  if (columns.has('article_group')) return columns;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` ADD COLUMN article_group VARCHAR(36) NULL`,
    );
  } catch {
    /* column may already exist or DB user lacks ALTER */
  }
  return getTableColumns(table);
}

export async function listVersionHistoryLanguages(): Promise<VersionHistoryLanguage[]> {
  const ctx = await getSectionsTable();
  const languageNames = await loadLanguageNames();
  if (!ctx) return [];

  const distinctLangRows = await prisma.$queryRawUnsafe<{ lang_id: number | string }[]>(
    `SELECT DISTINCT lang_id
     FROM \`${ctx.table}\`
     WHERE module = ?
     ORDER BY lang_id ASC`,
    VERSION_MODULE,
  );

  return distinctLangRows.map((row) => {
    const id = Number(row.lang_id);
    return {
      id: String(id),
      code: legacyCodeFromLangId(id),
      name: languageNames.get(id) ?? `Lang ${id}`,
    };
  });
}

export async function listVersionHistoryArticles(opts?: {
  langId?: string | null;
  q?: string | null;
  languageCode?: string | null;
}): Promise<{ articles: VersionHistoryArticle[]; languages: VersionHistoryLanguage[] }> {
  const ctx = await getSectionsTable();
  const languageNames = await loadLanguageNames();
  const languages = await listVersionHistoryLanguages();

  if (!ctx) return { articles: [], languages };

  const { table, columns } = ctx;
  const resolvedLangId = opts?.langId
    ? opts.langId
    : opts?.languageCode
      ? String(legacyLanguageIdFromCode(opts.languageCode))
      : null;

  const params: unknown[] = [VERSION_MODULE];
  let langClause = '';
  if (resolvedLangId) {
    langClause = ' AND lang_id = ?';
    params.push(Number(resolvedLangId));
  }

  let searchClause = '';
  const q = opts?.q?.trim();
  if (q) {
    searchClause = ' AND (section_name LIKE ? OR content LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }

  const orderCol = columns.has('modified')
    ? 'modified'
    : columns.has('created')
      ? 'created'
      : 'id';

  const selectGroup = columns.has('article_group') ? ', article_group' : ', NULL AS article_group';

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, section_name, content, lang_id${selectGroup}
     FROM \`${table}\`
     WHERE module = ?${langClause}${searchClause}
     ORDER BY \`${orderCol}\` DESC, id DESC
     LIMIT 200`,
    ...params,
  );

  const articles: VersionHistoryArticle[] = rows.map((row) => {
    const langId = Number(row.lang_id);
    const content = rowText(row.content);
    return {
      id: String(row.id),
      title: rowText(row.section_name) || '—',
      content,
      excerpt: excerptFromHtml(content),
      langId: String(langId),
      languageCode: legacyCodeFromLangId(langId),
      languageName: languageNames.get(langId) ?? `Lang ${langId}`,
      createdAt: pickDate(row, columns),
      articleGroup: row.article_group != null ? String(row.article_group) : null,
    };
  });

  return { articles, languages };
}

export async function getVersionHistoryArticle(id: string): Promise<VersionHistoryArticleDetail | null> {
  const ctx = await getSectionsTable();
  if (!ctx) return null;

  const { table, columns } = ctx;
  const selectGroup = columns.has('article_group') ? ', article_group' : ', NULL AS article_group';

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, section_name, content, lang_id${selectGroup}
     FROM \`${table}\`
     WHERE id = ? AND module = ?
     LIMIT 1`,
    Number(id),
    VERSION_MODULE,
  );
  if (!rows.length) return null;

  const row = rows[0];
  const langId = Number(row.lang_id);
  const languageNames = await loadLanguageNames();
  const articleGroup = row.article_group != null ? String(row.article_group) : null;

  const translations: Record<string, { id: string | null; title: string; content: string }> = {};

  let groupRows: Record<string, unknown>[] = [row];
  if (articleGroup && columns.has('article_group')) {
    groupRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, section_name, content, lang_id
       FROM \`${table}\`
       WHERE module = ? AND article_group = ?`,
      VERSION_MODULE,
      articleGroup,
    );
  }

  for (const gRow of groupRows) {
    const code = legacyCodeFromLangId(Number(gRow.lang_id));
    translations[code] = {
      id: String(gRow.id),
      title: rowText(gRow.section_name),
      content: rowText(gRow.content),
    };
  }

  const content = rowText(row.content);
  return {
    id: String(row.id),
    title: rowText(row.section_name) || '—',
    content,
    excerpt: excerptFromHtml(content),
    langId: String(langId),
    languageCode: legacyCodeFromLangId(langId),
    languageName: languageNames.get(langId) ?? `Lang ${langId}`,
    createdAt: pickDate(row, columns),
    articleGroup,
    translations,
  };
}

export async function saveVersionHistoryArticles(
  input: SaveVersionHistoryInput,
): Promise<{ articleGroup: string; savedIds: string[] }> {
  const ctx = await getSectionsTable();
  if (!ctx) throw new Error('version_history_table_missing');

  let { table, columns } = ctx;
  columns = await ensureArticleGroupColumn(table, columns);

  const articleGroup = input.articleGroup?.trim() || randomUUID();
  const savedIds: string[] = [];

  const entries = Object.entries(input.translations).filter(
    ([, v]) => v.title.trim() || richTextToPlainText(v.content).trim(),
  );

  if (!entries.length) throw new Error('version_history_empty');

  for (const [langCode, payload] of entries) {
    const langId = legacyLanguageIdFromCode(langCode);
    const title = payload.title.trim() || 'Untitled';
    const content = payload.content || '';

    let existingId: string | null = null;
    if (columns.has('article_group')) {
      const existing = await prisma.$queryRawUnsafe<{ id: number | string }[]>(
        `SELECT id FROM \`${table}\`
         WHERE module = ? AND article_group = ? AND lang_id = ?
         LIMIT 1`,
        VERSION_MODULE,
        articleGroup,
        langId,
      );
      if (existing[0]?.id != null) existingId = String(existing[0].id);
    }

    if (!existingId && input.editArticleId && langCode === normalizeSourceCode(input.sourceLangCode)) {
      existingId = input.editArticleId;
    }

    if (existingId) {
      if (columns.has('article_group')) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${table}\`
           SET section_name = ?, content = ?, lang_id = ?, article_group = ?
           WHERE id = ? AND module = ?`,
          title,
          content,
          langId,
          articleGroup,
          Number(existingId),
          VERSION_MODULE,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${table}\`
           SET section_name = ?, content = ?, lang_id = ?
           WHERE id = ? AND module = ?`,
          title,
          content,
          langId,
          Number(existingId),
          VERSION_MODULE,
        );
      }
      savedIds.push(existingId);
    } else {
      const dup = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
        `SELECT COUNT(*) AS c FROM \`${table}\`
         WHERE module = ? AND lang_id = ? AND section_name = ?`,
        VERSION_MODULE,
        langId,
        title,
      );
      const dupCount = Number(dup[0]?.c ?? 0);
      if (dupCount > 0 && !columns.has('article_group')) {
        continue;
      }

      if (columns.has('article_group')) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`${table}\` (section_name, content, lang_id, module, article_group)
           VALUES (?, ?, ?, ?, ?)`,
          title,
          content,
          langId,
          VERSION_MODULE,
          articleGroup,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`${table}\` (section_name, content, lang_id, module)
           VALUES (?, ?, ?, ?)`,
          title,
          content,
          langId,
          VERSION_MODULE,
        );
      }

      const idRows = await prisma.$queryRawUnsafe<{ id: number | string }[]>(
        `SELECT id FROM \`${table}\`
         WHERE module = ? AND lang_id = ? AND section_name = ?
         ORDER BY id DESC LIMIT 1`,
        VERSION_MODULE,
        langId,
        title,
      );
      if (idRows[0]?.id != null) savedIds.push(String(idRows[0].id));
    }
  }

  return { articleGroup, savedIds };
}

function normalizeSourceCode(code: string): string {
  return legacyCodeFromLangId(legacyLanguageIdFromCode(code));
}

export async function deleteVersionHistoryArticle(id: string): Promise<boolean> {
  const ctx = await getSectionsTable();
  if (!ctx) return false;

  const { table, columns } = ctx;
  let articleGroup: string | null = null;

  if (columns.has('article_group')) {
    const rows = await prisma.$queryRawUnsafe<{ article_group: string | null }[]>(
      `SELECT article_group FROM \`${table}\` WHERE id = ? AND module = ? LIMIT 1`,
      Number(id),
      VERSION_MODULE,
    );
    articleGroup = rows[0]?.article_group != null ? String(rows[0].article_group) : null;
  }

  if (articleGroup) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${table}\` WHERE module = ? AND article_group = ?`,
      VERSION_MODULE,
      articleGroup,
    );
    return true;
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM \`${table}\` WHERE id = ? AND module = ?`,
    Number(id),
    VERSION_MODULE,
  );
  return true;
}

/** @deprecated Use listVersionHistoryArticles */
export async function loadVersionHistory(opts?: {
  langId?: string | null;
  sectionId?: string | null;
  languageCode?: string | null;
}) {
  const { articles, languages } = await listVersionHistoryArticles({
    langId: opts?.langId,
    languageCode: opts?.languageCode,
  });
  const selected = opts?.sectionId
    ? articles.find((a) => a.id === opts.sectionId)
    : articles[0];
  return {
    langId: opts?.langId ?? languages[0]?.id ?? '1',
    languages: languages.map((l) => ({ id: l.id, name: l.name })),
    sections: articles.map((a) => ({ id: a.id, title: a.title })),
    selectedSectionId: selected?.id ?? null,
    content: selected?.content ?? '',
  };
}

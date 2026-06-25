import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/outcomeSettingsDb';
import {
  LEGACY_LANG_CODE_BY_ID,
  normalizeLegacyLanguageCode,
} from '@/lib/promocodes/legacyLanguageCode';

const SECTIONS_TABLE = ['why_movesbook_sections'];
const LANGUAGE_TABLE = ['language_values'];
const VERSION_MODULE = 'version_hisotry';

export type VersionHistoryLanguage = { id: string; name: string };
export type VersionHistorySection = { id: string; title: string };

export type VersionHistoryPayload = {
  langId: string;
  languages: VersionHistoryLanguage[];
  sections: VersionHistorySection[];
  selectedSectionId: string | null;
  content: string;
};

function rowText(value: unknown): string {
  if (value == null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

function legacyLanguageIdFromCode(code: string | null | undefined): number {
  const normalized = normalizeLegacyLanguageCode(code);
  for (const [id, langCode] of Object.entries(LEGACY_LANG_CODE_BY_ID)) {
    if (langCode === normalized) return Number(id);
  }
  return 1;
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

export async function loadVersionHistory(opts?: {
  langId?: string | null;
  sectionId?: string | null;
  languageCode?: string | null;
}): Promise<VersionHistoryPayload> {
  const table = await findExistingTable(SECTIONS_TABLE);
  const languageNames = await loadLanguageNames();

  const empty: VersionHistoryPayload = {
    langId: String(legacyLanguageIdFromCode(opts?.languageCode)),
    languages: [],
    sections: [],
    selectedSectionId: null,
    content: '',
  };

  if (!table) return empty;

  const distinctLangRows = await prisma.$queryRawUnsafe<{ lang_id: number | string }[]>(
    `SELECT DISTINCT lang_id
     FROM \`${table}\`
     WHERE module = ?
     ORDER BY lang_id ASC`,
    VERSION_MODULE,
  );

  const languages: VersionHistoryLanguage[] = distinctLangRows.map((row) => {
    const id = Number(row.lang_id);
    return {
      id: String(id),
      name: languageNames.get(id) ?? `Lang ${id}`,
    };
  });

  const resolvedLangId =
    opts?.langId && languages.some((l) => l.id === opts.langId)
      ? opts.langId
      : String(legacyLanguageIdFromCode(opts?.languageCode));

  const fallbackLangId =
    languages.find((l) => l.id === resolvedLangId)?.id ??
    languages[0]?.id ??
    resolvedLangId;

  const sectionRows = await prisma.$queryRawUnsafe<
    { id: number | string; section_name: string | null }[]
  >(
    `SELECT id, section_name
     FROM \`${table}\`
     WHERE module = ? AND lang_id = ?
     ORDER BY id DESC`,
    VERSION_MODULE,
    Number(fallbackLangId),
  );

  const sections: VersionHistorySection[] = sectionRows.map((row) => ({
    id: String(row.id),
    title: rowText(row.section_name) || 'Section',
  }));

  const selectedSectionId =
    opts?.sectionId && sections.some((s) => s.id === opts.sectionId)
      ? opts.sectionId
      : sections[0]?.id ?? null;

  let content = '';
  if (selectedSectionId) {
    const contentRows = await prisma.$queryRawUnsafe<{ content: unknown }[]>(
      `SELECT content
       FROM \`${table}\`
       WHERE id = ?
       LIMIT 1`,
      Number(selectedSectionId),
    );
    content = rowText(contentRows[0]?.content);
  }

  return {
    langId: fallbackLangId,
    languages,
    sections,
    selectedSectionId,
    content,
  };
}

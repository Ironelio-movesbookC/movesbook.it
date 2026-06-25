import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function formatUserName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

/** Seed `outcome_countries` from legacy `countries` when empty. */
export async function seedOutcomeCountriesIfEmpty(): Promise<void> {
  const count = await prisma.outcomeCountry.count();
  if (count > 0) return;

  const countriesTable = await findExistingTable(['countries', 'country']);
  if (!countriesTable) return;

  const languages = await prisma.language.findMany({
    where: { legacyLangId: { not: null } },
  });
  const langByLegacyId = new Map(
    languages
      .filter((l) => l.legacyLangId != null)
      .map((l) => [l.legacyLangId as number, l.id])
  );
  const english =
    languages.find((l) => l.code === 'en') ??
    languages.find((l) => l.isDefault) ??
    languages[0];
  if (!english) return;

  const rows = await prisma.$queryRawUnsafe<
    {
      id: number | string;
      country_name?: string | null;
      name?: string | null;
      country_code?: string | null;
      code?: string | null;
      country_lang_id?: number | string | null;
    }[]
  >(`SELECT * FROM \`${countriesTable}\` LIMIT 500`);

  for (const row of rows) {
    const legacyCountryId = Number(row.id);
    if (!Number.isFinite(legacyCountryId)) continue;

    const name = text(row.country_name ?? row.name);
    const code = text(row.country_code ?? row.code) || `C${legacyCountryId}`;
    const legacyLangId = Number(row.country_lang_id ?? 0);
    const defaultLanguageId =
      (Number.isFinite(legacyLangId) && legacyLangId > 0
        ? langByLegacyId.get(legacyLangId)
        : null) ?? english.id;

    await prisma.outcomeCountry.upsert({
      where: { code },
      update: {
        name: name || code,
        legacyCountryId,
        defaultLanguageId,
      },
      create: {
        code,
        name: name || code,
        legacyCountryId,
        defaultLanguageId,
      },
    });
  }
}

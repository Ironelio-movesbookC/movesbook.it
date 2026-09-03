import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  MubButtonDto,
  MubCategory,
  MubPageDto,
  MubPageQuery,
  MubRoleTemplate,
  MubScope,
  SaveMubButtonInput,
} from '@/lib/mub/types';

function normalizeLang(code: string): string {
  return code.trim().toLowerCase() || 'en';
}

async function ensurePageSettings(query: MubPageQuery) {
  const { scope, ownerId = null, roleTemplate = null, category } = query;
  const existing = await prisma.mubPageSettings.findFirst({
    where: {
      scope,
      ownerId: ownerId ?? null,
      roleTemplate: roleTemplate ?? null,
      category,
    },
  });
  if (existing) return existing;

  return prisma.mubPageSettings.create({
    data: {
      scope,
      ownerId: ownerId ?? null,
      roleTemplate: roleTemplate ?? null,
      category,
    },
  });
}

function mapButton(
  row: Prisma.MubButtonItemGetPayload<{ include: { translations: true } }>,
  languageCode: string,
): MubButtonDto {
  const translations: Record<string, { shortText: string; extendedText: string }> = {};
  for (const tr of row.translations) {
    translations[normalizeLang(tr.languageCode)] = {
      shortText: tr.shortText,
      extendedText: tr.extendedText,
    };
  }
  const lang = normalizeLang(languageCode);
  const primary = translations[lang] ?? translations.en ?? { shortText: '', extendedText: '' };

  return {
    id: row.id,
    sortOrder: row.sortOrder,
    buttonColor: row.buttonColor,
    textFont: row.textFont,
    textColor: row.textColor,
    iconPath: row.iconPath,
    iconSource: row.iconSource,
    urlToOpen: row.urlToOpen,
    pageToOpen: row.pageToOpen,
    isImported: row.isImported,
    shortText: primary.shortText,
    extendedText: primary.extendedText,
    translations,
  };
}

export async function getMubPage(
  query: MubPageQuery,
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  const buttons = await prisma.mubButtonItem.findMany({
    where: { pageId: page.id },
    include: { translations: true },
    orderBy: { sortOrder: 'asc' },
  });

  return {
    id: page.id,
    scope: page.scope as MubScope,
    ownerId: page.ownerId,
    roleTemplate: page.roleTemplate as MubRoleTemplate | null,
    category: page.category as MubCategory,
    backgroundColor: page.backgroundColor,
    displayMode: page.displayMode,
    buttons: buttons.map((b) => mapButton(b, languageCode)),
  };
}

export async function updateMubPageSettings(
  query: MubPageQuery,
  patch: { backgroundColor?: string; displayMode?: number },
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  await prisma.mubPageSettings.update({
    where: { id: page.id },
    data: {
      ...(patch.backgroundColor != null ? { backgroundColor: patch.backgroundColor } : {}),
      ...(patch.displayMode != null ? { displayMode: patch.displayMode } : {}),
    },
  });
  return getMubPage(query);
}

export async function saveMubButton(
  query: MubPageQuery,
  input: SaveMubButtonInput,
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);

  const translationEntries = Object.entries(input.translations).map(([code, value]) => ({
    languageCode: normalizeLang(code),
    shortText: value.shortText ?? '',
    extendedText: value.extendedText ?? '',
  }));

  if (input.id) {
    await prisma.mubButtonItem.update({
      where: { id: input.id },
      data: {
        buttonColor: input.buttonColor,
        textFont: input.textFont,
        textColor: input.textColor,
        iconPath: input.iconPath ?? null,
        iconSource: input.iconSource,
        urlToOpen: input.urlToOpen ?? null,
        pageToOpen: input.pageToOpen,
      },
    });
    for (const tr of translationEntries) {
      await prisma.mubButtonTranslation.upsert({
        where: {
          buttonId_languageCode: { buttonId: input.id, languageCode: tr.languageCode },
        },
        create: { buttonId: input.id, ...tr },
        update: { shortText: tr.shortText, extendedText: tr.extendedText },
      });
    }
  } else {
    const maxOrder = await prisma.mubButtonItem.aggregate({
      where: { pageId: page.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    await prisma.mubButtonItem.create({
      data: {
        pageId: page.id,
        sortOrder,
        buttonColor: input.buttonColor,
        textFont: input.textFont,
        textColor: input.textColor,
        iconPath: input.iconPath ?? null,
        iconSource: input.iconSource,
        urlToOpen: input.urlToOpen ?? null,
        pageToOpen: input.pageToOpen,
        translations: {
          create: translationEntries.length
            ? translationEntries
            : [{ languageCode: normalizeLang(languageCode), shortText: '', extendedText: '' }],
        },
      },
    });
  }

  return getMubPage(query, languageCode);
}

export async function deleteMubButton(
  query: MubPageQuery,
  buttonId: string,
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  await prisma.mubButtonItem.deleteMany({
    where: { id: buttonId, pageId: page.id },
  });
  return getMubPage(query, languageCode);
}

export async function reorderMubButtons(
  query: MubPageQuery,
  orderedIds: string[],
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.mubButtonItem.updateMany({
        where: { id, pageId: page.id },
        data: { sortOrder: index },
      }),
    ),
  );
  return getMubPage(query, languageCode);
}

export async function resetMubPage(
  query: MubPageQuery,
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  await prisma.mubButtonItem.deleteMany({ where: { pageId: page.id } });
  return getMubPage(query, languageCode);
}

export async function removeImportedMubButtons(
  query: MubPageQuery,
  languageCode = 'en',
): Promise<MubPageDto> {
  const page = await ensurePageSettings(query);
  await prisma.mubButtonItem.deleteMany({
    where: { pageId: page.id, isImported: true },
  });
  return getMubPage(query, languageCode);
}

async function copyStaffButtonsToPage(
  staffPageId: string,
  targetPageId: string,
  languageCode: string,
): Promise<number> {
  const staffButtons = await prisma.mubButtonItem.findMany({
    where: { pageId: staffPageId },
    include: { translations: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (!staffButtons.length) return 0;

  const maxOrder = await prisma.mubButtonItem.aggregate({
    where: { pageId: targetPageId },
    _max: { sortOrder: true },
  });
  let sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const lang = normalizeLang(languageCode);
  let imported = 0;

  for (const btn of staffButtons) {
    // Client answer #3: import ONLY the translation matching the current user's language.
    const tr = btn.translations.find((t) => normalizeLang(t.languageCode) === lang);
    if (!tr) continue;

    await prisma.mubButtonItem.create({
      data: {
        pageId: targetPageId,
        sortOrder: sortOrder++,
        buttonColor: btn.buttonColor,
        textFont: btn.textFont,
        textColor: btn.textColor,
        iconPath: btn.iconPath,
        iconSource: btn.iconSource,
        urlToOpen: btn.urlToOpen,
        pageToOpen: btn.pageToOpen,
        isImported: true,
        translations: {
          create: [
            {
              languageCode: lang,
              shortText: tr.shortText,
              extendedText: tr.extendedText,
            },
          ],
        },
      },
    });
    imported += 1;
  }

  return imported;
}

export async function importStaffMubTemplate(
  targetQuery: MubPageQuery,
  roleTemplate: MubRoleTemplate,
  languageCode = 'en',
): Promise<{ page: MubPageDto; importedCount: number }> {
  const staffPage = await ensurePageSettings({
    scope: 'STAFF',
    ownerId: null,
    roleTemplate,
    category: targetQuery.category,
  });
  const targetPage = await ensurePageSettings(targetQuery);
  const importedCount = await copyStaffButtonsToPage(staffPage.id, targetPage.id, languageCode);
  const page = await getMubPage(targetQuery, languageCode);
  return { page, importedCount };
}

export function parseMubCategory(raw: string | null): MubCategory {
  const value = (raw ?? 'CLUB_MANAGEMENT').toUpperCase();
  if (value === 'WORKOUT' || value === 'WORKOUT_SECTION') return 'WORKOUT';
  if (value === 'SOCIAL' || value === 'SOCIAL_SECTION') return 'SOCIAL';
  return 'CLUB_MANAGEMENT';
}

export function parseMubScope(raw: string | null): MubScope {
  const value = (raw ?? 'USER').toUpperCase();
  if (value === 'STAFF') return 'STAFF';
  if (value === 'CLUB') return 'CLUB';
  return 'USER';
}

export function parseRoleTemplate(raw: string | null): MubRoleTemplate | null {
  if (!raw) return null;
  const value = raw.toUpperCase();
  if (value === 'SINGLE_USER' || value === 'ATHLETE' || value === '5') return 'SINGLE_USER';
  if (value === 'TEAM' || value === '7') return 'TEAM';
  if (value === 'COACH' || value === '6') return 'COACH';
  if (value === 'CLUB' || value === '8') return 'CLUB';
  if (value === 'GROUP' || value === '9') return 'GROUP';
  return null;
}

export async function userDefaultMubQuery(
  userId: string,
  userType: string,
  category: MubCategory,
  clubId?: string | null,
): Promise<MubPageQuery> {
  if (clubId) {
    return { scope: 'CLUB', ownerId: clubId, roleTemplate: null, category };
  }
  void parseRoleTemplate(userType === 'CLUB' ? 'CLUB' : userType.replace('_MANAGER', '').replace('_ADMIN', ''));
  return { scope: 'USER', ownerId: userId, roleTemplate: null, category };
}

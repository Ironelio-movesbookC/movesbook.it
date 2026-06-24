import { ClubOutcomeMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { SAMPLE_OUTCOME_TYPES } from '@/lib/outcomeSettingsSeed';
import { seedOutcomeCountriesIfEmpty } from '@/lib/outcomes/seedOutcomeCountries';
import type {
  AdminOutcomeItemDto,
  ClubOutcomeItemDto,
  ClubOutcomePreferences,
  OutcomeLanguageDto,
  ResolvedOutcomeMessage,
} from './types';

export { SAMPLE_OUTCOME_TYPES };

const LEGACY_LANGUAGE_SEED = [
  { legacyLangId: 1, code: 'en', name: 'English', isDefault: true },
  { legacyLangId: 2, code: 'fr', name: 'French', isDefault: false },
  { legacyLangId: 3, code: 'de', name: 'Deutsch', isDefault: false },
  { legacyLangId: 4, code: 'it', name: 'Italiano', isDefault: false },
  { legacyLangId: 5, code: 'es', name: 'Spanish', isDefault: false },
  { legacyLangId: 6, code: 'pt', name: 'Portuguese', isDefault: false },
  { legacyLangId: 7, code: 'ru', name: 'Russian', isDefault: false },
  { legacyLangId: 8, code: 'hi', name: 'Hindi', isDefault: false },
  { legacyLangId: 9, code: 'zh', name: 'Chinese', isDefault: false },
  { legacyLangId: 10, code: 'ar', name: 'Arabic', isDefault: false },
  { legacyLangId: 11, code: 'ja', name: 'Japanese', isDefault: false },
  { legacyLangId: 12, code: 'id', name: 'Indonesia', isDefault: false },
] as const;

function slugCode(description: string, fallback: string): string {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const PREFERRED_LANGUAGE_LEGACY: Record<string, number> = {
  en: 1,
  fr: 2,
  de: 3,
  it: 4,
  es: 5,
  pt: 6,
  ru: 7,
  hi: 8,
  zh: 9,
  ar: 10,
  ja: 11,
  id: 12,
};

function preferredLanguageCode(raw: string): string {
  const normalized = raw.toLowerCase();
  return normalized.length > 2 ? normalized.slice(0, 2) : normalized;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

export function audioPublicPath(langKey: string | number, filename: string): string {
  return `/outcome_messages/${langKey}/${filename}`;
}

export function clubAudioPublicPath(clubId: string, filename: string): string {
  return `/outcome_messages/club/${clubId}/${filename}`;
}

export class OutcomeService {
  async seedLanguagesIfEmpty(): Promise<void> {
    const count = await prisma.language.count();
    if (count === 0) {
      for (const lang of LEGACY_LANGUAGE_SEED) {
        await prisma.language.create({
          data: {
            code: lang.code,
            name: lang.name,
            isDefault: lang.isDefault,
            isActive: true,
            legacyLangId: lang.legacyLangId,
          },
        });
      }
      return;
    }

    await this.ensureLegacyLanguages();
  }

  /** Create or backfill languages from LEGACY_LANGUAGE_SEED (ids 1–12). */
  async ensureLegacyLanguages(): Promise<void> {
    for (const lang of LEGACY_LANGUAGE_SEED) {
      const existing = await prisma.language.findFirst({ where: { code: lang.code } });
      if (existing) {
        if (existing.legacyLangId == null) {
          await prisma.language.update({
            where: { id: existing.id },
            data: { legacyLangId: lang.legacyLangId, isActive: true },
          });
        }
        continue;
      }

      await prisma.language.create({
        data: {
          code: lang.code,
          name: lang.name,
          isDefault: lang.isDefault,
          isActive: true,
          legacyLangId: lang.legacyLangId,
        },
      });
    }
  }

  async seedOutcomeTypesIfEmpty(): Promise<void> {
    await this.seedLanguagesIfEmpty();
    const count = await prisma.outcomeType.count();
    if (count > 0) return;

    const english = await this.getEnglishLanguage();

    for (let i = 0; i < SAMPLE_OUTCOME_TYPES.length; i++) {
      const sample = SAMPLE_OUTCOME_TYPES[i];
      const type = await prisma.outcomeType.create({
        data: {
          code: slugCode(sample.description, `outcome_${i + 1}`),
          name: sample.description,
          description: sample.description,
          defaultCode: sample.defaultCode,
          sortOrder: i,
          legacyTypeId: i + 1,
        },
      });

      if (english) {
        await prisma.systemOutcome.create({
          data: {
            outcomeTypeId: type.id,
            languageId: english.id,
            code: sample.defaultCode,
            message: pickRandom(sample.primaryMessages),
          },
        });
      }
    }

    await this.ensureSystemOutcomesForAllLanguages();
  }

  /** Backfill missing system_outcomes rows for every active language. */
  async ensureSystemOutcomesForAllLanguages(): Promise<void> {
    await this.seedLanguagesIfEmpty();

    const types = await prisma.outcomeType.findMany({ where: { isActive: true } });
    const languages = await prisma.language.findMany({ where: { isActive: true } });
    if (types.length === 0 || languages.length === 0) return;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const sample = SAMPLE_OUTCOME_TYPES[i] ?? SAMPLE_OUTCOME_TYPES[0];
      const messages = sample?.primaryMessages ?? [''];

      for (const language of languages) {
        const existing = await prisma.systemOutcome.findUnique({
          where: {
            outcomeTypeId_languageId: {
              outcomeTypeId: type.id,
              languageId: language.id,
            },
          },
        });
        if (existing) continue;

        await prisma.systemOutcome.create({
          data: {
            outcomeTypeId: type.id,
            languageId: language.id,
            code: type.defaultCode,
            message: pickRandom(messages),
          },
        });
      }
    }
  }

  async listLanguages(): Promise<OutcomeLanguageDto[]> {
    const langs = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: [{ legacyLangId: 'asc' }, { name: 'asc' }],
    });
    return langs.map((l) => ({
      id: l.id,
      legacyLangId: l.legacyLangId,
      code: l.code,
      name: l.name,
    }));
  }

  /** Admin API: lang=0 is default/type tab; lang>0 uses legacy language id. */
  async fetchAdminItems(lang: number): Promise<AdminOutcomeItemDto[]> {
    await this.seedOutcomeTypesIfEmpty();
    await this.ensureSystemOutcomesForAllLanguages();

    const types = await prisma.outcomeType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    let systemByType = new Map<string, { id: string; code: string; message: string; audioFile: string | null }>();
    if (lang !== 0) {
      const language = await prisma.language.findFirst({ where: { legacyLangId: lang } });
      if (language) {
        const systems = await prisma.systemOutcome.findMany({
          where: { languageId: language.id },
        });
        systemByType = new Map(systems.map((s) => [s.outcomeTypeId, s]));
      }
    }

    return types.map((type, index) => {
      const system = systemByType.get(type.id) ?? null;
      const code = lang === 0 ? type.defaultCode : system?.code || type.defaultCode;
      const message = system?.message ?? '';
      const audioFile = system?.audioFile ?? null;

      return {
        typeId: type.id,
        settingId: system?.id ?? null,
        descriptionId: null,
        letter: String.fromCharCode(65 + (index % 26)),
        description: type.description ?? type.name,
        code,
        defaultCode: type.defaultCode,
        message,
        audioFile,
        audioUrl: audioFile && lang > 0 ? audioPublicPath(lang, audioFile) : null,
      };
    });
  }

  async saveAdminTypeDescription(typeId: string, description: string): Promise<void> {
    await prisma.outcomeType.update({
      where: { id: typeId },
      data: { description, name: description },
    });
  }

  async saveAdminTypeDefaultCode(typeId: string, defaultCode: string): Promise<void> {
    await prisma.outcomeType.update({
      where: { id: typeId },
      data: { defaultCode },
    });
  }

  async saveAdminSystemOutcome(params: {
    typeId: string;
    settingId: string | null;
    lang: number;
    code: string;
    message: string;
  }): Promise<string> {
    if (params.lang === 0) {
      await this.saveAdminTypeDefaultCode(params.typeId, params.code);
      return params.settingId ?? '';
    }

    const language = await prisma.language.findFirst({
      where: { legacyLangId: params.lang },
    });
    if (!language) throw new Error('Language not found');

    const resolvedCode =
      params.code ||
      (await prisma.outcomeType.findUnique({ where: { id: params.typeId }, select: { defaultCode: true } }))
        ?.defaultCode ||
      '';

    if (params.settingId) {
      await prisma.systemOutcome.update({
        where: { id: params.settingId },
        data: {
          code: resolvedCode,
          message: params.message,
        },
      });
      return params.settingId;
    }

    const created = await prisma.systemOutcome.create({
      data: {
        outcomeTypeId: params.typeId,
        languageId: language.id,
        code: resolvedCode,
        message: params.message,
      },
    });
    return created.id;
  }

  async setSystemOutcomeAudio(settingId: string, audioFile: string | null): Promise<void> {
    await prisma.systemOutcome.update({
      where: { id: settingId },
      data: { audioFile },
    });
  }

  async getClubPreferences(clubId: string): Promise<ClubOutcomePreferences> {
    const row = await prisma.clubOutcomeSetting.findUnique({ where: { clubId } });
    return {
      clubId,
      mode: row?.mode ?? ClubOutcomeMode.COUNTRY_STANDARD,
    };
  }

  async setClubPreferences(clubId: string, mode: ClubOutcomeMode): Promise<ClubOutcomePreferences> {
    await prisma.clubOutcomeSetting.upsert({
      where: { clubId },
      update: { mode },
      create: { clubId, mode },
    });
    return { clubId, mode };
  }

  async getEnglishLanguage() {
    return (
      (await prisma.language.findFirst({ where: { code: 'en', isActive: true } })) ??
      (await prisma.language.findFirst({ where: { isDefault: true, isActive: true } })) ??
      (await prisma.language.findFirst({ where: { legacyLangId: 1, isActive: true } }))
    );
  }

  async resolveLanguageIdForClubAdmin(userIds: string[]): Promise<string | null> {
    const legacyLangId = await this.getLegacyCountryLangIdForUsers(userIds);
    if (legacyLangId != null) {
      const lang = await prisma.language.findFirst({ where: { legacyLangId } });
      if (lang) return lang.id;
    }
    const english = await this.getEnglishLanguage();
    return english?.id ?? null;
  }

  async normalizeLegacyOutcomeLangId(legacyLangId: number): Promise<number> {
    const langs = await this.listLanguages();
    const validIds = langs
      .filter((l) => l.legacyLangId != null)
      .map((l) => l.legacyLangId as number);
    if (validIds.includes(legacyLangId)) return legacyLangId;
    return validIds.includes(1) ? 1 : validIds[0] ?? 1;
  }

  async getLegacyLangIdFromPreferredLanguage(userId: string): Promise<number | null> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    });
    const raw = text(settings?.language).toLowerCase();
    if (!raw) return null;

    const code = preferredLanguageCode(raw);
    const lang = await prisma.language.findFirst({
      where: { code, isActive: true },
      select: { legacyLangId: true },
    });
    const legacyLangId = lang?.legacyLangId ?? PREFERRED_LANGUAGE_LEGACY[code] ?? null;
    return legacyLangId != null && legacyLangId > 0 ? legacyLangId : null;
  }

  /** CakePHP: Club.user_id → users.country_id → countries.country_lang_id */
  async getLegacyCountryLangIdForClub(clubId: string): Promise<number> {
    await seedOutcomeCountriesIfEmpty();

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { adminId: true },
    });
    if (club) {
      const fromPreferred = await this.getLegacyLangIdFromPreferredLanguage(club.adminId);
      if (fromPreferred != null) {
        return this.normalizeLegacyOutcomeLangId(fromPreferred);
      }
    }

    const clubsTable = await findExistingTable(['clubs_new', 'clubs']);
    const usersTable = await findExistingTable(['users_new', 'users']);
    const countriesTable = await findExistingTable(['countries', 'country']);

    if (clubsTable && usersTable && countriesTable) {
      const clubColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        clubsTable
      );
      const clubColSet = new Set(clubColumns.map((c) => c.COLUMN_NAME));
      const adminCol = clubColSet.has('adminId')
        ? 'adminId'
        : clubColSet.has('user_id')
          ? 'user_id'
          : null;

      if (adminCol) {
        const userColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          usersTable
        );
        const userColSet = new Set(userColumns.map((c) => c.COLUMN_NAME));
        if (userColSet.has('country_id')) {
          const rows = await prisma.$queryRawUnsafe<{ country_lang_id: number | string | null }[]>(
            `SELECT c.country_lang_id
             FROM \`${clubsTable}\` cl
             INNER JOIN \`${usersTable}\` u ON u.id = cl.\`${adminCol}\`
             INNER JOIN \`${countriesTable}\` c ON c.id = u.country_id
             WHERE cl.id = ?
             LIMIT 1`,
            clubId
          );
          const lang = Number(rows[0]?.country_lang_id ?? 0);
          if (Number.isFinite(lang) && lang > 0) {
            return this.normalizeLegacyOutcomeLangId(lang);
          }
        }
      }
    }

    if (club) {
      const fromAdmin = await this.getLegacyCountryLangIdForUsers([club.adminId]);
      if (fromAdmin != null) return this.normalizeLegacyOutcomeLangId(fromAdmin);
    }

    return 1;
  }

  async getLegacyCountryLangIdForUsers(userIds: string[]): Promise<number | null> {
    if (userIds.length === 0) return null;

    await seedOutcomeCountriesIfEmpty();

    for (const userId of userIds) {
      const fromPreferred = await this.getLegacyLangIdFromPreferredLanguage(userId);
      if (fromPreferred != null) return fromPreferred;
    }

    const usersTable = await findExistingTable(['users_new', 'users']);
    const countriesTable = await findExistingTable(['countries', 'country']);
    if (usersTable && countriesTable) {
      const userColumns = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        usersTable
      );
      const columnSet = new Set(userColumns.map((c) => c.COLUMN_NAME));
      if (columnSet.has('country_id')) {
        for (const userId of userIds) {
          const rows = await prisma.$queryRawUnsafe<{ country_lang_id: number | string | null }[]>(
            `SELECT c.country_lang_id
             FROM \`${usersTable}\` u
             INNER JOIN \`${countriesTable}\` c ON c.id = u.country_id
             WHERE u.id = ?
             LIMIT 1`,
            userId
          );
          const lang = Number(rows[0]?.country_lang_id ?? 0);
          if (Number.isFinite(lang) && lang > 0) return lang;
        }
      }
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, country: true },
    });
    const userOrder = new Map(userIds.map((id, index) => [id, index]));
    const sortedUsers = [...users].sort(
      (a, b) => (userOrder.get(a.id) ?? 0) - (userOrder.get(b.id) ?? 0)
    );
    for (const user of sortedUsers) {
      const countryName = text(user.country);
      if (!countryName) continue;

      const outcomeCountry = await prisma.outcomeCountry.findFirst({
        where: {
          OR: [
            { name: { equals: countryName } },
            { code: { equals: countryName } },
            { code: { equals: countryName.toUpperCase() } },
          ],
        },
        include: { defaultLanguage: { select: { legacyLangId: true } } },
      });
      if (outcomeCountry?.defaultLanguage?.legacyLangId != null) {
        return outcomeCountry.defaultLanguage.legacyLangId;
      }
    }

    return null;
  }

  async fetchClubCustomItems(clubId: string): Promise<ClubOutcomeItemDto[]> {
    await this.seedOutcomeTypesIfEmpty();

    const types = await prisma.outcomeType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const customs = await prisma.clubCustomOutcome.findMany({
      where: { clubId },
    });
    const customByType = new Map(customs.map((c) => [c.outcomeTypeId, c]));

    return types.map((type) => {
      const custom = customByType.get(type.id);
      const code = custom?.code || type.defaultCode;
      const audioFile = custom?.audioFile ?? null;
      return {
        typeId: type.id,
        settingId: custom?.id ?? null,
        description: type.description ?? type.name,
        code,
        defaultCode: type.defaultCode,
        message: custom?.message ?? '',
        audioFile,
        audioUrl: audioFile ? clubAudioPublicPath(clubId, audioFile) : null,
      };
    });
  }

  async fetchClubPrimaryItems(clubId: string): Promise<ClubOutcomeItemDto[]> {
    await this.seedOutcomeTypesIfEmpty();
    const langKey = await this.getLegacyCountryLangIdForClub(clubId);
    const language =
      (await prisma.language.findFirst({ where: { legacyLangId: langKey } })) ??
      (await this.getEnglishLanguage());
    const languageId = language?.id ?? null;

    if (!languageId) {
      return this.fetchClubCustomItems(clubId).then((items) =>
        items.map((i) => ({ ...i, message: '', settingId: null, audioFile: null, audioUrl: null }))
      );
    }

    const types = await prisma.outcomeType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        systemOutcomes: { where: { languageId }, take: 1 },
      },
    });

    return types.map((type) => {
      const system = type.systemOutcomes[0];
      const code = system?.code || type.defaultCode;
      const audioFile = system?.audioFile ?? null;
      return {
        typeId: type.id,
        settingId: system?.id ?? null,
        description: type.description ?? type.name,
        code,
        defaultCode: type.defaultCode,
        message: system?.message ?? '',
        audioFile,
        audioUrl: audioFile ? audioPublicPath(langKey, audioFile) : null,
      };
    });
  }

  async saveClubCustomOutcome(params: {
    clubId: string;
    typeId: string;
    settingId: string | null;
    code: string;
    message: string;
  }): Promise<string> {
    const row = await prisma.clubCustomOutcome.upsert({
      where: {
        clubId_outcomeTypeId: {
          clubId: params.clubId,
          outcomeTypeId: params.typeId,
        },
      },
      create: {
        clubId: params.clubId,
        outcomeTypeId: params.typeId,
        code: params.code,
        message: params.message,
      },
      update: {
        code: params.code,
        message: params.message,
      },
    });
    return row.id;
  }

  async setClubCustomAudio(settingId: string, audioFile: string | null): Promise<void> {
    await prisma.clubCustomOutcome.update({
      where: { id: settingId },
      data: { audioFile },
    });
  }

  async getClubCustomAudioFile(settingId: string): Promise<string | null> {
    const row = await prisma.clubCustomOutcome.findUnique({
      where: { id: settingId },
      select: { audioFile: true },
    });
    return row?.audioFile ?? null;
  }

  async resolveClubCustomSettingId(clubId: string, typeId: string): Promise<string | null> {
    const row = await prisma.clubCustomOutcome.findUnique({
      where: {
        clubId_outcomeTypeId: { clubId, outcomeTypeId: typeId },
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async getClubCustomOutcomeForClub(
    settingId: string,
    clubId: string
  ): Promise<{ id: string; audioFile: string | null } | null> {
    const row = await prisma.clubCustomOutcome.findFirst({
      where: { id: settingId, clubId },
      select: { id: true, audioFile: true },
    });
    return row;
  }

  async findOutcomeType(params: { typeId?: string; code?: string }) {
    if (params.typeId) {
      return prisma.outcomeType.findFirst({ where: { id: params.typeId, isActive: true } });
    }
    if (params.code) {
      return prisma.outcomeType.findFirst({
        where: {
          isActive: true,
          OR: [{ code: params.code }, { defaultCode: params.code }],
        },
      });
    }
    return null;
  }

  async resolveOutcomeMessage(params: {
    clubId: string;
    clubAdminUserIds: string[];
    memberUserIds?: string[];
    outcomeTypeId?: string;
    outcomeTypeCode?: string;
    modeOverride?: ClubOutcomeMode;
  }): Promise<ResolvedOutcomeMessage | null> {
    await this.seedOutcomeTypesIfEmpty();

    const type = await this.findOutcomeType({
      typeId: params.outcomeTypeId,
      code: params.outcomeTypeCode,
    });
    if (!type) return null;

    const prefs = await this.getClubPreferences(params.clubId);
    const mode = params.modeOverride ?? prefs.mode;

    if (mode === ClubOutcomeMode.CUSTOM) {
      const custom = await prisma.clubCustomOutcome.findUnique({
        where: {
          clubId_outcomeTypeId: { clubId: params.clubId, outcomeTypeId: type.id },
        },
      });
      const code = custom?.code || type.defaultCode;
      const audioFile = custom?.audioFile ?? null;
      return {
        outcomeTypeId: type.id,
        code,
        message: custom?.message ?? '',
        audioFile,
        audioUrl: audioFile ? clubAudioPublicPath(params.clubId, audioFile) : null,
        languageId: null,
        legacyLanguageId: null,
        mode,
        source: 'custom',
      };
    }

    let languageId: string | null = null;
    let legacyLanguageId: number | null = null;

    if (mode === ClubOutcomeMode.EN) {
      const english = await this.getEnglishLanguage();
      languageId = english?.id ?? null;
      legacyLanguageId = english?.legacyLangId ?? 1;
    } else {
      // COUNTRY_STANDARD — prefer member country when available
      const memberLegacy =
        params.memberUserIds && params.memberUserIds.length > 0
          ? await this.getLegacyCountryLangIdForUsers(params.memberUserIds)
          : null;
      legacyLanguageId =
        memberLegacy ??
        (params.clubId
          ? await this.getLegacyCountryLangIdForClub(params.clubId)
          : (await this.getLegacyCountryLangIdForUsers(params.clubAdminUserIds)) ?? 1);
      const lang = await prisma.language.findFirst({ where: { legacyLangId: legacyLanguageId } });
      languageId = lang?.id ?? (await this.getEnglishLanguage())?.id ?? null;
    }

    if (!languageId) return null;

    const system = await prisma.systemOutcome.findUnique({
      where: {
        outcomeTypeId_languageId: { outcomeTypeId: type.id, languageId },
      },
    });

    const code = system?.code || type.defaultCode;
    const audioFile = system?.audioFile ?? null;
    const langKey = legacyLanguageId ?? 1;

    return {
      outcomeTypeId: type.id,
      code,
      message: system?.message ?? '',
      audioFile,
      audioUrl: audioFile ? audioPublicPath(langKey, audioFile) : null,
      languageId,
      legacyLanguageId,
      mode,
      source: 'system',
    };
  }
}

export const outcomeService = new OutcomeService();

/** Public resolver used by card reader / access control. */
export async function resolveOutcomeMessage(
  clubId: string,
  outcomeTypeId: string,
  options?: {
    clubAdminUserIds?: string[];
    memberUserIds?: string[];
    outcomeTypeCode?: string;
    modeOverride?: ClubOutcomeMode;
  }
): Promise<ResolvedOutcomeMessage | null> {
  return outcomeService.resolveOutcomeMessage({
    clubId,
    outcomeTypeId,
    outcomeTypeCode: options?.outcomeTypeCode,
    clubAdminUserIds: options?.clubAdminUserIds ?? [],
    memberUserIds: options?.memberUserIds,
    modeOverride: options?.modeOverride,
  });
}

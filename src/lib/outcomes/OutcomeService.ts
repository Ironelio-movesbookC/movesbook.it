import { ClubOutcomeMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { SAMPLE_OUTCOME_TYPES } from '@/lib/outcomeSettingsSeed';
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
    const language = await prisma.language.findFirst({
      where: { legacyLangId: params.lang },
    });
    if (!language) throw new Error('Language not found');

    if (params.lang === 0) {
      await this.saveAdminTypeDefaultCode(params.typeId, params.code);
      return params.settingId ?? '';
    }

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

  async getLegacyCountryLangIdForUsers(userIds: string[]): Promise<number | null> {
    if (userIds.length === 0) return null;
    const usersTable = await findExistingTable(['users_new', 'users']);
    const countriesTable = await findExistingTable(['countries', 'country']);
    if (!usersTable || !countriesTable) return null;

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await prisma.$queryRawUnsafe<{ country_lang_id: number | string | null }[]>(
      `SELECT c.country_lang_id
       FROM \`${usersTable}\` u
       INNER JOIN \`${countriesTable}\` c ON c.id = u.country_id
       WHERE u.id IN (${placeholders})
       LIMIT 1`,
      ...userIds
    );
    const lang = Number(rows[0]?.country_lang_id ?? 0);
    return Number.isFinite(lang) && lang > 0 ? lang : null;
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

  async fetchClubPrimaryItems(clubId: string, adminUserIds: string[]): Promise<ClubOutcomeItemDto[]> {
    await this.seedOutcomeTypesIfEmpty();
    const languageId = await this.resolveLanguageIdForClubAdmin(adminUserIds);
    if (!languageId) return this.fetchClubCustomItems(clubId).then((items) =>
      items.map((i) => ({ ...i, message: '', settingId: null, audioFile: null, audioUrl: null }))
    );

    const language = await prisma.language.findUnique({ where: { id: languageId } });
    const langKey = language?.legacyLangId ?? 1;

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
        memberLegacy ?? (await this.getLegacyCountryLangIdForUsers(params.clubAdminUserIds)) ?? 1;
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

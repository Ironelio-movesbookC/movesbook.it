import { ClubOutcomeMode } from '@prisma/client';

export type OutcomeLanguageDto = {
  id: string;
  legacyLangId: number | null;
  code: string;
  name: string;
};

export type AdminOutcomeItemDto = {
  typeId: string;
  settingId: string | null;
  descriptionId: string | null;
  letter: string;
  description: string;
  code: string;
  defaultCode: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
};

export type ClubOutcomeItemDto = {
  typeId: string;
  settingId: string | null;
  description: string;
  code: string;
  defaultCode: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
};

export type ResolvedOutcomeMessage = {
  outcomeTypeId: string;
  code: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
  languageId: string | null;
  legacyLanguageId: number | null;
  mode: ClubOutcomeMode;
  source: 'system' | 'custom';
};

export type ClubOutcomePreferences = {
  clubId: string;
  mode: ClubOutcomeMode;
};

/** Admin UI tabs — only languages with a legacy id (never coalesce null to 0). */
export type AdminLanguageTab = {
  id: number;
  name: string;
};

export function mapLegacyLanguageTabs(languages: OutcomeLanguageDto[]): AdminLanguageTab[] {
  return languages
    .filter((l): l is OutcomeLanguageDto & { legacyLangId: number } => l.legacyLangId != null)
    .map((l) => ({ id: l.legacyLangId, name: l.name }));
}

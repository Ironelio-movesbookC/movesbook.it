import { prisma } from '@/lib/prisma';
import { outcomeService } from '@/lib/outcomes';
import { mapLegacyLanguageTabs } from '@/lib/outcomes/types';

export { audioPublicPath } from '@/lib/outcomes';

export async function fetchLanguages() {
  const langs = await outcomeService.listLanguages();
  return mapLegacyLanguageTabs(langs);
}

export async function seedTypesIfEmpty(): Promise<void> {
  await outcomeService.seedOutcomeTypesIfEmpty();
}

export async function fetchAccessAudioItems(lang: number) {
  return outcomeService.fetchAdminItems(lang);
}

export { text, findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';

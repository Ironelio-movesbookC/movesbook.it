import { prisma } from '@/lib/prisma';
import { outcomeService } from '@/lib/outcomes';

export { audioPublicPath } from '@/lib/outcomes';

export async function fetchLanguages() {
  const langs = await outcomeService.listLanguages();
  return langs.map((l) => ({ id: l.legacyLangId ?? 0, name: l.name }));
}

export async function seedTypesIfEmpty(): Promise<void> {
  await outcomeService.seedOutcomeTypesIfEmpty();
}

export async function fetchAccessAudioItems(lang: number) {
  return outcomeService.fetchAdminItems(lang);
}

export { text, findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';

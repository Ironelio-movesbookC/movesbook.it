import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
];

async function main() {
  const langCount = await prisma.language.count();
  if (langCount === 0) {
    for (const lang of LEGACY_LANGUAGE_SEED) {
      await prisma.language.create({ data: { ...lang, isActive: true } });
    }
    console.log('Seeded languages_new with legacy lang ids 1–12.');
  }

  const { outcomeService } = await import('../src/lib/outcomes');
  await outcomeService.ensureLegacyLanguages();
  console.log('Ensured legacy languages (ids 1–12), including Japanese and Indonesia.');

  await outcomeService.seedOutcomeTypesIfEmpty();
  console.log('Seeded outcome types and English system messages.');

  const { seedOutcomeCountriesIfEmpty } = await import('../src/lib/outcomes/seedOutcomeCountries');
  await seedOutcomeCountriesIfEmpty();
  console.log('Seeded outcome_countries from legacy countries when available.');

  await outcomeService.ensureSystemOutcomesForAllLanguages();
  console.log('Ensured system outcomes for all active languages.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

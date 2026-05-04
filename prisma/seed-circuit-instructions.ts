/**
 * Seed script to add Circuit Time Instructions translation
 * This adds a long text that can be managed via Languages-Long texts section
 * 
 * Run with: npx ts-node prisma/seed-circuit-instructions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed: Circuit Time Instructions...');
  
  const key = 'circuit_time_instructions';
  const category = 'system'; // System long texts
  
  // Define translations for different languages
  const translations = {
    en: 'If the series are set in minutes therefore the athlete will repeat all the stations continuosly for the time set. And once finished the time, after the Pause among the series, he will start again with the next serie.',
    es: 'Si las series se establecen en minutos, el atleta repetirá todas las estaciones continuamente durante el tiempo establecido. Y una vez finalizado el tiempo, después de la Pausa entre las series, comenzará nuevamente con la siguiente serie.',
    it: 'Se le serie sono impostate in minuti, l\'atleta ripeterà tutte le stazioni continuamente per il tempo impostato. E una volta finito il tempo, dopo la Pausa tra le serie, ricomincerà con la serie successiva.',
    fr: 'Si les séries sont définies en minutes, l\'athlète répétera toutes les stations en continu pendant le temps défini. Et une fois le temps écoulé, après la Pause entre les séries, il recommencera avec la série suivante.',
    de: 'Wenn die Serien in Minuten festgelegt sind, wird der Athlet alle Stationen kontinuierlich für die festgelegte Zeit wiederholen. Und sobald die Zeit abgelaufen ist, beginnt er nach der Pause zwischen den Serien wieder mit der nächsten Serie.',
    pt: 'Se as séries forem definidas em minutos, o atleta repetirá todas as estações continuamente pelo tempo definido. E uma vez terminado o tempo, após a Pausa entre as séries, ele começará novamente com a próxima série.',
  };
  
  // Add or update translation for each language
  for (const [language, value] of Object.entries(translations)) {
    try {
      const result = await prisma.translation.upsert({
        where: {
          key_language: {
            key,
            language,
          },
        },
        update: {
          value,
          category,
          isDeleted: false,
        },
        create: {
          key,
          language,
          value,
          category,
          isDeleted: false,
        },
      });
      
      console.log(`✅ Added/Updated ${language} translation for ${key}`);
    } catch (error) {
      console.error(`❌ Error adding ${language} translation:`, error);
    }
  }
  
  console.log('✅ Circuit Time Instructions seed completed!');
  console.log('📝 You can now manage this text in Settings > Languages > Language-Long texts');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


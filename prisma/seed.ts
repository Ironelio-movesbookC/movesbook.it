import { PrismaClient, UserType, SportType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { serializeMultiLanguageContent } from '../src/lib/news/contentParser';
import { INFO_REPS_DEFAULT_EN, INFO_REPS_TRANSLATION_KEY } from '../src/constants/infoRepsLongText';
import { AUTO_PROCESS_INFO_DEFAULT_EN, AUTO_PROCESS_INFO_TRANSLATION_KEY } from '../src/constants/autoProcessInfoLongText';
import {
  IDENTIFICATION_DEVICES_INFO_DEFAULT_EN,
  IDENTIFICATION_DEVICES_INFO_TRANSLATION_KEY
} from '../src/constants/identificationDevicesInfoLongText';
import { ensurePromocodeMetaTables } from '../src/lib/promocodes/ensureMetaTables';

const prisma = new PrismaClient() as any;

const sportIdToSportType: Record<string, SportType> = {
  '1': SportType.TRACK_FIELD,
  '4': SportType.BASKETBALL,
  '9': SportType.BIKE,
  '11': SportType.MARTIAL_ARTS,
  '14': SportType.RUN,
  '15': SportType.SOCCER,
  '17': SportType.TENNIS,
  '18': SportType.TRIATHLON,
  '19': SportType.VOLLEYBALL,
  '29': SportType.BOXING,
};

async function seedTranslations() {
  console.log('🌱 Seeding translations...');
  
  const shortTexts = [
    // Workout Goals
    {
      key: 'goal_strength',
      category: 'system',
      values: {
        en: 'Strength',
        it: 'Forza',
        es: 'Fuerza',
        fr: 'Force',
        de: 'Kraft',
        pt: 'Força',
      }
    },
    {
      key: 'goal_explosive_strength',
      category: 'system',
      values: {
        en: 'Explosive Strength',
        it: 'Forza Esplosiva',
        es: 'Fuerza Explosiva',
        fr: 'Force Explosive',
        de: 'Explosive Kraft',
        pt: 'Força Explosiva',
      }
    },
    {
      key: 'goal_speed_strength',
      category: 'system',
      values: {
        en: 'Speed Strength',
        it: 'Forza Veloce',
        es: 'Fuerza de Velocidad',
        fr: 'Force de Vitesse',
        de: 'Schnellkraft',
        pt: 'Força de Velocidade',
      }
    },
    {
      key: 'goal_endurance_strength',
      category: 'system',
      values: {
        en: 'Endurance Strength',
        it: 'Forza Resistente',
        es: 'Fuerza de Resistencia',
        fr: 'Force d\'Endurance',
        de: 'Kraftausdauer',
        pt: 'Força de Resistência',
      }
    },
    {
      key: 'goal_aerobic_power',
      category: 'system',
      values: {
        en: 'Aerobic Power',
        it: 'Potenza Aerobica',
        es: 'Potencia Aeróbica',
        fr: 'Puissance Aérobie',
        de: 'Aerobe Leistung',
        pt: 'Potência Aeróbica',
      }
    },
    {
      key: 'goal_aerobic_capacity',
      category: 'system',
      values: {
        en: 'Aerobic Capacity',
        it: 'Capacità Aerobica',
        es: 'Capacidad Aeróbica',
        fr: 'Capacité Aérobie',
        de: 'Aerobe Kapazität',
        pt: 'Capacidade Aeróbica',
      }
    },
    {
      key: 'goal_alactic_power',
      category: 'system',
      values: {
        en: 'Alactic Power',
        it: 'Potenza Alattacida',
        es: 'Potencia Aláctica',
        fr: 'Puissance Alactique',
        de: 'Alaktische Leistung',
        pt: 'Potência Alática',
      }
    },
    {
      key: 'goal_alactic_capacity',
      category: 'system',
      values: {
        en: 'Alactic Capacity',
        it: 'Capacità Alattacida',
        es: 'Capacidad Aláctica',
        fr: 'Capacité Alactique',
        de: 'Alaktische Kapazität',
        pt: 'Capacidade Alática',
      }
    },
    {
      key: 'goal_lactic_capacity',
      category: 'system',
      values: {
        en: 'Lactic Capacity',
        it: 'Capacità Lattacida',
        es: 'Capacidad Láctica',
        fr: 'Capacité Lactique',
        de: 'Laktische Kapazität',
        pt: 'Capacidade Lática',
      }
    },
    {
      key: 'goal_speed_endurance',
      category: 'system',
      values: {
        en: 'Speed Endurance',
        it: 'Resistenza alla Velocità',
        es: 'Resistencia de Velocidad',
        fr: 'Endurance de Vitesse',
        de: 'Schnelligkeitsausdauer',
        pt: 'Resistência de Velocidade',
      }
    },
    {
      key: 'goal_speed',
      category: 'system',
      values: {
        en: 'Speed',
        it: 'Velocità',
        es: 'Velocidad',
        fr: 'Vitesse',
        de: 'Geschwindigkeit',
        pt: 'Velocidade',
      }
    },
    {
      key: 'goal_acceleration',
      category: 'system',
      values: {
        en: 'Acceleration',
        it: 'Accelerazione',
        es: 'Aceleración',
        fr: 'Accélération',
        de: 'Beschleunigung',
        pt: 'Aceleração',
      }
    },
    {
      key: 'goal_elasticity',
      category: 'system',
      values: {
        en: 'Elasticity',
        it: 'Elasticità',
        es: 'Elasticidad',
        fr: 'Élasticité',
        de: 'Elastizität',
        pt: 'Elasticidade',
      }
    },
    {
      key: 'goal_flexibility',
      category: 'system',
      values: {
        en: 'Flexibility',
        it: 'Flessibilità',
        es: 'Flexibilidad',
        fr: 'Flexibilité',
        de: 'Flexibilität',
        pt: 'Flexibilidade',
      }
    },
    {
      key: 'goal_muscle_mass',
      category: 'system',
      values: {
        en: 'Muscle Mass',
        it: 'Massa Muscolare',
        es: 'Masa Muscular',
        fr: 'Masse Musculaire',
        de: 'Muskelmasse',
        pt: 'Massa Muscular',
      }
    },
    {
      key: 'goal_muscle_definition',
      category: 'system',
      values: {
        en: 'Muscle Definition',
        it: 'Definizione Muscolare',
        es: 'Definición Muscular',
        fr: 'Définition Musculaire',
        de: 'Muskeldefinition',
        pt: 'Definição Muscular',
      }
    },
    {
      key: 'goal_muscle_density',
      category: 'system',
      values: {
        en: 'Muscle Density',
        it: 'Densità Muscolare',
        es: 'Densidad Muscular',
        fr: 'Densité Musculaire',
        de: 'Muskeldichte',
        pt: 'Densidade Muscular',
      }
    },
    {
      key: 'goal_motor_coordination',
      category: 'system',
      values: {
        en: 'Motor Coordination',
        it: 'Coordinazione Motoria',
        es: 'Coordinación Motora',
        fr: 'Coordination Motrice',
        de: 'Motorische Koordination',
        pt: 'Coordenação Motora',
      }
    },
    {
      key: 'goal_sport_related',
      category: 'system',
      values: {
        en: 'Goal related to the current sport',
        it: 'Obiettivo relativo allo sport attuale',
        es: 'Objetivo relacionado con el deporte actual',
        fr: 'Objectif lié au sport actuel',
        de: 'Ziel im Zusammenhang mit der aktuellen Sportart',
        pt: 'Meta relacionada ao esporte atual',
      }
    },
    // Additional UI terms
    {
      key: 'main_workout_goal_label',
      category: 'system',
      values: {
        en: 'Main Workout Goal',
        it: 'Obiettivo Principale dell\'Allenamento',
        es: 'Objetivo Principal del Entrenamiento',
        fr: 'Objectif Principal de l\'Entraînement',
        de: 'Haupttrainingsziel',
        pt: 'Objetivo Principal do Treino',
      }
    },
  ];
  
  // Long text translations (>100 characters)
  const longTexts = [
    {
      key: 'welcome_message',
      category: 'system',
      values: {
        en: 'Welcome to Movesbook! We are excited to have you on board. Our platform helps athletes, coaches, and clubs manage their training programs effectively. Get started by creating your first workout plan and tracking your progress towards your fitness goals.',
        it: 'Benvenuto su Movesbook! Siamo entusiasti di averti a bordo. La nostra piattaforma aiuta atleti, allenatori e club a gestire i loro programmi di allenamento in modo efficace. Inizia creando il tuo primo piano di allenamento e monitorando i tuoi progressi verso i tuoi obiettivi di fitness.',
        es: 'Bienvenido a Movesbook! Estamos emocionados de tenerte a bordo. Nuestra plataforma ayuda a atletas, entrenadores y clubes a gestionar sus programas de entrenamiento de manera efectiva. Comienza creando tu primer plan de entrenamiento y siguiendo tu progreso hacia tus objetivos de fitness.',
      }
    },
    {
      key: 'privacy_policy_intro',
      category: 'system',
      values: {
        en: 'This privacy policy describes how Movesbook collects, uses, and protects your personal information. We are committed to ensuring that your privacy is protected. By using our services, you agree to the collection and use of information in accordance with this policy.',
        it: 'Questa informativa sulla privacy descrive come Movesbook raccoglie, utilizza e protegge le tue informazioni personali. Ci impegniamo a garantire che la tua privacy sia protetta. Utilizzando i nostri servizi, accetti la raccolta e l\'uso delle informazioni in conformità con questa politica.',
        es: 'Esta política de privacidad describe cómo Movesbook recopila, utiliza y protege su información personal. Estamos comprometidos a garantizar que su privacidad esté protegida. Al usar nuestros servicios, acepta la recopilación y el uso de información de acuerdo con esta política.',
      }
    },
    {
      key: 'terms_of_service',
      category: 'system',
      values: {
        en: 'By accessing and using Movesbook, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service. These terms of service may be updated from time to time without notice.',
        it: 'Accedendo e utilizzando Movesbook, accetti e accetti di essere vincolato dai termini e dalle disposizioni di questo accordo. Se non accetti di rispettare quanto sopra, non utilizzare questo servizio. Questi termini di servizio possono essere aggiornati di volta in volta senza preavviso.',
        es: 'Al acceder y usar Movesbook, acepta y acepta estar sujeto a los términos y disposiciones de este acuerdo. Si no acepta cumplir con lo anterior, no use este servicio. Estos términos de servicio pueden actualizarse de vez en cuando sin previo aviso.',
      }
    },
    {
      key: 'workout_instructions',
      category: 'management',
      values: {
        en: 'Create your workout plan by selecting exercises, setting repetitions, and defining rest periods. You can organize your training into moveframes and movelaps for precise tracking. Use the drag-and-drop interface to reorder exercises and customize your routine according to your fitness level and goals.',
        it: 'Crea il tuo piano di allenamento selezionando esercizi, impostando ripetizioni e definendo periodi di riposo. Puoi organizzare il tuo allenamento in moveframe e movelap per un monitoraggio preciso. Usa l\'interfaccia drag-and-drop per riordinare gli esercizi e personalizzare la tua routine secondo il tuo livello di fitness e obiettivi.',
        es: 'Crea tu plan de entrenamiento seleccionando ejercicios, estableciendo repeticiones y definiendo períodos de descanso. Puedes organizar tu entrenamiento en moveframes y movelaps para un seguimiento preciso. Usa la interfaz de arrastrar y soltar para reordenar ejercicios y personalizar tu rutina según tu nivel de condición física y objetivos.',
      }
    },
    {
      key: 'coach_guidelines',
      category: 'management',
      values: {
        en: 'As a coach, you can create customized workout plans for your athletes, monitor their progress, and provide feedback. Use the communication tools to stay connected with your team. You can assign workouts, track completion rates, and adjust training programs based on performance data and individual athlete needs.',
        it: 'Come allenatore, puoi creare piani di allenamento personalizzati per i tuoi atleti, monitorare i loro progressi e fornire feedback. Usa gli strumenti di comunicazione per rimanere connesso con il tuo team. Puoi assegnare allenamenti, monitorare i tassi di completamento e regolare i programmi di allenamento in base ai dati sulle prestazioni e alle esigenze individuali degli atleti.',
        es: 'Como entrenador, puedes crear planes de entrenamiento personalizados para tus atletas, monitorear su progreso y proporcionar retroalimentación. Usa las herramientas de comunicación para mantenerte conectado con tu equipo. Puedes asignar entrenamientos, rastrear tasas de finalización y ajustar programas de entrenamiento basados en datos de rendimiento y necesidades individuales de atletas.',
      }
    },
    {
      key: 'club_management_intro',
      category: 'management',
      values: {
        en: 'Club administrators have access to comprehensive management tools including member registration, subscription management, payment tracking, and facility access control. You can organize teams, manage coaches and athletes, and generate reports on club activities and financial performance.',
        it: 'Gli amministratori del club hanno accesso a strumenti di gestione completi tra cui registrazione membri, gestione abbonamenti, tracciamento pagamenti e controllo accessi alle strutture. Puoi organizzare squadre, gestire allenatori e atleti e generare report sulle attività del club e sulle prestazioni finanziarie.',
        es: 'Los administradores del club tienen acceso a herramientas de gestión integrales que incluyen registro de miembros, gestión de suscripciones, seguimiento de pagos y control de acceso a instalaciones. Puedes organizar equipos, gestionar entrenadores y atletas, y generar informes sobre actividades del club y rendimiento financiero.',
      }
    },
    {
      key: 'subscription_benefits',
      category: 'social',
      values: {
        en: 'Premium members enjoy unlimited workout storage, advanced analytics, personalized training recommendations, priority support, and access to exclusive training programs. You can also connect with professional coaches and join community challenges to stay motivated and achieve your fitness goals faster.',
        it: 'I membri premium godono di archiviazione illimitata degli allenamenti, analisi avanzate, raccomandazioni di allenamento personalizzate, supporto prioritario e accesso a programmi di allenamento esclusivi. Puoi anche connetterti con allenatori professionisti e partecipare a sfide della community per rimanere motivato e raggiungere i tuoi obiettivi di fitness più velocemente.',
        es: 'Los miembros premium disfrutan de almacenamiento ilimitado de entrenamientos, análisis avanzados, recomendaciones de entrenamiento personalizadas, soporte prioritario y acceso a programas de entrenamiento exclusivos. También puedes conectarte con entrenadores profesionales y unirte a desafíos comunitarios para mantenerte motivado y lograr tus objetivos de fitness más rápido.',
      }
    },
    {
      key: 'data_security_notice',
      category: 'system',
      values: {
        en: 'Your data security is our top priority. We use industry-standard encryption to protect your personal information and workout data. All communications are secured with SSL/TLS protocols. We never share your personal information with third parties without your explicit consent. Regular security audits ensure your data remains safe.',
        it: 'La sicurezza dei tuoi dati è la nostra massima priorità. Utilizziamo crittografia standard del settore per proteggere le tue informazioni personali e i dati di allenamento. Tutte le comunicazioni sono protette con protocolli SSL/TLS. Non condividiamo mai le tue informazioni personali con terze parti senza il tuo consenso esplicito. Audit di sicurezza regolari garantiscono che i tuoi dati rimangano al sicuro.',
        es: 'La seguridad de tus datos es nuestra máxima prioridad. Utilizamos cifrado estándar de la industria para proteger tu información personal y datos de entrenamiento. Todas las comunicaciones están aseguradas con protocolos SSL/TLS. Nunca compartimos tu información personal con terceros sin tu consentimiento explícito. Las auditorías de seguridad regulares garantizan que tus datos permanezcan seguros.',
      }
    },
    {
      key: 'getting_started_guide',
      category: 'system',
      values: {
        en: 'Getting started with Movesbook is easy! First, complete your profile with your fitness goals and preferences. Next, explore the workout library or create your own custom routines. Connect with coaches or join a club to access professional training programs. Don\'t forget to track your progress regularly and celebrate your achievements!',
        it: 'Iniziare con Movesbook è facile! Prima, completa il tuo profilo con i tuoi obiettivi di fitness e preferenze. Poi, esplora la libreria di allenamenti o crea le tue routine personalizzate. Connettiti con allenatori o unisciti a un club per accedere a programmi di allenamento professionali. Non dimenticare di monitorare regolarmente i tuoi progressi e celebrare i tuoi successi!',
        es: '¡Comenzar con Movesbook es fácil! Primero, completa tu perfil con tus objetivos de fitness y preferencias. Luego, explora la biblioteca de entrenamientos o crea tus propias rutinas personalizadas. Conéctate con entrenadores o únete a un club para acceder a programas de entrenamiento profesionales. ¡No olvides rastrear tu progreso regularmente y celebrar tus logros!',
      }
    },
    {
      key: 'community_guidelines',
      category: 'social',
      values: {
        en: 'Our community thrives on mutual respect and support. Please be courteous in all interactions, share constructive feedback, and encourage fellow members. Harassment, spam, or inappropriate content will not be tolerated. By participating in our community, you help create a positive environment for everyone to achieve their fitness goals.',
        it: 'La nostra community prospera sul rispetto reciproco e sul supporto. Si prega di essere cortesi in tutte le interazioni, condividere feedback costruttivo e incoraggiare i membri. Molestie, spam o contenuti inappropriati non saranno tollerati. Partecipando alla nostra community, aiuti a creare un ambiente positivo per tutti per raggiungere i loro obiettivi di fitness.',
        es: 'Nuestra comunidad prospera en el respeto mutuo y el apoyo. Por favor, sé cortés en todas las interacciones, comparte comentarios constructivos y anima a otros miembros. El acoso, spam o contenido inapropiado no será tolerado. Al participar en nuestra comunidad, ayudas a crear un ambiente positivo para que todos logren sus objetivos de fitness.',
      }
    },
    {
      key: 'performance_tracking_info',
      category: 'management',
      values: {
        en: 'Track your performance with detailed analytics and progress charts. Monitor key metrics including workout frequency, exercise volume, personal records, and improvement trends. Set goals and receive notifications when you achieve milestones. Export your data to share with coaches or for personal records. Our advanced algorithms provide insights to optimize your training.',
        it: 'Monitora le tue prestazioni con analisi dettagliate e grafici di progresso. Monitora metriche chiave tra cui frequenza di allenamento, volume di esercizio, record personali e tendenze di miglioramento. Imposta obiettivi e ricevi notifiche quando raggiungi traguardi. Esporta i tuoi dati per condividerli con allenatori o per record personali. I nostri algoritmi avanzati forniscono approfondimenti per ottimizzare il tuo allenamento.',
        es: 'Rastrea tu rendimiento con análisis detallados y gráficos de progreso. Monitorea métricas clave incluyendo frecuencia de entrenamiento, volumen de ejercicio, récords personales y tendencias de mejora. Establece objetivos y recibe notificaciones cuando alcances hitos. Exporta tus datos para compartir con entrenadores o para registros personales. Nuestros algoritmos avanzados proporcionan información para optimizar tu entrenamiento.',
      }
    },
    {
      key: 'nutrition_integration_desc',
      category: 'management',
      values: {
        en: 'Complement your training with integrated nutrition tracking. Log your meals, track macronutrients, and get personalized recommendations based on your workout intensity and goals. Our nutrition database includes thousands of foods and recipes. Sync with popular nutrition apps for seamless tracking of your complete fitness journey.',
        it: 'Complementa il tuo allenamento con il monitoraggio nutrizionale integrato. Registra i tuoi pasti, monitora i macronutrienti e ottieni raccomandazioni personalizzate in base all\'intensità dell\'allenamento e agli obiettivi. Il nostro database nutrizionale include migliaia di cibi e ricette. Sincronizza con app nutrizionali popolari per un monitoraggio senza soluzione di continuità del tuo percorso di fitness completo.',
        es: 'Complementa tu entrenamiento con seguimiento nutricional integrado. Registra tus comidas, rastrea macronutrientes y obtén recomendaciones personalizadas basadas en la intensidad de tu entrenamiento y objetivos. Nuestra base de datos nutricional incluye miles de alimentos y recetas. Sincroniza con aplicaciones nutricionales populares para un seguimiento sin problemas de tu viaje de fitness completo.',
      }
    },
    {
      key: 'team_collaboration_features',
      category: 'management',
      values: {
        en: 'Enhance team performance with collaborative tools. Share workout plans, communicate through group chats, schedule team events, and track collective progress. Coaches can assign team challenges and monitor individual contributions. Team leaderboards foster healthy competition while maintaining a supportive environment for all members to excel together.',
        it: 'Migliora le prestazioni del team con strumenti collaborativi. Condividi piani di allenamento, comunica attraverso chat di gruppo, programma eventi di squadra e monitora i progressi collettivi. Gli allenatori possono assegnare sfide di squadra e monitorare i contributi individuali. Le classifiche di squadra promuovono una competizione sana mantenendo un ambiente di supporto per tutti i membri per eccellere insieme.',
        es: 'Mejora el rendimiento del equipo con herramientas colaborativas. Comparte planes de entrenamiento, comunícate a través de chats grupales, programa eventos de equipo y rastrea el progreso colectivo. Los entrenadores pueden asignar desafíos de equipo y monitorear contribuciones individuales. Las tablas de clasificación del equipo fomentan una competencia saludable mientras mantienen un ambiente de apoyo para que todos los miembros sobresalgan juntos.',
      }
    },
    {
      key: 'mobile_app_features',
      category: 'system',
      values: {
        en: 'Take Movesbook with you wherever you go! Our mobile apps for iOS and Android provide full access to your workouts, progress tracking, and communication features. Offline mode allows you to log workouts without internet connection, syncing automatically when you\'re back online. Get push notifications for workout reminders and coach messages.',
        it: 'Porta Movesbook con te ovunque tu vada! Le nostre app mobili per iOS e Android forniscono accesso completo ai tuoi allenamenti, monitoraggio dei progressi e funzionalità di comunicazione. La modalità offline ti consente di registrare allenamenti senza connessione internet, sincronizzando automaticamente quando sei di nuovo online. Ricevi notifiche push per promemoria di allenamento e messaggi dell\'allenatore.',
        es: '¡Lleva Movesbook contigo dondequiera que vayas! Nuestras aplicaciones móviles para iOS y Android proporcionan acceso completo a tus entrenamientos, seguimiento de progreso y funciones de comunicación. El modo sin conexión te permite registrar entrenamientos sin conexión a internet, sincronizando automáticamente cuando estés en línea nuevamente. Recibe notificaciones push para recordatorios de entrenamiento y mensajes del entrenador.',
      }
    },
    {
      key: 'wearable_integration_info',
      category: 'system',
      values: {
        en: 'Seamlessly integrate with popular fitness wearables and smartwatches. Automatically import workout data from Garmin, Fitbit, Apple Watch, Polar, and many more devices. Sync heart rate, distance, pace, and other metrics directly to your Movesbook profile. Compatible devices are continuously being added to support your favorite fitness technology.',
        it: 'Integra senza problemi con indossabili fitness e smartwatch popolari. Importa automaticamente dati di allenamento da Garmin, Fitbit, Apple Watch, Polar e molti altri dispositivi. Sincronizza frequenza cardiaca, distanza, ritmo e altre metriche direttamente sul tuo profilo Movesbook. I dispositivi compatibili vengono continuamente aggiunti per supportare la tua tecnologia fitness preferita.',
        es: 'Integra sin problemas con wearables de fitness populares y relojes inteligentes. Importa automáticamente datos de entrenamiento desde Garmin, Fitbit, Apple Watch, Polar y muchos más dispositivos. Sincroniza frecuencia cardíaca, distancia, ritmo y otras métricas directamente a tu perfil de Movesbook. Los dispositivos compatibles se agregan continuamente para admitir tu tecnología de fitness favorita.',
      }
    },
    {
      key: INFO_REPS_TRANSLATION_KEY,
      category: 'social',
      values: {
        en: INFO_REPS_DEFAULT_EN,
      },
    },
    {
      key: AUTO_PROCESS_INFO_TRANSLATION_KEY,
      category: 'social',
      values: {
        en: AUTO_PROCESS_INFO_DEFAULT_EN,
      },
    },
    {
      key: IDENTIFICATION_DEVICES_INFO_TRANSLATION_KEY,
      category: 'management',
      values: {
        en: IDENTIFICATION_DEVICES_INFO_DEFAULT_EN,
      },
    },
  ];

  let insertedCount = 0;
  let skippedCount = 0;

  // Seed short texts
  for (const item of shortTexts) {
    for (const [lang, value] of Object.entries(item.values)) {
      try {
        await prisma.translation.upsert({
          where: {
            key_language: {
              key: item.key,
              language: lang,
            },
          },
          update: {
            value,
            category: item.category,
          },
          create: {
            key: item.key,
            language: lang,
            value,
            category: item.category,
            isDeleted: false,
          },
        });
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting ${item.key} (${lang}):`, error);
        skippedCount++;
      }
    }
  }

  // Seed long texts
  for (const item of longTexts) {
    for (const [lang, value] of Object.entries(item.values)) {
      try {
        await prisma.translation.upsert({
          where: {
            key_language: {
              key: item.key,
              language: lang,
            },
          },
          update: {
            value,
            category: item.category,
          },
          create: {
            key: item.key,
            language: lang,
            value,
            category: item.category,
            isDeleted: false,
          },
        });
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting ${item.key} (${lang}):`, error);
        skippedCount++;
      }
    }
  }

  console.log(`✅ Seed completed: ${insertedCount} translations inserted/updated, ${skippedCount} skipped`);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  await seedTranslations();

  const defaultPassword = await bcrypt.hash('password123', 12);

  const englishLang = await prisma.language.upsert({
    where: { code: 'en' },
    update: {},
    create: {
      code: 'en',
      name: 'English',
      isActive: true,
      isDefault: true,
    },
  });

  const frenchLang = await prisma.language.upsert({
    where: { code: 'fr' },
    update: {},
    create: {
      code: 'fr',
      name: 'French',
      isActive: true,
      isDefault: false,
    },
  });

  const italianLang = await prisma.language.upsert({
    where: { code: 'it' },
    update: {},
    create: {
      code: 'it',
      name: 'Italiano',
      isActive: true,
      isDefault: false,
    },
  });

  const deutschLang = await prisma.language.upsert({
    where: { code: 'de' },
    update: {},
    create: {
      code: 'de',
      name: 'Deutsch',
      isActive: true,
      isDefault: false,
    },
  });

  const spanishLang = await prisma.language.upsert({
    where: { code: 'es' },
    update: {},
    create: {
      code: 'es',
      name: 'Spanish',
      isActive: true,
      isDefault: false,
    },
  });

  const portugueseLang = await prisma.language.upsert({
    where: { code: 'pt' },
    update: {},
    create: {
      code: 'pt',
      name: 'Portuguese',
      isActive: true,
      isDefault: false,
    },
  });

  const russianLang = await prisma.language.upsert({
    where: { code: 'ru' },
    update: {},
    create: {
      code: 'ru',
      name: 'Russian',
      isActive: true,
      isDefault: false,
    },
  });

  const hindiLang = await prisma.language.upsert({
    where: { code: 'hi' },
    update: {},
    create: {
      code: 'hi',
      name: 'Hindi',
      isActive: true,
      isDefault: false,
    },
  });

  const chineseLang = await prisma.language.upsert({
    where: { code: 'zh' },
    update: {},
    create: {
      code: 'zh',
      name: 'Chinese',
      isActive: true,
      isDefault: false,
    },
  });

  const arabicLang = await prisma.language.upsert({
    where: { code: 'ar' },
    update: {},
    create: {
      code: 'ar',
      name: 'Arabic',
      isActive: true,
      isDefault: false,
    },
  });

  console.log('✅ Languages seeded');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@movesbook.com' },
    update: {},
    create: {
      email: 'admin@movesbook.com',
      username: 'admin',
      password: defaultPassword,
      name: 'Admin User',
      userType: UserType.ADMIN,
    },
  });

  const athleteUser = await prisma.user.upsert({
    where: { email: 'athlete@movesbook.com' },
    update: {},
    create: {
      email: 'athlete@movesbook.com',
      username: 'athlete',
      password: defaultPassword,
      name: 'John Athlete',
      userType: UserType.ATHLETE,
    },
  });

  const coachUser = await prisma.user.upsert({
    where: { email: 'coach@movesbook.com' },
    update: {},
    create: {
      email: 'coach@movesbook.com',
      username: 'coach',
      password: defaultPassword,
      name: 'Coach Smith',
      userType: UserType.COACH,
    },
  });

  console.log('✅ Users seeded');

  const categories = [
    { id: '1', name: 'Applications', order: 1 },
    { id: '2', name: 'Events', order: 2 },
    { id: '3', name: 'Medicine', order: 3 },
    { id: '4', name: 'News from the world', order: 4 },
    { id: '5', name: 'Nutritions', order: 5 },
    { id: '6', name: 'Organizations', order: 6 },
    { id: '7', name: 'Plugs in', order: 7 },
    { id: '8', name: 'Software for sport', order: 8 },
    { id: '9', name: 'Sport', order: 9 },
    { id: '10', name: 'Sport technology', order: 10 },
    { id: '11', name: 'Training', order: 11 },
    { id: '12', name: 'Tools for sports', order: 12 },
    { id: '13', name: 'Upgrade news', order: 13 },
  ];

  const categoryMap: Record<string, any> = {};
  for (const cat of categories) {
    const category = await prisma.newsCategory.upsert({
      where: { id: cat.id },
      update: { categoryName: cat.name, displayOrder: cat.order },
      create: {
        id: cat.id,
        categoryName: cat.name,
        displayOrder: cat.order,
        isActive: true,
      },
    });
    categoryMap[cat.id] = category;
  }

  console.log('✅ News categories seeded');

  const newsArticles = [
    {
      title: 'Hang Time Podcast: Rick Fox goes off on Howard',
      titleFr: 'Podcast Hang Time : Rick Fox critique Howard',
      titleIt: 'Hang Time Podcast: Rick Fox attacca Howard',
      content: {
        en: '<p>In this week\'s episode of Hang Time, former NBA player Rick Fox shares his thoughts on the current state of basketball and discusses his experiences playing alongside some of the game\'s greatest players.</p><p>The conversation covers topics ranging from team dynamics to the evolution of the sport over the past decades.</p>',
        fr: '<p>Dans cet épisode de Hang Time, l\'ancien joueur de la NBA Rick Fox partage ses réflexions sur l\'état actuel du basketball et discute de ses expériences en jouant aux côtés de certains des plus grands joueurs du jeu.</p>',
        it: '<p>In questo episodio di Hang Time, l\'ex giocatore NBA Rick Fox condivide i suoi pensieri sullo stato attuale del basket e discute le sue esperienze giocando accanto ad alcuni dei più grandi giocatori del gioco.</p>',
      },
      categoryId: categoryMap['9'].id,
      author: 'Sports Reporter',
      priority: 'high',
      documentType: 'articles',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'Y',
      briefDesc: 'Rick Fox discusses basketball and his NBA career',
      searchingKeywords: 'basketball nba podcast rickfox',
      sportIds: ['4'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'Championship Finals Set for Next Weekend',
      titleFr: 'Finales du championnat prévues le week-end prochain',
      titleIt: 'Finali di campionato il prossimo weekend',
      content: {
        en: '<p>The championship finals have been scheduled for next weekend at the main stadium. Both teams have shown exceptional performance throughout the season.</p><p>Tickets are now available for purchase online and at the venue box office.</p>',
        fr: '<p>Les finales du championnat ont été programmées pour le week-end prochain au stade principal. Les deux équipes ont montré des performances exceptionnelles tout au long de la saison.</p>',
        it: '<p>Le finali del campionato sono state programmate per il prossimo fine settimana allo stadio principale. Entrambe le squadre hanno mostrato prestazioni eccezionali durante tutta la stagione.</p>',
      },
      categoryId: categoryMap['9'].id,
      author: 'Event Coordinator',
      priority: 'middle',
      documentType: 'press_release',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'N',
      searchingKeywords: 'finals tickets stadium',
      sportIds: ['15'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'New Training Facility Opens in Downtown',
      titleFr: 'Nouveau centre d\'entraînement au centre-ville',
      titleIt: 'Nuovo centro di allenamento in centro',
      content: {
        en: '<p>A state-of-the-art training facility has opened its doors in downtown, offering athletes access to the latest equipment and training methodologies.</p><p>The facility includes multiple courts, a fully equipped gym, and recovery areas.</p>',
        fr: '<p>Une installation d\'entraînement de pointe a ouvert ses portes dans le centre-ville, offrant aux athlètes l\'accès aux derniers équipements et méthodologies d\'entraînement.</p>',
        it: '<p>Una struttura di allenamento all\'avanguardia ha aperto le sue porte nel centro città, offrendo agli atleti l\'accesso alle ultime attrezzature e metodologie di allenamento.</p>',
      },
      categoryId: categoryMap['4'].id,
      author: 'Facility Manager',
      priority: 'low',
      documentType: 'articles',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'N',
      searchingKeywords: 'training facility gym recovery',
      sportIds: ['26'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'Athlete of the Month: Rising Star Recognition',
      titleFr: 'Athlète du mois : reconnaissance d\'une étoile montante',
      titleIt: 'Atleta del mese: riconoscimento di una stella nascente',
      content: {
        en: '<p>This month we recognize an outstanding athlete who has shown remarkable improvement and dedication to their sport.</p><p>Their commitment to training and positive attitude serve as an inspiration to fellow athletes.</p>',
        fr: '<p>Ce mois-ci, nous reconnaissons un athlète exceptionnel qui a montré une amélioration remarquable et un dévouement à son sport.</p>',
        it: '<p>Questo mese riconosciamo un atleta eccezionale che ha mostrato un miglioramento notevole e dedizione al proprio sport.</p>',
      },
      categoryId: categoryMap['4'].id,
      author: 'Editorial Team',
      priority: 'middle',
      documentType: 'articles',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'Y',
      briefDesc: 'Recognizing outstanding athletic achievement',
      searchingKeywords: 'athlete award training',
      sportIds: ['14'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'Coaching Workshop Scheduled for Next Month',
      titleFr: 'Atelier pour entraîneurs prévu le mois prochain',
      titleIt: 'Workshop per allenatori il prossimo mese',
      content: {
        en: '<p>Professional coaches are invited to attend a comprehensive workshop covering the latest training techniques and strategies.</p><p>The event will feature guest speakers from top sports organizations.</p>',
        fr: '<p>Les entraîneurs professionnels sont invités à assister à un atelier complet couvrant les dernières techniques et stratégies d\'entraînement.</p>',
        it: '<p>Gli allenatori professionisti sono invitati a partecipare a un workshop completo che copre le ultime tecniche e strategie di allenamento.</p>',
      },
      categoryId: categoryMap['4'].id,
      author: 'Workshop Organizer',
      priority: 'middle',
      documentType: 'articles',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'N',
      searchingKeywords: 'coaching workshop strategy',
      sportIds: ['1'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'Movesbook Update: New sharing tools available',
      titleFr: 'Mise à jour Movesbook : nouveaux outils de partage',
      titleIt: 'Aggiornamento Movesbook: nuovi strumenti di condivisione',
      content: {
        en: '<p>We\'ve added new sharing tools to make posting news faster and easier.</p><p>Try the updated toolbar and improved search experience.</p>',
        fr: '<p>Nous avons ajouté de nouveaux outils de partage pour publier plus rapidement.</p>',
        it: '<p>Abbiamo aggiunto nuovi strumenti di condivisione per pubblicare più velocemente.</p>',
      },
      categoryId: categoryMap['13'].id,
      author: 'Movesbook Team',
      priority: 'high',
      documentType: 'press_release',
      method: 'Typed',
      inLastNews: 'Y',
      feturedNews: 'N',
      searchingKeywords: 'movesbook update sharing',
      sportIds: ['31'],
      mode: 'content',
      displayMode: '1',
    },
    {
      title: 'External Article: Sports science trends 2026',
      titleFr: 'Article externe : tendances en science du sport 2026',
      titleIt: 'Articolo esterno: tendenze scienza dello sport 2026',
      content: {
        en: '<p>Read the external article using the link below.</p>',
        fr: '<p>Lisez l\'article externe via le lien ci-dessous.</p>',
        it: '<p>Leggi l\'articolo esterno tramite il link qui sotto.</p>',
      },
      categoryId: categoryMap['10'].id,
      author: 'External',
      priority: 'low',
      documentType: 'articles',
      method: 'Shared',
      inLastNews: 'Y',
      feturedNews: 'N',
      searchingKeywords: 'sportscience trends research',
      sportIds: ['14'],
      mode: 'url',
      internetLink: 'https://example.com/sports-science-trends-2026',
      internetLinkEditor: '<p><strong>Sports science trends 2026</strong> — read the full article here.</p>',
      pageOption: 'Same page',
      displayMode: '1',
    },
  ];

  for (const article of newsArticles) {
    const serializedContent = serializeMultiLanguageContent(article.content);
    
    const news = await prisma.news.create({
      data: {
        userId: adminUser.id,
        langValueId: englishLang.id,
        authorType: 'Admin',
        documentType: article.documentType,
        title: article.title,
        newsCategoryId: article.categoryId,
        author: article.author,
        originalAuthor: article.author,
        priority: article.priority,
        content: serializedContent,
        mode: (article as any).mode || 'content',
        internetLink: (article as any).internetLink || null,
        internetLinkEditor: (article as any).internetLinkEditor || null,
        pageOption: (article as any).pageOption || null,
        displayMode: (article as any).displayMode || '1',
        searchingKeywords: (article as any).searchingKeywords || null,
        method: article.method,
        inLastNews: article.inLastNews,
        feturedNews: article.feturedNews || 'N',
        briefDesc: article.briefDesc || null,
        shareEnable: 'Y',
        shareCommentOption: 'Y',
        comments: 'Y',
        image: '/img/post_img1.jpg',
      },
    });

    await prisma.newsLanguageTitle.createMany({
      data: [
        {
          newsId: news.id,
          languageId: englishLang.id,
          title: article.title,
        },
        {
          newsId: news.id,
          languageId: frenchLang.id,
          title: (article as any).titleFr || article.title,
        },
        {
          newsId: news.id,
          languageId: italianLang.id,
          title: (article as any).titleIt || article.title,
        },
      ],
    });

    const rawSportIds: string[] = (article as any).sportIds || [];
    const mappedSports = rawSportIds
      .map((id) => sportIdToSportType[id])
      .filter(Boolean);

    await prisma.newsSetting.create({
      data: {
        newsId: news.id,
        sectorId: '0',
        duration: 30,
        reshare: 'Y',
        functions: JSON.stringify({
          commentOption: 'Y',
          likeButton: 'Y',
          unlikeButton: 'Y',
          shareTf: 'Y',
          otherSetting: 'N',
          rankingButton: 'N',
          sendByEmail: 'N',
          exportInPdf: 'N',
          downloadDocument: 'N',
          printOption: 'N',
        }),
        sports: {
          create: [
            ...(mappedSports.length > 0 ? mappedSports : [SportType.RUN]).map((sport) => ({ sport })),
          ],
        },
      },
    });
  }

  console.log('✅ News articles seeded');

  if ((process.env.DATABASE_URL || '').startsWith('mysql')) {
    console.log('\n🎟️ Ensuring promocode meta tables…');
    try {
      await ensurePromocodeMetaTables();
      console.log('✅ Promocode meta tables ready');
    } catch (err) {
      console.warn('⚠️ Promocode meta bootstrap skipped:', err);
    }
  }

  console.log('\n📋 Seed Summary:');
  console.log('   - Admin User: admin@movesbook.com / password123');
  console.log('   - Athlete User: athlete@movesbook.com / password123');
  console.log('   - Coach User: coach@movesbook.com / password123');
  console.log(`   - ${newsArticles.length} news articles created`);
  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

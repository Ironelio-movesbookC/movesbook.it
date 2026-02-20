import { PrismaClient, UserType, SportType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { serializeMultiLanguageContent } from '../src/lib/news/contentParser';

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
  ];

  const longTexts = [
    {
      key: 'welcome_message',
      category: 'system',
      values: {
        en: 'Welcome to Movesbook! We are excited to have you on board.',
        it: 'Benvenuto su Movesbook! Siamo entusiasti di averti a bordo.',
        es: 'Bienvenido a Movesbook! Estamos emocionados de tenerte a bordo.',
      }
    },
  ];

  for (const item of shortTexts) {
    for (const [lang, value] of Object.entries(item.values)) {
      await prisma.translation.upsert({
        where: {
          key_language: {
            key: item.key,
            language: lang,
          },
        },
        update: { value, category: item.category },
        create: {
          key: item.key,
          language: lang,
          value,
          category: item.category,
          isDeleted: false,
        },
      });
    }
  }

  for (const item of longTexts) {
    for (const [lang, value] of Object.entries(item.values)) {
      await prisma.translation.upsert({
        where: {
          key_language: {
            key: item.key,
            language: lang,
          },
        },
        update: { value, category: item.category },
        create: {
          key: item.key,
          language: lang,
          value,
          category: item.category,
          isDeleted: false,
        },
      });
    }
  }

  console.log('✅ Translations seeded');
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

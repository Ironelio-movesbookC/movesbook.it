import { NextRequest, NextResponse } from 'next/server';
import { mapLangForTranslationApi } from '@/utils/richTextTranslation';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguages } = await request.json();
    const sourceText = typeof text === 'string' ? text.trim() : '';

    if (!sourceText || !targetLanguages || !Array.isArray(targetLanguages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if Google Translate API key is configured
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      // Fallback: Use free LibreTranslate API or return mock translations
      console.warn('Google Translate API key not found, using fallback translation');
      return fallbackTranslation(sourceText, targetLanguages);
    }

    // Use Google Translate API
    const translations: Record<string, string> = { en: sourceText };

    for (const lang of targetLanguages) {
      if (lang === 'en') continue;
      const apiTarget = mapLangForTranslationApi(lang);

      try {
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: sourceText,
              source: 'en',
              target: apiTarget,
              format: 'text',
            }),
          }
        );

        const data = await response.json();

        if (data.data && data.data.translations && data.data.translations[0]) {
          translations[lang] = data.data.translations[0].translatedText;
        } else {
          translations[lang] = `[Translation failed for ${lang}]`;
        }
      } catch (error) {
        console.error(`Error translating to ${lang}:`, error);
        translations[lang] = `[Error: ${lang}]`;
      }
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}

// Helper function to split long text into sentences
function splitIntoSentences(text: string): string[] {
  // Split by sentence endings but preserve the punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences;
}

// Helper function to chunk text into smaller parts (max 400 chars)
function chunkText(text: string, maxLength: number = 400): string[] {
  if (text.length <= maxLength) return [text];
  
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Fallback translation using multiple free services
async function fallbackTranslation(text: string, targetLanguages: string[]) {
  console.log('Using fallback translation for:', text);
  console.log('Text length:', text.length);
  console.log('Target languages:', targetLanguages);
  
  try {
    const translations: Record<string, string> = { en: text };

    // If text is too long, split into chunks
    const isLongText = text.length > 400;
    const chunks = isLongText ? chunkText(text, 400) : [text];
    
    if (isLongText) {
      console.log(`Text is long (${text.length} chars), splitting into ${chunks.length} chunks`);
    }

    // Try multiple translation services in order of quality
    for (const lang of targetLanguages) {
      if (lang === 'en') continue;
      const apiLang = mapLangForTranslationApi(lang);

      let translationSuccess = false;
      let translatedChunks: string[] = [];

      // Method 1: Try MyMemory Translation API (chunk by chunk for long texts)
      if (isLongText) {
        try {
          console.log(`Translating ${chunks.length} chunks to ${lang}...`);
          let allChunksSuccess = true;
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
            
            const encodedChunk = encodeURIComponent(chunk);
            const response = await fetch(
              `https://api.mymemory.translated.net/get?q=${encodedChunk}&langpair=en|${apiLang}`,
              { signal: AbortSignal.timeout(8000) }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.responseData && data.responseData.translatedText) {
                translatedChunks.push(data.responseData.translatedText);
                await new Promise(resolve => setTimeout(resolve, 300)); // Longer delay between chunks
              } else {
                allChunksSuccess = false;
                break;
              }
            } else {
              allChunksSuccess = false;
              break;
            }
          }
          
          if (allChunksSuccess && translatedChunks.length === chunks.length) {
            translations[lang] = translatedChunks.join(' ');
            console.log(`✅ MyMemory success for ${lang} (chunked)`);
            translationSuccess = true;
            continue;
          }
        } catch (error) {
          console.log(`MyMemory chunked translation failed for ${lang}:`, error);
        }
      } else {
        // For short texts, translate normally
        try {
          console.log(`Attempting MyMemory API for ${lang}...`);
          const encodedText = encodeURIComponent(text);
          const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${apiLang}`,
            { signal: AbortSignal.timeout(8000) }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.responseData && data.responseData.translatedText) {
              translations[lang] = data.responseData.translatedText;
              console.log(`✅ MyMemory success for ${lang}: ${data.responseData.translatedText}`);
              translationSuccess = true;
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }
          }
        } catch (error) {
          console.log(`MyMemory failed for ${lang}:`, error);
        }
      }

      // Method 2: Try LibreTranslate (if MyMemory fails)
      if (!translationSuccess) {
        try {
          console.log(`Attempting LibreTranslate for ${lang}...`);
          const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: text,
              source: 'en',
              target: lang,
              format: 'text',
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
              translations[lang] = data.translatedText;
              console.log(`✅ LibreTranslate success for ${lang}: ${data.translatedText}`);
              translationSuccess = true;
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }
          }
        } catch (error) {
          console.log(`LibreTranslate failed for ${lang}:`, error);
        }
      }

      // Method 3: Dictionary fallback (last resort)
      if (!translationSuccess) {
        console.log(`Using dictionary fallback for ${lang}`);
        translations[lang] = getSimpleTranslation(text, lang);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log('Final translations:', translations);
    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Fallback translation error:', error);
    const translations: Record<string, string> = { en: text };
    for (const lang of targetLanguages) {
      if (lang !== 'en') {
        translations[lang] = getSimpleTranslation(text, lang);
      }
    }
    return NextResponse.json({ translations });
  }
}

// Simple translation fallback with common words
function getSimpleTranslation(text: string, lang: string): string {
  const commonTranslations: Record<string, Record<string, string>> = {
    fr: {
      // Navigation & UI
      'Home': 'Accueil',
      'Login': 'Connexion',
      'Logout': 'Déconnexion',
      'Settings': 'Paramètres',
      'Profile': 'Profil',
      'Dashboard': 'Tableau de bord',
      'Welcome': 'Bienvenue',
      'Hello': 'Bonjour',
      'Yes': 'Oui',
      'No': 'Non',
      'Save': 'Enregistrer',
      'Cancel': 'Annuler',
      'Delete': 'Supprimer',
      'Edit': 'Modifier',
      'Search': 'Rechercher',
      'New': 'Nouveau',
      'Add': 'Ajouter',
      'Remove': 'Retirer',
      'Update': 'Mettre à jour',
      'Create': 'Créer',
      // Common words
      'The': 'Le',
      'users': 'utilisateurs',
      'you': 'vous',
      'will': 'sera',
      'be': 'être',
      'able': 'capable',
      'to': 'à',
      'register': "s'inscrire",
      'with': 'avec',
      'same': 'même',
      'code': 'code',
      'team': 'équipe',
      'from': 'de',
      'and': 'et',
      'friends': 'amis',
      'promotional': 'promotionnel',
      'benefit': 'bénéficier',
      'credits': 'crédits',
      'earned': 'gagnés',
      'registration': 'inscription',
      'Dear': 'Cher',
      'user': 'utilisateur',
      'happy': 'heureux',
      'send': 'envoyer',
      'platform': 'plateforme',
      'allow': 'permettre',
      'access': 'accès',
      'exclusive': 'exclusif',
      'services': 'services',
      'athletes': 'athlètes',
      'technicians': 'techniciens',
      'managers': 'gestionnaires',
      'clubs': 'clubs',
      'sports': 'sports',
      'centers': 'centres',
      'taking': 'prenant',
      'advantage': 'avantage',
      'discounts': 'remises',
      'benefits': 'avantages',
      // Daily common words
      'we': 'nous',
      'are': 'sommes',
      'have': 'avons',
      'can': 'pouvons',
      'also': 'aussi',
      'invite': 'inviter',
      'other': 'autres',
      'turn': 'tour',
      'levels': 'niveaux',
      'sent': 'envoyé',
      'whom': 'qui',
      'receive': 'recevoir',
      'therefore': 'donc',
      'in': 'dans',
      'of': 'de',
      'for': 'pour',
      'on': 'sur',
      'at': 'à',
      'by': 'par',
      'is': 'est',
      'was': 'était',
      'has': 'a',
      'had': 'avait',
      'do': 'faire',
      'does': 'fait',
      'did': 'a fait',
      'could': 'pourrait',
      'would': 'serait',
      'should': 'devrait',
      'may': 'peut',
      'might': 'pourrait',
      'must': 'doit',
      'shall': 'devra',
      'this': 'ce',
      'that': 'cela',
      'these': 'ces',
      'those': 'ceux',
      'all': 'tous',
      'some': 'certains',
      'any': 'tout',
      'many': 'beaucoup',
      'much': 'beaucoup',
      'more': 'plus',
      'most': 'le plus',
      'another': 'un autre',
      'such': 'tel',
      'no': 'non',
      'not': 'pas',
      'only': 'seulement',
      'own': 'propre',
      'so': 'donc',
      'than': 'que',
      'too': 'aussi',
      'very': 'très',
      'just': 'juste',
      'where': 'où',
      'when': 'quand',
      'why': 'pourquoi',
      'how': 'comment',
      'which': 'lequel',
      'who': 'qui',
      'what': 'quoi',
    },
    de: {
      // Navigation & UI
      'Home': 'Startseite',
      'Login': 'Anmelden',
      'Logout': 'Abmelden',
      'Settings': 'Einstellungen',
      'Profile': 'Profil',
      'Dashboard': 'Dashboard',
      'Welcome': 'Willkommen',
      'Hello': 'Hallo',
      'Yes': 'Ja',
      'No': 'Nein',
      'Save': 'Speichern',
      'Cancel': 'Abbrechen',
      'Delete': 'Löschen',
      'Edit': 'Bearbeiten',
      'Search': 'Suchen',
      'New': 'Neu',
      'Add': 'Hinzufügen',
      'Remove': 'Entfernen',
      'Update': 'Aktualisieren',
      'Create': 'Erstellen',
      // Common words
      'The': 'Die',
      'users': 'Benutzer',
      'you': 'Sie',
      'will': 'wird',
      'be': 'sein',
      'able': 'fähig',
      'to': 'zu',
      'register': 'registrieren',
      'with': 'mit',
      'same': 'gleiche',
      'code': 'Code',
      'team': 'Team',
      'from': 'von',
      'and': 'und',
      'friends': 'Freunde',
      'promotional': 'Werbe',
      'benefit': 'profitieren',
      'credits': 'Credits',
      'earned': 'verdient',
      'registration': 'Registrierung',
      'Dear': 'Lieber',
      'user': 'Benutzer',
      'happy': 'glücklich',
      'send': 'senden',
      'platform': 'Plattform',
      'allow': 'erlauben',
      'access': 'Zugang',
      'exclusive': 'exklusiv',
      'services': 'Dienstleistungen',
      'athletes': 'Athleten',
      'technicians': 'Techniker',
      'managers': 'Manager',
      'clubs': 'Clubs',
      'sports': 'Sport',
      'centers': 'Zentren',
      'taking': 'nehmen',
      'advantage': 'Vorteil',
      'discounts': 'Rabatte',
      'benefits': 'Vorteile',
      // Daily common words
      'we': 'wir',
      'are': 'sind',
      'have': 'haben',
      'can': 'können',
      'also': 'auch',
      'invite': 'einladen',
      'other': 'andere',
      'turn': 'Reihe',
      'levels': 'Ebenen',
      'sent': 'gesendet',
      'whom': 'wem',
      'receive': 'erhalten',
      'therefore': 'daher',
      'in': 'in',
      'of': 'von',
      'for': 'für',
      'on': 'auf',
      'at': 'bei',
      'by': 'durch',
      'is': 'ist',
      'was': 'war',
      'has': 'hat',
      'had': 'hatte',
      'do': 'tun',
      'does': 'tut',
      'did': 'tat',
      'could': 'könnte',
      'would': 'würde',
      'should': 'sollte',
      'may': 'darf',
      'might': 'könnte',
      'must': 'muss',
      'shall': 'soll',
      'this': 'dies',
      'that': 'das',
      'these': 'diese',
      'those': 'jene',
      'all': 'alle',
      'some': 'einige',
      'any': 'irgendein',
      'many': 'viele',
      'much': 'viel',
      'more': 'mehr',
      'most': 'meisten',
      'another': 'ein anderes',
      'such': 'solch',
      'no': 'nein',
      'not': 'nicht',
      'only': 'nur',
      'own': 'eigen',
      'so': 'so',
      'than': 'als',
      'too': 'auch',
      'very': 'sehr',
      'just': 'nur',
      'where': 'wo',
      'when': 'wann',
      'why': 'warum',
      'how': 'wie',
      'which': 'welche',
      'who': 'wer',
      'what': 'was',
    },
    es: {
      // Navigation & UI
      'Home': 'Inicio',
      'Login': 'Iniciar sesión',
      'Logout': 'Cerrar sesión',
      'Settings': 'Configuración',
      'Profile': 'Perfil',
      'Dashboard': 'Panel',
      'Welcome': 'Bienvenido',
      'Hello': 'Hola',
      'Yes': 'Sí',
      'No': 'No',
      'Save': 'Guardar',
      'Cancel': 'Cancelar',
      'Delete': 'Eliminar',
      'Edit': 'Editar',
      'Search': 'Buscar',
      'New': 'Nuevo',
      'Add': 'Agregar',
      'Remove': 'Quitar',
      'Update': 'Actualizar',
      'Create': 'Crear',
      // Common words
      'The': 'Los',
      'users': 'usuarios',
      'you': 'usted',
      'will': 'será',
      'be': 'ser',
      'able': 'capaz',
      'to': 'a',
      'register': 'registrar',
      'with': 'con',
      'same': 'mismo',
      'code': 'código',
      'team': 'equipo',
      'from': 'de',
      'and': 'y',
      'friends': 'amigos',
      'promotional': 'promocional',
      'benefit': 'beneficiar',
      'credits': 'créditos',
      'earned': 'ganado',
      'registration': 'registro',
      'Dear': 'Estimado',
      'user': 'usuario',
      'happy': 'feliz',
      'send': 'enviar',
      'platform': 'plataforma',
      'allow': 'permitir',
      'access': 'acceso',
      'exclusive': 'exclusivo',
      'services': 'servicios',
      'athletes': 'atletas',
      'technicians': 'técnicos',
      'managers': 'gerentes',
      'clubs': 'clubes',
      'sports': 'deportes',
      'centers': 'centros',
      'taking': 'tomando',
      'advantage': 'ventaja',
      'discounts': 'descuentos',
      'benefits': 'beneficios',
      // Daily common words
      'we': 'nosotros',
      'are': 'somos',
      'have': 'tenemos',
      'can': 'podemos',
      'also': 'también',
      'invite': 'invitar',
      'other': 'otros',
      'turn': 'turno',
      'levels': 'niveles',
      'sent': 'enviado',
      'whom': 'quien',
      'receive': 'recibir',
      'therefore': 'por lo tanto',
      'in': 'en',
      'of': 'de',
      'for': 'para',
      'on': 'en',
      'at': 'en',
      'by': 'por',
      'is': 'es',
      'was': 'fue',
      'has': 'tiene',
      'had': 'tenía',
      'do': 'hacer',
      'does': 'hace',
      'did': 'hizo',
      'could': 'podría',
      'would': 'haría',
      'should': 'debería',
      'may': 'puede',
      'might': 'podría',
      'must': 'debe',
      'shall': 'deberá',
      'this': 'esto',
      'that': 'eso',
      'these': 'estos',
      'those': 'aquellos',
      'all': 'todos',
      'some': 'algunos',
      'any': 'cualquier',
      'many': 'muchos',
      'much': 'mucho',
      'more': 'más',
      'most': 'mayoría',
      'another': 'otro',
      'such': 'tal',
      'no': 'no',
      'not': 'no',
      'only': 'solo',
      'own': 'propio',
      'so': 'entonces',
      'than': 'que',
      'too': 'también',
      'very': 'muy',
      'just': 'solo',
      'where': 'dónde',
      'when': 'cuándo',
      'why': 'por qué',
      'how': 'cómo',
      'which': 'cual',
      'who': 'quién',
      'what': 'qué',
    },
    it: {
      // Navigation & UI
      'Home': 'Home',
      'Login': 'Accedi',
      'Logout': 'Esci',
      'Settings': 'Impostazioni',
      'Profile': 'Profilo',
      'Dashboard': 'Dashboard',
      'Welcome': 'Benvenuto',
      'Hello': 'Ciao',
      'Yes': 'Sì',
      'No': 'No',
      'Save': 'Salva',
      'Cancel': 'Annulla',
      'Delete': 'Elimina',
      'Edit': 'Modifica',
      'Search': 'Cerca',
      'New': 'Nuovo',
      'Add': 'Aggiungi',
      'Remove': 'Rimuovi',
      'Update': 'Aggiorna',
      'Create': 'Crea',
      // Common words
      'The': 'Gli',
      'users': 'utenti',
      'you': 'tu',
      'will': 'sarà',
      'be': 'essere',
      'able': 'in grado',
      'to': 'a',
      'register': 'registrare',
      'with': 'con',
      'same': 'stesso',
      'code': 'codice',
      'team': 'squadra',
      'from': 'da',
      'and': 'e',
      'friends': 'amici',
      'promotional': 'promozionale',
      'benefit': 'beneficiare',
      'credits': 'crediti',
      'earned': 'guadagnati',
      'registration': 'registrazione',
      'Dear': 'Caro',
      'user': 'utente',
      'happy': 'felice',
      'send': 'inviare',
      'platform': 'piattaforma',
      'allow': 'permettere',
      'access': 'accesso',
      'exclusive': 'esclusivo',
      'services': 'servizi',
      'athletes': 'atleti',
      'technicians': 'tecnici',
      'managers': 'manager',
      'clubs': 'club',
      'sports': 'sport',
      'centers': 'centri',
      'taking': 'prendendo',
      'advantage': 'vantaggio',
      'discounts': 'sconti',
      'benefits': 'benefici',
      // Daily common words
      'we': 'noi',
      'are': 'siamo',
      'have': 'abbiamo',
      'can': 'possiamo',
      'also': 'anche',
      'invite': 'invitare',
      'other': 'altri',
      'turn': 'turno',
      'levels': 'livelli',
      'sent': 'inviato',
      'whom': 'chi',
      'receive': 'ricevere',
      'therefore': 'quindi',
      'in': 'in',
      'of': 'di',
      'for': 'per',
      'on': 'su',
      'at': 'a',
      'by': 'da',
      'is': 'è',
      'was': 'era',
      'has': 'ha',
      'had': 'aveva',
      'do': 'fare',
      'does': 'fa',
      'did': 'fatto',
      'could': 'potrebbe',
      'would': 'sarebbe',
      'should': 'dovrebbe',
      'may': 'può',
      'might': 'potrebbe',
      'must': 'deve',
      'shall': 'dovrà',
      'this': 'questo',
      'that': 'quello',
      'these': 'questi',
      'those': 'quelli',
      'all': 'tutti',
      'some': 'alcuni',
      'any': 'qualsiasi',
      'many': 'molti',
      'much': 'molto',
      'more': 'più',
      'most': 'maggior parte',
      'another': 'un altro',
      'such': 'tale',
      'no': 'no',
      'not': 'non',
      'only': 'solo',
      'own': 'proprio',
      'so': 'così',
      'than': 'di',
      'too': 'anche',
      'very': 'molto',
      'just': 'solo',
      'where': 'dove',
      'when': 'quando',
      'why': 'perché',
      'how': 'come',
      'which': 'quale',
      'who': 'chi',
      'what': 'cosa',
    },
    pt: {
      // Navigation & UI
      'Home': 'Início',
      'Login': 'Entrar',
      'Logout': 'Sair',
      'Settings': 'Configurações',
      'Profile': 'Perfil',
      'Dashboard': 'Painel',
      'Welcome': 'Bem-vindo',
      'Hello': 'Olá',
      'Yes': 'Sim',
      'No': 'Não',
      'Save': 'Salvar',
      'Cancel': 'Cancelar',
      'Delete': 'Excluir',
      'Edit': 'Editar',
      'Search': 'Buscar',
      'New': 'Novo',
      'Add': 'Adicionar',
      'Remove': 'Remover',
      'Update': 'Atualizar',
      'Create': 'Criar',
      // Common words
      'The': 'Os',
      'users': 'usuários',
      'you': 'você',
      'will': 'será',
      'be': 'ser',
      'able': 'capaz',
      'to': 'para',
      'register': 'registrar',
      'with': 'com',
      'same': 'mesmo',
      'code': 'código',
      'team': 'equipe',
      'from': 'de',
      'and': 'e',
      'friends': 'amigos',
      'promotional': 'promocional',
      'benefit': 'beneficiar',
      'credits': 'créditos',
      'earned': 'ganhos',
      'registration': 'registro',
      'Dear': 'Caro',
      'user': 'usuário',
      'happy': 'feliz',
      'send': 'enviar',
      'platform': 'plataforma',
      'allow': 'permitir',
      'access': 'acesso',
      'exclusive': 'exclusivo',
      'services': 'serviços',
      'athletes': 'atletas',
      'technicians': 'técnicos',
      'managers': 'gestores',
      'clubs': 'clubes',
      'sports': 'esportes',
      'centers': 'centros',
      'taking': 'aproveitando',
      'advantage': 'vantagem',
      'discounts': 'descontos',
      'benefits': 'benefícios',
      // Daily common words
      'we': 'nós',
      'are': 'somos',
      'have': 'temos',
      'can': 'podemos',
      'also': 'também',
      'invite': 'convidar',
      'other': 'outros',
      'turn': 'vez',
      'levels': 'níveis',
      'sent': 'enviado',
      'whom': 'quem',
      'receive': 'receber',
      'therefore': 'portanto',
      'in': 'em',
      'of': 'de',
      'for': 'para',
      'on': 'em',
      'at': 'em',
      'by': 'por',
      'is': 'é',
      'was': 'foi',
      'has': 'tem',
      'had': 'tinha',
      'do': 'fazer',
      'does': 'faz',
      'did': 'fez',
      'could': 'poderia',
      'would': 'faria',
      'should': 'deveria',
      'may': 'pode',
      'might': 'poderia',
      'must': 'deve',
      'shall': 'deverá',
      'this': 'isto',
      'that': 'isso',
      'these': 'estes',
      'those': 'aqueles',
      'all': 'todos',
      'some': 'alguns',
      'any': 'qualquer',
      'many': 'muitos',
      'much': 'muito',
      'more': 'mais',
      'most': 'maioria',
      'another': 'outro',
      'such': 'tal',
      'no': 'não',
      'not': 'não',
      'only': 'apenas',
      'own': 'próprio',
      'so': 'então',
      'than': 'que',
      'too': 'também',
      'very': 'muito',
      'just': 'apenas',
      'where': 'onde',
      'when': 'quando',
      'why': 'por que',
      'how': 'como',
      'which': 'qual',
      'who': 'quem',
      'what': 'o que',
    },
    ru: {
      // Navigation & UI
      'Home': 'Главная',
      'Login': 'Войти',
      'Logout': 'Выйти',
      'Settings': 'Настройки',
      'Profile': 'Профиль',
      'Dashboard': 'Панель',
      'Welcome': 'Добро пожаловать',
      'Hello': 'Привет',
      'Yes': 'Да',
      'No': 'Нет',
      'Save': 'Сохранить',
      'Cancel': 'Отмена',
      'Delete': 'Удалить',
      'Edit': 'Редактировать',
      'Search': 'Поиск',
      'New': 'Новый',
      'Add': 'Добавить',
      'Remove': 'Удалить',
      'Update': 'Обновить',
      'Create': 'Создать',
      // Common words
      'The': 'Эти',
      'users': 'пользователи',
      'you': 'вы',
      'will': 'будет',
      'be': 'быть',
      'able': 'способный',
      'to': 'к',
      'register': 'регистрировать',
      'with': 'с',
      'same': 'такой же',
      'code': 'код',
      'team': 'команда',
      'from': 'от',
      'and': 'и',
      'friends': 'друзья',
      'promotional': 'рекламный',
      'benefit': 'получать выгоду',
      'credits': 'кредиты',
      'earned': 'заработанные',
      'registration': 'регистрация',
      'Dear': 'Дорогой',
      'user': 'пользователь',
      'happy': 'счастливый',
      'send': 'отправить',
      'platform': 'платформа',
      'allow': 'позволить',
      'access': 'доступ',
      'exclusive': 'эксклюзивный',
      'services': 'услуги',
      'athletes': 'спортсмены',
      'technicians': 'техники',
      'managers': 'менеджеры',
      'clubs': 'клубы',
      'sports': 'спорт',
      'centers': 'центры',
      'taking': 'принимая',
      'advantage': 'преимущество',
      'discounts': 'скидки',
      'benefits': 'преимущества',
      // Daily common words
      'we': 'мы',
      'are': 'есть',
      'have': 'имеем',
      'can': 'можем',
      'also': 'также',
      'invite': 'приглашать',
      'other': 'другие',
      'turn': 'очередь',
      'levels': 'уровни',
      'sent': 'отправлено',
      'whom': 'кому',
      'receive': 'получать',
      'therefore': 'поэтому',
      'in': 'в',
      'of': 'из',
      'for': 'для',
      'on': 'на',
      'at': 'в',
      'by': 'от',
      'is': 'является',
      'was': 'был',
      'has': 'имеет',
      'had': 'имел',
      'do': 'делать',
      'does': 'делает',
      'did': 'сделал',
      'could': 'мог',
      'would': 'бы',
      'should': 'должен',
      'may': 'может',
      'might': 'мог бы',
      'must': 'должен',
      'shall': 'будет',
      'this': 'это',
      'that': 'то',
      'these': 'эти',
      'those': 'те',
      'all': 'все',
      'some': 'некоторые',
      'any': 'любой',
      'many': 'много',
      'much': 'много',
      'more': 'больше',
      'most': 'большинство',
      'another': 'другой',
      'such': 'такой',
      'no': 'нет',
      'not': 'не',
      'only': 'только',
      'own': 'свой',
      'so': 'так',
      'than': 'чем',
      'too': 'тоже',
      'very': 'очень',
      'just': 'просто',
      'where': 'где',
      'when': 'когда',
      'why': 'почему',
      'how': 'как',
      'which': 'который',
      'who': 'кто',
      'what': 'что',
    },
    hi: {
      // Navigation & UI
      'Home': 'होम',
      'Login': 'लॉगिन',
      'Logout': 'लॉगआउट',
      'Settings': 'सेटिंग्स',
      'Profile': 'प्रोफ़ाइल',
      'Dashboard': 'डैशबोर्ड',
      'Welcome': 'स्वागत है',
      'Hello': 'नमस्ते',
      'Yes': 'हाँ',
      'No': 'नहीं',
      'Save': 'सहेजें',
      'Cancel': 'रद्द करें',
      'Delete': 'हटाएं',
      'Edit': 'संपादित करें',
      'Search': 'खोजें',
      'New': 'नया',
      'Add': 'जोड़ें',
      'Remove': 'हटाएं',
      'Update': 'अपडेट करें',
      'Create': 'बनाएं',
      // Common words
      'The': 'वे',
      'users': 'उपयोगकर्ता',
      'you': 'आप',
      'will': 'होगा',
      'be': 'होना',
      'able': 'सक्षम',
      'to': 'को',
      'register': 'पंजीकरण',
      'with': 'के साथ',
      'same': 'समान',
      'code': 'कोड',
      'team': 'टीम',
      'from': 'से',
      'and': 'और',
      'friends': 'दोस्त',
      'promotional': 'प्रचार',
      'benefit': 'लाभ',
      'credits': 'क्रेडिट',
      'earned': 'अर्जित',
      'registration': 'पंजीकरण',
      'Dear': 'प्रिय',
      'user': 'उपयोगकर्ता',
      'happy': 'खुश',
      'send': 'भेजें',
      'platform': 'मंच',
      'allow': 'अनुमति',
      'access': 'पहुंच',
      'exclusive': 'विशेष',
      'services': 'सेवाएं',
      'athletes': 'एथलीट',
      'technicians': 'तकनीशियन',
      'managers': 'प्रबंधक',
      'clubs': 'क्लब',
      'sports': 'खेल',
      'centers': 'केंद्र',
      'taking': 'लेना',
      'advantage': 'लाभ',
      'discounts': 'छूट',
      'benefits': 'लाभ',
      // Daily common words
      'we': 'हम',
      'are': 'हैं',
      'have': 'है',
      'can': 'सकते हैं',
      'also': 'भी',
      'invite': 'आमंत्रित',
      'other': 'अन्य',
      'turn': 'बारी',
      'levels': 'स्तर',
      'sent': 'भेजा',
      'whom': 'जिसे',
      'receive': 'प्राप्त',
      'therefore': 'इसलिए',
      'in': 'में',
      'of': 'का',
      'for': 'के लिए',
      'on': 'पर',
      'at': 'पर',
      'by': 'द्वारा',
      'is': 'है',
      'was': 'था',
      'has': 'है',
      'had': 'था',
      'do': 'करना',
      'does': 'करता है',
      'did': 'किया',
      'could': 'सकता था',
      'would': 'होगा',
      'should': 'चाहिए',
      'may': 'सकता है',
      'might': 'शायद',
      'must': 'चाहिए',
      'shall': 'होगा',
      'this': 'यह',
      'that': 'वह',
      'these': 'ये',
      'those': 'वे',
      'all': 'सभी',
      'some': 'कुछ',
      'any': 'कोई',
      'many': 'कई',
      'much': 'बहुत',
      'more': 'अधिक',
      'most': 'सबसे',
      'another': 'एक और',
      'such': 'ऐसा',
      'no': 'नहीं',
      'not': 'नहीं',
      'only': 'केवल',
      'own': 'खुद का',
      'so': 'तो',
      'than': 'से',
      'too': 'भी',
      'very': 'बहुत',
      'just': 'बस',
      'where': 'कहाँ',
      'when': 'कब',
      'why': 'क्यों',
      'how': 'कैसे',
      'which': 'कौन सा',
      'who': 'कौन',
      'what': 'क्या',
    },
    zh: {
      // Navigation & UI
      'Home': '首页',
      'Login': '登录',
      'Logout': '登出',
      'Settings': '设置',
      'Profile': '个人资料',
      'Dashboard': '仪表板',
      'Welcome': '欢迎',
      'Hello': '你好',
      'Yes': '是',
      'No': '否',
      'Save': '保存',
      'Cancel': '取消',
      'Delete': '删除',
      'Edit': '编辑',
      'Search': '搜索',
      'New': '新建',
      'Add': '添加',
      'Remove': '移除',
      'Update': '更新',
      'Create': '创建',
      // Common words
      'The': '这些',
      'users': '用户',
      'you': '您',
      'will': '将',
      'be': '是',
      'able': '能够',
      'to': '到',
      'register': '注册',
      'with': '与',
      'same': '相同',
      'code': '代码',
      'team': '团队',
      'from': '从',
      'and': '和',
      'friends': '朋友',
      'promotional': '促销',
      'benefit': '受益',
      'credits': '积分',
      'earned': '赚取',
      'registration': '注册',
      'Dear': '亲爱的',
      'user': '用户',
      'happy': '高兴',
      'send': '发送',
      'platform': '平台',
      'allow': '允许',
      'access': '访问',
      'exclusive': '独家',
      'services': '服务',
      'athletes': '运动员',
      'technicians': '技术员',
      'managers': '管理员',
      'clubs': '俱乐部',
      'sports': '体育',
      'centers': '中心',
      'taking': '获取',
      'advantage': '优势',
      'discounts': '折扣',
      'benefits': '好处',
      // Daily common words
      'we': '我们',
      'are': '是',
      'have': '有',
      'can': '可以',
      'also': '也',
      'invite': '邀请',
      'other': '其他',
      'turn': '转',
      'levels': '级别',
      'sent': '发送',
      'whom': '谁',
      'receive': '接收',
      'therefore': '因此',
      'in': '在',
      'of': '的',
      'for': '为',
      'on': '上',
      'at': '在',
      'by': '由',
      'is': '是',
      'was': '是',
      'has': '有',
      'had': '有',
      'do': '做',
      'does': '做',
      'did': '做了',
      'could': '可以',
      'would': '会',
      'should': '应该',
      'may': '可能',
      'might': '可能',
      'must': '必须',
      'shall': '应',
      'this': '这',
      'that': '那',
      'these': '这些',
      'those': '那些',
      'all': '全部',
      'some': '一些',
      'any': '任何',
      'many': '许多',
      'much': '很多',
      'more': '更多',
      'most': '最多',
      'another': '另一个',
      'such': '这样',
      'no': '没有',
      'not': '不',
      'only': '只',
      'own': '自己',
      'so': '所以',
      'than': '比',
      'too': '也',
      'very': '非常',
      'just': '只是',
      'where': '哪里',
      'when': '什么时候',
      'why': '为什么',
      'how': '如何',
      'which': '哪个',
      'who': '谁',
      'what': '什么',
    },
    ar: {
      // Navigation & UI
      'Home': 'الصفحة الرئيسية',
      'Login': 'تسجيل الدخول',
      'Logout': 'تسجيل الخروج',
      'Settings': 'الإعدادات',
      'Profile': 'الملف الشخصي',
      'Dashboard': 'لوحة التحكم',
      'Welcome': 'مرحبا',
      'Hello': 'مرحبا',
      'Yes': 'نعم',
      'No': 'لا',
      'Save': 'حفظ',
      'Cancel': 'إلغاء',
      'Delete': 'حذف',
      'Edit': 'تعديل',
      'Search': 'بحث',
      'New': 'جديد',
      'Add': 'إضافة',
      'Remove': 'إزالة',
      'Update': 'تحديث',
      'Create': 'إنشاء',
      // Common words
      'The': 'هؤلاء',
      'users': 'المستخدمين',
      'you': 'أنت',
      'will': 'سوف',
      'be': 'يكون',
      'able': 'قادر',
      'to': 'إلى',
      'register': 'تسجيل',
      'with': 'مع',
      'same': 'نفس',
      'code': 'الرمز',
      'team': 'فريق',
      'from': 'من',
      'and': 'و',
      'friends': 'الأصدقاء',
      'promotional': 'ترويجي',
      'benefit': 'الاستفادة',
      'credits': 'النقاط',
      'earned': 'المكتسبة',
      'registration': 'التسجيل',
      'Dear': 'عزيزي',
      'user': 'المستخدم',
      'happy': 'سعيد',
      'send': 'إرسال',
      'platform': 'المنصة',
      'allow': 'السماح',
      'access': 'الوصول',
      'exclusive': 'حصري',
      'services': 'الخدمات',
      'athletes': 'الرياضيين',
      'technicians': 'الفنيين',
      'managers': 'المديرين',
      'clubs': 'النوادي',
      'sports': 'الرياضة',
      'centers': 'المراكز',
      'taking': 'أخذ',
      'advantage': 'ميزة',
      'discounts': 'الخصومات',
      'benefits': 'الفوائد',
      // Daily common words
      'we': 'نحن',
      'are': 'نكون',
      'have': 'لدينا',
      'can': 'يمكن',
      'also': 'أيضا',
      'invite': 'دعوة',
      'other': 'آخر',
      'turn': 'دور',
      'levels': 'مستويات',
      'sent': 'أرسلت',
      'whom': 'من',
      'receive': 'تلقي',
      'therefore': 'لذلك',
      'in': 'في',
      'of': 'من',
      'for': 'ل',
      'on': 'على',
      'at': 'في',
      'by': 'بواسطة',
      'is': 'هو',
      'was': 'كان',
      'has': 'لديه',
      'had': 'كان لديه',
      'do': 'فعل',
      'does': 'يفعل',
      'did': 'فعل',
      'could': 'يمكن',
      'would': 'سوف',
      'should': 'ينبغي',
      'may': 'قد',
      'might': 'ربما',
      'must': 'يجب',
      'shall': 'سوف',
      'this': 'هذا',
      'that': 'ذلك',
      'these': 'هؤلاء',
      'those': 'أولئك',
      'all': 'كل',
      'some': 'بعض',
      'any': 'أي',
      'many': 'كثير',
      'much': 'كثير',
      'more': 'أكثر',
      'most': 'معظم',
      'another': 'آخر',
      'such': 'مثل',
      'no': 'لا',
      'not': 'لا',
      'only': 'فقط',
      'own': 'خاص',
      'so': 'لذلك',
      'than': 'من',
      'too': 'أيضا',
      'very': 'جدا',
      'just': 'فقط',
      'where': 'أين',
      'when': 'متى',
      'why': 'لماذا',
      'how': 'كيف',
      'which': 'أي',
      'who': 'من',
      'what': 'ماذا',
    },
    ja: {
      // Navigation & UI
      'Home': 'ホーム',
      'Login': 'ログイン',
      'Logout': 'ログアウト',
      'Settings': '設定',
      'Profile': 'プロフィール',
      'Dashboard': 'ダッシュボード',
      'Welcome': 'ようこそ',
      'Hello': 'こんにちは',
      'Yes': 'はい',
      'No': 'いいえ',
      'Save': '保存',
      'Cancel': 'キャンセル',
      'Delete': '削除',
      'Edit': '編集',
      'Search': '検索',
      'New': '新規',
      'Add': '追加',
      'Remove': '削除',
      'Update': '更新',
      'Create': '作成',
      // Common words
      'The': 'その',
      'users': 'ユーザー',
      'you': 'あなた',
      'will': 'でしょう',
      'be': 'である',
      'able': 'できる',
      'to': 'に',
      'register': '登録',
      'with': 'と',
      'same': '同じ',
      'code': 'コード',
      'team': 'チーム',
      'from': 'から',
      'and': 'と',
      'friends': '友達',
      'promotional': 'プロモーション',
      'benefit': '利益',
      'credits': 'クレジット',
      'earned': '獲得した',
      'registration': '登録',
      'Dear': '親愛なる',
      'user': 'ユーザー',
      'happy': '嬉しい',
      'send': '送信',
      'platform': 'プラットフォーム',
      'allow': '許可',
      'access': 'アクセス',
      'exclusive': '限定',
      'services': 'サービス',
      'athletes': 'アスリート',
      'technicians': '技術者',
      'managers': 'マネージャー',
      'clubs': 'クラブ',
      'sports': 'スポーツ',
      'centers': 'センター',
      'taking': '取得',
      'advantage': '利点',
      'discounts': '割引',
      'benefits': 'メリット',
      // Daily common words
      'we': '私たち',
      'are': 'です',
      'have': '持っている',
      'can': 'できる',
      'also': 'また',
      'invite': '招待',
      'other': '他の',
      'turn': '順番',
      'levels': 'レベル',
      'sent': '送信された',
      'whom': '誰',
      'receive': '受け取る',
      'therefore': 'したがって',
      'in': 'に',
      'of': 'の',
      'for': 'のために',
      'on': 'で',
      'at': 'で',
      'by': 'によって',
      'is': 'です',
      'was': 'でした',
      'has': '持っている',
      'had': '持っていた',
      'do': 'する',
      'does': 'します',
      'did': 'しました',
      'could': 'できた',
      'would': 'でしょう',
      'should': 'すべき',
      'may': 'かもしれない',
      'might': 'かもしれない',
      'must': 'しなければならない',
      'shall': 'でしょう',
      'this': 'これ',
      'that': 'それ',
      'these': 'これら',
      'those': 'それら',
      'all': 'すべて',
      'some': 'いくつか',
      'any': '任意',
      'many': '多く',
      'much': '多く',
      'more': 'もっと',
      'most': 'ほとんど',
      'another': '別の',
      'such': 'そのような',
      'no': 'いいえ',
      'not': 'ではない',
      'only': 'のみ',
      'own': '自分の',
      'so': 'とても',
      'than': 'より',
      'too': 'も',
      'very': '非常に',
      'just': 'ちょうど',
      'where': 'どこ',
      'when': 'いつ',
      'why': 'なぜ',
      'how': 'どのように',
      'which': 'どれ',
      'who': '誰',
      'what': '何',
    },
    id: {
      // Navigation & UI
      'Home': 'Beranda',
      'Login': 'Masuk',
      'Logout': 'Keluar',
      'Settings': 'Pengaturan',
      'Profile': 'Profil',
      'Dashboard': 'Dasbor',
      'Welcome': 'Selamat datang',
      'Hello': 'Halo',
      'Yes': 'Ya',
      'No': 'Tidak',
      'Save': 'Simpan',
      'Cancel': 'Batal',
      'Delete': 'Hapus',
      'Edit': 'Edit',
      'Search': 'Cari',
      'New': 'Baru',
      'Add': 'Tambah',
      'Remove': 'Hapus',
      'Update': 'Perbarui',
      'Create': 'Buat',
      // Common words
      'The': 'Yang',
      'users': 'pengguna',
      'you': 'Anda',
      'will': 'akan',
      'be': 'menjadi',
      'able': 'mampu',
      'to': 'untuk',
      'register': 'daftar',
      'with': 'dengan',
      'same': 'sama',
      'code': 'kode',
      'team': 'tim',
      'from': 'dari',
      'and': 'dan',
      'friends': 'teman',
      'promotional': 'promosi',
      'benefit': 'manfaat',
      'credits': 'kredit',
      'earned': 'diperoleh',
      'registration': 'pendaftaran',
      'Dear': 'Yang terhormat',
      'user': 'pengguna',
      'happy': 'senang',
      'send': 'kirim',
      'platform': 'platform',
      'allow': 'izinkan',
      'access': 'akses',
      'exclusive': 'eksklusif',
      'services': 'layanan',
      'athletes': 'atlet',
      'technicians': 'teknisi',
      'managers': 'manajer',
      'clubs': 'klub',
      'sports': 'olahraga',
      'centers': 'pusat',
      'taking': 'mengambil',
      'advantage': 'keuntungan',
      'discounts': 'diskon',
      'benefits': 'manfaat',
      // Daily common words
      'we': 'kami',
      'are': 'adalah',
      'have': 'memiliki',
      'can': 'bisa',
      'also': 'juga',
      'invite': 'undang',
      'other': 'lain',
      'turn': 'giliran',
      'levels': 'tingkat',
      'sent': 'dikirim',
      'whom': 'siapa',
      'receive': 'menerima',
      'therefore': 'oleh karena itu',
      'in': 'di',
      'of': 'dari',
      'for': 'untuk',
      'on': 'pada',
      'at': 'di',
      'by': 'oleh',
      'is': 'adalah',
      'was': 'adalah',
      'has': 'memiliki',
      'had': 'memiliki',
      'do': 'lakukan',
      'does': 'melakukan',
      'did': 'melakukan',
      'could': 'bisa',
      'would': 'akan',
      'should': 'seharusnya',
      'may': 'mungkin',
      'might': 'mungkin',
      'must': 'harus',
      'shall': 'akan',
      'this': 'ini',
      'that': 'itu',
      'these': 'ini',
      'those': 'itu',
      'all': 'semua',
      'some': 'beberapa',
      'any': 'apapun',
      'many': 'banyak',
      'much': 'banyak',
      'more': 'lebih',
      'most': 'paling',
      'another': 'lain',
      'such': 'seperti',
      'no': 'tidak',
      'not': 'tidak',
      'only': 'hanya',
      'own': 'sendiri',
      'so': 'jadi',
      'than': 'daripada',
      'too': 'terlalu',
      'very': 'sangat',
      'just': 'hanya',
      'where': 'dimana',
      'when': 'kapan',
      'why': 'mengapa',
      'how': 'bagaimana',
      'which': 'yang',
      'who': 'siapa',
      'what': 'apa',
    },
  };

  // Check if we have a direct translation
  if (commonTranslations[lang] && commonTranslations[lang][text]) {
    return commonTranslations[lang][text];
  }

  // Preserve special characters and brackets
  const preservedChars: string[] = [];
  let processedText = text;
  
  // Extract and preserve special characters like [, ], {, }, etc.
  const specialPattern = /(\[.*?\]|\{.*?\}|\(.*?\)|<.*?>)/g;
  let match;
  let index = 0;
  
  while ((match = specialPattern.exec(text)) !== null) {
    preservedChars.push(match[0]);
    processedText = processedText.replace(match[0], `__PRESERVED_${index}__`);
    index++;
  }
  
  // Try to translate word by word (without special chars)
  const words = processedText.split(' ');
  let untranslatedCount = 0;
  
  const translatedWords = words.map(word => {
    // Check if this is a preserved placeholder
    if (word.includes('__PRESERVED_')) {
      return word;
    }
    
    // Remove punctuation for lookup but keep it
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    const punctuation = word.slice(cleanWord.length);
    
    // Try exact match
    if (commonTranslations[lang] && commonTranslations[lang][cleanWord]) {
      return commonTranslations[lang][cleanWord] + punctuation;
    }
    
    // Check with capital first letter
    const capitalWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    if (commonTranslations[lang] && commonTranslations[lang][capitalWord]) {
      return commonTranslations[lang][capitalWord] + punctuation;
    }
    
    // Check lowercase
    const lowerWord = cleanWord.toLowerCase();
    if (commonTranslations[lang] && commonTranslations[lang][lowerWord]) {
      return commonTranslations[lang][lowerWord] + punctuation;
    }
    
    // Word not found - keep original but count it
    untranslatedCount++;
    return word;
  });

  let result = translatedWords.join(' ');
  
  // Restore preserved special characters
  preservedChars.forEach((char, idx) => {
    result = result.replace(`__PRESERVED_${idx}__`, char);
  });
  
  // Add translation quality indicator
  console.log(`Translation quality for ${lang}: ${words.length - untranslatedCount}/${words.length} words translated`);
  
  return result;
}

 
 

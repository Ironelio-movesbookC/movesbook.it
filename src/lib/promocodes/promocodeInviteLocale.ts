import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import { getHelpHtmlPagesTable } from './legacyDb';
import { PROMOCODE_INVITE_LANGUAGE_VARIABLE } from './promocodeInviteLanguage';

/** Production PHP `help_html_pages` uniqueid for OTD (English id=2, Italian id=97). */
export const OTD_HELP_UNIQUE_ID = 'fghhfh5445646d';

export const DEFAULT_INVITE_PARAGRAPH_IT = `<p>Gentile utente,<br />
siamo lieti di inviarti il codice promozionale con cui potrai registrarti sulla piattaforma Movesbook e che ti consentir&agrave; di accedere a servizi esclusivi per atleti, tecnici e responsabili di club e centri sportivi, usufruendo di sconti e vantaggi.</p>
<p>Registrarti con il codice ricevuto ti consente di avere subito dei crediti utilizzabili come sconto per gli acquisti dei servizi disponibili su Movesbook.<br />
Lo stesso codice potr&agrave; essere da te utilizzato per invitare altri potenziali utenti che, una volta registrati, ti consentiranno di guadagnare ulteriori crediti in base al tipo di versione acquistata.</p>
<p>Gli utenti da te invitati potranno anche registrarsi con lo stesso codice promozionale e a loro volta invitare altri utenti con lo stesso codice promozionale.</p>
<p>Potrai beneficiare dei crediti guadagnati dall'iscrizione di 2 livelli di utenti a cui hai inviato il codice, pertanto riceverai crediti dall'iscrizione di amici e amici di amici</p>
<p>Il team di Movesbook</p>`;

/** Full Italian OTD document (paired with English OTD via uniqueid). */
export const DEFAULT_OTD_HELP_IT_CONTENT = `<div style="background:#eeeeee;border:1px solid #cccccc;padding:5px 10px;"><span style="font-size:14px;"><span style="color:#c0392b;"><strong>Documento di test ufficiale creato 5&nbsp;Marzo 2025 versione ITA</strong></span></span></div>

<h1><span style="color:#2980b9;"><strong><span style="font-size:24px;">Allenamento di forza per atleti di endurance</span></strong></span></h1>

<h2>Come iniziare con l&#39;allenamento di forza del core per gli sport di resistenza</h2>

<p><a href="https://sporttracks.mobi/users/sup3rus3r">SportTracks</a></p>

<p>Sebbene sia possibile per podisti, ciclisti, nuotatori e triatleti di lunga distanza allenarsi esclusivamente nel proprio sport, non si deve trascurare che la prestazione può beneficiare molto anche di un allenamento di forza costante. Continua a leggere per scoprire come esercizi semplici possono aiutarti a raggiungere nuovi record personali...</p>

<p>L&#39;allenamento di forza potrebbe non essere abbracciato da tutti gli atleti di endurance, ma moltissime persone ne hanno tratto vantaggio, soprattutto fuori stagione, quando hai più tempo per lavorare su qualità specifiche (invece di accumulare solo chilometri).</p>

<p>&nbsp;</p>

<p><em>Mantieni facili i giorni facili e dedica i giorni di riposo al riposo.</em></p>

<p>&nbsp;</p>

<p>Se sei all&#39;inizio, è meglio partire costruendo la forza del core con esercizi di base. Fin da subito dovresti aggiungere 30 minuti di questo allenamento due volte a settimana, preferibilmente nei giorni di cross-training o vicino a un allenamento di endurance più impegnativo. Mantieni facili i giorni facili e dedica i giorni di riposo al riposo.</p>

<p>Quali esercizi fare nelle routine bi-settimanali da 30 minuti? Alcune delle drills più popolari per atleti di endurance sono spiegate di seguito. Dovresti iniziare con esercizi a corpo libero per il core come plank e pliometria (spiegati sotto), oltre a piegamenti, squat, affondi e, se hai a disposizione una&nbsp;<a href="https://sporttracks.mobi/blog/how-to-use-sporttracks-with-rowing-apps-and-the-concept2">vogatore</a>, usalo.</p>

<h3>Questi allenamenti contano. Registrali.</h3>

<p>Il fatto che tu non stia correndo, pedalando o nuotando non significa che non debba registrare gli allenamenti di forza. Una sessione di 30 minuti influenza la condizione generale e, perché la sezione Training Load della&nbsp;<a href="https://sporttracks.mobi/health">pagina SportTracks Health</a>&nbsp;sia accurata, dovresti registrare e salvare questi allenamenti.</p>

<p><img alt="Schermata dei tipi di allenamento in palestra in SportTracks" src="https://cache.sporttracks.mobi/blog/images/2017/06/strength-training-sporttracks-sport-types-screenshot.png" /></p>

<p><a id="plank" name="plank"></a></p>

<p>Anche se inserisci solo un allenamento manuale, SportTracks offre molte attività che puoi applicare facilmente. Puoi indicare durata e intensità. Se hai un orologio sportivo e un cardiofrequenzimetro, usali per tracciare queste sessioni. Più dati registri, più accurate saranno le tue statistiche.&nbsp;</p>

<h3>Inizia con il plank</h3>

<p><img alt="Un uomo esegue il plank sulla spiaggia" src="https://cache.sporttracks.mobi/blog/images/2017/06/strength-training-male-plank-photo.jpg" /></p>

<p>Quando parliamo di plank non ci riferiamo alla moda internet del 2010. Ci sono molte varianti di questo esercizio statico, ma un buon modo per iniziare è il plank di base mostrato sopra:</p>

<ul>
	<li>Mettiti a terra e sostieni il peso su gomiti e punte dei piedi</li>
	<li>Tieni le spalle allineate sopra i gomiti</li>
	<li>Piedi leggermente divaricati</li>
	<li>Schiena dritta e testa in linea con la schiena</li>
	<li>Addome e glutei contratti</li>
	<li>Mantieni per 45 secondi fino a un minuto e ripeti 4 o 5 volte</li>
</ul>

<p><strong>Varianti del plank</strong></p>

<p><img alt="Una donna esegue un plank in palestra" src="https://cache.sporttracks.mobi/blog/images/2017/06/strength-training-standard-plank-photo.jpg" /></p>

<p>Invece di restare sui gomiti, passa alle mani, come nella posizione alta di un piegamento. Questo è il plank standard ed è un po&#39; più intenso. Tieni le mani sotto le spalle e la schiena dritta. Ancora: 45 secondi fino a un minuto, ripetuto 4 o 5 volte.</p>

<p><img alt="Una donna esegue un side plank" src="https://cache.sporttracks.mobi/blog/images/2017/06/strength-training-side-plank-photo.jpg" /></p>

<p>Il side plank lavora i lati del core, aumentando la forza complessiva. Sostieni il corpo con un braccio, piedi uno accanto all&#39;altro (come nella foto). Alzare il braccio opposto è opzionale e rende l&#39;esercizio più intenso. Ripeti su entrambi i lati per lavorare entrambi i lati del core.</p>
`;

function isBlankHtml(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

/** True when Italian row is still the EN body with only an ITA banner. */
function isStubItalianOtdContent(content: unknown): boolean {
  const html = String(content ?? '');
  if (isBlankHtml(html)) return true;
  return (
    html.includes('Strength Training for Endurance Athletes') ||
    html.includes('New document created on 3 March 2025')
  );
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    tableName
  );
  return rows.length > 0;
}

/**
 * Patch dev/bootstrap DB so promocode send-invite / htmlpage preview match PHP for OTD + Italian.
 * Idempotent — inserts missing Italian OTD, or replaces EN-stub Italian content.
 */
export async function ensurePromocodeInviteLocalizedContent(): Promise<void> {
  if (!(process.env.DATABASE_URL || '').startsWith('mysql')) return;

  if (await tableExists('language_paragraphs')) {
    const rows = await prisma.$queryRawUnsafe<
      { id: number; it: string | null; variable_name: string | null }[]
    >(
      `SELECT id, it, variable_name FROM language_paragraphs ORDER BY id ASC`
    );
    const inviteRow =
      rows.find((row) => row.variable_name === PROMOCODE_INVITE_LANGUAGE_VARIABLE) ??
      rows.find((row) => row.id === 3) ??
      rows[0];

    if (inviteRow && isBlankHtml(inviteRow.it)) {
      await prisma.$executeRawUnsafe(
        `UPDATE language_paragraphs SET it = ? WHERE id = ?`,
        DEFAULT_INVITE_PARAGRAPH_IT,
        inviteRow.id
      );
    }
  }

  const helpTable = await getHelpHtmlPagesTable();
  if (!helpTable || !(await tableExists(helpTable))) return;

  const columns = await getTableColumns(helpTable);
  const uniqueCol = columns.has('uniqueid') ? 'uniqueid' : null;
  const langCol = columns.has('lang_id') ? 'lang_id' : columns.has('language_id') ? 'language_id' : null;
  const titleCol = columns.has('page_title') ? 'page_title' : columns.has('title') ? 'title' : null;
  const contentCol = columns.has('content') ? 'content' : null;
  if (!langCol || !contentCol) return;

  if (uniqueCol) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${helpTable}\`
       SET \`${uniqueCol}\` = ?
       WHERE id = 2 AND (\`${uniqueCol}\` IS NULL OR TRIM(\`${uniqueCol}\`) = '')`,
      OTD_HELP_UNIQUE_ID
    );
  }

  const italianRows = await prisma.$queryRawUnsafe<{ id: number; content: string | null }[]>(
    uniqueCol
      ? `SELECT id, \`${contentCol}\` AS content FROM \`${helpTable}\` WHERE \`${uniqueCol}\` = ? AND \`${langCol}\` = 4 LIMIT 1`
      : `SELECT id, \`${contentCol}\` AS content FROM \`${helpTable}\` WHERE id = 97 AND \`${langCol}\` = 4 LIMIT 1`,
    ...(uniqueCol ? [OTD_HELP_UNIQUE_ID] : [])
  );

  if (italianRows.length > 0) {
    const row = italianRows[0];
    if (isStubItalianOtdContent(row.content)) {
      await prisma.$executeRawUnsafe(
        `UPDATE \`${helpTable}\` SET \`${contentCol}\` = ? WHERE id = ?`,
        DEFAULT_OTD_HELP_IT_CONTENT,
        row.id
      );
    }
    return;
  }

  const fields: string[] = [langCol, contentCol];
  const placeholders: string[] = ['?', '?'];
  const values: unknown[] = [4, DEFAULT_OTD_HELP_IT_CONTENT];

  if (uniqueCol) {
    fields.unshift(uniqueCol);
    placeholders.unshift('?');
    values.unshift(OTD_HELP_UNIQUE_ID);
  }
  if (titleCol) {
    fields.push(titleCol);
    placeholders.push('?');
    values.push('DTU');
  }
  if (columns.has('user_id')) {
    fields.push('user_id');
    placeholders.push('?');
    values.push(1);
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${helpTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
       VALUES (${placeholders.join(', ')})`,
      ...values
    );
  } catch (err) {
    console.warn('promocode invite Italian help_html_pages seed skipped:', err);
  }
}

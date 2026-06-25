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

const OTD_HELP_IT_HEADER = `<div style="background:#eeeeee;border:1px solid #cccccc;padding:5px 10px;"><span style="font-size:14px;"><span style="color:#c0392b;"><strong>Documento di test ufficiale creato 5&nbsp;Marzo 2025 versione ITA</strong></span></span></div>`;

function isBlankHtml(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
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
 * Patch dev/bootstrap DB so promocode send-invite matches PHP for OTD + Italian.
 * Idempotent — safe on production (only fills missing localized rows).
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

  const italianRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
    uniqueCol
      ? `SELECT id FROM \`${helpTable}\` WHERE \`${uniqueCol}\` = ? AND \`${langCol}\` = 4 LIMIT 1`
      : `SELECT id FROM \`${helpTable}\` WHERE id = 97 AND \`${langCol}\` = 4 LIMIT 1`,
    ...(uniqueCol ? [OTD_HELP_UNIQUE_ID] : [])
  );

  if (italianRows.length > 0) return;

  const englishRows = await prisma.$queryRawUnsafe<{ content: string | null }[]>(
    `SELECT \`${contentCol}\` AS content FROM \`${helpTable}\` WHERE id = 2 LIMIT 1`
  );
  const englishBody = englishRows[0]?.content ?? '';
  const italianContent = `${OTD_HELP_IT_HEADER}\n\n${englishBody}`;

  const fields: string[] = [langCol, contentCol];
  const placeholders: string[] = ['?', '?'];
  const values: unknown[] = [4, italianContent];

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

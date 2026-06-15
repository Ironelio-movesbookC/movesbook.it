import mysql from 'mysql2/promise';
import { prisma } from '@/lib/prisma';
import { findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';
import { clearPromocodeTableCache, ensureLegacyPromocodeUserTables } from './legacyDb';
import { resetQuickRegisterSubscriptionSeedCache } from '../users/quickRegisterSubscriptionSeed';
import legacyHelpHtmlPages from './helpHtmlPagesLegacySeed.json';

export type LegacyDbConfig = {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
};

export function getLegacyDbConfig(): LegacyDbConfig | null {
  const legacyUrl = process.env.LEGACY_DATABASE_URL || process.env.LEGACY_DB_URL;
  if (legacyUrl) {
    try {
      const parsed = new URL(legacyUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, ''),
      };
    } catch {
      return null;
    }
  }

  const prodLegacyUrl = process.env.PROD_DATABASE_URL || process.env.PROD_DB_URL;
  if (prodLegacyUrl) {
    try {
      const parsed = new URL(prodLegacyUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, ''),
      };
    } catch {
      return null;
    }
  }

  const host = process.env.LEGACY_DB_HOST;
  const user = process.env.LEGACY_DB_USER;
  const database = process.env.LEGACY_DB_NAME;
  if (!host || !user || !database) return null;

  return {
    host,
    port: Number(process.env.LEGACY_DB_PORT || 3306),
    user,
    password: process.env.LEGACY_DB_PASSWORD || undefined,
    database,
  };
}

export async function withLegacyConnection<T>(
  fn: (connection: mysql.Connection) => Promise<T>
): Promise<T | null> {
  const config = getLegacyDbConfig();
  if (!config) return null;

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

const SUBSCRIPTION_TABLE_CANDIDATES = ['subscription_settings'];
const HELP_PAGES_TABLE_CANDIDATES = ['help_html_pages'];
const LANGUAGE_TABLE_CANDIDATES = ['language_values'];

const DEFAULT_SUBSCRIPTIONS: { id: number; name: string }[] = [
  { id: 1, name: 'Single User — Trial' },
  { id: 2, name: 'Single User — Base' },
  { id: 3, name: 'Single User — Premium' },
  { id: 4, name: 'Single User — Professional' },
  { id: 5, name: 'Coach — Base' },
  { id: 6, name: 'Coach — Premium' },
  { id: 7, name: 'Team — Base' },
  { id: 8, name: 'Group — Base' },
  { id: 9, name: 'Club — Base' },
  { id: 10, name: 'Club — Premium' },
  { id: 11, name: 'Club — Professional' },
];

const LEGACY_HELP_HTML_PAGES: { id: number; title: string; langId: number; content: string }[] =
  legacyHelpHtmlPages.map((row) => ({
    id: row.id,
    title: row.title,
    langId: row.langId,
    content: row.content ?? '',
  }));

const DEFAULT_LANGUAGES: { id: number; name: string }[] = [
  { id: 1, name: 'en' },
  { id: 4, name: 'it' },
];

const DEFAULT_INVITE_PARAGRAPH_EN = `<p>Dear user,&nbsp;<br />
we are happy to send you the promotional code with which you can register on the Movesbook platform and which will allow you to access exclusive services for athletes, technicians and managers of clubs and sports centers, taking advantage of discounts and benefits.</p>
<p>Registering with the code received allows you to immediately have credits that can be used as a discount for purchases of services available on Movesbook.<br />
The same code can be used by you to invite other potential users who, once registered, will allow you to earn further credits based on the type of version purchased.&nbsp;</p>
<p>The users you invite will also be able to register with the same promotional code and in turn invite other users with the same promo code.</p>
<p>You will be able to benefit from the credits earned from the registration of 2 levels of users to whom you have sent the code, therefore you will receive credits from the registration of friends and friends of friends</p>
<p>The Movesbook team</p>`;

async function seedHelpHtmlPagesFromLegacy(): Promise<void> {
  if (!(await tableExists('help_html_pages'))) return;

  for (const row of LEGACY_HELP_HTML_PAGES) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO help_html_pages (id, page_title, lang_id, content, created)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         page_title = VALUES(page_title),
         lang_id = VALUES(lang_id),
         content = VALUES(content)`,
      row.id,
      row.title,
      row.langId,
      row.content
    );
  }
}


async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    tableName
  );
  return rows.length > 0;
}

async function countRows(tableName: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
    `SELECT COUNT(*) AS c FROM \`${tableName}\``
  );
  return Number(rows[0]?.c ?? 0);
}

/** Create minimal legacy meta tables in the app DB when missing (local/dev bootstrap). */
export async function ensurePromocodeMetaTables(): Promise<void> {
  if (!(process.env.DATABASE_URL || '').startsWith('mysql')) return;

  if (!(await tableExists('subscription_settings'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE subscription_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        subscription_name VARCHAR(255) NOT NULL DEFAULT '',
        short_name VARCHAR(64) NULL,
        role_id INT NULL,
        price DECIMAL(10,2) NULL,
        credit1 VARCHAR(32) NULL,
        delete_status TINYINT NULL DEFAULT 2
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  if (!(await tableExists('help_html_pages'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE help_html_pages (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        page_title VARCHAR(255) NOT NULL,
        lang_id INT NOT NULL DEFAULT 1,
        uniqueid VARCHAR(64) NULL,
        user_id INT NULL,
        content MEDIUMTEXT NULL,
        created DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } else {
    const helpColumns = await getTableColumns('help_html_pages');
    if (!helpColumns.has('content')) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE help_html_pages ADD COLUMN content MEDIUMTEXT NULL`
      );
    }
  }

  if (!(await tableExists('language_values'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE language_values (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        lang_name VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  if (!(await tableExists('language_paragraphs'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE language_paragraphs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        en MEDIUMTEXT NOT NULL,
        fr MEDIUMTEXT NOT NULL,
        it MEDIUMTEXT NOT NULL,
        de MEDIUMTEXT NOT NULL,
        es MEDIUMTEXT NOT NULL,
        por MEDIUMTEXT NOT NULL,
        rus MEDIUMTEXT NOT NULL,
        ind MEDIUMTEXT NOT NULL,
        chin MEDIUMTEXT NOT NULL,
        arab MEDIUMTEXT NOT NULL,
        variable_name VARCHAR(255) NOT NULL DEFAULT '',
        created VARCHAR(64) NOT NULL DEFAULT '',
        modified VARCHAR(64) NOT NULL DEFAULT ''
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  if (!(await tableExists('promocode_settings'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE promocode_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        usable_by VARCHAR(16) NOT NULL DEFAULT 'Once',
        used INT NOT NULL DEFAULT 0,
        version_id VARCHAR(100) NOT NULL DEFAULT '',
        discount INT NOT NULL DEFAULT 0,
        enable VARCHAR(16) NOT NULL DEFAULT 'Disable',
        enable_extension INT NULL DEFAULT 0,
        subscription_extends INT NULL,
        social_options VARCHAR(500) NULL,
        management_section VARCHAR(50) NULL,
        enable_free_accounts INT NULL DEFAULT 0,
        basic_version VARCHAR(100) NULL,
        premium_version VARCHAR(100) NULL,
        professional_version VARCHAR(100) NULL,
        delete_status INT NOT NULL DEFAULT 2,
        delete_date DATE NULL,
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        email VARCHAR(255) NULL,
        recipient VARCHAR(50) NULL,
        help_html_pages_id VARCHAR(20) NULL,
        creater_id VARCHAR(50) NULL,
        creator_id INT NULL,
        language_id VARCHAR(10) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  if (!(await tableExists('promocode_applies'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE promocode_applies (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        promocode_id INT NOT NULL DEFAULT 0,
        delete_status INT NOT NULL DEFAULT 2,
        delete_date DATE NULL,
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        sender_email VARCHAR(255) NULL,
        receiver_email VARCHAR(255) NULL,
        sender_id INT NULL DEFAULT 0,
        receiver_id INT NULL DEFAULT 0,
        sender_credit VARCHAR(32) NULL,
        receiver_credit VARCHAR(32) NULL,
        receiver_version VARCHAR(32) NULL,
        secondary_sender_id INT NULL,
        secondary_sender_username VARCHAR(255) NULL,
        secondary_sender_credit VARCHAR(32) NULL,
        new_receiver VARCHAR(8) NULL,
        level VARCHAR(20) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  if ((await countRows('subscription_settings')) === 0) {
    const roleById: Record<number, number> = {
      1: 5,
      2: 5,
      3: 5,
      4: 5,
      9: 8,
      10: 8,
      11: 8,
    };
    for (const row of DEFAULT_SUBSCRIPTIONS) {
      const roleId = roleById[row.id];
      if (roleId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO subscription_settings (id, subscription_name, role_id, delete_status)
           VALUES (?, ?, ?, 2)`,
          row.id,
          row.name,
          roleId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO subscription_settings (id, subscription_name, delete_status)
           VALUES (?, ?, 2)`,
          row.id,
          row.name
        );
      }
    }
  }

  await seedHelpHtmlPagesFromLegacy();
  await ensureLegacyPromocodeUserTables();

  if ((await countRows('language_values')) === 0) {
    for (const row of DEFAULT_LANGUAGES) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO language_values (id, lang_name) VALUES (?, ?)`,
        row.id,
        row.name
      );
    }
  } else if (await tableExists('language_values')) {
    await prisma.$executeRawUnsafe(
      `UPDATE language_values SET lang_name = 'en' WHERE id = 1 AND LOWER(lang_name) = 'english'`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE language_values SET lang_name = 'it' WHERE id = 4 AND LOWER(lang_name) IN ('italian', 'italiano')`
    );
  }

  if ((await countRows('language_paragraphs')) === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO language_paragraphs (
         id, en, fr, it, de, es, por, rus, ind, chin, arab, variable_name, created, modified
       ) VALUES (?, ?, '', '', '', '', '', '', '', '', '', 'dim', ?, ?)`,
      3,
      DEFAULT_INVITE_PARAGRAPH_EN,
      String(Math.floor(Date.now() / 1000)),
      String(Math.floor(Date.now() / 1000))
    );
  }

  if (await tableExists('promocode_applies')) {
    const applyColumns = await getTableColumns('promocode_applies');
    if (!applyColumns.has('other_info')) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE promocode_applies ADD COLUMN other_info VARCHAR(512) NULL DEFAULT NULL`
      );
    }
    if (!applyColumns.has('adv_page')) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE promocode_applies ADD COLUMN adv_page VARCHAR(512) NULL DEFAULT NULL`
      );
    }
  }

  clearPromocodeTableCache();
  resetQuickRegisterSubscriptionSeedCache();
}

function pickColumn(columns: Set<string>, candidates: string[]): string | null {
  return candidates.find((c) => columns.has(c)) ?? null;
}

export async function loadSubscriptionsFromTable(
  query: <T>(sql: string, params?: unknown[]) => Promise<T>
): Promise<{ id: number; name: string }[]> {
  const table =
    (await findExistingTable(SUBSCRIPTION_TABLE_CANDIDATES)) ?? 'subscription_settings';
  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const nameCol = pickColumn(columns, ['subscription_name', 'name']) ?? 'subscription_name';
  const deleteCol = pickColumn(columns, ['delete_status']);

  let sql = `SELECT \`${idCol}\` AS id, \`${nameCol}\` AS subscription_name
             FROM \`${table}\``;
  if (deleteCol) sql += ` WHERE \`${deleteCol}\` = 2 OR \`${deleteCol}\` IS NULL`;
  sql += ` ORDER BY \`${idCol}\` ASC`;

  const rows = await query<{ id: number | bigint; subscription_name: string | null }[]>(sql);
  return rows
    .map((row) => ({
      id: Number(row.id),
      name: row.subscription_name ? String(row.subscription_name).trim() : '',
    }))
    .filter((row) => row.name !== '');
}

export async function loadHelpHtmlPagesFromTable(
  query: <T>(sql: string, params?: unknown[]) => Promise<T>
): Promise<{ id: number; title: string }[]> {
  const table = (await findExistingTable(HELP_PAGES_TABLE_CANDIDATES)) ?? 'help_html_pages';
  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const titleCol = pickColumn(columns, ['page_title', 'title']) ?? 'page_title';
  const langCol = pickColumn(columns, ['lang_id', 'language_id']);

  let sql = `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title FROM \`${table}\``;
  const params: unknown[] = [];
  if (langCol) {
    sql += ` WHERE \`${langCol}\` = ?`;
    params.push(1);
  }
  sql += ` ORDER BY \`${idCol}\` DESC`;

  let rows = await query<{ id: number | bigint; page_title: string | null }[]>(sql, params);

  if (rows.length === 0 && langCol) {
    rows = await query<{ id: number | bigint; page_title: string | null }[]>(
      `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title FROM \`${table}\` ORDER BY \`${idCol}\` DESC`
    );
  }

  return rows
    .map((row) => ({
      id: Number(row.id),
      title: row.page_title ? String(row.page_title).trim() : '',
    }))
    .filter((row) => row.title !== '');
}

export async function loadLanguagesFromTable(
  query: <T>(sql: string, params?: unknown[]) => Promise<T>
): Promise<{ id: number; name: string }[]> {
  const table = (await findExistingTable(LANGUAGE_TABLE_CANDIDATES)) ?? 'language_values';
  const columns = await getTableColumns(table);
  const idCol = pickColumn(columns, ['id']) ?? 'id';
  const nameCol = pickColumn(columns, ['lang_name', 'name']) ?? 'lang_name';

  const rows = await query<{ id: number | bigint; lang_name: string | null }[]>(
    `SELECT \`${idCol}\` AS id, \`${nameCol}\` AS lang_name FROM \`${table}\` ORDER BY \`${idCol}\` ASC`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.lang_name ? String(row.lang_name) : `Lang ${row.id}`,
  }));
}

export {
  SUBSCRIPTION_TABLE_CANDIDATES,
  HELP_PAGES_TABLE_CANDIDATES,
  LANGUAGE_TABLE_CANDIDATES,
};

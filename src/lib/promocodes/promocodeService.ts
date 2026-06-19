import { serialize, unserialize } from 'php-serialize';
import {
  PROMOCODE_FORM_LANGUAGES,
  PROMOCODE_FORM_LANGUAGE_IDS,
  formatPromocodeLanguageLabel,
} from './promocodeLanguages';
import { prisma } from '@/lib/prisma';
import {
  ensurePromocodeMetaTables,
  getDefaultPromocodeMeta,
  loadHelpHtmlPagesFromTable,
  loadLanguagesFromTable,
  loadSubscriptionsFromTable,
  withLegacyConnection,
} from './ensureMetaTables';
import {
  fetchCountryCodeById,
  fetchFlagImageByCountryId,
  fetchLegacyUsersByIds,
  fetchLegacyUserByEmail,
  findLegacyUsersByKeyword,
  getHelpHtmlPagesTable,
  getLanguageValuesTable,
  getPromocodeAppliesTable,
  getPromocodeSettingsTable,
  getSettingsColumns,
  getSubscriptionSettingsTable,
  legacyUserExistsByEmail,
} from './legacyDb';
import type {
  LegacyUserSnippet,
  PaginatedResult,
  PromocodeApplyRow,
  PromocodeListFilters,
  PromocodeMeta,
  PromocodeSettingFormData,
  PromocodeSettingRow,
} from './types';

function formatDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatDateTime(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function pickOrder(orderBy: string | undefined, defaultField: string): { field: string; dir: 'ASC' | 'DESC' } {
  if (orderBy === 'created_asc') return { field: defaultField, dir: 'ASC' };
  if (orderBy === 'created_desc' || orderBy === 'created') return { field: defaultField, dir: 'DESC' };
  if (orderBy === 'usable_by') return { field: 'usable_by', dir: 'DESC' };
  if (orderBy === 'valid_from') return { field: 'valid_from', dir: 'DESC' };
  if (orderBy === 'version_id') return { field: 'version_id', dir: 'DESC' };
  return { field: defaultField, dir: 'DESC' };
}

async function resolveSecondarySender(
  apply: Record<string, unknown>,
  senderUser: LegacyUserSnippet | null,
  registeredUser: LegacyUserSnippet | null,
  appliesTable: string
): Promise<{ apply: Record<string, unknown>; secondarySender: LegacyUserSnippet | null }> {
  let secondarySenderUsername =
    apply.secondary_sender_username != null ? String(apply.secondary_sender_username) : '';
  let secondarySenderCredit = apply.secondary_sender_credit;
  let secondarySender: LegacyUserSnippet | null = null;

  const secondarySenderId =
    apply.secondary_sender_id != null ? Number(apply.secondary_sender_id) : 0;
  if (secondarySenderId > 0) {
    const users = await fetchLegacyUsersByIds([secondarySenderId]);
    secondarySender = users.get(secondarySenderId) ?? null;
  }

  const senderId = apply.sender_id != null ? Number(apply.sender_id) : senderUser?.id ?? 0;
  let senderEmail =
    apply.sender_email != null ? String(apply.sender_email).trim().toLowerCase() : '';
  let senderUsername = senderUser?.username?.trim().toLowerCase() ?? '';

  if (senderId > 0 && (!senderEmail || !senderUsername)) {
    const users = await fetchLegacyUsersByIds([senderId]);
    const sender = users.get(senderId);
    if (sender) {
      if (!senderEmail && sender.email) senderEmail = sender.email.toLowerCase();
      if (!senderUsername && sender.username) senderUsername = sender.username.toLowerCase();
    }
  }

  if (!secondarySender && (senderId > 0 || senderEmail || senderUsername)) {
    const orParts: string[] = [];
    const params: unknown[] = [];
    if (senderId > 0) {
      orParts.push('receiver_id = ?');
      params.push(senderId);
    }
    if (senderEmail) {
      orParts.push('LOWER(receiver_email) = ?');
      params.push(senderEmail);
    }
    if (senderUsername) {
      orParts.push('LOWER(receiver_email) = ?');
      params.push(senderUsername);
    }

    if (orParts.length > 0) {
      const secondaryRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT sender_id, sender_email FROM \`${appliesTable}\`
         WHERE delete_status = 2 AND receiver_id > 0 AND (${orParts.join(' OR ')})
         ORDER BY id DESC LIMIT 1`,
        ...params
      );
      const sec = secondaryRows[0];
      if (sec) {
        const secSenderId = sec.sender_id != null ? Number(sec.sender_id) : 0;
        if (secSenderId > 0) {
          const users = await fetchLegacyUsersByIds([secSenderId]);
          secondarySender = users.get(secSenderId) ?? null;
        } else if (sec.sender_email) {
          secondarySender = await fetchLegacyUserByEmail(String(sec.sender_email));
        }
      }
    }
  }

  if (!secondarySenderUsername && secondarySender?.username) {
    secondarySenderUsername = secondarySender.username;
    apply = { ...apply, secondary_sender_username: secondarySenderUsername };
  }

  const creditMissing = ['', '0', '0.00', '00'].includes(String(secondarySenderCredit ?? ''));
  if (creditMissing && secondarySenderUsername && registeredUser?.subscriptionSettingId) {
    const subTable = await getSubscriptionSettingsTable();
    if (subTable) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT credit1 FROM \`${subTable}\` WHERE id = ? LIMIT 1`,
        registeredUser.subscriptionSettingId
      );
      if (rows[0]?.credit1 != null) {
        secondarySenderCredit = rows[0].credit1;
        apply = { ...apply, secondary_sender_credit: secondarySenderCredit };
      }
    }
  }

  return { apply, secondarySender };
}

async function buildApplyRows(
  applyRecords: Record<string, unknown>[],
  includePromocodeMeta: boolean
): Promise<PromocodeApplyRow[]> {
  const userIds: number[] = [];
  const promocodeIds: number[] = [];

  for (const row of applyRecords) {
    if (row.sender_id) userIds.push(Number(row.sender_id));
    if (row.receiver_id) userIds.push(Number(row.receiver_id));
    if (row.promocode_id) promocodeIds.push(Number(row.promocode_id));
  }

  const users = await fetchLegacyUsersByIds(userIds);
  const promocodeCodeMap = new Map<number, string>();
  const promocodeValidToMap = new Map<number, string>();

  if (includePromocodeMeta && promocodeIds.length > 0) {
    const settingsTable = await getPromocodeSettingsTable();
    if (settingsTable) {
      const uniquePromocodeIds = Array.from(new Set(promocodeIds));
      const placeholders = uniquePromocodeIds.map(() => '?').join(',');
      const settings = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, code, valid_to FROM \`${settingsTable}\` WHERE id IN (${placeholders})`,
        ...uniquePromocodeIds
      );
      for (const s of settings) {
        const id = Number(s.id);
        promocodeCodeMap.set(id, s.code != null ? String(s.code) : '');
        promocodeValidToMap.set(id, formatDate(s.valid_to) ?? '');
      }
    }
  }

  const appliesTable = (await getPromocodeAppliesTable()) ?? '';
  const results: PromocodeApplyRow[] = [];

  for (const raw of applyRecords) {
    const sender = raw.sender_id ? users.get(Number(raw.sender_id)) ?? null : null;
    const receiver =
      raw.receiver_id && Number(raw.receiver_id) > 0
        ? users.get(Number(raw.receiver_id)) ?? null
        : null;

    const receiverEmail = raw.receiver_email != null ? String(raw.receiver_email).trim() : '';
    const existReceiverMatch = receiverEmail ? await legacyUserExistsByEmail(receiverEmail) : false;

    const resolved = await resolveSecondarySender(raw, sender, receiver, appliesTable);
    const apply = resolved.apply;
    const promocodeId = apply.promocode_id != null ? Number(apply.promocode_id) : null;
    const flagImage = await fetchFlagImageByCountryId(receiver?.countryId ?? null);

    results.push({
      id: Number(apply.id),
      promocodeId,
      created: formatDateTime(apply.created),
      receiverEmail: receiverEmail || null,
      receiverId: apply.receiver_id != null ? Number(apply.receiver_id) : null,
      senderId: apply.sender_id != null ? Number(apply.sender_id) : null,
      senderCredit: apply.sender_credit != null ? String(apply.sender_credit) : null,
      receiverCredit: apply.receiver_credit != null ? String(apply.receiver_credit) : null,
      receiverVersion: apply.receiver_version != null ? String(apply.receiver_version) : null,
      secondarySenderUsername:
        apply.secondary_sender_username != null ? String(apply.secondary_sender_username) : null,
      secondarySenderCredit:
        apply.secondary_sender_credit != null ? String(apply.secondary_sender_credit) : null,
      newReceiver: apply.new_receiver != null ? String(apply.new_receiver) : null,
      sender,
      receiver,
      secondarySender: resolved.secondarySender,
      existReceiverMatch,
      promocodeCode: promocodeId != null ? promocodeCodeMap.get(promocodeId) ?? '' : '',
      promocodeValidTo: promocodeId != null ? promocodeValidToMap.get(promocodeId) ?? '' : '',
      flagImage,
    });
  }

  return results;
}

export async function listPromocodeApplies(
  filters: PromocodeListFilters & { promocodeId?: number; senderScopeUserId?: number }
): Promise<PaginatedResult<PromocodeApplyRow>> {
  const appliesTable = await getPromocodeAppliesTable();
  if (!appliesTable) {
    return { items: [], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const { field, dir } = pickOrder(filters.orderBy, 'created');

  const where: string[] = ['delete_status = 2'];
  const params: unknown[] = [];

  if (filters.registeredOnly) {
    where.push('receiver_id > 0');
  }

  if (filters.promocodeId) {
    where.push('promocode_id = ?');
    params.push(filters.promocodeId);
  }

  if (filters.search?.trim()) {
    const matchingIds = await findLegacyUsersByKeyword(filters.search);
    const orParts: string[] = ['receiver_email LIKE ?'];
    params.push(`%${filters.search.trim()}%`);
    if (matchingIds.length > 0) {
      const placeholders = matchingIds.map(() => '?').join(',');
      orParts.push(`sender_id IN (${placeholders})`, `receiver_id IN (${placeholders})`);
      params.push(...matchingIds, ...matchingIds);
    }
    where.push(`(${orParts.join(' OR ')})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRows = await prisma.$queryRawUnsafe<{ total: bigint | number }[]>(
    `SELECT COUNT(*) AS total FROM \`${appliesTable}\` ${whereSql}`,
    ...params
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${appliesTable}\` ${whereSql}
     ORDER BY \`${field}\` ${dir}
     LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const items = await buildApplyRows(rows, true);
  return { items, total, page, pageSize };
}

export async function listPromocodeSettings(
  filters: PromocodeListFilters
): Promise<PaginatedResult<PromocodeSettingRow>> {
  await ensurePromocodeMetaTables();

  const settingsTable = await getPromocodeSettingsTable();
  const appliesTable = await getPromocodeAppliesTable();
  if (!settingsTable) {
    return { items: [], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? 5 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 5));
  const offset = (page - 1) * pageSize;
  const { field, dir } = pickOrder(filters.orderBy, 'created');

  const where: string[] = ['delete_status = 2'];
  const params: unknown[] = [];

  if (filters.usableBy) {
    where.push('usable_by = ?');
    params.push(filters.usableBy);
  }

  if (filters.versionId) {
    where.push('version_id LIKE ?');
    params.push(`%${filters.versionId}%`);
  }

  if (filters.available === 'current') {
    where.push('valid_to > CURDATE()');
  } else if (filters.available === 'expired') {
    where.push('valid_to < CURDATE()');
  }

  if (filters.search?.trim() && appliesTable) {
    const matchingIds = await findLegacyUsersByKeyword(filters.search);
    if (matchingIds.length > 0) {
      const userPlaceholders = matchingIds.map(() => '?').join(',');
      const promoRows = await prisma.$queryRawUnsafe<{ promocode_id: number | bigint }[]>(
        `SELECT DISTINCT promocode_id FROM \`${appliesTable}\`
         WHERE user_id IN (${userPlaceholders}) AND delete_status = 2`,
        ...matchingIds
      );
      const promoIds = promoRows.map((r) => Number(r.promocode_id)).filter((id) => Number.isFinite(id));
      if (promoIds.length > 0) {
        where.push(`id IN (${promoIds.map(() => '?').join(',')})`);
        params.push(...promoIds);
      } else {
        where.push('1 = 0');
      }
    } else {
      where.push('1 = 0');
    }
  } else if (appliesTable) {
    const deletedPromoRows = await prisma.$queryRawUnsafe<{ promocode_id: number | bigint }[]>(
      `SELECT promocode_id FROM \`${appliesTable}\` WHERE delete_status = 1`
    );
    const deletedIds = Array.from(new Set(deletedPromoRows.map((r) => Number(r.promocode_id))));
    const allRows = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT id FROM \`${settingsTable}\` WHERE delete_status = 2`
    );
    const allIds = allRows.map((r) => Number(r.id));
    const filteredIds = allIds.filter((id) => !deletedIds.includes(id));
    if (filteredIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }
    where.push(`id IN (${filteredIds.map(() => '?').join(',')})`);
    params.push(...filteredIds);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRows = await prisma.$queryRawUnsafe<{ total: bigint | number }[]>(
    `SELECT COUNT(*) AS total FROM \`${settingsTable}\` ${whereSql}`,
    ...params
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${settingsTable}\` ${whereSql}
     ORDER BY \`${field}\` ${dir}
     LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset
  );

  const creatorIds = rows
    .map((r) => Number(r.creater_id ?? r.creator_id ?? 0))
    .filter((id) => id > 0);
  const creators = await fetchLegacyUsersByIds(creatorIds);

  const items: PromocodeSettingRow[] = [];
  for (const row of rows) {
    const id = Number(row.id);
    const creatorId = Number(row.creater_id ?? row.creator_id ?? 0);
    const creator = creatorId > 0 ? creators.get(creatorId) ?? null : null;
    const creatorFlagImage = await fetchFlagImageByCountryId(creator?.countryId ?? null);
    const creatorCountryCode = await fetchCountryCodeById(creator?.countryId ?? null);

    let inviteEmails: string[] = [];
    if (appliesTable) {
      const applyList = await prisma.$queryRawUnsafe<{ receiver_email: string | null }[]>(
        `SELECT receiver_email FROM \`${appliesTable}\`
         WHERE promocode_id = ? AND delete_status = 2`,
        id
      );
      inviteEmails = applyList
        .map((a) => (a.receiver_email ? String(a.receiver_email).trim() : ''))
        .filter(Boolean);
    }

    const versionId = row.version_id != null ? String(row.version_id) : '';
    const versionCount = versionId ? versionId.split(',').filter(Boolean).length : 0;

    items.push({
      id,
      code: row.code != null ? String(row.code) : null,
      createrId: creatorId || null,
      validFrom: formatDate(row.valid_from),
      validTo: formatDate(row.valid_to),
      enable: row.enable != null ? String(row.enable) : null,
      usableBy: row.usable_by != null ? String(row.usable_by) : null,
      versionId: versionId || null,
      discount: row.discount != null ? String(row.discount) : null,
      enableExtension: row.enable_extension != null ? String(row.enable_extension) : null,
      subscriptionExtends: row.subscription_extends != null ? String(row.subscription_extends) : null,
      managementSection: row.management_section != null ? String(row.management_section) : null,
      socialOptions: row.social_options != null ? String(row.social_options) : null,
      enableFreeAccounts: row.enable_free_accounts != null ? String(row.enable_free_accounts) : null,
      basicVersion: row.basic_version != null ? String(row.basic_version) : null,
      premiumVersion: row.premium_version != null ? String(row.premium_version) : null,
      professionalVersion: row.professional_version != null ? String(row.professional_version) : null,
      languageId: row.language_id != null ? Number(row.language_id) : null,
      helpHtmlPagesId: row.help_html_pages_id != null ? Number(row.help_html_pages_id) : null,
      email: row.email != null ? String(row.email) : null,
      recipient: row.recipient != null ? String(row.recipient) : null,
      used: row.used != null ? Number(row.used) : null,
      created: formatDateTime(row.created),
      inviteCount: inviteEmails.length,
      inviteEmails,
      creator,
      creatorFlagImage,
      creatorCountryCode,
      versionCount,
    });
  }

  return { items, total, page, pageSize };
}

export async function getPromocodeSettingById(id: number): Promise<PromocodeSettingRow | null> {
  const settingsTable = await getPromocodeSettingsTable();
  if (!settingsTable) return null;

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${settingsTable}\` WHERE id = ? AND delete_status = 2 LIMIT 1`,
    id
  );
  if (!rows[0]) return null;

  const row = rows[0];
  const creatorId = Number(row.creater_id ?? row.creator_id ?? 0);
  const creators = await fetchLegacyUsersByIds(creatorId > 0 ? [creatorId] : []);
  const creator = creatorId > 0 ? creators.get(creatorId) ?? null : null;

  return {
    id: Number(row.id),
    code: row.code != null ? String(row.code) : null,
    createrId: creatorId || null,
    validFrom: formatDate(row.valid_from),
    validTo: formatDate(row.valid_to),
    enable: row.enable != null ? String(row.enable) : null,
    usableBy: row.usable_by != null ? String(row.usable_by) : null,
    versionId: row.version_id != null ? String(row.version_id) : null,
    discount: row.discount != null ? String(row.discount) : null,
    enableExtension: row.enable_extension != null ? String(row.enable_extension) : null,
    subscriptionExtends: row.subscription_extends != null ? String(row.subscription_extends) : null,
    managementSection: row.management_section != null ? String(row.management_section) : null,
    socialOptions: row.social_options != null ? String(row.social_options) : null,
    enableFreeAccounts: row.enable_free_accounts != null ? String(row.enable_free_accounts) : null,
    basicVersion: row.basic_version != null ? String(row.basic_version) : null,
    premiumVersion: row.premium_version != null ? String(row.premium_version) : null,
    professionalVersion: row.professional_version != null ? String(row.professional_version) : null,
    languageId: row.language_id != null ? Number(row.language_id) : null,
    helpHtmlPagesId: row.help_html_pages_id != null ? Number(row.help_html_pages_id) : null,
    email: row.email != null ? String(row.email) : null,
    recipient: row.recipient != null ? String(row.recipient) : null,
    used: row.used != null ? Number(row.used) : null,
    created: formatDateTime(row.created),
    inviteCount: 0,
    inviteEmails: [],
    creator,
    creatorFlagImage: await fetchFlagImageByCountryId(creator?.countryId ?? null),
    creatorCountryCode: await fetchCountryCodeById(creator?.countryId ?? null),
    versionCount: row.version_id ? String(row.version_id).split(',').filter(Boolean).length : 0,
  };
}

export async function getPromocodeMeta(): Promise<PromocodeMeta> {
  try {
    await ensurePromocodeMetaTables();
  } catch (err) {
    console.warn('promocode meta bootstrap skipped:', err);
  }

  const legacyMeta = await withLegacyConnection(async (connection) => {
    const query = async <T>(sql: string, params: unknown[] = []): Promise<T> => {
      const [rows] = await connection.query(sql, params);
      return rows as T;
    };

    const tableExists = async (tableName: string): Promise<boolean> => {
      const rows = await query<{ TABLE_NAME: string }[]>(
        `SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [tableName]
      );
      return rows.length > 0;
    };

    const tableColumns = async (tableName: string): Promise<Set<string>> => {
      const rows = await query<{ COLUMN_NAME: string }[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );
      return new Set(rows.map((row) => row.COLUMN_NAME));
    };

    const pickColumn = (columns: Set<string>, candidates: string[]): string | null =>
      candidates.find((column) => columns.has(column)) ?? null;

    const subscriptions = await (async () => {
      if (!(await tableExists('subscription_settings'))) return [];
      const columns = await tableColumns('subscription_settings');
      const idCol = pickColumn(columns, ['id']);
      const nameCol = pickColumn(columns, ['subscription_name', 'name']);
      if (!idCol || !nameCol) return [];
      return query<{ id: number | bigint; subscription_name: string | null }[]>(
        `SELECT \`${idCol}\` AS id, \`${nameCol}\` AS subscription_name
         FROM subscription_settings
         WHERE \`${nameCol}\` IS NOT NULL AND \`${nameCol}\` != ''
         ORDER BY \`${idCol}\` ASC`
      );
    })().catch(() => [] as { id: number | bigint; subscription_name: string | null }[]);

    const helpFallback = await (async () => {
      if (!(await tableExists('help_html_pages'))) return [];
      const columns = await tableColumns('help_html_pages');
      const idCol = pickColumn(columns, ['id']);
      const titleCol = pickColumn(columns, ['page_title', 'title']);
      const langCol = pickColumn(columns, ['lang_id', 'language_id']);
      if (!idCol || !titleCol) return [];

      if (langCol) {
        const rows = await query<{ id: number | bigint; page_title: string | null }[]>(
          `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title
           FROM help_html_pages
           WHERE \`${langCol}\` = 1 AND \`${titleCol}\` IS NOT NULL AND \`${titleCol}\` != ''
           ORDER BY \`${idCol}\` DESC`
        );
        if (rows.length > 0) return rows;
      }

      return query<{ id: number | bigint; page_title: string | null }[]>(
        `SELECT \`${idCol}\` AS id, \`${titleCol}\` AS page_title
         FROM help_html_pages
         WHERE \`${titleCol}\` IS NOT NULL AND \`${titleCol}\` != ''
         ORDER BY \`${idCol}\` DESC`
      );
    })().catch(() => [] as { id: number | bigint; page_title: string | null }[]);

    const languages = await (async () => {
      if (!(await tableExists('language_values'))) return [];
      const columns = await tableColumns('language_values');
      const idCol = pickColumn(columns, ['id']);
      const nameCol = pickColumn(columns, ['lang_name', 'name', 'lang_value']);
      if (!idCol || !nameCol) return [];
      return query<{ id: number | bigint; lang_name: string | null }[]>(
        `SELECT \`${idCol}\` AS id, \`${nameCol}\` AS lang_name
         FROM language_values
         ORDER BY \`${idCol}\` ASC`
      );
    })().catch(() => [] as { id: number | bigint; lang_name: string | null }[]);

    return {
      subscriptions: subscriptions.map((row) => ({
        id: Number(row.id),
        name: String(row.subscription_name),
      })),
      helpHtmlPages: helpFallback.map((row) => ({
        id: Number(row.id),
        title: String(row.page_title),
      })),
      languages: languages.map((row) => ({
        id: Number(row.id),
        name: row.lang_name ? String(row.lang_name) : `Lang ${row.id}`,
      })),
    };
  });

  if (legacyMeta && (legacyMeta.subscriptions.length > 0 || legacyMeta.helpHtmlPages.length > 0)) {
    return legacyMeta;
  }

  const prismaQuery = async <T>(sql: string, params: unknown[] = []): Promise<T> =>
    prisma.$queryRawUnsafe<T>(sql, ...params);

  let meta: PromocodeMeta;
  try {
    meta = {
      subscriptions: await loadSubscriptionsFromTable(prismaQuery),
      helpHtmlPages: await loadHelpHtmlPagesFromTable(prismaQuery),
      languages: await loadLanguagesFromTable(prismaQuery),
    };
  } catch (err) {
    console.error('promocode meta prisma load failed:', err);
    meta = { subscriptions: [], helpHtmlPages: [], languages: [] };
  }

  if (
    meta.subscriptions.length === 0 &&
    meta.helpHtmlPages.length === 0 &&
    meta.languages.length === 0
  ) {
    return getDefaultPromocodeMeta();
  }

  return meta;
}

export function generatePromocode(): string {
  const rand = Math.random().toString(36).slice(2);
  const hash = Buffer.from(`${Date.now()}-${rand}`).toString('base64').replace(/[^a-z0-9]/gi, '');
  return hash.slice(0, 9).toLowerCase();
}

function buildValidTo(form: PromocodeSettingFormData): string {
  const year = parseInt(String(form.toYear), 10);
  const month = parseInt(String(form.toMonth), 10);
  let day = parseInt(String(form.toDay), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date().toISOString().slice(0, 10);
  }
  const lastDay = new Date(year, month, 0).getDate();
  if (!Number.isFinite(day) || day < 1) day = 1;
  if (day > lastDay) day = lastDay;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function createPromocodeSetting(
  form: PromocodeSettingFormData,
  creatorId: number
): Promise<number | null> {
  try {
    await ensurePromocodeMetaTables();
  } catch (err) {
    console.warn('promocode create bootstrap skipped:', err);
  }

  const settingsTable = await getPromocodeSettingsTable();
  if (!settingsTable) return null;

  const columns = await getSettingsColumns();
  const fields: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  const now = new Date();
  const discountNum = parseInt(String(form.discount ?? '0'), 10);
  const subscriptionExtendsRaw = String(form.subscriptionExtends ?? '').trim();
  const subscriptionExtendsParsed =
    subscriptionExtendsRaw === '' ? null : parseInt(subscriptionExtendsRaw, 10);
  const subscriptionExtendsNum =
    subscriptionExtendsParsed != null && Number.isFinite(subscriptionExtendsParsed)
      ? subscriptionExtendsParsed
      : null;

  const addField = (col: string, value: unknown) => {
    if (!columns.has(col)) return;
    fields.push(col);
    placeholders.push('?');
    values.push(value);
  };

  addField('code', form.code);
  addField('creater_id', String(creatorId));
  addField('creator_id', creatorId);
  addField('valid_from', now.toISOString().slice(0, 10));
  addField('valid_to', buildValidTo(form));
  addField('enable', form.enable ? 'Enable' : 'Disable');
  addField('usable_by', form.usableBy);
  addField('version_id', form.versionIds.join(','));
  addField('discount', Number.isFinite(discountNum) ? discountNum : 0);
  addField('enable_extension', form.enableExtension ? 1 : 0);
  addField('subscription_extends', subscriptionExtendsNum);
  addField('management_section', form.managementSection);
  addField('social_options', serialize(form.socialOptions ?? []));
  addField('enable_free_accounts', form.enableFreeAccounts ? 1 : 0);
  addField('basic_version', form.basicVersion);
  addField('premium_version', form.premiumVersion);
  addField('professional_version', form.professionalVersion);
  addField('language_id', form.languageId != null ? String(form.languageId) : null);
  addField('help_html_pages_id', form.helpHtmlPagesId != null ? String(form.helpHtmlPagesId) : null);
  addField('email', form.email);
  addField('recipient', form.recipient);
  addField('delete_status', 2);
  addField('delete_date', null);
  addField('used', 0);
  addField('created', now);
  addField('modified', now);

  if (fields.length === 0) return null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${settingsTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
     VALUES (${placeholders.join(', ')})`,
    ...values
  );

  const idRows = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
    `SELECT LAST_INSERT_ID() AS id`
  );
  return Number(idRows[0]?.id ?? 0) || null;
}

export async function updatePromocodeSetting(id: number, form: PromocodeSettingFormData): Promise<boolean> {
  await ensurePromocodeMetaTables();

  const settingsTable = await getPromocodeSettingsTable();
  if (!settingsTable) return false;

  const columns = await getSettingsColumns();
  const sets: string[] = [];
  const values: unknown[] = [];

  const addSet = (col: string, value: unknown) => {
    if (!columns.has(col)) return;
    sets.push(`\`${col}\` = ?`);
    values.push(value);
  };

  addSet('valid_to', buildValidTo(form));
  addSet('enable', form.enable ? 'Enable' : 'Disable');
  addSet('usable_by', form.usableBy);
  addSet('discount', form.discount);
  addSet('enable_extension', form.enableExtension ? '1' : '0');
  addSet('subscription_extends', form.subscriptionExtends);
  addSet('management_section', form.managementSection);
  addSet(
    'social_options',
    serialize(Array.isArray(form.socialOptions) ? form.socialOptions : [])
  );
  addSet('enable_free_accounts', form.enableFreeAccounts ? '1' : '0');
  addSet('basic_version', form.basicVersion);
  addSet('premium_version', form.premiumVersion);
  addSet('professional_version', form.professionalVersion);
  addSet('help_html_pages_id', form.helpHtmlPagesId);
  addSet('language_id', form.languageId);
  addSet('email', form.email);
  addSet('recipient', form.recipient);

  if (sets.length === 0) return false;

  await prisma.$executeRawUnsafe(
    `UPDATE \`${settingsTable}\` SET ${sets.join(', ')} WHERE id = ?`,
    ...values,
    id
  );
  return true;
}

export async function softDeletePromocodeApplies(ids: number[]): Promise<number> {
  const appliesTable = await getPromocodeAppliesTable();
  if (!appliesTable || ids.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const placeholders = ids.map(() => '?').join(',');
  const result = await prisma.$executeRawUnsafe(
    `UPDATE \`${appliesTable}\`
     SET delete_status = 1, delete_date = ?
     WHERE id IN (${placeholders})`,
    today,
    ...ids
  );
  return Number(result);
}

export async function softDeletePromocodeSettings(ids: number[]): Promise<number> {
  const settingsTable = await getPromocodeSettingsTable();
  if (!settingsTable || ids.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const placeholders = ids.map(() => '?').join(',');
  const result = await prisma.$executeRawUnsafe(
    `UPDATE \`${settingsTable}\`
     SET delete_status = 1, delete_date = ?
     WHERE id IN (${placeholders})`,
    today,
    ...ids
  );
  return Number(result);
}

export async function checkPromocodeByUser(input: {
  code: string;
  userid: number;
  amount: number;
}): Promise<{ status: 'success' | 'error'; message: string }> {
  const settingsTable = await getPromocodeSettingsTable();
  const appliesTable = await getPromocodeAppliesTable();
  if (!settingsTable || !appliesTable) {
    return { status: 'error', message: 'Promocode not valid.' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${settingsTable}\`
     WHERE code = ? AND valid_from <= ? AND valid_to >= ? AND enable = 'Enable' AND delete_status = 2
     LIMIT 1`,
    input.code,
    today,
    today
  );
  const data = rows[0];
  if (!data) return { status: 'error', message: 'Promocode not valid.' };

  if (String(data.usable_by) === 'Once') {
    if (Number(data.used) !== 0) {
      return { status: 'error', message: 'You are not use again this code' };
    }
    await prisma.$executeRawUnsafe(
      `UPDATE \`${settingsTable}\` SET used = 1, enable = 'Disable' WHERE id = ?`,
      Number(data.id)
    );
  } else {
    const existing = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT id FROM \`${appliesTable}\` WHERE user_id = ? AND delete_status = 2 LIMIT 1`,
      input.userid
    );
    if (existing.length > 0) {
      return { status: 'error', message: 'This promo code already used.' };
    }
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${appliesTable}\` (user_id, promocode_id, delete_status, created)
     VALUES (?, ?, 2, NOW())`,
    input.userid,
    Number(data.id)
  );

  return { status: 'success', message: 'Promo code apply successfully!' };
}

export function parseSocialOptions(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return (unserialize(raw) as Record<string, unknown>) ?? {};
  } catch {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export async function getLanguageListForHelpPage(pageTitle: string): Promise<{ id: number; value: string }[]> {
  const helpTable = await getHelpHtmlPagesTable();
  const langTable = await getLanguageValuesTable();
  if (!helpTable || !langTable || !pageTitle.trim()) return [];

  const pages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, page_title, lang_id, uniqueid FROM \`${helpTable}\``
  );
  const languageDetl = await prisma.$queryRawUnsafe<{ id: number | bigint; lang_name: string | null }[]>(
    `SELECT id, lang_name FROM \`${langTable}\``
  );
  const langMap = new Map(languageDetl.map((l) => [Number(l.id), l.lang_name ? String(l.lang_name) : '']));

  const matchingPages = pages.filter((p) => String(p.page_title ?? '') === pageTitle);
  const langIds = new Set<number>();

  for (const page of matchingPages) {
    if (page.lang_id != null) langIds.add(Number(page.lang_id));
    const uniqueid = page.uniqueid;
    if (uniqueid) {
      const bound = pages.filter((p) => String(p.uniqueid ?? '') === String(uniqueid));
      for (const b of bound) {
        if (b.lang_id != null) langIds.add(Number(b.lang_id));
      }
    }
  }

  for (const id of PROMOCODE_FORM_LANGUAGE_IDS) {
    if (langMap.has(id)) langIds.add(id);
  }

  if (langIds.size === 0) {
    return PROMOCODE_FORM_LANGUAGES.map((row) => ({ id: row.id, value: row.value.toLowerCase() }));
  }

  return Array.from(langIds)
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      value: formatPromocodeLanguageLabel(langMap.get(id) ?? `Lang ${id}`),
    }));
}

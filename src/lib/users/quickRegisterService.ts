import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { findExistingTable, getTableColumns } from '@/lib/outcomeSettingsDb';
import { COUNTRY_SELECT_OPTIONS } from '@/constants/countries.constants';
import { ensurePromocodeMetaTables } from '@/lib/promocodes/ensureMetaTables';
import {
  ensureQuickRegisterSubscriptionSettings,
} from '@/lib/users/quickRegisterSubscriptionSeed';
import {
  fetchLegacyUserByEmail,
  getCountriesTable,
  getLegacyUsersTable,
  getPromocodeAppliesTable,
  getPromocodeSettingsTable,
  getSubscriptionSettingsTable,
} from '@/lib/promocodes/legacyDb';

export type RegistrationStatus = {
  type: 'new' | 'renewal';
  detail: 'new' | 'renewal_expired' | 'renewal_active';
  label: string;
  has_active_subscription: boolean;
  subscription_end_date?: string;
  existing_username?: string;
};

export type QuickRegisterInit = {
  movesbookOfficialEmail: string;
  inviterUsername: string;
  inviterReadonly: boolean;
  promocodeAllowedVersionIds: string;
  countries: { id: string; name: string }[];
  sports: { id: string; name: string }[];
};

type PromocodeRow = {
  id: number;
  code: string;
  discount: string;
  valid_from: string | null;
  valid_to: string | null;
  usable_by: string | null;
  used: number;
  version_id: string | null;
  creater_id: string | number | null;
};

const SPORT_FALLBACK = [
  'Swimming',
  'Cycling',
  'Running',
  'Triathlon',
  'Football',
  'Basketball',
  'Tennis',
  'Body Building',
  'Other',
];

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null) return String(val);
  }
  return '';
}

function rowNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function rowCreatorId(row: Record<string, unknown>): string | number | null {
  const val = row.creater_id ?? row.creator_id;
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' || typeof val === 'number') return val;
  return null;
}

async function fetchPromocodeByCode(code: string, requireDates = true): Promise<PromocodeRow | null> {
  await ensurePromocodeMetaTables();
  const table = await getPromocodeSettingsTable();
  if (!table || !code.trim()) return null;

  const today = todayYmd();
  const dateClause = requireDates ? ' AND valid_from <= ? AND valid_to >= ?' : '';
  const params: unknown[] = [code.trim()];
  if (requireDates) params.push(today, today);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, code, discount, valid_from, valid_to, usable_by, used, version_id, creater_id, enable
     FROM \`${table}\`
     WHERE code = ? AND enable = 'Enable'${dateClause}
     LIMIT 1`,
    ...params
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: Number(row.id),
    code: String(row.code ?? code),
    discount: row.discount != null ? String(row.discount) : '0',
    valid_from: row.valid_from != null ? String(row.valid_from).slice(0, 10) : null,
    valid_to: row.valid_to != null ? String(row.valid_to).slice(0, 10) : null,
    usable_by: row.usable_by != null ? String(row.usable_by) : null,
    used: Number(row.used ?? 0),
    version_id: row.version_id != null ? String(row.version_id) : null,
    creater_id: rowCreatorId(row),
  };
}

async function fetchLegacyUserByUsername(username: string): Promise<{
  id: number;
  username: string | null;
  email: string | null;
} | null> {
  const usersTable = await getLegacyUsersTable();
  if (!usersTable || !username.trim()) return null;

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, username, email FROM \`${usersTable}\`
     WHERE LOWER(username) = ?
     LIMIT 1`,
    username.trim().toLowerCase()
  );
  const row = rows[0];
  if (!row?.id) return null;
  return {
    id: Number(row.id),
    username: row.username != null ? String(row.username) : null,
    email: row.email != null ? String(row.email) : null,
  };
}

async function fetchLegacyUserIdByEmail(email: string): Promise<number | null> {
  const user = await fetchLegacyUserByEmail(email);
  return user?.id ?? null;
}

export async function inviterAuthorizedForPromocode(
  userId: number,
  promocode: PromocodeRow
): Promise<boolean> {
  if (userId < 1 || !promocode.id) return false;

  const creatorId = promocode.creater_id != null ? Number(promocode.creater_id) : 0;
  if (creatorId === userId) return true;

  const appliesTable = await getPromocodeAppliesTable();
  if (!appliesTable) return false;

  const rows = await prisma.$queryRawUnsafe<{ n: number | bigint }[]>(
    `SELECT COUNT(*) AS n FROM \`${appliesTable}\`
     WHERE promocode_id = ? AND sender_id = ? AND delete_status = 2`,
    promocode.id,
    userId
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

export async function buildRegistrationStatus(email: string): Promise<RegistrationStatus> {
  const status: RegistrationStatus = {
    type: 'new',
    detail: 'new',
    label: 'New registration',
    has_active_subscription: false,
  };

  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.includes(',')) return status;

  const usersTable = await getLegacyUsersTable();
  if (!usersTable) return status;

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, username, subscription_start_date, subscription_end_date
     FROM \`${usersTable}\`
     WHERE LOWER(email) = ?
     LIMIT 1`,
    normalized
  );
  const row = rows[0];
  if (!row?.id) return status;

  status.type = 'renewal';
  status.detail = 'renewal_expired';
  status.label = 'Renewal (no active subscription)';
  status.existing_username = rowString(row, 'username') || undefined;
  status.subscription_end_date = rowString(row, 'subscription_end_date') || undefined;

  const subEnd = status.subscription_end_date;
  if (subEnd && subEnd >= todayYmd()) {
    status.detail = 'renewal_active';
    status.label = 'Renewal (active subscription)';
    status.has_active_subscription = true;
  }

  return status;
}

export async function checkQuickRegisterUsername(
  username: string,
  email: string
): Promise<{ success: true; available: boolean; message?: string }> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { success: true, available: false, message: 'Please enter a username.' };
  }

  const existing = await fetchLegacyUserByUsername(trimmed);
  if (!existing) {
    return { success: true, available: true };
  }

  const emailNorm = email.trim().toLowerCase();
  if (emailNorm) {
    const emailUserId = await fetchLegacyUserIdByEmail(emailNorm);
    if (emailUserId != null && emailUserId === existing.id) {
      return { success: true, available: true };
    }
  }

  return {
    success: true,
    available: false,
    message:
      'This username is already in use. Each invite must use a unique username and email. Log in with your existing account or choose another username. If this is your account, register using the same email address as on your profile.',
  };
}

export async function validateQuickRegisterPromocode(params: {
  promocode: string;
  inviteEmail?: string;
  inviterUsername?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: { discount?: string; valid_from?: string | null; valid_to?: string | null; version_id?: string | null };
}> {
  const code = params.promocode.trim();
  if (!code) {
    return { success: false, message: 'Please enter a promocode.', data: {} };
  }

  const record = await fetchPromocodeByCode(code, true);
  if (!record) {
    return { success: false, message: 'This promocode is invalid or has expired.', data: {} };
  }

  const inviterUsername = params.inviterUsername?.trim() ?? '';
  const inviteEmail = params.inviteEmail?.trim().toLowerCase() ?? '';

  if (inviterUsername) {
    const invUser = await fetchLegacyUserByUsername(inviterUsername);
    if (!invUser) {
      return {
        success: false,
        message: 'No user found with that username. Check the username of who invited you.',
        data: {},
      };
    }
    if (!(await inviterAuthorizedForPromocode(invUser.id, record))) {
      return {
        success: false,
        message: 'This promocode does not match that inviter username.',
        data: {},
      };
    }
  } else if (inviteEmail) {
    const appliesTable = await getPromocodeAppliesTable();
    if (!appliesTable) {
      return { success: false, message: 'Promocode apply records not available.', data: {} };
    }

    const emails = Array.from(
      new Set(
        inviteEmail
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const applies = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT sender_email, receiver_email FROM \`${appliesTable}\`
       WHERE promocode_id = ?`,
      record.id
    );

    let matched = false;
    for (const apply of applies) {
      const sender = rowString(apply, 'sender_email').toLowerCase();
      const receiver = rowString(apply, 'receiver_email').toLowerCase();
      for (const one of emails) {
        if (one && (sender === one || receiver === one)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      return {
        success: false,
        message: 'This promocode is not valid for the specified invite email.',
        data: {},
      };
    }
  }

  const usableOnce = record.usable_by?.toLowerCase() === 'once';
  if (usableOnce && record.used >= 1) {
    return { success: false, message: 'This promocode has already been used.', data: {} };
  }

  return {
    success: true,
    message: `Promocode applied. Discount: ${record.discount}%`,
    data: {
      discount: record.discount,
      valid_from: record.valid_from,
      valid_to: record.valid_to,
      version_id: record.version_id,
    },
  };
}

export async function getQuickRegisterVersions(
  userType: string,
  promocodeVersionIds: string
): Promise<Record<string, string>> {
  await ensureQuickRegisterSubscriptionSettings();

  const table = await getSubscriptionSettingsTable();
  if (!table || !userType) return {};

  const roleId = Number(userType);
  const conditions: string[] = ['role_id = ?'];
  const params: unknown[] = [roleId];

  const allowedRaw = promocodeVersionIds.trim();
  if (allowedRaw) {
    const allowedIds = allowedRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (allowedIds.length > 0) {
      conditions.push(`id IN (${allowedIds.map(() => '?').join(',')})`);
      params.push(...allowedIds.map((id) => Number(id)));
    }
  }

  let rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, subscription_name FROM \`${table}\`
     WHERE ${conditions.join(' AND ')}
       AND subscription_name IS NOT NULL
       AND subscription_name != ''
     ORDER BY id ASC`,
    ...params
  );

  // Promocode may list version ids from another role — fall back to all versions for this user type.
  if (rows.length === 0 && allowedRaw) {
    rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, subscription_name FROM \`${table}\`
       WHERE role_id = ?
         AND subscription_name IS NOT NULL
         AND subscription_name != ''
       ORDER BY id ASC`,
      roleId
    );
  }

  const result: Record<string, string> = {};
  for (const row of rows) {
    const id = rowNumber(row, 'id');
    const name = rowString(row, 'subscription_name');
    if (id != null && name) result[String(id)] = name;
  }
  return result;
}

export async function getQuickRegisterSubscriptionData(params: {
  userType: string;
  versionId: string;
  promocode?: string;
}): Promise<Record<string, unknown>> {
  await ensureQuickRegisterSubscriptionSettings();

  const table = await getSubscriptionSettingsTable();
  if (!table || !params.userType || !params.versionId) return {};

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${table}\`
     WHERE role_id = ? AND id = ?
     LIMIT 1`,
    Number(params.userType),
    Number(params.versionId)
  );
  const subscriptionData: Record<string, unknown> = { ...(rows[0] ?? {}) };

  const promoCode = params.promocode?.trim() ?? '';
  if (promoCode) {
    const promo = await fetchPromocodeByCode(promoCode, false);
    if (promo) {
      const allowedVersions = promo.version_id
        ? promo.version_id.split(',').map((v) => v.trim()).filter(Boolean)
        : [];
      if (allowedVersions.length === 0 || allowedVersions.includes(String(params.versionId))) {
        subscriptionData.discount_with_promocode = promo.discount;
      }
    }
  }

  return subscriptionData;
}

async function resolveSuperAdminEmail(): Promise<string> {
  const usersTable = await getLegacyUsersTable();
  if (usersTable) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT email FROM \`${usersTable}\`
       WHERE role_id = 1 AND delete_status = 'N'
       ORDER BY id ASC
       LIMIT 1`
    );
    const email = rowString(rows[0] ?? {}, 'email');
    if (email) return email;
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { isActive: true },
    select: { email: true },
    orderBy: { createdAt: 'asc' },
  });
  return superAdmin?.email ?? 'admin@movesbook.com';
}

export async function getQuickRegisterInit(params: {
  userEmail?: string;
  promocode?: string;
  inviteBy?: string;
  inviter?: string;
}): Promise<QuickRegisterInit> {
  await ensureQuickRegisterSubscriptionSettings();

  const inviteByMovesbook = params.inviteBy === 'movesbook';
  const movesbookOfficialEmail = inviteByMovesbook ? await resolveSuperAdminEmail() : '';

  let inviterUsername = params.inviter?.trim() ?? '';
  let inviterReadonly = Boolean(inviterUsername);

  const acceptEmail = params.userEmail?.trim() ?? '';
  const promocode = params.promocode?.trim() ?? '';

  if (!inviteByMovesbook && !inviterUsername && acceptEmail && !acceptEmail.includes(',') && promocode) {
    const promo = await fetchPromocodeByCode(promocode, false);
    const appliesTable = await getPromocodeAppliesTable();
    if (promo && appliesTable) {
      const applyRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT sender_id, sender_email FROM \`${appliesTable}\`
         WHERE LOWER(receiver_email) = ? AND promocode_id = ? AND delete_status = 2
         ORDER BY id DESC
         LIMIT 1`,
        acceptEmail.toLowerCase(),
        promo.id
      );
      const apply = applyRows[0];
      if (apply) {
        const senderId = rowNumber(apply, 'sender_id');
        if (senderId && senderId > 0) {
          const usersTable = await getLegacyUsersTable();
          if (usersTable) {
            const su = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
              `SELECT username FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
              senderId
            );
            const uname = rowString(su[0] ?? {}, 'username');
            if (uname) {
              inviterUsername = uname;
              inviterReadonly = true;
            }
          }
        } else {
          const senderEmail = rowString(apply, 'sender_email');
          if (senderEmail) {
            const su = await fetchLegacyUserByEmail(senderEmail);
            if (su?.username) {
              inviterUsername = su.username;
              inviterReadonly = true;
            }
          }
        }
      }
    }
  }

  let promocodeAllowedVersionIds = '';
  if (promocode) {
    const promo = await fetchPromocodeByCode(promocode, true);
    if (promo?.version_id) {
      promocodeAllowedVersionIds = promo.version_id
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .join(',');
    }
  }

  const countries = COUNTRY_SELECT_OPTIONS.map((c) => ({ id: c.name, name: c.name }));

  const sports: { id: string; name: string }[] = [];
  const sportsTable = await findExistingTable(['sports', 'sport']);
  if (sportsTable) {
    const columns = await getTableColumns(sportsTable);
    const nameCol = columns.has('sport_name') ? 'sport_name' : columns.has('name') ? 'name' : null;
    if (nameCol) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, \`${nameCol}\` AS sport_name FROM \`${sportsTable}\` ORDER BY \`${nameCol}\` ASC`
      );
      for (const row of rows) {
        const id = rowNumber(row, 'id');
        const name = rowString(row, 'sport_name');
        if (id != null && name) sports.push({ id: String(id), name });
      }
    }
  }
  if (sports.length === 0) {
    SPORT_FALLBACK.forEach((name, idx) => sports.push({ id: String(idx + 1), name }));
  }

  return {
    movesbookOfficialEmail,
    inviterUsername,
    inviterReadonly,
    promocodeAllowedVersionIds,
    countries,
    sports,
  };
}

async function resolveCountryId(countryValue: string): Promise<number> {
  const trimmed = countryValue.trim();
  if (!trimmed) return 0;

  const countriesTable = await getCountriesTable();
  if (!countriesTable) return 0;

  if (/^\d+$/.test(trimmed)) {
    const byId = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT id FROM \`${countriesTable}\` WHERE id = ? LIMIT 1`,
      Number(trimmed)
    );
    if (byId[0]) return Number(byId[0].id);
  }

  const byName = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
    `SELECT id FROM \`${countriesTable}\` WHERE name = ? LIMIT 1`,
    trimmed
  );
  if (byName[0]) return Number(byName[0].id);

  const columns = await getTableColumns(countriesTable);
  const fields = ['name'];
  const values: unknown[] = [trimmed];
  if (columns.has('code')) {
    fields.push('code');
    values.push('');
  }
  if (columns.has('flag_id')) {
    fields.push('flag_id');
    values.push(1);
  }
  if (columns.has('created')) {
    fields.push('created');
    values.push(new Date());
  }
  if (columns.has('modified')) {
    fields.push('modified');
    values.push(new Date());
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${countriesTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
     VALUES (${fields.map(() => '?').join(', ')})`,
    ...values
  );
  const idRows = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
    `SELECT LAST_INSERT_ID() AS id`
  );
  return Number(idRows[0]?.id ?? 0);
}

async function resolveSportId(sportValue: string): Promise<string | number> {
  if (/^\d+$/.test(sportValue.trim())) return Number(sportValue);
  const sportsTable = await findExistingTable(['sports', 'sport']);
  if (!sportsTable) return sportValue;
  const columns = await getTableColumns(sportsTable);
  const nameCol = columns.has('sport_name') ? 'sport_name' : columns.has('name') ? 'name' : null;
  if (!nameCol) return sportValue;
  const rows = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
    `SELECT id FROM \`${sportsTable}\` WHERE \`${nameCol}\` = ? LIMIT 1`,
    sportValue.trim()
  );
  return rows[0] ? Number(rows[0].id) : sportValue;
}

function addDays(baseYmd: string, days: number): string {
  const d = new Date(`${baseYmd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type QuickRegisterPayload = {
  username: string;
  email: string;
  re_email: string;
  password: string;
  confim_password: string;
  country: string;
  usertype: string;
  version_id: string;
  gender: string;
  sport: string;
  promocode: string;
  inviter_username?: string;
  confirm_inviter_username?: string;
  invite_by_movesbook?: boolean;
  origin_email?: string;
  disccount_hidden?: string;
};

export async function quickRegisterUser(
  payload: QuickRegisterPayload
): Promise<{ success: boolean; message: string }> {
  const validationError = validateQuickRegisterPayload(payload);
  if (validationError) return { success: false, message: validationError };

  const promocode = await fetchPromocodeByCode(payload.promocode.trim(), true);
  if (!promocode) {
    return { success: false, message: 'Please input valid promocode.' };
  }

  const usersTable = await getLegacyUsersTable();
  if (!usersTable) {
    return { success: false, message: 'User database not available.' };
  }

  const versionId = payload.version_id.trim();
  if (promocode.version_id) {
    const allowed = promocode.version_id.split(',').map((v) => v.trim());
    if (allowed.length > 0 && !allowed.includes(versionId)) {
      return { success: false, message: 'The selected version is not allowed for this promocode.' };
    }
  }

  const subTable = await getSubscriptionSettingsTable();
  if (!subTable || !versionId) {
    return { success: false, message: 'Please select a subscription version.' };
  }

  const subRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM \`${subTable}\` WHERE id = ? LIMIT 1`,
    Number(versionId)
  );
  const subSettings = subRows[0];
  if (!subSettings) {
    return { success: false, message: 'Invalid subscription version.' };
  }

  const durationDays = rowNumber(subSettings, 'days_duration') ?? 365;
  let currentDate = todayYmd();
  let endDate = addDays(currentDate, durationDays);

  const emailNorm = payload.email.trim().toLowerCase();
  const existingRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, username, subscription_end_date FROM \`${usersTable}\`
     WHERE LOWER(email) = ?
     LIMIT 1`,
    emailNorm
  );
  const existingUser = existingRows[0];
  let existingUserId: number | null = existingUser?.id ? Number(existingUser.id) : null;

  if (existingUserId) {
    const existingUsername = rowString(existingUser, 'username');
    if (existingUsername.toLowerCase() !== payload.username.trim().toLowerCase()) {
      return {
        success: false,
        message: `The username cannot be changed for an existing account. Please use your existing username: ${existingUsername}`,
      };
    }
    const subEnd = rowString(existingUser, 'subscription_end_date');
    if (subEnd && subEnd >= todayYmd()) {
      currentDate = addDays(subEnd, 1);
      endDate = addDays(currentDate, durationDays);
    }
  }

  let originEmail = payload.origin_email?.trim().toLowerCase() ?? '';
  const inviteByMovesbook = Boolean(payload.invite_by_movesbook);
  const inviterUname = payload.inviter_username?.trim() ?? '';

  if (inviteByMovesbook) {
    if (!originEmail) originEmail = emailNorm;
  } else if (inviterUname) {
    const invUser = await fetchLegacyUserByUsername(inviterUname);
    if (!invUser) {
      return { success: false, message: 'No user found with that inviter username.' };
    }
    if (!(await inviterAuthorizedForPromocode(invUser.id, promocode))) {
      return { success: false, message: 'That username is not valid for this promocode.' };
    }

    const appliesTable = await getPromocodeAppliesTable();
    if (appliesTable) {
      const existingApply = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, sender_id FROM \`${appliesTable}\`
         WHERE promocode_id = ? AND LOWER(receiver_email) = ?
         ORDER BY id DESC LIMIT 1`,
        promocode.id,
        emailNorm
      );
      const apply = existingApply[0];
      if (apply) {
        const exSid = rowNumber(apply, 'sender_id') ?? 0;
        if (exSid > 0 && exSid !== invUser.id) {
          return {
            success: false,
            message:
              'This email already has a pending or completed invite for this promocode from another user.',
          };
        }
      } else {
        const columns = await getTableColumns(appliesTable);
        const fields = ['promocode_id', 'sender_id', 'receiver_email', 'delete_status'];
        const values: unknown[] = [promocode.id, invUser.id, emailNorm, 2];
        if (columns.has('sender_email') && invUser.email) {
          fields.push('sender_email');
          values.push(invUser.email);
        }
        if (columns.has('level')) {
          fields.push('level');
          values.push('2');
        }
        if (columns.has('created')) {
          fields.push('created');
          values.push(new Date());
        }
        if (columns.has('modified')) {
          fields.push('modified');
          values.push(new Date());
        }
        await prisma.$executeRawUnsafe(
          `INSERT INTO \`${appliesTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
           VALUES (${fields.map(() => '?').join(', ')})`,
          ...values
        );
      }
    }
    originEmail = emailNorm;
  } else if (originEmail) {
    originEmail = originEmail.toLowerCase();
  } else {
    return {
      success: false,
      message:
        'Enter the username of who invited you, or open the registration link from your invitation email or message.',
    };
  }

  const appliesTable = await getPromocodeAppliesTable();
  if (appliesTable) {
    const usedRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id FROM \`${appliesTable}\`
       WHERE promocode_id = ? AND LOWER(receiver_email) = ? AND receiver_id > 0
       ORDER BY id DESC LIMIT 1`,
      promocode.id,
      originEmail
    );
    if (usedRows[0]) {
      return { success: false, message: 'This promocode has already been used for this email address.' };
    }
  }

  const countryId = await resolveCountryId(payload.country);
  const sportId = await resolveSportId(payload.sport);
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const userColumns = await getTableColumns(usersTable);

  const userData: Record<string, unknown> = {
    username: payload.username.trim(),
    role_id: Number(payload.usertype),
    email: payload.email.trim(),
    password: hashedPassword,
    country_id: countryId,
    gender: payload.gender,
    sport_id: sportId,
    verification_status: 'T',
    register_yourself: 1,
    block: 'N',
    subscription_setting_id: Number(versionId),
    subscription_start_date: currentDate,
    subscription_end_date: endDate,
    subscription_status: 'S',
    subscription_mail_status: 'SM',
    credits: rowString(subSettings, 'credit2') || rowNumber(subSettings, 'credit2') || 0,
    delete_status: 'N',
    modified: new Date(),
  };

  if (userColumns.has('alternateEmail')) userData.alternateEmail = payload.re_email.trim();

  if (payload.usertype === '8' && userColumns.has('alternate_club_pass')) {
    const clubPass = await bcrypt.hash(`${payload.password}_club`, 10);
    const altPass = await bcrypt.hash(`${payload.password}_alternative`, 10);
    userData.alternate_club_pass = clubPass;
    if (userColumns.has('alternate_pass')) userData.alternate_pass = altPass;
  }

  let userId = existingUserId;
  const filteredUserData = Object.fromEntries(
    Object.entries(userData).filter(([key]) => userColumns.has(key))
  );

  if (userId) {
    const sets = Object.entries(filteredUserData)
      .filter(([key]) => key !== 'created')
      .map(([key]) => `\`${key}\` = ?`);
    const vals = Object.entries(filteredUserData)
      .filter(([key]) => key !== 'created')
      .map(([, val]) => val);
    await prisma.$executeRawUnsafe(
      `UPDATE \`${usersTable}\` SET ${sets.join(', ')} WHERE id = ?`,
      ...vals,
      userId
    );
  } else {
    if (userColumns.has('created') && !('created' in filteredUserData)) {
      filteredUserData.created = new Date();
    }
    const fields = Object.keys(filteredUserData);
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${usersTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
       VALUES (${fields.map(() => '?').join(', ')})`,
      ...fields.map((f) => filteredUserData[f])
    );
    const idRows = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT LAST_INSERT_ID() AS id`
    );
    userId = Number(idRows[0]?.id ?? 0);
  }

  if (!userId) {
    return { success: false, message: 'The user could not be saved. Please, try again.' };
  }

  const profileTable =
    payload.usertype === '8'
      ? await findExistingTable(['clubs', 'club'])
      : await findExistingTable(['athletes', 'athlete']);

  if (profileTable) {
    const profileColumns = await getTableColumns(profileTable);
    const profileFields: Record<string, unknown> = { user_id: userId };
    if (profileColumns.has('country_id')) profileFields.country_id = countryId;
    if (profileColumns.has('gender')) profileFields.gender = payload.gender;

    const existingProfile = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT id FROM \`${profileTable}\` WHERE user_id = ? LIMIT 1`,
      userId
    );
    if (existingProfile[0]) {
      const sets = Object.keys(profileFields).map((k) => `\`${k}\` = ?`);
      await prisma.$executeRawUnsafe(
        `UPDATE \`${profileTable}\` SET ${sets.join(', ')} WHERE user_id = ?`,
        ...Object.values(profileFields),
        userId
      );
    } else {
      const fields = Object.keys(profileFields);
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${profileTable}\` (${fields.map((f) => `\`${f}\``).join(', ')})
         VALUES (${fields.map(() => '?').join(', ')})`,
        ...fields.map((f) => profileFields[f])
      );
    }
  }

  if (appliesTable) {
    const receiverApplyRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, sender_id, sender_email FROM \`${appliesTable}\`
       WHERE LOWER(receiver_email) = ? AND promocode_id = ?
       ORDER BY id DESC LIMIT 1`,
      originEmail,
      promocode.id
    );
    const receiverApply = receiverApplyRows[0];
    if (receiverApply?.id) {
      const applyColumns = await getTableColumns(appliesTable);
      const credit = rowString(subSettings, 'credit2') || rowNumber(subSettings, 'credit2') || '';
      const creditSender = rowString(subSettings, 'credit') || rowNumber(subSettings, 'credit') || '';
      const registrationDate = new Date();
      const updates: Record<string, unknown> = {
        sender_credit: creditSender,
        receiver_credit: credit,
        receiver_id: userId,
        receiver_version: rowString(subSettings, 'subscription_name'),
        registration_date: registrationDate,
        subscription_start_date: currentDate,
        subscription_end_date: endDate,
        is_registered: 1,
        modified: registrationDate,
        new_receiver: existingUserId ? 'N' : 'Y',
      };

      if (inviteByMovesbook) {
        const superRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT id, email FROM \`${usersTable}\`
           WHERE role_id = 1 AND delete_status = 'N'
           ORDER BY id ASC LIMIT 1`
        );
        const superId = rowNumber(superRows[0] ?? {}, 'id');
        if (superId) {
          updates.sender_id = superId;
          if (applyColumns.has('sender_email')) {
            updates.sender_email = rowString(superRows[0] ?? {}, 'email') || movesbookFallbackEmail();
          }
        }
      }

      const setParts = Object.keys(updates)
        .filter((k) => applyColumns.has(k))
        .map((k) => `\`${k}\` = ?`);
      const setVals = Object.keys(updates)
        .filter((k) => applyColumns.has(k))
        .map((k) => updates[k]);
      if (setParts.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${appliesTable}\` SET ${setParts.join(', ')} WHERE id = ?`,
          ...setVals,
          Number(receiverApply.id)
        );
      }

      const senderId = rowNumber(receiverApply, 'sender_id') ?? rowNumber(updates, 'sender_id');
      const senderCredit = Number(creditSender);
      if (senderId && senderCredit > 0 && userColumns.has('credits')) {
        const senderRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT credits FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          senderId
        );
        const currentCredits = Number(senderRows[0]?.credits ?? 0);
        await prisma.$executeRawUnsafe(
          `UPDATE \`${usersTable}\` SET credits = ? WHERE id = ?`,
          currentCredits + senderCredit,
          senderId
        );
      }
    }
  }

  const settingsTable = await getPromocodeSettingsTable();
  if (settingsTable && promocode.usable_by?.toLowerCase() === 'once') {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${settingsTable}\` SET used = used + 1, modified = NOW() WHERE id = ?`,
      promocode.id
    );
  }

  return { success: true, message: 'The user has been saved.' };
}

function movesbookFallbackEmail(): string {
  return 'admin@movesbook.com';
}

function validateQuickRegisterPayload(payload: QuickRegisterPayload): string | null {
  if (!payload.username.trim()) return 'Please enter your username';
  if (payload.username.trim().length < 5) return 'Your username must be at least 5 characters long';
  if (!payload.email.trim()) return 'Please enter your email';
  if (!payload.re_email.trim()) return 'Please Retype your email';
  if (payload.email.trim().toLowerCase() !== payload.re_email.trim().toLowerCase()) {
    return 'Please Retype same email';
  }
  if (!payload.password) return 'Please enter your password';
  if (payload.password.length < 5) return 'Your password must be at least 5 characters long';
  if (payload.password !== payload.confim_password) return 'Please enter the same password as above';
  if (!payload.country) return 'Please select your country';
  if (!payload.usertype || !['5', '8'].includes(String(payload.usertype))) {
    return 'Please select your user type';
  }
  if (!payload.version_id) return 'Please select a subscription version';
  if (!payload.gender) return 'Please select gender';
  if (!payload.sport) return 'Please select your sport';
  if (!payload.promocode.trim()) return 'Please input valid promocode.';

  if (!payload.invite_by_movesbook && payload.promocode.trim()) {
    const originVal = payload.origin_email?.trim() ?? '';
    const invVal = payload.inviter_username?.trim() ?? '';
    const invConf = payload.confirm_inviter_username?.trim() ?? '';
    if (!originVal) {
      if (!invVal) return 'Enter the username of who invited you.';
      if (invVal.toLowerCase() !== invConf.toLowerCase()) {
        return 'Inviter username and confirmation must match.';
      }
    } else if (invVal && invVal.toLowerCase() !== invConf.toLowerCase()) {
      return 'Inviter username and confirmation must match.';
    }
  }

  return null;
}

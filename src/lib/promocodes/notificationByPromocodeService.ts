import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import {
  fetchCountryCodeById,
  fetchFlagImageByCountryId,
  fetchLegacyUserByEmail,
  fetchLegacyUsersByIds,
  getAppliesColumns,
  getHelpHtmlPagesTable,
  getLanguageValuesTable,
  getLegacyUsersTable,
  getPromocodeAppliesTable,
  getPromocodeSettingsTable,
  getSubscriptionSettingsTable,
  legacyUserExistsByEmail,
} from '@/lib/promocodes/legacyDb';
import {
  buildInviteEmailHtml,
  buildRegisterUrl,
} from '@/lib/promocodes/sendInviteService';
import { buildPromocodeSettingsSelectSql } from '@/lib/promocodes/promocodeSettingsQuery';
import { loadPromocodeInviteLanguageParagraph } from '@/lib/promocodes/promocodeInviteLanguage';

const ROLE_NAMES: Record<number, string> = {
  1: 'Super Admin',
  2: 'Admin',
  5: 'Single User',
  6: 'Coach',
  7: 'Team',
  8: 'Club',
  9: 'Group',
};

const SUGGEST_TAB_ROLES = new Set([5, 6, 7, 8]);
const ADMIN_ROLES = new Set([1, 2]);

export type PromocodeOption = {
  id: number;
  code: string;
  validTo: string;
  helpHtmlPagesId: number | null;
  languageId: number | null;
};

export type InvitationRow = {
  applyId: number;
  promocodeId: number;
  promocodeCode: string;
  usableBy: string;
  recipient: string;
  enable: string;
  emailCount: number;
  emailList: string;
  created: string;
  status: 'Registered' | 'Pending';
  senderUsername: string;
  senderEmail: string;
  senderImage: string | null;
  countryCode: string;
  senderFlagImg: string | null;
  version: string;
};

export type RegisteredUserRow = {
  senderUsername: string;
  senderId: number | null;
  username: string;
  roleId: number | null;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  subscriptionSettingId: number | null;
  promocodeCode: string;
  promocodeValidTo: string;
  mailDate: string;
  status: 'Expire' | 'Current' | '--';
  credits: number;
};

export type CreditRecordRow = {
  senderUsername: string;
  creditsThanksTo: string;
  secondarySenderUsername: string;
  secondarySenderFlagImg: string | null;
  secondarySenderCountryCode: string | null;
  receiverUsername: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  versionName: string;
  credits: number;
};

export type ConnectionChartData = {
  currentUserUsername: string;
  currentUserRoleName: string;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  allowsCurrentUserToEarn: {
    username: string;
    roleName: string;
    roleId: number | null;
  } | null;
  directRecipients: Array<{
    username: string;
    roleName: string;
    credits: number;
    receiverId: number;
  }>;
  indirectRecipients: Array<{
    username: string;
    roleName: string;
    credits: number;
    senderUsername: string;
    senderRoleName: string;
  }>;
};

export type NotificationByPromocodeDashboard = {
  isAdmin: boolean;
  showSuggestTab: boolean;
  defaultTab: 'suggest' | 'invitations';
  promocode: PromocodeOption;
  promocodesList: PromocodeOption[];
  totalInviteCount: number;
  regCount: Record<string, number>;
  lastEmailSentDate: string;
  returnIndex: string;
  invitationsData: InvitationRow[];
  registeredUsers: RegisteredUserRow[];
  creditRecords: CreditRecordRow[];
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  connectionChart: ConnectionChartData;
  roles: Record<number, string>;
  subscriptionsData: Record<number, string>;
};

type ApplyRow = Record<string, unknown>;
type PromoRow = Record<string, unknown>;

function rowNum(row: ApplyRow | PromoRow | undefined, ...keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const val = row[key];
    if (val != null && val !== '') return Number(val);
  }
  return 0;
}

function rowStr(row: ApplyRow | PromoRow | undefined, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const val = row[key];
    if (val != null && val !== '') return String(val);
  }
  return '';
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function loadSubscriptionMaps(): Promise<{
  byName: Record<number, string>;
  byCodeNo: Record<number, string>;
}> {
  const table = await getSubscriptionSettingsTable();
  const byName: Record<number, string> = {};
  const byCodeNo: Record<number, string> = {};
  if (!table) return { byName, byCodeNo };

  const columns = await getTableColumns(table);
  const nameCol = columns.has('subscription_name') ? 'subscription_name' : null;
  const codeCol = columns.has('code_no') ? 'code_no' : null;
  if (!nameCol && !codeCol) return { byName, byCodeNo };

  const selectCols = ['id'];
  if (nameCol) selectCols.push(nameCol);
  if (codeCol) selectCols.push(codeCol);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${selectCols.map((c) => `\`${c}\``).join(', ')} FROM \`${table}\``
  );

  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    if (nameCol && row[nameCol] != null) byName[id] = String(row[nameCol]);
    if (codeCol && row[codeCol] != null) byCodeNo[id] = String(row[codeCol]);
  }
  return { byName, byCodeNo };
}

function versionFromIds(versionId: string, codeMap: Record<number, string>): string {
  if (!versionId.trim()) return '';
  const ids = versionId.split(',').map((v) => Number(v.trim())).filter((id) => id > 0);
  if (ids.length === 0) return '';
  return ids.map((id) => codeMap[id] ?? String(id)).join(',');
}

async function resolveHelpHtmlContent(htmlPageId: string): Promise<string> {
  const table = await getHelpHtmlPagesTable();
  if (!table || !htmlPageId) return '';
  const rows = await prisma.$queryRawUnsafe<{ content: string | null }[]>(
    `SELECT content FROM \`${table}\` WHERE id = ? LIMIT 1`,
    htmlPageId
  );
  return rows[0]?.content ?? '';
}

async function resolveLanguageColumn(languageId: number): Promise<string> {
  const table = await getLanguageValuesTable();
  if (!table) return 'English';
  const columns = await getTableColumns(table);
  const nameCol = columns.has('lang_name') ? 'lang_name' : columns.has('name') ? 'name' : null;
  if (!nameCol) return 'English';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT \`${nameCol}\` AS lang_name FROM \`${table}\` WHERE id = ? LIMIT 1`,
    languageId
  );
  return rows[0]?.lang_name != null ? String(rows[0].lang_name) : 'English';
}

async function fetchUserNameParts(userId: number): Promise<{ firstname: string; lastname: string }> {
  const usersTable = await getLegacyUsersTable();
  if (!usersTable) return { firstname: '', lastname: '' };
  const rows = await prisma.$queryRawUnsafe<{ firstname: string | null; lastname: string | null }[]>(
    `SELECT firstname, lastname FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
    userId
  );
  return {
    firstname: rows[0]?.firstname?.trim() ?? '',
    lastname: rows[0]?.lastname?.trim() ?? '',
  };
}

export async function getNotificationByPromocodeDashboard(params: {
  legacyUserId: number;
  email: string;
  roleId: number | null;
}): Promise<NotificationByPromocodeDashboard> {
  const { legacyUserId, email } = params;
  const roleId = params.roleId ?? 0;
  const isAdmin = ADMIN_ROLES.has(roleId);
  const showSuggestTab = SUGGEST_TAB_ROLES.has(roleId);

  const appliesTable = await getPromocodeAppliesTable();
  const settingsTable = await getPromocodeSettingsTable();
  const usersTable = await getLegacyUsersTable();

  const promocodesList: PromocodeOption[] = [];
  let promocode: PromocodeOption = {
    id: 0,
    code: '',
    validTo: '',
    helpHtmlPagesId: null,
    languageId: null,
  };

  if (appliesTable && settingsTable) {
    const receivedRows = await prisma.$queryRawUnsafe<{ promocode_id: number | null }[]>(
      `SELECT DISTINCT promocode_id FROM \`${appliesTable}\`
       WHERE receiver_id = ? AND receiver_id > 0 AND delete_status = 2`,
      legacyUserId
    );
    const promoIds = Array.from(
      new Set(receivedRows.map((r) => Number(r.promocode_id)).filter((id) => id > 0))
    );

    if (promoIds.length > 0) {
      const placeholders = promoIds.map(() => '?').join(',');
      const promoSelectSql = await buildPromocodeSettingsSelectSql(settingsTable);
      const promoRows = await prisma.$queryRawUnsafe<PromoRow[]>(
        `SELECT ${promoSelectSql} FROM \`${settingsTable}\` WHERE id IN (${placeholders})`,
        ...promoIds
      );
      for (const p of promoRows) {
        const helpHtmlPagesIdRaw = rowStr(p, 'help_html_pages_id', 'help_html_page_id');
        const languageIdRaw = rowNum(p, 'language_id');
        const option: PromocodeOption = {
          id: Number(p.id),
          code: rowStr(p, 'code'),
          validTo: formatDate(p.valid_to),
          helpHtmlPagesId: helpHtmlPagesIdRaw ? Number(helpHtmlPagesIdRaw) : null,
          languageId: languageIdRaw > 0 ? languageIdRaw : null,
        };
        promocodesList.push(option);
        if (promocode.id === 0) promocode = option;
      }
    }
  }

  let totalInviteCount = 0;
  const regCount: Record<string, number> = { '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
  let lastEmailSentDate = '';

  if (appliesTable && usersTable) {
    const sentInvites = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT receiver_id, created FROM \`${appliesTable}\`
       WHERE LOWER(sender_email) = ? AND delete_status = 2`,
      email.trim().toLowerCase()
    );
    totalInviteCount = sentInvites.length;

    for (const invite of sentInvites) {
      const receiverId = rowNum(invite, 'receiver_id');
      if (receiverId > 0) {
        const userRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
          `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          receiverId
        );
        const rid = userRows[0]?.role_id != null ? Number(userRows[0].role_id) : 0;
        if (rid > 0) {
          const key = String(rid);
          regCount[key] = (regCount[key] ?? 0) + 1;
        }
      }
      lastEmailSentDate = formatDate(invite.created);
    }
  }

  const registeredSum = Object.values(regCount).reduce((a, b) => a + b, 0);
  const returnIndex =
    totalInviteCount === 0 ? '0' : ((registeredSum / totalInviteCount) * 100).toFixed(1);

  const { byName: subscriptionsData, byCodeNo: subscriptionCodeMap } = await loadSubscriptionMaps();
  const roles = ROLE_NAMES;

  const invitationsData: InvitationRow[] = [];
  if (appliesTable && settingsTable) {
    const receivedInvitations = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT * FROM \`${appliesTable}\`
       WHERE receiver_id = ? AND delete_status = 2
       ORDER BY created DESC`,
      legacyUserId
    );

    const promoSelectSql = await buildPromocodeSettingsSelectSql(settingsTable);

    for (const applyRecord of receivedInvitations) {
      const promocodeId = rowNum(applyRecord, 'promocode_id');
      if (promocodeId <= 0) continue;

      const promoRows = await prisma.$queryRawUnsafe<PromoRow[]>(
        `SELECT ${promoSelectSql} FROM \`${settingsTable}\` WHERE id = ? LIMIT 1`,
        promocodeId
      );
      const promocodeData = promoRows[0];
      if (!promocodeData) continue;

      const senderId = rowNum(applyRecord, 'sender_id');
      let senderUser = senderId > 0 ? (await fetchLegacyUsersByIds([senderId])).get(senderId) : null;
      if (!senderUser) {
        const senderEmail = rowStr(applyRecord, 'sender_email');
        if (senderEmail) senderUser = await fetchLegacyUserByEmail(senderEmail);
      }

      const countryCode = senderUser?.countryId
        ? (await fetchCountryCodeById(senderUser.countryId)) ?? ''
        : '';
      const senderFlagImg = senderUser?.countryId
        ? await fetchFlagImageByCountryId(senderUser.countryId)
        : null;

      const version = versionFromIds(rowStr(promocodeData, 'version_id'), subscriptionCodeMap);
      const emailField = rowStr(promocodeData, 'email');
      const emailList = emailField ? emailField.split(',').map((e) => e.trim()).filter(Boolean) : [];

      const receiverId = rowNum(applyRecord, 'receiver_id');
      invitationsData.push({
        applyId: rowNum(applyRecord, 'id'),
        promocodeId,
        promocodeCode: rowStr(promocodeData, 'code'),
        usableBy: rowStr(promocodeData, 'usable_by'),
        recipient: rowStr(promocodeData, 'recipient'),
        enable: rowStr(promocodeData, 'enable'),
        emailCount: emailList.length,
        emailList: emailField,
        created: formatDate(applyRecord.created),
        status: receiverId > 0 ? 'Registered' : 'Pending',
        senderUsername: senderUser?.username ?? rowStr(applyRecord, 'sender_email'),
        senderEmail: senderUser?.email ?? rowStr(applyRecord, 'sender_email'),
        senderImage: senderUser?.image ?? null,
        countryCode,
        senderFlagImg,
        version,
      });
    }
  }

  const registeredUsers: RegisteredUserRow[] = [];
  if (appliesTable && settingsTable && usersTable) {
    const promoSelectSql = await buildPromocodeSettingsSelectSql(settingsTable);
    const friendRows = await prisma.$queryRawUnsafe<{ receiver_id: number | null }[]>(
      `SELECT receiver_id FROM \`${appliesTable}\`
       WHERE sender_id = ? AND delete_status = 2`,
      legacyUserId
    );
    const friendIds = new Set<number>([legacyUserId]);
    for (const row of friendRows) {
      const rid = row.receiver_id != null ? Number(row.receiver_id) : 0;
      if (rid > 0) friendIds.add(rid);
    }

    const friendIdList = Array.from(friendIds);
    const placeholders = friendIdList.map(() => '?').join(',');
    const registeredApplies = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT * FROM \`${appliesTable}\`
       WHERE sender_id IN (${placeholders}) AND delete_status = 2
       ORDER BY created DESC`,
      ...friendIdList
    );

    for (const applyData of registeredApplies) {
      const promocodeId = rowNum(applyData, 'promocode_id');
      if (promocodeId <= 0) continue;

      const promoRows = await prisma.$queryRawUnsafe<PromoRow[]>(
        `SELECT ${promoSelectSql} FROM \`${settingsTable}\` WHERE id = ? LIMIT 1`,
        promocodeId
      );
      const promocodeData = promoRows[0];
      if (!promocodeData) continue;

      const receiverId = rowNum(applyData, 'receiver_id');
      let receiverUser: {
        username: string;
        roleId: number | null;
        subscriptionStartDate: string;
        subscriptionEndDate: string;
        subscriptionSettingId: number | null;
      };

      if (receiverId > 0) {
        const ru = (await fetchLegacyUsersByIds([receiverId])).get(receiverId);
        receiverUser = {
          username: ru?.username ?? '',
          roleId: null,
          subscriptionStartDate: ru?.subscriptionStartDate ?? '',
          subscriptionEndDate: ru?.subscriptionEndDate ?? '',
          subscriptionSettingId: ru?.subscriptionSettingId ?? null,
        };
        const roleRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
          `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          receiverId
        );
        receiverUser.roleId = roleRows[0]?.role_id != null ? Number(roleRows[0].role_id) : null;
      } else {
        receiverUser = {
          username: rowStr(applyData, 'receiver_email'),
          roleId: null,
          subscriptionStartDate: '',
          subscriptionEndDate: '',
          subscriptionSettingId: null,
        };
      }

      const senderId = rowNum(applyData, 'sender_id');
      let senderUsername = '';
      let senderIdOut: number | null = senderId > 0 ? senderId : null;
      if (senderId > 0) {
        const su = (await fetchLegacyUsersByIds([senderId])).get(senderId);
        senderUsername = su?.username ?? '';
      } else {
        const senderEmail = rowStr(applyData, 'sender_email');
        if (senderEmail) {
          const su = await fetchLegacyUserByEmail(senderEmail);
          senderUsername = su?.username ?? senderEmail;
          senderIdOut = su?.id ?? null;
        }
      }

      let credits = 0;
      if (senderId === legacyUserId) credits = rowNum(applyData, 'sender_credit');
      else if (receiverId === legacyUserId) credits = rowNum(applyData, 'receiver_credit');
      else if (rowNum(applyData, 'secondary_sender_id') === legacyUserId) {
        credits = rowNum(applyData, 'secondary_sender_credit');
      }

      const validTo = formatDate(promocodeData.valid_to);
      const today = new Date().toISOString().slice(0, 10);
      let status: RegisteredUserRow['status'] = '--';
      if (validTo) status = validTo < today ? 'Expire' : 'Current';

      registeredUsers.push({
        senderUsername,
        senderId: senderIdOut,
        username: receiverUser.username,
        roleId: receiverUser.roleId,
        subscriptionStartDate: receiverUser.subscriptionStartDate,
        subscriptionEndDate:
          receiverUser.subscriptionEndDate && receiverUser.subscriptionEndDate !== '1970-01-01'
            ? receiverUser.subscriptionEndDate
            : '',
        subscriptionSettingId: receiverUser.subscriptionSettingId,
        promocodeCode: rowStr(promocodeData, 'code'),
        promocodeValidTo: validTo,
        mailDate: formatDate(applyData.created),
        status,
        credits,
      });
    }
  }

  const creditRecords: CreditRecordRow[] = [];
  let totalCredits = 0;

  if (appliesTable && usersTable) {
    const creditsApplies = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT * FROM \`${appliesTable}\`
       WHERE delete_status = 2
         AND (sender_id = ? OR receiver_id = ? OR secondary_sender_id = ?)
       ORDER BY created DESC`,
      legacyUserId,
      legacyUserId,
      legacyUserId
    );

    for (const applyData of creditsApplies) {
      const receiverId = rowNum(applyData, 'receiver_id');
      const senderId = rowNum(applyData, 'sender_id');
      const secondarySenderId = rowNum(applyData, 'secondary_sender_id');

      let creditsToShow = 0;
      if (receiverId === legacyUserId) {
        creditsToShow = rowNum(applyData, 'receiver_credit');
        if (creditsToShow <= 0) continue;
      } else if (senderId === legacyUserId) {
        creditsToShow = rowNum(applyData, 'sender_credit');
        if (creditsToShow <= 0) continue;
      } else if (secondarySenderId === legacyUserId) {
        creditsToShow = rowNum(applyData, 'secondary_sender_credit');
        if (creditsToShow <= 0) continue;
      } else {
        continue;
      }

      let creditsThanksTo = '-';
      let secondarySenderUsername = '';
      let secondarySenderFlagImg: string | null = null;
      let secondarySenderCountryCode: string | null = null;

      if (secondarySenderId > 0) {
        const ssu = (await fetchLegacyUsersByIds([secondarySenderId])).get(secondarySenderId);
        if (ssu?.username) {
          secondarySenderUsername = ssu.username;
          creditsThanksTo = ssu.username;
          if (ssu.countryId) {
            secondarySenderFlagImg = await fetchFlagImageByCountryId(ssu.countryId);
            secondarySenderCountryCode = await fetchCountryCodeById(ssu.countryId);
          }
        }
      } else {
        const secondaryEmail = rowStr(applyData, 'secondary_sender_email');
        if (secondaryEmail) {
          const ssu = await fetchLegacyUserByEmail(secondaryEmail);
          if (ssu?.username) {
            secondarySenderUsername = ssu.username;
            creditsThanksTo = ssu.username;
            if (ssu.countryId) {
              secondarySenderFlagImg = await fetchFlagImageByCountryId(ssu.countryId);
              secondarySenderCountryCode = await fetchCountryCodeById(ssu.countryId);
            }
          }
        }
      }

      let senderUsername = '-';
      if (senderId > 0) {
        const su = (await fetchLegacyUsersByIds([senderId])).get(senderId);
        if (su?.username) senderUsername = su.username;
      } else {
        const senderEmail = rowStr(applyData, 'sender_email');
        if (senderEmail) {
          const su = await fetchLegacyUserByEmail(senderEmail);
          senderUsername = su?.username ?? senderEmail;
        }
      }

      let receiverUsername = '';
      let subscriptionStartDate = '';
      let subscriptionEndDate = '';
      if (receiverId > 0) {
        const ru = (await fetchLegacyUsersByIds([receiverId])).get(receiverId);
        receiverUsername = ru?.username ?? '';
        subscriptionStartDate = ru?.subscriptionStartDate ?? '';
        subscriptionEndDate =
          ru?.subscriptionEndDate && ru.subscriptionEndDate !== '1970-01-01'
            ? ru.subscriptionEndDate
            : '';
      }

      totalCredits += creditsToShow;
      creditRecords.push({
        senderUsername,
        creditsThanksTo,
        secondarySenderUsername,
        secondarySenderFlagImg,
        secondarySenderCountryCode,
        receiverUsername,
        subscriptionStartDate,
        subscriptionEndDate,
        versionName: rowStr(applyData, 'receiver_version'),
        credits: creditsToShow,
      });
    }
  }

  const usedCredits = 0;
  const availableCredits = totalCredits - usedCredits;

  let allowsCurrentUserToEarn: ConnectionChartData['allowsCurrentUserToEarn'] = null;
  const directRecipients: ConnectionChartData['directRecipients'] = [];
  const indirectRecipients: ConnectionChartData['indirectRecipients'] = [];

  let currentUserUsername = '';
  let currentUserRoleName = '';

  if (usersTable) {
    const currentUser = (await fetchLegacyUsersByIds([legacyUserId])).get(legacyUserId);
    currentUserUsername = currentUser?.username ?? '';
    if (roleId > 0) currentUserRoleName = ROLE_NAMES[roleId] ?? '';
  }

  if (appliesTable && usersTable) {
    const allowsRecord = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT sender_id FROM \`${appliesTable}\`
       WHERE receiver_id = ? AND delete_status = 2
       ORDER BY created DESC LIMIT 1`,
      legacyUserId
    );
    const allowsSenderId = rowNum(allowsRecord[0], 'sender_id');
    if (allowsSenderId > 0) {
      const su = (await fetchLegacyUsersByIds([allowsSenderId])).get(allowsSenderId);
      if (su) {
        const senderRoleRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
          `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          allowsSenderId
        );
        const senderRoleId = senderRoleRows[0]?.role_id != null ? Number(senderRoleRows[0].role_id) : null;
        allowsCurrentUserToEarn = {
          username: su.username ?? '',
          roleName: senderRoleId != null ? ROLE_NAMES[senderRoleId] ?? '' : '',
          roleId: senderRoleId,
        };
      }
    }

    const directRows = await prisma.$queryRawUnsafe<ApplyRow[]>(
      `SELECT receiver_id, sender_credit FROM \`${appliesTable}\`
       WHERE sender_id = ? AND receiver_id > 0 AND delete_status = 2
       ORDER BY created DESC`,
      legacyUserId
    );

    for (const row of directRows) {
      const receiverId = rowNum(row, 'receiver_id');
      const ru = (await fetchLegacyUsersByIds([receiverId])).get(receiverId);
      if (!ru) continue;
      const roleRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
        `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
        receiverId
      );
      const rid = roleRows[0]?.role_id != null ? Number(roleRows[0].role_id) : null;
      directRecipients.push({
        username: ru.username ?? '',
        roleName: rid != null ? ROLE_NAMES[rid] ?? '' : '',
        credits: rowNum(row, 'sender_credit'),
        receiverId,
      });
    }

    const directRecipientIds = directRecipients.map((d) => d.receiverId).filter((id) => id > 0);
    if (directRecipientIds.length > 0) {
      const placeholders = directRecipientIds.map(() => '?').join(',');
      const indirectRows = await prisma.$queryRawUnsafe<ApplyRow[]>(
        `SELECT sender_id, receiver_id, secondary_sender_credit FROM \`${appliesTable}\`
         WHERE sender_id IN (${placeholders}) AND receiver_id > 0 AND delete_status = 2
         ORDER BY created DESC`,
        ...directRecipientIds
      );

      for (const row of indirectRows) {
        const receiverId = rowNum(row, 'receiver_id');
        const senderId = rowNum(row, 'sender_id');
        const ru = (await fetchLegacyUsersByIds([receiverId])).get(receiverId);
        const su = (await fetchLegacyUsersByIds([senderId])).get(senderId);
        if (!ru || !su) continue;

        const receiverRoleRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
          `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          receiverId
        );
        const senderRoleRows = await prisma.$queryRawUnsafe<{ role_id: number | null }[]>(
          `SELECT role_id FROM \`${usersTable}\` WHERE id = ? LIMIT 1`,
          senderId
        );
        const receiverRoleId = receiverRoleRows[0]?.role_id != null ? Number(receiverRoleRows[0].role_id) : null;
        const senderRoleId = senderRoleRows[0]?.role_id != null ? Number(senderRoleRows[0].role_id) : null;

        indirectRecipients.push({
          username: ru.username ?? '',
          roleName: receiverRoleId != null ? ROLE_NAMES[receiverRoleId] ?? '' : '',
          credits: rowNum(row, 'secondary_sender_credit'),
          senderUsername: su.username ?? '',
          senderRoleName: senderRoleId != null ? ROLE_NAMES[senderRoleId] ?? '' : '',
        });
      }
    }
  }

  return {
    isAdmin,
    showSuggestTab,
    defaultTab: isAdmin ? 'invitations' : 'suggest',
    promocode,
    promocodesList,
    totalInviteCount,
    regCount,
    lastEmailSentDate,
    returnIndex,
    invitationsData,
    registeredUsers,
    creditRecords,
    totalCredits,
    usedCredits,
    availableCredits,
    connectionChart: {
      currentUserUsername,
      currentUserRoleName,
      totalCredits,
      usedCredits,
      availableCredits,
      allowsCurrentUserToEarn,
      directRecipients,
      indirectRecipients,
    },
    roles,
    subscriptionsData,
  };
}

export async function sendNotificationByPromocodeInvite(params: {
  legacyUserId: number;
  senderEmail: string;
  senderUsername: string;
  receiverEmail: string;
  promocodeId: number;
  origin: string;
  sendEmail: (payload: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }) => Promise<void>;
}): Promise<{ status: 'success' | 'error'; message: string }> {
  const receiverEmail = params.receiverEmail.trim();
  if (!receiverEmail) {
    return { status: 'error', message: 'Please enter the mail address for recipient.' };
  }

  const usersTable = await getLegacyUsersTable();
  if (usersTable) {
    const existing = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
      `SELECT id FROM \`${usersTable}\`
       WHERE LOWER(email) = ? AND delete_status = 'N' LIMIT 1`,
      receiverEmail.toLowerCase()
    );
    if (existing.length > 0) {
      return {
        status: 'error',
        message: 'This email address is already registered. You can only invite new users.',
      };
    }
  } else if (await legacyUserExistsByEmail(receiverEmail)) {
    return {
      status: 'error',
      message: 'This email address is already registered. You can only invite new users.',
    };
  }

  if (!params.promocodeId) {
    return { status: 'error', message: 'Please select a promocode to use for the invite.' };
  }

  const appliesTable = await getPromocodeAppliesTable();
  const settingsTable = await getPromocodeSettingsTable();
  if (!appliesTable || !settingsTable) {
    return { status: 'error', message: 'Promocode tables not found.' };
  }

  const userPromoCheck = await prisma.$queryRawUnsafe<ApplyRow[]>(
    `SELECT id FROM \`${appliesTable}\`
     WHERE receiver_id = ? AND promocode_id = ? AND delete_status = 2 LIMIT 1`,
    params.legacyUserId,
    params.promocodeId
  );
  if (userPromoCheck.length === 0) {
    return {
      status: 'error',
      message: 'You can only use a promocode you received. Please select a valid promocode.',
    };
  }

  const promoSelectSql = await buildPromocodeSettingsSelectSql(settingsTable);
  const promoRows = await prisma.$queryRawUnsafe<PromoRow[]>(
    `SELECT ${promoSelectSql} FROM \`${settingsTable}\` WHERE id = ? LIMIT 1`,
    params.promocodeId
  );
  const promocode = promoRows[0];
  if (!promocode) {
    return { status: 'error', message: 'Invalid promocode selected.' };
  }

  const existingInvite = await prisma.$queryRawUnsafe<ApplyRow[]>(
    `SELECT receiver_id FROM \`${appliesTable}\`
     WHERE LOWER(receiver_email) = ? AND promocode_id = ? AND delete_status = 2
     ORDER BY id DESC LIMIT 1`,
    receiverEmail.toLowerCase(),
    params.promocodeId
  );
  if (existingInvite.length > 0) {
    const receiverId = rowNum(existingInvite[0], 'receiver_id');
    if (receiverId > 0) {
      return {
        status: 'error',
        message: 'This user already accepted the membership requesting.',
      };
    }
    return { status: 'error', message: 'Requesting member is already pending state.' };
  }

  const receivedInvite = await prisma.$queryRawUnsafe<ApplyRow[]>(
    `SELECT other_info, adv_page FROM \`${appliesTable}\`
     WHERE promocode_id = ? AND delete_status = 2
       AND (LOWER(receiver_email) = ? OR receiver_id = ?)
     ORDER BY id DESC LIMIT 1`,
    params.promocodeId,
    params.senderEmail.trim().toLowerCase(),
    params.legacyUserId
  );
  const otherInfo = rowStr(receivedInvite[0], 'other_info');
  const advPage = rowStr(receivedInvite[0], 'adv_page');

  const languageId = rowNum(promocode, 'language_id') || 1;
  const langColumn = await resolveLanguageColumn(languageId);
  const inviteMessageParagraph = await loadPromocodeInviteLanguageParagraph(String(languageId));
  const helpHtmlPageId = rowStr(promocode, 'help_html_page_id');
  const helpContent = await resolveHelpHtmlContent(helpHtmlPageId);
  const message = `${inviteMessageParagraph}${helpContent}`;

  const nameParts = await fetchUserNameParts(params.legacyUserId);
  const senderName = [nameParts.firstname, nameParts.lastname].filter(Boolean).join(' ').trim() || params.senderUsername;

  const promocodeCode = rowStr(promocode, 'code');
  const registrationUrl = buildRegisterUrl(
    params.origin,
    receiverEmail,
    promocodeCode,
    langColumn,
    { isStaff: false, inviterUsername: params.senderUsername }
  );

  const html = buildInviteEmailHtml({
    senderName,
    message,
    promocode: promocodeCode,
    otherInfo,
    advPage,
    registrationUrl,
  });

  try {
    await params.sendEmail({
      to: receiverEmail,
      subject: 'Email Invitation',
      html,
      replyTo: params.senderEmail,
    });
  } catch {
    return {
      status: 'error',
      message: 'Unable to send the invitation email. Please try again later.',
    };
  }

  const applyColumns = await getAppliesColumns();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const fields: string[] = [];
  const values: unknown[] = [];
  const add = (col: string, val: unknown) => {
    if (applyColumns.has(col)) {
      fields.push(`\`${col}\``);
      values.push(val);
    }
  };

  add('sender_id', params.legacyUserId);
  add('sender_email', params.senderEmail);
  add('receiver_email', receiverEmail);
  add('promocode_id', params.promocodeId);
  add('created', now);
  add('modified', now);
  add('delete_status', 2);
  add('level', '2');
  add('other_info', otherInfo);
  add('adv_page', advPage);

  if (fields.length > 0) {
    const placeholders = fields.map(() => '?').join(', ');
    try {
      await prisma.$queryRawUnsafe(
        `INSERT INTO \`${appliesTable}\` (${fields.join(', ')}) VALUES (${placeholders})`,
        ...values
      );
    } catch {
      return {
        status: 'error',
        message: 'Invitation was sent but could not be recorded. Please try again.',
      };
    }
  }

  return { status: 'success', message: 'Your invitation was sent successfully.' };
}

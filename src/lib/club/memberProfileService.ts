import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { randomBytes } from 'crypto';
import {
  calcAge,
  emptyActivities,
  emptyClubScoped,
  emptyContacts,
  emptyOwnerProfile,
  mergeClubScoped,
  normalizeContacts,
  safeJsonParse,
} from '@/lib/club/memberProfileDefaults';
import { getLatestMembershipDates } from '@/lib/club/memberMembershipArchive';
import { fetchClubOperatorOptions } from '@/lib/procedures/clubOperators';
import {
  normalizeSupportImageUrls,
  parseSupportImageUrlsJson,
} from '@/lib/messages/supportImages';
import type {
  ActivitiesData,
  ClubMemberScopedData,
  ContactsData,
  MemberProfileBundle,
  OwnerProfileData,
  ParentData,
} from '@/lib/club/memberProfileTypes';

function cuid() {
  return `c${randomBytes(12).toString('hex')}`;
}

function resolveSignatureDataUrl(clubData: ClubMemberScopedData): string | null {
  const parent = clubData.parents.signatureDataUrl?.trim();
  if (parent) return parent;
  const overage = clubData.otherDetails.signatureDataUrl?.trim();
  if (overage) return overage;
  return null;
}

function syncSignatureFromColumn(
  clubScoped: ClubMemberScopedData,
  signatureDataUrl: string | null | undefined,
  underage: boolean,
) {
  if (!signatureDataUrl?.trim()) return;
  const sig = signatureDataUrl.trim();
  const hadParent = Boolean(clubScoped.parents.signatureDataUrl?.trim());
  const hadOther = Boolean(clubScoped.otherDetails.signatureDataUrl?.trim());
  if (hadParent) {
    clubScoped.parents.signatureDataUrl = sig;
  } else if (hadOther) {
    clubScoped.otherDetails.signatureDataUrl = sig;
  } else if (underage) {
    clubScoped.parents.signatureDataUrl = sig;
  } else {
    clubScoped.otherDetails.signatureDataUrl = sig;
  }
}

/** Members may only update signature / acceptance fields on their own profile. */
function mergeMemberSelfClubSave(
  loaded: ClubMemberScopedData,
  incoming: ClubMemberScopedData,
): ClubMemberScopedData {
  const merged = mergeClubScoped(loaded);
  merged.otherDetails = {
    ...merged.otherDetails,
    signatureDataUrl: incoming.otherDetails.signatureDataUrl,
    acceptanceRules: incoming.otherDetails.acceptanceRules,
    privacyPolicyRead: incoming.otherDetails.privacyPolicyRead,
  };
  merged.parents = {
    ...merged.parents,
    signatureDataUrl: incoming.parents.signatureDataUrl,
    acceptanceRules: incoming.parents.acceptanceRules,
    privacyPolicyRead: incoming.parents.privacyPolicyRead,
  };
  return merged;
}

function parentDataForCopy(source: ParentData): ParentData {
  return {
    ...source,
    otherChildrenMemberIds: [],
  };
}

async function copyParentDataToTaggedMembers(opts: {
  clubId: string;
  sourceMemberId: string;
  parentSlot: 'parent1' | 'parent2';
  parentData: ParentData;
}) {
  const taggedIds = opts.parentData.otherChildrenMemberIds.filter(
    (id) => id && id !== opts.sourceMemberId,
  );
  if (taggedIds.length === 0) return;

  const payload = parentDataForCopy(opts.parentData);
  const now = new Date();

  for (const memberId of taggedIds) {
    const clubMember = await prisma.clubMember.findUnique({
      where: {
        clubId_memberId: { clubId: opts.clubId, memberId },
      },
      select: { id: true },
    });
    if (!clubMember) continue;

    const existing = await getClubProfile(clubMember.id);
    const clubScoped = mergeClubScoped(
      existing?.profileJson
        ? (safeJsonParse(existing.profileJson, {}) as Partial<ClubMemberScopedData>)
        : null,
    );
    clubScoped.parents = {
      ...clubScoped.parents,
      [opts.parentSlot]: {
        ...clubScoped.parents[opts.parentSlot],
        ...payload,
      },
    };

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE club_member_profiles SET profileJson=?, updatedAt=? WHERE clubMemberId=?`,
        JSON.stringify(clubScoped),
        now,
        clubMember.id,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO club_member_profiles (id, clubMemberId, profileJson, medicalImageUrl, medicalPdfUrl, signatureDataUrl, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
        cuid(),
        clubMember.id,
        JSON.stringify(clubScoped),
        null,
        null,
        null,
        now,
        now,
      );
    }
  }
}

function formatName(first?: string | null, surname?: string | null, name?: string | null) {
  const parts = [first, surname].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return name || '';
}

type ExtrasRow = {
  id: string;
  userId: string;
  disallowClubAdmins: number | boolean;
  qrCodeUrl: string | null;
  ownerJson: string;
  contactsJson: string;
  activitiesJson: string;
  referencesHtml: string | null;
};

type ProfileRow = {
  id: string;
  clubMemberId: string;
  profileJson: string;
  medicalImageUrl: string | null;
  medicalPdfUrl: string | null;
  signatureDataUrl: string | null;
};

type NoteRow = {
  id: string;
  clubMemberId: string;
  kind: string;
  title: string;
  body: string;
  authorId: string | null;
  parentId: string | null;
  visibleToMember: number | boolean;
  commentsEnabled: number | boolean;
  enableFrom: Date | null;
  enableTo: Date | null;
  showAtLogin: number | boolean;
  showAtLogout: number | boolean;
  imageUrlsJson?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function getExtras(userId: string): Promise<ExtrasRow | null> {
  const rows = await prisma.$queryRawUnsafe<ExtrasRow[]>(
    `SELECT * FROM user_profile_extras WHERE userId = ? LIMIT 1`,
    userId,
  );
  return rows[0] ?? null;
}

async function getClubProfile(clubMemberId: string): Promise<ProfileRow | null> {
  const rows = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT * FROM club_member_profiles WHERE clubMemberId = ? LIMIT 1`,
    clubMemberId,
  );
  return rows[0] ?? null;
}

async function getNotes(clubMemberId: string): Promise<NoteRow[]> {
  await ensureNoteImageColumn();
  return prisma.$queryRawUnsafe<NoteRow[]>(
    `SELECT * FROM club_member_notes WHERE clubMemberId = ? ORDER BY createdAt DESC`,
    clubMemberId,
  );
}

let noteImageColumnReady = false;

async function ensureNoteImageColumn() {
  if (noteImageColumnReady) return;
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'club_member_notes'`,
  );
  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  if (!columns.has('imageUrlsJson')) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE club_member_notes ADD COLUMN imageUrlsJson TEXT NULL`,
    );
  }
  noteImageColumnReady = true;
}

export async function loadMemberProfileBundle(opts: {
  clubId: string;
  memberUserId: string;
  viewerUserId: string;
}): Promise<MemberProfileBundle | { error: string; status: number }> {
  const club = await prisma.club.findUnique({
    where: { id: opts.clubId },
    select: { id: true, name: true, adminId: true },
  });
  if (!club) return { error: 'Club not found', status: 404 };

  const clubMember = await prisma.clubMember.findUnique({
    where: {
      clubId_memberId: { clubId: opts.clubId, memberId: opts.memberUserId },
    },
    include: {
      member: {
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          firstName: true,
          surname: true,
          gender: true,
          birthdate: true,
          country: true,
          image: true,
        },
      },
    },
  });
  if (!clubMember) return { error: 'Member not found in this club', status: 404 };

  const isClubAdmin = club.adminId === opts.viewerUserId;
  const isSelf = clubMember.memberId === opts.viewerUserId;
  if (!isClubAdmin && !isSelf) {
    return { error: 'Access denied', status: 403 };
  }

  const extras = await getExtras(opts.memberUserId);
  const clubProfile = await getClubProfile(clubMember.id);
  const notes = await getNotes(clubMember.id);

  const ownerStored = safeJsonParse(extras?.ownerJson, emptyOwnerProfile());
  const contactsRaw = safeJsonParse(extras?.contactsJson, emptyContacts());
  const activitiesRaw = safeJsonParse(extras?.activitiesJson, emptyActivities());
  const contacts: ContactsData = normalizeContacts(contactsRaw);
  const activities: ActivitiesData = {
    ...emptyActivities(),
    ...activitiesRaw,
    preferredDays: Array.isArray(activitiesRaw.preferredDays)
      ? activitiesRaw.preferredDays
      : [],
  };
  const clubScoped = mergeClubScoped(
    clubProfile?.profileJson
      ? (safeJsonParse(clubProfile.profileJson, {}) as Partial<ClubMemberScopedData>)
      : null,
  );

  const birthIso = clubMember.member.birthdate
    ? clubMember.member.birthdate.toISOString().slice(0, 10)
    : ownerStored.personal.dateOfBirth || '';
  const age = calcAge(birthIso);
  const underage = age != null && age < 18;

  const owner: OwnerProfileData = emptyOwnerProfile({
    ...ownerStored,
    privateSettings: {
      disallowClubAdmins: Boolean(extras?.disallowClubAdmins),
    },
    photoUrl: clubMember.member.image || ownerStored.photoUrl || '',
    qrCodeUrl: extras?.qrCodeUrl || ownerStored.qrCodeUrl || '',
    login: {
      ...emptyOwnerProfile().login,
      ...ownerStored.login,
      username: clubMember.member.username,
      firstName: clubMember.member.firstName || ownerStored.login?.firstName || '',
      lastName: clubMember.member.surname || ownerStored.login?.lastName || '',
      email: clubMember.member.email,
      newPassword: '',
      repeatPassword: '',
    },
    address: {
      ...emptyOwnerProfile().address,
      ...ownerStored.address,
      country: clubMember.member.country || ownerStored.address?.country || '',
    },
    personal: {
      ...emptyOwnerProfile().personal,
      ...ownerStored.personal,
      gender: clubMember.member.gender || ownerStored.personal?.gender || '',
      dateOfBirth: birthIso,
      age,
      otherSports: Array.isArray(ownerStored.personal?.otherSports)
        ? ownerStored.personal.otherSports
        : [],
    },
    administrative: {
      ...emptyOwnerProfile().administrative,
      ...ownerStored.administrative,
    },
    medical: {
      ...emptyOwnerProfile().medical,
      ...ownerStored.medical,
      // Owner (shared) medical files are source of truth; club columns are a mirror.
      imageUrl: ownerStored.medical?.imageUrl || clubProfile?.medicalImageUrl || '',
      pdfUrl: ownerStored.medical?.pdfUrl || clubProfile?.medicalPdfUrl || '',
    },
    otherReferences: {
      ...emptyOwnerProfile().otherReferences,
      ...ownerStored.otherReferences,
    },
  });

  clubScoped.otherDetails.userUnderage = underage;
  syncSignatureFromColumn(clubScoped, clubProfile?.signatureDataUrl, underage);

  const archiveDates = await getLatestMembershipDates(
    opts.clubId,
    opts.memberUserId,
    clubMember.joinedAt,
  );
  if (archiveDates) {
    if (!clubScoped.otherDetails.membershipFrom) {
      clubScoped.otherDetails.membershipFrom = archiveDates.from;
    }
    if (!clubScoped.otherDetails.membershipTo && archiveDates.to) {
      clubScoped.otherDetails.membershipTo = archiveDates.to;
    }
  }

  const disallow = Boolean(extras?.disallowClubAdmins);
  const canEditOwner = isSelf || (isClubAdmin && !disallow);
  const canEditContactsActivitiesReferences = isSelf;
  const canEditClubScoped = isClubAdmin;
  const canEditMemberSignature = isClubAdmin || isSelf;

  const allMembers = await prisma.clubMember.findMany({
    where: { clubId: opts.clubId },
    include: {
      member: { select: { id: true, firstName: true, surname: true, name: true, username: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const authorIds = Array.from(
    new Set(notes.map((n) => n.authorId).filter(Boolean) as string[]),
  );
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, username: true, name: true, image: true },
        })
      : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.username || a.name]));
  const authorImageMap = new Map(authors.map((a) => [a.id, a.image]));

  const staffRoots = notes.filter((n) => n.kind === 'staff' && !n.parentId);
  const coachRoots = notes.filter((n) => n.kind === 'coach' && !n.parentId);
  const repliesOf = (parentId: string) =>
    notes
      .filter((n) => n.parentId === parentId)
      .map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: new Date(n.createdAt).toISOString(),
        authorLabel: (n.authorId && authorMap.get(n.authorId)) || 'User',
      }));

  const visibility = clubScoped.visibility;

  const operatorOptions = await fetchClubOperatorOptions(opts.clubId);
  const vendorCoachOptionsMap = new Map<string, string>();
  for (const op of operatorOptions) {
    vendorCoachOptionsMap.set(op.id, op.name);
  }
  for (const m of allMembers) {
    if (vendorCoachOptionsMap.has(m.memberId)) continue;
    const label =
      formatName(m.member.firstName, m.member.surname, m.member.name) ||
      m.member.username;
    if (label) vendorCoachOptionsMap.set(m.memberId, label);
  }
  // Keep currently saved vendor/coach values visible even if not in club list.
  for (const id of clubScoped.otherDetails.vendors) {
    if (id && !vendorCoachOptionsMap.has(id)) {
      vendorCoachOptionsMap.set(id, id);
    }
  }
  if (
    clubScoped.otherDetails.coachName &&
    !vendorCoachOptionsMap.has(clubScoped.otherDetails.coachName)
  ) {
    vendorCoachOptionsMap.set(
      clubScoped.otherDetails.coachName,
      clubScoped.otherDetails.coachName,
    );
  }
  const vendorCoachOptions = Array.from(vendorCoachOptionsMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

  return {
    clubId: club.id,
    clubName: club.name,
    clubMemberId: clubMember.id,
    memberId: clubMember.memberId,
    role: clubMember.role,
    membershipType: clubMember.membershipType,
    viewer: {
      isClubAdmin,
      isSelf,
      canEditOwner,
      canEditContactsActivitiesReferences,
      canEditClubScoped,
      canEditMemberSignature,
    },
    user: {
      id: clubMember.member.id,
      username: clubMember.member.username,
      email: clubMember.member.email,
      name: clubMember.member.name,
      firstName: clubMember.member.firstName,
      surname: clubMember.member.surname,
      gender: clubMember.member.gender,
      birthdate: birthIso || null,
      country: clubMember.member.country,
      image: clubMember.member.image,
    },
    owner,
    contacts,
    activities,
    referencesHtml: extras?.referencesHtml || '',
    club: clubScoped,
    clubMembersForPayFor: allMembers
      .filter((m) => m.memberId !== opts.memberUserId)
      .map((m) => ({
        id: m.memberId,
        label:
          formatName(m.member.firstName, m.member.surname, m.member.name) ||
          m.member.username,
      })),
    vendorCoachOptions,
    staffNotes: (isClubAdmin || visibility.messagesStaff ? staffRoots : []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.createdAt).toISOString(),
      authorLabel: (n.authorId && authorMap.get(n.authorId)) || 'Staff',
      replies: repliesOf(n.id),
    })),
    coachNotes: (isClubAdmin || visibility.notesCoach ? coachRoots : [])
      .filter((n) => isClubAdmin || Boolean(n.visibleToMember))
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: new Date(n.createdAt).toISOString(),
        authorLabel: (n.authorId && authorMap.get(n.authorId)) || 'Coach',
        authorImage: (n.authorId && authorImageMap.get(n.authorId)) || null,
        visibleToMember: Boolean(n.visibleToMember),
        commentsEnabled: Boolean(n.commentsEnabled),
        imageUrls: parseSupportImageUrlsJson(n.imageUrlsJson),
        replies: repliesOf(n.id),
      })),
  };
}

async function upsertExtras(opts: {
  userId: string;
  disallowClubAdmins: boolean;
  qrCodeUrl: string | null;
  ownerJson: string;
  contactsJson: string;
  activitiesJson: string;
  referencesHtml: string | null;
}) {
  const existing = await getExtras(opts.userId);
  const now = new Date();
  if (existing) {
    await prisma.$executeRawUnsafe(
      `UPDATE user_profile_extras SET disallowClubAdmins=?, qrCodeUrl=?, ownerJson=?, contactsJson=?, activitiesJson=?, referencesHtml=?, updatedAt=? WHERE userId=?`,
      opts.disallowClubAdmins,
      opts.qrCodeUrl,
      opts.ownerJson,
      opts.contactsJson,
      opts.activitiesJson,
      opts.referencesHtml,
      now,
      opts.userId,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_profile_extras (id, userId, disallowClubAdmins, qrCodeUrl, ownerJson, contactsJson, activitiesJson, referencesHtml, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      cuid(),
      opts.userId,
      opts.disallowClubAdmins,
      opts.qrCodeUrl,
      opts.ownerJson,
      opts.contactsJson,
      opts.activitiesJson,
      opts.referencesHtml,
      now,
      now,
    );
  }
}

export async function saveMemberProfileBundle(opts: {
  clubId: string;
  memberUserId: string;
  viewerUserId: string;
  payload: {
    owner?: OwnerProfileData;
    contacts?: ContactsData;
    activities?: ActivitiesData;
    referencesHtml?: string;
    club?: ClubMemberScopedData;
  };
}): Promise<{ ok: true } | { error: string; status: number }> {
  const loaded = await loadMemberProfileBundle({
    clubId: opts.clubId,
    memberUserId: opts.memberUserId,
    viewerUserId: opts.viewerUserId,
  });
  if ('error' in loaded) return loaded;

  const clubMember = await prisma.clubMember.findUnique({
    where: {
      clubId_memberId: { clubId: opts.clubId, memberId: opts.memberUserId },
    },
    select: { id: true },
  });
  if (!clubMember) return { error: 'Member not found', status: 404 };

  if (opts.payload.owner && loaded.viewer.canEditOwner) {
    const owner = opts.payload.owner;
    const userUpdate: Record<string, unknown> = {
      firstName: owner.login.firstName || null,
      surname: owner.login.lastName || null,
      name:
        [owner.login.firstName, owner.login.lastName].filter(Boolean).join(' ') ||
        loaded.user.name,
      gender: owner.personal.gender || null,
      country: owner.address.country || null,
      image: owner.photoUrl || null,
    };
    if (owner.personal.dateOfBirth) {
      const d = new Date(owner.personal.dateOfBirth);
      if (!Number.isNaN(d.getTime())) userUpdate.birthdate = d;
    }
    if (owner.login.email && owner.login.email !== loaded.user.email) {
      userUpdate.email = owner.login.email.trim();
    }
    if (
      owner.login.newPassword &&
      owner.login.newPassword === owner.login.repeatPassword &&
      owner.login.newPassword.length >= 4
    ) {
      userUpdate.password = await hashPassword(owner.login.newPassword);
    }

    await prisma.user.update({
      where: { id: opts.memberUserId },
      data: userUpdate,
    });

    const ownerToStore: OwnerProfileData = {
      ...owner,
      login: { ...owner.login, newPassword: '', repeatPassword: '' },
    };

    await upsertExtras({
      userId: opts.memberUserId,
      disallowClubAdmins: loaded.viewer.isSelf
        ? Boolean(owner.privateSettings.disallowClubAdmins)
        : loaded.owner.privateSettings.disallowClubAdmins,
      qrCodeUrl: owner.qrCodeUrl || null,
      ownerJson: JSON.stringify({
        ...ownerToStore,
        privateSettings: {
          disallowClubAdmins: loaded.viewer.isSelf
            ? Boolean(owner.privateSettings.disallowClubAdmins)
            : loaded.owner.privateSettings.disallowClubAdmins,
        },
      }),
      contactsJson: JSON.stringify(loaded.contacts),
      activitiesJson: JSON.stringify(loaded.activities),
      referencesHtml: loaded.referencesHtml || null,
    });

    const medicalImage = owner.medical.imageUrl || null;
    const medicalPdf = owner.medical.pdfUrl || null;
    if (medicalImage || medicalPdf) {
      const now = new Date();
      const existingProfile = await getClubProfile(clubMember.id);
      if (existingProfile) {
        await prisma.$executeRawUnsafe(
          `UPDATE club_member_profiles SET medicalImageUrl=?, medicalPdfUrl=?, updatedAt=? WHERE clubMemberId=?`,
          medicalImage,
          medicalPdf,
          now,
          clubMember.id,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO club_member_profiles (id, clubMemberId, profileJson, medicalImageUrl, medicalPdfUrl, signatureDataUrl, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
          cuid(),
          clubMember.id,
          JSON.stringify(loaded.club),
          medicalImage,
          medicalPdf,
          loaded.club.otherDetails.signatureDataUrl || loaded.club.parents.signatureDataUrl || null,
          now,
          now,
        );
      }
    }
  }

  if (
    (opts.payload.contacts ||
      opts.payload.activities ||
      typeof opts.payload.referencesHtml === 'string') &&
    loaded.viewer.canEditContactsActivitiesReferences
  ) {
    const contacts = normalizeContacts(opts.payload.contacts ?? loaded.contacts);
    const activities = opts.payload.activities ?? loaded.activities;
    const referencesHtml =
      typeof opts.payload.referencesHtml === 'string'
        ? opts.payload.referencesHtml
        : loaded.referencesHtml;

    await upsertExtras({
      userId: opts.memberUserId,
      disallowClubAdmins: loaded.owner.privateSettings.disallowClubAdmins,
      qrCodeUrl: loaded.owner.qrCodeUrl || null,
      ownerJson: JSON.stringify(loaded.owner),
      contactsJson: JSON.stringify(contacts),
      activitiesJson: JSON.stringify(activities),
      referencesHtml: referencesHtml || null,
    });
  }

  if (opts.payload.club) {
    const canSaveClub =
      loaded.viewer.canEditClubScoped || loaded.viewer.canEditMemberSignature;
    if (canSaveClub) {
      let clubData = opts.payload.club;
      if (!loaded.viewer.canEditClubScoped && loaded.viewer.isSelf) {
        clubData = mergeMemberSelfClubSave(loaded.club, clubData);
      }
      const age = calcAge(loaded.owner.personal.dateOfBirth);
      clubData.otherDetails.userUnderage = age != null && age < 18;
      const signatureDataUrl = resolveSignatureDataUrl(clubData);
      const now = new Date();
      const existing = await getClubProfile(clubMember.id);
      if (existing) {
        await prisma.$executeRawUnsafe(
          `UPDATE club_member_profiles SET profileJson=?, signatureDataUrl=?, updatedAt=? WHERE clubMemberId=?`,
          JSON.stringify(clubData),
          signatureDataUrl,
          now,
          clubMember.id,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO club_member_profiles (id, clubMemberId, profileJson, medicalImageUrl, medicalPdfUrl, signatureDataUrl, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
          cuid(),
          clubMember.id,
          JSON.stringify(clubData),
          loaded.owner.medical.imageUrl || null,
          loaded.owner.medical.pdfUrl || null,
          signatureDataUrl,
          now,
          now,
        );
      }

      if (loaded.viewer.canEditClubScoped) {
        await copyParentDataToTaggedMembers({
          clubId: opts.clubId,
          sourceMemberId: opts.memberUserId,
          parentSlot: 'parent1',
          parentData: clubData.parents.parent1,
        });
        await copyParentDataToTaggedMembers({
          clubId: opts.clubId,
          sourceMemberId: opts.memberUserId,
          parentSlot: 'parent2',
          parentData: clubData.parents.parent2,
        });
      }
    }
  }

  return { ok: true };
}

export async function loadSelfMemberProfileBundle(opts: {
  userId: string;
}): Promise<MemberProfileBundle | { error: string; status: number }> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      firstName: true,
      surname: true,
      gender: true,
      birthdate: true,
      country: true,
      image: true,
    },
  });
  if (!user) return { error: 'User not found', status: 404 };

  const extras = await getExtras(opts.userId);
  const ownerStored = safeJsonParse(extras?.ownerJson, emptyOwnerProfile());
  const contacts = normalizeContacts(safeJsonParse(extras?.contactsJson, emptyContacts()));
  const activitiesRaw = safeJsonParse(extras?.activitiesJson, emptyActivities());
  const activities: ActivitiesData = {
    ...emptyActivities(),
    ...activitiesRaw,
    preferredDays: Array.isArray(activitiesRaw.preferredDays)
      ? activitiesRaw.preferredDays
      : [],
  };

  const birthIso = user.birthdate ? user.birthdate.toISOString().slice(0, 10) : ownerStored.personal.dateOfBirth || '';
  const age = calcAge(birthIso);

  const owner: OwnerProfileData = emptyOwnerProfile({
    ...ownerStored,
    privateSettings: {
      disallowClubAdmins: Boolean(extras?.disallowClubAdmins),
    },
    photoUrl: user.image || ownerStored.photoUrl || '',
    qrCodeUrl: extras?.qrCodeUrl || ownerStored.qrCodeUrl || '',
    login: {
      ...emptyOwnerProfile().login,
      ...ownerStored.login,
      username: user.username,
      firstName: user.firstName || ownerStored.login?.firstName || '',
      lastName: user.surname || ownerStored.login?.lastName || '',
      email: user.email,
      newPassword: '',
      repeatPassword: '',
    },
    address: {
      ...emptyOwnerProfile().address,
      ...ownerStored.address,
      country: user.country || ownerStored.address?.country || '',
    },
    personal: {
      ...emptyOwnerProfile().personal,
      ...ownerStored.personal,
      gender: user.gender || ownerStored.personal?.gender || '',
      dateOfBirth: birthIso,
      age,
      otherSports: Array.isArray(ownerStored.personal?.otherSports)
        ? ownerStored.personal.otherSports
        : [],
    },
    administrative: {
      ...emptyOwnerProfile().administrative,
      ...ownerStored.administrative,
    },
    medical: {
      ...emptyOwnerProfile().medical,
      ...ownerStored.medical,
    },
    otherReferences: {
      ...emptyOwnerProfile().otherReferences,
      ...ownerStored.otherReferences,
    },
  });

  return {
    clubId: '',
    clubName: '',
    clubMemberId: '',
    memberId: user.id,
    role: null,
    membershipType: null,
    viewer: {
      isClubAdmin: false,
      isSelf: true,
      canEditOwner: true,
      canEditContactsActivitiesReferences: true,
      canEditClubScoped: false,
      canEditMemberSignature: false,
    },
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      surname: user.surname,
      gender: user.gender,
      birthdate: birthIso || null,
      country: user.country,
      image: user.image,
    },
    owner,
    contacts: normalizeContacts(contacts),
    activities,
    referencesHtml: extras?.referencesHtml || '',
    club: emptyClubScoped(),
    clubMembersForPayFor: [],
    vendorCoachOptions: [],
    staffNotes: [],
    coachNotes: [],
  };
}

export async function saveSelfMemberProfileBundle(opts: {
  userId: string;
  payload: {
    owner?: OwnerProfileData;
    contacts?: ContactsData;
    activities?: ActivitiesData;
    referencesHtml?: string;
  };
}): Promise<{ ok: true } | { error: string; status: number }> {
  const loaded = await loadSelfMemberProfileBundle({ userId: opts.userId });
  if ('error' in loaded) return loaded;

  if (opts.payload.owner) {
    const owner = opts.payload.owner;
    const userUpdate: Record<string, unknown> = {
      firstName: owner.login.firstName || null,
      surname: owner.login.lastName || null,
      name:
        [owner.login.firstName, owner.login.lastName].filter(Boolean).join(' ') ||
        loaded.user.name,
      gender: owner.personal.gender || null,
      country: owner.address.country || null,
      image: owner.photoUrl || null,
    };
    if (owner.personal.dateOfBirth) {
      const d = new Date(owner.personal.dateOfBirth);
      if (!Number.isNaN(d.getTime())) userUpdate.birthdate = d;
    }
    if (owner.login.email && owner.login.email !== loaded.user.email) {
      userUpdate.email = owner.login.email.trim();
    }
    if (
      owner.login.newPassword &&
      owner.login.newPassword === owner.login.repeatPassword &&
      owner.login.newPassword.length >= 4
    ) {
      userUpdate.password = await hashPassword(owner.login.newPassword);
    }

    await prisma.user.update({
      where: { id: opts.userId },
      data: userUpdate,
    });

    const ownerToStore: OwnerProfileData = {
      ...owner,
      login: { ...owner.login, newPassword: '', repeatPassword: '' },
      privateSettings: {
        disallowClubAdmins: Boolean(owner.privateSettings.disallowClubAdmins),
      },
    };

    await upsertExtras({
      userId: opts.userId,
      disallowClubAdmins: Boolean(owner.privateSettings.disallowClubAdmins),
      qrCodeUrl: owner.qrCodeUrl || null,
      ownerJson: JSON.stringify(ownerToStore),
      contactsJson: JSON.stringify(loaded.contacts),
      activitiesJson: JSON.stringify(loaded.activities),
      referencesHtml: loaded.referencesHtml || null,
    });
  }

  if (
    opts.payload.contacts ||
    opts.payload.activities ||
    typeof opts.payload.referencesHtml === 'string'
  ) {
    const contacts = normalizeContacts(opts.payload.contacts ?? loaded.contacts);
    const activities = opts.payload.activities ?? loaded.activities;
    const referencesHtml =
      typeof opts.payload.referencesHtml === 'string'
        ? opts.payload.referencesHtml
        : loaded.referencesHtml;

    await upsertExtras({
      userId: opts.userId,
      disallowClubAdmins: loaded.owner.privateSettings.disallowClubAdmins,
      qrCodeUrl: loaded.owner.qrCodeUrl || null,
      ownerJson: JSON.stringify(loaded.owner),
      contactsJson: JSON.stringify(contacts),
      activitiesJson: JSON.stringify(activities),
      referencesHtml: referencesHtml || null,
    });
  }

  return { ok: true };
}

export async function getMemberNoteById(clubMemberId: string, noteId: string) {
  await ensureNoteImageColumn();
  const rows = await prisma.$queryRawUnsafe<NoteRow[]>(
    `SELECT * FROM club_member_notes WHERE clubMemberId = ? AND id = ? LIMIT 1`,
    clubMemberId,
    noteId,
  );
  return rows[0] ?? null;
}

export async function getClubMemberVisibility(clubMemberId: string) {
  const profile = await getClubProfile(clubMemberId);
  const clubScoped = mergeClubScoped(
    profile?.profileJson
      ? (safeJsonParse(profile.profileJson, {}) as Partial<ClubMemberScopedData>)
      : undefined,
  );
  return clubScoped.visibility;
}

export async function createMemberNote(opts: {
  clubMemberId: string;
  kind: string;
  title: string;
  body: string;
  authorId: string;
  parentId?: string | null;
  visibleToMember?: boolean;
  commentsEnabled?: boolean;
  imageUrls?: string[];
  enableFrom?: Date | null;
  enableTo?: Date | null;
  showAtLogin?: boolean;
  showAtLogout?: boolean;
}) {
  await ensureNoteImageColumn();
  const now = new Date();
  const id = cuid();
  const imageUrlsJson = JSON.stringify(normalizeSupportImageUrls(opts.imageUrls ?? []));
  await prisma.$executeRawUnsafe(
    `INSERT INTO club_member_notes (id, clubMemberId, kind, title, body, authorId, parentId, visibleToMember, commentsEnabled, imageUrlsJson, enableFrom, enableTo, showAtLogin, showAtLogout, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    opts.clubMemberId,
    opts.kind,
    opts.title,
    opts.body,
    opts.authorId,
    opts.parentId || null,
    Boolean(opts.visibleToMember),
    Boolean(opts.commentsEnabled),
    imageUrlsJson,
    opts.enableFrom || null,
    opts.enableTo || null,
    Boolean(opts.showAtLogin),
    Boolean(opts.showAtLogout),
    now,
    now,
  );
  return { id };
}

export async function deleteMemberNotes(opts: {
  clubMemberId: string;
  noteId?: string;
  resetKind?: string;
}) {
  if (opts.resetKind) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM club_member_notes WHERE clubMemberId=? AND kind=?`,
      opts.clubMemberId,
      opts.resetKind,
    );
    return;
  }
  if (opts.noteId) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM club_member_notes WHERE clubMemberId=? AND (id=? OR parentId=?)`,
      opts.clubMemberId,
      opts.noteId,
      opts.noteId,
    );
  }
}

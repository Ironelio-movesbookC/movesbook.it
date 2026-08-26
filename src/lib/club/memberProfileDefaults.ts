import type {
  ActivitiesData,
  ClubMemberScopedData,
  ContactsData,
  OwnerProfileData,
  ParentData,
} from '@/lib/club/memberProfileTypes';

function emptyParent(): ParentData {
  return {
    name: '',
    surname: '',
    fiscalCode: '',
    kinship: '',
    birthDate: '',
    location: '',
    phone1: '',
    phone2: '',
    mainEmail: '',
    alternativeMail: '',
    residentialAddress: '',
    whatsappGroup: false,
    telegramGroup: false,
    otherChildrenMemberIds: [],
  };
}

function parseMemberIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeParentData(partial?: Partial<ParentData> & { otherChildrenTags?: string }): ParentData {
  const base = emptyParent();
  if (!partial) return base;
  const ids = parseMemberIds(
    partial.otherChildrenMemberIds ?? partial.otherChildrenTags ?? base.otherChildrenMemberIds,
  );
  return {
    ...base,
    ...partial,
    otherChildrenMemberIds: ids,
  };
}


export function emptyOwnerProfile(partial?: Partial<OwnerProfileData>): OwnerProfileData {
  return {
    privateSettings: { disallowClubAdmins: false },
    photoUrl: '',
    qrCodeUrl: '',
    login: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      newPassword: '',
      repeatPassword: '',
    },
    address: {
      country: '',
      region: '',
      province: '',
      city: '',
      zipCode: '',
      address: '',
      geoCoordinates: '',
      alternativeMail: '',
      phone: '',
      phoneWhatsapp: false,
      phoneTelegram: false,
      mobile1: '',
      mobile1Whatsapp: false,
      mobile1Telegram: false,
      mobile2: '',
      mobile2Whatsapp: false,
      mobile2Telegram: false,
      whatsappGroupName: '',
      telegramGroupName: '',
    },
    personal: {
      gender: '',
      dateOfBirth: '',
      age: null,
      locationOfBirth: '',
      provinceOfBirth: '',
      nameDay: '',
      occupation: '',
      sinceDate: '',
      mainSport: '',
      otherSports: [],
    },
    administrative: {
      fiscalCode: '',
      documentId: '',
      citizenship: '',
      carDrivingLicense: '',
    },
    medical: {
      bloodGroup: '',
      medicalExamination: '',
      releaseDate: '',
      expirationDate: '',
      alert30gg: false,
      outcome: '',
      doctorWhoIssued: '',
      emergencyContactPhone: '',
      emergencyContactName: '',
      allergies: '',
      imageUrl: '',
      pdfUrl: '',
    },
    otherReferences: {
      language: 'en',
      timezone: 'Europe/Rome',
      unitOfMeasure: 'metric',
      theme: 'classic',
      notes: '',
    },
    ...partial,
  };
}

const EMPTY_CONTACT_LINK = { url: '', showInPublicInfo: false };

function parseCategoryIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function emptyContacts(): ContactsData {
  return {
    alternateEmail: '',
    phonePrefix: '',
    phoneNumber: '',
    socialSites: [
      { platform: 'Facebook', url: '' },
      { platform: 'Twitter', url: '' },
    ],
    myWebsite: { ...EMPTY_CONTACT_LINK },
    whatsapp: { ...EMPTY_CONTACT_LINK },
    instagram: { ...EMPTY_CONTACT_LINK },
    youtube: { ...EMPTY_CONTACT_LINK },
    linkedin: { ...EMPTY_CONTACT_LINK },
    blogSite: { ...EMPTY_CONTACT_LINK },
    googleMap: { ...EMPTY_CONTACT_LINK },
    aboutMe: '',
  };
}

function asContactLink(raw: unknown, legacyUrl?: unknown): ContactsData['myWebsite'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      url: typeof o.url === 'string' ? o.url : '',
      showInPublicInfo: Boolean(
        o.showInPublicInfo ?? o.showInClubAdminInfo ?? false,
      ),
    };
  }
  if (typeof raw === 'string') {
    return { url: raw, showInPublicInfo: false };
  }
  if (typeof legacyUrl === 'string') {
    return { url: legacyUrl, showInPublicInfo: false };
  }
  return { ...EMPTY_CONTACT_LINK };
}

function asSocialSite(
  raw: unknown,
  fallbackPlatform: string,
): { platform: string; url: string } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      platform:
        typeof o.platform === 'string' && o.platform.trim()
          ? o.platform.trim()
          : fallbackPlatform,
      url: typeof o.url === 'string' ? o.url : '',
    };
  }
  return { platform: fallbackPlatform, url: '' };
}

/** Normalize contacts JSON (supports legacy flat website/whatsapp string fields). */
export function normalizeContacts(raw: unknown): ContactsData {
  const base = emptyContacts();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const socialRaw = Array.isArray(o.socialSites) ? o.socialSites : [];
  return {
    alternateEmail: typeof o.alternateEmail === 'string' ? o.alternateEmail : '',
    phonePrefix: typeof o.phonePrefix === 'string' ? o.phonePrefix : '',
    phoneNumber: typeof o.phoneNumber === 'string' ? o.phoneNumber : '',
    socialSites: [
      asSocialSite(socialRaw[0], 'Facebook'),
      asSocialSite(socialRaw[1], 'Twitter'),
    ],
    myWebsite: asContactLink(o.myWebsite, o.website),
    whatsapp: asContactLink(o.whatsapp),
    instagram: asContactLink(o.instagram),
    youtube: asContactLink(o.youtube),
    linkedin: asContactLink(o.linkedin),
    blogSite: asContactLink(o.blogSite),
    googleMap: asContactLink(o.googleMap),
    aboutMe: typeof o.aboutMe === 'string' ? o.aboutMe : '',
  };
}

export function emptyActivities(): ActivitiesData {
  return {
    notes: '',
    preferredDays: [],
    preferredTime: '',
  };
}

export function emptyClubScoped(): ClubMemberScopedData {
  return {
    visibility: {
      otherDetails: true,
      parents: true,
      settings: true,
      messagesStaff: true,
      notesCoach: false,
      notesCoachComments: false,
      presences: false,
      payFor: false,
    },
    payForMemberIds: [],
    otherDetails: {
      membershipFrom: '',
      membershipTo: '',
      privacyDataTreatments: false,
      privacyThirdParty: false,
      userUnderage: false,
      underageCode: '',
      vendorsEnabled: false,
      vendors: [],
      enableCommission: false,
      coachEnabled: false,
      coachName: '',
      insuranceCompany: '',
      insuranceDeadline: '',
      badges: [
        { name: '', deadline: '' },
        { name: '', deadline: '' },
      ],
      badgeFederationType: '',
      sportSeason: String(new Date().getFullYear()),
      acceptanceRules: false,
      privacyPolicyRead: false,
      signatureDataUrl: '',
      newsReadEnabled: false,
      newsReadCategories: [],
      newsPostEnabled: false,
      newsPostCategories: [],
      genericAutoMessages: false,
      specificAlertMessages: false,
    },
    parents: {
      parent1: emptyParent(),
      parent2: emptyParent(),
      invoice: { fullName: '', fiscalCode: '', address: '' },
      deduction: { enabled: false, year: String(new Date().getFullYear()) },
      acceptanceRules: false,
      privacyPolicyRead: false,
      signatureDataUrl: '',
    },
    settings: {
      clubGymEnabled: true,
      teamFootballEnabled: false,
      sportMode: 'CLUB-GYM',
      memberTypeId: '',
      discounts: {
        subscript: '',
        service: '',
        barRest: '',
        supply: '',
        clothing: '',
        outfit: '',
      },
      debtPurchases: '',
      heartRate: '',
      athleticLevel: '',
      sharingDefault: 'Coaches & team friends',
      followUpNotifications: 'No notifications',
      informationUpdates: false,
      accessControl: {
        activeBlockAccess: 'analyzes_all',
        freeAccessDate: '',
        activeBlockAccessFrom: '',
        activeBlockAccessTo: '',
        debtMax: '',
      },
      secondaryScreen: {
        enabled: false,
        memberName: false,
        expSubscription: false,
        memberPhoto: false,
        outcomeAccess: false,
        residualDebt: false,
        audioMessages: false,
        birthDay: false,
        otherManagementData: false,
        msgFromOtherMember: false,
      },
      football: {
        annualMembershipFee: '',
        firstPaymentDate: '',
        secondPaymentDate: '',
        thirdPaymentDate: '',
        paymentMethod: '',
        paymentStatus: '',
        receiptIssued: false,
        imageRelease: false,
        travelAuthorization: false,
        athleteStatus: 'Active',
        sportsPlayed: [],
        teamNames: '',
        previousClub: '',
        releaseDate: '',
        playerRegistration: 'No',
        category: '',
        sportsSeason: String(new Date().getFullYear()),
        position: '',
        footHand: '',
        jerseyNumber: '',
        coach: '',
        startDateWithTeam: '',
      },
    },
    staffMessage: {
      enableFrom: '',
      enableTo: '',
      showAtLogin: false,
      showAtLogout: false,
      html: '',
    },
  };
}

export function calcAge(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isMemberUnderage(dateOfBirth: string | null | undefined): boolean {
  const age = calcAge(dateOfBirth || '');
  return age != null && age < 18;
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

/** Deep-merge club-scoped JSON so older/partial rows still have every nested field. */
export function mergeClubScoped(partial?: Partial<ClubMemberScopedData> | null): ClubMemberScopedData {
  const base = emptyClubScoped();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    visibility: { ...base.visibility, ...(partial.visibility || {}) },
    payForMemberIds: Array.isArray(partial.payForMemberIds)
      ? partial.payForMemberIds
      : base.payForMemberIds,
    otherDetails: {
      ...base.otherDetails,
      ...(partial.otherDetails || {}),
      badges:
        Array.isArray(partial.otherDetails?.badges) && partial.otherDetails!.badges.length
          ? partial.otherDetails!.badges
          : base.otherDetails.badges,
      vendors: Array.isArray(partial.otherDetails?.vendors)
        ? partial.otherDetails!.vendors
        : base.otherDetails.vendors,
      newsReadCategories: parseCategoryIds(
        partial.otherDetails?.newsReadCategories ?? base.otherDetails.newsReadCategories,
      ),
      newsPostCategories: parseCategoryIds(
        partial.otherDetails?.newsPostCategories ?? base.otherDetails.newsPostCategories,
      ),
    },
    parents: {
      ...base.parents,
      ...(partial.parents || {}),
      parent1: normalizeParentData({
        ...base.parents.parent1,
        ...(partial.parents?.parent1 || {}),
      }),
      parent2: normalizeParentData({
        ...base.parents.parent2,
        ...(partial.parents?.parent2 || {}),
      }),
      invoice: { ...base.parents.invoice, ...(partial.parents?.invoice || {}) },
      deduction: { ...base.parents.deduction, ...(partial.parents?.deduction || {}) },
    },
    settings: {
      ...base.settings,
      ...(partial.settings || {}),
      clubGymEnabled:
        partial.settings?.clubGymEnabled ??
        (partial.settings?.sportMode !== 'TEAM-FOOTBALL'),
      teamFootballEnabled:
        partial.settings?.teamFootballEnabled ??
        partial.settings?.sportMode === 'TEAM-FOOTBALL',
      sportMode:
        partial.settings?.sportMode ??
        (partial.settings?.teamFootballEnabled && !partial.settings?.clubGymEnabled
          ? 'TEAM-FOOTBALL'
          : 'CLUB-GYM'),
      memberTypeId:
        partial.settings?.memberTypeId ??
        (partial.settings?.memberType && /^\d+$/.test(String(partial.settings.memberType))
          ? String(partial.settings.memberType)
          : base.settings.memberTypeId),
      discounts: {
        ...base.settings.discounts,
        ...(partial.settings?.discounts || {}),
      },
      accessControl: {
        ...base.settings.accessControl,
        ...(partial.settings?.accessControl || {}),
      },
      secondaryScreen: {
        ...base.settings.secondaryScreen,
        ...(partial.settings?.secondaryScreen || {}),
      },
      football: {
        ...base.settings.football,
        ...(partial.settings?.football || {}),
        sportsPlayed: Array.isArray(partial.settings?.football?.sportsPlayed)
          ? partial.settings!.football!.sportsPlayed
          : base.settings.football.sportsPlayed,
      },
    },
    staffMessage: {
      ...base.staffMessage,
      ...(partial.staffMessage || {}),
    },
  };
}

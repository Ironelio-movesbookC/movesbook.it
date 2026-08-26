/** Shared Owner-profile / contacts / activities (user DB). */
export type OwnerProfileData = {
  privateSettings: {
    disallowClubAdmins: boolean;
  };
  photoUrl: string;
  qrCodeUrl: string;
  login: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    newPassword: string;
    repeatPassword: string;
  };
  address: {
    country: string;
    region: string;
    province: string;
    city: string;
    zipCode: string;
    address: string;
    geoCoordinates: string;
    alternativeMail: string;
    phone: string;
    phoneWhatsapp: boolean;
    phoneTelegram: boolean;
    mobile1: string;
    mobile1Whatsapp: boolean;
    mobile1Telegram: boolean;
    mobile2: string;
    mobile2Whatsapp: boolean;
    mobile2Telegram: boolean;
    whatsappGroupName: string;
    telegramGroupName: string;
  };
  personal: {
    gender: string;
    dateOfBirth: string;
    age: number | null;
    locationOfBirth: string;
    provinceOfBirth: string;
    nameDay: string;
    occupation: string;
    sinceDate: string;
    mainSport: string;
    otherSports: string[];
  };
  administrative: {
    fiscalCode: string;
    documentId: string;
    citizenship: string;
    carDrivingLicense: string;
  };
  medical: {
    bloodGroup: string;
    medicalExamination: string;
    releaseDate: string;
    expirationDate: string;
    alert30gg: boolean;
    outcome: string;
    doctorWhoIssued: string;
    emergencyContactPhone: string;
    emergencyContactName: string;
    allergies: string;
    imageUrl: string;
    pdfUrl: string;
  };
  otherReferences: {
    language: string;
    timezone: string;
    unitOfMeasure: string;
    theme: string;
    notes: string;
  };
};

export type ContactsData = {
  alternateEmail: string;
  phonePrefix: string;
  phoneNumber: string;
  socialSites: [{ platform: string; url: string }, { platform: string; url: string }];
  myWebsite: { url: string; showInPublicInfo: boolean };
  whatsapp: { url: string; showInPublicInfo: boolean };
  instagram: { url: string; showInPublicInfo: boolean };
  youtube: { url: string; showInPublicInfo: boolean };
  linkedin: { url: string; showInPublicInfo: boolean };
  blogSite: { url: string; showInPublicInfo: boolean };
  googleMap: { url: string; showInPublicInfo: boolean };
  aboutMe: string;
  /** @deprecated legacy flat fields — migrated by normalizeContacts */
  website?: string;
};

export type ActivitiesData = {
  notes: string;
  preferredDays: string[];
  preferredTime: string;
};

export type ClubVisibilityFlags = {
  otherDetails: boolean;
  parents: boolean;
  settings: boolean;
  messagesStaff: boolean;
  notesCoach: boolean;
  notesCoachComments: boolean;
  presences: boolean;
  payFor: boolean;
};

export type ParentData = {
  name: string;
  surname: string;
  fiscalCode: string;
  kinship: string;
  birthDate: string;
  location: string;
  phone1: string;
  phone2: string;
  mainEmail: string;
  alternativeMail: string;
  residentialAddress: string;
  whatsappGroup: boolean;
  telegramGroup: boolean;
  /** Tagged club member ids (siblings); parent data is copied to their profiles on save. */
  otherChildrenMemberIds: string[];
};

export type ClubMemberScopedData = {
  visibility: ClubVisibilityFlags;
  payForMemberIds: string[];
  otherDetails: {
    membershipFrom: string;
    membershipTo: string;
    privacyDataTreatments: boolean;
    privacyThirdParty: boolean;
    userUnderage: boolean;
    underageCode: string;
    vendorsEnabled: boolean;
    /** Selected vendor option ids (PHP load_from_vendor; UI select, max 3). */
    vendors: string[];
    enableCommission: boolean;
    coachEnabled: boolean;
    /** Selected coach option id (PHP load_from_coach). */
    coachName: string;
    insuranceCompany: string;
    insuranceDeadline: string;
    badges: Array<{ name: string; deadline: string }>;
    badgeFederationType: string;
    sportSeason: string;
    acceptanceRules: boolean;
    privacyPolicyRead: boolean;
    signatureDataUrl: string;
    newsReadEnabled: boolean;
    /** Selected news category ids (PHP new_cat_id). */
    newsReadCategories: string[];
    newsPostEnabled: boolean;
    /** Selected news category ids (PHP postnew_cat_id). */
    newsPostCategories: string[];
    genericAutoMessages: boolean;
    specificAlertMessages: boolean;
  };
  parents: {
    parent1: ParentData;
    parent2: ParentData;
    invoice: { fullName: string; fiscalCode: string; address: string };
    deduction: { enabled: boolean; year: string };
    acceptanceRules: boolean;
    privacyPolicyRead: boolean;
    signatureDataUrl: string;
  };
  settings: {
    /** The settings if the member is member of a CLUB-GYM */
    clubGymEnabled: boolean;
    /** The settings if the member is member of a TEAM-FOOTBALL */
    teamFootballEnabled: boolean;
    /** Club setting member type id (PHP member_type_id). */
    memberTypeId: string;
    discounts: {
      subscript: string;
      service: string;
      barRest: string;
      supply: string;
      clothing: string;
      outfit: string;
    };
    debtPurchases: string;
    heartRate: string;
    athleticLevel: string;
    sharingDefault: string;
    followUpNotifications: string;
    informationUpdates: boolean;
    accessControl: {
      activeBlockAccess: 'analyzes_all' | 'free_access' | 'access_from';
      freeAccessDate: string;
      activeBlockAccessFrom: string;
      activeBlockAccessTo: string;
      debtMax: string;
    };
    secondaryScreen: {
      enabled: boolean;
      memberName: boolean;
      expSubscription: boolean;
      memberPhoto: boolean;
      outcomeAccess: boolean;
      residualDebt: boolean;
      audioMessages: boolean;
      birthDay: boolean;
      otherManagementData: boolean;
      msgFromOtherMember: boolean;
    };
    /** Primary sport mode view (controls TEAM-FOOTBALL vs CLUB-GYM section below). */
    sportMode: 'CLUB-GYM' | 'TEAM-FOOTBALL';
    football: {
      annualMembershipFee: string;
      firstPaymentDate: string;
      secondPaymentDate: string;
      thirdPaymentDate: string;
      paymentMethod: string;
      paymentStatus: string;
      receiptIssued: boolean;
      imageRelease: boolean;
      travelAuthorization: boolean;
      athleteStatus: string;
      sportsPlayed: string[];
      teamNames: string;
      previousClub: string;
      releaseDate: string;
      playerRegistration: string;
      category: string;
      sportsSeason: string;
      position: string;
      footHand: string;
      jerseyNumber: string;
      coach: string;
      startDateWithTeam: string;
    };
  };
  staffMessage: {
    enableFrom: string;
    enableTo: string;
    showAtLogin: boolean;
    showAtLogout: boolean;
    html: string;
  };
};

export type MemberProfileBundle = {
  clubId: string;
  clubName: string;
  clubMemberId: string;
  memberId: string;
  role: string | null;
  membershipType: string | null;
  viewer: {
    isClubAdmin: boolean;
    isSelf: boolean;
    canEditOwner: boolean;
    canEditContactsActivitiesReferences: boolean;
    canEditClubScoped: boolean;
    /** Member may save their own signature / acceptance fields. */
    canEditMemberSignature: boolean;
  };
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    firstName: string | null;
    surname: string | null;
    gender: string | null;
    birthdate: string | null;
    country: string | null;
    image: string | null;
  };
  owner: OwnerProfileData;
  contacts: ContactsData;
  activities: ActivitiesData;
  referencesHtml: string;
  club: ClubMemberScopedData;
  clubMembersForPayFor: Array<{ id: string; label: string }>;
  /** Options for Vendors / Coach selects (club operators + members). */
  vendorCoachOptions: Array<{ id: string; label: string }>;
  staffNotes: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    authorLabel: string;
    replies: Array<{ id: string; body: string; createdAt: string; authorLabel: string }>;
  }>;
  coachNotes: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    authorLabel: string;
    visibleToMember: boolean;
    commentsEnabled: boolean;
    imageUrls: string[];
    authorImage?: string | null;
    replies: Array<{ id: string; body: string; createdAt: string; authorLabel: string }>;
  }>;
};

export const MAIN_SPORTS = [
  'Basket',
  'Body Building',
  'Cycling',
  'Football',
  'Gymnastic',
  'Martial arts',
  'Swimming',
  'Volley',
  'Gym',
] as const;

export const PARENTS_TAB_LABEL = 'Parents';

export const SHARING_DEFAULT_OPTIONS = [
  'Only friends',
  'Coaches & team friends',
  'All members',
  'No one',
] as const;

export const FOLLOW_UP_NOTIFICATION_OPTIONS = [
  'No notifications',
  'Only friends',
  'All members',
  'Email only',
] as const;

export const ATHLETIC_LEVEL_OPTIONS = ['1', '2', '3', '4', '5'] as const;

export const KINSHIP_OPTIONS = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Uncle',
  'Tutor',
] as const;

export const THEME_OPTIONS = [
  { id: 'classic', label: 'Classic', color: '#058592' },
  { id: 'ocean', label: 'Ocean', color: '#0d9488' },
  { id: 'ember', label: 'Ember', color: '#c2410c' },
  { id: 'forest', label: 'Forest', color: '#15803d' },
  { id: 'slate', label: 'Slate', color: '#334155' },
] as const;

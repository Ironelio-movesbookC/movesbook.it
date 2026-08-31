import { DEFAULT_ENTITY_SPORT } from '@/lib/sport/entitySportOptions';
import type {
  TeamAdminSportData,
  TeamContacts,
  TeamFederalMembership,
  TeamLegalSite,
  TeamMainData,
  TeamProfileFormPayload,
  TeamProfileSections,
} from '@/lib/team/teamProfileTypes';

export function emptyTeamMainData(): TeamMainData {
  return {
    shortName: '',
    companyType: '',
    federationName: '',
    wholeFederationName: '',
    entity: '',
    registeredAt: '',
    idNumber: '',
    registrationDate: '',
    fiscalCode: '',
    foundationDate: '',
    socialColors: '',
  };
}

export function emptyTeamLegalSite(): TeamLegalSite {
  return {
    officeAddress: '',
    location: '',
    zipCode: '',
    province: '',
    country: 'Italy',
    region: '',
    mainPlayingField: '',
    fieldAddress: '',
    fieldType: '',
    approvalCheck: false,
    capacity: '',
    sportsScoreboards: '',
    basketsAndNets: '',
    geo: '',
  };
}

export function emptyTeamContacts(): TeamContacts {
  return {
    website: '',
    email: '',
    pec: '',
    phone1: '',
    phone2: '',
    facebook: '',
    instagram: '',
    whatsapp: '',
    telegram: '',
  };
}

export function emptyTeamFederal(): TeamFederalMembership {
  return {
    federation: '',
    sportsLeague: '',
    regionalCommittee: '',
    provincialDelegation: '',
    registrationNumber: '',
    affiliationDate: '',
    affiliationExpiry: '',
    promotionalBody: '',
    cioCode: '',
    mainCategory: '',
    group: '',
    sportsSeason: '',
    otherCategories: '',
    membershipNumber: '',
    expiringDate: '',
  };
}

export function emptyTeamAdminSport(): TeamAdminSportData {
  return {
    president: '',
    vicePresident: '',
    secretary: '',
    treasurer: '',
    youthSectorManager: '',
    iban: '',
    sdiInvoicingCode: '',
    headCoach: '',
    coachingLicenseNumber: '',
    assistantCoach: '',
    fitnessCoach: '',
    goalkeeperCoach: '',
    teamDoctor: '',
    mainSponsor: '',
    technicalSupplier: '',
  };
}

export function emptyTeamProfileSections(): TeamProfileSections {
  return {
    mainData: emptyTeamMainData(),
    legalSite: emptyTeamLegalSite(),
    contacts: emptyTeamContacts(),
    federal: emptyTeamFederal(),
    adminSport: emptyTeamAdminSport(),
  };
}

export function emptyTeamProfileForm(): TeamProfileFormPayload {
  return {
    sport: DEFAULT_ENTITY_SPORT,
    sports: [DEFAULT_ENTITY_SPORT],
    logoUrl: '',
    username: '',
    officialName: '',
    directAccess: '',
    directRegistrationCode: '',
    teamPassword: '',
    ...emptyTeamProfileSections(),
  };
}

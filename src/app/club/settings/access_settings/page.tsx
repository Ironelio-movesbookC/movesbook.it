'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Briefcase,
  CreditCard,
  Loader2,
  LogOut,
  QrCode,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Wifi,
  X
} from 'lucide-react';

type AccessSettings = {
  useAdvancedSettings: boolean;
  noneBlockOrFreeAccess: boolean;
  blockPermissionAll: string;
  exceptMembersAuthorized: boolean;
  exceptMembersBlocked: boolean;
  exceptMembersWithCardSuspended: boolean;
  accessDeniedToMembersAuthorized: boolean;
  accessAllowedToMembersBlocked: boolean;
  accessAllowedMembersCardSuspended: boolean;
  debtorsStatus: string;
  maxDebtValue: string;
  includeDebtsOnPurchases: boolean;
  includeDebtsOnServices: boolean;
  medCertificationExpiredStatus: string;
  medNoToleranceValue: string;
  disableMembership: boolean;
  membershipClubExpiredStatus: string;
  memNoToleranceValue: string;
  alertMember: boolean;
  accessNoSubscription: boolean;
  deemedNotBlocked: boolean;
  expSubscriptionsStatus: string;
  dayToleranceValue: string;
  noAccessesValue: string;
  dateTimeDifferent: string;
  dateToleranceNumberValue: string;
  numberWeeklyAccessesDisabled: boolean;
  numberWeeklyAccessesYes: boolean;
  numberWeeklyAccessesYesAlert: boolean;
  allowedAccessStatus: string;
  accessPermittedFrom: string;
  alertBeforeChange: boolean;
  askForConfirmation: boolean;
  reEntriesStatusYes: string;
  reEntryDays: string;
  reEntryMinMinutes: string;
  reEntryNotMorePreviousMin: string;
  incrementEachAccessNumSettingSub: string;
  askBeforeIncrement: boolean;
  alwaysAllow: string;
  dailyDetbValue: string;
  totalDetbValue: string;
  enabledReadingTypes: string;
  qrcodeGenerationType: string;
  onlyAccessControlTerminal: boolean;
  accessControlFrom: string;
  customDetailOfOutcome: boolean;
  customOutcomeMessageFleshes: boolean;
  customEnableAudioMessages: boolean;
  customEnableAudioForType: string;
  customDetailOfOutcomeCountryLanguage: boolean;
  customOutcomeMessageFleshesCountryLanguage: boolean;
  customEnableAudioMessagesCountryLanguage: boolean;
  customMainTerminalAudioSource: string;
  customEnableAudioForTypeCountryLanguage: string;
  dataDisplayName: string;
  displayDataPhoto: boolean;
  displayDataPaymentNotDone: boolean;
  setNumberBookings: boolean;
  numBookingsDayUser: string;
  authorizeBookingBeyondTimeSlot: string;
  userSelfBook: boolean;
  membersWithExpiredSubscription: boolean;
  msgMainTerminal: boolean;
  msgUsrPhone: boolean;
  detailOfOutcome: boolean;
  outcomeMessageFleshes: boolean;
  enableAudioMessages: boolean;
  enableAudioForType: string;
  detailOfOutcomeCountryLanguage: boolean;
  outcomeMessageFleshesCountryLanguage: boolean;
  enableAudioMessagesCountryLanguage: boolean;
  mainTerminalAudioSource: string;
  enableAudioForTypeCountryLanguage: string;
  warnExhaustion: boolean;
  warnExhaustionNumber: string;
  warningMemberSendMailExhaustion: boolean;
  warningMemberNotifyViaGoogleSpeechExhaustion: boolean;
  wharnExpire: boolean;
  warnExpireDays: string;
  warningMemberSendMailExpire: boolean;
  warningMemberNotifyViaGoogleSpeechExpire: boolean;
  whereSendGreetings: string;
  daysToWishes: string;
  notifyWithAudio: boolean;
  greetingsAudioSource: string;
  msgForMembers: boolean;
  whereSendMsg: string;
  msgNotifyWithAudio: boolean;
  msgAudioSource: string;
  ntfNotLeftArea: boolean;
  ntfNotLeftAreaNumber: string;
  minutesToEndSlot: string;
  possibleOvercrowdingNotifyWithAudio: boolean;
  possibleOvercrowdingTypePlay: string;
  possibleOvercrowdingAudioFile: string;
  ntfMorePeople: boolean;
  overcrowdingNotifyWithAudio: boolean;
  overcrowdingTypePlay: string;
  overcrowdingAudioFile: string;
  blockDayFixed: string;
  allowWithoutBooking: string;
  controlMaxPres: string;
  controlMaxPresPer: string;
  activateSpaceBtwAccess: string;
};

type FormErrors = Record<string, string>;
type ConfirmAction = 'reset' | 'save' | 'exit';
type AccessModal =
  | 'qrcode'
  | 'terminal'
  | 'bookings'
  | 'outcome'
  | 'warning-exhaustion'
  | 'warning-expire'
  | 'birthday'
  | 'messages'
  | 'possible-overcrowding'
  | 'overcrowding';
type AccessSettingsUpdater = <K extends keyof AccessSettings>(key: K, value: AccessSettings[K]) => void;
type StringAccessSettingKey = {
  [K in keyof AccessSettings]: AccessSettings[K] extends string ? K : never;
}[keyof AccessSettings];

const API_PATH = '/api/club/settings/access-settings';

const DEFAULT_SETTINGS: AccessSettings = {
  useAdvancedSettings: false,
  noneBlockOrFreeAccess: false,
  blockPermissionAll: 'free_access_for_all',
  exceptMembersAuthorized: true,
  exceptMembersBlocked: true,
  exceptMembersWithCardSuspended: true,
  accessDeniedToMembersAuthorized: false,
  accessAllowedToMembersBlocked: true,
  accessAllowedMembersCardSuspended: false,
  debtorsStatus: 'yes_with_alert',
  maxDebtValue: '',
  includeDebtsOnPurchases: false,
  includeDebtsOnServices: false,
  medCertificationExpiredStatus: '',
  medNoToleranceValue: '',
  disableMembership: false,
  membershipClubExpiredStatus: 'membershipe_enabled',
  memNoToleranceValue: '0',
  alertMember: false,
  accessNoSubscription: true,
  deemedNotBlocked: false,
  expSubscriptionsStatus: '',
  dayToleranceValue: '',
  noAccessesValue: '',
  dateTimeDifferent: '',
  dateToleranceNumberValue: '',
  numberWeeklyAccessesDisabled: false,
  numberWeeklyAccessesYes: false,
  numberWeeklyAccessesYesAlert: false,
  allowedAccessStatus: '',
  accessPermittedFrom: '',
  alertBeforeChange: false,
  askForConfirmation: false,
  reEntriesStatusYes: 're_entries_yes',
  reEntryDays: '',
  reEntryMinMinutes: '',
  reEntryNotMorePreviousMin: '',
  incrementEachAccessNumSettingSub: '',
  askBeforeIncrement: false,
  alwaysAllow: '',
  dailyDetbValue: '',
  totalDetbValue: '',
  enabledReadingTypes: 'qrcode',
  qrcodeGenerationType: 'fixed',
  onlyAccessControlTerminal: false,
  accessControlFrom: 'main_terminal',
  customDetailOfOutcome: false,
  customOutcomeMessageFleshes: false,
  customEnableAudioMessages: false,
  customEnableAudioForType: 'denied,allowed',
  customDetailOfOutcomeCountryLanguage: false,
  customOutcomeMessageFleshesCountryLanguage: false,
  customEnableAudioMessagesCountryLanguage: false,
  customMainTerminalAudioSource: 'google',
  customEnableAudioForTypeCountryLanguage: 'denied,allowed',
  dataDisplayName: '4',
  displayDataPhoto: false,
  displayDataPaymentNotDone: false,
  setNumberBookings: false,
  numBookingsDayUser: '1',
  authorizeBookingBeyondTimeSlot: 'no',
  userSelfBook: false,
  membersWithExpiredSubscription: false,
  msgMainTerminal: false,
  msgUsrPhone: false,
  detailOfOutcome: false,
  outcomeMessageFleshes: false,
  enableAudioMessages: false,
  enableAudioForType: 'denied,allowed',
  detailOfOutcomeCountryLanguage: false,
  outcomeMessageFleshesCountryLanguage: false,
  enableAudioMessagesCountryLanguage: false,
  mainTerminalAudioSource: 'google',
  enableAudioForTypeCountryLanguage: 'denied,allowed',
  warnExhaustion: false,
  warnExhaustionNumber: '',
  warningMemberSendMailExhaustion: false,
  warningMemberNotifyViaGoogleSpeechExhaustion: false,
  wharnExpire: false,
  warnExpireDays: '',
  warningMemberSendMailExpire: false,
  warningMemberNotifyViaGoogleSpeechExpire: false,
  whereSendGreetings: 'smartphone,terminal',
  daysToWishes: '1',
  notifyWithAudio: false,
  greetingsAudioSource: 'google',
  msgForMembers: false,
  whereSendMsg: 'smartphone,terminal',
  msgNotifyWithAudio: false,
  msgAudioSource: 'google',
  ntfNotLeftArea: false,
  ntfNotLeftAreaNumber: '',
  minutesToEndSlot: '1',
  possibleOvercrowdingNotifyWithAudio: false,
  possibleOvercrowdingTypePlay: 'google',
  possibleOvercrowdingAudioFile: 'File 1',
  ntfMorePeople: false,
  overcrowdingNotifyWithAudio: false,
  overcrowdingTypePlay: 'google',
  overcrowdingAudioFile: 'File 1',
  blockDayFixed: 'yes',
  allowWithoutBooking: 'yes',
  controlMaxPres: 'no',
  controlMaxPresPer: 'area',
  activateSpaceBtwAccess: 'no'
};

const inputClass = 'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const numericFields: Array<{
  key: keyof AccessSettings;
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  isRequired: (settings: AccessSettings) => boolean;
}> = [
  {
    key: 'maxDebtValue',
    label: 'Value',
    min: 0,
    isRequired: (settings) => settings.debtorsStatus === 'max_debt'
  },
  {
    key: 'medNoToleranceValue',
    label: 'Medical certification tolerance',
    min: 0,
    isRequired: (settings) => settings.medCertificationExpiredStatus === 'med_no_tolerance'
  },
  {
    key: 'memNoToleranceValue',
    label: 'Membership tolerance',
    min: 0,
    isRequired: (settings) => settings.membershipClubExpiredStatus === 'med_no_tolerance'
  },
  {
    key: 'dayToleranceValue',
    label: 'Day tolerance',
    min: 0,
    integer: true,
    isRequired: (settings) => settings.expSubscriptionsStatus === 'day_tolerance'
  },
  {
    key: 'noAccessesValue',
    label: 'Number of accesses',
    min: 0,
    integer: true,
    isRequired: (settings) => settings.expSubscriptionsStatus === 'day_tolerance'
  },
  {
    key: 'dateToleranceNumberValue',
    label: 'Tolerance minutes',
    min: 0,
    integer: true,
    isRequired: (settings) => settings.dateTimeDifferent === 'date_tolerance_number'
  },
  {
    key: 'accessPermittedFrom',
    label: 'Charge amount',
    min: 0,
    isRequired: (settings) => settings.allowedAccessStatus === 'change_amount'
  },
  {
    key: 'reEntryDays',
    label: 'Reentries in a day',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => settings.reEntriesStatusYes === 're_entries'
  },
  {
    key: 'reEntryMinMinutes',
    label: 'First reentry minimum minutes',
    min: 0,
    integer: true,
    isRequired: (settings) => settings.reEntriesStatusYes === 're_entries' || settings.activateSpaceBtwAccess === 'yes'
  },
  {
    key: 'reEntryNotMorePreviousMin',
    label: 'Next reentry maximum minutes',
    min: 0,
    integer: true,
    isRequired: (settings) => settings.reEntriesStatusYes === 're_entries'
  },
  {
    key: 'dailyDetbValue',
    label: 'Daily limit',
    min: 0,
    isRequired: (settings) => settings.alwaysAllow === 'only_if_total_dept'
  },
  {
    key: 'totalDetbValue',
    label: 'Total limit',
    min: 0,
    isRequired: (settings) => settings.alwaysAllow === 'only_if_daily_dept_less'
  },
  {
    key: 'numBookingsDayUser',
    label: 'Reservations per day',
    min: 1,
    max: 3,
    integer: true,
    isRequired: (settings) => settings.setNumberBookings
  },
  {
    key: 'warnExhaustionNumber',
    label: 'Access before exhaustion',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => settings.warnExhaustion
  },
  {
    key: 'warnExpireDays',
    label: 'Expiring days',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => settings.wharnExpire
  },
  {
    key: 'ntfNotLeftAreaNumber',
    label: 'Users who have not left the area',
    min: 1,
    integer: true,
    isRequired: (settings) => settings.ntfNotLeftArea
  },
  {
    key: 'daysToWishes',
    label: 'Birthday wishes days',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => Boolean(settings.whereSendGreetings.trim()) || settings.notifyWithAudio
  },
  {
    key: 'minutesToEndSlot',
    label: 'End current time slot minutes',
    min: 1,
    max: 30,
    integer: true,
    isRequired: (settings) => settings.ntfNotLeftArea
  }
];

const requiredChoiceFields: Array<{
  key: keyof AccessSettings;
  label: string;
  isRequired: (settings: AccessSettings) => boolean;
  list?: boolean;
}> = [
  {
    key: 'enabledReadingTypes',
    label: 'enabled access device',
    list: true,
    isRequired: () => true
  },
  {
    key: 'qrcodeGenerationType',
    label: 'QR code generation mode',
    isRequired: () => true
  },
  {
    key: 'accessControlFrom',
    label: 'access control form',
    isRequired: () => true
  },
  {
    key: 'authorizeBookingBeyondTimeSlot',
    label: 'booking beyond the time slot',
    isRequired: () => true
  },
  {
    key: 'customEnableAudioForType',
    label: 'audio message type',
    list: true,
    isRequired: (settings) => settings.customEnableAudioMessages
  },
  {
    key: 'customMainTerminalAudioSource',
    label: 'audio source',
    isRequired: (settings) => settings.customEnableAudioMessagesCountryLanguage
  },
  {
    key: 'customEnableAudioForTypeCountryLanguage',
    label: 'country-language audio message type',
    list: true,
    isRequired: (settings) => settings.customEnableAudioMessagesCountryLanguage
  },
  {
    key: 'enableAudioForType',
    label: 'audio message type',
    list: true,
    isRequired: (settings) => settings.enableAudioMessages
  },
  {
    key: 'mainTerminalAudioSource',
    label: 'audio source',
    isRequired: (settings) => settings.enableAudioMessagesCountryLanguage
  },
  {
    key: 'enableAudioForTypeCountryLanguage',
    label: 'country-language audio message type',
    list: true,
    isRequired: (settings) => settings.enableAudioMessagesCountryLanguage
  },
  {
    key: 'greetingsAudioSource',
    label: 'greetings audio source',
    isRequired: (settings) => settings.notifyWithAudio
  },
  {
    key: 'msgAudioSource',
    label: 'message audio source',
    isRequired: (settings) => settings.msgNotifyWithAudio
  },
  {
    key: 'possibleOvercrowdingTypePlay',
    label: 'possible overcrowding audio source',
    isRequired: (settings) => settings.possibleOvercrowdingNotifyWithAudio
  },
  {
    key: 'possibleOvercrowdingAudioFile',
    label: 'possible overcrowding audio file',
    isRequired: (settings) => settings.possibleOvercrowdingNotifyWithAudio && settings.possibleOvercrowdingTypePlay === 'audio_file'
  },
  {
    key: 'overcrowdingTypePlay',
    label: 'overcrowding audio source',
    isRequired: (settings) => settings.overcrowdingNotifyWithAudio
  },
  {
    key: 'overcrowdingAudioFile',
    label: 'overcrowding audio file',
    isRequired: (settings) => settings.overcrowdingNotifyWithAudio && settings.overcrowdingTypePlay === 'audio_file'
  }
];

const dependentErrorFields: Partial<Record<keyof AccessSettings, Array<keyof AccessSettings>>> = {
  debtorsStatus: ['maxDebtValue'],
  medCertificationExpiredStatus: ['medNoToleranceValue'],
  membershipClubExpiredStatus: ['memNoToleranceValue'],
  expSubscriptionsStatus: ['dayToleranceValue', 'noAccessesValue'],
  dateTimeDifferent: ['dateToleranceNumberValue'],
  allowedAccessStatus: ['accessPermittedFrom'],
  reEntriesStatusYes: ['reEntryDays', 'reEntryMinMinutes', 'reEntryNotMorePreviousMin'],
  alwaysAllow: ['dailyDetbValue', 'totalDetbValue'],
  setNumberBookings: ['numBookingsDayUser'],
  warnExhaustion: ['warnExhaustionNumber'],
  wharnExpire: ['warnExpireDays'],
  ntfNotLeftArea: ['ntfNotLeftAreaNumber'],
  activateSpaceBtwAccess: ['reEntryMinMinutes'],
  customEnableAudioMessages: ['customEnableAudioForType'],
  customEnableAudioMessagesCountryLanguage: ['customMainTerminalAudioSource', 'customEnableAudioForTypeCountryLanguage'],
  enableAudioMessages: ['enableAudioForType'],
  enableAudioMessagesCountryLanguage: ['mainTerminalAudioSource', 'enableAudioForTypeCountryLanguage'],
  notifyWithAudio: ['greetingsAudioSource'],
  msgNotifyWithAudio: ['msgAudioSource'],
  possibleOvercrowdingNotifyWithAudio: ['possibleOvercrowdingTypePlay', 'possibleOvercrowdingAudioFile'],
  possibleOvercrowdingTypePlay: ['possibleOvercrowdingAudioFile'],
  overcrowdingNotifyWithAudio: ['overcrowdingTypePlay', 'overcrowdingAudioFile'],
  overcrowdingTypePlay: ['overcrowdingAudioFile']
};

const fieldModalMap: Partial<Record<keyof AccessSettings, AccessModal>> = {
  daysToWishes: 'birthday',
  minutesToEndSlot: 'possible-overcrowding',
  qrcodeGenerationType: 'qrcode',
  accessControlFrom: 'terminal',
  customEnableAudioForType: 'terminal',
  customMainTerminalAudioSource: 'terminal',
  customEnableAudioForTypeCountryLanguage: 'terminal',
  authorizeBookingBeyondTimeSlot: 'bookings',
  enableAudioForType: 'outcome',
  mainTerminalAudioSource: 'outcome',
  enableAudioForTypeCountryLanguage: 'outcome',
  greetingsAudioSource: 'birthday',
  msgAudioSource: 'messages',
  possibleOvercrowdingTypePlay: 'possible-overcrowding',
  possibleOvercrowdingAudioFile: 'possible-overcrowding',
  overcrowdingTypePlay: 'overcrowding',
  overcrowdingAudioFile: 'overcrowding'
};

const accessTabErrorFields = new Set<string>([
  'enabledReadingTypes',
  'numBookingsDayUser',
  'warnExhaustionNumber',
  'warnExpireDays',
  'ntfNotLeftAreaNumber'
]);

function toBooleanSetting(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'T'
    || value === 't'
    || value === 'true';
}

function normalizeSettings(value: unknown): AccessSettings {
  const source = value && typeof value === 'object' ? value as Partial<AccessSettings> : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    useAdvancedSettings: toBooleanSetting(source.useAdvancedSettings, DEFAULT_SETTINGS.useAdvancedSettings),
    noneBlockOrFreeAccess: toBooleanSetting(source.noneBlockOrFreeAccess, DEFAULT_SETTINGS.noneBlockOrFreeAccess),
    exceptMembersAuthorized: toBooleanSetting(source.exceptMembersAuthorized, DEFAULT_SETTINGS.exceptMembersAuthorized),
    exceptMembersBlocked: toBooleanSetting(source.exceptMembersBlocked, DEFAULT_SETTINGS.exceptMembersBlocked),
    exceptMembersWithCardSuspended: toBooleanSetting(source.exceptMembersWithCardSuspended, DEFAULT_SETTINGS.exceptMembersWithCardSuspended),
    accessDeniedToMembersAuthorized: toBooleanSetting(source.accessDeniedToMembersAuthorized, DEFAULT_SETTINGS.accessDeniedToMembersAuthorized),
    accessAllowedToMembersBlocked: toBooleanSetting(source.accessAllowedToMembersBlocked, DEFAULT_SETTINGS.accessAllowedToMembersBlocked),
    accessAllowedMembersCardSuspended: toBooleanSetting(source.accessAllowedMembersCardSuspended, DEFAULT_SETTINGS.accessAllowedMembersCardSuspended),
    includeDebtsOnPurchases: toBooleanSetting(source.includeDebtsOnPurchases, DEFAULT_SETTINGS.includeDebtsOnPurchases),
    includeDebtsOnServices: toBooleanSetting(source.includeDebtsOnServices, DEFAULT_SETTINGS.includeDebtsOnServices),
    disableMembership: toBooleanSetting(source.disableMembership, DEFAULT_SETTINGS.disableMembership),
    alertMember: toBooleanSetting(source.alertMember, DEFAULT_SETTINGS.alertMember),
    accessNoSubscription: toBooleanSetting(source.accessNoSubscription, DEFAULT_SETTINGS.accessNoSubscription),
    deemedNotBlocked: toBooleanSetting(source.deemedNotBlocked, DEFAULT_SETTINGS.deemedNotBlocked),
    numberWeeklyAccessesDisabled: toBooleanSetting(source.numberWeeklyAccessesDisabled, DEFAULT_SETTINGS.numberWeeklyAccessesDisabled),
    numberWeeklyAccessesYes: toBooleanSetting(source.numberWeeklyAccessesYes, DEFAULT_SETTINGS.numberWeeklyAccessesYes),
    numberWeeklyAccessesYesAlert: toBooleanSetting(source.numberWeeklyAccessesYesAlert, DEFAULT_SETTINGS.numberWeeklyAccessesYesAlert),
    alertBeforeChange: toBooleanSetting(source.alertBeforeChange, DEFAULT_SETTINGS.alertBeforeChange),
    askForConfirmation: toBooleanSetting(source.askForConfirmation, DEFAULT_SETTINGS.askForConfirmation),
    askBeforeIncrement: toBooleanSetting(source.askBeforeIncrement, DEFAULT_SETTINGS.askBeforeIncrement),
    onlyAccessControlTerminal: toBooleanSetting(source.onlyAccessControlTerminal, DEFAULT_SETTINGS.onlyAccessControlTerminal),
    customDetailOfOutcome: toBooleanSetting(source.customDetailOfOutcome, DEFAULT_SETTINGS.customDetailOfOutcome),
    customOutcomeMessageFleshes: toBooleanSetting(source.customOutcomeMessageFleshes, DEFAULT_SETTINGS.customOutcomeMessageFleshes),
    customEnableAudioMessages: toBooleanSetting(source.customEnableAudioMessages, DEFAULT_SETTINGS.customEnableAudioMessages),
    customDetailOfOutcomeCountryLanguage: toBooleanSetting(source.customDetailOfOutcomeCountryLanguage, DEFAULT_SETTINGS.customDetailOfOutcomeCountryLanguage),
    customOutcomeMessageFleshesCountryLanguage: toBooleanSetting(source.customOutcomeMessageFleshesCountryLanguage, DEFAULT_SETTINGS.customOutcomeMessageFleshesCountryLanguage),
    customEnableAudioMessagesCountryLanguage: toBooleanSetting(source.customEnableAudioMessagesCountryLanguage, DEFAULT_SETTINGS.customEnableAudioMessagesCountryLanguage),
    displayDataPhoto: toBooleanSetting(source.displayDataPhoto, DEFAULT_SETTINGS.displayDataPhoto),
    displayDataPaymentNotDone: toBooleanSetting(source.displayDataPaymentNotDone, DEFAULT_SETTINGS.displayDataPaymentNotDone),
    setNumberBookings: toBooleanSetting(source.setNumberBookings, DEFAULT_SETTINGS.setNumberBookings),
    userSelfBook: toBooleanSetting(source.userSelfBook, DEFAULT_SETTINGS.userSelfBook),
    membersWithExpiredSubscription: toBooleanSetting(source.membersWithExpiredSubscription, DEFAULT_SETTINGS.membersWithExpiredSubscription),
    msgMainTerminal: toBooleanSetting(source.msgMainTerminal, DEFAULT_SETTINGS.msgMainTerminal),
    msgUsrPhone: toBooleanSetting(source.msgUsrPhone, DEFAULT_SETTINGS.msgUsrPhone),
    detailOfOutcome: toBooleanSetting(source.detailOfOutcome, DEFAULT_SETTINGS.detailOfOutcome),
    outcomeMessageFleshes: toBooleanSetting(source.outcomeMessageFleshes, DEFAULT_SETTINGS.outcomeMessageFleshes),
    enableAudioMessages: toBooleanSetting(source.enableAudioMessages, DEFAULT_SETTINGS.enableAudioMessages),
    detailOfOutcomeCountryLanguage: toBooleanSetting(source.detailOfOutcomeCountryLanguage, DEFAULT_SETTINGS.detailOfOutcomeCountryLanguage),
    outcomeMessageFleshesCountryLanguage: toBooleanSetting(source.outcomeMessageFleshesCountryLanguage, DEFAULT_SETTINGS.outcomeMessageFleshesCountryLanguage),
    enableAudioMessagesCountryLanguage: toBooleanSetting(source.enableAudioMessagesCountryLanguage, DEFAULT_SETTINGS.enableAudioMessagesCountryLanguage),
    warnExhaustion: toBooleanSetting(source.warnExhaustion, DEFAULT_SETTINGS.warnExhaustion),
    warningMemberSendMailExhaustion: toBooleanSetting(source.warningMemberSendMailExhaustion, DEFAULT_SETTINGS.warningMemberSendMailExhaustion),
    warningMemberNotifyViaGoogleSpeechExhaustion: toBooleanSetting(source.warningMemberNotifyViaGoogleSpeechExhaustion, DEFAULT_SETTINGS.warningMemberNotifyViaGoogleSpeechExhaustion),
    wharnExpire: toBooleanSetting(source.wharnExpire, DEFAULT_SETTINGS.wharnExpire),
    warningMemberSendMailExpire: toBooleanSetting(source.warningMemberSendMailExpire, DEFAULT_SETTINGS.warningMemberSendMailExpire),
    warningMemberNotifyViaGoogleSpeechExpire: toBooleanSetting(source.warningMemberNotifyViaGoogleSpeechExpire, DEFAULT_SETTINGS.warningMemberNotifyViaGoogleSpeechExpire),
    notifyWithAudio: toBooleanSetting(source.notifyWithAudio, DEFAULT_SETTINGS.notifyWithAudio),
    msgForMembers: toBooleanSetting(source.msgForMembers, DEFAULT_SETTINGS.msgForMembers),
    msgNotifyWithAudio: toBooleanSetting(source.msgNotifyWithAudio, DEFAULT_SETTINGS.msgNotifyWithAudio),
    ntfNotLeftArea: toBooleanSetting(source.ntfNotLeftArea, DEFAULT_SETTINGS.ntfNotLeftArea),
    possibleOvercrowdingNotifyWithAudio: toBooleanSetting(source.possibleOvercrowdingNotifyWithAudio, DEFAULT_SETTINGS.possibleOvercrowdingNotifyWithAudio),
    ntfMorePeople: toBooleanSetting(source.ntfMorePeople, DEFAULT_SETTINGS.ntfMorePeople),
    overcrowdingNotifyWithAudio: toBooleanSetting(source.overcrowdingNotifyWithAudio, DEFAULT_SETTINGS.overcrowdingNotifyWithAudio)
  };
}

function sameSettings(a: AccessSettings, b: AccessSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateSettingsForSave(settings: AccessSettings): FormErrors {
  const nextErrors: FormErrors = {};

  for (const field of numericFields) {
    const raw = String(settings[field.key] ?? '').trim();
    const required = field.isRequired(settings);
    if (!raw) {
      if (required) {
        nextErrors[field.key] = `Please enter ${field.label}.`;
      }
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      nextErrors[field.key] = `Please enter a valid number for ${field.label}.`;
      continue;
    }

    if (field.integer && !Number.isInteger(value)) {
      nextErrors[field.key] = `Please enter a whole number for ${field.label}.`;
      continue;
    }

    if (field.min != null && value < field.min) {
      nextErrors[field.key] = `${field.label} must be at least ${field.min}.`;
      continue;
    }

    if (field.max != null && value > field.max) {
      nextErrors[field.key] = `${field.label} must be ${field.max} or less.`;
    }
  }

  for (const field of requiredChoiceFields) {
    if (!field.isRequired(settings)) continue;
    const raw = String(settings[field.key] ?? '').trim();
    const hasValue = field.list ? listValues(raw).length > 0 : Boolean(raw);
    if (!hasValue) {
      nextErrors[field.key] = field.list
        ? `Please select at least one ${field.label}.`
        : `Please select ${field.label}.`;
    }
  }

  return nextErrors;
}

export default function AccessSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AccessSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AccessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [activeTab, setActiveTab] = useState<'access' | 'advanced'>('advanced');
  const [activeModal, setActiveModal] = useState<AccessModal | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const isDirty = useMemo(() => !sameSettings(settings, savedSettings), [settings, savedSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch(API_PATH, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error('Unable to load access settings.');
        }

        const data = await response.json();
        const next = normalizeSettings(data.settings);
        if (!cancelled) {
          setSettings(next);
          setSavedSettings(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load access settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const registerField = (field: string) => (node: HTMLElement | null) => {
    fieldRefs.current[field] = node;
  };

  const scrollToField = (field: string) => {
    window.setTimeout(() => {
      const target = fieldRefs.current[field];
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus({
        preventScroll: true
      });
    }, 80);
  };

  const applyErrors = (nextErrors: FormErrors) => {
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (firstField) {
      const modal = fieldModalMap[firstField as keyof AccessSettings];
      if (modal) setActiveModal(modal);
      if (accessTabErrorFields.has(firstField)) setActiveTab('access');
      scrollToField(firstField);
    }
    return Boolean(firstField);
  };

  const updateField = <K extends keyof AccessSettings>(key: K, value: AccessSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const fields = [key, ...(dependentErrorFields[key] ?? [])].map(String);
      if (!fields.some((field) => current[field])) return current;
      const next = { ...current };
      for (const field of fields) {
        delete next[field];
      }
      return next;
    });
    setSuccess(null);
  };

  const updateFields = (patch: Partial<AccessSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch) as Array<keyof AccessSettings>) {
        delete next[String(field)];
        for (const dependentField of dependentErrorFields[field] ?? []) {
          delete next[String(dependentField)];
        }
      }
      return next;
    });
    setSuccess(null);
  };

  const requestSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || loading || saving) {
      return;
    }
    setConfirmAction('save');
  };

  const resetSettings = () => {
    setSettings(savedSettings);
    setErrors({});
    setError(null);
    setSuccess(null);
  };

  const saveSettings = async () => {
    const nextErrors = validateSettingsForSave(settings);
    if (applyErrors(nextErrors)) {
      setSuccess(null);
      setError(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(API_PATH, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          applyErrors(data.fieldErrors);
          return;
        }
        throw new Error(data?.error || 'Unable to save access settings.');
      }

      const next = normalizeSettings(data.settings);
      setErrors({});
      setSettings(next);
      setSavedSettings(next);
      setSuccess('Access settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save access settings.');
    } finally {
      setSaving(false);
    }
  };

  const confirmSelectedAction = async () => {
    const action = confirmAction;
    if (!action) return;

    setConfirmAction(null);

    if (action === 'reset') {
      resetSettings();
      return;
    }

    if (action === 'exit') {
      router.push('/club/dashboard');
      return;
    }

    await saveSettings();
  };

  return (
    <form onSubmit={requestSave} className="min-h-full bg-gray-50 p-4 lg:p-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:-mt-6 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Club&apos;s management / General settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950">Access settings</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              disabled={!isDirty || loading || saving}
              onClick={() => setConfirmAction('reset')}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || loading || saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmAction('exit')}
              className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading access settings
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('access')}
              className={`inline-flex h-9 items-center rounded-t-md border px-4 text-sm font-semibold transition ${
                activeTab === 'access'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-b-0 border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Access Control Setting
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`inline-flex h-9 items-center rounded-t-md border px-4 text-sm font-semibold transition ${
                activeTab === 'advanced'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-b-0 border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Advanced settings
            </button>
            <CheckboxField
              label="Use advanced settings"
              checked={settings.useAdvancedSettings}
              onChange={(value) => updateField('useAdvancedSettings', value)}
              tone="danger"
            />
          </div>

          {activeTab === 'access' ? (
            <AccessControlSettingsTab
              settings={settings}
              errors={errors}
              registerField={registerField}
              updateField={updateField}
              updateFields={updateFields}
              openModal={setActiveModal}
            />
          ) : (
            <>
          <Section title="Access control mode" accent="bg-sky-700" icon={<ShieldCheck className="h-4 w-4" />}>
            <Panel
              title="Block or permission for all"
              headerExtra={(
                <RadioField
                  label="None block or free access"
                  name="noneBlockOrFreeAccess"
                  checked={settings.noneBlockOrFreeAccess}
                  onChange={() => updateFields({ noneBlockOrFreeAccess: true, blockPermissionAll: '' })}
                />
              )}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <RadioField
                  label="Block the access for all"
                  name="blockPermissionAll"
                  checked={!settings.noneBlockOrFreeAccess && settings.blockPermissionAll === 'bock_access_all'}
                  onChange={() => updateFields({ noneBlockOrFreeAccess: false, blockPermissionAll: 'bock_access_all' })}
                />
                <CheckboxField label="Except members authorized" checked={settings.exceptMembersAuthorized} onChange={(value) => updateField('exceptMembersAuthorized', value)} />
                <span />
                <RadioField
                  label="Free access for all"
                  name="blockPermissionAll"
                  checked={!settings.noneBlockOrFreeAccess && settings.blockPermissionAll === 'free_access_for_all'}
                  onChange={() => updateFields({ noneBlockOrFreeAccess: false, blockPermissionAll: 'free_access_for_all' })}
                />
                <CheckboxField label="Except members blocked" checked={settings.exceptMembersBlocked} onChange={(value) => updateField('exceptMembersBlocked', value)} />
                <CheckboxField label="Except members with card suspended" checked={settings.exceptMembersWithCardSuspended} onChange={(value) => updateField('exceptMembersWithCardSuspended', value)} />
              </div>
            </Panel>

            <Panel title="Blocks and permissions for the members">
              <div className="grid gap-3 lg:grid-cols-3">
                <CheckboxField label="Access denied to members authorized" checked={settings.accessDeniedToMembersAuthorized} onChange={(value) => updateField('accessDeniedToMembersAuthorized', value)} />
                <CheckboxField label="Access allowed to members blocked" checked={settings.accessAllowedToMembersBlocked} onChange={(value) => updateField('accessAllowedToMembersBlocked', value)} />
                <CheckboxField label="Access allowed to members with card suspended" checked={settings.accessAllowedMembersCardSuspended} onChange={(value) => updateField('accessAllowedMembersCardSuspended', value)} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Debtors">
                <RadioField label="No" name="debtorsStatus" checked={settings.debtorsStatus === 'access_members_authorized'} onChange={() => updateField('debtorsStatus', 'access_members_authorized')} />
                <RadioField label="Yes but with alert" name="debtorsStatus" checked={settings.debtorsStatus === 'yes_with_alert'} onChange={() => updateField('debtorsStatus', 'yes_with_alert')} />
                <RadioField label="Yes" name="debtorsStatus" checked={settings.debtorsStatus === 'yes'} onChange={() => updateField('debtorsStatus', 'yes')} />
                <div className="rounded-none border border-gray-300 bg-gray-50 p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_96px] md:items-center">
                    <RadioField label="Max debt expired of subscriptions" name="debtorsStatus" checked={settings.debtorsStatus === 'max_debt'} onChange={() => updateField('debtorsStatus', 'max_debt')} />
                    <TextField
                      label=""
                      type="number"
                      min={0}
                      step="any"
                      value={settings.maxDebtValue}
                      error={errors.maxDebtValue}
                      fieldRef={registerField('maxDebtValue')}
                      onChange={(value) => updateField('maxDebtValue', value)}
                    />
                  </div>
                  <div className="mt-4 space-y-4 border border-gray-300 bg-white px-4 py-3">
                    <IconCheckboxField
                      icon={<ShoppingCart className="h-7 w-7" strokeWidth={1.8} />}
                      label="Also include debts on purchases"
                      checked={settings.includeDebtsOnPurchases}
                      onChange={(value) => updateField('includeDebtsOnPurchases', value)}
                    />
                    <IconCheckboxField
                      icon={<Briefcase className="h-7 w-7" strokeWidth={1.8} />}
                      label="Also include debts on services"
                      checked={settings.includeDebtsOnServices}
                      onChange={(value) => updateField('includeDebtsOnServices', value)}
                    />
                  </div>
                </div>
              </Panel>

              <div className="space-y-4">
                <Panel title="Medical certification expired">
                  <div className="grid gap-3 md:grid-cols-[1fr_160px] md:items-center">
                    <RadioField label="No tolerance" name="medCertificationExpiredStatus" checked={settings.medCertificationExpiredStatus === 'med_no_tolerance'} onChange={() => updateField('medCertificationExpiredStatus', 'med_no_tolerance')} />
                    <TextField
                      label="Tolerance"
                      type="number"
                      min={0}
                      step="any"
                      value={settings.medNoToleranceValue}
                      error={errors.medNoToleranceValue}
                      fieldRef={registerField('medNoToleranceValue')}
                      onChange={(value) => updateField('medNoToleranceValue', value)}
                    />
                  </div>
                  <RadioField label="Yes with alert" name="medCertificationExpiredStatus" checked={settings.medCertificationExpiredStatus === 'yes_with_alert'} onChange={() => updateField('medCertificationExpiredStatus', 'yes_with_alert')} />
                  <RadioField label="Yes" name="medCertificationExpiredStatus" checked={settings.medCertificationExpiredStatus === 'yes'} onChange={() => updateField('medCertificationExpiredStatus', 'yes')} />
                  <RadioField label="Don't consider if a date doesn't exists" name="medCertificationExpiredStatus" checked={settings.medCertificationExpiredStatus === 'date_non_existent'} onChange={() => updateField('medCertificationExpiredStatus', 'date_non_existent')} />
                </Panel>

                <Panel title="Disable Membership">
                  <CheckboxField label="With disable it will not be request anymore to subscribe or renew the membership" checked={settings.disableMembership} onChange={(value) => updateField('disableMembership', value)} />
                </Panel>

                <Panel title="Membership to club expired">
                  <RadioField label="Membership Disabled" name="membershipClubExpiredStatus" checked={settings.membershipClubExpiredStatus === 'membershipe_disabled'} onChange={() => updateField('membershipClubExpiredStatus', 'membershipe_disabled')} />
                  <RadioField label="Membership Enabled" name="membershipClubExpiredStatus" checked={settings.membershipClubExpiredStatus === 'membershipe_enabled'} onChange={() => updateField('membershipClubExpiredStatus', 'membershipe_enabled')} />
                  <div className="grid gap-3 md:grid-cols-[1fr_160px] md:items-center">
                    <RadioField label="No tolerance" name="membershipClubExpiredStatus" checked={settings.membershipClubExpiredStatus === 'med_no_tolerance'} onChange={() => updateField('membershipClubExpiredStatus', 'med_no_tolerance')} />
                    <TextField
                      label="Tolerance"
                      type="number"
                      min={0}
                      step="any"
                      value={settings.memNoToleranceValue}
                      error={errors.memNoToleranceValue}
                      fieldRef={registerField('memNoToleranceValue')}
                      onChange={(value) => updateField('memNoToleranceValue', value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RadioField label="Yes with alert" name="membershipClubExpiredStatus" checked={settings.membershipClubExpiredStatus === 'yes_with_alert'} onChange={() => updateField('membershipClubExpiredStatus', 'yes_with_alert')} />
                    <RadioField label="Yes" name="membershipClubExpiredStatus" checked={settings.membershipClubExpiredStatus === 'yes'} onChange={() => updateField('membershipClubExpiredStatus', 'yes')} />
                  </div>
                </Panel>
              </div>
            </div>

            <Panel title="Assurance expired">
              <CheckboxField label="Alert the member" checked={settings.alertMember} onChange={(value) => updateField('alertMember', value)} />
            </Panel>

            <Panel title="Check on subscription">
              <div className="grid gap-3 lg:grid-cols-2">
                <CheckboxField label="Access allowed with no subscription" checked={settings.accessNoSubscription} onChange={(value) => updateField('accessNoSubscription', value)} />
                <CheckboxField label="Deemed not blocked the courses blocked" checked={settings.deemedNotBlocked} onChange={(value) => updateField('deemedNotBlocked', value)} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Expired subscriptions">
                <RadioField label="No" name="expSubscriptionsStatus" checked={settings.expSubscriptionsStatus === 'no'} onChange={() => updateField('expSubscriptionsStatus', 'no')} />
                <div className="grid gap-3 md:grid-cols-[1fr_100px_1fr_100px] md:items-center">
                  <RadioField label="Day tolerance" name="expSubscriptionsStatus" checked={settings.expSubscriptionsStatus === 'day_tolerance'} onChange={() => updateField('expSubscriptionsStatus', 'day_tolerance')} />
                  <TextField
                    label="Days"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.dayToleranceValue}
                    error={errors.dayToleranceValue}
                    fieldRef={registerField('dayToleranceValue')}
                    onChange={(value) => updateField('dayToleranceValue', value)}
                  />
                  <span className="text-sm font-semibold text-gray-700">No of accesses</span>
                  <TextField
                    label="Accesses"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.noAccessesValue}
                    error={errors.noAccessesValue}
                    fieldRef={registerField('noAccessesValue')}
                    onChange={(value) => updateField('noAccessesValue', value)}
                  />
                </div>
                <RadioField label="Yes + alert" name="expSubscriptionsStatus" checked={settings.expSubscriptionsStatus === 'yes_plus_alert'} onChange={() => updateField('expSubscriptionsStatus', 'yes_plus_alert')} />
              </Panel>

              <Panel title="Date & time different from time set">
                <RadioField label="No" name="dateTimeDifferent" checked={settings.dateTimeDifferent === 'date_no'} onChange={() => updateField('dateTimeDifferent', 'date_no')} />
                <div className="grid gap-3 md:grid-cols-[1fr_160px] md:items-center">
                  <RadioField label="Tolerance minutes" name="dateTimeDifferent" checked={settings.dateTimeDifferent === 'date_tolerance_number'} onChange={() => updateField('dateTimeDifferent', 'date_tolerance_number')} />
                  <TextField
                    label="Minutes"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.dateToleranceNumberValue}
                    error={errors.dateToleranceNumberValue}
                    fieldRef={registerField('dateToleranceNumberValue')}
                    onChange={(value) => updateField('dateToleranceNumberValue', value)}
                  />
                </div>
                <RadioField label="Yes" name="dateTimeDifferent" checked={settings.dateTimeDifferent === 'date_yes'} onChange={() => updateField('dateTimeDifferent', 'date_yes')} />
              </Panel>
            </div>

            <Panel title="Control the number of weekly accesses">
              <div className="grid gap-3 md:grid-cols-3">
                <CheckboxField label="Disabled" checked={settings.numberWeeklyAccessesDisabled} onChange={(value) => updateField('numberWeeklyAccessesDisabled', value)} />
                <CheckboxField label="Yes" checked={settings.numberWeeklyAccessesYes} onChange={(value) => updateField('numberWeeklyAccessesYes', value)} />
                <CheckboxField label="Yes + alert" checked={settings.numberWeeklyAccessesYesAlert} onChange={(value) => updateField('numberWeeklyAccessesYesAlert', value)} />
              </div>
            </Panel>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Allowed access exhausted">
                <RadioField label="Yes" name="allowedAccessStatus" checked={settings.allowedAccessStatus === 'yes'} onChange={() => updateField('allowedAccessStatus', 'yes')} />
                <RadioField label="No" name="allowedAccessStatus" checked={settings.allowedAccessStatus === 'no'} onChange={() => updateField('allowedAccessStatus', 'no')} />
                <RadioField label="Yes, charge after permitted access" name="allowedAccessStatus" checked={settings.allowedAccessStatus === 'change_amount'} onChange={() => updateField('allowedAccessStatus', 'change_amount')} />
                <TextField
                  label="Charges this amount after the access permitted"
                  type="number"
                  min={0}
                  step="any"
                  value={settings.accessPermittedFrom}
                  error={errors.accessPermittedFrom}
                  fieldRef={registerField('accessPermittedFrom')}
                  onChange={(value) => updateField('accessPermittedFrom', value)}
                />
                <CheckboxField label="Alert before to charge" checked={settings.alertBeforeChange} onChange={(value) => updateField('alertBeforeChange', value)} />
                <CheckboxField label="Ask for confirmation" checked={settings.askForConfirmation} onChange={(value) => updateField('askForConfirmation', value)} />
              </Panel>

              <Panel title="Reentries">
                <RadioField label="Yes" name="reEntriesStatusYes" checked={settings.reEntriesStatusYes === 're_entries_yes'} onChange={() => updateField('reEntriesStatusYes', 're_entries_yes')} />
                <RadioField label="No" name="reEntriesStatusYes" checked={settings.reEntriesStatusYes === 're_entries_no'} onChange={() => updateField('reEntriesStatusYes', 're_entries_no')} />
                <RadioField label="Re-entries" name="reEntriesStatusYes" checked={settings.reEntriesStatusYes === 're_entries'} onChange={() => updateField('reEntriesStatusYes', 're_entries')} />
                <TextField
                  label="How many reentries in a day"
                  type="number"
                  min={1}
                  max={9}
                  step={1}
                  value={settings.reEntryDays}
                  error={errors.reEntryDays}
                  fieldRef={registerField('reEntryDays')}
                  onChange={(value) => updateField('reEntryDays', value)}
                />
                <TextField
                  label="The first reentry after how many minutes minimum"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.reEntryMinMinutes}
                  error={errors.reEntryMinMinutes}
                  fieldRef={registerField('reEntryMinMinutes')}
                  onChange={(value) => updateField('reEntryMinMinutes', value)}
                />
                <TextField
                  label="The next ones no more than min. from the previous one"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.reEntryNotMorePreviousMin}
                  error={errors.reEntryNotMorePreviousMin}
                  fieldRef={registerField('reEntryNotMorePreviousMin')}
                  onChange={(value) => updateField('reEntryNotMorePreviousMin', value)}
                />
              </Panel>
            </div>

            <Panel title="Points to increment at member's access">
              <RadioField
                label="Always increment at each access the number of points set in setting subscription"
                name="incrementEachAccessNumSettingSub"
                checked={settings.incrementEachAccessNumSettingSub === 'increment_each_access'}
                onChange={() => updateField('incrementEachAccessNumSettingSub', 'increment_each_access')}
              />
              <RadioField
                label="Increment only once a day the number of points set in setting subscription"
                name="incrementEachAccessNumSettingSub"
                checked={settings.incrementEachAccessNumSettingSub === 'increment_ones_access'}
                onChange={() => updateField('incrementEachAccessNumSettingSub', 'increment_ones_access')}
              />
              <CheckboxField label="Always ask for confirmation before increment" checked={settings.askBeforeIncrement} onChange={(value) => updateField('askBeforeIncrement', value)} />
            </Panel>
          </Section>

          <Section title="Exit" accent="bg-emerald-600" icon={<LogOut className="h-4 w-4" />}>
            <Panel title="Condition that allow the exit">
              <RadioField label="Always allow" name="alwaysAllow" checked={settings.alwaysAllow === 'always_allow'} onChange={() => updateField('alwaysAllow', 'always_allow')} />
              <RadioField label="Only if daily debt is 0" name="alwaysAllow" checked={settings.alwaysAllow === 'only_if_daily_debt_zero'} onChange={() => updateField('alwaysAllow', 'only_if_daily_debt_zero')} />
              <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
                <RadioField label="Only if daily debt is less than max daily debt allowed for purchase product" name="alwaysAllow" checked={settings.alwaysAllow === 'only_if_total_dept'} onChange={() => updateField('alwaysAllow', 'only_if_total_dept')} />
                <TextField
                  label="Daily limit"
                  type="number"
                  min={0}
                  step="any"
                  value={settings.dailyDetbValue}
                  error={errors.dailyDetbValue}
                  fieldRef={registerField('dailyDetbValue')}
                  onChange={(value) => updateField('dailyDetbValue', value)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
                <RadioField label="Only if total debt is less than total debt allowed for purchase products" name="alwaysAllow" checked={settings.alwaysAllow === 'only_if_daily_dept_less'} onChange={() => updateField('alwaysAllow', 'only_if_daily_dept_less')} />
                <TextField
                  label="Total limit"
                  type="number"
                  min={0}
                  step="any"
                  value={settings.totalDetbValue}
                  error={errors.totalDetbValue}
                  fieldRef={registerField('totalDetbValue')}
                  onChange={(value) => updateField('totalDetbValue', value)}
                />
              </div>
              <RadioField label="Only if total debt is less than max total debt allowed for that member" name="alwaysAllow" checked={settings.alwaysAllow === 'only_if_daily_dept_less_than_max'} onChange={() => updateField('alwaysAllow', 'only_if_daily_dept_less_than_max')} />
            </Panel>
          </Section>
            </>
          )}
        </div>
      )}

      <AccessSettingsModal
        modal={activeModal}
        settings={settings}
        errors={errors}
        registerField={registerField}
        updateField={updateField}
        onClose={() => setActiveModal(null)}
      />

      <ConfirmModal
        action={confirmAction}
        isDirty={isDirty}
        saving={saving}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmSelectedAction}
      />
    </form>
  );
}

function AccessControlSettingsTab({
  settings,
  errors,
  registerField,
  updateField,
  updateFields,
  openModal
}: {
  settings: AccessSettings;
  errors: FormErrors;
  registerField: (field: string) => (node: HTMLElement | null) => void;
  updateField: AccessSettingsUpdater;
  updateFields: (patch: Partial<AccessSettings>) => void;
  openModal: (modal: AccessModal) => void;
}) {
  return (
    <div className="space-y-4">
      <Section title="General" accent="bg-sky-700" icon={<Settings className="h-4 w-4" />}>
        <Panel title="Enabled access devices" headerExtra={<GearButton label="QR code generation mode" onClick={() => openModal('qrcode')} />}>
          <div ref={registerField('enabledReadingTypes')} className="grid flex-1 gap-3 md:grid-cols-3">
            <ReaderOption
              label="QRcode"
              value="qrcode"
              selected={hasListValue(settings.enabledReadingTypes, 'qrcode')}
              icon={<QrCode className="h-9 w-9" />}
              onChange={(checked) => updateField('enabledReadingTypes', toggleListValue(settings.enabledReadingTypes, 'qrcode', checked))}
            />
            <ReaderOption
              label="NFC"
              value="nfc"
              selected={hasListValue(settings.enabledReadingTypes, 'nfc')}
              icon={<Wifi className="h-9 w-9" />}
              onChange={(checked) => updateField('enabledReadingTypes', toggleListValue(settings.enabledReadingTypes, 'nfc', checked))}
            />
            <ReaderOption
              label="ID CARDS"
              value="idcards"
              selected={hasListValue(settings.enabledReadingTypes, 'idcards')}
              icon={<CreditCard className="h-9 w-9" />}
              onChange={(checked) => updateField('enabledReadingTypes', toggleListValue(settings.enabledReadingTypes, 'idcards', checked))}
            />
          </div>
          <FieldError message={errors.enabledReadingTypes} />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Terminal mode" headerExtra={<GearButton label="Terminal access-control settings" onClick={() => openModal('terminal')} />}>
            <CheckboxField
              label={<>Settings when the terminal is used only as an <strong>Access Control terminal</strong></>}
              checked={settings.onlyAccessControlTerminal}
              onChange={(value) => updateField('onlyAccessControlTerminal', value)}
            />
          </Panel>

          <Panel title="Reservations" headerExtra={<GearButton label="Booking settings" onClick={() => openModal('bookings')} />}>
            <div className="grid gap-3 md:grid-cols-[1fr_100px] md:items-start">
            <CheckboxField
              label="Set the number of reservations possible per day for a user"
              checked={settings.setNumberBookings}
              onChange={(value) => updateField('setNumberBookings', value)}
            />
            <MiniSelect
              field="numBookingsDayUser"
              value={settings.numBookingsDayUser}
              error={errors.numBookingsDayUser}
              fieldRef={registerField('numBookingsDayUser')}
              onChange={(value) => updateField('numBookingsDayUser', value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </MiniSelect>
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Outcomes of the access control" accent="bg-sky-700" icon={<ShieldCheck className="h-4 w-4" />}>
        <Panel title="Access outcome messages" headerExtra={<GearButton label="Outcome messages on the main terminal" onClick={() => openModal('outcome')} />}>
          <div className="grid gap-3 lg:grid-cols-2">
          <CheckboxField label="Outcome messages on the main terminal" checked={settings.msgMainTerminal} onChange={(value) => updateField('msgMainTerminal', value)} />
          <CheckboxField label="Displays also the outcome of the access control on the user's smartphone" checked={settings.msgUsrPhone} onChange={(value) => updateField('msgUsrPhone', value)} />
          </div>
        </Panel>
      </Section>

      <Section title="Notifications about members" accent="bg-sky-700" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Allowed-access exhaustion" headerExtra={<GearButton label="Warning for access exhaustion" onClick={() => openModal('warning-exhaustion')} />}>
            <div className="grid gap-3 md:grid-cols-[1fr_110px] md:items-start">
            <CheckboxField label="Warn when there are" checked={settings.warnExhaustion} onChange={(value) => updateField('warnExhaustion', value)} />
            <MiniInput
              field="warnExhaustionNumber"
              value={settings.warnExhaustionNumber}
              min={1}
              max={9}
              error={errors.warnExhaustionNumber}
              fieldRef={registerField('warnExhaustionNumber')}
              onChange={(value) => updateField('warnExhaustionNumber', value)}
            />
            </div>
            <p className="text-xs font-medium text-gray-500">Access before exhaustion of allowed accesses</p>
          </Panel>

          <Panel title="Expiring users" headerExtra={<GearButton label="Warning for expiring users" onClick={() => openModal('warning-expire')} />}>
            <div className="grid gap-3 md:grid-cols-[1fr_110px] md:items-start">
            <CheckboxField label="Warn users expiring in advance of" checked={settings.wharnExpire} onChange={(value) => updateField('wharnExpire', value)} />
            <MiniInput
              field="warnExpireDays"
              value={settings.warnExpireDays}
              min={1}
              max={9}
              error={errors.warnExpireDays}
              fieldRef={registerField('warnExpireDays')}
              onChange={(value) => updateField('warnExpireDays', value)}
            />
            </div>
            <p className="text-xs font-medium text-gray-500">Days before expiration</p>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Birthday greetings" headerExtra={<GearButton label="Birthday greeting settings" onClick={() => openModal('birthday')} />}>
            <p className="text-sm font-medium text-gray-700">Enable birthday greetings for user</p>
          </Panel>

          <Panel title="Messages for members" headerExtra={<GearButton label="Messages for members" onClick={() => openModal('messages')} />}>
            <CheckboxField label="Enable messages for members" checked={settings.msgForMembers} onChange={(value) => updateField('msgForMembers', value)} />
          </Panel>
        </div>
      </Section>

      <Section title="Notifications to the Club Administrator" accent="bg-sky-700" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Users still in the area" headerExtra={<GearButton label="Possible overcrowding notice" onClick={() => openModal('possible-overcrowding')} />}>
            <div className="grid gap-3 md:grid-cols-[1fr_110px] md:items-start">
            <CheckboxField label="Notify me when there are more than" checked={settings.ntfNotLeftArea} onChange={(value) => updateField('ntfNotLeftArea', value)} />
            <MiniInput
              field="ntfNotLeftAreaNumber"
              value={settings.ntfNotLeftAreaNumber}
              min={1}
              error={errors.ntfNotLeftAreaNumber}
              fieldRef={registerField('ntfNotLeftAreaNumber')}
              onChange={(value) => updateField('ntfNotLeftAreaNumber', value)}
            />
            </div>
            <p className="text-xs font-medium text-gray-500">Users who have not left the area</p>
          </Panel>

          <Panel title="Overcrowding" headerExtra={<GearButton label="Overcrowding notice" onClick={() => openModal('overcrowding')} />}>
            <CheckboxField label="Notify me when there are more people than allowed" checked={settings.ntfMorePeople} onChange={(value) => updateField('ntfMorePeople', value)} tone="danger" />
          </Panel>
        </div>
      </Section>

      <Section title="Access control mode" accent="bg-sky-700" icon={<ShieldCheck className="h-4 w-4" />}>
        <Panel title="Admission rules">
        <LegacyYesNoRow
          label="Enable blocking for users who have a block"
          name="blockDayFixed"
          value={settings.blockDayFixed}
          onChange={(value) => updateField('blockDayFixed', value)}
        />
        <LegacyYesNoRow
          label="Enable free admission for members with free access"
          name="blockPermissionAllAccessTab"
          value={settings.blockPermissionAll === 'free_access_for_all' ? 'yes' : 'no'}
          onChange={(value) => updateFields({ noneBlockOrFreeAccess: false, blockPermissionAll: value === 'yes' ? 'free_access_for_all' : 'no' })}
        />
        <LegacyYesNoRow
          label="Membership expired"
          name="membershipClubExpiredStatusAccessTab"
          value={settings.membershipClubExpiredStatus === 'yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('membershipClubExpiredStatus', value === 'yes' ? 'yes' : 'med_no_tolerance')}
        />
        <LegacyYesNoRow
          label="Medical certification expired"
          name="medCertificationExpiredStatusAccessTab"
          value={settings.medCertificationExpiredStatus === 'yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('medCertificationExpiredStatus', value === 'yes' ? 'yes' : 'med_no_tolerance')}
        />
        <LegacyYesNoRow
          label="Allow access without booking/reservation"
          name="allowWithoutBooking"
          value={settings.allowWithoutBooking}
          onChange={(value) => updateField('allowWithoutBooking', value)}
          danger
        />
        <LegacyYesNoRow
          label="Control maximum limit of presences"
          name="controlMaxPres"
          value={settings.controlMaxPres}
          onChange={(value) => updateField('controlMaxPres', value)}
        >
          <select
            value={settings.controlMaxPresPer}
            onChange={(event) => updateField('controlMaxPresPer', event.target.value)}
            className="h-9 w-32 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          >
            <option value="area">Area limit</option>
            <option value="course">Course limit</option>
          </select>
        </LegacyYesNoRow>
        <LegacyYesNoRow
          label="Access to members with pending payments"
          name="debtorsStatusAccessTab"
          value={settings.debtorsStatus === 'yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('debtorsStatus', value === 'yes' ? 'yes' : 'access_members_authorized')}
        />
        <LegacyYesNoRow
          label="Access to members with accesses exhausted"
          name="allowedAccessStatusAccessTab"
          value={settings.allowedAccessStatus === 'yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('allowedAccessStatus', value)}
        />
        <LegacyYesNoRow
          label="Access to members in different time table"
          name="dateTimeDifferentAccessTab"
          value={settings.dateTimeDifferent === 'date_yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('dateTimeDifferent', value === 'yes' ? 'date_yes' : 'date_no')}
        />
        <LegacyYesNoRow
          label="Allow user to re-enter"
          hint="(is valid only during the allowed times of booking)"
          name="reEntriesStatusYesAccessTab"
          value={settings.reEntriesStatusYes === 're_entries_yes' ? 'yes' : 'no'}
          onChange={(value) => updateField('reEntriesStatusYes', value === 'yes' ? 're_entries_yes' : 're_entries_no')}
        />
        <LegacyYesNoRow
          label="Activate the space between the access"
          name="activateSpaceBtwAccess"
          value={settings.activateSpaceBtwAccess}
          onChange={(value) => updateField('activateSpaceBtwAccess', value)}
          danger
        >
          <MiniInput
            field="reEntryMinMinutes"
            value={settings.reEntryMinMinutes}
            min={0}
            error={errors.reEntryMinMinutes}
            fieldRef={registerField('reEntryMinMinutes')}
            onChange={(value) => updateField('reEntryMinMinutes', value)}
          />
          <span className="text-sm font-medium text-gray-900">Secs</span>
        </LegacyYesNoRow>
        <LegacyYesNoRow
          label="Allow access to expired subscriptions"
          name="expSubscriptionsStatusAccessTab"
          value={settings.expSubscriptionsStatus === 'yes_plus_alert' ? 'yes' : 'no'}
          onChange={(value) => updateField('expSubscriptionsStatus', value === 'yes' ? 'yes_plus_alert' : 'no')}
        />
        </Panel>
      </Section>
    </div>
  );
}

function AccessSettingsModal({
  modal,
  settings,
  errors,
  registerField,
  updateField,
  onClose
}: {
  modal: AccessModal | null;
  settings: AccessSettings;
  errors: FormErrors;
  registerField: (field: string) => (node: HTMLElement | null) => void;
  updateField: AccessSettingsUpdater;
  onClose: () => void;
}) {
  if (!modal) return null;

  const titleByModal: Record<AccessModal, string> = {
    qrcode: 'QR code generation mode',
    terminal: 'Set the acess control form',
    bookings: 'Bookings',
    outcome: 'Settings for outcome messages on the main terminal',
    'warning-exhaustion': 'Warning to the member',
    'warning-expire': 'Warning to the member',
    birthday: 'Birthday notification mode',
    messages: 'Messages to users',
    'possible-overcrowding': 'Notice of possible next overcrowding',
    overcrowding: 'Notice of overcrowding'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="access-settings-modal-title">
      <div className="flex max-h-full w-full max-w-4xl flex-col rounded-md border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="access-settings-modal-title" className="text-base font-semibold text-gray-950">{titleByModal[modal]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ModalContent
            modal={modal}
            settings={settings}
            errors={errors}
            registerField={registerField}
            updateField={updateField}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Exit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalContent({
  modal,
  settings,
  errors,
  registerField,
  updateField
}: {
  modal: AccessModal;
  settings: AccessSettings;
  errors: FormErrors;
  registerField: (field: string) => (node: HTMLElement | null) => void;
  updateField: AccessSettingsUpdater;
}) {
  if (modal === 'qrcode') {
    return (
      <ModalNestedBox>
        <div className="space-y-2">
          <RadioField label="Generate the code again after each entry made by the user" name="qrcodeGenerationType" checked={settings.qrcodeGenerationType === 'each_entry'} onChange={() => updateField('qrcodeGenerationType', 'each_entry')} />
          <RadioField label="Always keep the same code fixed" name="qrcodeGenerationType" checked={settings.qrcodeGenerationType === 'fixed'} onChange={() => updateField('qrcodeGenerationType', 'fixed')} />
          <FieldError message={errors.qrcodeGenerationType} />
        </div>
      </ModalNestedBox>
    );
  }

  if (modal === 'bookings') {
    return (
      <div className="space-y-4">
        <ModalGroup title="Authorize the booking beyond the time slot of your course" tone="info">
          <div className="grid gap-3 md:grid-cols-3">
            <RadioField label="No" name="authorizeBookingBeyondTimeSlot" checked={settings.authorizeBookingBeyondTimeSlot === 'no'} onChange={() => updateField('authorizeBookingBeyondTimeSlot', 'no')} />
            <RadioField label="Yes, but ask for confirmation" name="authorizeBookingBeyondTimeSlot" checked={settings.authorizeBookingBeyondTimeSlot === 'yes_plus_confirmation'} onChange={() => updateField('authorizeBookingBeyondTimeSlot', 'yes_plus_confirmation')} />
            <RadioField label="Yes" name="authorizeBookingBeyondTimeSlot" checked={settings.authorizeBookingBeyondTimeSlot === 'yes'} onChange={() => updateField('authorizeBookingBeyondTimeSlot', 'yes')} />
          </div>
          <FieldError message={errors.authorizeBookingBeyondTimeSlot} />
        </ModalGroup>
        <ModalNestedBox tone="warning">
          <CheckboxField label="Authorizes the user to self - book" checked={settings.userSelfBook} onChange={(value) => updateField('userSelfBook', value)} />
        </ModalNestedBox>
        <ModalNestedBox>
          <CheckboxField label="Authorize also members with subscription expired" checked={settings.membersWithExpiredSubscription} onChange={(value) => updateField('membersWithExpiredSubscription', value)} tone="danger" />
        </ModalNestedBox>
      </div>
    );
  }

  if (modal === 'warning-exhaustion' || modal === 'warning-expire') {
    const sendMailKey: 'warningMemberSendMailExhaustion' | 'warningMemberSendMailExpire' =
      modal === 'warning-exhaustion' ? 'warningMemberSendMailExhaustion' : 'warningMemberSendMailExpire';
    const speechKey: 'warningMemberNotifyViaGoogleSpeechExhaustion' | 'warningMemberNotifyViaGoogleSpeechExpire' =
      modal === 'warning-exhaustion' ? 'warningMemberNotifyViaGoogleSpeechExhaustion' : 'warningMemberNotifyViaGoogleSpeechExpire';

    return (
      <ModalNestedBox>
        <div className="space-y-2">
          <CheckboxField label="Send a mail to the user" checked={Boolean(settings[sendMailKey])} onChange={(value) => updateField(sendMailKey, value)} />
          <CheckboxField label="Notify via Google Speech too when the user's code is readed" checked={Boolean(settings[speechKey])} onChange={(value) => updateField(speechKey, value)} />
        </div>
      </ModalNestedBox>
    );
  }

  if (modal === 'birthday') {
    return (
      <div className="space-y-4">
        <ModalGroup title="Where You want to notify the greetings" tone="warning">
          <div className="grid gap-3 md:grid-cols-2">
            <CommaCheckbox label="User's smartphone" field="whereSendGreetings" value="smartphone" settings={settings} updateField={updateField} />
            <CommaCheckbox label="Terminal of access control" field="whereSendGreetings" value="terminal" settings={settings} updateField={updateField} />
          </div>
        </ModalGroup>
        <ModalFieldRow label="Set for how many days you want to give the birthday wishes to the user">
          <TextField
            label=""
            type="number"
            min={1}
            max={9}
            step={1}
            value={settings.daysToWishes}
            error={errors.daysToWishes}
            fieldRef={registerField('daysToWishes')}
            onChange={(value) => updateField('daysToWishes', value)}
          />
        </ModalFieldRow>
        <ModalNestedBox>
          <CheckboxField label="Notify with audio message too" checked={settings.notifyWithAudio} onChange={(value) => updateField('notifyWithAudio', value)} />
          <div className="ml-0 grid gap-2 md:ml-6 md:grid-cols-2">
            <RadioField label="Play audio file registered by you" name="greetingsAudioSource" checked={settings.greetingsAudioSource === 'yours'} onChange={() => updateField('greetingsAudioSource', 'yours')} />
            <RadioField label="Enable reading via Google Speech" name="greetingsAudioSource" checked={settings.greetingsAudioSource === 'google'} onChange={() => updateField('greetingsAudioSource', 'google')} />
          </div>
          <FieldError message={errors.greetingsAudioSource} />
        </ModalNestedBox>
      </div>
    );
  }

  if (modal === 'messages') {
    return (
      <div className="space-y-4">
        <ModalGroup title="Where You want to notify the greetings" tone="warning">
          <div className="grid gap-3 md:grid-cols-2">
            <CommaCheckbox label="User's smartphone" field="whereSendMsg" value="smartphone" settings={settings} updateField={updateField} />
            <CommaCheckbox label="Terminal of access control" field="whereSendMsg" value="terminal" settings={settings} updateField={updateField} />
          </div>
        </ModalGroup>
        <ModalNestedBox>
          <CheckboxField label="Notify with audio message too" checked={settings.msgNotifyWithAudio} onChange={(value) => updateField('msgNotifyWithAudio', value)} />
          <div className="ml-0 grid gap-2 md:ml-6 md:grid-cols-2">
            <RadioField label="Play audio file registered by you" name="msgAudioSource" checked={settings.msgAudioSource === 'yours'} onChange={() => updateField('msgAudioSource', 'yours')} />
            <RadioField label="Enable reading via Google Speech" name="msgAudioSource" checked={settings.msgAudioSource === 'google'} onChange={() => updateField('msgAudioSource', 'google')} />
          </div>
          <FieldError message={errors.msgAudioSource} />
        </ModalNestedBox>
      </div>
    );
  }

  if (modal === 'possible-overcrowding') {
    return (
      <div className="space-y-4">
        <ModalFieldRow label="How many minutes before the end of the current time slot?">
          <TextField
            label=""
            type="number"
            min={1}
            max={30}
            step={1}
            value={settings.minutesToEndSlot}
            error={errors.minutesToEndSlot}
            fieldRef={registerField('minutesToEndSlot')}
            onChange={(value) => updateField('minutesToEndSlot', value)}
          />
        </ModalFieldRow>
        <ModalNestedBox>
          <CheckboxField label="Notify with audio message too" checked={settings.possibleOvercrowdingNotifyWithAudio} onChange={(value) => updateField('possibleOvercrowdingNotifyWithAudio', value)} />
          <AudioPlayChoice
            name="possibleOvercrowdingTypePlay"
            typeValue={settings.possibleOvercrowdingTypePlay}
            fileValue={settings.possibleOvercrowdingAudioFile}
            onTypeChange={(value) => updateField('possibleOvercrowdingTypePlay', value)}
            onFileChange={(value) => updateField('possibleOvercrowdingAudioFile', value)}
          />
          <FieldError message={errors.possibleOvercrowdingTypePlay || errors.possibleOvercrowdingAudioFile} />
        </ModalNestedBox>
      </div>
    );
  }

  if (modal === 'overcrowding') {
    return (
      <ModalNestedBox>
        <CheckboxField label="Notify with audio message too" checked={settings.overcrowdingNotifyWithAudio} onChange={(value) => updateField('overcrowdingNotifyWithAudio', value)} />
        <AudioPlayChoice
          name="overcrowdingTypePlay"
          typeValue={settings.overcrowdingTypePlay}
          fileValue={settings.overcrowdingAudioFile}
          onTypeChange={(value) => updateField('overcrowdingTypePlay', value)}
          onFileChange={(value) => updateField('overcrowdingAudioFile', value)}
        />
        <FieldError message={errors.overcrowdingTypePlay || errors.overcrowdingAudioFile} />
      </ModalNestedBox>
    );
  }

  const custom = modal === 'terminal';
  return (
    <div className="space-y-4">
      {custom && (
        <ModalNestedBox>
          <div className="space-y-2">
            <RadioField label="Enable the settings set at Settings for outcome messages on the main terminal" name="accessControlFrom" checked={settings.accessControlFrom === 'main_terminal'} onChange={() => updateField('accessControlFrom', 'main_terminal')} />
            <RadioField label="or enable these other ones" name="accessControlFrom" checked={settings.accessControlFrom === 'custom'} onChange={() => updateField('accessControlFrom', 'custom')} />
            <FieldError message={errors.accessControlFrom} />
          </div>
        </ModalNestedBox>
      )}
      <OutcomeMessageBlocks custom={custom} settings={settings} errors={errors} updateField={updateField} />
      {custom && (
        <DataDisplaySettings settings={settings} updateField={updateField} />
      )}
    </div>
  );
}

function LegacySectionHeader({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-sky-100 bg-sky-50 px-4 py-3 shadow-sm">
      <h2 className="text-sm font-semibold text-sky-950">{title}</h2>
    </div>
  );
}

function LegacyRow({
  left,
  right,
  children
}: {
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-14 flex-col gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-gray-300 md:flex-row md:items-center">
      {left ? <div className="w-40 shrink-0 text-sm text-gray-900">{left}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {right ? <div className="flex shrink-0 items-center justify-end">{right}</div> : null}
    </div>
  );
}

function ReaderOption({
  label,
  selected,
  icon,
  onChange
}: {
  label: string;
  value: string;
  selected: boolean;
  icon: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-20 items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
        selected
          ? 'border-sky-300 bg-sky-50 text-sky-950 ring-1 ring-sky-100'
          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-white text-sky-700' : 'bg-gray-100 text-gray-700'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-sky-700"
      />
    </label>
  );
}

function LegacyYesNoRow({
  label,
  hint,
  name,
  value,
  yesValue = 'yes',
  noValue = 'no',
  danger = false,
  children,
  onChange
}: {
  label: string;
  hint?: string;
  name: string;
  value: string;
  yesValue?: string;
  noValue?: string;
  danger?: boolean;
  children?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 border-b border-gray-200 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(260px,1fr)_auto] md:items-center">
      <div className={danger ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
        {label}
        {hint ? <div className="mt-1 text-xs font-normal text-gray-700">{hint}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4 md:justify-end">
        <RadioField label="Yes" name={name} checked={value === yesValue} onChange={() => onChange(yesValue)} />
        {children ? <div className="flex min-h-9 flex-wrap items-center gap-2">{children}</div> : null}
        <RadioField label="No" name={name} checked={value === noValue} onChange={() => onChange(noValue)} />
      </div>
    </div>
  );
}

function GearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
      aria-label={label}
      title={label}
    >
      <Settings className="h-4 w-4" />
      <span>Settings</span>
    </button>
  );
}

function MiniInput({
  field,
  value,
  min,
  max,
  error,
  fieldRef,
  onChange
}: {
  field: string;
  value: string;
  min?: number;
  max?: number;
  error?: string;
  fieldRef?: (node: HTMLElement | null) => void;
  onChange: (value: string) => void;
}) {
  return (
    <label ref={fieldRef} className="block">
      <input
        aria-label={field}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-24 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      />
      <FieldError message={error} />
    </label>
  );
}

function MiniSelect({
  field,
  value,
  error,
  fieldRef,
  children,
  onChange
}: {
  field: string;
  value: string;
  error?: string;
  fieldRef?: (node: HTMLElement | null) => void;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label ref={fieldRef} className="block">
      <select
        aria-label={field}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-20 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      >
        {children}
      </select>
      <FieldError message={error} />
    </label>
  );
}

function OutcomeMessageBlocks({
  custom,
  settings,
  errors,
  updateField
}: {
  custom: boolean;
  settings: AccessSettings;
  errors: FormErrors;
  updateField: AccessSettingsUpdater;
}) {
  const detailKey: 'customDetailOfOutcome' | 'detailOfOutcome' = custom ? 'customDetailOfOutcome' : 'detailOfOutcome';
  const flashesKey: 'customOutcomeMessageFleshes' | 'outcomeMessageFleshes' = custom ? 'customOutcomeMessageFleshes' : 'outcomeMessageFleshes';
  const audioKey: 'customEnableAudioMessages' | 'enableAudioMessages' = custom ? 'customEnableAudioMessages' : 'enableAudioMessages';
  const audioTypesKey: 'customEnableAudioForType' | 'enableAudioForType' = custom ? 'customEnableAudioForType' : 'enableAudioForType';
  const countryDetailKey: 'customDetailOfOutcomeCountryLanguage' | 'detailOfOutcomeCountryLanguage' = custom ? 'customDetailOfOutcomeCountryLanguage' : 'detailOfOutcomeCountryLanguage';
  const countryFlashesKey: 'customOutcomeMessageFleshesCountryLanguage' | 'outcomeMessageFleshesCountryLanguage' = custom ? 'customOutcomeMessageFleshesCountryLanguage' : 'outcomeMessageFleshesCountryLanguage';
  const countryAudioKey: 'customEnableAudioMessagesCountryLanguage' | 'enableAudioMessagesCountryLanguage' = custom ? 'customEnableAudioMessagesCountryLanguage' : 'enableAudioMessagesCountryLanguage';
  const audioSourceKey: 'customMainTerminalAudioSource' | 'mainTerminalAudioSource' = custom ? 'customMainTerminalAudioSource' : 'mainTerminalAudioSource';
  const countryAudioTypesKey: 'customEnableAudioForTypeCountryLanguage' | 'enableAudioForTypeCountryLanguage' = custom ? 'customEnableAudioForTypeCountryLanguage' : 'enableAudioForTypeCountryLanguage';

  return (
    <>
      <ModalGroup title="Display the default standard outcomes in the main language selected" tone="warning">
        <ModalNestedBox tone="info">
          <CheckboxField label="Display the detail of the outcome else display YES or NO" checked={Boolean(settings[detailKey])} onChange={(value) => updateField(detailKey, value)} />
          <div className="pl-6">
            <CheckboxField label="The outcome message flashes" checked={Boolean(settings[flashesKey])} onChange={(value) => updateField(flashesKey, value)} />
          </div>
        </ModalNestedBox>

        <ModalNestedBox tone="info">
          <CheckboxField label="Enable the audio messages" checked={Boolean(settings[audioKey])} onChange={(value) => updateField(audioKey, value)} />
          <div className="space-y-2 pl-6">
            <p className="text-sm font-medium text-gray-700">Enable the audio only for these types of messages</p>
            <div className="grid gap-2 md:grid-cols-2">
              <CommaCheckbox label="Accesses denied" field={audioTypesKey} value="denied" settings={settings} updateField={updateField} />
              <CommaCheckbox label="Accesses allowed" field={audioTypesKey} value="allowed" settings={settings} updateField={updateField} />
            </div>
            <FieldError message={errors[audioTypesKey]} />
          </div>
        </ModalNestedBox>
      </ModalGroup>

      <ModalGroup
        title={(
          <>
            Display the default standard outcomes in the language of your country
            <span className="mt-1 block text-xs font-medium text-red-600">Recomended if your language is different of the listed languages</span>
          </>
        )}
        tone="warning"
      >
        <ModalNestedBox tone="info">
          <CheckboxField label="Display the detail of the outcome else display YES or NO" checked={Boolean(settings[countryDetailKey])} onChange={(value) => updateField(countryDetailKey, value)} />
          <div className="pl-6">
            <CheckboxField label="The outcome message flashes" checked={Boolean(settings[countryFlashesKey])} onChange={(value) => updateField(countryFlashesKey, value)} />
          </div>
        </ModalNestedBox>

        <ModalNestedBox tone="info">
          <CheckboxField label="Enable the audio messages" checked={Boolean(settings[countryAudioKey])} onChange={(value) => updateField(countryAudioKey, value)} />
          <div className="space-y-2 pl-6">
            <RadioField label="Play audio file registered by you" name={audioSourceKey} checked={String(settings[audioSourceKey]) === 'yours'} onChange={() => updateField(audioSourceKey, 'yours')} />
            <RadioField label="Enable reading via Google Speech" name={audioSourceKey} checked={String(settings[audioSourceKey]) === 'google'} onChange={() => updateField(audioSourceKey, 'google')} />
            <FieldError message={errors[audioSourceKey]} />
            <p className="pt-2 text-sm font-medium text-gray-700">Enable the audio only for these types of messages</p>
            <div className="grid gap-2 md:grid-cols-2">
              <CommaCheckbox label="Accesses denied" field={countryAudioTypesKey} value="denied" settings={settings} updateField={updateField} />
              <CommaCheckbox label="Accesses allowed" field={countryAudioTypesKey} value="allowed" settings={settings} updateField={updateField} />
            </div>
            <FieldError message={errors[countryAudioTypesKey]} />
          </div>
        </ModalNestedBox>
      </ModalGroup>
    </>
  );
}

function DataDisplaySettings({
  settings,
  updateField
}: {
  settings: AccessSettings;
  updateField: AccessSettingsUpdater;
}) {
  return (
    <div className="space-y-4">
      <ModalGroup title="Data to display">
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <p className="font-semibold">Warning!</p>
          <p>
            This data will be displayed on the access control screen but being sensitive personal data they require the
            consent of the person displayed. The settings estabilished here are subordinate to those chosen by the
            user in his profile.
          </p>
        </div>
      </ModalGroup>

      <ModalNestedBox>
        <p className="text-sm leading-6 text-red-600">
          The settings estabilished here has priority only if in the user profile the option chosen by the user has an
          equal or higher level, otherwise the priority will be given to the option chosen by the user.
        </p>
        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
          <span className="text-sm font-medium text-gray-700">Name display mode</span>
          <div className="grid gap-2 md:grid-cols-4">
            <RadioField label="Only name" name="dataDisplayName" checked={settings.dataDisplayName === '1'} onChange={() => updateField('dataDisplayName', '1')} />
            <RadioField label="Only initials" name="dataDisplayName" checked={settings.dataDisplayName === '2'} onChange={() => updateField('dataDisplayName', '2')} />
            <RadioField label="Username" name="dataDisplayName" checked={settings.dataDisplayName === '3'} onChange={() => updateField('dataDisplayName', '3')} />
            <RadioField label="Full name" name="dataDisplayName" checked={settings.dataDisplayName === '4'} onChange={() => updateField('dataDisplayName', '4')} />
          </div>
        </div>
      </ModalNestedBox>

      <ModalNestedBox>
        <p className="text-sm leading-6 text-red-600">
          These options can be selected or not, but if you choose to select them, they will be applied only if the user
          has also selected them in his profile, otherwise they will no be displayed.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <CheckboxField label="Display photo in the access control" checked={settings.displayDataPhoto} onChange={(value) => updateField('displayDataPhoto', value)} />
          <CheckboxField label="Alert of payment not done" checked={settings.displayDataPaymentNotDone} onChange={(value) => updateField('displayDataPaymentNotDone', value)} />
        </div>
      </ModalNestedBox>
    </div>
  );
}

function AudioPlayChoice({
  name,
  typeValue,
  fileValue,
  onTypeChange,
  onFileChange
}: {
  name: string;
  typeValue: string;
  fileValue: string;
  onTypeChange: (value: string) => void;
  onFileChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 pl-0 md:pl-6">
      <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
        <RadioField label="Play audio file" name={name} checked={typeValue === 'audio_file'} onChange={() => onTypeChange('audio_file')} />
        <label className="block">
          <span className="sr-only">Audio file</span>
          <select value={fileValue} onChange={(event) => onFileChange(event.target.value)} className={inputClass}>
            <option value="File 1">File 1</option>
            <option value="File 2">File 2</option>
          </select>
        </label>
      </div>
      <RadioField label="Enable reading via Google Speech" name={name} checked={typeValue === 'google'} onChange={() => onTypeChange('google')} />
    </div>
  );
}

function ModalFieldRow({
  label,
  children
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px] md:items-start">
      <div className="text-sm font-medium leading-6 text-gray-700">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ModalNestedBox({
  tone = 'default',
  children
}: {
  tone?: 'default' | 'info' | 'warning';
  children: ReactNode;
}) {
  const toneClass = {
    default: 'border-gray-200 bg-white',
    info: 'border-sky-100 bg-sky-50/70',
    warning: 'border-amber-100 bg-amber-50/70'
  }[tone];

  return (
    <div className={`space-y-3 rounded-md border px-4 py-3 ${toneClass}`}>
      {children}
    </div>
  );
}

function ModalGroup({
  title,
  tone = 'default',
  children
}: {
  title: ReactNode;
  tone?: 'default' | 'info' | 'warning';
  children: ReactNode;
}) {
  const toneClass = {
    default: 'border-gray-200 bg-white',
    info: 'border-sky-100 bg-sky-50/60',
    warning: 'border-amber-100 bg-amber-50/60'
  }[tone];

  return (
    <fieldset className={`rounded-md border p-4 shadow-sm ${toneClass}`}>
      <legend className="px-2 text-sm font-semibold text-gray-950">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function CommaCheckbox({
  label,
  field,
  value,
  settings,
  updateField
}: {
  label: string;
  field: StringAccessSettingKey;
  value: string;
  settings: AccessSettings;
  updateField: AccessSettingsUpdater;
}) {
  const current = String(settings[field] ?? '');
  return (
    <CheckboxField
      label={label}
      checked={hasListValue(current, value)}
      onChange={(checked) => updateField(field, toggleListValue(current, value, checked))}
    />
  );
}

function listValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasListValue(current: string, value: string): boolean {
  return listValues(current).includes(value);
}

function toggleListValue(current: string, value: string, checked: boolean): string {
  const values = new Set(listValues(current));
  if (checked) {
    values.add(value);
  } else {
    values.delete(value);
  }
  return Array.from(values).join(',');
}

function ConfirmModal({
  action,
  isDirty,
  saving,
  onCancel,
  onConfirm
}: {
  action: ConfirmAction | null;
  isDirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const copy = {
    reset: {
      title: 'Reset changes',
      message: 'Discard all unsaved edits and restore the last saved access settings?',
      confirmLabel: 'Reset',
      tone: 'danger'
    },
    save: {
      title: 'Save changes',
      message: 'Save these access settings now?',
      confirmLabel: 'Save',
      tone: 'primary'
    },
    exit: {
      title: 'Exit page',
      message: isDirty
        ? 'Leave this page and discard your unsaved access settings changes?'
        : 'Leave this page and return to the club dashboard?',
      confirmLabel: 'Exit',
      tone: 'danger'
    }
  }[action];

  const confirmClass =
    copy.tone === 'primary'
      ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
      : 'border-red-600 bg-red-600 text-white hover:bg-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4" role="dialog" aria-modal="true" aria-labelledby="access-settings-confirm-title">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="access-settings-confirm-title" className="text-base font-semibold text-gray-950">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{copy.message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Cancel confirmation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving && action === 'save'}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {saving && action === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  icon,
  children
}: {
  title: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
      <div className={`${accent} flex items-center gap-2 px-4 py-2 text-sm font-bold text-white`}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Panel({
  title,
  headerExtra,
  children
}: {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <legend className="ml-1 flex flex-wrap items-center gap-3 px-2 text-sm font-semibold text-gray-900">
        <span>{title}</span>
        {headerExtra}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  type = 'text',
  min,
  max,
  step,
  error,
  fieldRef,
  onChange
}: {
  label: string;
  value: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
  error?: string;
  fieldRef?: (node: HTMLElement | null) => void;
  onChange: (value: string) => void;
}) {
  return (
    <label ref={fieldRef} className="block">
      {label ? <span className={labelClass}>{label}</span> : null}
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
      />
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

function CheckboxField({
  label,
  checked,
  tone = 'default',
  onChange
}: {
  label: ReactNode;
  checked: boolean;
  tone?: 'default' | 'danger';
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex min-h-9 items-center gap-2 text-sm font-medium ${tone === 'danger' ? 'text-red-600' : 'text-gray-700'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-gray-900"
      />
      <span>{label}</span>
    </label>
  );
}

function IconCheckboxField({
  icon,
  label,
  checked,
  onChange
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center gap-3 text-sm font-medium text-gray-700">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-900">{icon}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-gray-900"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioField({
  label,
  name,
  checked,
  onChange
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-8 items-center gap-2 text-sm font-medium text-gray-700">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-gray-900"
      />
      <span>{label}</span>
    </label>
  );
}

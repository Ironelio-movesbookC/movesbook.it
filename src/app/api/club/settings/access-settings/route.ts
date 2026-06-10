import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type AccessSettings = Record<string, string | boolean>;
type FieldErrors = Record<string, string>;

type AuthorizedContext = {
  userId: string;
  legacyUserId: string | null;
  club: { id: string; name: string } | null;
  userIds: string[];
};

const TABLE_NAME = 'club_access_settings';

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

const SETTING_COLUMNS: Record<string, string> = {
  useAdvancedSettings: 'use_advanced_settings',
  noneBlockOrFreeAccess: 'none_block_or_free_access',
  blockPermissionAll: 'block_permission_all',
  exceptMembersAuthorized: 'except_members_authorized',
  exceptMembersBlocked: 'except_members_blocked',
  exceptMembersWithCardSuspended: 'except_members_with_card_suspended',
  accessDeniedToMembersAuthorized: 'access_denied_to_members_authorized',
  accessAllowedToMembersBlocked: 'access_allowed_to_members_blocked',
  accessAllowedMembersCardSuspended: 'access_allowed_members_card_suspended',
  debtorsStatus: 'debtors_status',
  maxDebtValue: 'max_debt_value',
  includeDebtsOnPurchases: 'include_debts_on_purchases',
  includeDebtsOnServices: 'include_debts_on_services',
  medCertificationExpiredStatus: 'med_certification_expired_status',
  medNoToleranceValue: 'med_no_tolerance_value',
  disableMembership: 'disable_membership',
  membershipClubExpiredStatus: 'membership_club_expired_status',
  memNoToleranceValue: 'mem_no_tolerance_value',
  alertMember: 'alert_member',
  accessNoSubscription: 'access_no_subscription',
  deemedNotBlocked: 'deemed_not_blocked',
  expSubscriptionsStatus: 'exp_subscriptions_status',
  dayToleranceValue: 'day_tolerance_value',
  noAccessesValue: 'no_accesses_value',
  dateTimeDifferent: 'date_time_different',
  dateToleranceNumberValue: 'date_tolerance_number_value',
  numberWeeklyAccessesDisabled: 'number_weekly_accesses_disabled',
  numberWeeklyAccessesYes: 'number_weekly_accesses_yes',
  numberWeeklyAccessesYesAlert: 'number_weekly_accesses_yes_alert',
  allowedAccessStatus: 'allowed_access_status',
  accessPermittedFrom: 'access_permitted_from',
  alertBeforeChange: 'alert_before_change',
  askForConfirmation: 'ask_for_confirmation',
  reEntriesStatusYes: 're_entries_status_yes',
  reEntryDays: 're_entry_days',
  reEntryMinMinutes: 're_entry_min_minutes',
  reEntryNotMorePreviousMin: 're_entry_not_more_previous_min',
  incrementEachAccessNumSettingSub: 'increment_each_access_num_setting_sub',
  askBeforeIncrement: 'ask_before_increment',
  alwaysAllow: 'always_allow',
  dailyDetbValue: 'daily_detb_value',
  totalDetbValue: 'total_detb_value',
  enabledReadingTypes: 'enabled_reading_types',
  qrcodeGenerationType: 'qrcode_generation_type',
  onlyAccessControlTerminal: 'only_access_control_terminal',
  accessControlFrom: 'access_control_from',
  customDetailOfOutcome: 'custom_detail_of_outcome',
  customOutcomeMessageFleshes: 'custom_outcome_message_fleshes',
  customEnableAudioMessages: 'custom_enable_audio_messages',
  customEnableAudioForType: 'custom_enable_audio_for_type',
  customDetailOfOutcomeCountryLanguage: 'custom_detail_of_outcome_country_language',
  customOutcomeMessageFleshesCountryLanguage: 'custom_outcome_message_fleshes_country_language',
  customEnableAudioMessagesCountryLanguage: 'custom_enable_audio_messages_country_language',
  customMainTerminalAudioSource: 'custom_main_terminal_audio_source',
  customEnableAudioForTypeCountryLanguage: 'custom_enable_audio_for_type_country_language',
  dataDisplayName: 'data_display_name',
  displayDataPhoto: 'display_data_photo',
  displayDataPaymentNotDone: 'display_data_payment_not_done',
  setNumberBookings: 'set_number_bookings',
  numBookingsDayUser: 'num_bookings_day_user',
  authorizeBookingBeyondTimeSlot: 'authorize_booking_byond_time_slot',
  userSelfBook: 'user_self_book',
  membersWithExpiredSubscription: 'members_with_expired_subscription',
  msgMainTerminal: 'msg_main_terminal',
  msgUsrPhone: 'msg_usr_phone',
  detailOfOutcome: 'detail_of_outcome',
  outcomeMessageFleshes: 'outcome_message_fleshes',
  enableAudioMessages: 'enable_audio_messages',
  enableAudioForType: 'enable_audio_for_type',
  detailOfOutcomeCountryLanguage: 'detail_of_outcome_country_language',
  outcomeMessageFleshesCountryLanguage: 'outcome_message_fleshes_country_language',
  enableAudioMessagesCountryLanguage: 'enable_audio_messages_country_language',
  mainTerminalAudioSource: 'main_terminal_audio_source',
  enableAudioForTypeCountryLanguage: 'enable_audio_for_type_country_language',
  warnExhaustion: 'warn_exhaustion',
  warnExhaustionNumber: 'warn_exhaustion_number',
  warningMemberSendMailExhaustion: 'warning_member_send_mail_exhaustion',
  warningMemberNotifyViaGoogleSpeechExhaustion: 'warning_member_notify_via_google_speech_exhaustion',
  wharnExpire: 'wharn_expire',
  warnExpireDays: 'warn_expire_days',
  warningMemberSendMailExpire: 'warning_member_send_mail_expire',
  warningMemberNotifyViaGoogleSpeechExpire: 'warning_member_notify_via_google_speech_expire',
  whereSendGreetings: 'where_send_greetings',
  daysToWishes: 'days_to_wishes',
  notifyWithAudio: 'notify_with_audio',
  greetingsAudioSource: 'greetings_audio_source',
  msgForMembers: 'msg_for_members',
  whereSendMsg: 'where_send_msg',
  msgNotifyWithAudio: 'msg_notify_with_audio',
  msgAudioSource: 'msg_audio_source',
  ntfNotLeftArea: 'ntf_not_left_area',
  ntfNotLeftAreaNumber: 'ntf_not_left_area_number',
  minutesToEndSlot: 'minutes_to_end_slot',
  possibleOvercrowdingNotifyWithAudio: 'possible_overcrowding_notify_with_audio',
  possibleOvercrowdingTypePlay: 'possible_overcrowding_type_play',
  possibleOvercrowdingAudioFile: 'possible_overcrowding_audio_file',
  ntfMorePeople: 'ntf_more_people',
  overcrowdingNotifyWithAudio: 'overcrowding_notify_with_audio',
  overcrowdingTypePlay: 'overcrowding_type_play',
  overcrowdingAudioFile: 'overcrowding_audio_file',
  blockDayFixed: 'block_day_fixed',
  allowWithoutBooking: 'allow_without_booking',
  controlMaxPres: 'control_max_pres',
  controlMaxPresPer: 'control_max_pres_per',
  activateSpaceBtwAccess: 'activate_space_btw_access'
};

const BOOLEAN_COLUMNS = new Set(
  Object.entries(DEFAULT_SETTINGS)
    .filter(([, defaultValue]) => typeof defaultValue === 'boolean')
    .map(([key]) => SETTING_COLUMNS[key])
);

const COLUMN_DEFINITIONS: Record<string, string> = {
  club_user_id: 'VARCHAR(191) NULL',
  club_id: 'VARCHAR(191) NULL',
  club_key: "VARCHAR(191) NOT NULL DEFAULT ''",
  use_advanced_settings: "CHAR(1) NOT NULL DEFAULT 'N'",
  none_block_or_free_access: "CHAR(1) NOT NULL DEFAULT 'N'",
  block_permission_all: 'VARCHAR(80) NULL',
  except_members_authorized: "CHAR(1) NOT NULL DEFAULT 'N'",
  except_members_blocked: "CHAR(1) NOT NULL DEFAULT 'N'",
  except_members_with_card_suspended: "CHAR(1) NOT NULL DEFAULT 'N'",
  access_denied_to_members_authorized: "CHAR(1) NOT NULL DEFAULT 'N'",
  access_allowed_to_members_blocked: "CHAR(1) NOT NULL DEFAULT 'N'",
  access_allowed_members_card_suspended: "CHAR(1) NOT NULL DEFAULT 'N'",
  debtors_status: 'VARCHAR(80) NULL',
  max_debt_value: 'VARCHAR(50) NULL',
  include_debts_on_purchases: "CHAR(1) NOT NULL DEFAULT 'N'",
  include_debts_on_services: "CHAR(1) NOT NULL DEFAULT 'N'",
  med_certification_expired_status: 'VARCHAR(80) NULL',
  med_no_tolerance_value: 'VARCHAR(50) NULL',
  disable_membership: "CHAR(1) NOT NULL DEFAULT 'N'",
  membership_club_expired_status: 'VARCHAR(80) NULL',
  mem_no_tolerance_value: 'VARCHAR(50) NULL',
  alert_member: "CHAR(1) NOT NULL DEFAULT 'N'",
  access_no_subscription: "CHAR(1) NOT NULL DEFAULT 'N'",
  deemed_not_blocked: "CHAR(1) NOT NULL DEFAULT 'N'",
  exp_subscriptions_status: 'VARCHAR(80) NULL',
  day_tolerance_value: 'VARCHAR(50) NULL',
  no_accesses_value: 'VARCHAR(50) NULL',
  date_time_different: 'VARCHAR(80) NULL',
  date_tolerance_number_value: 'VARCHAR(50) NULL',
  number_weekly_accesses_disabled: "CHAR(1) NOT NULL DEFAULT 'N'",
  number_weekly_accesses_yes: "CHAR(1) NOT NULL DEFAULT 'N'",
  number_weekly_accesses_yes_alert: "CHAR(1) NOT NULL DEFAULT 'N'",
  allowed_access_status: 'VARCHAR(80) NULL',
  access_permitted_from: 'VARCHAR(50) NULL',
  alert_before_change: "CHAR(1) NOT NULL DEFAULT 'N'",
  ask_for_confirmation: "CHAR(1) NOT NULL DEFAULT 'N'",
  re_entries_status_yes: 'VARCHAR(80) NULL',
  re_entry_days: 'VARCHAR(50) NULL',
  re_entry_min_minutes: 'VARCHAR(50) NULL',
  re_entry_not_more_previous_min: 'VARCHAR(50) NULL',
  increment_each_access_num_setting_sub: 'VARCHAR(80) NULL',
  ask_before_increment: "CHAR(1) NOT NULL DEFAULT 'N'",
  always_allow: 'VARCHAR(80) NULL',
  daily_detb_value: 'VARCHAR(50) NULL',
  total_detb_value: 'VARCHAR(50) NULL',
  enabled_reading_types: 'VARCHAR(255) NULL',
  qrcode_generation_type: 'VARCHAR(80) NULL',
  only_access_control_terminal: "CHAR(1) NOT NULL DEFAULT 'N'",
  access_control_from: 'VARCHAR(80) NULL',
  custom_detail_of_outcome: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_outcome_message_fleshes: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_enable_audio_messages: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_enable_audio_for_type: 'VARCHAR(255) NULL',
  custom_detail_of_outcome_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_outcome_message_fleshes_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_enable_audio_messages_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  custom_main_terminal_audio_source: 'VARCHAR(80) NULL',
  custom_enable_audio_for_type_country_language: 'VARCHAR(255) NULL',
  data_display_name: 'VARCHAR(20) NULL',
  display_data_photo: "CHAR(1) NOT NULL DEFAULT 'N'",
  display_data_payment_not_done: "CHAR(1) NOT NULL DEFAULT 'N'",
  set_number_bookings: "CHAR(1) NOT NULL DEFAULT 'N'",
  num_bookings_day_user: 'VARCHAR(20) NULL',
  authorize_booking_byond_time_slot: 'VARCHAR(80) NULL',
  user_self_book: "CHAR(1) NOT NULL DEFAULT 'N'",
  members_with_expired_subscription: "CHAR(1) NOT NULL DEFAULT 'N'",
  msg_main_terminal: "CHAR(1) NOT NULL DEFAULT 'N'",
  msg_usr_phone: "CHAR(1) NOT NULL DEFAULT 'N'",
  detail_of_outcome: "CHAR(1) NOT NULL DEFAULT 'N'",
  outcome_message_fleshes: "CHAR(1) NOT NULL DEFAULT 'N'",
  enable_audio_messages: "CHAR(1) NOT NULL DEFAULT 'N'",
  enable_audio_for_type: 'VARCHAR(255) NULL',
  detail_of_outcome_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  outcome_message_fleshes_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  enable_audio_messages_country_language: "CHAR(1) NOT NULL DEFAULT 'N'",
  main_terminal_audio_source: 'VARCHAR(80) NULL',
  enable_audio_for_type_country_language: 'VARCHAR(255) NULL',
  warn_exhaustion: "CHAR(1) NOT NULL DEFAULT 'N'",
  warn_exhaustion_number: 'VARCHAR(20) NULL',
  warning_member_send_mail_exhaustion: "CHAR(1) NOT NULL DEFAULT 'N'",
  warning_member_notify_via_google_speech_exhaustion: "CHAR(1) NOT NULL DEFAULT 'N'",
  wharn_expire: "CHAR(1) NOT NULL DEFAULT 'N'",
  warn_expire_days: 'VARCHAR(20) NULL',
  warning_member_send_mail_expire: "CHAR(1) NOT NULL DEFAULT 'N'",
  warning_member_notify_via_google_speech_expire: "CHAR(1) NOT NULL DEFAULT 'N'",
  where_send_greetings: 'VARCHAR(255) NULL',
  days_to_wishes: 'VARCHAR(20) NULL',
  notify_with_audio: "CHAR(1) NOT NULL DEFAULT 'N'",
  greetings_audio_source: 'VARCHAR(80) NULL',
  msg_for_members: "CHAR(1) NOT NULL DEFAULT 'N'",
  where_send_msg: 'VARCHAR(255) NULL',
  msg_notify_with_audio: "CHAR(1) NOT NULL DEFAULT 'N'",
  msg_audio_source: 'VARCHAR(80) NULL',
  ntf_not_left_area: "CHAR(1) NOT NULL DEFAULT 'N'",
  ntf_not_left_area_number: 'VARCHAR(20) NULL',
  minutes_to_end_slot: 'VARCHAR(20) NULL',
  possible_overcrowding_notify_with_audio: "CHAR(1) NOT NULL DEFAULT 'N'",
  possible_overcrowding_type_play: 'VARCHAR(80) NULL',
  possible_overcrowding_audio_file: 'VARCHAR(80) NULL',
  ntf_more_people: "CHAR(1) NOT NULL DEFAULT 'N'",
  overcrowding_notify_with_audio: "CHAR(1) NOT NULL DEFAULT 'N'",
  overcrowding_type_play: 'VARCHAR(80) NULL',
  overcrowding_audio_file: 'VARCHAR(80) NULL',
  block_day_fixed: 'VARCHAR(20) NULL',
  allow_without_booking: 'VARCHAR(20) NULL',
  control_max_pres: 'VARCHAR(20) NULL',
  control_max_pres_per: 'VARCHAR(80) NULL',
  activate_space_btw_access: 'VARCHAR(20) NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

const NUMERIC_FIELDS: Array<{
  key: string;
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
    isRequired: (settings) => Boolean(settings.setNumberBookings)
  },
  {
    key: 'warnExhaustionNumber',
    label: 'Access before exhaustion',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => Boolean(settings.warnExhaustion)
  },
  {
    key: 'warnExpireDays',
    label: 'Expiring days',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => Boolean(settings.wharnExpire)
  },
  {
    key: 'ntfNotLeftAreaNumber',
    label: 'Users who have not left the area',
    min: 1,
    integer: true,
    isRequired: (settings) => Boolean(settings.ntfNotLeftArea)
  },
  {
    key: 'daysToWishes',
    label: 'Birthday wishes days',
    min: 1,
    max: 9,
    integer: true,
    isRequired: (settings) => Boolean(String(settings.whereSendGreetings ?? '').trim()) || Boolean(settings.notifyWithAudio)
  },
  {
    key: 'minutesToEndSlot',
    label: 'End current time slot minutes',
    min: 1,
    max: 30,
    integer: true,
    isRequired: (settings) => Boolean(settings.ntfNotLeftArea)
  }
];

const REQUIRED_CHOICE_FIELDS: Array<{
  key: string;
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
    isRequired: (settings) => Boolean(settings.customEnableAudioMessages)
  },
  {
    key: 'customMainTerminalAudioSource',
    label: 'audio source',
    isRequired: (settings) => Boolean(settings.customEnableAudioMessagesCountryLanguage)
  },
  {
    key: 'customEnableAudioForTypeCountryLanguage',
    label: 'country-language audio message type',
    list: true,
    isRequired: (settings) => Boolean(settings.customEnableAudioMessagesCountryLanguage)
  },
  {
    key: 'enableAudioForType',
    label: 'audio message type',
    list: true,
    isRequired: (settings) => Boolean(settings.enableAudioMessages)
  },
  {
    key: 'mainTerminalAudioSource',
    label: 'audio source',
    isRequired: (settings) => Boolean(settings.enableAudioMessagesCountryLanguage)
  },
  {
    key: 'enableAudioForTypeCountryLanguage',
    label: 'country-language audio message type',
    list: true,
    isRequired: (settings) => Boolean(settings.enableAudioMessagesCountryLanguage)
  },
  {
    key: 'greetingsAudioSource',
    label: 'greetings audio source',
    isRequired: (settings) => Boolean(settings.notifyWithAudio)
  },
  {
    key: 'msgAudioSource',
    label: 'message audio source',
    isRequired: (settings) => Boolean(settings.msgNotifyWithAudio)
  },
  {
    key: 'possibleOvercrowdingTypePlay',
    label: 'possible overcrowding audio source',
    isRequired: (settings) => Boolean(settings.possibleOvercrowdingNotifyWithAudio)
  },
  {
    key: 'possibleOvercrowdingAudioFile',
    label: 'possible overcrowding audio file',
    isRequired: (settings) => Boolean(settings.possibleOvercrowdingNotifyWithAudio) && settings.possibleOvercrowdingTypePlay === 'audio_file'
  },
  {
    key: 'overcrowdingTypePlay',
    label: 'overcrowding audio source',
    isRequired: (settings) => Boolean(settings.overcrowdingNotifyWithAudio)
  },
  {
    key: 'overcrowdingAudioFile',
    label: 'overcrowding audio file',
    isRequired: (settings) => Boolean(settings.overcrowdingNotifyWithAudio) && settings.overcrowdingTypePlay === 'audio_file'
  }
];

function listValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function getClubKey(clubId: string | null): string {
  return clubId ?? '';
}

function toBooleanFlag(value: unknown): boolean {
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'T'
    || value === 't'
    || value === 'true';
}

function normalizeColumnSettings(row?: Record<string, unknown> | null): AccessSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!row) return settings;

  for (const [key, column] of Object.entries(SETTING_COLUMNS)) {
    const defaultValue = DEFAULT_SETTINGS[key];
    const raw = row[column];
    if (raw == null) continue;
    if (typeof defaultValue === 'boolean') {
      settings[key] = toBooleanFlag(raw);
      continue;
    }

    const value = String(raw);
    settings[key] = value || defaultValue;
  }

  return settings;
}

function parseSettingsBody(body: unknown): AccessSettings {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const settings = { ...DEFAULT_SETTINGS };

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    const raw = data[key];
    settings[key] = typeof defaultValue === 'boolean'
      ? raw == null
        ? defaultValue
        : toBooleanFlag(raw)
      : raw == null
        ? defaultValue
        : String(raw);
  }

  return settings;
}

function validateSettings(settings: AccessSettings): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const field of NUMERIC_FIELDS) {
    const raw = String(settings[field.key] ?? '').trim();
    const required = field.isRequired(settings);
    if (!raw) {
      if (required) {
        fieldErrors[field.key] = `Please enter ${field.label}.`;
      }
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      fieldErrors[field.key] = `Please enter a valid number for ${field.label}.`;
      continue;
    }

    if (field.integer && !Number.isInteger(value)) {
      fieldErrors[field.key] = `Please enter a whole number for ${field.label}.`;
      continue;
    }

    if (field.min != null && value < field.min) {
      fieldErrors[field.key] = `${field.label} must be at least ${field.min}.`;
      continue;
    }

    if (field.max != null && value > field.max) {
      fieldErrors[field.key] = `${field.label} must be ${field.max} or less.`;
    }
  }

  for (const field of REQUIRED_CHOICE_FIELDS) {
    if (!field.isRequired(settings)) continue;
    const raw = String(settings[field.key] ?? '').trim();
    const hasValue = field.list ? listValues(raw).length > 0 : Boolean(raw);
    if (!hasValue) {
      fieldErrors[field.key] = field.list
        ? `Please select at least one ${field.label}.`
        : `Please select ${field.label}.`;
    }
  }

  return fieldErrors;
}

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );

  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((candidate) => existing.has(candidate)) ?? null;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName
  );

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function ensureAccessSettingsTable(): Promise<string> {
  const columnSql = Object.entries(COLUMN_DEFINITIONS)
    .map(([column, definition]) => `\`${column}\` ${definition}`)
    .join(',\n      ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ${columnSql},
      INDEX idx_club_access_settings_user_club (club_user_id, club_id),
      INDEX idx_club_access_settings_club_key (club_key)
    )
  `);

  const columns = await getTableColumns(TABLE_NAME);
  for (const [column, definition] of Object.entries(COLUMN_DEFINITIONS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  return TABLE_NAME;
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'users'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name
      FROM clubs_new
      WHERE id = ${requestedClubId}
        AND adminId = ${userId}
      LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

async function getAuthorizedContext(request: NextRequest) {
  const decoded = getTokenPayload(request);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubAccountUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);
  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));

  return { userId, legacyUserId, club, userIds };
}

async function fetchSettings(tableName: string, context: AuthorizedContext): Promise<Record<string, unknown> | null> {
  const columns = await getTableColumns(tableName);
  const selectColumns = Object.values(SETTING_COLUMNS)
    .filter((column) => columns.has(column))
    .map((column) => `\`${column}\``);

  if (selectColumns.length === 0 || !columns.has('club_user_id')) return null;

  const orderBy = columns.has('modified')
    ? 'modified DESC'
    : columns.has('created')
      ? 'created DESC'
      : 'id DESC';
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const clubKey = getClubKey(context.club?.id ?? null);

  if (columns.has('club_key')) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectColumns.join(', ')}
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
         AND club_key = ?
       ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
       LIMIT 1`,
      ...context.userIds,
      clubKey,
      context.legacyUserId ?? context.userId
    );
    if (rows[0]) return rows[0];
  }

  if (columns.has('club_id') && context.club?.id) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectColumns.join(', ')}
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
         AND club_id = ?
       ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
       LIMIT 1`,
      ...context.userIds,
      context.club.id,
      context.legacyUserId ?? context.userId
    );
    if (rows[0]) return rows[0];
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${selectColumns.join(', ')}
     FROM \`${tableName}\`
     WHERE club_user_id IN (${userPlaceholders})
     ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
     LIMIT 1`,
    ...context.userIds,
    context.legacyUserId ?? context.userId
  );

  return rows[0] ?? null;
}

function toColumnValue(key: string, value: string | boolean): string {
  const column = SETTING_COLUMNS[key];
  if (BOOLEAN_COLUMNS.has(column)) return value ? 'Y' : 'N';
  return String(value ?? '');
}

function buildColumnValues(settings: AccessSettings): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, column] of Object.entries(SETTING_COLUMNS)) {
    values[column] = toColumnValue(key, settings[key]);
  }
  return values;
}

async function findExistingSettingsId(
  tableName: string,
  columns: Set<string>,
  context: AuthorizedContext,
  clubId: string | null,
  clubKey: string
): Promise<string | number | bigint | null> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const orderBy = columns.has('modified')
    ? 'modified DESC'
    : columns.has('created')
      ? 'created DESC'
      : 'id DESC';

  if (columns.has('club_key')) {
    const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
      `SELECT id
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
         AND club_key = ?
       ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
       LIMIT 1`,
      ...context.userIds,
      clubKey,
      context.legacyUserId ?? context.userId
    );
    if (rows[0]) return rows[0].id;
  }

  if (columns.has('club_id') && clubId) {
    const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
      `SELECT id
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
         AND club_id = ?
       ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
       LIMIT 1`,
      ...context.userIds,
      clubId,
      context.legacyUserId ?? context.userId
    );
    if (rows[0]) return rows[0].id;
  }

  if (clubId && (columns.has('club_id') || columns.has('club_key'))) {
    const unscopedFilters = [
      columns.has('club_id') ? "(club_id IS NULL OR club_id = '')" : '',
      columns.has('club_key') ? "(club_key IS NULL OR club_key = '')" : ''
    ].filter(Boolean);

    if (unscopedFilters.length > 0) {
      const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
        `SELECT id
         FROM \`${tableName}\`
         WHERE club_user_id IN (${userPlaceholders})
           AND ${unscopedFilters.join(' AND ')}
         ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
         LIMIT 1`,
        ...context.userIds,
        context.legacyUserId ?? context.userId
      );
      if (rows[0]) return rows[0].id;
    }
  }

  const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE club_user_id IN (${userPlaceholders})
     ORDER BY CASE WHEN club_user_id = ? THEN 0 ELSE 1 END, ${orderBy}
     LIMIT 1`,
    ...context.userIds,
    context.legacyUserId ?? context.userId
  );

  return rows[0]?.id ?? null;
}

async function saveSettings(tableName: string, context: AuthorizedContext, settings: AccessSettings) {
  const columns = await getTableColumns(tableName);
  const values = buildColumnValues(settings);
  const clubId = context.club?.id ?? null;
  const clubKey = getClubKey(clubId);
  const storageUserId = context.legacyUserId ?? context.userId;
  const updateColumns = Object.keys(values).filter((column) => columns.has(column));
  const existingId = await findExistingSettingsId(tableName, columns, context, clubId, clubKey);

  if (existingId) {
    const assignments = [
      ...(columns.has('club_id') ? ['club_id = ?'] : []),
      ...(columns.has('club_key') ? ['club_key = ?'] : []),
      ...updateColumns.map((column) => `\`${column}\` = ?`),
      ...(columns.has('modified') ? ['modified = CURRENT_TIMESTAMP'] : [])
    ].join(', ');

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET ${assignments}
       WHERE id = ?`,
      ...(columns.has('club_id') ? [clubId] : []),
      ...(columns.has('club_key') ? [clubKey] : []),
      ...updateColumns.map((column) => values[column]),
      existingId
    );
    return;
  }

  const insertColumns = [
    ...(columns.has('club_user_id') ? ['club_user_id'] : []),
    ...(columns.has('club_id') ? ['club_id'] : []),
    ...(columns.has('club_key') ? ['club_key'] : []),
    ...updateColumns
  ];
  const insertValues = [
    ...(columns.has('club_user_id') ? [storageUserId] : []),
    ...(columns.has('club_id') ? [clubId] : []),
    ...(columns.has('club_key') ? [clubKey] : []),
    ...updateColumns.map((column) => values[column])
  ];
  const placeholders = insertColumns.map(() => '?').join(', ');

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\`
       (${insertColumns.map((column) => `\`${column}\``).join(', ')})
     VALUES (${placeholders})`,
    ...insertValues
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureAccessSettingsTable();
    const saved = await fetchSettings(tableName, context);

    return NextResponse.json({
      club: context.club,
      settings: normalizeColumnSettings(saved),
      source: saved ? 'database' : 'default'
    });
  } catch (error) {
    console.error('GET /api/club/settings/access-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json();
    const settings = parseSettingsBody(body);
    const fieldErrors = validateSettings(settings);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    const tableName = await ensureAccessSettingsTable();
    await saveSettings(tableName, context, settings);

    return NextResponse.json({
      success: true,
      club: context.club,
      settings
    });
  } catch (error) {
    console.error('PUT /api/club/settings/access-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

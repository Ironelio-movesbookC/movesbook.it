'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  CreditCard,
  Mail,
  Square,
  User,
  X,
} from 'lucide-react';
import { ALL_COUNTRIES } from '@/constants/countries.constants';
import { COUNTRIES_WITH_CODES } from '@/lib/news/countries';
import type { PcuPanelPayload } from '@/lib/admin/userPcuPanel';
import CKEditorComponent from '@/components/news/CKEditor';

const BASE_TABS = [
  { id: 'purchases', label: 'IPurchases' },
  { id: 'profile', label: 'Profile' },
  { id: 'admin', label: "Admin's settings" },
  { id: 'functions', label: 'Functions' },
  { id: 'alert', label: 'Alert msg' },
] as const;

const CLUB_EXTRA_TABS = [
  { id: 'idcards', label: 'ID Cards' },
  { id: 'cards', label: 'Cards Status' },
  { id: 'devices', label: 'Devices' },
  { id: 'posts', label: 'Delete posts' },
] as const;

type TopTabId = string;

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

function flagEmojiFromCode(code: string): string {
  const cc = (code || '').trim().toUpperCase();
  if (cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
}

function countryCodeFromName(name: string): string {
  if (!name.trim()) return '';
  return COUNTRIES_WITH_CODES.find((c) => c.name === name.trim())?.id ?? '';
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FILTER_VERSION_OPTIONS = [
  'All',
  'Trial Base',
  'Trial for club members',
  'User- base version',
  'User- premium',
  'User- professional',
  "Coach Base PFU pay for users",
  "Coach Base don't pay for users",
  'Coach Premium PFU',
  'Coach Premium',
  'Coach Professional PFU',
  'Coach Professional',
  'Team Base PFU pay for users',
  "Team Base don't pay for user",
  'Team Premium PFU',
  'Team Premium',
  'Team Professional PFU',
  'Team Professional',
  'Group Standard Version',
  'Club Base',
  'Club Premium',
  'Club Professional',
  'Club Trial',
] as const;

type OrderingOption = 'ordering' | 'by version' | 'by date start subscription' | 'by date end subscription';

type UserPcuControlPanelProps = {
  user: PcuPanelPayload;
  backHref: string;
  subscriptionRows?: {
    id: string;
    dateStart: string;
    dateEnd: string | null;
    version: string;
    username: string;
    companyName: string;
    e: string;
    status: string;
  }[];
};

export default function UserPcuControlPanel({
  user,
  backHref,
  subscriptionRows = [],
}: UserPcuControlPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TopTabId>('profile');
  const [profileSubTab, setProfileSubTab] = useState<'admin' | 'entity'>('admin');
  const [accessStart, setAccessStart] = useState(user.startDateIso);
  const [accessEnd, setAccessEnd] = useState(user.endDateIso);
  const [tagUser, setTagUser] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterVersion, setFilterVersion] = useState<string>('All');
  const [filterSubscription, setFilterSubscription] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('jan');
  const [filterYear, setFilterYear] = useState<string>('2010');
  const [ordering, setOrdering] = useState<OrderingOption>('ordering');
  const [adminTab, setAdminTab] = useState<'operator' | 'blocks' | 'vip'>('operator');
  const [adminLang, setAdminLang] = useState<'en' | 'fr' | 'de' | 'it' | 'es' | 'por' | 'rus' | 'ind' | 'chin' | 'arab'>('en');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaveError, setAdminSaveError] = useState('');
  const [adminSaveSuccess, setAdminSaveSuccess] = useState('');

  // Admin's settings - UI + editable draft (persisted on Save)
  const [extendEnabled, setExtendEnabled] = useState(true);
  const [extendMonths, setExtendMonths] = useState('12');
  const [asOperator, setAsOperator] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [asAgent, setAsAgent] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [enableFeedback, setEnableFeedback] = useState(false);
  const [enableBlogs, setEnableBlogs] = useState(false);
  const [blogsDate, setBlogsDate] = useState('');
  const [enableReviews, setEnableReviews] = useState(false);
  const [reviewsDate, setReviewsDate] = useState('');
  const [disableCommentsReviews, setDisableCommentsReviews] = useState(false);
  const [disableCommentsSuggestions, setDisableCommentsSuggestions] = useState(false);
  const [disableCommentsHtmlDocs, setDisableCommentsHtmlDocs] = useState(false);
  const [disableCommentsQueries, setDisableCommentsQueries] = useState(false);
  const [disableCommentsBugs, setDisableCommentsBugs] = useState(false);
  const [disableCommentsBlogs, setDisableCommentsBlogs] = useState(false);
  const [enableSponsors, setEnableSponsors] = useState(false);
  const [sponsorsLastPurchase, setSponsorsLastPurchase] = useState('');
  const [sponsorsExpiration, setSponsorsExpiration] = useState('');
  const [sponsorsCount, setSponsorsCount] = useState('10');
  const [sponsorsCost, setSponsorsCost] = useState('10');
  const [sponsorsPaymentStatus, setSponsorsPaymentStatus] = useState('not ok');

  // Blocks
  const [blockUserEnabled, setBlockUserEnabled] = useState(false);
  const [blockUserAfterDate, setBlockUserAfterDate] = useState('');
  const [blockSocialArea, setBlockSocialArea] = useState(false);
  const [blockTrainingArea, setBlockTrainingArea] = useState(false);
  const [blockManagementArea, setBlockManagementArea] = useState(false);
  const [blockAssignmentsEnabled, setBlockAssignmentsEnabled] = useState(false);
  const [blockAssignmentsAfterDate, setBlockAssignmentsAfterDate] = useState('');

  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertHtmlByLang, setAlertHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });

  // VIP
  const [vipShowInReferenceList, setVipShowInReferenceList] = useState(false);
  const [vipShowInBanner, setVipShowInBanner] = useState(false);
  const [vipUsername, setVipUsername] = useState('');
  const [vipYoutubeUrl, setVipYoutubeUrl] = useState('');
  const [vipReferencesHtmlByLang, setVipReferencesHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });
  const [vipPriorityLevel, setVipPriorityLevel] = useState('First');
  const [vipFavourite, setVipFavourite] = useState(false);
  const [profileReferencesHtml, setProfileReferencesHtml] = useState(user.referencesHtml || '');
  const [profileReferencesLevel, setProfileReferencesLevel] = useState(user.referencesLevel || '1');

  // Admin's settings (single user / athlete) - VIP Settings selections
  const [vipEnabled, setVipEnabled] = useState(false);
  const [vipTypes, setVipTypes] = useState<Record<string, boolean>>({
    all: false,
    vipUsers: false,
    vipsOfMySport: false,
    myClubsUsers: false,
    myTeamsUsers: false,
    athletes: false,
    coaches: false,
    teams: false,
    testimonials: false,
    populars: false,
    users: false,
    lastLogged: false,
    ourClubs: false,
  });
  const [vipVisibleToUserTypes, setVipVisibleToUserTypes] = useState<Record<string, boolean>>({
    all: false,
    athlete: false,
    coach: false,
    team: false,
    club: false,
    group: false,
    club_subadmin: false,
    club_operator: false,
  });
  const [vipLanguagesAllowed, setVipLanguagesAllowed] = useState<Record<string, boolean>>({
    all: false,
    English: false,
    French: false,
    Deutsch: false,
    Italiano: false,
    Spanish: false,
    Portuguese: false,
    Russian: false,
    Hindi: false,
    Chinese: false,
    Arabic: false,
  });
  const [vipCountriesAllowed, setVipCountriesAllowed] = useState<Record<string, boolean>>({
    all: false,
    Andorra: false,
    'United Arab Emirates': false,
    Afghanistan: false,
    'Antigua and Barbuda': false,
    Anguilla: false,
    Albania: false,
    Armenia: false,
    Angola: false,
    Antarctica: false,
  });
  const [vipDuration, setVipDuration] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  });
  const [vipAllowVisitorsProfile, setVipAllowVisitorsProfile] = useState(true);
  const [vipAllowVisitorsBiography, setVipAllowVisitorsBiography] = useState(true);
  const [vipAllowVisitorsFriendship, setVipAllowVisitorsFriendship] = useState(true);
  const [vipAllowVisitorsMail, setVipAllowVisitorsMail] = useState(true);

  const [vipBannerImageFileName, setVipBannerImageFileName] = useState('No file chosen');

  // Functions tab (club-focused UI)
  const [functionsLang, setFunctionsLang] = useState<
    'en' | 'fr' | 'de' | 'it' | 'es' | 'por' | 'rus' | 'ind' | 'chin' | 'arab'
  >('en');
  const [functionsSaving, setFunctionsSaving] = useState(false);
  const [functionsSaveError, setFunctionsSaveError] = useState('');
  const [functionsSaveSuccess, setFunctionsSaveSuccess] = useState('');

  const [maxMembers, setMaxMembers] = useState('1301');
  const [currentMembers, setCurrentMembers] = useState('5');
  const stillAvailable = useMemo(() => {
    const max = Number(maxMembers);
    const cur = Number(currentMembers);
    if (!Number.isFinite(max) || !Number.isFinite(cur)) return '—';
    return String(Math.max(0, max - cur));
  }, [currentMembers, maxMembers]);

  const [newLicenseRequests, setNewLicenseRequests] = useState('0');
  const [authorizationNo, setAuthorizationNo] = useState('1');
  const [priceEuro, setPriceEuro] = useState('6');
  const [costToPay, setCostToPay] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [maxDevicesCanEnable, setMaxDevicesCanEnable] = useState('25');
  const [currentDeviceEnabled, setCurrentDeviceEnabled] = useState('8');
  const [requestCodePending, setRequestCodePending] = useState('5');
  const [deviceDisable, setDeviceDisable] = useState('0');
  const [availableEnquiries, setAvailableEnquiries] = useState('12');
  const [subscriptionExpiration, setSubscriptionExpiration] = useState(user.endDateIso || '');
  const [blockCodeGeneration, setBlockCodeGeneration] = useState(false);

  const [postActivationMsgEnabled, setPostActivationMsgEnabled] = useState(true);
  const [postActivationDays, setPostActivationDays] = useState('1-30');
  const [postActivationHtmlByLang, setPostActivationHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });

  const [freeAccountsDurationDays, setFreeAccountsDurationDays] = useState('150');
  const [termsCreditCard, setTermsCreditCard] = useState(true);
  const [termsSendMoneyLater, setTermsSendMoneyLater] = useState(true);
  const [termsSendMoneyDays, setTermsSendMoneyDays] = useState('30');

  const [sharingCoaches, setSharingCoaches] = useState(true);
  const [sharingTeams, setSharingTeams] = useState(true);
  const [sharingGroups, setSharingGroups] = useState(true);
  const [sharingOtherClubs, setSharingOtherClubs] = useState(true);

  const [notifyAtExpiration, setNotifyAtExpiration] = useState(true);
  const [notifyBeforeDays, setNotifyBeforeDays] = useState('1');
  const [notifyAfterDays, setNotifyAfterDays] = useState('7');
  const [notifyEveryDay, setNotifyEveryDay] = useState(true);
  const [notifyByMail, setNotifyByMail] = useState(true);
  const [notifyOnNetworkPage, setNotifyOnNetworkPage] = useState(true);
  const [notifyCellular, setNotifyCellular] = useState(false);
  const [notifyPostFacebook, setNotifyPostFacebook] = useState(false);

  const [stockAccounts, setStockAccounts] = useState('select');
  const [stockVersion, setStockVersion] = useState('select');
  const [stockPrice, setStockPrice] = useState('');
  const [stockPayment, setStockPayment] = useState('select');

  const [procedureTab, setProcedureTab] = useState<'social' | 'training' | 'management'>('social');
  const [procedureRows, setProcedureRows] = useState<
    { id: string; label: string; status: 'enabled' | 'disabled' | 'optional_off' | 'optional_on'; on: boolean }[]
  >([
    { id: 'polls', label: 'Polls', status: 'optional_on', on: true },
    { id: 'blogs', label: 'Blogs', status: 'optional_on', on: true },
    { id: 'photo', label: 'Photo', status: 'disabled', on: false },
    { id: 'campaign', label: 'Campaign', status: 'disabled', on: false },
    { id: 'events', label: 'Events', status: 'optional_on', on: true },
    { id: 'qa', label: 'Question&Answer', status: 'optional_on', on: true },
    { id: 'employment', label: 'Employment', status: 'optional_on', on: true },
    { id: 'bacheca', label: 'Bacheca', status: 'optional_on', on: true },
    { id: 'message', label: 'Message', status: 'optional_on', on: true },
    { id: 'chat', label: 'Chat', status: 'disabled', on: false },
    { id: 'sharing', label: 'Sharing', status: 'optional_on', on: true },
    { id: 'comments', label: 'Comments', status: 'optional_on', on: true },
    { id: 'fanclubs', label: 'Fan Clubs', status: 'optional_on', on: true },
    { id: 'friends', label: 'Friends', status: 'optional_on', on: true },
    { id: 'classified', label: 'Classified', status: 'disabled', on: false },
    { id: 'education', label: 'Education', status: 'optional_on', on: true },
    { id: 'video', label: 'Video', status: 'optional_on', on: true },
    { id: 'music', label: 'Music', status: 'disabled', on: false },
    { id: 'otherMedia', label: 'Other Media', status: 'disabled', on: false },
    { id: 'favLinks', label: 'Favorite Links', status: 'optional_on', on: true },
    { id: 'forum', label: 'Forum', status: 'optional_on', on: true },
    { id: 'winks', label: 'Winks', status: 'optional_on', on: true },
    { id: 'sharingFriends', label: 'Sharing friends', status: 'disabled', on: false },
  ]);

  const [expireExtendEnabled, setExpireExtendEnabled] = useState(true);
  const [expireExtendDays, setExpireExtendDays] = useState('40');
  const [expireActual, setExpireActual] = useState(user.endSubscription || '31 Dec 2026');
  const [expireExtendedTo, setExpireExtendedTo] = useState('9 Feb 2027');

  const [sharingSharedUsersMode, setSharingSharedUsersMode] = useState<'stop' | 'view' | 'extend'>('view');
  const [socialItemsMode, setSocialItemsMode] = useState<'stop' | 'view' | 'extend'>('view');
  const [trainingItemsMode, setTrainingItemsMode] = useState<'stop' | 'view' | 'extend'>('view');
  const [endUsersInteractiveMode, setEndUsersInteractiveMode] = useState<'stop' | 'extend'>('extend');
  const [managementItemsMode, setManagementItemsMode] = useState<'stop' | 'extend'>('stop');
  const [insertOptionsManagementMode, setInsertOptionsManagementMode] = useState<'stop' | 'extend'>('stop');

  const [expirationMsgHtmlByLang, setExpirationMsgHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });

  const [newMembersExpiryMode, setNewMembersExpiryMode] = useState<'own' | 'after_end' | 'after_invite'>('after_invite');
  const [newMembersAfterDays, setNewMembersAfterDays] = useState('8');

  const [newVersionMode, setNewVersionMode] = useState<'same' | 'trial_to_base' | 'stay_current_subscription' | 'next_assigned' | 'professional'>(
    'next_assigned',
  );

  // ID Cards tab (club-focused UI)
  const [idCardsSaving, setIdCardsSaving] = useState(false);
  const [idCardsSaveError, setIdCardsSaveError] = useState('');
  const [idCardsSaveSuccess, setIdCardsSaveSuccess] = useState('');
  const [idCardsLang, setIdCardsLang] = useState<
    'en' | 'fr' | 'de' | 'it' | 'es' | 'por' | 'rus' | 'ind' | 'chin' | 'arab'
  >('en');

  const [idCardsCreditCard, setIdCardsCreditCard] = useState(true);
  const [idCardsSendMoneyLaterDays, setIdCardsSendMoneyLaterDays] = useState('60');

  const [idCardsMsgAfterExpeditionEnabled, setIdCardsMsgAfterExpeditionEnabled] = useState(true);
  const [idCardsMsgAfterExpeditionDays, setIdCardsMsgAfterExpeditionDays] = useState('3');
  const [idCardsMsgAfterExpeditionHtmlByLang, setIdCardsMsgAfterExpeditionHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });

  const [idCardsThirdPartyEnabled, setIdCardsThirdPartyEnabled] = useState(true);
  const [idCardsThirdPartyHtmlByLang, setIdCardsThirdPartyHtmlByLang] = useState<Record<string, string>>({
    en: '',
    fr: '',
    de: '',
    it: '',
    es: '',
    por: '',
    rus: '',
    ind: '',
    chin: '',
    arab: '',
  });

  const [idCardsEnabledTab, setIdCardsEnabledTab] = useState<'magnetic' | 'rfids' | 'qr' | 'smartcards'>('magnetic');
  const [idCardsFrom, setIdCardsFrom] = useState('');
  const [idCardsTo, setIdCardsTo] = useState('');
  const [idCardsBlockDate, setIdCardsBlockDate] = useState('');
  const [idCardsSendEmail, setIdCardsSendEmail] = useState(false);

  const [idCardsAllowMagnetic, setIdCardsAllowMagnetic] = useState(true);
  const [idCardsAllowRfid, setIdCardsAllowRfid] = useState(false);
  const [idCardsAllowSmartcard, setIdCardsAllowSmartcard] = useState(true);
  const [idCardsAllowQr, setIdCardsAllowQr] = useState(false);

  const [idCardsHistoryQuery, setIdCardsHistoryQuery] = useState('');
  const [idCardsHistoryInvoice, setIdCardsHistoryInvoice] = useState('');
  const [idCardsHistoryPage, setIdCardsHistoryPage] = useState(1);

  // Cards Status tab
  const [cardStatusRows, setCardStatusRows] = useState([
    {
      id: 'total',
      label: 'Total card purchased',
      checked: false,
      global: 933,
      blocked: 4,
      assigned: 130,
      free: 799,
      assPct: 16.27,
      highlightFree: false,
      highlightPct: false,
    },
    {
      id: 'magnetic',
      label: 'Total magnetic cards',
      checked: false,
      global: 530,
      blocked: 4,
      assigned: 119,
      free: 407,
      assPct: 29.24,
      highlightFree: true,
      highlightPct: true,
    },
    {
      id: 'rfid',
      label: 'Total Rfid cards',
      checked: false,
      global: 1,
      blocked: 0,
      assigned: 1,
      free: 0,
      assPct: 0,
      highlightFree: true,
      highlightPct: true,
    },
    {
      id: 'qrcode',
      label: 'QRcode',
      checked: false,
      global: 201,
      blocked: 0,
      assigned: 6,
      free: 195,
      assPct: 3.08,
      highlightFree: true,
      highlightPct: true,
    },
    {
      id: 'smartcards',
      label: 'Total smartcards',
      checked: false,
      global: 201,
      blocked: 0,
      assigned: 4,
      free: 197,
      assPct: 2.03,
      highlightFree: true,
      highlightPct: true,
    },
  ]);

  // Devices tab
  const [devicesTab, setDevicesTab] = useState<'enabled' | 'logins'>('enabled');
  const [devicesSummary, setDevicesSummary] = useState({
    maxEnabled: '25',
    costOverNumber: '1',
    costEuro: '6 € (USD 7.3)',
    currentEnabled: '8',
    disabled: '0',
    pending: '5',
    availableInquiries: '12',
    expirationDate: user.endDateIso || '2026-12-31',
  });
  const [enabledDevices, setEnabledDevices] = useState<
    { id: string; name: string; locationLine: string; expanded?: boolean }[]
  >([
    { id: 'zerosoft_device', name: 'zerosoft_device', locationLine: 'Lapland , Finland - 3 months ago' },
    { id: 'ZST_device', name: 'ZST_device', locationLine: 'Lapland , Finland - 3 months ago' },
    { id: 'VENI', name: 'VENI', locationLine: 'Lapland , Finland - 4 months ago' },
    { id: 'goopit', name: 'goopit', locationLine: 'Lapland , Finland - 4 months ago' },
    { id: 'goopit_org', name: 'goopit_org', locationLine: 'Lapland , Finland - 4 months ago' },
    { id: 'goopit_ams', name: 'goopit_ams', locationLine: 'Lapland , Finland - 4 months ago' },
    { id: 'Ironelio_device', name: 'Ironelio_device', locationLine: 'Lapland , Finland - 4 months ago' },
  ]);
  const [deviceLogFrom, setDeviceLogFrom] = useState('');
  const [deviceLogTo, setDeviceLogTo] = useState('');
  const [deviceLogs, setDeviceLogs] = useState<
    { id: string; username: string; logDate: string; logTime: string; selected?: boolean }[]
  >([
    { id: 'l1', username: 'zerosoft_device', logDate: '2022-03-10', logTime: '10:26 AM' },
    { id: 'l2', username: 'zerosoft_device', logDate: '2022-02-22', logTime: '7:55 AM' },
    { id: 'l3', username: 'zerosoft_device', logDate: '2022-02-22', logTime: '7:04 AM' },
  ]);

  // Delete posts tab
  const [deletePostsQuestion, setDeletePostsQuestion] = useState(true);
  const [deletePostsSuggestion, setDeletePostsSuggestion] = useState(false);
  const [deletePostsProblem, setDeletePostsProblem] = useState(false);
  const [deletePostsFrom, setDeletePostsFrom] = useState('');
  const [deletePostsTo, setDeletePostsTo] = useState('');
  const [deletePostsSaving, setDeletePostsSaving] = useState(false);
  const [deletePostsSaveError, setDeletePostsSaveError] = useState('');
  const [deletePostsSaveSuccess, setDeletePostsSaveSuccess] = useState('');

  const saveDeletePosts = async () => {
    setDeletePostsSaving(true);
    setDeletePostsSaveError('');
    setDeletePostsSaveSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin session not found. Please log in as admin.');
      const res = await fetch(`/api/admin/registered-users/${encodeURIComponent(user.userId)}/pcu-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deletePosts: {
            types: { question: deletePostsQuestion, suggestion: deletePostsSuggestion, problem: deletePostsProblem },
            from: deletePostsFrom,
            to: deletePostsTo,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save delete posts');
      setDeletePostsSaveSuccess('Saved');
    } catch (e: unknown) {
      setDeletePostsSaveError(e instanceof Error ? e.message : 'Failed to save delete posts');
    } finally {
      setDeletePostsSaving(false);
      window.setTimeout(() => setDeletePostsSaveSuccess(''), 2500);
    }
  };

  // Alert msg tab
  type AlertMsgLang = 'it' | 'en';
  const [alertMsgLang, setAlertMsgLang] = useState<AlertMsgLang>('en');
  const [alertMsgActivated, setAlertMsgActivated] = useState(false);
  const [alertMsgEnableFrom, setAlertMsgEnableFrom] = useState('');
  const [alertMsgEnableTo, setAlertMsgEnableTo] = useState('');
  const [alertMsgReadOn, setAlertMsgReadOn] = useState('Read on 13th November 2025');
  const [alertMsgShowLogin, setAlertMsgShowLogin] = useState(true);
  const [alertMsgShowLogout, setAlertMsgShowLogout] = useState(true);
  const [alertMsgHtmlByLang, setAlertMsgHtmlByLang] = useState<Record<AlertMsgLang, string>>({
    en: '',
    it: '',
  });
  const [alertMsgSaving, setAlertMsgSaving] = useState(false);
  const [alertMsgSaveError, setAlertMsgSaveError] = useState('');
  const [alertMsgSaveSuccess, setAlertMsgSaveSuccess] = useState('');

  const saveAlertMsg = async () => {
    setAlertMsgSaving(true);
    setAlertMsgSaveError('');
    setAlertMsgSaveSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin session not found. Please log in as admin.');
      const res = await fetch(`/api/admin/registered-users/${encodeURIComponent(user.userId)}/pcu-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          alertMsg: {
            activated: alertMsgActivated,
            enableFrom: alertMsgEnableFrom,
            enableTo: alertMsgEnableTo,
            showAt: { login: alertMsgShowLogin, logout: alertMsgShowLogout },
            htmlByLang: alertMsgHtmlByLang,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save alert message');
      setAlertMsgSaveSuccess('Saved');
    } catch (e: unknown) {
      setAlertMsgSaveError(e instanceof Error ? e.message : 'Failed to save alert message');
    } finally {
      setAlertMsgSaving(false);
      window.setTimeout(() => setAlertMsgSaveSuccess(''), 2500);
    }
  };

  const saveIdCardsSettings = async () => {
    setIdCardsSaving(true);
    setIdCardsSaveError('');
    setIdCardsSaveSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin session not found. Please log in as admin.');
      const res = await fetch(`/api/admin/registered-users/${encodeURIComponent(user.userId)}/pcu-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idCards: {
            terms: { creditCard: idCardsCreditCard, sendMoneyLaterDays: idCardsSendMoneyLaterDays },
            messages: {
              afterExpeditionNotPaid: {
                enabled: idCardsMsgAfterExpeditionEnabled,
                days: idCardsMsgAfterExpeditionDays,
                htmlByLang: idCardsMsgAfterExpeditionHtmlByLang,
              },
              thirdPartyPricelist: {
                enabled: idCardsThirdPartyEnabled,
                htmlByLang: idCardsThirdPartyHtmlByLang,
              },
            },
            cardsEnabled: {
              tab: idCardsEnabledTab,
              from: idCardsFrom,
              to: idCardsTo,
              blockDate: idCardsBlockDate,
              sendEmail: idCardsSendEmail,
              allow: {
                magnetic: idCardsAllowMagnetic,
                rfid: idCardsAllowRfid,
                smartcard: idCardsAllowSmartcard,
                qr: idCardsAllowQr,
              },
            },
            history: { query: idCardsHistoryQuery, invoice: idCardsHistoryInvoice, page: idCardsHistoryPage },
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save ID cards');
      setIdCardsSaveSuccess('Saved');
    } catch (e: unknown) {
      setIdCardsSaveError(e instanceof Error ? e.message : 'Failed to save ID cards');
    } finally {
      setIdCardsSaving(false);
      window.setTimeout(() => setIdCardsSaveSuccess(''), 2500);
    }
  };

  const saveFunctionsSettings = async () => {
    setFunctionsSaving(true);
    setFunctionsSaveError('');
    setFunctionsSaveSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin session not found. Please log in as admin.');
      const res = await fetch(`/api/admin/registered-users/${encodeURIComponent(user.userId)}/pcu-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          functions: {
            members: { maxMembers, currentMembers },
            licenses: {
              newLicenseRequests,
              authorizationNo,
              priceEuro,
              costToPay,
              amountPaid,
              maxDevicesCanEnable,
              currentDeviceEnabled,
              requestCodePending,
              deviceDisable,
              availableEnquiries,
              subscriptionExpiration,
              blockCodeGeneration,
            },
            messageAfterActivation: {
              enabled: postActivationMsgEnabled,
              daysRange: postActivationDays,
              htmlByLang: postActivationHtmlByLang,
            },
            freeAccounts: { durationDays: freeAccountsDurationDays },
            terms: {
              creditCard: termsCreditCard,
              sendMoneyLater: termsSendMoneyLater,
              sendMoneyLaterDays: termsSendMoneyDays,
            },
            sharing: { coaches: sharingCoaches, teams: sharingTeams, groups: sharingGroups, otherClubs: sharingOtherClubs },
            expirationNotify: {
              enabled: notifyAtExpiration,
              beforeDays: notifyBeforeDays,
              afterDays: notifyAfterDays,
              everyDay: notifyEveryDay,
              mail: notifyByMail,
              networkPage: notifyOnNetworkPage,
              cellular: notifyCellular,
              facebook: notifyPostFacebook,
            },
            stock: { accounts: stockAccounts, version: stockVersion, price: stockPrice, payment: stockPayment },
            procedure: { tab: procedureTab, rows: procedureRows },
            expirationFlow: {
              extend: { enabled: expireExtendEnabled, days: expireExtendDays, actual: expireActual, extendedTo: expireExtendedTo },
              modes: {
                sharingSharedUsersMode,
                socialItemsMode,
                trainingItemsMode,
                endUsersInteractiveMode,
                managementItemsMode,
                insertOptionsManagementMode,
              },
              messageHtmlByLang: expirationMsgHtmlByLang,
            },
            newMembers: { expiryMode: newMembersExpiryMode, afterDays: newMembersAfterDays },
            newVersion: { mode: newVersionMode },
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save functions');
      setFunctionsSaveSuccess('Saved');
    } catch (e: unknown) {
      setFunctionsSaveError(e instanceof Error ? e.message : 'Failed to save functions');
    } finally {
      setFunctionsSaving(false);
      window.setTimeout(() => setFunctionsSaveSuccess(''), 2500);
    }
  };

  const topTabs = useMemo(() => {
    // Requirements:
    // - single user/athlete: IPurchases, Profile, Admin's settings, Functions, Alert msg
    // - club: IPurchases, Profile, Admin's settings, Functions, ID Cards, Cards Status, Devices, Delete posts, Alert msg
    if (user.segment === 'clubs') {
      return [...BASE_TABS.slice(0, 4), ...CLUB_EXTRA_TABS, BASE_TABS[4]];
    }
    return BASE_TABS;
  }, [user.segment]);

  useEffect(() => {
    if (!topTabs.some((t) => t.id === activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, topTabs]);

  const countryCode = countryCodeFromName(user.country);
  const entityProfileLabel = `${user.roleTitle}_profile`;
  const isSingleUserProfile = user.segment === 'single-user';

  useEffect(() => {
    // initialize a few defaults based on the selected user
    setVipUsername(user.username || '');
    setProfileReferencesHtml(user.referencesHtml || '');
    setProfileReferencesLevel(user.referencesLevel || '1');
    setAdminSaveError('');
    setAdminSaveSuccess('');
  }, [user.username]);

  const saveAdminSettings = async () => {
    setAdminSaving(true);
    setAdminSaveError('');
    setAdminSaveSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Admin session not found. Please log in as admin.');
      const res = await fetch(`/api/admin/registered-users/${encodeURIComponent(user.userId)}/pcu-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          extend: { enabled: extendEnabled, months: extendMonths },
          assignment: { asOperator, operatorId, asAgent, agentId },
          publishing: {
            enableFeedback,
            enableBlogs,
            blogsDate,
            enableReviews,
            reviewsDate,
            disableComments: {
              reviews: disableCommentsReviews,
              suggestions: disableCommentsSuggestions,
              htmlDocsNews: disableCommentsHtmlDocs,
              queries: disableCommentsQueries,
              bugs: disableCommentsBugs,
              blogs: disableCommentsBlogs,
            },
          },
          sponsors: {
            enableSponsors,
            lastPurchase: sponsorsLastPurchase,
            expirationDate: sponsorsExpiration,
            numberEnabled: sponsorsCount,
            costLastPurchase: sponsorsCost,
            paymentStatus: sponsorsPaymentStatus,
          },
          blocks: {
            blockUserEnabled,
            blockUserAfterDate,
            blockAreas: { social: blockSocialArea, training: blockTrainingArea, management: blockManagementArea },
            blockAssignmentsEnabled,
            blockAssignmentsAfterDate,
          },
          alert: { enabled: alertEnabled, htmlByLang: alertHtmlByLang },
          vip: {
            showInReferenceList: vipShowInReferenceList,
            showInBanner: vipShowInBanner,
            username: vipUsername,
            youtubeUrl: vipYoutubeUrl,
            referencesHtmlByLang: vipReferencesHtmlByLang,
            priorityLevel: vipPriorityLevel,
            favourite: vipFavourite,
            enabled: vipEnabled,
            types: vipTypes,
            visibleToUserTypes: vipVisibleToUserTypes,
            languagesAllowed: vipLanguagesAllowed,
            countriesAllowed: vipCountriesAllowed,
            duration: vipDuration,
            allowVisitors: {
              profile: vipAllowVisitorsProfile,
              biography: vipAllowVisitorsBiography,
              friendship: vipAllowVisitorsFriendship,
              mail: vipAllowVisitorsMail,
            },
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save settings');
      setAdminSaveSuccess('Saved');
    } catch (e: unknown) {
      setAdminSaveError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setAdminSaving(false);
      window.setTimeout(() => setAdminSaveSuccess(''), 2500);
    }
  };

  const filteredRows = useMemo(() => {
    const parseIso = (s?: string | null) => {
      if (!s) return null;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const monthIndex = (() => {
      const m = (filterMonth || '').toLowerCase().slice(0, 3);
      const idx = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m);
      return idx >= 0 ? idx : null;
    })();
    const yearNum = Number(filterYear);
    const dateFloor =
      monthIndex != null && Number.isFinite(yearNum) ? new Date(yearNum, monthIndex, 1) : null;

    let rows = [...subscriptionRows];
    if (filterVersion && filterVersion !== 'All') {
      rows = rows.filter((r) => (r.version || '').toLowerCase().includes(filterVersion.toLowerCase()));
    }
    if (filterSubscription && filterSubscription !== 'All') {
      rows = rows.filter((r) => (r.version || '').toLowerCase().includes(filterSubscription.toLowerCase()));
    }
    if (dateFloor) {
      rows = rows.filter((r) => {
        const ds = parseIso(r.dateStart);
        return ds ? ds >= dateFloor : true;
      });
    }

    if (ordering === 'by version') {
      rows.sort((a, b) => (a.version || '').localeCompare(b.version || ''));
    } else if (ordering === 'by date start subscription') {
      rows.sort((a, b) => {
        const da = parseIso(a.dateStart)?.getTime() ?? 0;
        const db = parseIso(b.dateStart)?.getTime() ?? 0;
        return da - db;
      });
    } else if (ordering === 'by date end subscription') {
      rows.sort((a, b) => {
        const da = parseIso(a.dateEnd)?.getTime() ?? 0;
        const db = parseIso(b.dateEnd)?.getTime() ?? 0;
        return da - db;
      });
    }
    return rows;
  }, [filterMonth, filterSubscription, filterVersion, filterYear, ordering, subscriptionRows]);

  const historicalSubtitle = useMemo(() => {
    switch (user.segment) {
      case 'teams':
        return "Historical Team's subscriptions to the Network";
      case 'groups':
        return "Historical Group's subscriptions to the Network";
      case 'clubs':
        return "Historical Club's subscriptions to the Network";
      case 'coaches':
        return "Historical Coach's subscriptions to the Network";
      default:
        return "Historical User's subscriptions to the Network";
    }
  }, [user.segment]);

  const handleSendMail = () => {
    if (!user.email) return;
    window.location.href = `mailto:${encodeURIComponent(user.email)}`;
  };

  const handleOpenProfile = () => {
    if (user.dashboardPath) {
      window.open(user.dashboardPath, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAdminSettings = () => {
    // PCU Admin's settings is handled in-panel; keep routing for future deep-links if needed.
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-gray-200 border border-gray-300 rounded shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300">
          <div className="flex items-center gap-3">
            <button type="button" className="p-1.5 rounded hover:bg-gray-300" title="Menu">
              <span className="block w-5 h-0.5 bg-gray-700 mb-1" />
              <span className="block w-5 h-0.5 bg-gray-700 mb-1" />
              <span className="block w-5 h-0.5 bg-gray-700" />
            </button>
            <div className="text-sm font-semibold text-red-700">Panel control about the User</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-300"
              title="Close"
              onClick={() => router.push(backHref)}
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-4 py-3">
          <div className="w-16 h-16 bg-white border border-gray-400 flex items-center justify-center overflow-hidden shrink-0">
            {user.imageUrl ? (
              isDataUrl(user.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <Image
                  src={user.imageUrl}
                  alt={user.username}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              )
            ) : (
              <User className="w-7 h-7 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  <strong>Name :</strong> {user.fullname || '—'}
                </div>
                <div>
                  <strong>Age :</strong> {user.ageDisplay}
                </div>
                <div>
                  <strong>Type of User :</strong> {user.typeOfUser}
                </div>
                <div>
                  <strong>Sport :</strong> {user.sport || '—'}
                </div>
                <div>
                  <strong>State :</strong> {user.state || '—'}
                </div>
                <div>
                  <strong>Locality :</strong> {user.locality || user.cityClubTeam || '—'}
                </div>
                <div>
                  <strong>Country :</strong> {user.country || '—'}
                  {countryCode ? ` (${countryCode})` : ''}
                  {countryCode ? ` ${flagEmojiFromCode(countryCode)}` : ''}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <button
                type="button"
                onClick={handleSendMail}
                disabled={!user.email}
                className="px-4 py-2 bg-gray-700 text-white text-sm rounded disabled:opacity-50"
              >
                <Mail className="inline w-4 h-4 mr-2" />
                Send mail
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span>Start</span>
                <input
                  type="date"
                  value={accessStart}
                  onChange={(e) => setAccessStart(e.target.value)}
                  className="px-2 py-1 border border-gray-400 bg-white w-32 text-sm"
                />
                <CalendarDays className="w-5 h-5 text-gray-600" />
                <CreditCard className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>End</span>
                <input
                  type="date"
                  value={accessEnd}
                  onChange={(e) => setAccessEnd(e.target.value)}
                  className="px-2 py-1 border border-gray-400 bg-white w-32 text-sm text-red-600"
                />
                <CalendarDays className="w-5 h-5 text-gray-600" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Square className="w-4 h-4 text-gray-600" />
                <span className="text-red-600">Suspend access control</span>
              </label>
              <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                Exhaustion status
              </button>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <CheckSquare className="w-4 h-4 text-gray-600" />
                <span className="text-red-600">Suspend</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-0 border border-gray-300 border-t-0 bg-gray-300 mt-0">
        {topTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'admin') handleAdminSettings();
            }}
            className={`px-3 py-2 text-xs sm:text-sm font-medium border-r border-gray-400 last:border-r-0 ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'bg-gray-400 text-gray-900 hover:bg-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-300 border-t-0 shadow-sm">
        <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-800">
          {activeTab === 'profile'
            ? `Details of ${user.username}`
            : topTabs.find((t) => t.id === activeTab)?.label}
        </div>

        {activeTab === 'profile' ? (
          <div className="p-0">
            <div className="px-4 py-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="px-3 py-1.5 bg-black text-white text-sm rounded"
              >
                BACK
              </button>
              <button
                type="button"
                onClick={handleOpenProfile}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded"
              >
                Open user profile
              </button>
            </div>

            <div className="px-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProfileSubTab('admin')}
                  className={`px-4 py-2 text-sm font-semibold rounded-t ${
                    profileSubTab === 'admin' ? 'bg-black text-white' : 'bg-gray-400 text-gray-900'
                  }`}
                >
                  {isSingleUserProfile ? 'User Profile' : 'Admin Profile'}
                </button>
                {isSingleUserProfile ? null : (
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('entity')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t ${
                      profileSubTab === 'entity' ? 'bg-black text-white' : 'bg-gray-400 text-gray-900'
                    }`}
                  >
                    {entityProfileLabel}
                  </button>
                )}
              </div>
              <div className="border-b border-gray-300" />
            </div>

            <div className="px-4 py-4">
              <div className="bg-purple-700 text-white px-4 py-2 font-semibold flex items-center justify-between">
                <span>Members Profile</span>
                <span className="text-xs text-yellow-200">(only view)</span>
              </div>

              <div className="border border-gray-300 bg-white p-4">
                <p className="text-center text-red-600 text-sm font-semibold mb-3">* required fields</p>

                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center">
                      {user.imageUrl ? (
                        isDataUrl(user.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image
                            src={user.imageUrl}
                            alt=""
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        )
                      ) : (
                        <User className="w-10 h-10 text-gray-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 text-center">{user.username}</div>
                  </div>

                  <div className="space-y-2">
                      {profileSubTab === 'admin' || isSingleUserProfile ? (
                        <>
                          <ProfileField label="Username*" value={user.username} />
                          <ProfileField label="Name" value={user.firstName} />
                          <ProfileField label="Surname" value={user.surname} />
                          <ProfileField label="Email*" value={user.email} />
                          <ProfileField label="Password*" value="••••••••" muted />
                          <ProfileField label="Repeat*" value="••••••••" muted />
                          <SelectField label="Country" value={user.country || ''} options={ALL_COUNTRIES} />
                          <ProfileField label="Geographical" value={user.geographical || ''} mono />
                          <SplitField
                            label="City"
                            leftValue={user.city || user.locality}
                            rightLabel="Zip Code"
                            rightValue={user.zipCode}
                          />
                          <SplitField
                            label="Phone/cell"
                            leftValue={user.phoneCell}
                            rightLabel=""
                            rightValue={user.phoneCell2}
                          />
                          <ProfileField label="Gender*" value={user.gender || ''} />
                          <BirthdayField day={user.birthDay} month={user.birthMonth} year={user.birthYear} />
                          <ProfileField label="User Type*" value={user.typeOfUser} />
                          <ProfileField label="Occupation" value="" />
                          <ProfileField label="Skills" value="" />
                          <SplitField label="Employer" leftValue="" rightLabel="Heart zone" rightValue="" />
                          <SelectField label="Time zone" value="" options={['Europe/Rome']} />
                          <SelectField label="Unit of Measure" value="Metric" options={['Metric']} />
                          <ProfileField label="First day of the week" value="" />
                          <SelectField label="Language*" value="English" options={['English', 'French', 'Italian']} />
                          <ProfileField label="Theme" value="" />
                          <SelectField label="Privacy" value="Only Friend" options={['Only Friend', 'Public', 'Private']} />
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700">
                              Receive follow up notifications and mails
                            </label>
                            <input type="checkbox" disabled className="w-4 h-4" />
                          </div>
                          <div className="mt-6">
                            <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm font-semibold">
                              References
                            </div>
                            <div className="border border-gray-300 p-3 bg-white">
                              <CKEditorComponent
                                value={profileReferencesHtml}
                                onChange={(html) => setProfileReferencesHtml(html)}
                                minHeightPx={260}
                                placeholder=""
                              />
                              <div className="mt-3 grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700">References level</label>
                                <select
                                  value={profileReferencesLevel}
                                  onChange={(e) => setProfileReferencesLevel(e.target.value)}
                                  className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-24"
                                >
                                  {['1', '2', '3', '4', '5', '6'].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <ProfileField label="Username*" value={user.username} />
                          <ProfileField label="Name" value={user.firstName} />
                          <ProfileField label="Surname" value={user.surname} />
                          <ProfileField label="Email*" value={user.email} />
                          <ProfileField label="Password*" value="••••••••" muted />
                          <ProfileField label="Repeat*" value="••••••••" muted />
                          <SelectField label="Country" value={user.country || ''} options={ALL_COUNTRIES} />
                          <SplitField
                            label="City"
                            leftValue={user.city || user.locality}
                            rightLabel="Zip Code"
                            rightValue={user.zipCode}
                          />
                          <ProfileField label="Phone/cell" value={user.phoneCell} />
                          <ProfileField label="Gender*" value={user.gender || ''} />
                          <ProfileField label="User Type*" value={user.roleTitle} />
                          <ProfileField label="Occupation" value="" />

                          <div className="mt-6">
                            <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm font-semibold">
                              References
                            </div>
                            <div className="border border-gray-300 p-3 bg-white">
                              <CKEditorComponent
                                value={profileReferencesHtml}
                                onChange={(html) => setProfileReferencesHtml(html)}
                                minHeightPx={260}
                                placeholder=""
                              />
                              <div className="mt-3 grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700">References level</label>
                                <select
                                  value={profileReferencesLevel}
                                  onChange={(e) => setProfileReferencesLevel(e.target.value)}
                                  className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-24"
                                >
                                  {['1', '2', '3', '4', '5', '6'].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'purchases' ? (
          <div className="p-0">
            <div className="px-4 py-3">
              <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm font-semibold">
                Details of subscription - {user.roleTitle}
              </div>

              <div className="border border-gray-300 border-t-0 bg-white">
                <div className="bg-purple-700 text-white px-4 py-2 font-semibold">{historicalSubtitle}</div>

                <div className="bg-sky-100 px-4 py-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
                    <div>
                      <strong>Full Name:</strong> {user.fullname || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>Country:</strong> {user.country || '—'}
                      {countryCode ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-lg leading-none">{flagEmojiFromCode(countryCode)}</span>
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <strong>Username:</strong> {user.username || '—'}
                    </div>
                    <div>
                      <strong>Location:</strong> {user.locality || user.cityClubTeam || '—'}
                    </div>
                    <div>
                      <strong>Official {user.roleTitle}name:</strong> {user.entityName || '—'}
                    </div>
                    <div>
                      <strong>Sport</strong> {user.sport || '—'}
                    </div>
                  </div>
                </div>

                <div className="bg-sky-200 px-4 py-2 text-sm flex flex-wrap items-center gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tagUser}
                      onChange={(e) => setTagUser(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Tag the user</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={favourite}
                      onChange={(e) => setFavourite(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Put as favourite</span>
                  </label>
                  <div className="inline-flex items-center gap-2">
                    <span>Medium priority</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as typeof priority)}
                      className="px-2 py-1 border border-gray-400 bg-white text-sm"
                    >
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                    </select>
                  </div>
                </div>

                <div className="px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2 border-t border-gray-300">
                  <div className="flex flex-wrap items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((v) => !v)}
                      className="px-3 py-1 border border-gray-400 bg-gray-700 text-white text-sm rounded inline-flex items-center gap-2"
                    >
                      Filter
                      <span className="inline-block border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
                    </button>

                    {filterOpen ? (
                      <div className="absolute z-20 top-9 left-0 w-[280px] bg-[#efe7b3] border border-[#c9bd7a] shadow">
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-[90px_1fr] gap-2 items-center text-sm">
                            <div>Version</div>
                            <select
                              value={filterVersion}
                              onChange={(e) => setFilterVersion(e.target.value)}
                              className="px-2 py-1 border border-gray-400 bg-white"
                            >
                              {FILTER_VERSION_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-[90px_1fr] gap-2 items-center text-sm">
                            <div>Subscription</div>
                            <select
                              value={filterSubscription}
                              onChange={(e) => setFilterSubscription(e.target.value)}
                              className="px-2 py-1 border border-gray-400 bg-white"
                            >
                              {FILTER_VERSION_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-[90px_1fr] gap-2 items-center text-sm">
                            <div>Datarange</div>
                            <div className="flex gap-2">
                              <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="px-2 py-1 border border-gray-400 bg-white w-24"
                              >
                                {['select', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(
                                  (m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ),
                                )}
                              </select>
                              <input
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="px-2 py-1 border border-gray-400 bg-white w-20"
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex justify-between">
                            <button
                              type="button"
                              onClick={() => setFilterOpen(false)}
                              className="px-4 py-1.5 border border-gray-400 bg-gray-200 text-sm"
                            >
                              Exit
                            </button>
                            <button
                              type="button"
                              onClick={() => setFilterOpen(false)}
                              className="px-4 py-1.5 border border-gray-400 bg-gray-200 text-sm"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <select
                      value={ordering}
                      onChange={(e) => setOrdering(e.target.value as OrderingOption)}
                      className="px-2 py-1 border border-gray-400 bg-white text-sm"
                    >
                      <option value="ordering">ordering</option>
                      <option value="by version">by version</option>
                      <option value="by date start subscription">by date start subscription</option>
                      <option value="by date end subscription">by date end subscription</option>
                    </select>
                    <button
                      type="button"
                      className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded"
                    >
                      Proceed
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <button type="button" className="hover:underline">
                      Print
                    </button>
                    <button type="button" className="hover:underline">
                      Send Msg
                    </button>
                    <button type="button" onClick={handleSendMail} className="hover:underline">
                      Send mail
                    </button>
                    <button type="button" className="hover:underline text-red-700">
                      Delete account
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-700 text-white">
                        <tr>
                          <th className="px-2 py-2 text-left w-8">
                            <input type="checkbox" disabled className="w-4 h-4" />
                          </th>
                          <th className="px-2 py-2 text-left">Full Name</th>
                          <th className="px-2 py-2 text-left">User Name</th>
                          <th className="px-2 py-2 text-left">Type</th>
                          <th className="px-2 py-2 text-left">Version</th>
                          <th className="px-2 py-2 text-left">Date Start</th>
                          <th className="px-2 py-2 text-left">Date End</th>
                          <th className="px-2 py-2 text-left">Logs</th>
                          <th className="px-2 py-2 text-left">E</th>
                          <th className="px-2 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length > 0 ? (
                          filteredRows.map((r) => (
                            <tr key={r.id} className="odd:bg-white even:bg-gray-50 border-b border-gray-200">
                              <td className="px-2 py-2">
                                <input type="checkbox" disabled className="w-4 h-4" />
                              </td>
                              <td className="px-2 py-2">{user.fullname || '—'}</td>
                              <td className="px-2 py-2">{r.username || user.username}</td>
                              <td className="px-2 py-2">{user.roleTitle}</td>
                              <td className="px-2 py-2">{r.version}</td>
                              <td className="px-2 py-2">{r.dateStart}</td>
                              <td className="px-2 py-2">{r.dateEnd ?? '—'}</td>
                              <td className="px-2 py-2">{String(user.logs ?? 0)}</td>
                              <td className="px-2 py-2">{r.e}</td>
                              <td className="px-2 py-2">{r.status}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-2 py-6 text-center text-gray-500" colSpan={10}>
                              No purchases found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'admin' ? (
          <div className="p-0">
            <div className="px-4 py-3">
              <div className="border border-gray-300 bg-white">
                <div className="bg-[#c7c2e9] border-b border-gray-300 px-4 py-2 font-semibold text-sm flex items-center justify-between">
                  <span>Operator Settings</span>
                  <span className="text-xs text-red-700">(only s-admin and co-admins can use this function)</span>
                </div>

                <div className="px-4 py-3">
                  <div className="flex gap-4 items-start">
                    <div className="w-16 h-16 bg-white border border-gray-400 flex items-center justify-center overflow-hidden shrink-0">
                      {user.imageUrl ? (
                        isDataUrl(user.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.imageUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <Image
                            src={user.imageUrl}
                            alt={user.username}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        )
                      ) : (
                        <User className="w-7 h-7 text-gray-500" />
                      )}
                    </div>

                    <div className="text-sm">
                      <div className="font-semibold">{user.fullname}</div>
                      <div>{user.country || '—'}</div>
                      <button
                        type="button"
                        onClick={handleSendMail}
                        className="mt-2 px-3 py-1.5 bg-gray-700 text-white text-sm rounded"
                      >
                        Send mail
                      </button>
                    </div>
                  </div>
                </div>

                {isSingleUserProfile ? (
                  <>
                    <div className="bg-slate-700 text-yellow-300 font-semibold px-4 py-2">Other settings</div>
                    <div className="px-4 py-3 text-xs text-gray-700 text-center">
                      S-admin, co-admins and operators can modify these settings regards the current user:
                    </div>

                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-[56px_1fr] gap-4 items-start">
                        <div className="pt-2">
                          <div className="w-14 h-14 bg-gray-100 border border-gray-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-gray-200 p-4">
                            <div className="font-semibold text-sm mb-2">
                              Put this user as customer of this operator
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={asOperator}
                                  onChange={(e) => setAsOperator(e.target.checked)}
                                />
                                As Operator
                              </label>
                              <select
                                value={operatorId}
                                onChange={(e) => setOperatorId(e.target.value)}
                                className="px-2 py-1 border border-gray-300 bg-white flex-1"
                              >
                                <option value="">List of operator</option>
                              </select>
                              <button type="button" className="w-9 h-9 border border-gray-300 bg-gray-50">
                                👥
                              </button>
                            </div>
                          </div>

                          <div className="border border-gray-200 p-4">
                            <div className="font-semibold text-sm mb-2">
                              Put this user as customer of this agent/sub-agent
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={asAgent}
                                  onChange={(e) => setAsAgent(e.target.checked)}
                                />
                                As Agent
                              </label>
                              <select
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
                                className="px-2 py-1 border border-gray-300 bg-white flex-1"
                              >
                                <option value="">List of agents/sub-</option>
                              </select>
                              <button type="button" className="w-9 h-9 border border-gray-300 bg-gray-50">
                                👥
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-[56px_1fr] gap-3 items-center">
                            <div className="w-14 h-14 bg-gray-100 border border-gray-200" />
                            <div className="border border-gray-200 p-4">
                              <div className="font-semibold text-sm">Enable user to publish feedback</div>
                              <label className="mt-2 inline-flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={enableFeedback}
                                  onChange={(e) => setEnableFeedback(e.target.checked)}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-[56px_1fr] gap-3 items-center">
                            <div className="w-14 h-14 bg-gray-100 border border-gray-200" />
                            <div className="border border-gray-200 p-4">
                              <div className="font-semibold text-sm">Enable user to publish blogs</div>
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={enableBlogs}
                                  onChange={(e) => setEnableBlogs(e.target.checked)}
                                />
                                <input
                                  type="date"
                                  value={blogsDate}
                                  onChange={(e) => setBlogsDate(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-[56px_1fr] gap-3 items-center">
                            <div className="w-14 h-14 bg-gray-100 border border-gray-200" />
                            <div className="border border-gray-200 p-4">
                              <div className="font-semibold text-sm">Enable user to publish reviews</div>
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={enableReviews}
                                  onChange={(e) => setEnableReviews(e.target.checked)}
                                />
                                <input
                                  type="date"
                                  value={reviewsDate}
                                  onChange={(e) => setReviewsDate(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 flex-1"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 p-4">
                            <div className="font-semibold text-sm">Disable permission to leave comments</div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsReviews}
                                  onChange={(e) => setDisableCommentsReviews(e.target.checked)}
                                />
                                Reviews
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsSuggestions}
                                  onChange={(e) => setDisableCommentsSuggestions(e.target.checked)}
                                />
                                Suggestions
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsHtmlDocs}
                                  onChange={(e) => setDisableCommentsHtmlDocs(e.target.checked)}
                                />
                                Html docs &amp; News
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsQueries}
                                  onChange={(e) => setDisableCommentsQueries(e.target.checked)}
                                />
                                Queries
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsBugs}
                                  onChange={(e) => setDisableCommentsBugs(e.target.checked)}
                                />
                                Bugs
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={disableCommentsBlogs}
                                  onChange={(e) => setDisableCommentsBlogs(e.target.checked)}
                                />
                                Blogs
                              </label>
                            </div>
                          </div>

                          <div className="border border-gray-200 p-4">
                            <div className="font-semibold text-sm">Categories of News followed by the user</div>
                            <select className="mt-2 px-3 py-2 border border-gray-300 bg-white w-full" disabled>
                              <option>Select an option</option>
                            </select>
                          </div>

                          <div className="border border-gray-200 p-4">
                            <div className="font-semibold text-sm mb-2">Enable Sponsors</div>
                            <label className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={enableSponsors}
                                onChange={(e) => setEnableSponsors(e.target.checked)}
                              />
                              Enable Sponsors
                            </label>
                            <div className="mt-2 space-y-2 text-sm">
                              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                                <span>Date last purchase</span>
                                <input
                                  value={sponsorsLastPurchase}
                                  onChange={(e) => setSponsorsLastPurchase(e.target.value)}
                                  className="px-2 py-1 border border-gray-300"
                                  placeholder="0000-00-00"
                                />
                              </div>
                              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                                <span>Expiration Date</span>
                                <input
                                  value={sponsorsExpiration}
                                  onChange={(e) => setSponsorsExpiration(e.target.value)}
                                  className="px-2 py-1 border border-gray-300"
                                  placeholder="0000-00-00"
                                />
                              </div>
                              <div className="grid grid-cols-[160px_1fr] gap-2 items-center">
                                <span>Number of Sponsors Enabled</span>
                                <input
                                  value={sponsorsCount}
                                  onChange={(e) => setSponsorsCount(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 w-20"
                                />
                              </div>
                              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                                <span>Cost last purchase</span>
                                <input
                                  value={sponsorsCost}
                                  onChange={(e) => setSponsorsCost(e.target.value)}
                                  className="px-2 py-1 border border-gray-300 w-20"
                                />
                              </div>
                              <div className="grid grid-cols-[160px_1fr] gap-2 items-center">
                                <span>Status of payments not ok</span>
                                <button type="button" className="px-3 py-1 bg-black text-white rounded w-fit">
                                  Payment
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-[56px_1fr] gap-3 items-center">
                            <div className="w-14 h-14 bg-gray-100 border border-gray-200" />
                            <div className="border border-gray-200 p-4">
                              <div className="font-semibold text-sm">Enable user to add comments</div>
                              <label className="mt-2 inline-flex items-center gap-2 text-sm">
                                <input type="checkbox" />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border border-gray-300">
                        <div className="bg-[#eeeaf8] px-4 py-2 font-semibold text-sm flex items-center justify-center gap-3">
                          <span className="w-8 h-8 inline-flex items-center justify-center bg-white border border-gray-300 rounded">🚫</span>
                          <span>Manage the blocks</span>
                        </div>
                        <div className="bg-yellow-100 px-4 py-3 text-sm flex items-center gap-4">
                          <ToggleNY value={blockUserEnabled} onChange={setBlockUserEnabled} />
                          <div className="font-semibold">Block this user</div>
                          <div className="text-xs">After this date</div>
                          <div className="flex items-center gap-2">
                            <input
                              value={blockUserAfterDate}
                              onChange={(e) => setBlockUserAfterDate(e.target.value)}
                              className="px-2 py-1 border border-gray-300"
                              placeholder="0000-00-00"
                            />
                            <span className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center">
                              📅
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border border-gray-300">
                        <div className="bg-slate-700 text-yellow-300 font-semibold px-4 py-2">VIP Settings</div>
                        <div className="p-4 bg-white">
                          <div className="flex items-center gap-4 text-sm mb-4">
                            <ToggleNY value={vipEnabled} onChange={setVipEnabled} />
                            <div className="font-semibold">VIP Settings</div>
                          </div>

                          <div className="text-sm text-center text-gray-600 mb-2">-put the user in this sections of the VIP banner</div>
                          <div className="flex justify-center mb-6">
                            <div className="border border-gray-300 p-4 w-full max-w-sm text-sm">
                              {[
                                ['all', 'select all vip type'],
                                ['vipUsers', 'VIP users'],
                                ['vipsOfMySport', "VIP's of My sport"],
                                ['myClubsUsers', 'My Clubs users'],
                                ['myTeamsUsers', 'My Teams users'],
                                ['athletes', 'Athletes'],
                                ['coaches', 'Coaches'],
                                ['teams', 'Teams'],
                                ['testimonials', 'Testimonials'],
                                ['populars', 'Populars'],
                                ['users', 'Users'],
                                ['lastLogged', 'Last logged'],
                                ['ourClubs', 'Our Clubs'],
                              ].map(([k, label]) => (
                                <label key={k} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!vipTypes[k]}
                                    onChange={(e) => setVipTypes((p) => ({ ...p, [k]: e.target.checked }))}
                                  />
                                  <span className={k === 'all' ? 'font-semibold' : ''}>{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start">
                            <div className="text-sm text-gray-700 pt-2">-Who can see him?</div>
                            <div className="border border-gray-300 p-4 w-full max-w-sm text-sm">
                              <div className="mb-2 text-center text-gray-700">Type of user</div>
                              {[
                                ['all', 'select all user type'],
                                ['athlete', 'Athlete'],
                                ['coach', 'Coach'],
                                ['team', 'Team'],
                                ['club', 'Club'],
                                ['group', 'Group'],
                                ['club_subadmin', 'Club_subadmin'],
                                ['club_operator', 'Club_operator'],
                              ].map(([k, label]) => (
                                <label key={k} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!vipVisibleToUserTypes[k]}
                                    onChange={(e) =>
                                      setVipVisibleToUserTypes((p) => ({ ...p, [k]: e.target.checked }))
                                    }
                                  />
                                  <span className={k === 'all' ? 'font-semibold' : ''}>{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start mt-6">
                            <div className="text-sm text-gray-700 pt-2">Language</div>
                            <div className="border border-gray-300 p-4 w-full max-w-sm text-sm">
                              {Object.keys(vipLanguagesAllowed).map((k) => (
                                <label key={k} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!vipLanguagesAllowed[k]}
                                    onChange={(e) => setVipLanguagesAllowed((p) => ({ ...p, [k]: e.target.checked }))}
                                  />
                                  <span className={k === 'all' ? 'font-semibold' : ''}>
                                    {k === 'all' ? 'select all languages' : k}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start mt-6">
                            <div className="text-sm text-gray-700 pt-2">Countries</div>
                            <div className="border border-gray-300 p-4 w-full max-w-sm text-sm max-h-48 overflow-auto">
                              {Object.keys(vipCountriesAllowed).map((k) => (
                                <label key={k} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!vipCountriesAllowed[k]}
                                    onChange={(e) => setVipCountriesAllowed((p) => ({ ...p, [k]: e.target.checked }))}
                                  />
                                  <span className={k === 'all' ? 'font-semibold' : ''}>
                                    {k === 'all' ? 'select all countries' : k}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-center mt-4">
                            <div className="text-sm text-gray-700">Duration</div>
                            <input
                              value={vipDuration}
                              onChange={(e) => setVipDuration(e.target.value)}
                              className="px-3 py-2 border border-gray-300 max-w-sm"
                            />
                          </div>

                          <div className="text-center text-sm mt-6">
                            What data of the VIP the user can see?
                            <div className="text-xs text-red-700">(only s-admin and co-admins can use this function)</div>
                          </div>

                          <div className="mt-4 space-y-3 text-sm max-w-xl mx-auto">
                            <div className="flex items-center gap-4">
                              <ToggleNY value={vipAllowVisitorsProfile} onChange={setVipAllowVisitorsProfile} />
                              <span>Allow to my visitors to accede to my profile</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <ToggleNY value={vipAllowVisitorsBiography} onChange={setVipAllowVisitorsBiography} />
                              <span>Allow to my visitors to open my biography</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <ToggleNY value={vipAllowVisitorsFriendship} onChange={setVipAllowVisitorsFriendship} />
                              <span>Allow to my visitors to the friendship</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <ToggleNY value={vipAllowVisitorsMail} onChange={setVipAllowVisitorsMail} />
                              <span>Allow to my visitors to mail me</span>
                            </div>
                          </div>

                          <div className="mt-8 border border-gray-300">
                            <div className="bg-slate-600 text-white px-3 py-2 font-semibold text-sm">
                              Banner and header for the reference list of user
                            </div>
                            <div className="p-3 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={vipShowInReferenceList}
                                    onChange={(e) => setVipShowInReferenceList(e.target.checked)}
                                  />
                                  Enable to display in the reference list of users
                                </label>
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={vipShowInBanner}
                                    onChange={(e) => setVipShowInBanner(e.target.checked)}
                                  />
                                  Enable to display in the banner at main page
                                </label>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={!!vipUsername} readOnly />
                                  <input
                                    value={vipUsername}
                                    onChange={(e) => setVipUsername(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 flex-1"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={!!vipYoutubeUrl} readOnly />
                                  <input
                                    value={vipYoutubeUrl}
                                    onChange={(e) => setVipYoutubeUrl(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 flex-1"
                                  />
                                </div>
                              </div>

                              <div className="mt-3 bg-gray-100 border border-gray-200 h-44 flex items-center justify-center text-4xl font-semibold text-gray-400">
                                NO<br/>IMAGE<br/>AVAILABLE
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                <label className="px-3 py-1.5 bg-gray-100 border border-gray-300 cursor-pointer">
                                  Choose File
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) =>
                                      setVipBannerImageFileName(e.target.files?.[0]?.name || 'No file chosen')
                                    }
                                  />
                                </label>
                                <span className="text-xs text-gray-600">{vipBannerImageFileName}</span>
                                <button type="button" className="px-4 py-1.5 bg-gray-200 border border-gray-400">
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6">
                            <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm font-semibold">
                              References
                            </div>
                            <div className="border border-gray-300 p-3 bg-white">
                              <div className="flex flex-wrap gap-3 text-sm mb-2">
                                {(['en', 'fr', 'de', 'it', 'es', 'por', 'rus', 'ind', 'chin', 'arab'] as const).map((l) => (
                                  <button
                                    key={l}
                                    type="button"
                                    onClick={() => setAdminLang(l)}
                                    className={`px-2 py-1 border ${adminLang === l ? 'border-red-600 text-red-700' : 'border-transparent'} `}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                              <CKEditorComponent
                                value={vipReferencesHtmlByLang[adminLang] || ''}
                                onChange={(html) => setVipReferencesHtmlByLang((prev) => ({ ...prev, [adminLang]: html }))}
                                minHeightPx={260}
                                placeholder=""
                              />
                              <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Priority Level :</span>
                                  <select
                                    value={vipPriorityLevel}
                                    onChange={(e) => setVipPriorityLevel(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 bg-white"
                                  >
                                    {['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'].map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={vipFavourite}
                                    onChange={(e) => setVipFavourite(e.target.checked)}
                                  />
                                  Favourite VIP
                                </label>
                              </div>

                              <div className="mt-6 flex items-center justify-center gap-4">
                                <button
                                  type="button"
                                  onClick={saveAdminSettings}
                                  disabled={adminSaving}
                                  className="px-6 py-2 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                                >
                                  {adminSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminSaveError('');
                                    setAdminSaveSuccess('');
                                  }}
                                  className="px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded"
                                >
                                  Cancel
                                </button>
                              </div>

                              {adminSaveError ? (
                                <div className="mt-3 text-sm text-center text-red-700">{adminSaveError}</div>
                              ) : null}
                              {adminSaveSuccess ? (
                                <div className="mt-3 text-sm text-center text-green-700">{adminSaveSuccess}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-4 pb-4">{/* existing club admin settings kept below */}</div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'functions' ? (
          <div className="p-0">
            <div className="px-4 py-3">
              <div className="border border-gray-300 bg-white">
                <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-gray-100 border-b border-gray-300 text-sm">
                  <div className="text-xs">Maximum number of Members</div>
                  <input
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="px-2 py-1 border border-gray-300 w-20 text-center text-red-700 font-semibold"
                  />
                  <div className="text-xs">Current Members</div>
                  <input
                    value={currentMembers}
                    onChange={(e) => setCurrentMembers(e.target.value)}
                    className="px-2 py-1 border border-gray-300 w-16 text-center text-red-700 font-semibold"
                  />
                  <div className="text-xs">Still Available</div>
                  <div className="px-2 py-1 bg-green-500 text-white font-semibold rounded w-16 text-center">
                    {stillAvailable}
                  </div>
                  <button
                    type="button"
                    onClick={saveFunctionsSettings}
                    disabled={functionsSaving}
                    className="ml-auto px-4 py-1.5 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                  >
                    {functionsSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>

                <div className="bg-slate-700 text-white font-semibold px-4 py-2 text-sm">
                  Permission for management section
                </div>

                <div className="px-4 py-3">
                  <div className="text-sm font-semibold mb-2">New requests of licenses:</div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                    <div className="space-y-2 text-sm">
                      <LabeledInput label="New requests of licenses:" value={newLicenseRequests} onChange={setNewLicenseRequests} />
                      <LabeledInput label="To pay over the authorisation no:" value={authorizationNo} onChange={setAuthorizationNo} />
                      <LabeledInput label="Price in euro :" value={priceEuro} onChange={setPriceEuro} />
                      <LabeledInput label="Cost to pay:" value={costToPay} onChange={setCostToPay} />
                      <div className="grid grid-cols-[260px_1fr_60px] items-center gap-2">
                        <label className="text-sm">Amount paid:</label>
                        <input
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-28"
                        />
                        <button type="button" className="px-3 py-1 bg-black text-white rounded">
                          Pay
                        </button>
                      </div>
                      <div className="grid grid-cols-[260px_1fr_60px] items-center gap-2">
                        <label className="text-sm">Max devices that can enable:</label>
                        <input
                          value={maxDevicesCanEnable}
                          onChange={(e) => setMaxDevicesCanEnable(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-28"
                        />
                        <button type="button" className="px-3 py-1 bg-gray-200 border border-gray-300 rounded">
                          Edit
                        </button>
                      </div>
                      <LabeledInput label="Current device enable:" value={currentDeviceEnabled} onChange={setCurrentDeviceEnabled} />
                      <LabeledInput label="Request of code in pending:" value={requestCodePending} onChange={setRequestCodePending} />
                      <LabeledInput label="Device disable:" value={deviceDisable} onChange={setDeviceDisable} />
                      <LabeledInput label="Avilable enquiries:" value={availableEnquiries} onChange={setAvailableEnquiries} />
                      <div className="grid grid-cols-[260px_1fr] items-center gap-2">
                        <label className="text-sm">
                          Date of expiration of the subscription to Movesbook and related licenses:
                        </label>
                        <input
                          type="date"
                          value={subscriptionExpiration}
                          onChange={(e) => setSubscriptionExpiration(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-40"
                        />
                      </div>
                      <div className="grid grid-cols-[260px_1fr] items-center gap-2">
                        <label className="text-sm">Block code generation</label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={blockCodeGeneration}
                            onChange={(e) => setBlockCodeGeneration(e.target.checked)}
                          />
                          <span className="text-xs text-gray-600">Enabled</span>
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 p-3 text-sm">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{user.roleTitle}</span>
                        <button type="button" className="px-3 py-1 bg-red-700 text-white rounded">
                          Upgrade Version
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-700">
                        Actual Subscription <span className="text-red-700">{user.version}</span> expiration date{' '}
                        <span className="text-red-700">{user.endSubscription || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-red-900 text-white font-semibold px-4 py-2 text-sm">
                    Message to be displayed after the activation of the accounts but not payed
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={postActivationMsgEnabled}
                          onChange={(e) => setPostActivationMsgEnabled(e.target.checked)}
                        />
                        Enable message
                      </label>
                      <div className="flex items-center gap-2">
                        <span>Days after the assignments of the accounts</span>
                        <select
                          value={postActivationDays}
                          onChange={(e) => setPostActivationDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 bg-white"
                        >
                          {['1-30', '1-90', '1-180'].map((r) => (
                            <option key={r} value={r}>
                              ({r})
                            </option>
                          ))}
                        </select>
                        <span>days</span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="text-xs text-gray-700 mb-1">Edit for each language</div>
                      <div className="flex flex-wrap gap-3 text-sm mb-2">
                        {(['en', 'fr', 'de', 'it', 'es', 'por', 'rus', 'ind', 'chin', 'arab'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setFunctionsLang(l)}
                            className={`px-2 py-1 border ${
                              functionsLang === l ? 'border-red-600 text-red-700' : 'border-transparent'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <CKEditorComponent
                        value={postActivationHtmlByLang[functionsLang] || ''}
                        onChange={(html) =>
                          setPostActivationHtmlByLang((prev) => ({ ...prev, [functionsLang]: html }))
                        }
                        minHeightPx={220}
                        placeholder=""
                      />
                      <div className="mt-2">
                        <button type="button" className="px-4 py-1.5 bg-red-600 text-white font-semibold rounded">
                          Update Terms
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-green-700 text-white font-semibold px-4 py-2 text-sm">
                    Free accounts for clubs member for actual version = {user.version}
                  </div>
                  <div className="px-4 py-3 overflow-x-auto">
                    <table className="min-w-[640px] text-sm border border-gray-300">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border border-gray-300 px-2 py-2 text-left w-56"> </th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Trial</th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Base</th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Premium</th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Pro</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Athletes that can be loaded freely
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">-1</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">20</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">10</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">5</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Free accounts assigned
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">-1</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">100</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">4</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">0</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Remaining free accounts
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">-1</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">-80</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">6</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">5</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Days duration of the subscription
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">
                            <input
                              value={freeAccountsDurationDays}
                              onChange={(e) => setFreeAccountsDurationDays(e.target.value)}
                              className="px-2 py-1 border border-gray-300 w-16 text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{freeAccountsDurationDays}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{freeAccountsDurationDays}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">{freeAccountsDurationDays}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-yellow-400 px-4 py-2 font-semibold text-sm">
                    Terms of payment for the stock of Accounts
                  </div>
                  <div className="px-4 py-3 text-sm space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span>Credit card</span>
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" checked={termsCreditCard} onChange={() => setTermsCreditCard(true)} />
                          Y
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" checked={!termsCreditCard} onChange={() => setTermsCreditCard(false)} />
                          N
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Send money later and before of</span>
                        <input
                          value={termsSendMoneyDays}
                          onChange={(e) => setTermsSendMoneyDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-16"
                        />
                        <span>days</span>
                        <label className="inline-flex items-center gap-1 ml-2">
                          <input type="checkbox" checked={termsSendMoneyLater} onChange={(e) => setTermsSendMoneyLater(e.target.checked)} />
                          Enable message
                        </label>
                      </div>
                      <button type="button" className="ml-auto px-4 py-1.5 bg-gray-300 border border-gray-400 rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-red-900 text-white font-semibold px-4 py-2 text-sm">
                    Available sharing
                  </div>
                  <div className="px-4 py-3 text-sm space-y-2">
                    <ShareRow label="Coaches" checked={sharingCoaches} onChange={setSharingCoaches} />
                    <ShareRow label="Teams" checked={sharingTeams} onChange={setSharingTeams} />
                    <ShareRow label="Groups" checked={sharingGroups} onChange={setSharingGroups} />
                    <ShareRow label="Other Clubs" checked={sharingOtherClubs} onChange={setSharingOtherClubs} />
                    <div className="mt-3">
                      <button type="button" className="px-6 py-1.5 bg-red-600 text-white font-semibold rounded">
                        Proceed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-green-700 text-white font-semibold px-4 py-2 text-sm">
                    Accounts buyed for Club&apos;s members and their status. accounts still available
                  </div>
                  <div className="px-4 py-3 overflow-x-auto">
                    <table className="min-w-[560px] text-sm border border-gray-300">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border border-gray-300 px-2 py-2 w-56" />
                          <th className="border border-gray-300 px-2 py-2 text-center">Base</th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Premium</th>
                          <th className="border border-gray-300 px-2 py-2 text-center">Pro</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            buyed accounts assigned <span className="text-xs">A</span>
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">9700</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">3700</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">4000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Remaining buyed accounts <span className="text-xs">B</span>
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">9643</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">3674</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">3990</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-2 py-2 bg-slate-100 font-semibold">
                            Days Duration <span className="text-xs">C</span>
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">180</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">123</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">300</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="mt-3 text-center">
                      <button type="button" className="px-4 py-1.5 bg-gray-700 text-white rounded">
                        Historical account purchased
                      </button>
                    </div>

                    <div className="mt-4 bg-[#efe7b3] border border-[#c9bd7a] px-4 py-3">
                      <div className="font-semibold mb-2">Add a stock of accounts</div>
                      <div className="grid grid-cols-1 md:grid-cols-[160px_160px_120px_160px_1fr] gap-3 items-end">
                        <div>
                          <div className="text-xs mb-1">Accounts</div>
                          <select
                            value={stockAccounts}
                            onChange={(e) => setStockAccounts(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-400 bg-white"
                          >
                            {['select', '1', '10', '100', '1000'].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-xs mb-1">Version</div>
                          <select
                            value={stockVersion}
                            onChange={(e) => setStockVersion(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-400 bg-white"
                          >
                            {['select', 'Base', 'Premium', 'Pro'].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-xs mb-1">Price</div>
                          <div className="flex items-center gap-2">
                            <span>€</span>
                            <input
                              value={stockPrice}
                              onChange={(e) => setStockPrice(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-400 bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs mb-1">Payment</div>
                          <select
                            value={stockPayment}
                            onChange={(e) => setStockPayment(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-400 bg-white"
                          >
                            {['select', 'Credit card', 'Bank transfer'].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end">
                          <button type="button" className="px-8 py-2 bg-gray-800 text-white font-semibold rounded">
                            Proceed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-gray-300 px-4 py-2 font-semibold text-sm">Actual function and procedure</div>
                  <div className="px-4 py-3">
                    <div className="flex gap-2 mb-2">
                      {(['social', 'training', 'management'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setProcedureTab(t)}
                          className={`px-6 py-2 text-sm font-semibold rounded ${
                            procedureTab === t ? 'bg-teal-700 text-white' : 'bg-gray-600 text-white/80'
                          }`}
                        >
                          {t[0].toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="border border-gray-300">
                      {procedureRows.map((r) => (
                        <div key={r.id} className="grid grid-cols-[24px_1fr_120px] items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
                          <span
                            className={`w-3 h-3 rounded-full inline-block ${
                              r.status === 'enabled'
                                ? 'bg-green-500'
                                : r.status === 'disabled'
                                  ? 'bg-red-500'
                                  : r.status === 'optional_on'
                                    ? 'bg-green-500'
                                    : 'bg-purple-500'
                            }`}
                            title={r.status}
                          />
                          <span className="text-sm">{r.label}</span>
                          <div className="flex justify-end gap-3 text-xs">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                checked={r.on}
                                onChange={() =>
                                  setProcedureRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: true } : x)))
                                }
                              />
                              On
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                checked={!r.on}
                                onChange={() =>
                                  setProcedureRows((prev) =>
                                    prev.map((x) => (x.id === r.id ? { ...x, on: false } : x)),
                                  )
                                }
                              />
                              Off
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs flex flex-wrap gap-6 items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Features enabled
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Features not enabled
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Optionals not enabled
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Optional enabled
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center">
                      <button type="button" className="px-6 py-2 bg-red-600 text-white font-semibold rounded">
                        Proceed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-teal-700 text-white font-semibold px-4 py-2 text-sm">Expiration</div>
                  <div className="px-4 py-3 text-sm space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={notifyAtExpiration}
                          onChange={(e) => setNotifyAtExpiration(e.target.checked)}
                        />
                        Notify at expiration
                      </label>
                      <div className="flex items-center gap-2">
                        <span>Alert</span>
                        <input
                          value={notifyBeforeDays}
                          onChange={(e) => setNotifyBeforeDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-12 text-center"
                        />
                        <span>days before and</span>
                        <input
                          value={notifyAfterDays}
                          onChange={(e) => setNotifyAfterDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-12 text-center"
                        />
                        <span>days after the expiration</span>
                        <label className="inline-flex items-center gap-2 ml-2">
                          <input
                            type="checkbox"
                            checked={notifyEveryDay}
                            onChange={(e) => setNotifyEveryDay(e.target.checked)}
                          />
                          Alert every day and not only once
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={notifyByMail} onChange={(e) => setNotifyByMail(e.target.checked)} />
                        Mail
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={notifyOnNetworkPage}
                          onChange={(e) => setNotifyOnNetworkPage(e.target.checked)}
                        />
                        On your network page
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={notifyCellular} onChange={(e) => setNotifyCellular(e.target.checked)} />
                        Cellular
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={notifyPostFacebook} onChange={(e) => setNotifyPostFacebook(e.target.checked)} />
                        Post on Facebook
                      </label>
                      <button type="button" className="ml-auto px-4 py-1.5 bg-gray-300 border border-gray-400 rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-[#efe7b3] px-4 py-2 font-semibold text-sm">
                    At the expiring of the subscription of the Club ( not the expiring of the Club&apos;s member )
                  </div>
                  <div className="px-4 py-3 text-sm space-y-3">
                    <div className="font-semibold">
                      What shall happen to the features enabled when the current subscription of the Club expires...?
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={expireExtendEnabled}
                          onChange={(e) => setExpireExtendEnabled(e.target.checked)}
                        />
                        enable the extension of date for
                      </label>
                      <input
                        value={expireExtendDays}
                        onChange={(e) => setExpireExtendDays(e.target.value)}
                        className="px-2 py-1 border border-gray-300 w-16 text-center"
                      />
                      <span>days after the expiration date of the current subscription</span>
                      <span className="ml-auto text-xs bg-gray-200 border border-gray-300 px-2 py-1">-1=Unlimited</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 items-end">
                      <div />
                      <div>
                        <div className="text-xs text-gray-600">Actual Expiration</div>
                        <div className="px-3 py-2 border border-gray-300 bg-white text-center">{expireActual}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Extended to...</div>
                        <div className="px-3 py-2 border border-gray-300 bg-red-50 text-center text-red-700">
                          {expireExtendedTo}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ModeCard
                        title="Sharing with shared users"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'view', label: 'Only view' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={sharingSharedUsersMode}
                        onChange={setSharingSharedUsersMode}
                      />
                      <ModeCard
                        title="Social items of current versions"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'view', label: 'View only' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={socialItemsMode}
                        onChange={setSocialItemsMode}
                        lines={[
                          { checked: true, text: "Club's pages" },
                          { checked: true, text: "Member's pages single user pages", red: true },
                        ]}
                      />
                      <ModeCard
                        title="End users interactive panel"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={endUsersInteractiveMode}
                        onChange={setEndUsersInteractiveMode}
                      />
                      <ModeCard
                        title="Training items of current versions"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'view', label: 'View only' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={trainingItemsMode}
                        onChange={setTrainingItemsMode}
                        lines={[
                          { checked: true, text: "Club's pages" },
                          { checked: true, text: "Member's pages single user pages", red: true },
                        ]}
                      />
                      <ModeCard
                        title="Management items"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={managementItemsMode}
                        onChange={setManagementItemsMode}
                      />
                      <ModeCard
                        title="Insert options in management area"
                        options={[
                          { id: 'stop', label: 'Stop' },
                          { id: 'extend', label: 'Extend' },
                        ]}
                        value={insertOptionsManagementMode}
                        onChange={setInsertOptionsManagementMode}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button type="button" className="px-4 py-1.5 bg-gray-300 border border-gray-400 rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 px-4 py-3">
                    <CKEditorComponent
                      value={expirationMsgHtmlByLang[functionsLang] || ''}
                      onChange={(html) => setExpirationMsgHtmlByLang((prev) => ({ ...prev, [functionsLang]: html }))}
                      minHeightPx={220}
                      placeholder=""
                    />
                    <div className="mt-3 flex justify-end">
                      <button type="button" className="px-6 py-2 bg-red-600 text-white font-semibold rounded">
                        Upgrade all
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 bg-blue-900 text-white font-semibold px-4 py-2 text-sm">
                    New members with an existing Single User subscription made previously by theirself
                  </div>
                  <div className="px-4 py-3 text-sm">
                    <div className="text-red-700 font-semibold mb-2">Expiration date New date end their subscription</div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newMembersExpiryMode === 'own'}
                          onChange={() => setNewMembersExpiryMode('own')}
                        />
                        Until date end of their own subscription
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newMembersExpiryMode === 'after_end'}
                          onChange={() => setNewMembersExpiryMode('after_end')}
                        />
                        Until
                        <input
                          value={newMembersAfterDays}
                          onChange={(e) => setNewMembersAfterDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-14 text-center"
                        />
                        days after date end of their own subscription
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newMembersExpiryMode === 'after_invite'}
                          onChange={() => setNewMembersExpiryMode('after_invite')}
                        />
                        Until
                        <input
                          value={newMembersAfterDays}
                          onChange={(e) => setNewMembersAfterDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-14 text-center"
                        />
                        days after acceptance of the invite of assignment
                      </label>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button type="button" className="px-5 py-1.5 bg-gray-300 border border-gray-400 rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 px-4 py-3 text-sm">
                    <div className="text-red-700 font-semibold mb-2">
                      New version Assign them the functions available for the followed version..
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={newVersionMode === 'same'} onChange={() => setNewVersionMode('same')} />
                        Remain in the same version they have
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newVersionMode === 'trial_to_base'}
                          onChange={() => setNewVersionMode('trial_to_base')}
                        />
                        Trial user goes to base version
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newVersionMode === 'stay_current_subscription'}
                          onChange={() => setNewVersionMode('stay_current_subscription')}
                        />
                        Remain in the same version they have but when they accede to the system from the Clubs pages they
                        are enabled to utilise only the function enabled for the current subscription of the Club
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newVersionMode === 'next_assigned'}
                          onChange={() => setNewVersionMode('next_assigned')}
                        />
                        Will be assigned the next version that they have as current
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={newVersionMode === 'professional'}
                          onChange={() => setNewVersionMode('professional')}
                        />
                        Will be assigned the Professional version
                      </label>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button type="button" className="px-5 py-1.5 bg-gray-300 border border-gray-400 rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>

                {functionsSaveError ? (
                  <div className="px-4 py-3 text-sm text-red-700">{functionsSaveError}</div>
                ) : null}
                {functionsSaveSuccess ? (
                  <div className="px-4 py-3 text-sm text-green-700">{functionsSaveSuccess}</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : activeTab === 'idcards' ? (
          <div className="p-0">
            <div className="px-4 py-3">
              <div className="border border-gray-300 bg-white">
                <div className="bg-yellow-400 px-4 py-2 font-semibold text-sm">
                  Terms of payment for the stock of identification cards
                </div>
                <div className="px-4 py-3 text-sm flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span>Credit card</span>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" checked={idCardsCreditCard} onChange={() => setIdCardsCreditCard(true)} />
                      Y
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="radio" checked={!idCardsCreditCard} onChange={() => setIdCardsCreditCard(false)} />
                      N
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Send money later and before of</span>
                    <input
                      value={idCardsSendMoneyLaterDays}
                      onChange={(e) => setIdCardsSendMoneyLaterDays(e.target.value)}
                      className="px-2 py-1 border border-gray-300 w-16 text-center"
                    />
                    <span>days</span>
                  </div>
                  <button
                    type="button"
                    onClick={saveIdCardsSettings}
                    disabled={idCardsSaving}
                    className="ml-auto px-4 py-1.5 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                  >
                    {idCardsSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-red-900 text-white font-semibold px-4 py-2 text-sm">
                    Message to be displayed after the expedition but not payed
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={idCardsMsgAfterExpeditionEnabled}
                          onChange={(e) => setIdCardsMsgAfterExpeditionEnabled(e.target.checked)}
                        />
                        Enable message
                      </label>
                      <div className="flex items-center gap-2">
                        <span>Days after the assignments of the ID cards</span>
                        <select
                          value={idCardsMsgAfterExpeditionDays}
                          onChange={(e) => setIdCardsMsgAfterExpeditionDays(e.target.value)}
                          className="px-2 py-1 border border-gray-300 bg-white w-20"
                        >
                          {['1', '3', '7', '14', '30', '60'].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <span>days</span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="text-xs text-gray-700 mb-1">Edit for each language</div>
                      <div className="flex flex-wrap gap-3 text-sm mb-2">
                        {(['en', 'fr', 'de', 'it', 'es', 'por', 'rus', 'ind', 'chin', 'arab'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setIdCardsLang(l)}
                            className={`px-2 py-1 border ${
                              idCardsLang === l ? 'border-red-600 text-red-700' : 'border-transparent'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <CKEditorComponent
                        value={idCardsMsgAfterExpeditionHtmlByLang[idCardsLang] || ''}
                        onChange={(html) =>
                          setIdCardsMsgAfterExpeditionHtmlByLang((prev) => ({ ...prev, [idCardsLang]: html }))
                        }
                        minHeightPx={260}
                        placeholder=""
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={saveIdCardsSettings}
                          disabled={idCardsSaving}
                          className="px-4 py-1.5 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                        >
                          Update Terms
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-red-900 text-white font-semibold px-4 py-2 text-sm">
                    Message to be displayed upon the third party pricelist
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={idCardsThirdPartyEnabled}
                        onChange={(e) => setIdCardsThirdPartyEnabled(e.target.checked)}
                      />
                      Enable message
                    </label>
                    <div className="text-sm">
                      <div className="text-xs text-gray-700 mb-1">Enter for each language</div>
                      <div className="flex flex-wrap gap-3 text-sm mb-2">
                        {(['en', 'fr', 'de', 'it', 'es', 'por', 'rus', 'ind', 'chin', 'arab'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setIdCardsLang(l)}
                            className={`px-2 py-1 border ${
                              idCardsLang === l ? 'border-red-600 text-red-700 bg-[#efe7b3]' : 'border-gray-200 bg-[#efe7b3]'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <CKEditorComponent
                        value={idCardsThirdPartyHtmlByLang[idCardsLang] || ''}
                        onChange={(html) => setIdCardsThirdPartyHtmlByLang((prev) => ({ ...prev, [idCardsLang]: html }))}
                        minHeightPx={220}
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-green-700 text-white font-semibold px-4 py-2 text-sm">Cards enabled</div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(
                        [
                          { id: 'magnetic', label: 'Magnetic' },
                          { id: 'rfids', label: 'Rfids' },
                          { id: 'qr', label: 'QR Code' },
                          { id: 'smartcards', label: 'Smartcards' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setIdCardsEnabledTab(t.id)}
                          className={`px-4 py-2 text-sm font-semibold rounded ${
                            idCardsEnabledTab === t.id ? 'bg-black text-white' : 'bg-gray-300 text-gray-900'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-gray-100 border border-gray-300 p-3 flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>From</span>
                        <input
                          value={idCardsFrom}
                          onChange={(e) => setIdCardsFrom(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-28"
                          placeholder="from"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>To</span>
                        <input
                          value={idCardsTo}
                          onChange={(e) => setIdCardsTo(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-28"
                          placeholder="to"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={idCardsBlockDate}
                          onChange={(e) => setIdCardsBlockDate(e.target.value)}
                          className="px-2 py-1 border border-gray-300 w-28"
                          placeholder="Block date"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={idCardsSendEmail}
                          onChange={(e) => setIdCardsSendEmail(e.target.checked)}
                        />
                        Send email
                      </label>
                      <button type="button" className="px-4 py-1.5 bg-gray-800 text-white font-semibold rounded">
                        Enable now
                      </button>
                      <button type="button" className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded">
                        Remove block
                      </button>
                      <button type="button" className="ml-auto px-4 py-1.5 bg-red-600 text-white font-semibold rounded">
                        Disable
                      </button>
                    </div>

                    <div className="mt-3 border border-gray-300 bg-gray-50 p-4 text-sm">
                      <div className="font-semibold mb-3">
                        Enable during the process of subscription only the follow type of cards. Types not selected will not be possible to assign.
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-6">
                        <label className="inline-flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={idCardsAllowMagnetic}
                            onChange={(e) => setIdCardsAllowMagnetic(e.target.checked)}
                          />
                          Magnetic card
                        </label>
                        <label className="inline-flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={idCardsAllowRfid}
                            onChange={(e) => setIdCardsAllowRfid(e.target.checked)}
                          />
                          Rfid card
                        </label>
                        <label className="inline-flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={idCardsAllowSmartcard}
                            onChange={(e) => setIdCardsAllowSmartcard(e.target.checked)}
                          />
                          Smartcard card
                        </label>
                        <label className="inline-flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={idCardsAllowQr}
                            onChange={(e) => setIdCardsAllowQr(e.target.checked)}
                          />
                          QR code card
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-300">
                  <div className="bg-yellow-400 px-4 py-2 font-semibold text-sm">Historical of car purchased</div>
                  <div className="px-4 py-3 border-t border-gray-200 text-sm flex flex-wrap items-center gap-3">
                    <button type="button" className="px-3 py-1.5 bg-gray-700 text-white rounded inline-flex items-center gap-2">
                      Filter
                      <span className="inline-block border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
                    </button>
                    <select className="px-2 py-1 border border-gray-400 bg-white text-sm w-40" defaultValue="Ordering">
                      <option>Ordering</option>
                    </select>
                    <input
                      value={idCardsHistoryQuery}
                      onChange={(e) => setIdCardsHistoryQuery(e.target.value)}
                      className="px-2 py-1 border border-gray-300"
                      placeholder="Fullname, Use"
                    />
                    <input
                      value={idCardsHistoryInvoice}
                      onChange={(e) => setIdCardsHistoryInvoice(e.target.value)}
                      className="px-2 py-1 border border-gray-300"
                      placeholder="Invoice numbe"
                    />
                    <button type="button" className="px-5 py-1.5 bg-red-600 text-white font-semibold rounded">
                      Proceed
                    </button>
                    <button type="button" className="ml-auto hover:underline">
                      Print
                    </button>
                    <button type="button" className="hover:underline">
                      Send Msg
                    </button>
                    <button type="button" onClick={handleSendMail} className="hover:underline">
                      Send mail
                    </button>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="bg-gray-200 px-3 py-2 text-sm flex items-center gap-3">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" disabled />
                        Select all
                      </label>
                    </div>

                    <div className="px-2 py-2 flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        className="px-3 py-1 border border-gray-300 bg-white"
                        onClick={() => setIdCardsHistoryPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      {[1, 2, 3, 4, 5].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setIdCardsHistoryPage(p)}
                          className={`px-3 py-1 border border-gray-300 ${idCardsHistoryPage === p ? 'bg-gray-800 text-white' : 'bg-white'}`}
                        >
                          {p}
                        </button>
                      ))}
                      <span className="px-2">…</span>
                      {[13, 14].map((p) => (
                        <button key={p} type="button" onClick={() => setIdCardsHistoryPage(p)} className="px-3 py-1 border border-gray-300 bg-white">
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-3 py-1 border border-gray-300 bg-white"
                        onClick={() => setIdCardsHistoryPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>

                    <div className="space-y-4">
                      {[0, 1].map((idx) => (
                        <div key={idx} className="border border-gray-300 bg-white">
                          <div className="grid grid-cols-[32px_72px_1fr] gap-2 p-2 items-start">
                            <div className="pt-2">
                              <input type="checkbox" disabled />
                            </div>
                            <div className="w-16 h-16 bg-white border border-gray-300 overflow-hidden flex items-center justify-center">
                              {user.imageUrl ? (
                                isDataUrl(user.imageUrl) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Image src={user.imageUrl} alt="" width={64} height={64} className="w-full h-full object-cover" />
                                )
                              ) : (
                                <User className="w-7 h-7 text-gray-500" />
                              )}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border border-gray-300">
                                <thead>
                                  <tr className="bg-purple-200">
                                    <th className="border border-gray-300 px-2 py-1 text-left">Username</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Country</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Card range from</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Area product</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Date</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Cost</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Rest</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Block</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Type of user</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-gray-300 px-2 py-1">{user.username || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1">{user.country || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1" />
                                    <td className="border border-gray-300 px-2 py-1">RFID bracelets</td>
                                    <td className="border border-gray-300 px-2 py-1">2018-10-10</td>
                                    <td className="border border-gray-300 px-2 py-1">3000</td>
                                    <td className="border border-gray-300 px-2 py-1 font-semibold">3000</td>
                                    <td className="border border-gray-300 px-2 py-1 text-center">●</td>
                                    <td className="border border-gray-300 px-2 py-1">{user.roleTitle}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <table className="w-full text-xs border border-gray-300 border-t-0">
                                <thead>
                                  <tr className="bg-purple-200">
                                    <th className="border border-gray-300 px-2 py-1 text-left">Full name</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Locality</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Card range to</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Detail product</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Expires</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">payed</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">pay</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Date Block</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">Invoice number</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-gray-300 px-2 py-1">{user.fullname || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1">{user.locality || '—'}</td>
                                    <td className="border border-gray-300 px-2 py-1" />
                                    <td className="border border-gray-300 px-2 py-1">1000 three color</td>
                                    <td className="border border-gray-300 px-2 py-1">-</td>
                                    <td className="border border-gray-300 px-2 py-1">0</td>
                                    <td className="border border-gray-300 px-2 py-1 font-semibold">2018-10-10</td>
                                    <td className="border border-gray-300 px-2 py-1">0000-00-00</td>
                                    <td className="border border-gray-300 px-2 py-1">Card-200388-18</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {idCardsSaveError ? <div className="px-4 py-3 text-sm text-red-700">{idCardsSaveError}</div> : null}
                  {idCardsSaveSuccess ? (
                    <div className="px-4 py-3 text-sm text-green-700">{idCardsSaveSuccess}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'cards' ? (
          <div className="p-0">
            <div className="px-4 py-6">
              <div className="border border-gray-300 bg-white">
                <div className="bg-slate-500 text-white font-semibold px-4 py-2 text-center">
                  Status of the ID devices
                </div>

                <div className="px-4 py-4">
                  <div className="flex justify-end gap-10 text-xs text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-black inline-block" />
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                      <span>Assigned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                      <span>Free</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[680px] w-full text-sm border border-gray-300">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-2 py-2 text-left w-72" />
                          <th className="border border-gray-300 px-2 py-2 text-center bg-slate-500 text-white">
                            Global
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center bg-slate-500 text-white">
                            Blocked
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center bg-slate-500 text-white">
                            Assigned
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center bg-slate-500 text-white">
                            Free
                          </th>
                          <th className="border border-gray-300 px-2 py-2 text-center bg-slate-500 text-white">
                            Ass%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardStatusRows.map((r, idx) => (
                          <tr key={r.id} className={idx === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-2 py-2">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={r.checked}
                                  onChange={(e) =>
                                    setCardStatusRows((prev) =>
                                      prev.map((x) => (x.id === r.id ? { ...x, checked: e.target.checked } : x)),
                                    )
                                  }
                                />
                                <span className={idx === 0 ? 'font-semibold' : ''}>{r.label}</span>
                              </label>
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold">{r.global}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold">{r.blocked}</td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold">{r.assigned}</td>
                            <td
                              className={`border border-gray-300 px-2 py-2 text-center font-semibold ${
                                r.highlightFree ? 'bg-yellow-100 text-red-700' : ''
                              }`}
                            >
                              {r.free}
                            </td>
                            <td
                              className={`border border-gray-300 px-2 py-2 text-center font-semibold ${
                                r.highlightPct ? 'bg-sky-100' : ''
                              }`}
                            >
                              {r.assPct}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'devices' ? (
          <div className="p-0">
            <div className="px-4 py-4">
              <div className="border border-gray-300 bg-white">
                <div className="p-4">
                  <div className="bg-[#eeeaf8] border border-gray-300 p-4">
                    <div className="max-w-xl ml-auto text-sm">
                      <div className="grid grid-cols-[1fr_140px] gap-y-2">
                        <div className="text-right pr-4">maximum no of devices that can be enabled</div>
                        <div className="text-left font-semibold">{devicesSummary.maxEnabled}</div>

                        <div className="text-right pr-4">
                          Cost over the number <span className="text-red-700 font-semibold">{devicesSummary.costOverNumber}</span>
                        </div>
                        <div className="text-left font-semibold">{devicesSummary.costEuro}</div>

                        <div className="text-right pr-4">Current devices enabled</div>
                        <div className="text-left font-semibold text-green-700">{devicesSummary.currentEnabled}</div>

                        <div className="text-right pr-4">Devices disable</div>
                        <div className="text-left font-semibold text-green-700">{devicesSummary.disabled}</div>

                        <div className="text-right pr-4">Devices Pending</div>
                        <div className="text-left font-semibold text-green-700">{devicesSummary.pending}</div>

                        <div className="text-right pr-4">Available Inquiries</div>
                        <div className="text-left font-semibold text-green-700">{devicesSummary.availableInquiries}</div>

                        <div className="text-right pr-4 text-red-700">Expiration date</div>
                        <div className="text-left font-semibold">{devicesSummary.expirationDate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-6">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDevicesTab('enabled')}
                      className={`px-4 py-2 text-sm font-semibold rounded-t ${
                        devicesTab === 'enabled' ? 'bg-black text-white' : 'bg-gray-300 text-gray-900'
                      }`}
                    >
                      Devices enabled to Club&apos;s Management
                    </button>
                    <button
                      type="button"
                      onClick={() => setDevicesTab('logins')}
                      className={`px-4 py-2 text-sm font-semibold rounded-t ${
                        devicesTab === 'logins' ? 'bg-black text-white' : 'bg-gray-300 text-gray-900'
                      }`}
                    >
                      Logins
                    </button>
                  </div>
                  <div className="border border-gray-300 border-t-0">
                    {devicesTab === 'enabled' ? (
                      <div className="p-6">
                        <div className="flex justify-center mb-6">
                          <div className="w-full max-w-2xl h-36 bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <div className="flex items-center gap-10 opacity-80">
                              <div className="text-2xl font-semibold text-gray-400">🪟</div>
                              <div className="text-2xl font-semibold text-gray-400"></div>
                              <div className="text-2xl font-semibold text-gray-400">🤖</div>
                              <div className="text-2xl font-semibold text-blue-600">🔒</div>
                              <div className="text-2xl font-semibold text-gray-400">🖥️</div>
                              <div className="text-2xl font-semibold text-gray-400">💻</div>
                              <div className="text-2xl font-semibold text-gray-400">📱</div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200">
                          {enabledDevices.map((d) => (
                            <div
                              key={d.id}
                              className="grid grid-cols-[40px_1fr_24px] items-center gap-3 px-4 py-4 border-b border-gray-200"
                            >
                              <div className="w-5 h-5 bg-yellow-400 border border-gray-700 rounded-sm" />
                              <div className="flex items-center justify-between gap-6">
                                <div className="font-semibold text-gray-700">{d.name}</div>
                                <div className="text-sm text-gray-500">{d.locationLine}</div>
                              </div>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() =>
                                  setEnabledDevices((prev) =>
                                    prev.map((x) => (x.id === d.id ? { ...x, expanded: !x.expanded } : x)),
                                  )
                                }
                                aria-label="Toggle"
                              >
                                ▾
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="max-w-md mx-auto border border-gray-300 p-4">
                          <div className="text-center font-semibold text-xl mb-2">Filter</div>
                          <div className="text-center text-sm mb-4">
                            club : <span className="text-red-700 font-semibold">{user.username}</span>
                          </div>
                          <div className="grid grid-cols-[90px_1fr] gap-2 text-sm">
                            <div className="self-center">From date</div>
                            <input
                              value={deviceLogFrom}
                              onChange={(e) => setDeviceLogFrom(e.target.value)}
                              className="px-3 py-2 border border-gray-300"
                              placeholder="From"
                            />
                            <div className="self-center">To date</div>
                            <input
                              value={deviceLogTo}
                              onChange={(e) => setDeviceLogTo(e.target.value)}
                              className="px-3 py-2 border border-gray-300"
                              placeholder="To"
                            />
                          </div>
                          <div className="mt-4 flex justify-center gap-3">
                            <button type="button" className="px-6 py-2 bg-gray-700 text-white font-semibold rounded">
                              Apply
                            </button>
                            <button type="button" className="px-6 py-2 bg-gray-700 text-white font-semibold rounded">
                              Refresh
                            </button>
                          </div>
                          <div className="mt-2 flex justify-center">
                            <button type="button" className="px-8 py-2 bg-red-600 text-white font-semibold rounded">
                              Delete selected
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-gray-200">
                          {deviceLogs.map((l) => (
                            <div
                              key={l.id}
                              className="flex flex-wrap items-center gap-6 px-4 py-4 border-b border-gray-200 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={!!l.selected}
                                onChange={(e) =>
                                  setDeviceLogs((prev) =>
                                    prev.map((x) => (x.id === l.id ? { ...x, selected: e.target.checked } : x)),
                                  )
                                }
                              />
                              <div>
                                User Name - <span className="text-red-700">{l.username}</span>
                              </div>
                              <div>
                                Log Date - <span className="text-red-700">{l.logDate}</span>
                              </div>
                              <div className="ml-auto">
                                Log Time - <span className="text-red-700">{l.logTime}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="p-0">
            <div className="px-4 py-8">
              <div className="max-w-2xl mx-auto border border-gray-300 bg-white">
                <div className="bg-red-600 text-white font-semibold px-4 py-3 text-center">Delete these posts.</div>
                <div className="px-6 py-6">
                  <div className="flex justify-center gap-24 mb-6">
                    <label className="flex flex-col items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={deletePostsQuestion}
                        onChange={(e) => setDeletePostsQuestion(e.target.checked)}
                      />
                      <span className="px-8 py-1 border border-gray-300 bg-white">Question</span>
                    </label>
                    <label className="flex flex-col items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={deletePostsSuggestion}
                        onChange={(e) => setDeletePostsSuggestion(e.target.checked)}
                      />
                      <span className="px-8 py-1 border border-gray-300 bg-white">Suggestion</span>
                    </label>
                    <label className="flex flex-col items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={deletePostsProblem}
                        onChange={(e) => setDeletePostsProblem(e.target.checked)}
                      />
                      <span className="px-8 py-1 border border-gray-300 bg-white">Problem</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-sm mb-6">
                    <span className="font-semibold">From</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={deletePostsFrom}
                        onChange={(e) => setDeletePostsFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 w-40"
                      />
                      <span className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center">
                        📅
                      </span>
                    </div>
                    <span className="font-semibold">To</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={deletePostsTo}
                        onChange={(e) => setDeletePostsTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 w-40"
                      />
                      <span className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center">
                        📅
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={saveDeletePosts}
                      disabled={deletePostsSaving}
                      className="px-10 py-2 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                    >
                      {deletePostsSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>

                  {deletePostsSaveError ? (
                    <div className="mt-4 text-sm text-center text-red-700">{deletePostsSaveError}</div>
                  ) : null}
                  {deletePostsSaveSuccess ? (
                    <div className="mt-4 text-sm text-center text-green-700">{deletePostsSaveSuccess}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'alert' ? (
          <div className="p-0">
            <div className="px-4 py-6 space-y-6">
              {(isSingleUserProfile ? [0] : [0, 1]).map((idx) => (
                <div key={idx} className="border border-gray-300 bg-white">
                  <div className="bg-slate-500 text-white font-semibold px-4 py-2 flex items-center justify-between">
                    <span>Alert box to display to the user</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAlertMsgLang('it')}
                        className={`px-3 py-1 border border-white font-semibold ${
                          alertMsgLang === 'it' ? 'bg-white text-slate-700' : 'bg-slate-500 text-white'
                        }`}
                      >
                        IT
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlertMsgLang('en')}
                        className={`px-3 py-1 border border-white font-semibold ${
                          alertMsgLang === 'en' ? 'bg-white text-slate-700' : 'bg-slate-500 text-white'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertMsgActivated}
                          onChange={(e) => setAlertMsgActivated(e.target.checked)}
                        />
                        Activated
                      </label>

                      <div className="flex items-center gap-2">
                        <span>Enable From</span>
                        <input
                          type="date"
                          value={alertMsgEnableFrom}
                          onChange={(e) => setAlertMsgEnableFrom(e.target.value)}
                          className="px-2 py-1 border border-gray-300"
                        />
                        <span className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center">
                          📅
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>To</span>
                        <input
                          type="date"
                          value={alertMsgEnableTo}
                          onChange={(e) => setAlertMsgEnableTo(e.target.value)}
                          className="px-2 py-1 border border-gray-300"
                        />
                        <span className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center">
                          📅
                        </span>
                      </div>

                      <div className="ml-auto text-sm">{alertMsgReadOn}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
                      <div>Show the message at the</div>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertMsgShowLogin}
                          onChange={(e) => setAlertMsgShowLogin(e.target.checked)}
                        />
                        Login
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertMsgShowLogout}
                          onChange={(e) => setAlertMsgShowLogout(e.target.checked)}
                        />
                        Logout
                      </label>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <CKEditorComponent
                      value={alertMsgHtmlByLang[alertMsgLang]}
                      onChange={(html) => setAlertMsgHtmlByLang((prev) => ({ ...prev, [alertMsgLang]: html }))}
                      minHeightPx={280}
                      placeholder=""
                    />
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={saveAlertMsg}
                        disabled={alertMsgSaving}
                        className="px-10 py-2 bg-red-600 text-white font-semibold rounded disabled:opacity-50"
                      >
                        {alertMsgSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    {alertMsgSaveError ? (
                      <div className="mt-4 text-sm text-center text-red-700">{alertMsgSaveError}</div>
                    ) : null}
                    {alertMsgSaveSuccess ? (
                      <div className="mt-4 text-sm text-center text-green-700">{alertMsgSaveSuccess}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            {topTabs.find((t) => t.id === activeTab)?.label} — coming soon
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  muted,
  mono,
}: {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <label className="text-sm text-gray-700 text-left">{label}</label>
      <input
        readOnly
        value={value}
        className={`px-3 py-1.5 border border-gray-300 rounded text-sm w-full ${
          muted ? 'bg-gray-200' : 'bg-gray-50'
        } ${mono ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );
}

function SelectField({ label, value, options }: { label: string; value: string; options: string[] }) {
  const list = options.filter(Boolean);
  const v = value ?? '';
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <label className="text-sm text-gray-700">{label}</label>
      <select disabled value={v} className="px-3 py-1.5 border border-gray-300 rounded bg-gray-100 text-sm">
        <option value={v}>{v || '—'}</option>
        {list.filter((o) => o !== v).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SplitField({
  label,
  leftValue,
  rightLabel,
  rightValue,
}: {
  label: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <label className="text-sm text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <input readOnly value={leftValue} className="px-3 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm" />
        <input
          readOnly
          value={rightValue}
          aria-label={rightLabel || label}
          className="px-3 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm"
        />
      </div>
    </div>
  );
}

function BirthdayField({ day, month, year }: { day: number | null; month: number | null; year: number | null }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <label className="text-sm text-gray-700">Birthday</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={day ?? ''}
          className="px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm w-14"
        />
        <select
          disabled
          value={month ?? ''}
          className="px-2 py-1.5 border border-gray-300 rounded bg-gray-100 text-sm flex-1"
        >
          {month ? <option value={month}>{MONTHS[month - 1]}</option> : <option value="">—</option>}
        </select>
        <input
          readOnly
          value={year ?? ''}
          className="px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm w-20"
        />
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid grid-cols-[260px_1fr] items-center gap-2">
      <label className="text-sm">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 border border-gray-300 w-28"
      />
    </div>
  );
}

function ShareRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24">{label}</div>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        Sharing with {label}
      </label>
    </div>
  );
}

function ModeCard<T extends string>({
  title,
  options,
  value,
  onChange,
  lines,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  lines?: { checked: boolean; text: string; red?: boolean }[];
}) {
  return (
    <div className="bg-gray-100 border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-gray-700 whitespace-nowrap">
          {options.map((o) => (
            <label key={o.id} className="inline-flex items-center gap-1 ml-2">
              <input type="radio" checked={value === o.id} onChange={() => onChange(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      {lines?.length ? (
        <div className="mt-2 space-y-1 text-sm">
          {lines.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input type="checkbox" checked={l.checked} readOnly />
              <span className={l.red ? 'text-red-700' : ''}>{l.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToggleNY({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex items-center gap-2 border border-gray-400 rounded-full px-3 py-1 bg-white">
      <label className="inline-flex items-center gap-1 text-xs">
        <input type="radio" checked={!value} onChange={() => onChange(false)} />
        N
      </label>
      <label className="inline-flex items-center gap-1 text-xs">
        <input type="radio" checked={value} onChange={() => onChange(true)} />
        Y
      </label>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { COUNTRIES_WITH_CODES } from '@/lib/news/countries';
import { COUNTRIES } from '@/lib/news/countries';
import { getRegionsForCountry } from '@/constants/countryRegions.constants';
import { User, Mail, X, CalendarDays, CreditCard, Square, CheckSquare } from 'lucide-react';
import CKEditorComponent from '@/components/news/CKEditor';
import { emptyHtmlByLang, LANG_KEYS } from '@/lib/admin/userPcuFunctionsSettings';
type StaffKind = 'OPERATOR' | 'CO_ADMIN';

type StaffDetails = {
  id: string;
  kind: StaffKind;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  alternateEmail: string | null;
  phonePrefix: string | null;
  phoneNumber: string | null;
  cellularPrefix: string | null;
  cellularNumber: string | null;
  country: string | null;
  regions: string | null;
  roleLabel: string | null;
  facebook: string | null;
  twitter: string | null;
  website: string | null;
  blogsite: string | null;
  otherSite: string | null;
  otherInfos: string | null;
  imageUrl: string | null;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

function flagEmojiFromCode(code: string): string {
  const cc = (code || '').trim().toUpperCase();
  if (cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  const first = A + (cc.charCodeAt(0) - base);
  const second = A + (cc.charCodeAt(1) - base);
  return String.fromCodePoint(first, second);
}

const TOP_TABS = [
  { id: 'purchases', label: 'Purchases' },
  { id: 'profile', label: 'Profile' },
  { id: 'admin-settings', label: "Admin's settings" },
  { id: 'functions', label: 'Functions' },
  { id: 'alert-msg', label: 'Alert msg' },
] as const;

export default function OperatorSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<(typeof TOP_TABS)[number]['id']>('purchases');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [staff, setStaff] = useState<StaffDetails | null>(null);
  const [profileDraft, setProfileDraft] = useState<StaffDetails | null>(null);
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Purchases tab (filter modal)
  const [purchasesOrdering, setPurchasesOrdering] = useState<string>('ordering');
  const [purchasesFilterOpen, setPurchasesFilterOpen] = useState(false);
  const [purchasesFilterVersion, setPurchasesFilterVersion] = useState<string>('All');
  const [purchasesFilterStartMonth, setPurchasesFilterStartMonth] = useState<string>('select');
  const [purchasesFilterStartYear, setPurchasesFilterStartYear] = useState<string>('2010');
  const [purchasesFilterEndMonth, setPurchasesFilterEndMonth] = useState<string>('select');
  const [purchasesFilterEndYear, setPurchasesFilterEndYear] = useState<string>('2010');

  const PURCHASE_VERSION_OPTIONS = useMemo(
    () => [
      'All',
      'Trial Base',
      'Trial for club members',
      'User- base version',
      'User- premium',
      'User- professional',
      'Coach Base PFU pay for users',
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
    ],
    [],
  );

  const MONTH_OPTIONS = useMemo(
    () => ['select', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    [],
  );

  // Profile tab (legacy members profile UI - UI-only)
  const [profileSubTab, setProfileSubTab] = useState<'user' | 'club'>('user');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberSurname, setMemberSurname] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRepeat, setMemberRepeat] = useState('');
  const [memberCountry, setMemberCountry] = useState<string>('India');
  const [memberGeographical, setMemberGeographical] = useState('');
  const [memberCity, setMemberCity] = useState('');
  const [memberZip, setMemberZip] = useState('');
  const [memberPhoneCell, setMemberPhoneCell] = useState('');
  const [memberGender, setMemberGender] = useState<'M' | 'F'>('M');
  const [memberBirthDay, setMemberBirthDay] = useState('28');
  const [memberBirthMonth, setMemberBirthMonth] = useState('April');
  const [memberBirthYear, setMemberBirthYear] = useState('2026');
  const [memberUserType, setMemberUserType] = useState('Club admin');
  const [memberOccupation, setMemberOccupation] = useState('');
  const [memberSkills, setMemberSkills] = useState('');
  const [memberEmployer, setMemberEmployer] = useState('');
  const [memberHeartStart, setMemberHeartStart] = useState('');
  const [memberHeartEnd, setMemberHeartEnd] = useState('');

  const [memberTimeZone, setMemberTimeZone] = useState('Europe/Rome');
  const [memberUnitMeasure, setMemberUnitMeasure] = useState('Metric');
  const [memberFirstDayWeek, setMemberFirstDayWeek] = useState('');
  const [memberLanguage, setMemberLanguage] = useState('English');
  const [memberLanguage2, setMemberLanguage2] = useState('English');
  const [memberTheme, setMemberTheme] = useState('');
  const [memberPrivacy, setMemberPrivacy] = useState('Only Friend');
  const [memberFollowUp, setMemberFollowUp] = useState(false);

  const [memberReferencesHtml, setMemberReferencesHtml] = useState('');
  const [memberReferencesLevel, setMemberReferencesLevel] = useState('1');

  const MEMBER_USER_TYPE_OPTIONS_USER = useMemo(
    () => ['Club admin', 'Club owner', 'CEO', 'President', 'Director', 'General Manager', 'Manager'],
    [],
  );
  const MEMBER_USER_TYPE_OPTIONS_CLUB = useMemo(
    () => ['Operator', 'Club admin', 'Club owner', 'CEO', 'President', 'Director', 'General Manager', 'Manager'],
    [],
  );

  const CLUB_CATEGORY_OPTIONS = useMemo(
    () => ['Gym', 'Fitness', 'Swimming', 'Football', 'Basketball', 'Tennis', 'Other'],
    [],
  );

  // Club_profile tab (legacy club admin UI)
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubUsername, setClubUsername] = useState('');
  const [clubCategory, setClubCategory] = useState('Gym');
  const [clubCountry, setClubCountry] = useState('Italy');
  const [clubRegion, setClubRegion] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [clubZip, setClubZip] = useState('');
  const [clubAddress, setClubAddress] = useState('');
  const [clubGeo, setClubGeo] = useState('');
  const [clubMail, setClubMail] = useState('');
  const [clubMyPassword, setClubMyPassword] = useState('****');
  const [clubNewPassword, setClubNewPassword] = useState('');
  const [clubRepeatPassword, setClubRepeatPassword] = useState('');
  const [clubDirectAccess, setClubDirectAccess] = useState('');
  const [clubOfficialName, setClubOfficialName] = useState('');
  const [clubDirectRegCode, setClubDirectRegCode] = useState('');

  const clubRegionOptions = useMemo(() => {
    const country = clubCountry.trim();
    return country ? getRegionsForCountry(country) : [];
  }, [clubCountry]);

  // Functions tab state (UI-only for now)
  const [functionsDaysDuration, setFunctionsDaysDuration] = useState<string>('');
  const [activationEnabled, setActivationEnabled] = useState<boolean>(true);
  const [activationDaysAfter, setActivationDaysAfter] = useState<string>('1-30');
  const [activationLang, setActivationLang] = useState<string>('en');
  const [activationContentByLang, setActivationContentByLang] = useState<Record<string, string>>(() =>
    emptyHtmlByLang(),
  );

  const [sharingUnlimited, setSharingUnlimited] = useState<boolean>(true);
  const [sharingAvaNo, setSharingAvaNo] = useState<Record<string, string>>({
    coaches: '',
    teams: '',
    groups: '',
    otherClubs: '',
  });
  const [sharingEnabled, setSharingEnabled] = useState<Record<string, boolean>>({
    coaches: false,
    teams: false,
    groups: false,
    otherClubs: false,
  });

  const functionGroups = useMemo(
    () => ({
      social: [
        'Polls',
        'Blogs',
        'Photo',
        'Campaign',
        'Events',
        'Question&Answer',
        'Employment',
        'Bacheca',
        'Message',
        'Chat',
        'Sharing',
        'Comments',
        'Fan Clubs',
        'Friends',
        'Classified',
        'Education',
        'Video',
        'Music',
        'Other Media',
        'Favorite Links',
        'Forum',
        'Winks',
        'Sharing friends',
      ],
      training: [],
    }),
    [],
  );
  const [functionsSection, setFunctionsSection] = useState<'social' | 'training'>('social');
  const [featureEnabled, setFeatureEnabled] = useState<Record<string, boolean>>(
    () =>
      functionGroups.social.reduce((acc, k) => {
        acc[k] = false;
        return acc;
      }, {} as Record<string, boolean>),
  );

  const [expirationAlertBefore, setExpirationAlertBefore] = useState<string>('1-9');
  const [expirationAlertAfter, setExpirationAlertAfter] = useState<string>('1-9');
  const [expirationAlertDaily, setExpirationAlertDaily] = useState<boolean>(false);
  const [expirationAlertChannels, setExpirationAlertChannels] = useState<Record<string, boolean>>({
    mail: false,
    network: false,
    cellular: false,
    facebook: false,
  });

  // Alert msg tab state (UI-only for now)
  const [alertActivated, setAlertActivated] = useState<boolean>(false);
  const [alertFrom, setAlertFrom] = useState<string>('');
  const [alertTo, setAlertTo] = useState<string>('');
  const [alertLang, setAlertLang] = useState<'IT' | 'EN'>('EN');
  const [alertShowLogin, setAlertShowLogin] = useState<boolean>(false);
  const [alertShowLogout, setAlertShowLogout] = useState<boolean>(false);
  const [alertContentByLang, setAlertContentByLang] = useState<Record<'IT' | 'EN', string>>({
    IT: '',
    EN: '',
  });

  const countryCode = useMemo(() => {
    const name = (staff?.country || '').trim();
    return COUNTRIES_WITH_CODES.find((c) => c.name === name)?.id || '';
  }, [staff?.country]);

  const regionOptions = useMemo(() => {
    const country = (profileDraft?.country || '').trim();
    return country ? getRegionsForCountry(country) : [];
  }, [profileDraft?.country]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      setSuccess('');
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setLoadError('Admin session not found. Please login again.');
          return;
        }

        const res = await fetch(`/api/admin/staff-accounts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load settings');

        const s = data?.staff || {};
        const next: StaffDetails = {
          id: String(s.id ?? id),
          kind: (String(s.kind ?? 'OPERATOR') as StaffKind),
          username: String(s.username ?? ''),
          name: String(s.name ?? ''),
          surname: String(s.surname ?? ''),
          email: s.email ? String(s.email) : null,
          alternateEmail: s.alternateEmail ? String(s.alternateEmail) : null,
          phonePrefix: s.phonePrefix ? String(s.phonePrefix) : null,
          phoneNumber: s.phoneNumber ? String(s.phoneNumber) : null,
          cellularPrefix: s.cellularPrefix ? String(s.cellularPrefix) : null,
          cellularNumber: s.cellularNumber ? String(s.cellularNumber) : null,
          country: s.country ? String(s.country) : null,
          regions: s.regions ? String(s.regions) : null,
          roleLabel: s.roleLabel ? String(s.roleLabel) : null,
          facebook: s.facebook ? String(s.facebook) : null,
          twitter: s.twitter ? String(s.twitter) : null,
          website: s.website ? String(s.website) : null,
          blogsite: s.blogsite ? String(s.blogsite) : null,
          otherSite: s.otherSite ? String(s.otherSite) : null,
          otherInfos: s.otherInfos ? String(s.otherInfos) : null,
          imageUrl: s.imageUrl ? String(s.imageUrl) : null,
        };

        if (!cancelled) {
          setStaff(next);
          setProfileDraft(next);

          // Prefill legacy profile tab fields from backend staff info
          setMemberUsername(next.username);
          setMemberName(next.name);
          setMemberSurname(next.surname);
          setMemberEmail(next.email ?? '');
          setMemberCountry(next.country ?? 'India');
          setClubCountry(next.country ?? 'Italy');
          setClubMail(next.email ?? '');
          setClubLocation(next.regions ?? '');
          setClubUsername(next.username ? `${next.username}-club` : '');
          setClubOfficialName(
            `${next.name} ${next.surname}`.trim() ||
              next.username ||
              'Official club name',
          );
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveProfileDraft = async () => {
    if (!profileDraft) return;
    setSaving(true);
    setLoadError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      // Operators have an update endpoint; co-admins can reuse staff update later if needed.
      const isOperator = profileDraft.kind === 'OPERATOR';
      const url = isOperator ? `/api/admin/operators/${id}` : `/api/admin/operators/${id}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: profileDraft.username,
          email: profileDraft.email,
          name: profileDraft.name,
          surname: profileDraft.surname,
          country: profileDraft.country,
          regions: profileDraft.regions,
          roleLabel: profileDraft.roleLabel,
          alternateEmail: profileDraft.alternateEmail,
          phonePrefix: profileDraft.phonePrefix,
          phoneNumber: profileDraft.phoneNumber,
          cellularPrefix: profileDraft.cellularPrefix,
          cellularNumber: profileDraft.cellularNumber,
          facebook: profileDraft.facebook,
          twitter: profileDraft.twitter,
          website: profileDraft.website,
          blogsite: profileDraft.blogsite,
          otherSite: profileDraft.otherSite,
          otherInfos: profileDraft.otherInfos,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save profile');
      setSuccess('Saved.');
      // Refresh local state from the returned operator if provided
      const updated = data?.operator;
      if (updated) {
        const merged: StaffDetails = {
          ...profileDraft,
          username: String(updated.username ?? profileDraft.username),
          email: updated.email ? String(updated.email) : null,
          name: String(updated.name ?? profileDraft.name),
          surname: String(updated.surname ?? profileDraft.surname),
          country: updated.country ? String(updated.country) : null,
          regions: updated.regions ? String(updated.regions) : null,
          roleLabel: updated.roleLabel ? String(updated.roleLabel) : null,
          alternateEmail: updated.alternateEmail ? String(updated.alternateEmail) : null,
          phonePrefix: updated.phonePrefix ? String(updated.phonePrefix) : null,
          phoneNumber: updated.phoneNumber ? String(updated.phoneNumber) : null,
          cellularPrefix: updated.cellularPrefix ? String(updated.cellularPrefix) : null,
          cellularNumber: updated.cellularNumber ? String(updated.cellularNumber) : null,
          facebook: updated.facebook ? String(updated.facebook) : null,
          twitter: updated.twitter ? String(updated.twitter) : null,
          website: updated.website ? String(updated.website) : null,
          blogsite: updated.blogsite ? String(updated.blogsite) : null,
          otherSite: updated.otherSite ? String(updated.otherSite) : null,
          otherInfos: updated.otherInfos ? String(updated.otherInfos) : null,
          imageUrl: updated.imageUrl ? String(updated.imageUrl) : profileDraft.imageUrl,
        };
        setStaff(merged);
        setProfileDraft(merged);
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Top tab bar (like legacy) */}
      <div className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-0">
            {TOP_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === t.id ? 'bg-[#1f2937]' : 'bg-black hover:bg-[#111827]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {(loadError || success || loading) && (
          <div
            className={`rounded border px-4 py-3 text-sm mb-4 ${
              loadError
                ? 'border-red-200 bg-red-50 text-red-700'
                : success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {loadError ? loadError : success ? success : 'Loading settings...'}
          </div>
        )}

        {activeTab === 'purchases' && (
        <div className="bg-gray-200 border border-gray-300 rounded shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-gray-300"
                title="Menu"
                onClick={() => {}}
              >
                <span className="block w-5 h-0.5 bg-gray-700 mb-1" />
                <span className="block w-5 h-0.5 bg-gray-700 mb-1" />
                <span className="block w-5 h-0.5 bg-gray-700" />
              </button>
              <div className="text-sm font-semibold text-red-700">Panel control about the User</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="w-5 h-5 border border-gray-500 bg-white" title="Toggle" />
              <button
                type="button"
                className="p-1.5 rounded hover:bg-gray-300"
                title="Close"
                onClick={() => router.back()}
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 px-4 py-3">
            <div className="w-16 h-16 bg-white border border-gray-400 flex items-center justify-center overflow-hidden">
              {staff?.imageUrl ? (
                isDataUrl(staff.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={staff.imageUrl} alt={staff.username} className="w-full h-full object-cover" />
                ) : (
                  <img src={staff.imageUrl} alt={staff.username} className="w-full h-full object-cover" />
                )
              ) : (
                <User className="w-7 h-7 text-gray-500" />
              )}
            </div>

            <div className="flex-1">
              <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <strong>Name :</strong>{' '}
                    {staff ? `${staff.name} ${staff.surname}`.trim() : '—'}
                  </div>
                  <div>
                    <strong>Age :</strong> —
                  </div>
                  <div>
                    <strong>Type of User :</strong> {staff?.kind === 'CO_ADMIN' ? 'Co-Admin' : 'Operator'}
                  </div>
                  <div>
                    <strong>Sport :</strong> —
                  </div>
                  <div>
                    <strong>State :</strong> {staff?.regions ?? '—'}
                  </div>
                  <div>
                    <strong>Locality :</strong> {staff?.otherInfos ?? '—'}
                  </div>
                  <div>
                    <strong>Country :</strong> {staff?.country ?? '—'}{' '}
                    {countryCode ? `(${countryCode})` : ''}
                    {countryCode ? ` ${flagEmojiFromCode(countryCode)}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3">
                <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                  <Mail className="inline w-4 h-4 mr-2" />
                  Send mail
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <span>Start</span>
                  <div className="flex items-center gap-2">
                    <input className="px-2 py-1 border border-gray-400 bg-white w-28" defaultValue="01 Jan 2000" />
                    <CalendarDays className="w-5 h-5 text-gray-600" />
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>End</span>
                  <div className="flex items-center gap-2">
                    <input className="px-2 py-1 border border-gray-400 bg-white w-28 text-red-600" defaultValue="01 Jan 2000" />
                    <CalendarDays className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Square className="w-4 h-4 text-gray-600" />
                  <span className="text-red-600">Suspend access control</span>
                </div>
                <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                  Exhaustion status
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-gray-600" />
                  <span className="text-red-600">Suspend</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Content */}
        <div className={`${activeTab === 'purchases' ? 'mt-4' : 'mt-0'} bg-white border border-gray-300 rounded shadow-sm`}>
          <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold">
            {activeTab === 'purchases' ? 'Details of subscription · Club' : TOP_TABS.find((t) => t.id === activeTab)?.label}
          </div>

          {activeTab === 'purchases' ? (
            <div className="p-4">
              <div className="bg-purple-700 text-white px-4 py-2 font-semibold mb-3">
                Historical Club&apos;s subscriptions to the Network
              </div>

              <div className="border border-gray-200 rounded">
                <div className="bg-sky-100 px-4 py-3 flex flex-wrap items-center gap-6">
                  <div className="text-sm">
                    <strong>Full Name:</strong> {staff ? `${staff.name} ${staff.surname}`.trim() : '—'}
                  </div>
                  <div className="text-sm">
                    <strong>Country:</strong> {staff?.country ?? '—'}
                  </div>
                  <div className="text-sm">
                    <strong>Username:</strong> {staff?.username ?? '—'}
                  </div>
                  <div className="text-sm">
                    <strong>Location:</strong> {staff?.otherInfos ?? '—'}
                  </div>
                </div>

                <div className="px-4 py-3 flex flex-wrap items-center gap-4">
                  <button
                    className="px-3 py-2 bg-gray-700 text-white text-sm rounded"
                    type="button"
                    onClick={() => setPurchasesFilterOpen(true)}
                  >
                    Filter
                  </button>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                    value={purchasesOrdering}
                    onChange={(e) => setPurchasesOrdering(e.target.value)}
                  >
                    <option value="ordering">Ordering</option>
                    <option value="by_version">by version</option>
                    <option value="by_date_start">by date start subscription</option>
                    <option value="by_date_end">by date end subscription</option>
                  </select>
                  <button className="px-4 py-2 bg-red-600 text-white text-sm rounded" type="button">
                    Proceed
                  </button>
                  <div className="ml-auto flex gap-4 text-sm text-gray-700">
                    <button type="button" className="hover:underline">Print</button>
                    <button type="button" className="hover:underline">Send Msg</button>
                    <button type="button" className="hover:underline">Send mail</button>
                    <button type="button" className="hover:underline">Delete account</button>
                  </div>
                </div>

                <div className="px-4 py-2 text-sm text-gray-600 border-t border-gray-200">
                  No Record Found
                </div>

                <div className="overflow-x-auto border-t border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-teal-800 text-white">
                      <tr>
                        <th className="px-3 py-2">Full Name</th>
                        <th className="px-3 py-2">User Name</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Version</th>
                        <th className="px-3 py-2">Date Start</th>
                        <th className="px-3 py-2">Date End</th>
                        <th className="px-3 py-2">Logs</th>
                        <th className="px-3 py-2">E</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-4 text-center text-gray-500" colSpan={9}>
                          —
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'profile' ? (
                <div className="p-0">
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-3 py-1.5 bg-black text-white text-sm rounded"
                    >
                      BACK
                    </button>
                  </div>

                  <div className="px-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('user')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t ${
                          profileSubTab === 'user' ? 'bg-black text-white' : 'bg-gray-400 text-gray-900'
                        }`}
                      >
                        User Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileSubTab('club')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t ${
                          profileSubTab === 'club' ? 'bg-black text-white' : 'bg-gray-400 text-gray-900'
                        }`}
                      >
                        Club_profile
                      </button>
                    </div>
                    <div className="border-b border-gray-300" />
                  </div>

                  <div className="px-4 py-4">
                    {profileSubTab === 'user' ? (
                    <>
                    <div className="bg-purple-700 text-white px-4 py-2 font-semibold flex items-center justify-between">
                      <span>Members Profile</span>
                      <span className="text-xs text-yellow-200">(only view)</span>
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="text-center text-red-600 text-sm font-semibold mb-3">
                        * required fields
                      </div>

                      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-24 h-24 bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center">
                            {staff?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={staff.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-10 h-10 text-gray-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{memberName || '—'}</div>
                        </div>

                        <div className="space-y-2">
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Username*</label>
                            <input value={memberUsername} onChange={(e) => setMemberUsername(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Name</label>
                            <input value={memberName} onChange={(e) => setMemberName(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Surname</label>
                            <input value={memberSurname} onChange={(e) => setMemberSurname(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Email*</label>
                            <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Password*</label>
                            <input value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-gray-200 text-sm" />
                          </div>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Repeat*</label>
                            <input value={memberRepeat} onChange={(e) => setMemberRepeat(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-gray-200 text-sm" />
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Country</label>
                            <select value={memberCountry} onChange={(e) => setMemberCountry(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                              {COUNTRIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">City</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={memberCity} onChange={(e) => setMemberCity(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-700 text-left">Zip Code</label>
                                <input value={memberZip} onChange={(e) => setMemberZip(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-full" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Phone/cell</label>
                            <input value={memberPhoneCell} onChange={(e) => setMemberPhoneCell(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Gender*</label>
                            <select value={memberGender} onChange={(e) => setMemberGender(e.target.value as any)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-24">
                              <option value="M">M</option>
                              <option value="F">F</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">User Type*</label>
                            <select value={memberUserType} onChange={(e) => setMemberUserType(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                              {MEMBER_USER_TYPE_OPTIONS_USER.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <label className="text-sm text-gray-700 text-left">Occupation</label>
                            <select value={memberOccupation} onChange={(e) => setMemberOccupation(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                              <option value=""> </option>
                              <option value="Club admin">Club admin</option>
                            </select>
                          </div>

                          {profileSubTab === 'user' && (
                            <>
                              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700 text-left">Geographical</label>
                                <input value={memberGeographical} onChange={(e) => setMemberGeographical(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                              </div>

                              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700 text-left">Birthday</label>
                                <div className="flex gap-2">
                                  <select value={memberBirthDay} onChange={(e) => setMemberBirthDay(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm w-20">
                                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                      <option key={d} value={d}>
                                        {d}
                                      </option>
                                    ))}
                                  </select>
                                  <select value={memberBirthMonth} onChange={(e) => setMemberBirthMonth(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm flex-1">
                                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <select value={memberBirthYear} onChange={(e) => setMemberBirthYear(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm w-24">
                                    {Array.from({ length: 60 }, (_, i) => String(2026 - i)).map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700 text-left">Skills</label>
                                <input value={memberSkills} onChange={(e) => setMemberSkills(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />
                              </div>

                              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                                <label className="text-sm text-gray-700 text-left">Employer</label>
                                <div className="flex items-center gap-2">
                                  <input value={memberEmployer} onChange={(e) => setMemberEmployer(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-32" />
                                  <span className="text-sm text-gray-700">Heart zone</span>
                                  <input value={memberHeartStart} onChange={(e) => setMemberHeartStart(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm w-20" placeholder="start" />
                                  <input value={memberHeartEnd} onChange={(e) => setMemberHeartEnd(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm w-20" placeholder="end" />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
                          <label className="text-sm text-gray-700 text-left">Time zone</label>
                          <select value={memberTimeZone} onChange={(e) => setMemberTimeZone(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                            <option>Europe/Rome</option>
                            <option>UTC</option>
                          </select>

                          <label className="text-sm text-gray-700 text-left">Unit of Measure</label>
                          <select value={memberUnitMeasure} onChange={(e) => setMemberUnitMeasure(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                            <option>Metric</option>
                            <option>Imperial</option>
                          </select>

                          <label className="text-sm text-gray-700 text-left">First day of the week</label>
                          <input value={memberFirstDayWeek} onChange={(e) => setMemberFirstDayWeek(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />

                          <label className="text-sm text-gray-700 text-left">Language*</label>
                          <select value={memberLanguage} onChange={(e) => setMemberLanguage(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                            <option>English</option>
                            <option>French</option>
                            <option>Deutsch</option>
                          </select>

                          <label className="text-sm text-gray-700 text-left"> </label>
                          <select value={memberLanguage2} onChange={(e) => setMemberLanguage2(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                            <option>English</option>
                            <option>French</option>
                            <option>Deutsch</option>
                          </select>

                          <label className="text-sm text-gray-700 text-left">Theme</label>
                          <input value={memberTheme} onChange={(e) => setMemberTheme(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm" />

                          <label className="text-sm text-gray-700 text-left">Privacy</label>
                          <select value={memberPrivacy} onChange={(e) => setMemberPrivacy(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm">
                            <option>Only Friend</option>
                            <option>Public</option>
                          </select>

                          <label className="text-sm text-gray-700 text-left">Receive follow up notifications and mails</label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={memberFollowUp} onChange={(e) => setMemberFollowUp(e.target.checked)} className="rounded border-gray-400" />
                            Informations and Updates
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 font-semibold">
                      References
                    </div>
                    <div className="border border-gray-300 bg-white p-4">
                      <div className="ckeditor-wrapper">
                        <CKEditorComponent
                          value={memberReferencesHtml}
                          onChange={(data) => setMemberReferencesHtml(data)}
                          placeholder=""
                          id="members-references"
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-sm">
                        <div className="text-gray-700">References level</div>
                        <select value={memberReferencesLevel} onChange={(e) => setMemberReferencesLevel(e.target.value)} className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-48">
                          {['1','2','3','4','5','6'].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    </>
                    ) : (
                    <div className="border border-gray-300 bg-[#f3f3f3]">
                      <div className="bg-[#6b1020] text-white px-4 py-2.5 text-sm font-semibold">
                        {`Create a new club for the Club Admin <${staff?.username ?? 'username'}>`}
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-6">
                          <div className="flex flex-col items-start gap-2 shrink-0">
                            <div className="w-36 h-28 border border-gray-400 bg-white overflow-hidden flex items-center justify-center">
                              {clubLogoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={clubLogoUrl} alt="" className="w-full h-full object-cover" />
                              ) : staff?.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={staff.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-10 h-10 text-gray-400" />
                              )}
                            </div>
                            <button type="button" className="text-sm text-blue-700 hover:underline">
                              [ Remove Logo ]
                            </button>
                          </div>
                          <div className="flex-1 space-y-2 text-sm">
                            {(
                              [
                                ['Club username', clubUsername, setClubUsername, false],
                                ['Category', clubCategory, setClubCategory, true],
                                ['Country', clubCountry, setClubCountry, true],
                                ['Region', clubRegion, setClubRegion, true],
                                ['Location', clubLocation, setClubLocation, false],
                                ['Zip Code', clubZip, setClubZip, false],
                                ['Address', clubAddress, setClubAddress, false],
                                ['Geographic coordinate', clubGeo, setClubGeo, false],
                                ['Club mail', clubMail, setClubMail, false],
                              ] as [string, string, (v: string) => void, boolean][]
                            ).map(([label, value, setter, isSelect]) => (
                              <div key={String(label)} className="grid grid-cols-[160px_1fr] items-center gap-2">
                                <label className="text-gray-800">{label}</label>
                                {isSelect && label === 'Category' ? (
                                  <select
                                    value={String(value)}
                                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-400 rounded bg-gray-100 w-full max-w-md"
                                  >
                                    {CLUB_CATEGORY_OPTIONS.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                ) : isSelect && label === 'Country' ? (
                                  <select
                                    value={String(value)}
                                    onChange={(e) => {
                                      (setter as (v: string) => void)(e.target.value);
                                      setClubRegion('');
                                    }}
                                    className="px-2 py-1.5 border border-gray-400 rounded bg-gray-100 w-full max-w-md"
                                  >
                                    {COUNTRIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                ) : isSelect && label === 'Region' ? (
                                  <select
                                    value={String(value)}
                                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-400 rounded bg-gray-100 w-full max-w-md"
                                  >
                                    <option value="">Select region</option>
                                    {clubRegionOptions.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    value={String(value)}
                                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-400 rounded bg-gray-100 w-full max-w-md"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-red-700 font-semibold text-sm mb-2">My Club password</div>
                          <table className="w-full max-w-lg text-sm border border-gray-300">
                            <tbody>
                              <tr className="border-b border-gray-300">
                                <td className="px-3 py-2 bg-gray-50 w-36">My Password</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="password"
                                    value={clubMyPassword}
                                    readOnly
                                    className="w-full px-2 py-1 border border-gray-300 rounded bg-white"
                                  />
                                </td>
                              </tr>
                              <tr className="border-b border-gray-300">
                                <td className="px-3 py-2 bg-gray-50">New Password</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="password"
                                    value={clubNewPassword}
                                    onChange={(e) => setClubNewPassword(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-200"
                                  />
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 bg-gray-50">Repeat Pass.</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="password"
                                    value={clubRepeatPassword}
                                    onChange={(e) => setClubRepeatPassword(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-200"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <button type="button" className="mt-2 text-sm text-gray-700 hover:underline">
                            Reset Password
                          </button>
                        </div>

                        <div className="grid grid-cols-[160px_1fr] items-center gap-2 text-sm max-w-2xl">
                          <label className="text-red-700 font-semibold">Direct Access</label>
                          <input
                            value={clubDirectAccess}
                            onChange={(e) => setClubDirectAccess(e.target.value)}
                            className="px-2 py-1.5 border border-gray-400 rounded bg-[#fff9c4] w-full max-w-xs"
                          />
                        </div>
                        <div className="grid grid-cols-[160px_1fr] items-center gap-2 text-sm max-w-3xl">
                          <label className="font-semibold text-gray-900">Official Club name</label>
                          <input
                            value={clubOfficialName}
                            onChange={(e) => setClubOfficialName(e.target.value)}
                            className="px-2 py-1.5 border border-gray-400 rounded bg-gray-900 text-white w-full"
                          />
                        </div>

                        <div>
                          <div className="text-red-700 font-semibold text-sm mb-2">Direct Registration Code</div>
                          <div className="border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800 space-y-3 max-w-3xl">
                            <p>
                              Password to be typed by the users who register at Movesbook by themselves to send an
                              authorized request to become member of the club.
                            </p>
                            <div className="grid grid-cols-[180px_1fr] items-center gap-2">
                              <label>Direct Registration code</label>
                              <input
                                value={clubDirectRegCode}
                                onChange={(e) => setClubDirectRegCode(e.target.value)}
                                className="px-2 py-1.5 border border-gray-400 rounded bg-white max-w-xs"
                                placeholder="Magiccode"
                              />
                            </div>
                            <p className="text-red-600 text-xs leading-relaxed">
                              Once the request has been sent, the user will be placed on a temporary list waiting for
                              the club staff to reauthorized his self-registration.
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center gap-6 pt-4">
                          <button
                            type="button"
                            className="px-10 py-2.5 bg-gradient-to-b from-red-500 to-red-700 text-white font-semibold rounded-lg shadow border border-red-900"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-10 py-2.5 bg-gradient-to-b from-gray-700 to-black text-white font-semibold rounded-lg shadow border border-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'admin-settings' ? (
                <div className="p-0">
                  {/* Admin's settings (UI scaffold to match screenshots) */}
                  <div className="bg-gray-200 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                    <div className="font-semibold text-gray-800">Operator Settings</div>
                    <div className="text-xs text-red-700 font-semibold">
                      (only s-admin and co-admins can use this function)
                    </div>
                  </div>

                  <div className="px-4 py-4 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-20 bg-gray-100 border border-gray-300 flex items-center justify-center overflow-hidden">
                        {staff?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={staff.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-gray-500" />
                        )}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold">{staff ? `${staff.name} ${staff.surname}`.trim() : '—'}</div>
                        <div className="text-gray-600">{staff?.country ?? '—'}</div>
                        <button type="button" className="mt-2 px-4 py-2 bg-gray-700 text-white text-sm rounded">
                          Send mail
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#6b8fb8] text-white font-semibold px-4 py-2 rounded">
                      Other settings
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Put this user as customer of this operator</div>
                        <label className="flex items-center gap-2 text-sm mb-2">
                          <input type="checkbox" className="rounded border-gray-400" /> As Operator
                        </label>
                        <div className="flex items-center gap-2">
                          <select className="px-3 py-2 border border-gray-300 rounded bg-white text-sm flex-1">
                            <option>List of operator</option>
                          </select>
                          <button type="button" className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                            +
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Put this user as customer of this agent/sub-agent</div>
                        <label className="flex items-center gap-2 text-sm mb-2">
                          <input type="checkbox" className="rounded border-gray-400" /> As Agent
                        </label>
                        <div className="flex items-center gap-2">
                          <select className="px-3 py-2 border border-gray-300 rounded bg-white text-sm flex-1">
                            <option>List of agents/sub-</option>
                          </select>
                          <button type="button" className="px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm">
                            +
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Enable user to publish feedback</div>
                        <input type="checkbox" className="rounded border-gray-400" />
                      </div>

                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Enable user to publish blogs</div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-400" />
                          <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm flex-1" />
                        </div>
                      </div>

                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Enable user to publish reviews</div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-400" />
                          <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm flex-1" />
                        </div>
                      </div>

                      <div className="border border-gray-300 bg-white p-4">
                        <div className="font-semibold text-sm mb-2">Disable permission to leave comments</div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-700">
                          {['Reviews', 'Suggestions', 'Html docs & News', 'Queries', 'Bugs', 'Blogs'].map((x) => (
                            <label key={x} className="flex items-center gap-2">
                              <input type="checkbox" className="rounded border-gray-400" /> {x}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="font-semibold text-sm mb-3">Categories of News followed by the user</div>
                      <select className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-72">
                        <option>Select an option</option>
                      </select>
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="font-semibold text-sm mb-3">Enable Sponsors</div>
                      <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded border-gray-400" /> Enable Sponsors
                        </label>
                        <div />
                        <label className="text-sm text-gray-700">Date last purchase</label>
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm" defaultValue="0000-00-00" />
                        <label className="text-sm text-gray-700">Expiration Date</label>
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm" defaultValue="0000-00-00" />
                        <label className="text-sm text-gray-700">Number of Sponsors Enabled</label>
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-24" defaultValue="0" />
                        <label className="text-sm text-gray-700">Cost last purchase</label>
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-24" defaultValue="0" />
                        <label className="text-sm text-gray-700">Status of payments not ok</label>
                        <button type="button" className="px-4 py-2 bg-black text-white text-sm rounded w-fit">
                          Payment
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="font-semibold text-sm mb-3">Enable user to add comments</div>
                      <input type="checkbox" className="rounded border-gray-400" />
                    </div>

                    <div className="bg-[#e8e5f4] border border-gray-300 px-4 py-3 rounded flex items-center justify-center gap-3">
                      <span className="text-sm font-semibold text-gray-800">Manage the blocks</span>
                    </div>

                    <div className="bg-[#6b8fb8] text-white font-semibold px-4 py-2 rounded">
                      VIP Settings
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="font-semibold text-sm mb-3">VIP Settings</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-sm text-gray-700 mb-2">-put the user in this sections of the VIP banner</div>
                          <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-72" defaultValue="NOT AVILABLE" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-2">-Who can see him?</div>
                          <div className="text-sm text-gray-700 mb-1">Type of user</div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            {['select all user type', 'Athlete', 'Coach', 'Team', 'Club', 'Group', 'Club_subadmin', 'Club_operator'].map((x) => (
                              <label key={x} className="flex items-center gap-2">
                                <input type="checkbox" className="rounded border-gray-400" /> {x}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Language</div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            {['select all languages', 'English', 'French', 'Deutsch', 'Italiano', 'Spanish', 'Portuguese', 'Russian', 'Hindi', 'Chinese', 'Arabic'].map((x) => (
                              <label key={x} className="flex items-center gap-2">
                                <input type="checkbox" className="rounded border-gray-400" /> {x}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-700 mb-1">Duration</div>
                          <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-48" defaultValue="04/28/2026" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="text-sm text-gray-700 mb-2">
                        What data of the VIP the user can see?{' '}
                        <span className="text-red-600">(only s-admin and co-admins can use this function)</span>
                      </div>
                      <div className="space-y-3">
                        {[
                          'Allow to my visitors to accede to my profile',
                          'Allow to my visitors to open my biography',
                          'Allow to my visitors to the friendship',
                          'Allow to my visitors to mail me',
                        ].map((label) => (
                          <div key={label} className="flex items-center gap-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-2">
                                <input type="radio" name={label} defaultChecked={false} /> N
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <input type="radio" name={label} defaultChecked /> Y
                              </span>
                            </div>
                            <div>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#6b8fb8] text-white font-semibold px-4 py-2 rounded">
                      Banner and header for the reference list of user
                    </div>

                    <div className="border border-gray-300 bg-white p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="rounded border-gray-400" /> Enable to display in the reference list of users
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="rounded border-gray-400" /> Enable to display in the banner at main page
                        </label>
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm" defaultValue={staff?.username ?? ''} />
                        <input className="px-3 py-2 border border-gray-300 rounded bg-white text-sm" />
                      </div>

                      <div className="mt-4 border border-gray-300 p-4">
                        <div className="h-48 bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400">
                          NO IMAGE AVAILABLE
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <input type="file" />
                          <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 font-semibold">
                        References
                      </div>
                      <div className="flex flex-wrap gap-3 px-4 py-3 text-sm">
                        {LANG_KEYS.map((x) => (
                          <button key={x} type="button" className={`px-2 py-1 border ${x === 'en' ? 'border-red-500' : 'border-transparent'} hover:border-gray-300`}>
                            {x}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span>Priority Level :</span>
                          <select className="px-3 py-2 border border-gray-300 rounded bg-white text-sm">
                            <option>First</option>
                            <option>Second</option>
                            <option>Third</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-400" /> Favourite VIP ⭐
                        </label>
                      </div>

                      <div className="flex items-center justify-center gap-2 px-4 py-4">
                        <button type="button" className="px-5 py-2 bg-red-600 text-white text-sm rounded">
                          Save
                        </button>
                        <button type="button" className="px-5 py-2 bg-gray-700 text-white text-sm rounded">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'functions' ? (
                <div className="p-0">
                  {/* Days Duration */}
                  <div className="flex justify-end p-4">
                    <div className="w-full max-w-sm border border-gray-300 bg-white">
                      <div className="bg-[#6b8fb8] text-white font-semibold px-3 py-2">Days Duration</div>
                      <div className="px-3 py-3">
                        <div className="text-sm font-semibold text-gray-800 mb-2">Days durations of subscription :</div>
                        <input
                          value={functionsDaysDuration}
                          onChange={(e) => setFunctionsDaysDuration(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-28"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subscription expiration strip */}
                  <div className="flex items-center justify-between bg-[#4f4f4f] text-white px-4 py-2">
                    <div className="text-sm font-semibold">
                      Club <span className="text-yellow-300">Actual Subscription expiration date</span>{' '}
                      <span className="text-sky-200">01 Jan 2000</span>
                    </div>
                    <button type="button" className="px-4 py-1.5 bg-red-600 text-white text-sm rounded">
                      Upgrade Version
                    </button>
                  </div>

                  {/* Message after activation */}
                  <div className="bg-[#7b0010] text-white font-semibold px-4 py-2">
                    Message to be displayed after the activation of the accounts but not payed
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activationEnabled}
                          onChange={(e) => setActivationEnabled(e.target.checked)}
                          className="rounded border-gray-400"
                        />
                        Enable message
                      </label>
                      <span>Days after the assignments of the accounts</span>
                      <select
                        value={activationDaysAfter}
                        onChange={(e) => setActivationDaysAfter(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded bg-white text-sm"
                      >
                        <option value="1-30">(1-30)</option>
                        <option value="1-9">(1-9)</option>
                      </select>
                      <span>days</span>
                    </div>

                    <div className="text-sm text-gray-700">Edit for each language</div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {LANG_KEYS.map((x) => (
                        <button
                          key={x}
                          type="button"
                          onClick={() => setActivationLang(x)}
                          className={`px-2 py-1 border ${
                            activationLang === x ? 'border-red-500' : 'border-transparent'
                          } hover:border-gray-300`}
                        >
                          {x}
                        </button>
                      ))}
                    </div>

                    <div className="ckeditor-wrapper border border-gray-300 bg-white">
                      <CKEditorComponent
                        value={activationContentByLang[activationLang] ?? ''}
                        onChange={(data) =>
                          setActivationContentByLang((prev) => ({ ...prev, [activationLang]: data }))
                        }
                        placeholder=""
                        id={`activation-msg-${activationLang}`}
                      />
                    </div>

                    <button type="button" className="px-5 py-2 bg-red-600 text-white text-sm rounded">
                      Update Terms
                    </button>
                  </div>

                  {/* Available sharing */}
                  <div className="bg-[#7b0010] text-white font-semibold px-4 py-2">
                    Available sharing <span className="font-normal text-xs">(with users registred in the network - sharing will be possible if bothe subscriptions are valid)</span>
                  </div>
                  <div className="px-4 py-4">
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => setSharingUnlimited((v) => !v)}
                        className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm"
                      >
                        {sharingUnlimited ? '-1=Unlimited' : 'Set Unlimited'}
                      </button>
                    </div>

                    <div className="grid gap-3 max-w-3xl">
                      {[
                        { key: 'coaches', label: 'Coaches' },
                        { key: 'teams', label: 'Teams' },
                        { key: 'groups', label: 'Groups' },
                        { key: 'otherClubs', label: 'Other Clubs' },
                      ].map((row) => (
                        <div key={row.key} className="grid grid-cols-[140px_90px_1fr] items-center gap-4">
                          <div className="text-sm font-semibold text-gray-800">{row.label}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-600">AvaNo.</div>
                            <input
                              value={sharingAvaNo[row.key] ?? ''}
                              onChange={(e) => setSharingAvaNo((p) => ({ ...p, [row.key]: e.target.value }))}
                              className="px-2 py-1 border border-gray-300 rounded bg-[#efe7b3] text-sm w-16"
                              disabled={sharingUnlimited}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={sharingEnabled[row.key] ?? false}
                              onChange={(e) => setSharingEnabled((p) => ({ ...p, [row.key]: e.target.checked }))}
                              className="rounded border-gray-400"
                            />
                            Sharing with {row.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end mt-3">
                      <button type="button" className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded">
                        Upgrade
                      </button>
                    </div>
                  </div>

                  {/* Actual function and procedure */}
                  <div className="bg-gray-300 text-gray-800 font-semibold px-4 py-2">
                    Actual function and procedure
                  </div>
                  <div className="px-4 py-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFunctionsSection('social')}
                      className={`px-6 py-2 rounded-t ${
                        functionsSection === 'social' ? 'bg-teal-700 text-white' : 'bg-gray-600 text-white'
                      }`}
                    >
                      Social
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunctionsSection('training')}
                      className={`px-6 py-2 rounded-t ${
                        functionsSection === 'training' ? 'bg-teal-700 text-white' : 'bg-gray-600 text-white'
                      }`}
                    >
                      Training
                    </button>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="border border-gray-300 bg-gray-100">
                      <div className="grid grid-cols-[1fr_220px_220px] gap-0 text-xs font-semibold text-gray-700 border-b border-gray-300 px-4 py-2">
                        <div> </div>
                        <div className="text-center">On</div>
                        <div className="text-center">Off</div>
                      </div>
                      {(functionsSection === 'social' ? functionGroups.social : functionGroups.training).map((label) => (
                        <div
                          key={label}
                          className="grid grid-cols-[1fr_220px_220px] items-center border-b border-gray-200 px-4 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                            <span>{label}</span>
                          </div>
                          <div className="text-center">
                            <input
                              type="radio"
                              name={`feat-${label}`}
                              checked={Boolean(featureEnabled[label])}
                              onChange={() => setFeatureEnabled((p) => ({ ...p, [label]: true }))}
                            />
                          </div>
                          <div className="text-center">
                            <input
                              type="radio"
                              name={`feat-${label}`}
                              checked={!featureEnabled[label]}
                              onChange={() => setFeatureEnabled((p) => ({ ...p, [label]: false }))}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2 text-xs text-gray-700">
                        <span className="inline-flex items-center gap-2 mr-6">
                          <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Features enabled
                        </span>
                        <span className="inline-flex items-center gap-2 mr-6">
                          <span className="inline-block w-3 h-3 rounded-full bg-red-600" /> Features not enabled
                        </span>
                        <span className="inline-flex items-center gap-2 mr-6">
                          <span className="inline-block w-3 h-3 rounded-full bg-purple-600" /> Optionals not enabled
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" /> Optional enabled
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center mt-4">
                      <button type="button" className="px-6 py-2 bg-red-600 text-white text-sm rounded">
                        Proceed
                      </button>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="bg-teal-700 text-white font-semibold px-4 py-2">Expiration</div>
                  <div className="px-4 py-4">
                    <div className="text-sm font-semibold mb-2">Notify at expiration</div>
                    <div className="border border-gray-300 bg-white p-4 max-w-4xl">
                      <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                        <span>Alert</span>
                        <input
                          value={expirationAlertBefore}
                          onChange={(e) => setExpirationAlertBefore(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded bg-[#efe7b3] w-16"
                        />
                        <span>days before and</span>
                        <input
                          value={expirationAlertAfter}
                          onChange={(e) => setExpirationAlertAfter(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded bg-[#efe7b3] w-16"
                        />
                        <span>days after the expiration</span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={expirationAlertDaily}
                            onChange={(e) => setExpirationAlertDaily(e.target.checked)}
                            className="rounded border-gray-400"
                          />
                          Alert every day and not only once
                        </label>
                      </div>

                      <div className="grid gap-1 text-sm text-gray-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={expirationAlertChannels.mail}
                            onChange={(e) =>
                              setExpirationAlertChannels((p) => ({ ...p, mail: e.target.checked }))
                            }
                            className="rounded border-gray-400"
                          />
                          Mail
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={expirationAlertChannels.network}
                            onChange={(e) =>
                              setExpirationAlertChannels((p) => ({ ...p, network: e.target.checked }))
                            }
                            className="rounded border-gray-400"
                          />
                          On your network page
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={expirationAlertChannels.cellular}
                            onChange={(e) =>
                              setExpirationAlertChannels((p) => ({ ...p, cellular: e.target.checked }))
                            }
                            className="rounded border-gray-400"
                          />
                          Cellular
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={expirationAlertChannels.facebook}
                            onChange={(e) =>
                              setExpirationAlertChannels((p) => ({ ...p, facebook: e.target.checked }))
                            }
                            className="rounded border-gray-400"
                          />
                          Post on Facebook
                        </label>
                      </div>

                      <div className="flex justify-end mt-3">
                        <button type="button" className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded">
                          Upgrade
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'alert-msg' ? (
                <div className="p-0">
                  <div className="bg-[#6b8fb8] text-white font-semibold px-4 py-2 flex items-center justify-between">
                    <span>Alert box to display to the user</span>
                    <div className="flex items-center gap-2">
                      {(['IT', 'EN'] as const).map((x) => (
                        <button
                          key={x}
                          type="button"
                          onClick={() => setAlertLang(x)}
                          className={`px-3 py-1 border ${
                            alertLang === x ? 'border-white bg-white/10' : 'border-white/60'
                          }`}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 py-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertActivated}
                          onChange={(e) => setAlertActivated(e.target.checked)}
                          className="rounded border-gray-400"
                        />
                        Activated
                      </label>

                      <div className="flex items-center gap-2">
                        <span>Enable From</span>
                        <input
                          value={alertFrom}
                          onChange={(e) => setAlertFrom(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-32"
                        />
                        <CalendarDays className="w-5 h-5 text-gray-600" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span>To</span>
                        <input
                          value={alertTo}
                          onChange={(e) => setAlertTo(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-32"
                        />
                        <CalendarDays className="w-5 h-5 text-gray-600" />
                      </div>

                      <div className="text-xs text-gray-500">Read on 1st January 1970</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                      <div className="font-semibold">Show the message at the</div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertShowLogin}
                          onChange={(e) => setAlertShowLogin(e.target.checked)}
                          className="rounded border-gray-400"
                        />
                        Login
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={alertShowLogout}
                          onChange={(e) => setAlertShowLogout(e.target.checked)}
                          className="rounded border-gray-400"
                        />
                        Logout
                      </label>
                    </div>

                    <div className="ckeditor-wrapper border border-gray-300 bg-white">
                      <CKEditorComponent
                        value={alertContentByLang[alertLang] ?? ''}
                        onChange={(data) =>
                          setAlertContentByLang((prev) => ({ ...prev, [alertLang]: data }))
                        }
                        placeholder=""
                        id={`alert-msg-${alertLang}`}
                      />
                    </div>

                    <div className="flex justify-center">
                      <button type="button" className="px-6 py-2 bg-red-600 text-white text-sm rounded">
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-600">This tab is not implemented yet.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Purchases filter modal */}
      {activeTab === 'purchases' && purchasesFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPurchasesFilterOpen(false)}
          />
          <div className="relative w-[560px] max-w-[95vw] bg-[#efe7b3] border border-[#c9bd7a] shadow-lg p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <div className="text-sm text-gray-800">Version</div>
                <select
                  value={purchasesFilterVersion}
                  onChange={(e) => setPurchasesFilterVersion(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-full"
                >
                  {PURCHASE_VERSION_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <div className="text-sm text-gray-800">Subscription Datarange</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={purchasesFilterStartMonth}
                      onChange={(e) => setPurchasesFilterStartMonth(e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded bg-white text-sm flex-1"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      value={purchasesFilterStartYear}
                      onChange={(e) => setPurchasesFilterStartYear(e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded bg-white text-sm w-20 text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={purchasesFilterEndMonth}
                      onChange={(e) => setPurchasesFilterEndMonth(e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded bg-white text-sm flex-1"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      value={purchasesFilterEndYear}
                      onChange={(e) => setPurchasesFilterEndYear(e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded bg-white text-sm w-20 text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-8 pt-2">
                <button
                  type="button"
                  onClick={() => setPurchasesFilterOpen(false)}
                  className="px-10 py-2 bg-gray-300 text-gray-800 text-sm rounded border border-gray-400"
                >
                  Exit
                </button>
                <button
                  type="button"
                  onClick={() => setPurchasesFilterOpen(false)}
                  className="px-10 py-2 bg-gray-200 text-gray-900 text-sm rounded border border-gray-400"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  User,
  Key,
  Edit,
  Trash2,
  Users,
  DollarSign,
  BarChart3,
  FileEdit,
  FileX,
  Megaphone,
  List,
  Settings,
  Package,
  Info,
  MessageCircle,
} from 'lucide-react';
import { OperatorNavBar } from '@/components/operators/OperatorNavBar';

type ToggleValue = 'OY' | 'ON'; // OY = Off, ON = On
type YesNo = 'Yes' | 'No';

function ToggleOYON({
  value,
  onChange,
  myCountry,
  otherCountries,
  onMyCountryChange,
  onOtherCountriesChange,
}: {
  value?: ToggleValue;
  onChange?: (v: ToggleValue) => void;
  myCountry?: ToggleValue;
  otherCountries?: ToggleValue;
  onMyCountryChange?: (v: ToggleValue) => void;
  onOtherCountriesChange?: (v: ToggleValue) => void;
}) {
  const isDual = myCountry !== undefined && otherCountries !== undefined;
  const renderButtons = (current: ToggleValue, setVal: (v: ToggleValue) => void) => (
    <div className="flex rounded overflow-hidden border border-gray-500">
      <button
        type="button"
        onClick={() => setVal('OY')}
        className={`px-2 py-1 text-xs ${current === 'OY' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'}`}
      >
        OY
      </button>
      <button
        type="button"
        onClick={() => setVal('ON')}
        className={`px-2 py-1 text-xs ${current === 'ON' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'}`}
      >
        ON
      </button>
    </div>
  );
  if (isDual && onMyCountryChange && onOtherCountriesChange) {
    return (
      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20">My Country</span>
          {renderButtons(myCountry!, onMyCountryChange)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Other Countries</span>
          {renderButtons(otherCountries!, onOtherCountriesChange)}
        </div>
      </div>
    );
  }
  return onChange ? renderButtons(value!, onChange) : null;
}

export default function OperatorCoadminSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = params?.operatorId as string;
  const coadminId = params?.coadminId as string;

  const [country, setCountry] = useState('Andorra');
  const [language, setLanguage] = useState('English');
  const [idCardCode, setIdCardCode] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [commissionAutoAssign, setCommissionAutoAssign] = useState(false);

  // Operator permissions (My Country, Other Countries)
  const [listOperators, setListOperators] = useState<{ my: ToggleValue; other: ToggleValue }>({ my: 'ON', other: 'ON' });
  const [viewPayments, setViewPayments] = useState<{ my: ToggleValue; other: ToggleValue }>({ my: 'ON', other: 'ON' });
  const [viewStatistics, setViewStatistics] = useState<{ my: ToggleValue; other: ToggleValue }>({ my: 'ON', other: 'ON' });
  const [facultyModifies, setFacultyModifies] = useState<{ my: ToggleValue; other: ToggleValue }>({ my: 'ON', other: 'ON' });
  const [facultyDelete, setFacultyDelete] = useState<{ my: ToggleValue; other: ToggleValue }>({ my: 'ON', other: 'ON' });

  const [otherOptionsMessages, setOtherOptionsMessages] = useState(false);
  const [loginsOtherOperators, setLoginsOtherOperators] = useState(false);

  const [publishArticles, setPublishArticles] = useState(false);
  const [publishPosts, setPublishPosts] = useState(false);
  const [operateBlog, setOperateBlog] = useState(false);
  const [publishReviews, setPublishReviews] = useState(false);

  // System Dashboard (single toggle each)
  const [advertisings, setAdvertisings] = useState<ToggleValue>('ON');
  const [settingSubscriptions, setSettingSubscriptions] = useState<ToggleValue>('ON');
  const [functionsSetting, setFunctionsSetting] = useState<ToggleValue>('ON');
  const [packageSetting, setPackageSetting] = useState<ToggleValue>('ON');
  const [infoSettings, setInfoSettings] = useState<ToggleValue>('ON');
  const [languageCountry, setLanguageCountry] = useState<ToggleValue>('ON');
  const [settingsForUsers, setSettingsForUsers] = useState<ToggleValue>('ON');

  // Other Settings: checkbox + My Country Yes/No + Other Countries Yes/No
  const [subscriptionSection, setSubscriptionSection] = useState({ checked: false, my: 'Yes' as YesNo, other: 'Yes' as YesNo });
  const [historicalAccessLogs, setHistoricalAccessLogs] = useState({ checked: false, my: 'Yes' as YesNo, other: 'Yes' as YesNo });
  const [bugsErrorReports, setBugsErrorReports] = useState({ checked: false, my: 'Yes' as YesNo, other: 'Yes' as YesNo });
  const [clubSection, setClubSection] = useState({ checked: false, my: 'Yes' as YesNo, other: 'Yes' as YesNo });

  return (
    <div className="min-h-full bg-gray-100">
      <OperatorNavBar
        operatorId={operatorId}
        activeTabId="super-admin"
        variant={{ kind: 'coadmin', coadminId }}
      />

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Co-Admin profile header */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400 flex-shrink-0">
              <User className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Elio Blasevich</p>
              <p className="text-sm text-red-600 font-medium">Operator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded flex items-center gap-1">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Delete Profile
            </button>
          </div>
        </section>

        {/* Basic Co-Admin Information */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
            <label className="text-sm text-gray-700">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-3 py-2 border border-gray-400 rounded bg-white">
              <option>Andorra</option>
              <option>India</option>
              <option>English</option>
            </select>
            <label className="text-sm text-gray-700">Language for Operator</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 border border-gray-400 rounded bg-white">
              <option>English</option>
              <option>Italian</option>
            </select>
            <label className="text-sm text-gray-700">ID card code</label>
            <input type="text" value={idCardCode} onChange={(e) => setIdCardCode(e.target.value)} className="px-3 py-2 border border-gray-400 rounded bg-white" />
            <label className="text-sm text-gray-700">% Commission</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="text" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} className="w-20 px-3 py-2 border border-gray-400 rounded bg-white" />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={commissionAutoAssign} onChange={(e) => setCommissionAutoAssign(e.target.checked)} className="rounded border-gray-400" />
                Automatically assigns the commission (but as not yet paid) when a customer assigned to him makes into an order
              </label>
            </div>
          </div>
        </section>

        {/* Operator Permissions */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <h2 className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm">Operator</h2>
          <div className="bg-gray-200 p-4 space-y-3">
            {[
              { icon: Users, label: 'List of Operators', state: listOperators, set: setListOperators },
              { icon: DollarSign, label: 'View of all payments', state: viewPayments, set: setViewPayments },
              { icon: BarChart3, label: 'View of all statistics', state: viewStatistics, set: setViewStatistics },
              { icon: FileEdit, label: 'Faculty to make modifies regarding sections allowed', state: facultyModifies, set: setFacultyModifies },
              { icon: FileX, label: 'Faculty to delete regarding sections allowed', state: facultyDelete, set: setFacultyDelete },
            ].map(({ icon: Icon, label, state, set }) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-gray-300 last:border-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm text-gray-800">{label}</span>
                </div>
                <ToggleOYON myCountry={state.my} otherCountries={state.other} onMyCountryChange={(v) => set({ ...state, my: v })} onOtherCountriesChange={(v) => set({ ...state, other: v })} />
              </div>
            ))}
          </div>
        </section>

        {/* Other Permissions */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <h2 className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm">Other Permissions</h2>
          <div className="bg-gray-200 p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input type="checkbox" checked={otherOptionsMessages} onChange={(e) => setOtherOptionsMessages(e.target.checked)} className="rounded border-gray-400" />
              Other options(messages,block section,extend subscription)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input type="checkbox" checked={loginsOtherOperators} onChange={(e) => setLoginsOtherOperators(e.target.checked)} className="rounded border-gray-400" />
              Logins about other operators of your country
            </label>
          </div>
        </section>

        {/* Permissions on posts */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <h2 className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm">Permissions on posts</h2>
          <div className="bg-gray-200 p-4 space-y-2">
            {[
              { state: publishArticles, set: setPublishArticles, label: 'Allow operator to publish articles' },
              { state: publishPosts, set: setPublishPosts, label: 'Allow the operator to publish posts' },
              { state: operateBlog, set: setOperateBlog, label: 'Allow operator to operate the blog of movesbook' },
              { state: publishReviews, set: setPublishReviews, label: 'Allow the operator to publish reviews' },
            ].map(({ state, set, label }) => (
              <label key={label} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} className="rounded border-gray-400" />
                {label}
              </label>
            ))}
          </div>
        </section>

        {/* System Dashboard - red header */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <h2 className="px-4 py-2 bg-red-600 text-white font-semibold text-sm">System Dashboard</h2>
          <div className="bg-gray-200 p-4 space-y-3">
            {[
              { icon: Megaphone, label: 'Advertisings', value: advertisings, set: setAdvertisings },
              { icon: List, label: 'Setting Subcriptions', value: settingSubscriptions, set: setSettingSubscriptions },
              { icon: Settings, label: 'Functions Setting', value: functionsSetting, set: setFunctionsSetting },
              { icon: Package, label: 'Package Setting', value: packageSetting, set: setPackageSetting },
              { icon: Info, label: 'Info Settings', value: infoSettings, set: setInfoSettings },
              { icon: MessageCircle, label: 'Language (of your country)', value: languageCountry, set: setLanguageCountry },
              { icon: User, label: 'Settings for users', value: settingsForUsers, set: setSettingsForUsers },
            ].map(({ icon: Icon, label, value, set }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <button type="button" className="flex items-center gap-2 px-3 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
                  <Icon className="w-4 h-4" /> {label}
                </button>
                <ToggleOYON value={value} onChange={set} />
              </div>
            ))}
          </div>
        </section>

        {/* Other Settings - Permission of Access about Network members data */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <h2 className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm">Other Settings</h2>
          <p className="px-4 py-1 bg-gray-100 text-xs text-gray-700">Permission of Access about Network members data</p>
          <div className="bg-gray-200 p-4 space-y-4">
            {[
              { label: 'Subscription section', state: subscriptionSection, set: setSubscriptionSection },
              { label: 'Historical Access Logs', state: historicalAccessLogs, set: setHistoricalAccessLogs },
              { label: 'Bugs and error reports', state: bugsErrorReports, set: setBugsErrorReports },
              { label: 'Club section(except payments)', state: clubSection, set: setClubSection },
            ].map(({ label, state, set }) => (
              <div key={label} className="flex flex-wrap items-center gap-4">
                <input type="checkbox" checked={state.checked} onChange={(e) => set({ ...state, checked: e.target.checked })} className="rounded border-gray-400" />
                <span className="text-sm text-gray-800 w-48">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">My Country</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => set({ ...state, my: 'Yes' })} className={`px-2 py-1 text-xs rounded ${state.my === 'Yes' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-700'}`}>Yes</button>
                    <button type="button" onClick={() => set({ ...state, my: 'No' })} className={`px-2 py-1 text-xs rounded ${state.my === 'No' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-700'}`}>No</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Other Countries</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => set({ ...state, other: 'Yes' })} className={`px-2 py-1 text-xs rounded ${state.other === 'Yes' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-700'}`}>Yes</button>
                    <button type="button" onClick={() => set({ ...state, other: 'No' })} className={`px-2 py-1 text-xs rounded ${state.other === 'No' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-700'}`}>No</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

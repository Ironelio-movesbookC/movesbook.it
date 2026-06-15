'use client';

import { useMemo, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { getSubscriptionEditData } from '@/lib/admin/subscriptionSettingsMock';
import { getManagementSettingsData } from '@/lib/admin/managementFunctionSettingsMock';
import {
  getEntityDisplayTitle,
  getOverviewFeaturesForEntity,
  getSubscriptionRowForEntity,
  type RegistrationPackageCategory,
  type RegistrationSelectedEntity,
  type RegistrationUserType,
} from '@/lib/registration/waysToGetStarted';
import type { SubscriptionTier } from '@/types/adminSubscriptionSettings';

type EntityDetailTab =
  | 'overview'
  | 'detailed_overview'
  | 'availability_shares'
  | 'last_news'
  | 'club_pricelists';

type ClubPricelistTab =
  | 'versions_features'
  | 'optional_modules'
  | 'account_pricelist'
  | 'identification_devices'
  | 'others';

const ENTITY_TABS: { key: EntityDetailTab; label: string; clubOnly?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'detailed_overview', label: 'Detailed overview' },
  { key: 'availability_shares', label: 'Availability shares' },
  { key: 'last_news', label: 'Last news' },
  { key: 'club_pricelists', label: 'Club pricelists', clubOnly: true },
];

const CLUB_PRICELIST_TABS: { key: ClubPricelistTab; label: string }[] = [
  { key: 'versions_features', label: 'Versions and features' },
  { key: 'optional_modules', label: 'Optional Modules' },
  { key: 'account_pricelist', label: 'Account pricelist' },
  { key: 'identification_devices', label: 'Identification devices' },
  { key: 'others', label: 'Others' },
];

const SUBSCRIPTION_TIERS: { key: SubscriptionTier; label: string }[] = [
  { key: 'trial', label: 'Trial' },
  { key: 'base', label: 'Base' },
  { key: 'premium', label: 'Premium' },
  { key: 'pro', label: 'Pro' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30];

type RegistrationPackageEntityDetailPanelProps = {
  entity: RegistrationSelectedEntity;
  userType: RegistrationUserType;
  lang: string;
  category: RegistrationPackageCategory;
  onClose: () => void;
};

function NoImagePlaceholder() {
  return (
    <div className="flex h-16 w-16 items-center justify-center border border-gray-300 bg-gray-100 text-[9px] font-semibold uppercase text-gray-500 text-center leading-tight">
      No image available
    </div>
  );
}

function FeatureImage({ src }: { src: string }) {
  if (!src) return <NoImagePlaceholder />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-16 w-16 border border-gray-300 object-cover bg-white" />
  );
}

function OverviewTab({
  entity,
  userType,
  lang,
  category,
}: {
  entity: RegistrationSelectedEntity;
  userType: RegistrationUserType;
  lang: string;
  category: RegistrationPackageCategory;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const features = useMemo(
    () => getOverviewFeaturesForEntity(userType, entity.tierKey, lang, category),
    [userType, entity.tierKey, lang, category],
  );

  const totalPages = Math.max(1, Math.ceil(features.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageFeatures = features.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const title = getEntityDisplayTitle(userType, entity.versionLabel);

  return (
    <div className="flex flex-col h-full min-h-[320px]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 bg-white px-3 py-2">
        <div className="bg-[#337ab7] px-3 py-1.5 text-sm font-bold text-white">{title}</div>
        <div className="flex gap-2">
          <span className="bg-[#444] px-3 py-1.5 text-xs font-bold text-white">Overview</span>
          <span className="bg-[#888] px-3 py-1.5 text-xs font-bold text-white opacity-70">
            Back to versions features
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-[#f9f9f9] px-3 py-2 text-sm">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-gray-600">per page</span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border border-gray-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
          >
            Prev
          </button>
          <span className="border border-gray-300 bg-[#ddd] px-2 py-1 text-xs font-bold">
            {currentPage}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border border-gray-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {pageFeatures.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">No features available for this version.</p>
        ) : (
          pageFeatures.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-wrap items-start gap-3 border-b border-gray-200 px-4 py-4"
            >
              <div className="flex gap-2">
                <FeatureImage src={feature.pictures[0]} />
                <FeatureImage src={feature.pictures[1]} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[#5cb85c] stroke-[3]" />
                  <span className="font-bold text-gray-900">{feature.title}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{feature.langKey}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DetailedOverviewTab({
  entity,
  userType,
}: {
  entity: RegistrationSelectedEntity;
  userType: RegistrationUserType;
}) {
  const row = getSubscriptionRowForEntity(entity);
  const editData = entity.subscriptionId ? getSubscriptionEditData(entity.subscriptionId, false) : null;

  if (!row || !editData) {
    return (
      <p className="p-6 text-sm text-gray-600">Subscription details are not available for this version.</p>
    );
  }

  const roleLabel = userType === 'club' ? 'Club' : userType === 'coach' ? 'Coach' : 'Athlete';
  const tierValues =
    userType === 'club'
      ? [-1, 5, 10, 15]
      : [row.credit1, row.credit2, row.credit3, row.credit4];
  const tierCheckboxes =
    userType === 'coach' || userType === 'club'
      ? editData.settings.athleteTiers
      : editData.settings.coachTiers;
  const daysValue = row.days2 || row.days1;

  return (
    <div className="overflow-y-auto p-4">
      <h3 className="mb-4 text-base font-bold text-gray-800">
        Details of subscription{' '}
        <span className="text-red-600">
          {row.code} - {row.name}
        </span>
      </h3>

      <div className="mb-4 space-y-2 border border-gray-300 bg-white p-4">
        <div className="grid grid-cols-[180px_1fr] items-center gap-2 text-sm">
          <span className="text-gray-700">Code</span>
          <span className="text-gray-900">{editData.general.code}</span>
          <span className="text-gray-700">Name of subscriptions</span>
          <span className="text-gray-900">{editData.general.name}</span>
          <span className="text-gray-700">Days durations</span>
          <input
            readOnly
            value={editData.general.firstSubscriptionDays}
            className="w-24 border border-gray-300 bg-[#f0f0f0] px-2 py-1 text-sm"
          />
          <span className="text-gray-700">Price</span>
          <input
            readOnly
            value={editData.general.firstSubscriptionPrice}
            className="w-24 border border-gray-300 bg-[#f0f0f0] px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="border border-gray-300 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 border border-gray-300 bg-[#f5f5f5] p-2" />
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <th
                    key={tier.key}
                    className="border border-gray-300 bg-[#f5f5f5] p-2 text-center font-semibold"
                  >
                    <label className="flex flex-col items-center gap-1">
                      <input type="checkbox" readOnly checked={tierCheckboxes[tier.key]} />
                      {tier.label}
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 bg-[#f9f9f9] p-2 font-medium">{roleLabel}</td>
                {tierValues.map((value, index) => (
                  <td key={`role-${index}`} className="border border-gray-300 p-2 text-center">
                    <span className="inline-block min-w-[48px] border border-gray-300 bg-[#e8e8e8] px-2 py-1">
                      {value}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 bg-[#f9f9f9] p-2 font-medium">Days duration</td>
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <td key={`days-${tier.key}`} className="border border-gray-300 p-2 text-center">
                    <span className="inline-block min-w-[48px] border border-gray-300 bg-[#e8e8e8] px-2 py-1">
                      {daysValue}!
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-right text-xs text-gray-500">-1=Unlimited</p>
      </div>
    </div>
  );
}

function AvailabilitySharesTab({ entity }: { entity: RegistrationSelectedEntity }) {
  const row = getSubscriptionRowForEntity(entity);
  const editData = entity.subscriptionId ? getSubscriptionEditData(entity.subscriptionId, false) : null;

  if (!row || !editData) {
    return (
      <p className="p-6 text-sm text-gray-600">
        Availability settings are not available for this version.
      </p>
    );
  }

  const daysValue = row.days2 || row.days1;
  const settings = editData.settings;

  return (
    <div className="overflow-y-auto p-4 space-y-6">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-800">Days duration</div>
        <div className="flex flex-wrap items-center gap-2">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <span
              key={tier.key}
              className="inline-flex h-10 w-14 items-center justify-center border border-gray-300 bg-[#e8e8e8] text-sm"
            >
              {daysValue}!
            </span>
          ))}
          <span className="ml-auto border border-gray-300 px-2 py-1 text-xs text-gray-600">
            -1=Unlimited
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-800">Athletes</div>
        <div className="flex flex-wrap items-center gap-2">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <span
              key={tier.key}
              className="inline-flex h-10 w-14 items-center justify-center border border-gray-300 bg-[#e8e8e8] text-sm"
            >
              {settings.athleteTiers[tier.key] ? settings.athletesLimit : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="border border-gray-300 p-4">
        <p className="mb-3 text-sm text-gray-700">can be member of....</p>
        {(
          [
            { label: 'Teams', setting: settings.teams, shareLabel: 'Sharing with teams' },
            { label: 'Groups', setting: settings.groups, shareLabel: 'Sharing with groups' },
            { label: 'Clubs', setting: settings.clubs, shareLabel: 'Sharing with clubs' },
          ] as const
        ).map(({ label, setting, shareLabel }) => (
          <div
            key={label}
            className="grid grid-cols-[80px_60px_32px_32px_1fr] items-center gap-2 py-1"
          >
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm text-center">
              {setting.limit}
            </span>
            <div className="flex justify-center">
              <Share2 className="h-5 w-5 text-[#5cb85c]" />
            </div>
            <input type="checkbox" readOnly checked={setting.sharingEnabled} className="justify-self-center" />
            <span className="text-sm text-gray-600">{shareLabel}</span>
          </div>
        ))}
        <p className="mt-2 text-xs text-gray-500">-1=Unlimited</p>
      </div>
    </div>
  );
}

function LastNewsTab({ entity, lang }: { entity: RegistrationSelectedEntity; lang: string }) {
  const row = getSubscriptionRowForEntity(entity);
  const editData = entity.subscriptionId ? getSubscriptionEditData(entity.subscriptionId, false) : null;
  const newsHtml =
    editData?.settings.lastNewsByLang[lang] ||
    editData?.settings.lastNewsByLang.en ||
    editData?.general.sloganByLang[lang] ||
    editData?.general.sloganByLang.en ||
    '';

  const versionLabel = row?.name ?? entity.versionLabel;

  return (
    <div className="p-6">
      <h3 className="text-center text-lg font-bold text-[#7a1f2e]">Last news about this version</h3>
      <hr className="my-4 border-gray-200" />
      {newsHtml ? (
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: newsHtml }}
        />
      ) : (
        <div>
          <p className="text-center text-xl font-bold uppercase text-red-700">
            New features of <em>{versionLabel}</em>
          </p>
          <div className="mt-4 bg-gray-200 px-4 py-2">
            <span className="text-sm font-bold italic text-red-700">11 Nov 2021</span>
          </div>
          <p className="mt-3 text-sm italic text-gray-500">Elio</p>
        </div>
      )}
    </div>
  );
}

function ClubPricelistsTab({
  entity,
  lang,
  activeSubTab,
  onSubTabChange,
  onBack,
}: {
  entity: RegistrationSelectedEntity;
  lang: string;
  activeSubTab: ClubPricelistTab;
  onSubTabChange: (tab: ClubPricelistTab) => void;
  onBack: () => void;
}) {
  const managementData = getManagementSettingsData(lang);
  const row = getSubscriptionRowForEntity(entity);

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'versions_features':
        return (
          <div className="p-4 space-y-2">
            <p className="text-sm font-bold text-gray-800">
              Versions and features — {row?.name ?? entity.versionLabel}
            </p>
            <ul className="divide-y divide-gray-200 border border-gray-200">
              {managementData.features
                .filter((f) => f.basic || f.premium || f.pro)
                .map((feature) => (
                  <li key={feature.id} className="px-3 py-2 text-sm text-gray-800">
                    {feature.name}
                  </li>
                ))}
            </ul>
          </div>
        );
      case 'optional_modules':
        return (
          <div className="p-4">
            <p className="mb-3 text-sm font-bold text-gray-800">Optional Modules</p>
            <ul className="divide-y divide-gray-200 border border-gray-200">
              {managementData.features
                .filter((f) => f.optionalEnabled)
                .map((feature) => (
                  <li
                    key={feature.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>{feature.name}</span>
                    <span className="text-gray-600">
                      € {feature.priceOneYear} / € {feature.priceNoLimit}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        );
      case 'account_pricelist':
        return (
          <div className="p-4 text-sm text-gray-700">
            <p className="font-bold text-gray-800 mb-2">Account pricelist</p>
            <p>
              First subscription: {row?.days1 ?? '—'} days — € {row?.price1 ?? 0}
            </p>
            <p className="mt-1">
              Renewal: {row?.days2 ?? '—'} days — € {row?.price2 ?? 0}
            </p>
          </div>
        );
      case 'identification_devices':
        return (
          <div className="p-4 text-sm text-gray-700">
            <p className="font-bold text-gray-800 mb-2">Identification devices</p>
            <p>Device licensing and identification options for club management.</p>
          </div>
        );
      case 'others':
        return (
          <div className="p-4 text-sm text-gray-700">
            <p className="font-bold text-gray-800 mb-2">Others</p>
            <p>Additional club pricelist information for {entity.versionLabel}.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="flex flex-wrap border-b border-gray-300 bg-[#f0f0f0]">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 border-r border-gray-300"
        >
          Back
        </button>
        {CLUB_PRICELIST_TABS.map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSubTabChange(tab.key)}
              className={`px-3 py-2 text-xs font-bold border-r border-gray-300 transition-colors ${
                isActive ? 'bg-[#555] text-white' : 'bg-[#ddd] text-gray-800 hover:bg-[#ccc]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto bg-white">{renderSubTabContent()}</div>
    </div>
  );
}

export default function RegistrationPackageEntityDetailPanel({
  entity,
  userType,
  lang,
  category,
  onClose,
}: RegistrationPackageEntityDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<EntityDetailTab>('overview');
  const [clubSubTab, setClubSubTab] = useState<ClubPricelistTab>('versions_features');
  const [showClubSubNav, setShowClubSubNav] = useState(false);

  const visibleTabs = ENTITY_TABS.filter((tab) => !tab.clubOnly || userType === 'club');

  const handleTabClick = (tab: EntityDetailTab) => {
    if (tab === 'club_pricelists') {
      setShowClubSubNav(true);
      setActiveTab(tab);
      return;
    }
    setShowClubSubNav(false);
    setActiveTab(tab);
  };

  const handleClubBack = () => {
    setShowClubSubNav(false);
    setActiveTab('overview');
  };

  return (
    <div className="absolute inset-x-2 bottom-2 top-24 z-20 flex flex-col overflow-hidden rounded-md border-2 border-gray-400 bg-white shadow-2xl sm:inset-x-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-30 rounded-full bg-[#444] p-1 text-white hover:bg-black"
        aria-label="Close details"
      >
        <X className="h-4 w-4" />
      </button>

      {!showClubSubNav ? (
        <div className="flex flex-wrap border-b border-gray-300 bg-[#f0f0f0] pr-10">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`px-3 py-2 text-xs sm:text-sm font-bold border-r border-gray-300 transition-colors ${
                  isActive
                    ? 'bg-[#555] text-white'
                    : tab.clubOnly
                      ? 'bg-[#ddd] text-[#c71585] hover:bg-[#ccc]'
                      : 'bg-[#ddd] text-gray-800 hover:bg-[#ccc]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        {showClubSubNav && activeTab === 'club_pricelists' ? (
          <ClubPricelistsTab
            entity={entity}
            lang={lang}
            activeSubTab={clubSubTab}
            onSubTabChange={setClubSubTab}
            onBack={handleClubBack}
          />
        ) : activeTab === 'overview' ? (
          <OverviewTab entity={entity} userType={userType} lang={lang} category={category} />
        ) : activeTab === 'detailed_overview' ? (
          <DetailedOverviewTab entity={entity} userType={userType} />
        ) : activeTab === 'availability_shares' ? (
          <AvailabilitySharesTab entity={entity} />
        ) : activeTab === 'last_news' ? (
          <LastNewsTab entity={entity} lang={lang} />
        ) : null}
      </div>
    </div>
  );
}

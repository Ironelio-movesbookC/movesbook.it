'use client';

import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import SubscriptionMembershipSharingDisplay, {
  getSubscriptionSharingDaysValue,
} from '@/components/admin/subscriptions/SubscriptionMembershipSharingDisplay';
import RegistrationVersionLastNewsBlock from './RegistrationVersionLastNewsBlock';
import { getSubscriptionEditData } from '@/lib/admin/subscriptionSettingsMock';
import {
  getEntityDisplayTitle,
  getOverviewFeaturesForEntity,
  getSubscriptionRowForEntity,
  REGISTRATION_USER_TYPE_TABS,
  type RegistrationPackageCategory,
  type RegistrationSelectedEntity,
  type RegistrationUserType,
} from '@/lib/registration/waysToGetStarted';
import type { SubscriptionTier } from '@/types/adminSubscriptionSettings';
import RegistrationClubPricelistsPanel, {
  type ClubPricelistTab,
} from './RegistrationClubPricelistsPanel';

type EntityDetailTab =
  | 'overview'
  | 'detailed_overview'
  | 'availability_shares'
  | 'last_news'
  | 'club_pricelists';

const ENTITY_TABS: { key: EntityDetailTab; label: string; clubOnly?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'detailed_overview', label: 'Detailed overview' },
  { key: 'availability_shares', label: 'Availability shares' },
  { key: 'last_news', label: 'Last news' },
  { key: 'club_pricelists', label: 'Club pricelists', clubOnly: true },
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
  onClose?: () => void;
  /** When true, renders inline (dashboard) instead of as a modal overlay. */
  embedded?: boolean;
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

function AvailabilitySharesTab({
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
      <p className="p-6 text-sm text-gray-600">
        Availability settings are not available for this version.
      </p>
    );
  }

  const subscriptionUserType = REGISTRATION_USER_TYPE_TABS.find((t) => t.key === userType)
    ?.subscriptionType ?? 'athlete';

  return (
    <div className="overflow-y-auto p-4">
      <SubscriptionMembershipSharingDisplay
        settings={editData.settings}
        userType={subscriptionUserType}
        daysValue={getSubscriptionSharingDaysValue(row.days1, row.days2)}
        mode="registration"
      />
    </div>
  );
}

function LastNewsTab({ entity, lang }: { entity: RegistrationSelectedEntity; lang: string }) {
  const editData = entity.subscriptionId ? getSubscriptionEditData(entity.subscriptionId, false) : null;

  if (!editData) {
    return (
      <p className="p-6 text-sm text-gray-600">Last news is not available for this version.</p>
    );
  }

  return (
    <RegistrationVersionLastNewsBlock
      lastNewsByLang={editData.settings.lastNewsByLang}
      lang={lang}
      variant="tab"
    />
  );
}

export default function RegistrationPackageEntityDetailPanel({
  entity,
  userType,
  lang,
  category,
  onClose,
  embedded = false,
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

  const containerClass = embedded
    ? 'absolute inset-0 z-10 flex flex-col overflow-hidden bg-white'
    : 'absolute inset-x-2 bottom-2 top-24 z-20 flex flex-col overflow-hidden rounded-md border-2 border-gray-400 bg-white shadow-2xl sm:inset-x-4';

  return (
    <div className={containerClass}>
      {!embedded && onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-30 rounded-full bg-[#444] p-1 text-white hover:bg-black"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {!showClubSubNav ? (
        <div
          className={`flex flex-wrap border-b border-gray-300 bg-[#f0f0f0] ${embedded ? '' : 'pr-10'}`}
        >
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
          <RegistrationClubPricelistsPanel
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
          <AvailabilitySharesTab entity={entity} userType={userType} />
        ) : activeTab === 'last_news' ? (
          <LastNewsTab entity={entity} lang={lang} />
        ) : null}
      </div>
    </div>
  );
}

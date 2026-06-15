'use client';

import { useState, type ReactNode } from 'react';
import { Share2 } from 'lucide-react';
import {
  CLUB_ACCOUNT_PACK_ROWS,
  CLUB_IDENTIFICATION_DEVICE_TABS,
  CLUB_IDENTIFICATION_SECTIONS,
  CLUB_IDENTIFICATION_STYLE_TABS,
  CLUB_OTHERS_VERSIONS,
  CLUB_THIRD_PARTY_PRICELIST,
  getClubOptionalModuleRows,
  getClubVersionSubscriptionRows,
  type ClubAccountPackRow,
  type ClubDevicePriceGrid,
  type ClubOthersVersionData,
} from '@/lib/registration/clubPricelistsMock';

export type ClubPricelistTab =
  | 'versions_features'
  | 'optional_modules'
  | 'account_pricelist'
  | 'identification_devices'
  | 'others';

const CLUB_PRICELIST_TABS: { key: ClubPricelistTab; label: string }[] = [
  { key: 'versions_features', label: 'Versions and features' },
  { key: 'optional_modules', label: 'Optional Modules' },
  { key: 'account_pricelist', label: 'Account pricelist' },
  { key: 'identification_devices', label: 'Identification devices' },
  { key: 'others', label: 'Others' },
];

function PricelistTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold border border-gray-400 border-b-0 rounded-t ${
        active
          ? 'bg-black text-white'
          : 'bg-gradient-to-b from-[#e8e8e8] to-[#c8c8c8] text-gray-900 hover:from-[#ddd] hover:to-[#bbb]'
      }`}
    >
      {children}
    </button>
  );
}

function VersionsFeaturesView() {
  const rows = getClubVersionSubscriptionRows();

  return (
    <div className="flex justify-center p-6">
      <table className="w-full max-w-2xl border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-[#008b8b] text-white">
            <th className="border border-gray-300 px-4 py-2 text-left font-bold">Code</th>
            <th className="border border-gray-300 px-4 py-2 text-left font-bold">Name Subscription</th>
            <th className="border border-gray-300 px-4 py-2 text-right font-bold">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.code}-${row.name}`} className="bg-white">
              <td className="border border-gray-300 px-4 py-2">{row.code}</td>
              <td className="border border-gray-300 px-4 py-2">{row.name}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                EUR {row.price}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionalModulesView({ lang }: { lang: string }) {
  const rows = getClubOptionalModuleRows(lang);

  return (
    <div className="flex justify-center p-6">
      <table className="w-full max-w-3xl border-collapse border border-gray-400 text-sm bg-[#e8e8e8]">
        <thead>
          <tr className="bg-[#d0d0d0]">
            <th className="border border-gray-400 px-3 py-2 text-left font-bold w-16">Sr. no</th>
            <th className="border border-gray-400 px-3 py-2 text-left font-bold">List of features</th>
            <th className="border border-gray-400 px-3 py-2 text-center font-bold" colSpan={2}>
              Optionals
            </th>
          </tr>
          <tr className="bg-[#d0d0d0]">
            <th className="border border-gray-400" colSpan={2} />
            <th className="border border-gray-400 px-3 py-1 text-center text-xs font-bold">No limit</th>
            <th className="border border-gray-400 px-3 py-1 text-center text-xs font-bold">1 year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="bg-[#ececec]">
              <td className="border border-gray-400 px-3 py-2 text-center">{index + 1}</td>
              <td className="border border-gray-400 px-3 py-2">{row.name}</td>
              <td className="border border-gray-400 px-3 py-2 text-center">
                <input
                  readOnly
                  value={row.priceNoLimit}
                  className="w-16 border border-gray-400 bg-white px-2 py-1 text-center text-sm"
                />
              </td>
              <td className="border border-gray-400 px-3 py-2 text-center">
                <input
                  readOnly
                  value={row.priceOneYear}
                  className="w-16 border border-gray-400 bg-white px-2 py-1 text-center text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountPackSection({ section }: { section: ClubAccountPackRow }) {
  return (
    <div className="border border-gray-400 bg-[#f0f0f0]">
      <div
        className="px-4 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: section.headerColor }}
      >
        {section.versionLabel}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-end gap-2 pl-[140px]">
          {section.packSizes.map((size) => (
            <div
              key={size}
              className="w-16 bg-[#c0392b] text-white text-xs font-bold text-center py-1 border border-gray-600"
            >
              {size}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[130px] text-xs text-gray-800 shrink-0">Price for account in Pack</span>
          <span className="text-sm font-bold">€</span>
          {section.unitPrices.map((price, i) => (
            <input
              key={`unit-${i}`}
              readOnly
              value={price}
              className="w-16 border border-gray-400 bg-[#fffacd] px-1 py-1 text-center text-sm"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[130px] text-xs text-gray-800 shrink-0">Total Price</span>
          <span className="text-sm font-bold">€</span>
          {section.totalPrices.map((price, i) => (
            <input
              key={`total-${i}`}
              readOnly
              value={price}
              className="w-16 border border-gray-400 bg-yellow-300 px-1 py-1 text-center text-sm font-semibold"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountPricelistView() {
  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      {CLUB_ACCOUNT_PACK_ROWS.map((section) => (
        <AccountPackSection key={section.versionKey} section={section} />
      ))}
    </div>
  );
}

function DevicePriceGrid({ grid }: { grid: ClubDevicePriceGrid }) {
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-end gap-2 pl-[80px]">
        {grid.quantities.map((qty) => (
          <div
            key={qty}
            className="w-14 bg-[#c0392b] text-white text-[10px] font-bold text-center py-1 border border-gray-600"
          >
            {qty}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[70px] text-xs shrink-0">Price</span>
        <span className="text-xs font-bold">€</span>
        {grid.unitPrices.map((price, i) => (
          <input
            key={`p-${i}`}
            readOnly
            value={price}
            className="w-14 border border-gray-400 bg-[#fffacd] px-1 py-0.5 text-center text-xs"
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[70px] text-xs shrink-0">Total Price</span>
        <span className="text-xs font-bold">€</span>
        {grid.totalPrices.map((price, i) => (
          <input
            key={`t-${i}`}
            readOnly
            value={price}
            className="w-14 border border-gray-400 bg-yellow-300 px-1 py-0.5 text-center text-xs font-semibold"
          />
        ))}
      </div>
    </div>
  );
}

function IdentificationDevicesView() {
  const [deviceTab, setDeviceTab] = useState<string>(CLUB_IDENTIFICATION_DEVICE_TABS[0]);
  const [styleTab, setStyleTab] = useState<string>(CLUB_IDENTIFICATION_STYLE_TABS[0]);

  const thirdParty = CLUB_THIRD_PARTY_PRICELIST;

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="border border-gray-400">
        <div className="flex items-center justify-between bg-[#c0392b] px-3 py-2 text-white text-xs font-bold">
          <span>{thirdParty.title}</span>
          <span className="font-normal">{thirdParty.subtitle}</span>
        </div>
        <div className="flex flex-wrap gap-1 p-2 bg-[#f5f5f5] border-b border-gray-300">
          {CLUB_IDENTIFICATION_DEVICE_TABS.map((tab) => (
            <PricelistTabButton
              key={tab}
              active={deviceTab === tab}
              onClick={() => setDeviceTab(tab)}
            >
              {tab}
            </PricelistTabButton>
          ))}
        </div>
        <div className="bg-[#fffacd] p-3">
          <div className="flex items-end gap-2 pl-[100px] mb-2">
            {thirdParty.quantities.map((qty) => (
              <div
                key={qty}
                className="w-14 bg-[#c0392b] text-white text-[10px] font-bold text-center py-1"
              >
                {qty}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[90px] text-xs font-medium">Total Price</span>
            <span className="text-xs">€</span>
            {thirdParty.totals.map((total, i) => (
              <input
                key={i}
                readOnly
                value={total}
                className="w-14 border border-gray-400 bg-yellow-300 px-1 py-0.5 text-center text-xs"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {CLUB_IDENTIFICATION_STYLE_TABS.map((tab) => (
          <PricelistTabButton key={tab} active={styleTab === tab} onClick={() => setStyleTab(tab)}>
            {tab}
          </PricelistTabButton>
        ))}
      </div>

      {CLUB_IDENTIFICATION_SECTIONS.map((section) => {
        const grid = section.grids[styleTab] ?? Object.values(section.grids)[0];
        if (!grid) return null;
        return (
          <div key={section.key} className="border border-gray-400">
            <div
              className="px-3 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: section.headerColor }}
            >
              {section.label}
            </div>
            <div className="px-3 bg-white">
              <DevicePriceGrid grid={grid} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OthersVersionPanel({ data }: { data: ClubOthersVersionData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <div className="border border-gray-400 bg-[#e8e8e8]">
        <div className="bg-[#7a1f2e] px-3 py-2 text-white text-sm font-bold">Available sharing</div>
        <div className="p-3">
          <div className="mb-2 inline-block border border-gray-400 bg-white px-2 py-0.5 text-[10px]">
            {data.unlimitedLegend}
          </div>
          <div className="bg-[#337ab7] text-white text-xs font-bold px-2 py-1 mb-2">
            {data.sharingHeader}
          </div>
          <div className="space-y-1">
            {data.sharingRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[90px_60px_24px_60px_32px] items-center gap-2 text-xs"
              >
                <span className="font-medium">{row.label}</span>
                <input
                  readOnly
                  value={row.freeUntil}
                  className="border border-gray-400 bg-[#fffacd] px-1 py-1 text-center"
                />
                {row.costEach !== '' ? (
                  <>
                    <span>€</span>
                    <span>{row.costEach}</span>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white"
                      aria-label={`Share ${row.label}`}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span>€</span>
                    <span />
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center bg-[#5cb85c] text-white"
                      aria-label={`Share ${row.label}`}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-gray-400 bg-[#e8e8e8]">
        <div className="bg-[#337ab7] px-3 py-2 text-white text-sm font-bold">
          Permission for management section
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0">Exceeded the:</span>
            <input
              readOnly
              value={data.exceededDevice}
              className="w-12 border border-gray-400 bg-white px-2 py-1 text-center"
            />
            <span>th device</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0">Price:</span>
            <span>€</span>
            <span>{data.exceededPrice}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-28 shrink-0">Days durations:</span>
            <input
              readOnly
              value={data.daysDuration}
              className="w-16 border border-gray-400 bg-white px-2 py-1 text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OthersView() {
  const [versionTab, setVersionTab] = useState<'base' | 'premium' | 'pro'>('base');
  const active = CLUB_OTHERS_VERSIONS.find((v) => v.key === versionTab) ?? CLUB_OTHERS_VERSIONS[0];

  return (
    <div>
      <div className="flex flex-wrap gap-1 px-4 pt-3 border-b border-gray-300 bg-[#f5f5f5]">
        {CLUB_OTHERS_VERSIONS.map((version) => (
          <PricelistTabButton
            key={version.key}
            active={versionTab === version.key}
            onClick={() => setVersionTab(version.key)}
          >
            {version.label}
          </PricelistTabButton>
        ))}
      </div>
      <OthersVersionPanel data={active} />
    </div>
  );
}

type RegistrationClubPricelistsPanelProps = {
  lang: string;
  activeSubTab: ClubPricelistTab;
  onSubTabChange: (tab: ClubPricelistTab) => void;
  onBack: () => void;
};

export default function RegistrationClubPricelistsPanel({
  lang,
  activeSubTab,
  onSubTabChange,
  onBack,
}: RegistrationClubPricelistsPanelProps) {
  const renderContent = () => {
    switch (activeSubTab) {
      case 'versions_features':
        return <VersionsFeaturesView />;
      case 'optional_modules':
        return <OptionalModulesView lang={lang} />;
      case 'account_pricelist':
        return <AccountPricelistView />;
      case 'identification_devices':
        return <IdentificationDevicesView />;
      case 'others':
        return <OthersView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[320px] bg-[#eef6fc]">
      <div className="bg-[#7294c1] px-4 py-2.5 text-center text-sm font-bold text-white shrink-0">
        Club Pricelists
      </div>

      <div className="flex flex-wrap items-end gap-0 border-b border-black bg-[#f0f0f0] px-2 pt-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="mr-2 mb-0.5 px-3 py-1.5 text-xs font-bold text-gray-800 border border-gray-400 bg-[#ddd] hover:bg-[#ccc] rounded"
        >
          Back
        </button>
        {CLUB_PRICELIST_TABS.map((tab) => (
          <PricelistTabButton
            key={tab.key}
            active={activeSubTab === tab.key}
            onClick={() => onSubTabChange(tab.key)}
          >
            {tab.label}
          </PricelistTabButton>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#eef6fc]">{renderContent()}</div>
    </div>
  );
}

export { CLUB_PRICELIST_TABS };

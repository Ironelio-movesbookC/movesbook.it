'use client';

import { useState } from 'react';
import {
  CLUB_IDENTIFICATION_DEVICE_TABS,
  CLUB_IDENTIFICATION_SECTIONS,
  CLUB_IDENTIFICATION_STYLE_TABS,
  CLUB_THIRD_PARTY_PRICELIST,
  type ClubDevicePriceGrid,
} from '@/lib/registration/clubPricelistsMock';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function DevicePriceGrid({ grid }: { grid: ClubDevicePriceGrid }) {
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-end gap-2 pl-[80px]">
        {grid.quantities.map((qty) => (
          <div
            key={qty}
            className="w-14 border border-gray-600 bg-[#c0392b] py-1 text-center text-[10px] font-bold text-white"
          >
            {qty}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-[70px] shrink-0 text-xs">Price</span>
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
        <span className="w-[70px] shrink-0 text-xs">Total Price</span>
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

export default function ClubIdentificationCardsPricelistPanel() {
  const [deviceTab, setDeviceTab] = useState<string>(CLUB_IDENTIFICATION_DEVICE_TABS[0]);
  const [styleTab, setStyleTab] = useState<string>(CLUB_IDENTIFICATION_STYLE_TABS[0]);
  const thirdParty = CLUB_THIRD_PARTY_PRICELIST;

  return (
    <div className="space-y-3 text-sm">
      <div className="border border-gray-400">
        <div className="flex items-center justify-between bg-[#c0392b] px-3 py-2 text-xs font-bold text-white">
          <span>{thirdParty.title}</span>
          <span className="font-normal">{thirdParty.subtitle}</span>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-gray-300 bg-[#f5f5f5] p-2">
          {CLUB_IDENTIFICATION_DEVICE_TABS.map((tab) => (
            <TabButton key={tab} active={deviceTab === tab} onClick={() => setDeviceTab(tab)}>
              {tab}
            </TabButton>
          ))}
        </div>
        <div className="bg-[#fffacd] p-3">
          <div className="mb-2 flex items-end gap-2 pl-[100px]">
            {thirdParty.quantities.map((qty) => (
              <div
                key={qty}
                className="w-14 bg-[#c0392b] py-1 text-center text-[10px] font-bold text-white"
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
          <TabButton key={tab} active={styleTab === tab} onClick={() => setStyleTab(tab)}>
            {tab}
          </TabButton>
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
            <div className="bg-white px-3">
              <DevicePriceGrid grid={grid} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

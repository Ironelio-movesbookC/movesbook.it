'use client';

import { useMemo, useState } from 'react';
import type {
  ClubDevicePriceGridConfig,
  ClubIdentificationCardsSettings,
} from '@/types/clubIdentificationCards';
import {
  CLUB_IDENTIFICATION_DEVICE_TAB_LABELS,
  CLUB_IDENTIFICATION_STYLE_TAB_LABELS,
  getClubIdentificationCardsSettings,
  recalcDeviceGrid,
  saveClubIdentificationCardsSettings,
} from '@/lib/admin/clubIdentificationCardsMock';
import ClubIdentificationCardPricingSections from '@/components/club/ClubIdentificationCardPricingSections';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import RichTextEditor from '@/components/shared/RichTextEditor';

export default function ClubIdentificationCardsPricelistPanel() {
  const initialSettings = useMemo(() => getClubIdentificationCardsSettings(), []);
  const [settings, setSettings] = useState<ClubIdentificationCardsSettings>(initialSettings);
  const [activeLang, setActiveLang] = useState('en');
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<ClubIdentificationCardsSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const updateThirdPartyMessage = (html: string) => {
    setSettings((prev) => ({
      ...prev,
      thirdPartyMessageByLang: { ...prev.thirdPartyMessageByLang, [activeLang]: html },
    }));
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    saveClubIdentificationCardsSettings(settings);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  };

  const handleThirdPartyChange = (
    deviceIndex: number,
    pricelist: ClubIdentificationCardsSettings['thirdPartyPricelists'][0],
  ) => {
    setSettings((prev) => {
      const thirdPartyPricelists = [...prev.thirdPartyPricelists];
      thirdPartyPricelists[deviceIndex] = pricelist;
      const next = { ...prev, thirdPartyPricelists };
      saveClubIdentificationCardsSettings(next);
      return next;
    });
  };

  const handleDeviceSectionChange = (
    sectionIndex: number,
    style: string,
    grid: ClubDevicePriceGridConfig,
  ) => {
    setSettings((prev) => {
      const deviceSections = [...prev.deviceSections];
      const section = { ...deviceSections[sectionIndex] };
      section.grids = { ...section.grids, [style]: grid };
      deviceSections[sectionIndex] = section;
      return { ...prev, deviceSections };
    });
  };

  const handleDeviceSectionUpdate = (sectionIndex: number, style: string) => {
    setSettings((prev) => {
      const deviceSections = [...prev.deviceSections];
      const section = { ...deviceSections[sectionIndex] };
      const grid = section.grids[style as keyof typeof section.grids];
      if (grid) {
        section.grids = {
          ...section.grids,
          [style]: recalcDeviceGrid(grid),
        };
      }
      deviceSections[sectionIndex] = section;
      const next = saveClubIdentificationCardsSettings({ ...prev, deviceSections });
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="border border-gray-300">
        <div className="bg-[#a94442] px-4 py-2 text-sm font-bold text-white">
          Message to be displayed upon the third party pricelist
        </div>
        <div className="space-y-3 bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.thirdPartyMessageEnabled}
              onChange={(e) => update({ thirdPartyMessageEnabled: e.target.checked })}
            />
            Enable message
          </label>
          <SubscriptionLanguageTabs
            activeLang={activeLang}
            onChange={setActiveLang}
            label="Enter for each language"
            variant="lower"
          />
          <RichTextEditor
            value={settings.thirdPartyMessageByLang[activeLang] ?? ''}
            onChange={updateThirdPartyMessage}
            minHeight="220px"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveMessage()}
            className="bg-[#c0392b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#962d22] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Update Terms'}
          </button>
        </div>
      </div>

      <div className="border border-gray-300">
        <div className="bg-[#8e44ad] px-4 py-2 text-sm font-bold text-white">
          Identification card pricelist —{' '}
          <span className="font-normal">
            configured here; shown to club admins only during registration (not after)
          </span>
        </div>
        <div className="space-y-4 bg-white p-4">
          <ClubIdentificationCardPricingSections
            thirdPartyPricelists={settings.thirdPartyPricelists}
            deviceSections={settings.deviceSections}
            deviceTabLabels={CLUB_IDENTIFICATION_DEVICE_TAB_LABELS}
            styleTabLabels={CLUB_IDENTIFICATION_STYLE_TAB_LABELS}
            mode="admin-edit"
            onThirdPartyChange={handleThirdPartyChange}
            onDeviceSectionChange={handleDeviceSectionChange}
            onDeviceSectionUpdate={handleDeviceSectionUpdate}
          />
        </div>
      </div>
    </div>
  );
}

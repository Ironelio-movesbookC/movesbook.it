'use client';

import { useState } from 'react';
import type { ClubPurchaseAccountPack, ClubPurchaseAccountsSettings } from '@/types/clubPurchaseAccounts';
import {
  recalcPackTotals,
  saveClubPurchaseAccountsSettings,
} from '@/lib/admin/clubPurchaseAccountsMock';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import RichTextEditor from '@/components/shared/RichTextEditor';

type ClubPurchaseNewAccountsPanelProps = {
  initialSettings: ClubPurchaseAccountsSettings;
};

function YesNoRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name={name}
          checked={value}
          onChange={() => onChange(true)}
        />
        Y
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="radio"
          name={name}
          checked={!value}
          onChange={() => onChange(false)}
        />
        N
      </label>
    </div>
  );
}

function AccountPackEditor({
  pack,
  onChange,
  onUpdate,
}: {
  pack: ClubPurchaseAccountPack;
  onChange: (pack: ClubPurchaseAccountPack) => void;
  onUpdate: () => void;
}) {
  const updateUnitPrice = (index: number, raw: string) => {
    const unitPrices = [...pack.unitPrices];
    unitPrices[index] = Number(raw) || 0;
    onChange(recalcPackTotals({ ...pack, unitPrices }));
  };

  const togglePack = (index: number) => {
    const packEnabled = [...pack.packEnabled];
    packEnabled[index] = !packEnabled[index];
    onChange({ ...pack, packEnabled });
  };

  return (
    <div className="border border-gray-400 bg-[#f0f0f0]">
      <div
        className="px-4 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: pack.headerColor }}
      >
        {pack.versionLabel}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-end gap-2 pl-[150px]">
          {pack.packSizes.map((size, i) => (
            <div key={size} className="flex w-16 flex-col items-center gap-1">
              <div className="w-full bg-[#c0392b] py-1 text-center text-xs font-bold text-white border border-gray-600">
                {size}
              </div>
              <input
                type="checkbox"
                checked={pack.packEnabled[i] ?? false}
                onChange={() => togglePack(i)}
                className="h-4 w-4"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[140px] shrink-0 text-xs text-gray-800">Price for account in Pack</span>
          <span className="text-sm font-bold">€</span>
          {pack.unitPrices.map((price, i) => (
            <input
              key={`unit-${pack.versionKey}-${i}`}
              type="text"
              value={price}
              onChange={(e) => updateUnitPrice(i, e.target.value)}
              className="w-16 border border-gray-400 bg-[#fffacd] px-1 py-1 text-center text-sm"
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-[140px] shrink-0 text-xs text-gray-800">Total Price</span>
          <span className="text-sm font-bold">€</span>
          {pack.totalPrices.map((price, i) => (
            <input
              key={`total-${pack.versionKey}-${i}`}
              readOnly
              value={price}
              className="w-16 border border-gray-400 bg-yellow-300 px-1 py-1 text-center text-sm font-semibold"
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-gray-300 pt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Standard price of single account</span>
            <span className="font-bold">€</span>
            <input
              type="text"
              value={pack.standardPrice}
              onChange={(e) =>
                onChange({ ...pack, standardPrice: Number(e.target.value) || 0 })
              }
              className="w-20 border border-gray-400 bg-[#e8d5f5] px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Reselling suggestion</span>
            <span className="font-bold">€</span>
            <input
              type="text"
              value={pack.resellingSuggestion}
              onChange={(e) =>
                onChange({ ...pack, resellingSuggestion: Number(e.target.value) || 0 })
              }
              className="w-20 border border-gray-400 bg-white px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Dura</span>
            <input
              type="text"
              value={pack.durationDays}
              onChange={(e) =>
                onChange({ ...pack, durationDays: Number(e.target.value) || 0 })
              }
              className="w-16 border border-gray-400 bg-white px-2 py-1 text-center"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onUpdate}
            className="bg-[#c0392b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#962d22]"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClubPurchaseNewAccountsPanel({
  initialSettings,
}: ClubPurchaseNewAccountsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [activeLang, setActiveLang] = useState('en');
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<ClubPurchaseAccountsSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const updatePack = (index: number, pack: ClubPurchaseAccountPack) => {
    setSettings((prev) => {
      const accountPacks = [...prev.accountPacks];
      accountPacks[index] = pack;
      return { ...prev, accountPacks };
    });
  };

  const updateActivationMessage = (html: string) => {
    setSettings((prev) => ({
      ...prev,
      activationMessageByLang: { ...prev.activationMessageByLang, [activeLang]: html },
    }));
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    saveClubPurchaseAccountsSettings(settings);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  };

  const handlePackUpdate = (index: number) => {
    const pack = settings.accountPacks[index];
    if (!pack) return;
    const next = recalcPackTotals(pack);
    const accountPacks = [...settings.accountPacks];
    accountPacks[index] = next;
    const updated = saveClubPurchaseAccountsSettings({ ...settings, accountPacks });
    setSettings(updated);
  };

  return (
    <div className="space-y-4">
      <div className="border border-gray-300">
        <div className="bg-[#f0ad4e] px-4 py-2 text-sm font-bold text-gray-900">
          Setting block for payment of the subscription without credit card or cash
        </div>
        <div className="space-y-4 bg-white p-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-gray-800">Credit card</span>
            <YesNoRadio
              name="credit-card"
              value={!settings.paymentWithoutCreditCard}
              onChange={(creditCard) => update({ paymentWithoutCreditCard: !creditCard })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
            <span>Send money later and before of</span>
            <input
              type="text"
              value={settings.sendMoneyLaterDays}
              onChange={(e) => update({ sendMoneyLaterDays: Number(e.target.value) || 0 })}
              className="w-14 border border-gray-300 bg-[#fffacd] px-2 py-1 text-center"
            />
            <span>days</span>
          </div>
        </div>
      </div>

      <div className="border border-gray-300">
        <div className="bg-[#a94442] px-4 py-2 text-sm font-bold text-white">
          Message to be displayed after the activation of the accounts but not payed
        </div>
        <div className="space-y-3 bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.activationMessageEnabled}
              onChange={(e) => update({ activationMessageEnabled: e.target.checked })}
            />
            Enable message
          </label>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>Days after the assignments of the accounts</span>
            <select
              value={settings.activationDaysAfterAssignment}
              onChange={(e) =>
                update({ activationDaysAfterAssignment: Number(e.target.value) })
              }
              className="border border-gray-300 bg-white px-2 py-1"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  ({d}-30)
                </option>
              ))}
            </select>
            <span>days</span>
          </div>
          <SubscriptionLanguageTabs
            activeLang={activeLang}
            onChange={setActiveLang}
            label="Edit for each language"
            variant="lower"
          />
          <RichTextEditor
            value={settings.activationMessageByLang[activeLang] ?? ''}
            onChange={updateActivationMessage}
            minHeight="220px"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSaveTerms()}
            className="bg-[#c0392b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#962d22] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Update Terms'}
          </button>
        </div>
      </div>

      <div className="border border-gray-300">
        <div className="bg-[#8e44ad] px-4 py-2 text-sm font-bold text-white">
          Purchase accounts -{' '}
          <span className="font-normal">Clubs can always buy accounts for their athletes</span>
        </div>
        <div className="space-y-4 bg-white p-4">
          {settings.accountPacks.map((pack, index) => (
            <AccountPackEditor
              key={pack.versionKey}
              pack={pack}
              onChange={(next) => updatePack(index, next)}
              onUpdate={() => handlePackUpdate(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

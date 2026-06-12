'use client';

import type { SubscriptionGeneralSettings, SubscriptionListRow } from '@/types/adminSubscriptionSettings';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import RichTextEditor from '@/components/shared/RichTextEditor';

type SubscriptionGeneralFormProps = {
  general: SubscriptionGeneralSettings;
  row: SubscriptionListRow;
  activeLang: string;
  onLangChange: (lang: string) => void;
  onChange: (general: SubscriptionGeneralSettings) => void;
};

function FieldInput({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-700 whitespace-nowrap">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-24 focus:outline-none focus:border-gray-400"
      />
    </div>
  );
}

export default function SubscriptionGeneralForm({
  general,
  row,
  activeLang,
  onLangChange,
  onChange,
}: SubscriptionGeneralFormProps) {
  const update = (patch: Partial<SubscriptionGeneralSettings>) => {
    onChange({ ...general, ...patch });
  };

  const updateSlogan = (html: string) => {
    onChange({
      ...general,
      sloganByLang: { ...general.sloganByLang, [activeLang]: html },
    });
  };

  return (
    <div className="border border-gray-300 mb-4">
      <div className="bg-[#5cb85c] text-white px-4 py-2 font-bold text-sm">General</div>
      <div className="p-4 space-y-4 bg-white">
        <div className="flex flex-wrap gap-6">
          <FieldInput
            label="Code :"
            value={general.code}
            onChange={(v) => update({ code: v })}
          />
          <FieldInput
            label="Name of subscriptions :"
            value={general.name}
            onChange={(v) => update({ name: v })}
            className="flex-1"
          />
        </div>

        <div className="border border-gray-300">
          <div className="bg-[#337ab7] text-white px-3 py-1.5 text-xs font-bold">
            Credit acquired % discount for clubs\teams athletes\coaches max discount
          </div>
          <div className="p-3 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-red-600 flex-1 min-w-[200px]">
                  For the sender user each time an user suggested will register itself
                </span>
                <input
                  type="text"
                  value={general.senderRegisterCredit1}
                  onChange={(e) => update({ senderRegisterCredit1: Number(e.target.value) || 0 })}
                  className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
                />
                <input
                  type="text"
                  value={general.senderRegisterCredit2}
                  onChange={(e) => update({ senderRegisterCredit2: Number(e.target.value) || 0 })}
                  className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-red-600 flex-1 min-w-[200px]">
                  For the user that receive the invitation and declare to register itself
                </span>
                <input
                  type="text"
                  value={general.receiverRegisterCredit1}
                  onChange={(e) => update({ receiverRegisterCredit1: Number(e.target.value) || 0 })}
                  className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
                />
                <input
                  type="text"
                  value={general.receiverRegisterCredit2}
                  onChange={(e) => update({ receiverRegisterCredit2: Number(e.target.value) || 0 })}
                  className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
                />
              </div>
            </div>
            <div className="flex items-start">
              <input
                type="text"
                value={general.maxDiscount}
                onChange={(e) => update({ maxDiscount: Number(e.target.value) || 0 })}
                className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-300">
          <div className="bg-[#a94442] text-white px-3 py-1.5 text-xs font-bold">
            Promocode used to earn credits
          </div>
          <div className="p-3 flex flex-wrap items-center gap-4">
            <FieldInput
              label="Duration days of promocode"
              value={general.promocodeDurationDays}
              onChange={(v) => update({ promocodeDurationDays: Number(v) || 0 })}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Assign</span>
              <button
                type="button"
                onClick={() => update({ promocodeAssign: !general.promocodeAssign })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  general.promocodeAssign ? 'bg-[#5cb85c]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    general.promocodeAssign ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
            <button type="button" className="text-sm text-[#337ab7] hover:underline">
              Create random
            </button>
          </div>
        </div>

        <div className="border border-gray-300">
          <div className="bg-[#5bc0de] text-white px-3 py-1.5 text-xs font-bold">
            1th subscription {row.name}
          </div>
          <div className="p-3 flex flex-wrap gap-6">
            <FieldInput
              label="Days durations :"
              value={general.firstSubscriptionDays}
              onChange={(v) => update({ firstSubscriptionDays: Number(v) || 0 })}
            />
            <FieldInput
              label="Price 1th subscription :"
              value={general.firstSubscriptionPrice}
              onChange={(v) => update({ firstSubscriptionPrice: Number(v) || 0 })}
            />
            <FieldInput
              label="Discount with promocode:"
              value={general.firstSubscriptionPromoDiscount}
              onChange={(v) => update({ firstSubscriptionPromoDiscount: Number(v) || 0 })}
            />
          </div>
        </div>

        <div className="border border-gray-300">
          <div className="bg-[#5bc0de] text-white px-3 py-1.5 text-xs font-bold">
            Standard or renewal
          </div>
          <div className="p-3 flex flex-wrap gap-6">
            <FieldInput
              label="Days durations :"
              value={general.renewalDays}
              onChange={(v) => update({ renewalDays: Number(v) || 0 })}
            />
            <FieldInput
              label="Price for the renewal :"
              value={general.renewalPrice}
              onChange={(v) => update({ renewalPrice: Number(v) || 0 })}
            />
            <FieldInput
              label="Discount with promocode:"
              value={general.renewalPromoDiscount}
              onChange={(v) => update({ renewalPromoDiscount: Number(v) || 0 })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-200">
          <FieldInput
            label="Discount Triple Duration %"
            value={general.tripleDurationDiscount}
            onChange={(v) => update({ tripleDurationDiscount: Number(v) || 0 })}
          />
          <FieldInput
            label="Price :"
            value={general.tripleDurationPrice}
            onChange={(v) => update({ tripleDurationPrice: Number(v) || 0 })}
          />
        </div>

        <div className="border border-gray-300">
          <div className="px-3 py-2 text-sm text-gray-700 bg-[#f5f5f5] border-b border-gray-200">
            Slogan (Select a language to edit for each language)
          </div>
          <SubscriptionLanguageTabs activeLang={activeLang} onChange={onLangChange} />
          <div className="p-2">
            <RichTextEditor
              value={general.sloganByLang[activeLang] ?? ''}
              onChange={updateSlogan}
              minHeight="200px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

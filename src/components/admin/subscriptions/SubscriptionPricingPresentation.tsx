'use client';

import { useState } from 'react';
import type { SubscriptionGeneralSettings } from '@/types/adminSubscriptionSettings';
import {
  formatSubscriptionPrice,
  getScenarioPricing,
  getTripleSubscriptionPricing,
  type SubscriptionPricingScenario,
} from '@/lib/admin/subscriptionPricingPresentation';
import RegistrationSubscriptionPricingBlock from '@/components/register/RegistrationSubscriptionPricingBlock';

type SubscriptionPricingPresentationProps = {
  general: SubscriptionGeneralSettings;
};

const SCENARIOS: { key: SubscriptionPricingScenario; label: string; hint: string }[] = [
  {
    key: 'first',
    label: 'First subscription',
    hint: 'Uses the 1th subscription price and duration — shown at the top during first registration',
  },
  {
    key: 'renewal',
    label: 'Renewal',
    hint: 'Uses the Standard or renewal price and duration — shown when renewing an existing subscription',
  },
];

function PricingValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded border px-3 py-2 ${
        highlight ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-[#fffacd]'
      }`}
    >
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function SubscriptionPricingPresentation({
  general,
}: SubscriptionPricingPresentationProps) {
  const [scenario, setScenario] = useState<SubscriptionPricingScenario>('first');
  const standard = getScenarioPricing(general, scenario);
  const triple = getTripleSubscriptionPricing(general, scenario);

  return (
    <div className="border border-gray-300">
      <div className="bg-[#337ab7] px-3 py-1.5 text-xs font-bold text-white">
        Presentation preview — subscription cost shown during registration
      </div>

      <div className="space-y-4 bg-white p-4">
        <p className="text-xs text-gray-700">
          Every subscription displays a <span className="font-semibold">duration</span> and{' '}
          <span className="font-semibold">price</span>. Switch scenario to preview first-time vs
          renewal pricing. The triple option always appears below the standard cost on the
          registration screen.
        </p>

        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((item) => {
            const active = scenario === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScenario(item.key)}
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#337ab7] text-white'
                    : 'bg-[#e6e6e6] text-gray-700 hover:bg-[#ddd]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-600">
          {SCENARIOS.find((item) => item.key === scenario)?.hint}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="border border-gray-300">
              <div className="bg-[#5bc0de] px-3 py-1.5 text-xs font-bold text-white">
                {standard.title}
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-3">
                <PricingValue label="Days duration" value={`${standard.days} days`} highlight />
                <PricingValue
                  label="Price"
                  value={formatSubscriptionPrice(standard.price)}
                  highlight
                />
                <PricingValue
                  label="Discount with promocode"
                  value={`${standard.promoDiscount}%`}
                />
              </div>
              <div className="border-t border-gray-200 px-3 py-2 text-sm text-gray-700">
                Cost with promocode applied:{' '}
                <span className="font-bold text-[#337ab7]">
                  {formatSubscriptionPrice(standard.priceAfterPromo)}
                </span>
              </div>
            </div>

            <div className="border border-gray-300">
              <div className="bg-[#f5f5f5] px-3 py-1.5 text-xs font-bold text-gray-800">
                Triple subscription option (under standard cost during registration)
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-3">
                <PricingValue label="Duration (3× standard)" value={`${triple.days} days`} />
                <PricingValue
                  label="Discount Triple Duration %"
                  value={`${triple.discountPercent}%`}
                  highlight
                />
                <PricingValue
                  label="Price"
                  value={formatSubscriptionPrice(triple.price)}
                  highlight
                />
              </div>
              <div className="border-t border-gray-200 px-3 py-2 text-sm text-gray-700">
                Triple price with promocode:{' '}
                <span className="font-bold text-[#337ab7]">
                  {formatSubscriptionPrice(triple.priceAfterPromo)}
                </span>
                {triple.standardTriplePrice > triple.price ? (
                  <span className="ml-2 text-green-700">
                    (save {formatSubscriptionPrice(triple.standardTriplePrice - triple.price)} vs 3×
                    standard)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">
              Registration screen preview
            </div>
            <RegistrationSubscriptionPricingBlock
              general={general}
              scenario={scenario}
              showTripleOption
            />
          </div>
        </div>
      </div>
    </div>
  );
}

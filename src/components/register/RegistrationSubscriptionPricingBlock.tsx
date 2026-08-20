'use client';

import type { SubscriptionGeneralSettings } from '@/types/adminSubscriptionSettings';
import {
  formatSubscriptionPrice,
  getScenarioPricing,
  getTripleSubscriptionPricing,
  type SubscriptionPricingScenario,
} from '@/lib/admin/subscriptionPricingPresentation';
import RegistrationMonthlyCostLine from './RegistrationMonthlyCostLine';

type RegistrationSubscriptionPricingBlockProps = {
  general: SubscriptionGeneralSettings;
  scenario?: SubscriptionPricingScenario;
  showTripleOption?: boolean;
};

export default function RegistrationSubscriptionPricingBlock({
  general,
  scenario = 'first',
  showTripleOption = true,
}: RegistrationSubscriptionPricingBlockProps) {
  const standard = getScenarioPricing(general, scenario);
  const triple = getTripleSubscriptionPricing(general, scenario);

  return (
    <div className="rounded-md border border-[#7a1f2e]/30 bg-white p-3 space-y-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-[#7a1f2e]">
          {scenario === 'first' ? 'First subscription' : 'Renewal subscription'}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-xl font-bold text-gray-900">
            {formatSubscriptionPrice(standard.price)}
          </span>
          <span className="text-sm font-medium text-gray-700">
            Duration: {standard.days} days
          </span>
          <RegistrationMonthlyCostLine price={standard.price} durationDays={standard.days} />
          {standard.promoDiscount > 0 ? (
            <span className="text-sm text-green-700">
              With promocode: {formatSubscriptionPrice(standard.priceAfterPromo)} (
              {standard.promoDiscount}% off)
              <RegistrationMonthlyCostLine
                price={standard.priceAfterPromo}
                durationDays={standard.days}
                className="ml-2 inline"
              />
            </span>
          ) : null}
        </div>
      </div>

      {showTripleOption ? (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-[#337ab7]">
            Triple subscription
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Extended duration with extra discount — optional choice below the standard cost
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-lg font-bold text-gray-900">
              {formatSubscriptionPrice(triple.price)}
            </span>
            <span className="text-sm font-medium text-gray-700">
              Duration: {triple.days} days
            </span>
            <RegistrationMonthlyCostLine price={triple.price} durationDays={triple.days} />
            <span className="text-sm font-semibold text-green-700">
              {triple.discountPercent}% triple discount
            </span>
            {standard.promoDiscount > 0 ? (
              <span className="text-sm text-green-700">
                With promocode: {formatSubscriptionPrice(triple.priceAfterPromo)}
                <RegistrationMonthlyCostLine
                  price={triple.priceAfterPromo}
                  durationDays={triple.days}
                  className="ml-2 inline"
                />
              </span>
            ) : null}
          </div>
          {triple.standardTriplePrice > triple.price ? (
            <p className="mt-1 text-xs text-green-800">
              Save {formatSubscriptionPrice(triple.standardTriplePrice - triple.price)} compared to
              buying 3× the standard period
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

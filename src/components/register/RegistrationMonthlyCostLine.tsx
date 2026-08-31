'use client';

import { formatMonthlyCostExpression } from '@/lib/admin/subscriptionPricingPresentation';

type RegistrationMonthlyCostLineProps = {
  price: number;
  durationDays: number;
  className?: string;
};

export default function RegistrationMonthlyCostLine({
  price,
  durationDays,
  className = '',
}: RegistrationMonthlyCostLineProps) {
  const text = formatMonthlyCostExpression(price, durationDays);
  if (!text) return null;

  return (
    <span className={`text-xs text-gray-600 whitespace-nowrap ${className}`.trim()}>{text}</span>
  );
}

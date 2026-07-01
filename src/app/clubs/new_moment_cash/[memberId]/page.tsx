'use client';

import ServicePurchaseForm from '@/components/club/services/ServicePurchaseForm';

type Props = {
  params: { memberId: string };
};

export default function NewMomentCashMemberPage({ params }: Props) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-teal-800 text-white px-6 py-4">
        <h1 className="text-xl font-semibold">Services for the customers</h1>
        <p className="text-sm text-teal-100 mt-1">
          Register a service sale and optionally record a payment in the same form.
        </p>
      </div>
      <ServicePurchaseForm initialMemberId={params.memberId} />
    </div>
  );
}

'use client';

import PromocodeAddForm from '@/components/promocodes/PromocodeAddForm';
import { usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';

export default function PromocodesAddPage() {
  const ready = usePromocodesAdminAuth();

  if (!ready) return null;

  return (
    <div className="max-w-[980px] mx-auto">
      <PromocodeAddForm />
    </div>
  );
}

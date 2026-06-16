'use client';

import PromocodeAddForm from '@/components/promocodes/PromocodeAddForm';
import PromocodeAddHeader, { PromocodeFormLoading } from '@/components/promocodes/PromocodeAddHeader';
import { usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import '@/components/promocodes/promocode-edit.css';

export default function PromocodesAddPage() {
  const ready = usePromocodesAdminAuth();

  if (!ready) {
    return <PromocodeFormLoading />;
  }

  return (
    <div className="promocodes-page promocode-edit-shell">
      <PromocodeAddHeader />
      <PromocodeAddForm />
    </div>
  );
}

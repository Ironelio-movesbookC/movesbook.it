'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PromocodeAddForm from '@/components/promocodes/PromocodeAddForm';
import PromocodeEditHeader, { PromocodeFormLoading } from '@/components/promocodes/PromocodeEditHeader';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import type { PromocodeSettingRow } from '@/lib/promocodes/types';
import '@/components/promocodes/promocode-edit.css';

export default function PromocodesEditPage() {
  const ready = usePromocodesAdminAuth();
  const params = useParams();
  const id = parseInt(String(params?.id ?? ''), 10);
  const [setting, setSetting] = useState<PromocodeSettingRow | null>(null);
  const [socialOptions, setSocialOptions] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !Number.isFinite(id)) return;
    promocodesFetch(`/api/admin/promocodes/settings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSetting(data.setting ?? null);
        setSocialOptions(data.setting?.socialOptionsParsed ?? {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, id]);

  if (!ready || loading) {
    return <PromocodeFormLoading />;
  }

  if (!setting) {
    return (
      <div className="promocode-edit-not-found">
        <h2>Promocode not found</h2>
        <p>The promocode you are looking for does not exist or was removed.</p>
        <Link href="/promocodes/promoList">Back to promo list</Link>
      </div>
    );
  }

  return (
    <div className="promocodes-page promocode-edit-shell">
      <PromocodeEditHeader setting={setting} />
      <PromocodeAddForm
        mode="edit"
        settingId={id}
        initialSetting={setting}
        initialSocialOptions={socialOptions}
      />
    </div>
  );
}

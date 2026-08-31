'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/club/servicePurchasesClient';
import { sanitizeDefaultPaymentMethods } from '@/lib/procedures/payModes';

/** Loads club-tagged default payment methods (max 5) for payment forms. */
export function useClubDefaultPaymentMethods(): string[] {
  const [methods, setMethods] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const clubId =
      typeof window !== 'undefined' ? localStorage.getItem('selectedClub') || '' : '';
    if (!clubId) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/clubs/${encodeURIComponent(clubId)}/payment-method-defaults`,
          { headers: getAuthHeaders() },
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setMethods(sanitizeDefaultPaymentMethods(json.defaultPaymentMethods));
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return methods;
}

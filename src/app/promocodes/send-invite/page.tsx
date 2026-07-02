'use client';

import { Suspense } from 'react';
import PromocodeSendInviteForm from '@/components/promocodes/PromocodeSendInviteForm';

export default function PromocodeSendInvitePage() {
  return (
    <Suspense fallback={<div className="send-invite-loading">Loading…</div>}>
      <PromocodeSendInviteForm />
    </Suspense>
  );
}

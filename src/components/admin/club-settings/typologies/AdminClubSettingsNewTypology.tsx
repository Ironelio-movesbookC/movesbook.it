'use client';

import AddTypologySubscriptionPage from '@/app/club/settings/typology_subscription/add/page';

export default function AdminClubSettingsNewTypology({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white">
      <AddTypologySubscriptionPage onBack={onBack} />
    </div>
  );
}


'use client';

import AddTypologySubscriptionForm from '@/components/club/settings/AddTypologySubscriptionForm';

export default function AdminClubSettingsNewTypology({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white">
      <AddTypologySubscriptionForm onBack={onBack} />
    </div>
  );
}


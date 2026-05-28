'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminClubSettingsTabs, {
  type AdminClubSettingsTabKey,
} from '@/components/admin/club-settings/AdminClubSettingsTabs';
import AdminClubSettingsTypologiesTab from '@/components/admin/club-settings/tabs/AdminClubSettingsTypologiesTab';
import AdminClubSettingsListPricesTab from '@/components/admin/club-settings/tabs/AdminClubSettingsListPricesTab';
import AdminClubSettingsTimetableTab from '@/components/admin/club-settings/tabs/AdminClubSettingsTimetableTab';
import AdminClubSettingsRfidCardReadersTab from '@/components/admin/club-settings/tabs/AdminClubSettingsRfidCardReadersTab';
import AdminClubSettingsOverviewTab from '@/components/admin/club-settings/tabs/AdminClubSettingsOverviewTab';

export default function AdminClubsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminClubSettingsTabKey>('typologies');

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  // Keep the same page template as /admin/clubs by preserving the wrapper.
  return (
    <div className="min-h-full bg-[#ececec]">
      <AdminClubSettingsTabs active={activeTab} onChange={setActiveTab} />

      <div className="px-3 sm:px-4 py-4">
        {activeTab === 'typologies' && <AdminClubSettingsTypologiesTab />}
        {activeTab === 'list_prices' && <AdminClubSettingsListPricesTab />}
        {activeTab === 'timetable' && <AdminClubSettingsTimetableTab />}
        {activeTab === 'rfid' && <AdminClubSettingsRfidCardReadersTab />}
        {activeTab === 'overview' && <AdminClubSettingsOverviewTab />}
      </div>
    </div>
  );
}


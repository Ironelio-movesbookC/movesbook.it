'use client';

import AdminNotifiesPanel from '@/components/notifications/AdminNotifiesPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminNotifiesPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminNotifiesPanel />
    </AdminRelationshipAuthShell>
  );
}

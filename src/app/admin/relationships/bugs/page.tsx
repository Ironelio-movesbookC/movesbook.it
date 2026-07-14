'use client';

import AdminBugsMemoPanel from '@/components/admin/AdminBugsMemoPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminBugsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminBugsMemoPanel />
    </AdminRelationshipAuthShell>
  );
}

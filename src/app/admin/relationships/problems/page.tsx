'use client';

import AdminCustomerFeedbackPanel from '@/components/admin/AdminCustomerFeedbackPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminProblemsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminCustomerFeedbackPanel
        kind="support"
        category="problem"
        title="Problems"
        description="Problem reports shared by users."
        emptyMessage="No problem reports yet."
      />
    </AdminRelationshipAuthShell>
  );
}

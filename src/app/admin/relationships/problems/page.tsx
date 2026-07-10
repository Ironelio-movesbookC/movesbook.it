'use client';

import AdminCustomerFeedbackPanel from '@/components/admin/AdminCustomerFeedbackPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminProblemsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminCustomerFeedbackPanel
        kind="support"
        category="problem"
        excludeBugs
        title="Problems"
        description="Problem reports from users (excluding bug/error reports with technical messages)."
        emptyMessage="No problem reports yet."
      />
    </AdminRelationshipAuthShell>
  );
}

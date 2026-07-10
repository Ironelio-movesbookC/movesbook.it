'use client';

import AdminCustomerFeedbackPanel from '@/components/admin/AdminCustomerFeedbackPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminQuestionsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminCustomerFeedbackPanel
        kind="support"
        category="question"
        title="Questions from the users"
        description="Questions posted by users through the feedback system."
        emptyMessage="No user questions yet."
      />
    </AdminRelationshipAuthShell>
  );
}

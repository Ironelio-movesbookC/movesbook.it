'use client';

import AdminCustomerFeedbackPanel from '@/components/admin/AdminCustomerFeedbackPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminReviewsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminCustomerFeedbackPanel
        kind="review"
        title="Reviews"
        description="Read reviews submitted by users. Select a thread to view the conversation and reply as staff."
        emptyMessage="No user reviews yet."
      />
    </AdminRelationshipAuthShell>
  );
}

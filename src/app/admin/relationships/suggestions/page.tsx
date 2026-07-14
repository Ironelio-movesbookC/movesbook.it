'use client';

import AdminCustomerFeedbackPanel from '@/components/admin/AdminCustomerFeedbackPanel';
import AdminRelationshipAuthShell from '@/components/admin/AdminRelationshipAuthShell';

export default function AdminSuggestionsPage() {
  return (
    <AdminRelationshipAuthShell>
      <AdminCustomerFeedbackPanel
        kind="support"
        category="suggestion"
        title="Suggestions"
        description="Ideas and suggestions shared by users."
        emptyMessage="No user suggestions yet."
      />
    </AdminRelationshipAuthShell>
  );
}

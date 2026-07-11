'use client';

import { useState } from 'react';
import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import EditCashMovementModal from '@/components/club/archives/EditCashMovementModal';
import { deleteCashMovement } from '@/lib/club/cashMovementClient';
import type { Column, Member } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Product' },
  { key: 'insertDate', header: 'Date' },
  { key: 'paid', header: 'Amount IN' },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'operator', header: 'Operator' },
  { key: 'casual', header: 'Notes' },
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
];

export default function MovementCashInPage() {
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function reload() { setRefreshKey((k) => k + 1); }

  async function performDelete() {
    if (!deleteTarget?.id) return;
    await deleteCashMovement(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  }

  return (
    <div className="p-4">
      <ClubArchivePage
        key={refreshKey}
        title="Cash In"
        archiveType="cash-movements"
        direction="IN"
        columns={columns}
        footerHint="Incoming payments from service and product sales."
        onEditItem={setEditTarget}
        onDeleteItem={(item) => { setDeleteTarget(item); setShowDeleteModal(true); }}
      />

      <EditCashMovementModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={reload}
        item={{
          id: editTarget?.id ?? '',
          insertDate: editTarget?.insertDate ? String(editTarget.insertDate) : null,
          casual: editTarget?.casual ?? '',
          operator: editTarget?.operator ?? '',
        }}
      />

      <AdminPasswordConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onVerified={() => { setShowDeleteModal(false); void performDelete(); }}
      />
    </div>
  );
}

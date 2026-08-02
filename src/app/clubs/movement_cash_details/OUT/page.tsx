'use client';

import { useState } from 'react';
import CashMovementsArchive from '@/components/club/archives/CashMovementsArchive';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import EditCashMovementModal from '@/components/club/archives/EditCashMovementModal';
import { deleteCashMovement } from '@/lib/club/cashMovementClient';
import type { Column, Member } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Expense' },
  { key: 'insertDate', header: 'Date' },
  { key: 'paid', header: 'Amount' },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'operator', header: 'Operator' },
  { key: 'casual', header: 'Notes' },
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
];

export default function MovementCashOutPage() {
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function reload() {
    setRefreshKey((k) => k + 1);
  }

  async function performDelete() {
    if (!deleteTarget?.id) return;
    await deleteCashMovement(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  }

  return (
    <div className="p-4" key={refreshKey}>
      <CashMovementsArchive
        title="Cash Out"
        direction="OUT"
        columns={columns}
        footerHint="Select a payment row, then use Details deadline or Totals about payments."
        onEditItem={setEditTarget}
        onDeleteItem={(item) => {
          setDeleteTarget(item);
          setShowDeleteModal(true);
        }}
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
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onVerified={() => {
          setShowDeleteModal(false);
          void performDelete();
        }}
      />
    </div>
  );
}

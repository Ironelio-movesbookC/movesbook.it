'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { updatePayment, fetchFormOptions, type ServiceSaleFormOptions } from '@/lib/club/serviceSaleClient';

type EditServicePaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  payment: {
    id: string;
    paymentDate: string | null;
    description: string;
    operatorId: string | null;
  };
};

export default function EditServicePaymentModal({
  isOpen,
  onClose,
  onSaved,
  payment,
}: EditServicePaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPaymentDate(payment.paymentDate ?? '');
    setNotes(payment.description ?? '');
    setOperatorId(payment.operatorId ?? '');
    setError(null);
    setSaving(false);
    fetchFormOptions().then(setOptions).catch(() => {});
  }, [isOpen, payment]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePayment(payment.id, {
        paymentDate: paymentDate || undefined,
        notes: notes || undefined,
        operatorId: operatorId || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md border border-gray-400 bg-[#f3f3f3] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute right-3 top-3 z-10 rounded p-1 text-white/90 hover:bg-white/10 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-[#6b1020] px-4 py-2.5 pr-10 text-sm font-semibold text-white">
          Edit Payment
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="edit-payment-date" className="mb-1 block text-sm text-gray-800">Date</label>
            <input
              id="edit-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={saving}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-payment-notes" className="mb-1 block text-sm text-gray-800">Notes</label>
            <textarea
              id="edit-payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-payment-operator" className="mb-1 block text-sm text-gray-800">Operator</label>
            <select
              id="edit-payment-operator"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              disabled={saving}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">Select operator</option>
              {options?.operators.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-center gap-4 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-8 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-gray-900 bg-gradient-to-b from-gray-700 to-black px-8 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

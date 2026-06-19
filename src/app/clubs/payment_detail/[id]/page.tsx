'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ServiceArchiveTabs from '@/components/club/services/ServiceArchiveTabs';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import { addPayment, fetchPurchase, type ServiceSalePurchase } from '@/lib/club/serviceSaleClient';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [createReceipt, setCreateReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchPurchase(id);
      setPurchase(res.purchase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const paidAmount = Number(amountPaid) || 0;
  const newRest = purchase ? Math.max(0, purchase.rest - paidAmount) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paidAmount || paidAmount <= 0) {
      setError('Enter a payment amount greater than 0.');
      return;
    }
    if (purchase && paidAmount > purchase.rest) {
      setError('Payment exceeds remaining balance.');
      return;
    }

    setSaving(true);
    try {
      await addPayment(id, {
        amountPaid: paidAmount,
        paymentDate,
        notes,
        createReceipt,
        receiptDocumentType: 'Invoice',
        receiptNumber: receiptNumber || undefined,
        receiptAnnotations: notes,
      });
      setSuccess('Payment saved successfully.');
      setAmountPaid('');
      setNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  if (!purchase && !error) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="bg-teal-800 text-white px-4 py-3 rounded-t-lg">
        <h1 className="text-lg font-semibold">Payment — Deadline</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        <ServiceArchiveTabs active="deadline" selectedPurchaseId={id} />

        {purchase && (
          <div className="mb-6 p-4 bg-gray-50 rounded border text-sm space-y-1">
            <p><strong>Member:</strong> {purchase.memberName}</p>
            <p><strong>Typology:</strong> SERVICES</p>
            <p><strong>Service slot:</strong> {purchase.serviceName}</p>
            <p><strong>Section:</strong> {purchase.sectorName}</p>
            <p><strong>Date:</strong> {formatDate(purchase.paydate)}</p>
            <p><strong>Total cost:</strong> {formatEuro(purchase.value)}</p>
            <p><strong>Already paid:</strong> {formatEuro(purchase.pay)}</p>
            <p><strong>Rest:</strong> <span className="text-red-600 font-semibold">{formatEuro(purchase.rest)}</span></p>
          </div>
        )}

        {purchase && purchase.rest <= 0 ? (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded p-4">
            This service is fully paid.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-600">Payment IN (€)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={purchase?.rest}
                  className="mt-1 w-full border rounded px-3 py-2 bg-yellow-50"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Payment date</span>
                <input
                  type="date"
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="text-sm bg-gray-50 p-3 rounded">
              After payment — Rest: <strong className="text-red-600">{formatEuro(newRest)}</strong>
            </div>

            <label className="block">
              <span className="text-sm text-gray-600">Notes</span>
              <textarea
                className="mt-1 w-full border rounded px-3 py-2"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createReceipt}
                onChange={(e) => setCreateReceipt(e.target.checked)}
              />
              Create receipt for this payment
            </label>

            {createReceipt && (
              <label className="block">
                <span className="text-sm text-gray-600">Document No.</span>
                <input
                  type="text"
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="0001-2026"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </label>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-700 text-sm">{success}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save payment'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/clubs/dead_line')}
                className="px-5 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Back to deadlines
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  fetchPayments,
  fetchPurchase,
  type ServiceSalePayment,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Service purchase / procedure record id (PHP ServicePurchase.id). */
  purchaseId: string | null;
  mode?: 'details' | 'edit';
};

type PaymentMethod = 'D' | 'B' | '';

/** PHP: `€ 20.00` with space; empty when 0 and allowEmpty. */
function formatMoney(value: number | null | undefined, allowEmpty = false): string {
  const n = Number(value ?? 0);
  if (allowEmpty && !(n > 0)) return '';
  return `€ ${n.toFixed(2)}`;
}

/** PHP popup date: `YYYY-MM-DD HH:mm:ss` */
function formatPhpDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const raw = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 19);
  const d = new Date(raw.includes('T') ? raw : `${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 19);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const fieldCls =
  'box-border h-[28px] w-full border border-[#aaa] bg-white px-2 text-[13px] text-gray-900 outline-none';
const fieldReadonlyCls = `${fieldCls} bg-[#f5f5f5]`;
const labelCls = 'shrink-0 pt-[5px] text-[13px] text-gray-800';

/** PHP `.btn-gray` — dark charcoal gradient */
const btnGrayCls =
  'inline-block min-w-[72px] cursor-pointer rounded-sm border border-[#333] px-4 py-[5px] text-center text-[13px] font-semibold text-white shadow-none';
const btnGrayStyle: CSSProperties = {
  background: 'linear-gradient(to bottom, #666 0%, #333 100%)',
  color: '#fff',
  border: '1px solid #333',
};

export default function MovementCashDetailModal({
  isOpen,
  onClose,
  purchaseId,
  mode = 'details',
}: Props) {
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [payments, setPayments] = useState<ServiceSalePayment[]>([]);
  const [dateValue, setDateValue] = useState('');
  const [valueIn, setValueIn] = useState('');
  const [causal, setCausal] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('');

  useEffect(() => {
    if (!isOpen || !purchaseId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      fetchPurchase(purchaseId),
      fetchPayments({ recordId: purchaseId, pageSize: 100 }),
    ])
      .then(([purchaseRes, paymentsRes]) => {
        if (cancelled) return;
        const p = purchaseRes.purchase;
        setPurchase(p);
        const rows = paymentsRes.items.filter((x) => x.paid > 0);
        setPayments(rows);
        setDateValue(formatPhpDate(p?.paydate));
        setValueIn(formatMoney(p?.pay, true));
        setCausal(p?.notes || '');
        // PHP: D = Down Payment, B = Balance
        if (p && p.rest <= 0 && p.pay > 0) setPaymentMethod('B');
        else if (p && (p.rest > 0 || p.pay > 0)) setPaymentMethod('D');
        else setPaymentMethod('');
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, purchaseId]);

  if (!isOpen || !purchaseId) return null;

  const total = purchase?.value ?? 0;
  const residual = purchase?.rest ?? 0;
  const paymentRows = payments;

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 print:static print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-cash-detail-title"
    >
      {/* PHP: width 600px, .tax-document border 3px #0060c0 */}
      <div className="relative w-full max-w-[600px] border-[3px] border-[#0060c0] bg-white shadow-[0_0_5px_#333] print:border-0 print:shadow-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded p-1 text-white hover:bg-white/15 print:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          id="movement-cash-detail-title"
          className="bg-[#0060c0] px-3 py-2.5 pr-10 text-[15px] font-normal text-white"
        >
          Movement cash detail
        </div>

        <div className="bg-white p-3 text-[13px] text-gray-900">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="py-6 text-center text-red-600">{error}</p>
          ) : (
            <>
              {/* Member — col-20 / col-80 */}
              <div className="mb-2.5 flex items-start gap-2">
                <span className={`${labelCls} w-[88px]`}>Member</span>
                <input
                  readOnly
                  className={`min-w-0 flex-1 ${fieldReadonlyCls}`}
                  value={purchase?.memberName ?? ''}
                />
              </div>

              {/* Date + Value IN — col-20/30 + col-20/30 */}
              <div className="mb-2.5 flex flex-wrap items-start gap-y-2">
                <div className="flex min-w-[240px] flex-1 items-start gap-2 pr-2">
                  <span className={`${labelCls} w-[88px]`}>Date</span>
                  <input
                    readOnly={!isEdit}
                    className={`min-w-0 flex-1 ${isEdit ? fieldCls : fieldReadonlyCls}`}
                    value={dateValue}
                    onChange={(e) => isEdit && setDateValue(e.target.value)}
                  />
                </div>
                <div className="flex min-w-[200px] flex-1 items-start gap-2 pl-1">
                  <span className={`${labelCls} w-[72px]`}>Value IN</span>
                  <input
                    readOnly={!isEdit}
                    className={`min-w-0 flex-1 ${isEdit ? fieldCls : fieldReadonlyCls}`}
                    value={valueIn}
                    onChange={(e) => isEdit && setValueIn(e.target.value)}
                  />
                </div>
              </div>

              {/* Causal */}
              <div className="mb-2.5 flex items-start gap-2">
                <span className={`${labelCls} w-[88px]`}>Causal</span>
                <textarea
                  readOnly={!isEdit}
                  rows={3}
                  className={`min-h-[60px] max-h-[60px] min-w-0 flex-1 resize-none border border-[#aaa] px-2 py-1.5 text-[13px] outline-none ${
                    isEdit ? 'bg-white' : 'bg-[#f5f5f5]'
                  }`}
                  value={causal}
                  onChange={(e) => isEdit && setCausal(e.target.value)}
                />
              </div>

              {/* Total / Residual | Method of payment */}
              <div className="mb-3 mt-4 flex flex-wrap gap-3">
                <div className="min-w-[220px] flex-1 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`${labelCls} w-[72px] pt-0`}>Total</span>
                    <input
                      readOnly
                      className={`min-w-0 flex-1 ${fieldReadonlyCls}`}
                      value={formatMoney(total)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${labelCls} w-[72px] pt-0`}>Residual</span>
                    <input
                      readOnly
                      className={`min-w-0 flex-1 ${fieldReadonlyCls}`}
                      value={formatMoney(residual)}
                    />
                  </div>
                </div>

                {/* PHP .block50 + .titleup */}
                <div className="relative min-w-[220px] flex-1 border border-[#ccc] px-3 pb-3 pt-4">
                  <div className="absolute -top-2.5 left-2.5 bg-white px-2 text-[12px] text-gray-800">
                    Method of payment
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                      <input
                        type="radio"
                        name="movement-cash-method"
                        checked={paymentMethod === 'D'}
                        disabled={!isEdit}
                        onChange={() => isEdit && setPaymentMethod('D')}
                      />
                      Down Payment
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                      <input
                        type="radio"
                        name="movement-cash-method"
                        checked={paymentMethod === 'B'}
                        disabled={!isEdit}
                        onChange={() => isEdit && setPaymentMethod('B')}
                      />
                      Balance
                    </label>
                  </div>
                </div>
              </div>

              {/* Details — PHP .block50 with red title */}
              <div className="relative mb-2 border border-[#ccc] px-2 pb-2 pt-4">
                <div className="absolute -top-2.5 left-2.5 bg-white px-2 text-[13px] font-normal text-[#eb1c24]">
                  Details
                </div>
                <table className="mt-1 w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#45818e] text-white">
                      <th className="border border-[#356870] px-2 py-1.5 text-center font-semibold">
                        Date Payment
                      </th>
                      <th className="border border-[#356870] px-2 py-1.5 text-center font-semibold">
                        Value IN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRows.length === 0 ? (
                      <tr className="bg-[#f0f0f0]">
                        <td
                          colSpan={2}
                          className="border border-gray-300 px-2 py-2.5 text-center text-gray-600"
                        >
                          No details available
                        </td>
                      </tr>
                    ) : (
                      paymentRows.map((p) => (
                        <tr key={p.id}>
                          <td className="border border-gray-300 px-2 py-1.5 text-center">
                            {formatPhpDate(p.paymentDate) || '-'}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center">
                            {formatMoney(p.paid)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-center gap-3 pt-3 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className={btnGrayCls}
              style={btnGrayStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(to bottom, #444 0%, #222 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(to bottom, #666 0%, #333 100%)';
              }}
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className={btnGrayCls}
              style={btnGrayStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(to bottom, #444 0%, #222 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(to bottom, #666 0%, #333 100%)';
              }}
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

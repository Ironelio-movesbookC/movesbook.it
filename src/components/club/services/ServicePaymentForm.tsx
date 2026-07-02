'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ProcedureFormSection, {
  procedureHighlightInputClass,
  procedureInputClass,
} from '@/components/procedures/ProcedureFormLayout';
import TaxDocumentModal, { type TaxDocumentFormValues } from '@/components/procedures/TaxDocumentModal';
import {
  createInstallment,
  deleteInstallment,
  fetchInstallments,
  updateInstallment,
  type InstallmentRow,
} from '@/lib/club/archives/clubArchiveClient';
import { PAY_MODE_OPTIONS } from '@/lib/procedures/payModes';
import { formatEuro } from '@/lib/club/servicePurchasesClient';
import type { ServiceSaleFormOptions, ServiceSalePayment, ServiceSalePurchase } from '@/lib/club/serviceSaleClient';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';

export type PaymentDistribution = {
  installmentId: string;
  amount: number;
  newPaid: number;
  newBalance: number;
};

export type ServicePaymentSubmitValues = {
  amountPaid: number;
  paymentDate: string;
  description: string;
  payMode: string;
  paymentType: 'D' | 'B';
  taxDoc: boolean;
  operatorId: string;
  operatorPassword: string;
  debtTotal: number;
  debtExpire: string;
  payWith: number;
  restGive: number;
  taxDocument?: TaxDocumentFormValues;
  createReceipt: boolean;
  receiptNumber?: string;
  receiptAnnotations?: string;
  distributions: PaymentDistribution[];
};

type Props = {
  purchase: ServiceSalePurchase;
  payments: ServiceSalePayment[];
  options: ServiceSaleFormOptions;
  procedureType?: string;
  saving?: boolean;
  error?: string;
  success?: string;
  onSubmit: (values: ServicePaymentSubmitValues) => Promise<void>;
  onCancel?: () => void;
  onAddToRecordTotal?: (amount: number) => Promise<void>;
};

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ServicePaymentForm({
  purchase,
  payments,
  options,
  procedureType = 'service_sale',
  saving,
  error,
  success,
  onSubmit,
  onCancel,
  onAddToRecordTotal,
}: Props) {
  const sectionLabel = `${purchase.sectorName}-${purchase.serviceName}`;
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set());
  const [installmentError, setInstallmentError] = useState('');
  const [paymentType, setPaymentType] = useState<'D' | 'B'>('D');
  const [debtTotal, setDebtTotal] = useState(String(purchase.rest));
  const [debtExpire, setDebtExpire] = useState(purchase.paydate ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(purchase.notes);
  const [amountPaid, setAmountPaid] = useState('0');
  const [payMode, setPayMode] = useState('cash');
  const [taxDoc, setTaxDoc] = useState(true);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [operatorId, setOperatorId] = useState(options.currentOperatorId ?? options.operators[0]?.id ?? '');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [payWith, setPayWith] = useState('0');
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxDocument, setTaxDocument] = useState<TaxDocumentFormValues | null>(null);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifySaving, setModifySaving] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    balance: '',
    paid: '',
    paymentDate: '',
    expireDate: '',
    description: '',
  });
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'delete' | null>(null);

  useEffect(() => {
    fetchInstallments(procedureType, purchase.id)
      .then(setInstallments)
      .catch(() => setInstallments([]));
  }, [procedureType, purchase.id]);

  console.log("purchase", purchase);

  const paidAmount = Number(amountPaid) || 0;
  const payWithAmount = Number(payWith) || 0;
  const restGive = Math.max(0, payWithAmount - paidAmount);
  const overallNewRest = Math.max(0, purchase.rest - paidAmount);

  const installmentRows = useMemo(() => {
    if (installments.length > 0) {
      return installments.map((row) => ({
        id: row.id,
        balance: row.balance,
        paymentDate: row.paymentDate,
        paid: row.paid,
        disabled: row.balance <= 0,
      }));
    }
    const rows = payments.map((p) => ({
      id: p.id,
      balance: p.balance,
      paymentDate: p.paymentDate,
      paid: p.paid,
      disabled: true,
    }));
    if (purchase.rest > 0) {
      rows.unshift({
        id: 'current',
        balance: purchase.rest,
        paymentDate: purchase.paydate,
        paid: purchase.rest,
        disabled: false,
      });
    }
    return rows;
  }, [installments, payments, purchase]);

  const selectedTotalRest = useMemo(() => {
    return installmentRows
      .filter((r) => selectedInstallmentIds.has(r.id))
      .reduce((sum, r) => sum + r.balance, 0);
  }, [installmentRows, selectedInstallmentIds]);

  const nextRests = useMemo(() => {
    const sorted = [...installmentRows]
      .filter((r) => selectedInstallmentIds.has(r.id))
      .sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));
    let remaining = paidAmount;
    return sorted.map((r) => {
      const paidHere = Math.min(remaining, r.balance);
      remaining = Math.max(0, remaining - paidHere);
      return { id: r.id, label: formatDisplayDate(r.paymentDate), newRest: Math.max(0, r.balance - paidHere) };
    });
  }, [installmentRows, selectedInstallmentIds, paidAmount]);

  async function reloadInstallments() {
    const rows = await fetchInstallments(procedureType, purchase.id);
    setInstallments(rows);
  }

  function handleNewInstallment() {
    setPendingAction('new');
    setShowAdminPasswordModal(true);
  }

  async function performNewInstallment() {
    setInstallmentError('');
    const id = firstSelectedId();
    if (!id) {
      setInstallmentError('Select exactly one deadline to copy.');
      return;
    }
    try {
      const row = installments.find((r) => r.id === id);
      const newInstallment = await createInstallment(procedureType, purchase.id, {
        balance: row?.balance ?? purchase.rest,
        paid: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        expireDate: row?.expireDate ?? debtExpire,
        description: (row?.description ?? description) || sectionLabel,
      });
      if (onAddToRecordTotal && newInstallment.balance > 0) {
        await onAddToRecordTotal(newInstallment.balance);
      }
      await reloadInstallments();
    } catch (e) {
      setInstallmentError(e instanceof Error ? e.message : 'Failed to create installment');
    }
  }

  function firstSelectedId(): string | null {
    return selectedInstallmentIds.size === 1 ? Array.from(selectedInstallmentIds)[0] : null;
  }

  function handleDeleteInstallment() {
    const id = firstSelectedId();
    if (!id || id === 'current') return;
    setPendingAction('delete');
    setShowAdminPasswordModal(true);
  }

  async function performDeleteInstallment() {
    const id = firstSelectedId();
    if (!id || id === 'current') return;
    setInstallmentError('');
    try {
      await deleteInstallment(procedureType, purchase.id, id);
      setSelectedInstallmentIds(new Set());
      await reloadInstallments();
    } catch (e) {
      setInstallmentError(e instanceof Error ? e.message : 'Failed to delete installment');
    }
  }

  function handleModifyInstallment() {
    const id = firstSelectedId();
    if (!id || id === 'current') {
      setInstallmentError('Select exactly one saved installment to modify.');
      return;
    }
    const row = installments.find((r) => r.id === id);
    if (!row) return;
    setInstallmentError('');
    setModifyForm({
      balance: String(row.balance),
      paid: String(row.paid),
      paymentDate: row.paymentDate.slice(0, 10),
      expireDate: row.expireDate?.slice(0, 10) ?? '',
      description: row.description ?? '',
    });
    setModifyOpen(true);
  }

  async function handleSaveModifyInstallment(e: React.FormEvent) {
    e.preventDefault();
    const id = firstSelectedId();
    if (!id || id === 'current') return;
    setModifySaving(true);
    setInstallmentError('');
    try {
      await updateInstallment(procedureType, purchase.id, id, {
        balance: Number(modifyForm.balance) || 0,
        paid: Number(modifyForm.paid) || 0,
        paymentDate: modifyForm.paymentDate,
        expireDate: modifyForm.expireDate || null,
        description: modifyForm.description || null,
      });
      setModifyOpen(false);
      await reloadInstallments();
    } catch (err) {
      setInstallmentError(err instanceof Error ? err.message : 'Failed to update installment');
    } finally {
      setModifySaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedInstallmentIds.size === 0) return;
    if (paidAmount <= 0) return;
    if (paidAmount > selectedTotalRest) return;
    if (!operatorId) return;
    if (passwordRequired && !operatorPassword.trim()) return;

    const distributions: PaymentDistribution[] = nextRests.map((r) => {
      const row = installmentRows.find((ir) => ir.id === r.id);
      if (!row) return { installmentId: r.id, amount: 0, newPaid: 0, newBalance: 0 };
      const paidHere = row.balance - r.newRest;
      return {
        installmentId: r.id,
        amount: paidHere,
        newPaid: row.paid + paidHere,
        newBalance: r.newRest,
      };
    });

    await onSubmit({
      amountPaid: paidAmount,
      paymentDate,
      description,
      payMode,
      paymentType,
      taxDoc,
      operatorId,
      operatorPassword,
      debtTotal: Number(debtTotal) || purchase.value,
      debtExpire,
      payWith: payWithAmount,
      restGive,
      taxDocument: taxDocument ?? undefined,
      createReceipt: taxDoc,
      receiptNumber: taxDocument?.documentNumber || undefined,
      receiptAnnotations: taxDocument?.causal || undefined,
      distributions,
    });
  }

  if (purchase.rest <= 0) {
    return (
      <div className="text-green-700 bg-green-50 border border-green-200 rounded p-4">
        This record is fully paid.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ProcedureFormSection title="Deadlines">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 border border-gray-200 rounded p-3 bg-gray-50 max-h-56 overflow-y-auto">
              <p className="text-sm font-medium text-red-700 mb-2">Deadlines total</p>
              <ul className="space-y-3 text-sm">
                {installmentRows.map((row) => (
                  <li key={row.id} className="border-b border-gray-200 pb-2 last:border-0">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedInstallmentIds.has(row.id)}
                        disabled={row.disabled && row.id !== 'current'}
                        onChange={() => {
                          const next = new Set(selectedInstallmentIds);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          setSelectedInstallmentIds(next);
                        }}
                        className="mt-1"
                      />
                      <span>
                        Purchase service in section{' '}
                        <strong className="text-red-600">{sectionLabel}</strong>
                        <ul className="mt-1 ml-2 text-gray-600">
                          <li>
                            Expire date of{' '}
                            <span className="text-blue-500">{formatDisplayDate(row.paymentDate)}</span>
                            {' '}of € {formatEuro(purchase.value)} Rest{' '}
                            <span className="text-red-600">€ {formatEuro(row.balance)}</span>
                          </li>
                        </ul>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 md:w-28">
              <button type="button" onClick={handleNewInstallment} disabled={!firstSelectedId()} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-40">
                New
              </button>
              <button type="button" onClick={handleModifyInstallment} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">
                Modify
              </button>
              <button type="button" onClick={handleDeleteInstallment} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">
                Delete
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selected total:{' '}
            <strong className={selectedTotalRest > 0 ? 'text-red-700' : ''}>
              € {formatEuro(selectedTotalRest)}
            </strong>
          </p>
          {installmentError && <p className="text-red-600 text-xs mt-2">{installmentError}</p>}
        </ProcedureFormSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProcedureFormSection title="Type of payment">
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentType"
                  value="D"
                  checked={paymentType === 'D'}
                  onChange={() => setPaymentType('D')}
                />
                Down payment
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentType"
                  value="B"
                  checked={paymentType === 'B'}
                  onChange={() => setPaymentType('B')}
                />
                Balance
              </label>
            </div>
          </ProcedureFormSection>

          <ProcedureFormSection title="Debt">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="block">
                <span className="text-gray-600">Total</span>
                <input
                  type="number"
                  step="0.01"
                  className={`mt-1 ${procedureHighlightInputClass}`}
                  style={{ backgroundColor: '#d3f07b' }}
                  value={debtTotal}
                  onChange={(e) => setDebtTotal(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-gray-600">Expired</span>
                <input
                  type="date"
                  className={`mt-1 ${procedureHighlightInputClass}`}
                  style={{ backgroundColor: '#d3f07b' }}
                  value={debtExpire}
                  onChange={(e) => setDebtExpire(e.target.value)}
                />
              </label>
            </div>
          </ProcedureFormSection>
        </div>

        <label className="block text-sm">
          <span className="text-gray-600">Description</span>
          <textarea
            className={`mt-1 ${procedureInputClass}`}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
          />
        </label>

        <div className="border border-gray-300 rounded p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-sm">
            <label className="block">
              <span className="text-gray-600">Amount paid</span>
              <input
                type="number"
                min="0"
                step="0.01"
                max={selectedTotalRest || purchase.rest}
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Pay mode</span>
              <select
                className={`mt-1 ${procedureInputClass}`}
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
              >
                <option value="">select</option>
                {PAY_MODE_OPTIONS.filter((m) => m.value !== 'voucher').map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={taxDoc}
                onChange={(e) => setTaxDoc(e.target.checked)}
              />
              <span>Tax doc</span>
            </div>
            <button
              type="button"
              onClick={() => setTaxModalOpen(true)}
              className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 mb-0.5"
            >
              Open form
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-sm">
            <label className="block">
              <span className="text-gray-600">Date</span>
              <input
                type="date"
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Operator</span>
              <select
                className={`mt-1 ${procedureInputClass}`}
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
              >
                <option value="">select</option>
                {options.operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={passwordRequired}
                onChange={(e) => setPasswordRequired(e.target.checked)}
              />
              <span>Password</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={procedureInputClass}
                value={operatorPassword}
                onChange={(e) => setOperatorPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-gray-600">Pay with €</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={payWith}
                onChange={(e) => setPayWith(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Resto to give</span>
              <input
                type="text"
                readOnly
                className={`mt-1 ${procedureInputClass}`}
                style={{ backgroundColor: '#d3f07b' }}
                value={restGive.toFixed(2)}
              />
            </label>
          </div>

          {nextRests.length > 0 && (
            <div className="text-sm text-gray-600 space-y-1">
              {nextRests.map((r) => (
                <p key={r.id}>
                  <span className="font-medium">{r.label}</span> — Rest:{' '}
                  <strong className="text-red-600">{formatEuro(r.newRest)}</strong>
                </p>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-700 text-sm">{success}</p>}

        <div className="flex justify-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Exit
            </button>
          )}
        </div>
      </form>

      <TaxDocumentModal
        open={taxModalOpen}
        memberName={purchase.memberName}
        defaultCausal={description}
        defaultTotal={purchase.value}
        defaultResidual={overallNewRest}
        initial={taxDocument ?? undefined}
        onClose={() => setTaxModalOpen(false)}
        onSave={(values) => {
          setTaxDocument(values);
          setTaxDoc(true);
        }}
      />

      {modifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSaveModifyInstallment}
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-3 text-sm"
          >
            <h3 className="text-lg font-medium text-gray-900">Modify installment</h3>
            <label className="block">
              <span className="text-gray-600">Balance</span>
              <input
                type="number"
                step="0.01"
                className={`mt-1 ${procedureInputClass}`}
                value={modifyForm.balance}
                onChange={(e) => setModifyForm((f) => ({ ...f, balance: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Paid</span>
              <input
                type="number"
                step="0.01"
                className={`mt-1 ${procedureInputClass}`}
                disabled
                value={modifyForm.paid}
                onChange={(e) => setModifyForm((f) => ({ ...f, paid: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Payment date</span>
              <input
                type="date"
                className={`mt-1 ${procedureInputClass}`}
                value={modifyForm.paymentDate}
                onChange={(e) => setModifyForm((f) => ({ ...f, paymentDate: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Expire date</span>
              <input
                type="date"
                className={`mt-1 ${procedureInputClass}`}
                value={modifyForm.expireDate}
                onChange={(e) => setModifyForm((f) => ({ ...f, expireDate: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Description</span>
              <textarea
                className={`mt-1 ${procedureInputClass}`}
                rows={2}
                value={modifyForm.description}
                onChange={(e) => setModifyForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModifyOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modifySaving}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
              >
                {modifySaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <AdminPasswordConfirmModal
        isOpen={showAdminPasswordModal}
        onClose={() => { setShowAdminPasswordModal(false); setPendingAction(null); }}
        onVerified={() => {
          setShowAdminPasswordModal(false);
          if (pendingAction === 'new') void performNewInstallment();
          else if (pendingAction === 'delete') void performDeleteInstallment();
          setPendingAction(null);
        }}
      />
    </>
  );
}

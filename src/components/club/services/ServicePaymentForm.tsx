'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  procedureHighlightInputClass,
  procedureInputClass,
  procedureReadonlyInputClass,
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
  /** Extra open deadlines (same member) opened via multi-select from the archive. */
  extraPurchases?: ServiceSalePurchase[];
  payments: ServiceSalePayment[];
  options: ServiceSaleFormOptions;
  procedureType?: string;
  saving?: boolean;
  error?: string;
  success?: string;
  onSubmit: (values: ServicePaymentSubmitValues) => Promise<void>;
  onCancel?: () => void;
  onAddToRecordTotal?: (amount: number) => Promise<void>;
  operatorPassStatus?: string;
  notEnterCustData?: boolean;
};

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Local calendar YYYY-MM-DD (avoid UTC shift from toISOString). */
function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toYmd(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Effective expiration used in list / Debt / Modify (expireDate, else paymentDate). */
function effectiveExpireDate(
  expireDate: string | null | undefined,
  paymentDate: string | null | undefined
): string {
  return toYmd(expireDate) || toYmd(paymentDate);
}

type DeadlineListRow = {
  id: string;
  balance: number;
  paymentDate: string | null;
  expireDate: string | null;
  paid: number;
  disabled: boolean;
  label?: string;
};

/**
 * Debt frame:
 * - Total = sum of REST for unpaid deadlines with expiration <= today
 * - Expired date = last expired deadline's date, else next upcoming expiration
 */
function computeDebtFrame(
  rows: DeadlineListRow[],
  fallbackDate: string | null | undefined
): { total: number; expireDate: string } {
  const today = todayYmd();
  const unpaid = rows
    .filter((r) => r.balance > 0)
    .map((r) => ({
      balance: r.balance,
      expire: effectiveExpireDate(r.expireDate, r.paymentDate),
    }))
    .filter((r) => Boolean(r.expire));

  const expired = unpaid.filter((r) => r.expire <= today);
  const upcoming = unpaid
    .filter((r) => r.expire > today)
    .sort((a, b) => a.expire.localeCompare(b.expire));

  const total = expired.reduce((sum, r) => sum + r.balance, 0);

  let expireDate: string;
  if (expired.length > 0) {
    expireDate = expired.map((r) => r.expire).sort()[expired.length - 1]!;
  } else if (upcoming.length > 0) {
    expireDate = upcoming[0]!.expire;
  } else {
    expireDate = toYmd(fallbackDate) || today;
  }

  return { total, expireDate };
}

export default function ServicePaymentForm({
  purchase,
  extraPurchases = [],
  payments,
  options,
  procedureType = 'service_sale',
  saving,
  error,
  success,
  onSubmit,
  onCancel,
  onAddToRecordTotal,
  operatorPassStatus = 'Yes',
  notEnterCustData = false,
}: Props) {
  const sectionLabel = `${purchase.sectorName}-${purchase.serviceName}`;
  const multiDeadlineMode = extraPurchases.length > 0;
  const allPurchases = useMemo(
    () => [purchase, ...extraPurchases.filter((p) => p.id !== purchase.id)],
    [purchase, extraPurchases]
  );
  const totalRest = useMemo(
    () => allPurchases.reduce((sum, p) => sum + Math.max(0, p.rest), 0),
    [allPurchases]
  );
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set());
  const [installmentError, setInstallmentError] = useState('');
  const [paymentType, setPaymentType] = useState<'D' | 'B'>('D');
  const [debtTotal, setDebtTotal] = useState('0');
  const [debtExpire, setDebtExpire] = useState(() => toYmd(purchase.paydate) || todayYmd());
  const [description, setDescription] = useState(purchase.notes);
  const [amountPaid, setAmountPaid] = useState('0');
  const [payMode, setPayMode] = useState('cash');
  const [taxDoc, setTaxDoc] = useState(true);
  const [paymentDate, setPaymentDate] = useState(() => todayYmd());
  const [operatorId, setOperatorId] = useState(options.currentOperatorId ?? options.operators[0]?.id ?? '');
  const [operatorPassword, setOperatorPassword] = useState('');
  const isPasswordEnabled = (() => {
    const v = operatorPassStatus.trim().toLowerCase();
    return v === 'yes' || v === 'y' || v === '1' || v === 'true' || v === 't';
  })();
  const [passwordRequired, setPasswordRequired] = useState(isPasswordEnabled);
  const [showPassword, setShowPassword] = useState(false);
  const prevPassStatus = useRef(operatorPassStatus);

  useEffect(() => {
    if (prevPassStatus.current !== operatorPassStatus) {
      prevPassStatus.current = operatorPassStatus;
      setPasswordRequired(isPasswordEnabled);
    }
  }, [operatorPassStatus, isPasswordEnabled]);
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
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newFormSaving, setNewFormSaving] = useState(false);
  const [newForm, setNewForm] = useState({ balance: '', expireDate: '', description: '' });
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'delete' | null>(null);

  useEffect(() => {
    if (multiDeadlineMode) {
      setInstallments([]);
      return;
    }
    fetchInstallments(procedureType, purchase.id)
      .then(setInstallments)
      .catch(() => setInstallments([]));
  }, [procedureType, purchase.id, multiDeadlineMode]);

  useEffect(() => {
    if (!multiDeadlineMode) return;
    setSelectedInstallmentIds(
      new Set(allPurchases.filter((p) => p.rest > 0).map((p) => p.id))
    );
  }, [multiDeadlineMode, allPurchases]);

  const paidAmount = Number(amountPaid) || 0;
  const payWithAmount = Number(payWith) || 0;
  const restGive = Math.max(0, payWithAmount - paidAmount);
  const overallNewRest = Math.max(0, totalRest - paidAmount);

  const installmentRows = useMemo((): DeadlineListRow[] => {
    if (multiDeadlineMode) {
      return allPurchases
        .filter((p) => p.rest > 0)
        .map((p) => ({
          id: p.id,
          balance: p.rest,
          paymentDate: p.paydate,
          expireDate: p.paydate,
          paid: p.pay,
          disabled: false,
          label: `${p.typology}-${p.serviceName || p.notes || 'Debt'}`,
        }));
    }
    if (installments.length > 0) {
      return installments.map((row) => ({
        id: row.id,
        balance: row.balance,
        paymentDate: row.paymentDate,
        expireDate: row.expireDate,
        paid: row.paid,
        disabled: row.balance <= 0,
        label: undefined,
      }));
    }
    const rows: DeadlineListRow[] = payments.map((p) => ({
      id: p.id,
      balance: p.balance,
      paymentDate: p.paymentDate,
      expireDate: p.paymentDate,
      paid: p.paid,
      disabled: true,
      label: undefined,
    }));
    if (purchase.rest > 0) {
      rows.unshift({
        id: 'current',
        balance: purchase.rest,
        paymentDate: purchase.paydate,
        expireDate: purchase.paydate,
        paid: purchase.pay,
        disabled: false,
        label: undefined,
      });
    }
    return rows;
  }, [multiDeadlineMode, allPurchases, installments, payments, purchase]);

  const debtFrame = useMemo(
    () => computeDebtFrame(installmentRows, purchase.paydate),
    [installmentRows, purchase.paydate]
  );

  useEffect(() => {
    setDebtTotal(String(debtFrame.total));
    setDebtExpire(debtFrame.expireDate);
  }, [debtFrame]);

  const selectedTotalRest = useMemo(() => {
    return installmentRows
      .filter((r) => selectedInstallmentIds.has(r.id))
      .reduce((sum, r) => sum + r.balance, 0);
  }, [installmentRows, selectedInstallmentIds]);

  useEffect(() => {
    setAmountPaid(String(selectedTotalRest));
  }, [selectedTotalRest]);

  const nextRests = useMemo(() => {
    const sorted = [...installmentRows]
      .filter((r) => selectedInstallmentIds.has(r.id))
      .sort((a, b) =>
        effectiveExpireDate(a.expireDate, a.paymentDate).localeCompare(
          effectiveExpireDate(b.expireDate, b.paymentDate)
        )
      );
    let remaining = paidAmount;
    return sorted.map((r) => {
      const paidHere = Math.min(remaining, r.balance);
      remaining = Math.max(0, remaining - paidHere);
      const expire = effectiveExpireDate(r.expireDate, r.paymentDate);
      return { id: r.id, label: formatDisplayDate(expire), newRest: Math.max(0, r.balance - paidHere) };
    });
  }, [installmentRows, selectedInstallmentIds, paidAmount]);

  async function reloadInstallments() {
    const rows = await fetchInstallments(procedureType, purchase.id);
    setInstallments(rows);
  }

  function handleNewInstallment() {
    const totalBalances = installments.reduce((s, r) => s + r.balance, 0);
    const available = purchase.rest - totalBalances;
    if (available <= 0) {
      setInstallmentError('No available balance for a new deadline.');
      return;
    }
    setNewForm({ balance: String(available), expireDate: '', description: description || sectionLabel });
    setNewFormOpen(true);
  }

  async function performNewInstallment() {
    setInstallmentError('');
    const deadlineValue = Number(newForm.balance) || 0;
    if (deadlineValue <= 0) {
      setInstallmentError('Deadline amount must be greater than 0.');
      return;
    }
    const totalBalances = installments.reduce((s, r) => s + r.balance, 0);
    if (totalBalances + deadlineValue > purchase.rest) {
      setInstallmentError(`Deadline amount (${deadlineValue.toFixed(2)}) would exceed available rest (${(purchase.rest - totalBalances).toFixed(2)}).`);
      return;
    }
    setNewFormSaving(true);
    try {
      await createInstallment(procedureType, purchase.id, {
        balance: deadlineValue,
        paid: 0,
        paymentDate: todayYmd(),
        expireDate: newForm.expireDate || null,
        description: newForm.description || null,
      });
      setNewFormOpen(false);
      await reloadInstallments();
    } catch (e) {
      setInstallmentError(e instanceof Error ? e.message : 'Failed to create installment');
    } finally {
      setNewFormSaving(false);
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
    const expire = effectiveExpireDate(row.expireDate, row.paymentDate);
    setModifyForm({
      balance: String(row.balance + row.paid),
      paid: String(row.paid),
      paymentDate: toYmd(row.paymentDate),
      expireDate: expire,
      description: row.description ?? '',
    });
    setModifyOpen(true);
  }

  async function handleSaveModifyInstallment(e: React.FormEvent) {
    e.preventDefault();
    const id = firstSelectedId();
    if (!id || id === 'current') return;
    setModifySaving(true);
    const deadlineTotal = Number(modifyForm.balance) || 0;
    const currentPaid = Number(modifyForm.paid) || 0;
    if (deadlineTotal < currentPaid) {
      setInstallmentError('Deadline total cannot be less than the amount already paid.');
      setModifySaving(false);
      return;
    }
    const newRest = deadlineTotal - currentPaid;
    const otherTotal = installments
      .filter((r) => r.id !== id)
      .reduce((sum, r) => sum + r.balance + r.paid, 0);
    if (otherTotal + deadlineTotal > purchase.value) {
      setInstallmentError(
        `Total of all deadlines (${(otherTotal + deadlineTotal).toFixed(2)}) would exceed original cost (${purchase.value.toFixed(2)}).`
      );
      setModifySaving(false);
      return;
    }
    setInstallmentError('');
    try {
      const expireToSave = toYmd(modifyForm.expireDate) || null;
      await updateInstallment(procedureType, purchase.id, id, {
        balance: newRest,
        paid: currentPaid,
        paymentDate: modifyForm.paymentDate,
        expireDate: expireToSave,
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
      debtTotal: Number(debtTotal) || 0,
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

  const isMemberDebt = procedureType === 'member_debt';
  const selectedInstallmentId = firstSelectedId();
  const canModifyDelete =
    !multiDeadlineMode &&
    Boolean(selectedInstallmentId) &&
    selectedInstallmentId !== 'current' &&
    selectedInstallmentIds.size === 1;

  if (totalRest <= 0) {
    return (
      <div className="rounded border border-green-200 bg-green-50 p-4 text-green-700">
        This record is fully paid.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="procedure-form space-y-3 text-gray-900">
        {/* Deadlines list + New/Modify/Delete */}
        <div>
          <h2 className="mb-1 text-[14px] font-semibold text-red-700">deadline</h2>
          <div className="flex gap-2">
            <div className="min-h-[140px] flex-1 overflow-y-auto border border-gray-400 bg-[#f4f7d8] p-2">
              <ul className="space-y-2 text-[13px]">
                {installmentRows.map((row) => {
                  const full = row.balance + row.paid;
                  const expire = effectiveExpireDate(row.expireDate, row.paymentDate);
                  return (
                    <li key={row.id}>
                      <label className="flex cursor-pointer items-start gap-2">
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
                          {isMemberDebt || multiDeadlineMode ? (
                            <>
                              <span className="font-semibold text-red-600">
                                {row.label ||
                                  `${purchase.typology}-${purchase.serviceName || purchase.notes || 'Member debt'}`}
                              </span>
                              <div className="mt-0.5 text-gray-800">
                                Expire date of{' '}
                                <span className="text-blue-600">{formatDisplayDate(expire)}</span>
                                {' '}of € {formatEuro(full)} Rest{' '}
                                <span className="font-semibold text-red-600">€ {formatEuro(row.balance)}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              Purchase service in section{' '}
                              <strong className="text-red-600">{sectionLabel}</strong>
                              <div className="mt-0.5 text-gray-700">
                                Expire date of{' '}
                                <span className="text-blue-600">{formatDisplayDate(expire)}</span>
                                {' '}of € {formatEuro(full)} Rest{' '}
                                <span className="font-semibold text-red-600">€ {formatEuro(row.balance)}</span>
                              </div>
                            </>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
                {installmentRows.length === 0 && (
                  <li className="text-gray-500">No deadlines found.</li>
                )}
              </ul>
              <p className="mt-2 border-t border-gray-300 pt-1 text-[12px] text-gray-700">
                Selected total:{' '}
                <strong className={selectedTotalRest > 0 ? 'text-red-700' : ''}>
                  {formatEuro(selectedTotalRest)}
                </strong>
              </p>
            </div>

            {!multiDeadlineMode && (
            <div className="flex w-[78px] shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={handleNewInstallment}
                className="rounded-sm border border-emerald-700 bg-emerald-600 px-2 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                New
              </button>
              <button
                type="button"
                onClick={handleModifyInstallment}
                disabled={!canModifyDelete}
                className="rounded-sm border border-sky-700 bg-sky-600 px-2 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={handleDeleteInstallment}
                disabled={!canModifyDelete}
                className="rounded-sm border border-red-800 bg-red-600 px-2 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                Delete
              </button>
            </div>
            )}
          </div>
          {installmentError && <p className="mt-1 text-[12px] text-red-600">{installmentError}</p>}
        </div>

        {/* Type of payment + Rest */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <fieldset className="rounded-sm border border-gray-400 p-3">
            <legend className="px-1 text-[13px] font-semibold text-gray-800">Type of payment</legend>
            <div className="flex flex-wrap gap-6 text-[13px]">
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
          </fieldset>

          <fieldset className="rounded-sm border border-gray-400 p-3">
            <legend className="px-1 text-[13px] font-semibold text-gray-800">Debt</legend>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <label className="block">
                <span className="text-gray-700">Total</span>
                <input
                  type="number"
                  step="0.01"
                  className={`mt-1 ${procedureHighlightInputClass}`}
                  style={{ backgroundColor: '#d3f07b' }}
                  value={debtTotal}
                  onChange={(e) => setDebtTotal(e.target.value)}
                  title="Sum of unpaid REST for deadlines with expiration date ≤ today"
                />
              </label>
              <label className="block">
                <span className="text-gray-700">Expired</span>
                <input
                  type="date"
                  className={`mt-1 ${procedureHighlightInputClass}`}
                  style={{ backgroundColor: '#d3f07b' }}
                  value={debtExpire}
                  onChange={(e) => setDebtExpire(e.target.value)}
                  title="Date of last expired deadline, or next upcoming expiration if none expired"
                />
              </label>
            </div>
          </fieldset>
        </div>

        <label className="block text-[13px]">
          <span className="text-gray-700">Description</span>
          <textarea
            className={`mt-1 ${procedureInputClass}`}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
          />
        </label>

        {/* Payment panel — PHP 2-column layout */}
        <div className="rounded-[12px] border border-[#9ec5c7] bg-[#c4e2e3] px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4 text-[13px]">
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Amount paid</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedTotalRest || totalRest}
                  className={`h-[30px] flex-1 ${procedureHighlightInputClass}`}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Date</span>
                <input
                  type="date"
                  className={`h-[30px] flex-1 ${procedureHighlightInputClass}`}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Pay with €</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`h-[30px] flex-1 ${procedureHighlightInputClass}`}
                  value={payWith}
                  onChange={(e) => setPayWith(e.target.value)}
                />
              </label>
              <div className="flex items-center gap-3">
                <span className="w-[100px] shrink-0" />
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    checked={taxDoc}
                    onChange={(e) => setTaxDoc(e.target.checked)}
                  />
                  Tax doc
                </label>
                <button
                  type="button"
                  onClick={() => setTaxModalOpen(true)}
                  disabled={!taxDoc}
                  className="rounded-sm border border-gray-500 bg-[#d9d9d9] px-3 py-1 text-[12px] text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Open form
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4 text-[13px]">
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Pay mode</span>
                <select
                  className="h-[30px] min-w-0 flex-1 border border-gray-400 bg-white px-2 text-[13px] leading-normal text-gray-900"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="">select</option>
                  {PAY_MODE_OPTIONS.filter((m) => m.value !== 'voucher').map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Operator</span>
                <select
                  className="h-[30px] min-w-0 flex-1 border border-gray-400 bg-white px-2 text-[13px] leading-normal text-gray-900"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                >
                  <option value="">select</option>
                  {options.operators.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3">
                <span className="w-[100px] shrink-0 text-right text-gray-800">Resto to give</span>
                <input
                  type="text"
                  readOnly
                  className={`h-[30px] flex-1 ${procedureInputClass}`}
                  style={{ backgroundColor: '#d3f07b' }}
                  value={restGive.toFixed(2)}
                />
              </label>
              <div className="flex items-center gap-3">
                <span className="w-[100px] shrink-0" />
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    checked={passwordRequired}
                    disabled={isPasswordEnabled}
                    onChange={(e) => setPasswordRequired(e.target.checked)}
                  />
                  Password
                </label>
                {passwordRequired && (
                  <div className="relative min-w-0 flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`h-[30px] w-full ${procedureInputClass}`}
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {nextRests.length > 0 && (
            <div className="mx-auto mt-4 max-w-3xl space-y-1 text-[12px] text-gray-700">
              {nextRests.map((r) => (
                <p key={r.id}>
                  <span className="font-medium">{r.label}</span> — Rest:{' '}
                  <strong className="text-red-600">{formatEuro(r.newRest)}</strong>
                </p>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
        {success && <p className="text-center text-[13px] text-green-700">{success}</p>}

        <div className="flex justify-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="min-w-[96px] rounded-sm bg-[#c62828] px-5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#b71c1c] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-w-[96px] rounded-sm bg-[#424242] px-5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#303030]"
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
        hideMemberName={notEnterCustData}
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
            <h3 className="text-lg font-medium text-gray-900">Modify deadline</h3>
            <label className="block">
              <span className="text-gray-600">Deadline</span>
              <input
                type="number"
                step="0.01"
                min={Number(modifyForm.paid) || 0}
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
                className={`mt-1 ${procedureReadonlyInputClass}`}
                disabled
                value={modifyForm.paid}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Payment date</span>
              <input
                type="date"
                className={`mt-1 ${procedureReadonlyInputClass}`}
                disabled
                value={modifyForm.paymentDate}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Expiration date</span>
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

      {newFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); void performNewInstallment(); }}
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 space-y-3 text-sm"
          >
            <h3 className="text-lg font-medium text-gray-900">New deadline</h3>
            <label className="block">
              <span className="text-gray-600">Deadline</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={`mt-1 ${procedureInputClass}`}
                value={newForm.balance}
                onChange={(e) => setNewForm((f) => ({ ...f, balance: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Expiration date</span>
              <input
                type="date"
                className={`mt-1 ${procedureInputClass}`}
                value={newForm.expireDate}
                onChange={(e) => setNewForm((f) => ({ ...f, expireDate: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-gray-600">Description</span>
              <textarea
                className={`mt-1 ${procedureInputClass}`}
                rows={2}
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewFormOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newFormSaving}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
              >
                {newFormSaving ? 'Saving...' : 'Save'}
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
          if (pendingAction === 'delete') void performDeleteInstallment();
          setPendingAction(null);
        }}
      />
    </>
  );
}

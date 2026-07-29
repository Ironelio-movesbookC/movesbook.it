'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ProcedureFormSection, {
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
  /** When paying multiple archive records, the procedure record id to charge. */
  recordId?: string;
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
  /** True when paying multiple archive deadline records at once. */
  multiRecord?: boolean;
};

type Props = {
  purchase: ServiceSalePurchase;
  /** Extra open deadlines (same member) from archive multi-select. */
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

function toYmd(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Expire date for ordering/display (expireDate, else paymentDate). */
function effectiveExpireDate(
  expireDate: string | null | undefined,
  paymentDate: string | null | undefined
): string {
  return toYmd(expireDate) || toYmd(paymentDate);
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
  const [debtTotal, setDebtTotal] = useState(String(totalRest || purchase.rest));
  const [debtExpire, setDebtExpire] = useState(purchase.paydate ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(purchase.notes);
  const [amountPaid, setAmountPaid] = useState('0');
  const [payMode, setPayMode] = useState('cash');
  const [taxDoc, setTaxDoc] = useState(true);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    setDebtTotal(String(totalRest || purchase.rest));
  }, [totalRest, purchase.rest]);

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

  type DeadlineListRow = {
    id: string;
    balance: number;
    paymentDate: string | null;
    expireDate: string | null;
    paid: number;
    disabled: boolean;
    label?: string;
    recordId: string;
  };

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
          label: `${p.sectorName}-${p.serviceName}`,
          recordId: p.id,
        }));
    }
    if (installments.length > 0) {
      return installments.map((row) => ({
        id: row.id,
        balance: row.balance,
        paymentDate: row.paymentDate,
        expireDate: row.expireDate,
        paid: row.paid,
        disabled: false,
        recordId: purchase.id,
      }));
    }
    const rows: DeadlineListRow[] = payments.map((p) => ({
      id: p.id,
      balance: p.balance,
      paymentDate: p.paymentDate,
      expireDate: p.paymentDate,
      paid: p.paid,
      disabled: true,
      recordId: purchase.id,
    }));
    if (purchase.rest > 0) {
      rows.unshift({
        id: 'current',
        balance: purchase.rest,
        paymentDate: purchase.paydate,
        expireDate: purchase.paydate,
        paid: purchase.pay,
        disabled: false,
        recordId: purchase.id,
      });
    }
    return rows;
  }, [multiDeadlineMode, allPurchases, installments, payments, purchase]);

  const selectedTotalRest = useMemo(() => {
    return installmentRows
      .filter((r) => selectedInstallmentIds.has(r.id))
      .reduce((sum, r) => sum + r.balance, 0);
  }, [installmentRows, selectedInstallmentIds]);

  // Default Amount paid = sum of selected Rests (operator may lower it, never raise above max).
  useEffect(() => {
    setAmountPaid(selectedTotalRest > 0 ? String(Number(selectedTotalRest.toFixed(2))) : '0');
  }, [selectedTotalRest]);

  const nextRests = useMemo(() => {
    // Oldest expire date first (client waterfall).
    const sorted = [...installmentRows]
      .filter((r) => selectedInstallmentIds.has(r.id))
      .sort((a, b) => {
        const ea = effectiveExpireDate(a.expireDate, a.paymentDate);
        const eb = effectiveExpireDate(b.expireDate, b.paymentDate);
        const byExpire = ea.localeCompare(eb);
        if (byExpire !== 0) return byExpire;
        return a.id.localeCompare(b.id);
      });
    let remaining = paidAmount;
    return sorted.map((r) => {
      const paidHere = Math.min(remaining, r.balance);
      remaining = Math.max(0, remaining - paidHere);
      const expire = effectiveExpireDate(r.expireDate, r.paymentDate);
      return {
        id: r.id,
        recordId: r.recordId,
        label: r.label
          ? `${r.label} · ${formatDisplayDate(expire)}`
          : formatDisplayDate(expire),
        newRest: Math.max(0, r.balance - paidHere),
        paidHere,
        paid: r.paid,
        balance: r.balance,
      };
    });
  }, [installmentRows, selectedInstallmentIds, paidAmount]);

  function clampAmountPaid(raw: string): string {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return '0';
    const max = selectedTotalRest;
    if (n > max) return String(Number(max.toFixed(2)));
    return String(n);
  }

  async function reloadInstallments() {
    const rows = await fetchInstallments(procedureType, purchase.id);
    setInstallments(rows);
  }

  function handleNewInstallment() {
    // Client: always allow New with exactly one selected deadline (any rest), then admin password.
    // If there are no deadline rows yet, still allow New after admin password.
    if (installmentRows.length > 0) {
      if (selectedInstallmentIds.size !== 1) {
        setInstallmentError('Select exactly one deadline to add a new one.');
        return;
      }
    }
    setInstallmentError('');
    setPendingAction('new');
    setShowAdminPasswordModal(true);
  }

  function openNewFormAfterAdminAuth() {
    setNewForm({ balance: '', expireDate: '', description: description || sectionLabel });
    setNewFormOpen(true);
  }

  async function performNewInstallment() {
    setInstallmentError('');
    const deadlineValue = Number(newForm.balance) || 0;
    if (deadlineValue <= 0) {
      setInstallmentError('Deadline amount must be greater than 0.');
      return;
    }
    setNewFormSaving(true);
    try {
      // No value limit: bump record total/rest by the new deadline amount.
      if (onAddToRecordTotal) {
        await onAddToRecordTotal(deadlineValue);
      }
      await createInstallment(procedureType, purchase.id, {
        balance: deadlineValue,
        paid: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        expireDate: newForm.expireDate || null,
        description: newForm.description || null,
      });
      setNewFormOpen(false);
      setSelectedInstallmentIds(new Set());
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
    setModifyForm({
      balance: String(row.balance + row.paid),
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
      await updateInstallment(procedureType, purchase.id, id, {
        balance: newRest,
        paid: currentPaid,
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
    if (paidAmount > selectedTotalRest) {
      setInstallmentError(
        `Amount paid cannot exceed selected Rest total (${selectedTotalRest.toFixed(2)}).`
      );
      return;
    }
    if (!operatorId) return;
    if (passwordRequired && !operatorPassword.trim()) return;

    // One saved payment per deadline that receives money (oldest expire first).
    const distributions: PaymentDistribution[] = [];
    for (const r of nextRests) {
      if (r.paidHere <= 0) continue;
      const row = installmentRows.find((ir) => ir.id === r.id);
      if (!row) continue;
      distributions.push({
        installmentId: r.id,
        recordId: row.recordId,
        amount: r.paidHere,
        newPaid: row.paid + r.paidHere,
        newBalance: r.newRest,
      });
    }

    if (distributions.length === 0) return;

    await onSubmit({
      amountPaid: paidAmount,
      paymentDate,
      description,
      payMode,
      paymentType,
      taxDoc,
      operatorId,
      operatorPassword,
      debtTotal: Number(debtTotal) || totalRest || purchase.value,
      debtExpire,
      payWith: payWithAmount,
      restGive,
      taxDocument: taxDocument ?? undefined,
      createReceipt: taxDoc,
      receiptNumber: taxDocument?.documentNumber || undefined,
      receiptAnnotations: taxDocument?.causal || undefined,
      distributions,
      multiRecord: multiDeadlineMode,
    });
  }

  const selectedInstallmentId = firstSelectedId();
  /** New: exactly one selected when rows exist; always free when no rows yet. */
  const canNewDeadline =
    !multiDeadlineMode &&
    (installmentRows.length === 0 || selectedInstallmentIds.size === 1);
  const canModifyDelete =
    !multiDeadlineMode &&
    Boolean(selectedInstallmentId) &&
    selectedInstallmentId !== 'current' &&
    selectedInstallmentIds.size === 1;
  const hasPayableRest = totalRest > 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {multiDeadlineMode && (
          <div className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Paying <strong>{allPurchases.filter((p) => p.rest > 0).length}</strong> open deadlines for{' '}
            <strong>{purchase.memberName}</strong> (combined rest {formatEuro(totalRest)}).
          </div>
        )}
        {!hasPayableRest && !multiDeadlineMode && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No open rest to pay. You can still select one deadline and use <strong>New</strong> (admin
            password) to add more debt with any amount.
          </div>
        )}
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
                      <span className={row.balance <= 0 ? 'opacity-60' : undefined}>
                        {multiDeadlineMode || row.label ? (
                          <>
                            <span className="font-semibold text-red-600">
                              {row.label || sectionLabel}
                            </span>
                            <div className="mt-0.5 text-gray-700">
                              Expire date of{' '}
                              <span className="text-blue-500">
                                {formatDisplayDate(effectiveExpireDate(row.expireDate, row.paymentDate))}
                              </span>
                              {' '}of € {formatEuro(row.balance + row.paid)} Rest{' '}
                              <span className="text-red-600">€ {formatEuro(row.balance)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            Purchase service in section{' '}
                            <strong className="text-red-600">{sectionLabel}</strong>
                            <ul className="mt-1 ml-2 text-gray-600">
                              <li>
                                Expire date of{' '}
                                <span className="text-blue-500">
                                  {formatDisplayDate(effectiveExpireDate(row.expireDate, row.paymentDate))}
                                </span>
                                {' '}of € {formatEuro(row.balance + row.paid)} Rest{' '}
                                <span className="text-red-600">€ {formatEuro(row.balance)}</span>
                              </li>
                            </ul>
                          </>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
                {installmentRows.length === 0 && (
                  <li className="text-gray-500">No deadlines yet. Use New to add one.</li>
                )}
              </ul>
            </div>
            {!multiDeadlineMode && (
            <div className="flex flex-col gap-2 md:w-28">
              <button
                type="button"
                onClick={handleNewInstallment}
                disabled={!canNewDeadline}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                New
              </button>
              <button
                type="button"
                onClick={handleModifyInstallment}
                disabled={!canModifyDelete}
                className="rounded bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={handleDeleteInstallment}
                disabled={!canModifyDelete}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Delete
              </button>
            </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selected total:{' '}
            <strong className={selectedTotalRest > 0 ? 'text-red-700' : ''}>
              {formatEuro(selectedTotalRest)}
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

        <div className="rounded border border-gray-300 p-4 space-y-4">
          {/*
            Same structure in every column: label line + control line.
            Empty label spacers keep Tax doc / Open form / Password on the input baseline.
          */}
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">
                Amount paid
                {selectedTotalRest > 0 && (
                  <span className="ml-1 font-normal text-gray-400">
                    (max {formatEuro(selectedTotalRest)})
                  </span>
                )}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                max={selectedTotalRest}
                className={`h-10 ${procedureHighlightInputClass}`}
                value={amountPaid}
                onChange={(e) => setAmountPaid(clampAmountPaid(e.target.value))}
                onBlur={(e) => setAmountPaid(clampAmountPaid(e.target.value))}
              />
            </label>
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">Pay mode</span>
              <select
                className={`h-10 ${procedureInputClass}`}
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
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem]" aria-hidden>
                &nbsp;
              </span>
              <div className="flex h-10 items-center gap-2">
                <input
                  type="checkbox"
                  checked={taxDoc}
                  onChange={(e) => setTaxDoc(e.target.checked)}
                />
                <span>Tax doc</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem]" aria-hidden>
                &nbsp;
              </span>
              <button
                type="button"
                onClick={() => setTaxModalOpen(true)}
                disabled={!taxDoc}
                className="h-10 rounded bg-gray-200 px-3 text-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Open form
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">Date</span>
              <input
                type="date"
                className={`h-10 ${procedureHighlightInputClass}`}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">Operator</span>
              <select
                className={`h-10 ${procedureInputClass}`}
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
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem]" aria-hidden>
                &nbsp;
              </span>
              <div className="flex h-10 items-center gap-2">
                <input
                  type="checkbox"
                  checked={passwordRequired}
                  disabled={isPasswordEnabled}
                  onChange={(e) => setPasswordRequired(e.target.checked)}
                />
                <span>Password</span>
              </div>
            </div>
            <div className="relative flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem]" aria-hidden>
                &nbsp;
              </span>
              {passwordRequired ? (
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`h-10 ${procedureInputClass}`}
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
              ) : (
                <div className="h-10" aria-hidden />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">Pay with €</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`h-10 ${procedureHighlightInputClass}`}
                value={payWith}
                onChange={(e) => setPayWith(e.target.value)}
              />
            </label>
            <label className="flex min-w-0 flex-col">
              <span className="mb-1 block min-h-[1.25rem] text-gray-600">Resto to give</span>
              <input
                type="text"
                readOnly
                className={`h-10 ${procedureInputClass}`}
                style={{ backgroundColor: '#d3f07b' }}
                value={restGive.toFixed(2)}
              />
            </label>
          </div>

          {nextRests.some((r) => r.paidHere > 0) && (
            <div className="text-sm text-gray-600 space-y-1">
              {nextRests
                .filter((r) => r.paidHere > 0)
                .map((r) => (
                  <p key={r.id}>
                    <span className="font-medium">{r.label}</span> — Pay{' '}
                    <strong className="text-teal-700">{formatEuro(r.paidHere)}</strong>
                    {' · '}Rest after:{' '}
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
            disabled={saving || !hasPayableRest || selectedInstallmentIds.size === 0 || paidAmount <= 0}
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
            <p className="text-xs text-gray-500">
              Amount may exceed current rest — record total will increase by this value.
            </p>
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
          if (pendingAction === 'new') openNewFormAfterAdminAuth();
          setPendingAction(null);
        }}
      />
    </>
  );
}

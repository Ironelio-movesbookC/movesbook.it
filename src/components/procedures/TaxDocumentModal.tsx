'use client';

import { useEffect, useState } from 'react';
import {
  procedureHighlightInputClass,
  procedureInputClass,
  procedureReadonlyInputClass,
} from './ProcedureFormLayout';

export type TaxDocumentFormValues = {
  documentType: string;
  heading: string;
  documentDate: string;
  documentNumber: string;
  causal: string;
  total: number;
  residualTotal: number;
  methodPayment: string;
  vatPercentage: number;
  vatAmount: number;
  net: number;
};

const DOCUMENT_TYPES = ['Invoice', 'Receipt', 'Credit note', 'Proforma'];

type Props = {
  open: boolean;
  memberName: string;
  initial?: Partial<TaxDocumentFormValues>;
  defaultTotal?: number;
  defaultResidual?: number;
  onClose: () => void;
  onSave: (values: TaxDocumentFormValues) => void;
};

function defaultValues(
  initial: Partial<TaxDocumentFormValues> | undefined,
  defaultTotal: number,
  defaultResidual: number
): TaxDocumentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    documentType: initial?.documentType ?? 'Invoice',
    heading: initial?.heading ?? '',
    documentDate: initial?.documentDate ?? today,
    documentNumber: initial?.documentNumber ?? '',
    causal: initial?.causal ?? '',
    total: initial?.total ?? defaultTotal,
    residualTotal: initial?.residualTotal ?? defaultResidual,
    methodPayment: initial?.methodPayment ?? 'D',
    vatPercentage: initial?.vatPercentage ?? 0,
    vatAmount: initial?.vatAmount ?? 0,
    net: initial?.net ?? defaultTotal,
  };
}

export default function TaxDocumentModal({
  open,
  memberName,
  initial,
  defaultTotal = 0,
  defaultResidual = 0,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<TaxDocumentFormValues>(() =>
    defaultValues(initial, defaultTotal, defaultResidual)
  );

  useEffect(() => {
    if (open) {
      setForm(defaultValues(initial, defaultTotal, defaultResidual));
    }
  }, [open, initial, defaultTotal, defaultResidual]);

  if (!open) return null;

  function update<K extends keyof TaxDocumentFormValues>(key: K, value: TaxDocumentFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-800">Tax document</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <span className="text-sm text-gray-600 md:text-right">Member</span>
            <div className="md:col-span-3">
              <input
                type="text"
                readOnly
                className={procedureReadonlyInputClass}
                value={memberName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <span className="text-sm text-gray-600 md:text-right">Document type</span>
            <div className="md:col-span-3">
              <select
                className={procedureInputClass}
                value={form.documentType}
                onChange={(e) => update('documentType', e.target.value)}
              >
                <option value="">Select option</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <span className="text-sm text-gray-600 md:text-right">Heading</span>
            <div className="md:col-span-3">
              <input
                type="text"
                className={procedureInputClass}
                value={form.heading}
                onChange={(e) => update('heading', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Date</span>
              <input
                type="date"
                className={`mt-1 ${procedureInputClass}`}
                value={form.documentDate}
                onChange={(e) => update('documentDate', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Number</span>
              <input
                type="text"
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={form.documentNumber}
                onChange={(e) => update('documentNumber', e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-600">Causal</span>
            <textarea
              className={`mt-1 ${procedureInputClass}`}
              rows={2}
              value={form.causal}
              onChange={(e) => update('causal', e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Total (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={form.total}
                onChange={(e) => update('total', Number(e.target.value) || 0)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Residual total (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureHighlightInputClass}`}
                value={form.residualTotal}
                onChange={(e) => update('residualTotal', Number(e.target.value) || 0)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Method payment</span>
              <select
                className={`mt-1 ${procedureInputClass}`}
                value={form.methodPayment}
                onChange={(e) => update('methodPayment', e.target.value)}
              >
                <option value="D">Down payment</option>
                <option value="B">Balance</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">VAT %</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureInputClass}`}
                value={form.vatPercentage}
                onChange={(e) => update('vatPercentage', Number(e.target.value) || 0)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">VAT amount (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureInputClass}`}
                value={form.vatAmount}
                onChange={(e) => update('vatAmount', Number(e.target.value) || 0)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Net (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1 ${procedureInputClass}`}
                value={form.net}
                onChange={(e) => update('net', Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-red-700 text-white rounded hover:bg-red-800 text-sm"
            >
              Save document
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

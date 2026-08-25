'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { createProcedureClient } from '@/lib/club/procedureClient';
import { PROCEDURE_TYPE_CODES, type ProcedureTypeCode } from '@/lib/procedures/types';
import { TAX_DOCUMENT_TYPE_OPTIONS } from '@/lib/procedures/taxDocumentDefaults';

type EditReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  procedureCode?: ProcedureTypeCode;
  receipt: {
    id: string;
    documentType: string;
    documentNumber: string;
    annotations: string;
  };
};

export default function EditReceiptModal({
  isOpen,
  onClose,
  onSaved,
  procedureCode = PROCEDURE_TYPE_CODES.SERVICE_SALE,
  receipt,
}: EditReceiptModalProps) {
  const client = useMemo(() => createProcedureClient(procedureCode), [procedureCode]);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [annotations, setAnnotations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDocumentType(receipt.documentType ?? '');
    setDocumentNumber(receipt.documentNumber ?? '');
    setAnnotations(receipt.annotations ?? '');
    setError(null);
    setSaving(false);
    setConfirmingDuplicate(false);
  }, [isOpen, receipt]);

  useEffect(() => {
    if (confirmingDuplicate) noButtonRef.current?.focus();
  }, [confirmingDuplicate]);

  if (!isOpen) return null;

  const performSave = async (confirmDuplicate: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await client.updateReceipt(receipt.id, {
        documentType: documentType || undefined,
        documentNumber: documentNumber || undefined,
        annotations: annotations || undefined,
        confirmDuplicate,
      });
      onSaved();
      onClose();
    } catch (e) {
      if (!confirmDuplicate && e instanceof Error && (e as Error & { duplicate?: boolean }).duplicate) {
        setConfirmingDuplicate(true);
        setSaving(false);
        return;
      }
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  const handleSave = () => void performSave(false);

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
          Edit Receipt
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="edit-receipt-doctype" className="mb-1 block text-sm text-gray-800">Document</label>
            <select
              id="edit-receipt-doctype"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              disabled={saving}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">-- Select --</option>
              {TAX_DOCUMENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-receipt-docnum" className="mb-1 block text-sm text-gray-800">No. of document</label>
            <input
              id="edit-receipt-docnum"
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              disabled={saving}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-receipt-annotations" className="mb-1 block text-sm text-gray-800">Annotation</label>
            <textarea
              id="edit-receipt-annotations"
              value={annotations}
              onChange={(e) => setAnnotations(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm disabled:opacity-60"
            />
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

      {confirmingDuplicate && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-gray-400 bg-[#f3f3f3] shadow-2xl">
            <div className="bg-[#6b1020] px-4 py-2.5 text-sm font-semibold text-white">
              Confirm duplicate document
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-800">
                The type of Document with this number already exist. Do you want confirm?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => void performSave(true)}
                  className="rounded-lg border border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-8 py-2.5 text-sm font-semibold text-white shadow"
                >
                  Yes
                </button>
                <button
                  ref={noButtonRef}
                  type="button"
                  onClick={() => setConfirmingDuplicate(false)}
                  className="rounded-lg border border-gray-900 bg-gradient-to-b from-gray-700 to-black px-8 py-2.5 text-sm font-semibold text-white shadow"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

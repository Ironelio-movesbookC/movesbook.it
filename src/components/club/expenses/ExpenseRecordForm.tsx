'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProcedureClient } from '@/lib/club/procedureClient';
import { getProcedureDefinition } from '@/lib/procedures/registry';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

type ExpenseFormOptions = {
  expenses: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

export default function ExpenseRecordForm() {
  const router = useRouter();
  const def = getProcedureDefinition(PROCEDURE_TYPE_CODES.EXPENSE)!;
  const client = useMemo(() => createProcedureClient(PROCEDURE_TYPE_CODES.EXPENSE), []);

  const [options, setOptions] = useState<ExpenseFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [memberId, setMemberId] = useState('');
  const [expenseId, setExpenseId] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [value, setValue] = useState('');
  const [pay, setPay] = useState('');
  const [paydate, setPaydate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [createReceipt, setCreateReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    client
      .fetchFormOptions<ExpenseFormOptions>()
      .then(setOptions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load options'))
      .finally(() => setLoading(false));
  }, [client]);

  const selectedExpense = options?.expenses.find((e) => e.id === expenseId);
  const total = Number(value) || 0;
  const paid = pay === '' ? 0 : Number(pay);
  const rest = Math.max(0, total - paid);

  useEffect(() => {
    if (selectedExpense) setExpenseName(selectedExpense.name);
  }, [selectedExpense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!memberId) return setError('Please select a member.');
    if (!expenseName.trim()) return setError('Please enter or select an expense.');
    if (total <= 0) return setError('Amount must be greater than zero.');
    if (paid > total) return setError('Initial payment cannot exceed total amount.');

    setSaving(true);
    try {
      await client.createRecord({
        memberId,
        totalAmount: total,
        initialPayment: paid,
        recordDate: paydate,
        notes: notes || null,
        expenseId: expenseId || null,
        expenseName: expenseName.trim(),
        payMode,
        createReceipt: createReceipt && paid > 0,
        receiptDocumentType: 'Invoice',
        receiptNumber: receiptNumber || undefined,
        receiptAnnotations: notes || undefined,
      });
      router.push(def.routes.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
          required
        >
          <option value="">Select member</option>
          {options?.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense category</label>
          <select
            value={expenseId}
            onChange={(e) => setExpenseId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Custom / type below</option>
            {options?.expenses.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense name</label>
          <input
            type="text"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Expense description"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total amount (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Initial payment (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={pay}
            onChange={(e) => setPay(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
          <input
            type="text"
            readOnly
            value={`€${rest.toFixed(2)}`}
            className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={paydate}
            onChange={(e) => setPaydate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode</label>
          <select
            value={payMode}
            onChange={(e) => setPayMode(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="expenseCreateReceipt"
          type="checkbox"
          checked={createReceipt}
          onChange={(e) => setCreateReceipt(e.target.checked)}
        />
        <label htmlFor="expenseCreateReceipt" className="text-sm font-medium text-gray-700">
          Create receipt for initial payment
        </label>
      </div>

      {createReceipt && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt number</label>
          <input
            type="text"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-700 text-white px-5 py-2 rounded hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save expense'}
        </button>
        <button
          type="button"
          onClick={() => router.push(def.routes.records)}
          className="border border-gray-300 px-5 py-2 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

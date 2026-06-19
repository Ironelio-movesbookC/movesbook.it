'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPurchase,
  fetchFormOptions,
  fetchServiceCost,
  type ServiceSaleFormOptions,
} from '@/lib/club/serviceSaleClient';

type Sector = { id: string; name: string };
type Service = { id: string; name: string; sectorId: string; cost: number };
type Member = { id: string; name: string };

export default function ServicePurchaseForm() {
  const router = useRouter();
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [memberId, setMemberId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [value, setValue] = useState('');
  const [pay, setPay] = useState('');
  const [paydate, setPaydate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [createReceipt, setCreateReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptAnnotations, setReceiptAnnotations] = useState('');

  useEffect(() => {
    fetchFormOptions().then(setOptions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = useMemo(() => {
    if (!options) return [];
    if (!sectorId) return options.services;
    return options.services.filter((s) => s.sectorId === sectorId);
  }, [options, sectorId]);

  const selectedMember = options?.members.find((m) => m.id === memberId);
  const selectedService = options?.services.find((s) => s.id === serviceId);
  const total = Number(value) || 0;
  const paid = pay === '' ? 0 : Number(pay);
  const rest = Math.max(0, total - paid);

  useEffect(() => {
    if (!serviceId || !options) return;
    const svc = options.services.find((s) => s.id === serviceId);
    if (svc) {
      setValue(String(svc.cost));
      if (sectorId !== svc.sectorId) setSectorId(svc.sectorId);
    }
  }, [serviceId, options, sectorId]);

  async function loadCostFromApi(id: string) {
    try {
      const cost = await fetchServiceCost(id);
      if (cost != null) setValue(String(cost));
    } catch {
      /* fallback to cached cost */
    }
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    if (id) loadCostFromApi(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!memberId) return setError('Please select a member.');
    if (!serviceId) return setError('Please select a service.');
    if (!value || Number(value) < 0) return setError('Please enter a valid cost.');
    if (paid > total) return setError('Payment cannot exceed total cost.');

    setSaving(true);
    try {
      const selectedSector = options?.sectors.find((s) => s.id === sectorId);
      const result = await createPurchase({
        userId: memberId,
        sectorId,
        serviceId,
        sectorName: selectedSector?.name,
        serviceName: selectedService?.name,
        value: total,
        pay: paid,
        paydate,
        notes,
        payMode,
        createReceipt: createReceipt && paid > 0,
        receiptDocumentType: 'Invoice',
        receiptNumber: receiptNumber || undefined,
        receiptAnnotations: receiptAnnotations || notes,
      });

      router.push(`/clubs/archive_service_list?created=${result.purchaseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-600">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h2 className="text-red-700 font-semibold">Movement data</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Member</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">Select member</option>
              {options?.members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {options && options.members.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No real members in the database for this club. The Members archive page
                (`/clubMembers/memberList`) still shows sample/demo rows — it is not connected
                to the DB yet. Add members from <strong>My Club</strong> (member management)
                or <code className="text-[11px]">/api/clubs/[clubId]/members/add</code>.
              </p>
            )}
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Date</span>
            <input
              type="date"
              className="mt-1 w-full border rounded px-3 py-2"
              value={paydate}
              onChange={(e) => setPaydate(e.target.value)}
            />
          </label>
          {selectedMember && (
            <div className="md:col-span-2 text-sm text-gray-700">
              Selected: <strong>{selectedMember.name}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h2 className="text-red-700 font-semibold">Service (Typology SERVICES)</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Sector / Typology</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={sectorId}
              onChange={(e) => {
                setSectorId(e.target.value);
                setServiceId('');
              }}
            >
              <option value="">Select sector</option>
              {options?.sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Service</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
            >
              <option value="">Select service</option>
              {filteredServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Cost (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full border rounded px-3 py-2"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          {selectedService && (
            <div className="flex items-end text-sm text-gray-600 pb-2">
              Service slot: <strong className="ml-1">{selectedService.name}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h2 className="text-red-700 font-semibold">Payment (optional — leave empty to skip)</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Payment IN (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full border rounded px-3 py-2 bg-yellow-50"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              placeholder="0 = skip payment"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Payment mode</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <div className="md:col-span-2 grid grid-cols-3 gap-2 text-sm bg-gray-50 p-3 rounded">
            <div>Total: <strong>€{total.toFixed(2)}</strong></div>
            <div>Paid: <strong>€{paid.toFixed(2)}</strong></div>
            <div>Rest: <strong className="text-red-600">€{rest.toFixed(2)}</strong></div>
          </div>
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">Notes</span>
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
      </div>

      {paid > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
            <input
              type="checkbox"
              id="createReceipt"
              checked={createReceipt}
              onChange={(e) => setCreateReceipt(e.target.checked)}
            />
            <label htmlFor="createReceipt" className="text-red-700 font-semibold">
              Create receipt / tax document
            </label>
          </div>
          {createReceipt && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-600">Document No.</span>
                <input
                  type="text"
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="e.g. 0001-2026"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm text-gray-600">Annotations</span>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2"
                  rows={2}
                  value={receiptAnnotations}
                  onChange={(e) => setReceiptAnnotations(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save service'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/clubs/archive_service_list')}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

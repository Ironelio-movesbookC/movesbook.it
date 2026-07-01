'use client';

import { useState } from 'react';
import { clubApiFetch } from '@/lib/club/servicePurchasesClient';

type Props = {
  clubId?: string | null;
};

type PreviewResult = {
  message: string;
  code: string;
  audioUrl: string | null;
  mode: string;
};

export default function AccessOutcomePreview({ clubId }: Props) {
  const [memberUserId, setMemberUserId] = useState('');
  const [outcomeCode, setOutcomeCode] = useState('A01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PreviewResult | null>(null);

  async function preview() {
    setError('');
    setResult(null);
    if (!memberUserId.trim()) {
      setError('Enter a member user id to preview the resolved message.');
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        memberUserId: memberUserId.trim(),
        code: outcomeCode.trim(),
      });
      if (clubId) qs.set('clubId', clubId);

      const data = await clubApiFetch<PreviewResult>(
        `/api/club/access/outcome-message?${qs.toString()}`
      );
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Preview access outcome message</h3>
      <p className="text-xs text-gray-600">
        Uses the club outcome mode (EN / country / custom) and the same resolver as card readers.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-600">Member user id</span>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
            placeholder="User id or legacy id"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Outcome code</span>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={outcomeCode}
            onChange={(e) => setOutcomeCode(e.target.value)}
            placeholder="A01, D01, …"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void preview()}
        disabled={loading}
        className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Preview message'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">
          <p>
            <strong>{result.code}</strong> — mode: {result.mode}
          </p>
          <p>{result.message}</p>
          {result.audioUrl && (
            <audio controls src={result.audioUrl} className="mt-2 w-full max-w-md">
              <track kind="captions" />
            </audio>
          )}
        </div>
      )}
    </div>
  );
}

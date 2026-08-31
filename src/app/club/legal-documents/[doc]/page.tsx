'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { getAuthHeaders } from '@/lib/club/servicePurchasesClient';
import {
  legalDocHtml,
  legalDocTitle,
  type ClubLegalDocKind,
  type ClubLegalDocuments,
} from '@/lib/club/clubLegalDocuments';

function isDocKind(value: string): value is ClubLegalDocKind {
  return value === 'rules' || value === 'privacy-policy';
}

function ClubLegalDocumentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawKind = String(params.doc || '');
  const kind = isDocKind(rawKind) ? rawKind : null;
  const clubIdFromQuery = searchParams.get('clubId') || '';
  const [clubId, setClubId] = useState(clubIdFromQuery);

  const [clubName, setClubName] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clubIdFromQuery) {
      setClubId(clubIdFromQuery);
      return;
    }
    const stored = localStorage.getItem('selectedClub') || '';
    setClubId(stored);
  }, [clubIdFromQuery]);

  useEffect(() => {
    if (!kind || !clubId) {
      setLoading(false);
      setError(!kind ? 'Unknown document.' : 'No club selected.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}/legal-documents`, {
          headers: getAuthHeaders(),
        });
        const data = (await res.json()) as {
          error?: string;
          clubName?: string;
          documents?: ClubLegalDocuments;
        };
        if (!res.ok) throw new Error(data.error || 'Failed to load document');
        if (cancelled) return;
        setClubName(data.clubName || '');
        setHtml(legalDocHtml(data.documents || { rulesHtml: '', privacyPolicyHtml: '' }, kind));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, clubId]);

  const title = kind ? legalDocTitle(kind) : 'Document';

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">{title}</h1>
          {clubName ? <p className="text-sm text-gray-600 sm:text-base">{clubName}</p> : null}
        </div>
        <Link
          href="/club/documents-editor"
          className="text-sm font-semibold text-red-700 hover:underline sm:text-base"
        >
          Documents Editor
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : html.trim() ? (
        <article
          className="prose prose-base min-h-[70vh] max-w-none rounded border border-gray-300 bg-white p-5 sm:p-8 md:prose-lg md:p-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="min-h-[40vh] rounded border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500 sm:p-10">
          This document has not been written yet. Club admins can add it in the Documents Editor.
        </p>
      )}
    </div>
  );
}

export default function ClubLegalDocumentPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading…</p>}>
      <ClubLegalDocumentContent />
    </Suspense>
  );
}

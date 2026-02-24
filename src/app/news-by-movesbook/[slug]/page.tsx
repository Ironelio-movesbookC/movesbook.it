'use client';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import NewsDetail from '@/components/news/NewsDetail';

function NewsDetailContent() {
  const params = useParams();
  const slug = params?.slug as string;

  return <NewsDetail newsId={slug} />;
}

export default function PublicNewsDisplayPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading article...</div>}>
      <NewsDetailContent />
    </Suspense>
  );
}

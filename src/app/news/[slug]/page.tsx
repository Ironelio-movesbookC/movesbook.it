'use client';

import { useParams } from 'next/navigation';
import NewsDetail from '@/components/news/NewsDetail';

export default function PublicNewsDisplayPage() {
  const params = useParams();
  const slug = params?.slug as string;

  return <NewsDetail newsId={slug} />;
}

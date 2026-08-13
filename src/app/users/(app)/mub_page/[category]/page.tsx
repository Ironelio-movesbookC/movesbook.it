import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import MubPageRoute from '../MubPageRouteClient';
import { mubCategoryFromPath } from '@/lib/mub/routes';

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function MubPageCategory({ params }: PageProps) {
  const { category } = await params;
  if (!mubCategoryFromPath(category)) notFound();

  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}>
      <MubPageRoute categorySlug={category} />
    </Suspense>
  );
}

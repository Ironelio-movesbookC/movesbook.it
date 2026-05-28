'use client';

import { useParams } from 'next/navigation';
import AddTypologySubscriptionPage from '../../add/page';

export default function EditTypologySubscriptionPage() {
  const params = useParams<{ id: string }>();
  const typologyId = String(params?.id ?? '');

  return <AddTypologySubscriptionPage typologyId={typologyId} />;
}

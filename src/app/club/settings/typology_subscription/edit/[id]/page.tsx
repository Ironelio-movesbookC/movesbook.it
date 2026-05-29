'use client';

import { useParams } from 'next/navigation';
import AddTypologySubscriptionForm from '@/components/club/settings/AddTypologySubscriptionForm';

export default function EditTypologySubscriptionPage() {
  const params = useParams<{ id: string }>();
  const typologyId = String(params?.id ?? '');

  return <AddTypologySubscriptionForm typologyId={typologyId} />;
}

'use client';

import { useParams } from 'next/navigation';
import TypologyListpriceForm from '@/components/club/settings/TypologyListpriceForm';

export default function EditTypologyListpricePage() {
  const params = useParams<{ id: string }>();
  return <TypologyListpriceForm mode="edit" listpriceId={String(params?.id ?? '')} />;
}

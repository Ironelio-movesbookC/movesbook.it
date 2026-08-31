'use client';

import ClubStaffProfileForm from '@/components/club/staff/ClubStaffProfileForm';

export default function EditClubStaffPage({ params }: { params: { id: string } }) {
  return <ClubStaffProfileForm mode="edit" staffId={params.id} />;
}

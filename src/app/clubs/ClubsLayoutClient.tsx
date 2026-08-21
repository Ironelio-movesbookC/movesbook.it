'use client';

import { usePathname } from 'next/navigation';
import ClubWorkspaceShell from '@/components/club/ClubWorkspaceShell';

/** Super-admin club purchase settings live outside the club member workspace shell. */
export default function ClubsLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/clubs/clubSettings')) {
    return <>{children}</>;
  }
  return <ClubWorkspaceShell>{children}</ClubWorkspaceShell>;
}

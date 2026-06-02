'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hide the visitor wall right column only when a guest opened the profile
 * from network search on the Movesbook main page (`?source=mainpage`).
 */
export function useVisitorWallHideRightColumn(): boolean {
  const searchParams = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  const fromMainpage = searchParams.get('source') === 'mainpage';
  if (!fromMainpage) return false;
  if (loading) return true;
  return !isAuthenticated;
}

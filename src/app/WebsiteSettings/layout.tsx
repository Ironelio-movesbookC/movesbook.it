'use client';

import ClubWorkspaceShell from '@/components/club/ClubWorkspaceShell';
import { useAuth } from '@/hooks/useAuth';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

/**
 * Club admins keep DarkSidebar / My Club section via ClubWorkspaceShell.
 * Athletes and other roles use the page shells' own chrome (display must stay reachable).
 */
export default function WebsiteSettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user && isClubAccountUserType(user.userType)) {
    return <ClubWorkspaceShell>{children}</ClubWorkspaceShell>;
  }

  return <>{children}</>;
}

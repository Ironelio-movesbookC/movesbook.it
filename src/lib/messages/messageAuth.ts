import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isStaffUserType } from '@/lib/panelAuth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';

export type MessageAuthUser = {
  userId: string;
  userType?: string;
  isStaff: boolean;
};

export function getMessageAuth(request: NextRequest): MessageAuthUser | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded?.userId) return null;
  return {
    userId: String(decoded.userId),
    userType: decoded.userType != null ? String(decoded.userType) : undefined,
    isStaff: decoded.userType === 'ADMIN' || isStaffUserType(decoded.userType),
  };
}

/** Resolves token to a users_new id (handles adminToken / super-admin / staff sessions). */
export async function requireMessageAuth(request: NextRequest): Promise<MessageAuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded?.userId) return null;

  const userType = decoded.userType != null ? String(decoded.userType) : undefined;
  const dbUserId = await resolveMessageDatabaseUserId(String(decoded.userId), userType);
  if (!dbUserId) return null;

  return {
    userId: dbUserId,
    userType,
    isStaff: userType === 'ADMIN' || isStaffUserType(userType),
  };
}

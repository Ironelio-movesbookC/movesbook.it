import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { parseMubCategory, parseMubScope, parseRoleTemplate } from '@/lib/mub/mubService';
import type { MubPageQuery } from '@/lib/mub/types';

export function getMubTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

export function parseMubPageRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = parseMubScope(searchParams.get('scope'));
  const category = parseMubCategory(searchParams.get('category'));
  const roleTemplate = parseRoleTemplate(searchParams.get('roleTemplate'));
  const ownerId = searchParams.get('ownerId') ?? null;
  const lang = searchParams.get('lang') ?? 'en';
  return { scope, category, roleTemplate, ownerId, lang };
}

export function resolveMubPageQuery(
  parsed: ReturnType<typeof parseMubPageRequest>,
  userId: string,
): MubPageQuery {
  const effectiveOwnerId = parsed.scope === 'USER' ? parsed.ownerId ?? userId : parsed.ownerId;
  return {
    scope: parsed.scope,
    category: parsed.category,
    roleTemplate: parsed.roleTemplate,
    ownerId: effectiveOwnerId,
  };
}

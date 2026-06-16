import { NextRequest, NextResponse } from 'next/server';
import { getQuickRegisterVersions } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userType = typeof body.userType === 'string' ? body.userType : String(body.userType ?? '');
  const promocodeVersionIds =
    typeof body.promocodeVersionIds === 'string' ? body.promocodeVersionIds : '';
  const versions = await getQuickRegisterVersions(userType, promocodeVersionIds);
  return NextResponse.json(versions);
}

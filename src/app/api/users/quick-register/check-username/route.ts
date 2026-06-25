import { NextRequest, NextResponse } from 'next/server';
import { checkQuickRegisterUsername } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  const email = req.nextUrl.searchParams.get('email') ?? '';
  const result = await checkQuickRegisterUsername(username, email);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username : '';
  const email = typeof body.email === 'string' ? body.email : '';
  const result = await checkQuickRegisterUsername(username, email);
  return NextResponse.json(result);
}

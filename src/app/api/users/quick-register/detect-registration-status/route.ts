import { NextRequest, NextResponse } from 'next/server';
import { buildRegistrationStatus } from '@/lib/users/quickRegisterService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? '';
  const status = await buildRegistrationStatus(email);
  return NextResponse.json({ success: true, status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const status = await buildRegistrationStatus(email);
  return NextResponse.json({ success: true, status });
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPromocodeByUser } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code ?? '').trim();
    const userid = Number(body.userid);
    const amount = Number(body.amount);

    if (!amount) {
      return NextResponse.json({ status: 'error', message: 'Total payment amount not display' });
    }
    if (!code) {
      return NextResponse.json({ status: 'error', message: 'Please enter your code' });
    }
    if (!Number.isFinite(userid)) {
      return NextResponse.json({ status: 'error', message: 'Invalid user' });
    }

    const result = await checkPromocodeByUser({ code, userid, amount });
    return NextResponse.json(result);
  } catch (e) {
    console.error('promocodes check-code POST:', e);
    return NextResponse.json({ status: 'error', message: 'Promocode not valid.' }, { status: 500 });
  }
}

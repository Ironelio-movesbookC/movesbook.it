import { NextResponse } from 'next/server';
import { generatePromocode } from '@/lib/promocodes/generatePromocode';

export const dynamic = 'force-dynamic';

/** Public — matches PHP PromocodesController::changeCode (Auth allow, no login required). */
function newCodeResponse() {
  return NextResponse.json({ code: generatePromocode() });
}

export async function GET() {
  return newCodeResponse();
}

export async function POST() {
  return newCodeResponse();
}

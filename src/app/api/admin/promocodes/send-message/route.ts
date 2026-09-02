import { NextRequest, NextResponse } from 'next/server';
import { sendIonosEmail } from '@/lib/ionosEmail';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlankHtml(value: string): boolean {
  const text = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

export async function POST(req: NextRequest) {
  const accessResult = await requirePromocodeAccess(req);
  if (!accessResult.ok) {
    return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
  }
  const access = accessResult.access;

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const to = body.to?.trim() ?? '';
  const subject = body.subject?.trim() || 'Message from Movesbook';
  const html = body.html?.trim() ?? '';

  if (!to || !EMAIL_PATTERN.test(to)) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
  }
  if (isBlankHtml(html)) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  }

  const replyTo = access.email?.trim() || undefined;

  try {
    await sendIonosEmail({
      to,
      subject,
      html,
      replyTo,
    });
    return NextResponse.json({ status: 'ok', message: `Message sent to ${to}.` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

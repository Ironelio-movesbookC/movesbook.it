import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendIonosEmail } from '@/lib/ionosEmail';
import { loadSendInvitePreview, sendPromocodeInvite } from '@/lib/promocodes/sendInviteService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Admin promocode invites are sent by Movesbook staff (PHP roles 1–3). */
function staffInviteContext(_auth: { ok: true; isSuperAdmin: boolean }) {
  return true;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sp = req.nextUrl.searchParams;
  const emailAddress = sp.get('email_address')?.trim() ?? '';
  const promocode = sp.get('promocode')?.trim() ?? '';
  const htmlPageId = sp.get('html_page_id')?.trim() ?? '';
  const languageId = sp.get('language_id')?.trim() ?? '1';
  const otherInfo = sp.get('other_info')?.trim() ?? '';
  const advPage = sp.get('adv_page')?.trim() ?? '';
  const username = sp.get('username')?.trim() ?? null;

  if (!emailAddress || !promocode) {
    return NextResponse.json({ error: 'email_address and promocode are required' }, { status: 400 });
  }

  try {
    const preview = await loadSendInvitePreview({
      emailAddress,
      promocode,
      htmlPageId,
      languageId,
      otherInfo,
      advPage,
      username,
      origin: req.nextUrl.origin,
      isStaff: staffInviteContext(auth),
      inviterUsername: username,
    });
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load invite preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    emailAddress?: string;
    promocode?: string;
    otherInfo?: string;
    advPage?: string;
    htmlPageId?: string;
    languageId?: string;
    emailContent?: string;
    inviterUsername?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await sendPromocodeInvite({
      emailAddress: body.emailAddress?.trim() ?? '',
      promocode: body.promocode?.trim() ?? '',
      languageId: body.languageId?.trim() ?? '',
      htmlPageId: body.htmlPageId?.trim() ?? '',
      otherInfo: body.otherInfo?.trim() ?? '',
      advPage: body.advPage?.trim() ?? '',
      emailContent: body.emailContent?.trim() ?? '',
      origin: req.nextUrl.origin,
      isStaff: staffInviteContext(auth),
      inviterUsername: body.inviterUsername?.trim() ?? null,
      sendEmail: async ({ to, subject, html, replyTo }) => {
        await sendIonosEmail({
          to,
          subject,
          html,
          replyTo,
        });
      },
    });

    if (result.status === 'error') {
      return NextResponse.json({ status: result.status, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ status: result.status, message: result.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sendIonosEmail } from '@/lib/ionosEmail';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { loadSendInvitePreview, sendPromocodeInvite } from '@/lib/promocodes/sendInviteService';
import { resolvePublicOrigin } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const accessResult = await requirePromocodeAccess(req);
  if (!accessResult.ok) {
    return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
  }
  const access = accessResult.access;

  const sp = req.nextUrl.searchParams;
  const emailAddress = sp.get('email_address')?.trim() ?? '';
  const promocode = sp.get('promocode')?.trim() ?? '';
  const htmlPageId = sp.get('html_page_id')?.trim() ?? '';
  const languageId = sp.get('language_id')?.trim() ?? '1';
  const otherInfo = sp.get('other_info')?.trim() ?? '';
  const advPage = sp.get('adv_page')?.trim() ?? '';
  const username = access.isAdmin ? sp.get('username')?.trim() ?? null : access.username;
  const introMessage = sp.get('intro_message')?.trim() ?? '';

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
      origin: resolvePublicOrigin(req),
      isStaff: access.isStaff,
      inviterUsername: username,
      senderLegacyUserId: access.legacyUserId,
      senderEmail: access.email,
    });
    if (introMessage) {
      preview.emailBodyHtml = `<p>${introMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/\n/g, '<br/>')}</p>${preview.emailBodyHtml}`;
    }
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load invite preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessResult = await requirePromocodeAccess(req);
  if (!accessResult.ok) {
    return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
  }
  const access = accessResult.access;

  let body: {
    emailAddress?: string;
    promocode?: string;
    otherInfo?: string;
    advPage?: string;
    htmlPageId?: string;
    languageId?: string;
    emailContent?: string;
    inviterUsername?: string;
    introMessage?: string;
    inviteMode?: string;
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
      origin: resolvePublicOrigin(req),
      isStaff: access.isStaff,
      inviterUsername: access.isAdmin ? body.inviterUsername?.trim() ?? null : access.username,
      senderLegacyUserId: access.isAdmin ? null : access.legacyUserId,
      senderEmail: access.isAdmin ? null : access.email,
      senderName: access.isAdmin ? null : access.username ?? access.email,
      introMessage: body.introMessage,
      inviteMode: body.inviteMode || 'Mail',
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

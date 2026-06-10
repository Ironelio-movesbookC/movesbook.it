import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyToken } from '@/lib/auth';
import { buildShareEmailHtml, isValidShareEmail } from '@/lib/shareEmail';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Email service is not configured on this server (RESEND_API_KEY missing).' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const shareLink = typeof body.shareLink === 'string' ? body.shareLink.trim() : '';
    const subject =
      typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim()
        : 'Workout plan shared from Movesbook';

    if (!to || !isValidShareEmail(to)) {
      return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
    }

    if (!message && !shareLink) {
      return NextResponse.json({ error: 'Message or share link is required' }, { status: 400 });
    }

    const fullMessage =
      message || `View this workout plan on Movesbook:\n\n${shareLink}`;
    const html = buildShareEmailHtml(fullMessage, shareLink);

    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || 'Movesbook <onboarding@resend.dev>';

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: shareLink ? `${fullMessage}\n\n${shareLink}` : fullMessage,
    });

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message || 'Failed to send email' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, id: response.data?.id });
  } catch (error: unknown) {
    console.error('Share email error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

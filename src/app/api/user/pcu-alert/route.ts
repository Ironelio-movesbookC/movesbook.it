import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPcuSettings } from '@/lib/admin/userPcuSettings';
import {
  resolvePcuAlertDisplay,
  type PcuAlertTrigger,
} from '@/lib/admin/userPcuAlertMsg';

export const dynamic = 'force-dynamic';

function parseTrigger(value: string | null): PcuAlertTrigger | null {
  if (value === 'login' || value === 'logout') return value;
  return null;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const trigger = parseTrigger(url.searchParams.get('trigger'));
    if (!trigger) {
      return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 });
    }

    const langParam = url.searchParams.get('lang')?.trim().toLowerCase();

    const settings = await prisma.userSettings.findUnique({
      where: { userId: decoded.userId },
      select: { language: true, adminSettings: true },
    });

    const lang = langParam === 'it' || langParam === 'en'
      ? langParam
      : settings?.language === 'it'
        ? 'it'
        : 'en';

    const pcu = readPcuSettings(settings?.adminSettings);
    const alert = resolvePcuAlertDisplay(pcu, trigger, lang);

    if (!alert) {
      return NextResponse.json({ show: false });
    }

    return NextResponse.json({ show: true, alert });
  } catch (error) {
    console.error('PCU alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

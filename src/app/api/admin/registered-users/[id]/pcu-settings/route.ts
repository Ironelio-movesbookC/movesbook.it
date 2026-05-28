import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type PcuSettingsPayload = {
  extend?: { enabled?: boolean; months?: string };
  assignment?: { asOperator?: boolean; operatorId?: string; asAgent?: boolean; agentId?: string };
  publishing?: {
    enableFeedback?: boolean;
    enableBlogs?: boolean;
    blogsDate?: string;
    enableReviews?: boolean;
    reviewsDate?: string;
    disableComments?: {
      reviews?: boolean;
      suggestions?: boolean;
      htmlDocsNews?: boolean;
      queries?: boolean;
      bugs?: boolean;
      blogs?: boolean;
    };
  };
  sponsors?: {
    enableSponsors?: boolean;
    lastPurchase?: string;
    expirationDate?: string;
    numberEnabled?: string;
    costLastPurchase?: string;
    paymentStatus?: string;
  };
  blocks?: {
    blockUserEnabled?: boolean;
    blockUserAfterDate?: string;
    blockAreas?: { social?: boolean; training?: boolean; management?: boolean };
    blockAssignmentsEnabled?: boolean;
    blockAssignmentsAfterDate?: string;
  };
  alert?: { enabled?: boolean; htmlByLang?: Record<string, string> };
  vip?: {
    showInReferenceList?: boolean;
    showInBanner?: boolean;
    username?: string;
    youtubeUrl?: string;
    referencesHtmlByLang?: Record<string, string>;
    priorityLevel?: string;
    favourite?: boolean;
  };
};

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as PcuSettingsPayload | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  const prev = (() => {
    if (!settings?.adminSettings) return {};
    try {
      return JSON.parse(settings.adminSettings);
    } catch {
      return {};
    }
  })();

  const next = {
    ...prev,
    pcu: {
      ...(prev?.pcu || {}),
      ...body,
      updatedAt: new Date().toISOString(),
    },
  };

  if (settings) {
    await prisma.userSettings.update({
      where: { userId },
      data: { adminSettings: JSON.stringify(next) },
    });
  } else {
    await prisma.userSettings.create({
      data: {
        userId,
        widgetArrangement: '{}',
        colorSettings: '{}',
        adminSettings: JSON.stringify(next),
        favouritesSettings: '{}',
        myBestSettings: '{}',
        notificationSettings: '{}',
        socialSettings: '{}',
        toolsSettings: '{}',
        workoutPreferences: '{}',
      },
    });
  }

  return NextResponse.json({ ok: true });
}


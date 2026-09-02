import { prisma } from '@/lib/prisma';
import {
  OGP_SPONSOR_SETTINGS_ID,
  clampDelayMs,
  clampIntervalRows,
  clampStartRow,
  isSponsorLinkTarget,
  isSponsorSize,
  type OgpSponsor,
  type OgpSponsorSettings,
} from '@/lib/news/ogpSponsors';

let enabledColumnReady = false;

async function ensureEnabledColumn() {
  if (enabledColumnReady) return;
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `ogp_news_sponsor_settings` ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true',
    );
  } catch (e) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code?: string }).code) : '';
    const message = e instanceof Error ? e.message : String(e);
    if (!code.includes('ER_DUP_FIELDNAME') && !/Duplicate column|already exists/i.test(message)) {
      throw e;
    }
  }
  enabledColumnReady = true;
}

export async function ensureSponsorSettings() {
  await ensureEnabledColumn();
  return prisma.ogpNewsSponsorSettings.upsert({
    where: { id: OGP_SPONSOR_SETTINGS_ID },
    create: { id: OGP_SPONSOR_SETTINGS_ID },
    update: {},
    include: {
      sponsors: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

export function serializeSponsorSettings(row: {
  startRow: number;
  intervalRows: number;
  delayMs: number;
  enabled?: boolean | null;
  sponsors: {
    id: string;
    image: string;
    size: string;
    hoverTitle: string | null;
    linkUrl: string;
    linkTarget: string;
    sortOrder: number;
  }[];
}): OgpSponsorSettings {
  return {
    startRow: clampStartRow(row.startRow),
    intervalRows: clampIntervalRows(row.intervalRows),
    delayMs: clampDelayMs(row.delayMs),
    enabled: row.enabled !== false,
    sponsors: row.sponsors.map((s, index): OgpSponsor => ({
      id: s.id,
      image: s.image,
      size: isSponsorSize(s.size) ? s.size : 'single',
      hoverTitle: s.hoverTitle ?? '',
      linkUrl: s.linkUrl,
      linkTarget: isSponsorLinkTarget(s.linkTarget) ? s.linkTarget : 'tab',
      sortOrder: s.sortOrder ?? index,
    })),
  };
}

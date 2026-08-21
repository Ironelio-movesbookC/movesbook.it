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

export async function ensureSponsorSettings() {
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

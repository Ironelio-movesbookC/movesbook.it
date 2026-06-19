import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

const SERVICE_TABLE_CANDIDATES = ['club_setting_services', 'club_setting_service'];
const SECTOR_TABLE_CANDIDATES = ['club_setting_sectors', 'club_setting_sector'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type ServiceSaleFormOptions = {
  sectors: { id: string; name: string }[];
  services: { id: string; name: string; sectorId: string; cost: number }[];
  members: { id: string; name: string }[];
};

export async function fetchServiceSaleFormOptions(clubId: string): Promise<ServiceSaleFormOptions> {
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  const sectorTable = await findExistingTable(SECTOR_TABLE_CANDIDATES);

  const sectors: { id: string; name: string }[] = [];
  const services: { id: string; name: string; sectorId: string; cost: number }[] = [];
  const members: { id: string; name: string }[] = [];

  if (sectorTable) {
    const sectorRows = await prisma.$queryRawUnsafe<{ id: bigint | number; sector_name: string }[]>(
      `SELECT id, sector_name FROM \`${sectorTable}\` ORDER BY sector_name ASC`
    );
    for (const s of sectorRows) {
      sectors.push({ id: String(s.id), name: text(s.sector_name) });
    }
  }

  if (serviceTable) {
    const serviceRows = await prisma.$queryRawUnsafe<
      {
        id: bigint | number;
        service_name: string;
        sector_id: string | number | null;
        club_currency_cost: string | number | null;
      }[]
    >(
      `SELECT id, service_name, sector_id, club_currency_cost FROM \`${serviceTable}\` ORDER BY service_name ASC`
    );
    for (const s of serviceRows) {
      services.push({
        id: String(s.id),
        name: text(s.service_name),
        sectorId: s.sector_id != null ? String(s.sector_id) : '',
        cost: num(s.club_currency_cost),
      });
    }
  }

  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      member: {
        select: { id: true, name: true, firstName: true, surname: true, username: true },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  for (const cm of clubMembers) {
    const m = cm.member;
    const name =
      [m.firstName, m.surname].filter(Boolean).join(' ').trim() || m.name || m.username;
    if (!name) continue;
    members.push({ id: m.id, name });
  }

  members.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { sectors, services, members };
}

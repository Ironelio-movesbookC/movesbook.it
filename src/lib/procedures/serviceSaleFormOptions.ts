import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { fetchProcedureCustomerOptions } from './clubMembers';
import { fetchClubOperatorOptions } from './clubOperators';

const SERVICE_TABLE_CANDIDATES = ['club_setting_services', 'club_setting_service'];
const SECTOR_TABLE_CANDIDATES = ['club_setting_sectors', 'club_setting_sector'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    tableName,
    columnName
  );
  return rows.length > 0;
}

function normalizeServiceImagePath(value: unknown): string | null {
  const image = text(value);
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/api/media/img/services/')) return image;
  if (image.startsWith('/img/services/')) return `/api/media${image}`;
  if (image.startsWith('img/services/')) return `/api/media/${image}`;
  if (image.startsWith('/')) return image;
  return `/api/media/img/services/${image.replace(/^\/+/, '')}`;
}

export type ServiceSaleFormOptions = {
  sectors: { id: string; name: string }[];
  services: { id: string; name: string; sectorId: string; cost: number; imageUrl: string | null }[];
  members: { id: string; name: string }[];
  operators: { id: string; name: string }[];
  currentOperatorId: string | null;
};

export async function fetchServiceSaleFormOptions(
  clubId: string,
  currentUserId?: string | null
): Promise<ServiceSaleFormOptions> {
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  const sectorTable = await findExistingTable(SECTOR_TABLE_CANDIDATES);

  const sectors: { id: string; name: string }[] = [];
  const services: { id: string; name: string; sectorId: string; cost: number; imageUrl: string | null }[] = [];
  if (sectorTable) {
    const sectorRows = await prisma.$queryRawUnsafe<{ id: bigint | number; sector_name: string }[]>(
      `SELECT id, sector_name FROM \`${sectorTable}\` ORDER BY sector_name ASC`
    );
    for (const s of sectorRows) {
      sectors.push({ id: String(s.id), name: text(s.sector_name) });
    }
  }

  if (serviceTable) {
    const hasAvailableColumn = await tableHasColumn(serviceTable, 'service_available');
    const serviceRows = await prisma.$queryRawUnsafe<
      {
        id: bigint | number;
        service_name: string;
        sector_id: string | number | null;
        club_currency_cost: string | number | null;
        service_img: string | null;
      }[]
    >(
      `SELECT id, service_name, sector_id, club_currency_cost, service_img
       FROM \`${serviceTable}\`
       ${hasAvailableColumn ? 'WHERE service_available IS NULL OR service_available <> 0' : ''}
       ORDER BY service_name ASC`
    );
    for (const s of serviceRows) {
      services.push({
        id: String(s.id),
        name: text(s.service_name),
        sectorId: s.sector_id != null ? String(s.sector_id) : '',
        cost: num(s.club_currency_cost),
        imageUrl: normalizeServiceImagePath(s.service_img),
      });
    }
  }

  const members = await fetchProcedureCustomerOptions(clubId);
  const operators = await fetchClubOperatorOptions(clubId);

  return { sectors, services, members, operators, currentOperatorId: currentUserId ?? null };
}

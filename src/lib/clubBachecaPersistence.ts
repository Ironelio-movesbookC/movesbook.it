import { randomUUID } from 'crypto';
import { prisma, prismaConnect } from '@/lib/prisma';
import {
  bachecaLabelSlotIndex,
  createInitialBachecaLabels,
  mergeBachecaLabelsWithDefaults,
  normalizeBachecaLabel,
  type BachecaLabel,
} from '@/lib/clubBachecaLabels';

const TABLE_NAME = 'bacheca_settings';

type BachecaSettingsRow = {
  label_key: string;
  name: string;
  activated: number | boolean;
  content: string;
  updated_on?: string | Date | null;
  updated_at?: string | Date | null;
};

async function ensureBachecaSettingsTable(): Promise<void> {
  await prismaConnect();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      club_id VARCHAR(191) NOT NULL,
      label_key VARCHAR(64) NOT NULL,
      slot_index INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      activated TINYINT(1) NOT NULL DEFAULT 0,
      content LONGTEXT NOT NULL,
      updated_on VARCHAR(64) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uniq_bacheca_club_label (club_id, label_key),
      INDEX idx_bacheca_settings_club (club_id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`${TABLE_NAME}\`
      MODIFY COLUMN updated_at DATETIME(3) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  `);

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`${TABLE_NAME}\`
        ADD COLUMN updated_on VARCHAR(64) NULL
    `);
  } catch {
    // Column already exists
  }
}

function toBooleanFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function formatFallbackDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function rowToLabel(row: BachecaSettingsRow): BachecaLabel {
  const updatedOn =
    (typeof row.updated_on === 'string' && row.updated_on.trim()) ||
    formatFallbackDate(row.updated_at) ||
    '';
  return normalizeBachecaLabel({
    id: row.label_key,
    name: row.name,
    activated: toBooleanFlag(row.activated),
    content: row.content ?? '',
    updatedOn,
  });
}

export async function loadClubBachecaLabels(clubId: string): Promise<BachecaLabel[]> {
  await ensureBachecaSettingsTable();

  const rows = await prisma.$queryRawUnsafe<BachecaSettingsRow[]>(
    `SELECT label_key, name, activated, content, updated_on, updated_at
     FROM \`${TABLE_NAME}\`
     WHERE club_id = ?
     ORDER BY slot_index ASC`,
    clubId,
  );

  if (rows.length === 0) {
    return createInitialBachecaLabels();
  }

  return mergeBachecaLabelsWithDefaults(rows.map(rowToLabel));
}

export async function upsertClubBachecaLabel(
  clubId: string,
  label: Pick<BachecaLabel, 'id' | 'name' | 'activated' | 'content' | 'updatedOn'>,
): Promise<BachecaLabel> {
  await ensureBachecaSettingsTable();

  const trimmedName = label.name.trim();
  if (!trimmedName) {
    throw new Error('Label name is required');
  }

  const slotIndex = bachecaLabelSlotIndex(label.id);
  const activated = label.activated ? 1 : 0;
  const content = label.content ?? '';
  const updatedOn = (label.updatedOn ?? '').trim();

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id
     FROM \`${TABLE_NAME}\`
     WHERE club_id = ?
       AND label_key = ?
     LIMIT 1`,
    clubId,
    label.id,
  );

  if (existing[0]?.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${TABLE_NAME}\`
       SET name = ?,
           activated = ?,
           content = ?,
           updated_on = ?,
           slot_index = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      trimmedName,
      activated,
      content,
      updatedOn || null,
      slotIndex,
      existing[0].id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${TABLE_NAME}\`
         (id, club_id, label_key, slot_index, name, activated, content, updated_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      randomUUID(),
      clubId,
      label.id,
      slotIndex,
      trimmedName,
      activated,
      content,
      updatedOn || null,
    );
  }

  return normalizeBachecaLabel({
    id: label.id,
    name: trimmedName,
    activated: label.activated,
    content,
    updatedOn,
  });
}

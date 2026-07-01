import { randomUUID } from 'crypto';
import { prisma, prismaConnect } from '@/lib/prisma';
import {
  bachecaLabelSlotIndex,
  createInitialBachecaLabels,
  mergeBachecaLabelsWithDefaults,
  type BachecaLabel,
} from '@/lib/clubBachecaLabels';

const TABLE_NAME = 'bacheca_settings';

type BachecaSettingsRow = {
  label_key: string;
  name: string;
  activated: number | boolean;
  content: string;
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
}

function toBooleanFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function rowToLabel(row: BachecaSettingsRow): BachecaLabel {
  return {
    id: row.label_key,
    name: row.name,
    activated: toBooleanFlag(row.activated),
    content: row.content ?? '',
  };
}

export async function loadClubBachecaLabels(clubId: string): Promise<BachecaLabel[]> {
  await ensureBachecaSettingsTable();

  const rows = await prisma.$queryRawUnsafe<BachecaSettingsRow[]>(
    `SELECT label_key, name, activated, content
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
  label: Pick<BachecaLabel, 'id' | 'name' | 'activated' | 'content'>,
): Promise<BachecaLabel> {
  await ensureBachecaSettingsTable();

  const trimmedName = label.name.trim();
  if (!trimmedName) {
    throw new Error('Label name is required');
  }

  const slotIndex = bachecaLabelSlotIndex(label.id);
  const activated = label.activated ? 1 : 0;
  const content = label.content ?? '';

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
           slot_index = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      trimmedName,
      activated,
      content,
      slotIndex,
      existing[0].id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${TABLE_NAME}\`
         (id, club_id, label_key, slot_index, name, activated, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      randomUUID(),
      clubId,
      label.id,
      slotIndex,
      trimmedName,
      activated,
      content,
    );
  }

  return {
    id: label.id,
    name: trimmedName,
    activated: label.activated,
    content,
  };
}

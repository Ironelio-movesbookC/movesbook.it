import { prisma } from '@/lib/prisma';
import {
  createEmptyLanesForDays,
  LANE_DAY_KEYS,
  parseLanesForDaysRows,
  type LanesForDaysMatrix
} from '@/lib/lanesForDays';

const LANES_FOR_DAYS_TABLE = 'lanes_for_days';

async function lanesForDaysTableExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${LANES_FOR_DAYS_TABLE}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

/** Creates the legacy CakePHP table when missing (local/dev DBs without full import). */
async function ensureLanesForDaysTable(): Promise<boolean> {
  if (await lanesForDaysTableExists()) {
    return true;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${LANES_FOR_DAYS_TABLE}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      subscription_typology_id BIGINT NOT NULL,
      day VARCHAR(20) NOT NULL,
      lane_1 TINYINT NOT NULL DEFAULT 0,
      lane_2 TINYINT NOT NULL DEFAULT 0,
      lane_3 TINYINT NOT NULL DEFAULT 0,
      lane_4 TINYINT NOT NULL DEFAULT 0,
      lane_5 TINYINT NOT NULL DEFAULT 0,
      lane_6 TINYINT NOT NULL DEFAULT 0,
      lane_7 TINYINT NOT NULL DEFAULT 0,
      lane_8 TINYINT NOT NULL DEFAULT 0,
      lane_9 TINYINT NOT NULL DEFAULT 0,
      lane_10 TINYINT NOT NULL DEFAULT 0,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lanes_for_days_typology (subscription_typology_id),
      UNIQUE KEY uniq_lanes_for_days_typology_day (subscription_typology_id, day)
    )
  `);

  return lanesForDaysTableExists();
}

export async function fetchLanesForDays(typologyId: string): Promise<LanesForDaysMatrix> {
  if (!(await ensureLanesForDaysTable())) {
    return createEmptyLanesForDays();
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT day, lane_1, lane_2, lane_3, lane_4, lane_5, lane_6, lane_7, lane_8, lane_9, lane_10
     FROM \`${LANES_FOR_DAYS_TABLE}\`
     WHERE subscription_typology_id = ?`,
    typologyId
  );

  return parseLanesForDaysRows(rows);
}

type LaneAvailability = { available: boolean; limit: string };

export async function saveLanesForDays(
  typologyId: string,
  matrix: LanesForDaysMatrix,
  laneAvailability: LaneAvailability[]
): Promise<boolean> {
  if (!(await ensureLanesForDaysTable())) {
    return false;
  }

  const existing = await prisma.$queryRawUnsafe<{ id: string | number; day: string }[]>(
    `SELECT id, day
     FROM \`${LANES_FOR_DAYS_TABLE}\`
     WHERE subscription_typology_id = ?`,
    typologyId
  );

  const idByDay = new Map(existing.map((row) => [String(row.day).toLowerCase(), String(row.id)]));

  for (let dayIndex = 0; dayIndex < LANE_DAY_KEYS.length; dayIndex += 1) {
    const day = LANE_DAY_KEYS[dayIndex];
    const laneValues: number[] = [];

    for (let laneIndex = 0; laneIndex < 10; laneIndex += 1) {
      const laneEnabled = laneAvailability[laneIndex]?.available === true;
      const dayEnabled = matrix[dayIndex]?.[laneIndex] === true;
      laneValues.push(laneEnabled && dayEnabled ? 1 : 0);
    }

    const existingId = idByDay.get(day);

    if (existingId) {
      await prisma.$executeRawUnsafe(
        `UPDATE \`${LANES_FOR_DAYS_TABLE}\`
         SET lane_1 = ?, lane_2 = ?, lane_3 = ?, lane_4 = ?, lane_5 = ?,
             lane_6 = ?, lane_7 = ?, lane_8 = ?, lane_9 = ?, lane_10 = ?
         WHERE id = ?`,
        ...laneValues,
        existingId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${LANES_FOR_DAYS_TABLE}\`
         (subscription_typology_id, day, lane_1, lane_2, lane_3, lane_4, lane_5,
          lane_6, lane_7, lane_8, lane_9, lane_10)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        typologyId,
        day,
        ...laneValues
      );
    }
  }

  return true;
}

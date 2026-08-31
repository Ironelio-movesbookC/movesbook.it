import { prisma } from '@/lib/prisma';
import { findClubByCompanyUsername } from '@/lib/club/clubDirectLogin';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import { parseEntityDescriptionMeta } from '@/lib/entity/entityForm';
import { verifyDirectAccessPassword } from '@/lib/entity/entityDirectAccessPassword';
import {
  getEntityProfilePath,
  type EntityDirectAccessKind,
} from '@/lib/entity/entityDirectAccessMeta';

export type EntityDirectAccessLoginResult = {
  adminId: string;
  kind: EntityDirectAccessKind;
  entityId: string;
  redirectTo: string;
};

type EntityRow = {
  id: string;
  adminId: string;
  description: string | null;
};

function findEntityByCompanyUsername(
  rows: EntityRow[],
  loginIdentifier: string,
): EntityRow | null {
  const needle = loginIdentifier.trim().toLowerCase();
  if (!needle) return null;

  for (const row of rows) {
    const meta = parseEntityDescriptionMeta(row.description);
    const username = meta.username?.trim().toLowerCase();
    if (username && username === needle) return row;
  }
  return null;
}

function matchDirectAccess(
  row: EntityRow,
  password: string,
  kind: EntityDirectAccessKind,
): EntityDirectAccessLoginResult | null {
  const meta = parseEntityDescriptionMeta(row.description);
  if (kind === 'club') {
    const clubMeta = parseClubDescriptionMeta(row.description);
    if (!verifyDirectAccessPassword(password, clubMeta.directAccess)) return null;
  } else if (!verifyDirectAccessPassword(password, meta.directAccess)) {
    return null;
  }
  return {
    adminId: row.adminId,
    kind,
    entityId: row.id,
    redirectTo: getEntityProfilePath(kind, row.id),
  };
}

/**
 * Entity username + Direct Access → entity profile only (no My Page).
 * Tries club, coaching group, team, then group (same order as company login).
 */
export async function tryEntityDirectAccessLogin(
  loginIdentifier: string,
  password: string,
): Promise<EntityDirectAccessLoginResult | null> {
  const needle = loginIdentifier.trim();
  if (!needle || !password.trim()) return null;

  const clubs = await prisma.$queryRaw<
    { id: string; adminId: string; description: string | null }[]
  >`
    SELECT id, adminId, description
    FROM clubs_new
    WHERE description IS NOT NULL
  `;
  const clubMatch = findClubByCompanyUsername(clubs, needle);
  if (clubMatch) {
    const row = clubs.find((c) => c.id === clubMatch.clubId);
    if (row) {
      const hit = matchDirectAccess(row, password, 'club');
      if (hit) return hit;
    }
  }

  const coachingGroups = await prisma.coachingGroup.findMany({
    where: { description: { not: null } },
    select: { id: true, coachId: true, description: true },
  });
  const coachRow = findEntityByCompanyUsername(
    coachingGroups.map((g) => ({
      id: g.id,
      adminId: g.coachId,
      description: g.description,
    })),
    needle,
  );
  if (coachRow) {
    const hit = matchDirectAccess(coachRow, password, 'coach');
    if (hit) return hit;
  }

  const teams = await prisma.team.findMany({
    where: { description: { not: null } },
    select: { id: true, adminId: true, description: true },
  });
  const teamRow = findEntityByCompanyUsername(
    teams.map((t) => ({
      id: t.id,
      adminId: t.adminId,
      description: t.description,
    })),
    needle,
  );
  if (teamRow) {
    const hit = matchDirectAccess(teamRow, password, 'team');
    if (hit) return hit;
  }

  const groups = await prisma.group.findMany({
    where: { description: { not: null } },
    select: { id: true, adminId: true, description: true },
  });
  const groupRow = findEntityByCompanyUsername(
    groups.map((g) => ({
      id: g.id,
      adminId: g.adminId,
      description: g.description,
    })),
    needle,
  );
  if (groupRow) {
    const hit = matchDirectAccess(groupRow, password, 'group');
    if (hit) return hit;
  }

  return null;
}

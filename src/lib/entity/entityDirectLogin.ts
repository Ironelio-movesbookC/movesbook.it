import { prisma } from '@/lib/prisma';
import { verifyClubCompanyPassword } from '@/lib/club/clubDirectLogin';
import { parseEntityDescriptionMeta } from '@/lib/entity/entityForm';

export type EntityCompanyLoginResult = {
  adminId: string;
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

async function matchEntityLogin(
  row: EntityRow,
  password: string,
  redirectTo: string,
): Promise<EntityCompanyLoginResult | null> {
  const meta = parseEntityDescriptionMeta(row.description);
  const passwordOk = await verifyClubCompanyPassword(password, meta.clubPasswordHash);
  if (!passwordOk) return null;
  return { adminId: row.adminId, redirectTo };
}

/**
 * Company login: entity username + My Password opens that entity profile
 * (club, coached group, team, or group).
 */
export async function tryEntityCompanyLogin(
  loginIdentifier: string,
  password: string,
): Promise<EntityCompanyLoginResult | null> {
  const needle = loginIdentifier.trim();
  if (!needle || !password.trim()) return null;

  const clubs = await prisma.$queryRaw<EntityRow[]>`
    SELECT id, adminId, description
    FROM clubs_new
    WHERE description IS NOT NULL
  `;
  const clubRow = findEntityByCompanyUsername(clubs, needle);
  if (clubRow) {
    const hit = await matchEntityLogin(
      clubRow,
      password,
      `/my-club?clubId=${encodeURIComponent(clubRow.id)}`,
    );
    if (hit) return hit;
  }

  const coachingGroups = await prisma.coachingGroup.findMany({
    where: { description: { not: null } },
    select: { id: true, coachId: true, description: true },
  });
  const coachRows: EntityRow[] = coachingGroups.map((g) => ({
    id: g.id,
    adminId: g.coachId,
    description: g.description,
  }));
  const coachRow = findEntityByCompanyUsername(coachRows, needle);
  if (coachRow) {
    const hit = await matchEntityLogin(
      coachRow,
      password,
      `/my-coaching-group?groupId=${encodeURIComponent(coachRow.id)}`,
    );
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
    const hit = await matchEntityLogin(
      teamRow,
      password,
      `/my-team?teamId=${encodeURIComponent(teamRow.id)}`,
    );
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
    const hit = await matchEntityLogin(
      groupRow,
      password,
      `/my-group?groupId=${encodeURIComponent(groupRow.id)}`,
    );
    if (hit) return hit;
  }

  return null;
}

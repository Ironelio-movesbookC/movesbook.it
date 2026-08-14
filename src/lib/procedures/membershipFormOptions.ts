import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { fetchProcedureCustomerOptions } from './clubMembers';
import { fetchClubOperatorOptions } from './clubOperators';
import { listCompanies } from '@/lib/club/archives/clubArchiveService';
import type { ClubAuthContext } from './types';

const MEMBERSHIP_TABLE_CANDIDATES = ['club_setting_memberships', 'club_setting_membership', 'memberships'];
const PLAN_TABLE_CANDIDATES = ['club_setting_membership_plans', 'membership_plans'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type MembershipFormOptions = {
  memberships: { id: string; name: string; cost: number }[];
  plans: { id: string; name: string }[];
  members: { id: string; name: string }[];
  operators: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  currentOperatorId: string | null;
};

export async function fetchMembershipFormOptions(
  ctx: ClubAuthContext
): Promise<MembershipFormOptions> {
  const memberships: { id: string; name: string; cost: number }[] = [];
  const plans: { id: string; name: string }[] = [];
  
  const membershipTable = await findExistingTable(MEMBERSHIP_TABLE_CANDIDATES);
  const planTable = await findExistingTable(PLAN_TABLE_CANDIDATES);

  if (membershipTable) {
    const rows = await prisma.$queryRawUnsafe<
      { id: bigint | number; name: string | null; cost: string | number | null }[]
    >(`SELECT id, name, cost FROM \`${membershipTable}\` ORDER BY name ASC LIMIT 100`);
    for (const row of rows) {
      memberships.push({
        id: String(row.id),
        name: text(row.name) || `Membership ${row.id}`,
        cost: num(row.cost),
      });
    }
  }

  if (planTable) {
    const rows = await prisma.$queryRawUnsafe<{ id: bigint | number; plan_name: string }[]>(
      `SELECT id, plan_name FROM \`${planTable}\` ORDER BY plan_name ASC`
    );
    for (const row of rows) {
      plans.push({ id: String(row.id), name: text(row.plan_name) });
    }
  }

  const [members, operators, companies] = await Promise.all([
    fetchProcedureCustomerOptions(ctx.club.id),
    fetchClubOperatorOptions(ctx.club.id),
    listCompanies(ctx),
  ]);

  return {
    memberships,
    plans,
    members,
    operators,
    companies,
    currentOperatorId: ctx.userId,
  };
}

import { fetchProcedureCustomerOptions } from './clubMembers';
import { fetchClubOperatorOptions } from './clubOperators';
import { listCompanies } from '@/lib/club/archives/clubArchiveService';
import type { ClubAuthContext } from './types';
import { MEMBER_CREDIT_TYPOLOGY_OPTIONS } from './validators/memberCredit';

export type MemberCreditFormOptions = {
  members: { id: string; name: string; image?: string | null }[];
  operators: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  typologies: { value: string; label: string }[];
  currentOperatorId: string | null;
};

export async function fetchMemberCreditFormOptions(
  ctx: ClubAuthContext
): Promise<MemberCreditFormOptions> {
  const [members, operators, companies] = await Promise.all([
    fetchProcedureCustomerOptions(ctx.club.id),
    fetchClubOperatorOptions(ctx.club.id),
    listCompanies(ctx),
  ]);

  return {
    members,
    operators,
    companies,
    typologies: MEMBER_CREDIT_TYPOLOGY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    currentOperatorId: ctx.userId,
  };
}

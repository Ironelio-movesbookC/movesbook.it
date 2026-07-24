import { redirect } from 'next/navigation';

/** "Other debts" in Archives → member-debt deadlines (PHP typology Member debts). */
export default function OtherDebtsPage() {
  redirect('/clubs/member_debt_dead_line');
}

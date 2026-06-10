import { parseEntityDescriptionMeta } from '@/lib/entity/entityForm';

export function findEntityByCompanyUsername(
  rows: { description: string | null }[],
  loginIdentifier: string,
): boolean {
  const needle = loginIdentifier.trim().toLowerCase();
  if (!needle) return false;

  for (const row of rows) {
    const meta = parseEntityDescriptionMeta(row.description);
    const username = meta.username?.trim().toLowerCase();
    if (username && username === needle) return true;
  }
  return false;
}

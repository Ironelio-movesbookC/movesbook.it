/** Workflow status for Suggestions & Problems (staff-editable, user-visible). */

export const SUPPORT_WORKFLOW_STATUS_CODES = [
  'pending',
  'progress',
  'future',
  'solved',
  'unsolvable',
] as const;

export type SupportWorkflowStatus = (typeof SUPPORT_WORKFLOW_STATUS_CODES)[number];

export const SUPPORT_WORKFLOW_STATUS_LABELS: Record<SupportWorkflowStatus, string> = {
  pending: 'Pending',
  progress: 'In progress',
  future: 'To be resolved in the future',
  solved: 'Solved',
  unsolvable: 'Unsolvable',
};

export function isSupportWorkflowCategory(category?: string | null): boolean {
  return category === 'suggestion' || category === 'problem';
}

export function isSupportWorkflowStatus(value: unknown): value is SupportWorkflowStatus {
  return (
    typeof value === 'string' &&
    (SUPPORT_WORKFLOW_STATUS_CODES as readonly string[]).includes(value)
  );
}

/** Normalize DB / legacy values for display & edit controls. */
export function normalizeSupportWorkflowStatus(
  raw: string | null | undefined,
): SupportWorkflowStatus {
  if (isSupportWorkflowStatus(raw)) return raw;
  // Legacy assistance codes → closest workflow status
  if (raw === 'S') return 'pending';
  if (raw === 'C') return 'solved';
  if (raw === 'D') return 'unsolvable';
  return 'pending';
}

export function supportWorkflowStatusLabel(raw: string | null | undefined): string {
  return SUPPORT_WORKFLOW_STATUS_LABELS[normalizeSupportWorkflowStatus(raw)];
}

export function defaultStatusForSupportCategory(category?: string | null): string | null {
  if (isSupportWorkflowCategory(category)) return 'pending';
  if (category) return 'S'; // legacy Started for other support kinds
  return null;
}

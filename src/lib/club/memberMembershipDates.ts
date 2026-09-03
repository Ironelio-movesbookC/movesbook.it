/** Client-safe membership date helpers (no Node / Prisma imports). */

export function renewMembershipDates(currentFrom: string, currentTo: string): {
  from: string;
  to: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  const baseEnd = currentTo && currentTo >= today ? currentTo : today;
  const end = new Date(`${baseEnd}T12:00:00`);
  end.setFullYear(end.getFullYear() + 1);
  return {
    from: currentFrom || today,
    to: end.toISOString().slice(0, 10),
  };
}

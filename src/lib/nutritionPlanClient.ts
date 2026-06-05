/** Map API nutrition plan shape for UI (meals + legacy `workouts` alias). */

export function mapNutritionPlanForClient<T extends { weeks?: unknown[] } | null>(
  plan: T
): T {
  if (!plan || !Array.isArray(plan.weeks)) return plan;

  const weeks = plan.weeks.map((week: any) => ({
    ...week,
    days: Array.isArray(week.days)
      ? week.days.map((day: any) => {
          const meals = day.meals ?? day.workouts ?? [];
          return {
            ...day,
            meals,
            workouts: meals,
          };
        })
      : week.days,
  }));

  return { ...plan, weeks };
}

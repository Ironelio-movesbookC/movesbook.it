'use client';

/** Decorative food-group circles shown at the top of the My Nutrition planner (Yearly Plan view). */
const FOOD_GROUPS = [
  {
    label: 'Carbohydrates',
    bg: 'bg-sky-500',
    ring: 'ring-sky-300',
    emoji: '🌾',
  },
  {
    label: 'Fats and sweets',
    bg: 'bg-pink-500',
    ring: 'ring-pink-300',
    emoji: '🍩',
  },
  {
    label: 'Proteins and dairy',
    bg: 'bg-amber-400',
    ring: 'ring-amber-200',
    emoji: '🥩',
  },
  {
    label: 'Fruits and vegetables',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-300',
    emoji: '🥦',
  },
] as const;

export default function NutritionFoodGroupsBanner() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-10">
        {FOOD_GROUPS.map((group) => (
          <div key={group.label} className="flex w-[110px] flex-col items-center gap-2">
            <div
              className={`h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24 ${group.bg} ring-4 ${group.ring} flex items-center justify-center text-3xl sm:text-4xl shadow-md`}
              aria-hidden
            >
              {group.emoji}
            </div>
            <span className="flex min-h-[2.5rem] w-full items-center justify-center text-center text-xs font-semibold leading-tight text-gray-800 sm:min-h-[2.75rem] sm:text-sm">
              {group.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

export type MemberArchiveSection =
  | 'athletes'
  | 'staff'
  | 'parents'
  | 'settings';

const SECTIONS: Array<{ id: MemberArchiveSection; label: string }> = [
  { id: 'athletes', label: 'Athletes\\Members' },
  { id: 'staff', label: 'Staff' },
  { id: 'parents', label: "Athletes' parents" },
  { id: 'settings', label: 'Settings' },
];

type Props = {
  active: MemberArchiveSection;
  onChange: (section: MemberArchiveSection) => void;
};

/**
 * Top section switcher on Archive of Members (Club / Team).
 */
export default function MemberArchiveTopNav({ active, onChange }: Props) {
  return (
    <nav
      className="mb-3 grid w-full grid-cols-2 gap-px overflow-hidden rounded-md bg-[#1e293b] sm:grid-cols-4"
      aria-label="Archive of Members sections"
    >
      {SECTIONS.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`min-h-[3rem] px-3 py-3 text-center text-sm font-bold tracking-wide sm:text-base md:text-lg ${
              isActive
                ? 'bg-[#0f172a] text-white'
                : 'bg-[#334155] text-slate-100 hover:bg-[#1e293b] hover:text-white'
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

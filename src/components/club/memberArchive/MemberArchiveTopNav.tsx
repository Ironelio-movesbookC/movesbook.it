'use client';

export type MemberArchiveSection =
  | 'athletes'
  | 'pending'
  | 'not-members'
  | 'parents'
  | 'staff'
  | 'club-profile'
  | 'settings';

type Props = {
  active: MemberArchiveSection;
  onChange: (section: MemberArchiveSection) => void;
  /** Club Profile / Team Profile / Coach Profile / Group Profile */
  profileSectionLabel?: string;
};

/**
 * Top section switcher on Archive of Members (Club / Team / Coach / Group).
 * The five official voices, plus the entity profile and Settings.
 */
export default function MemberArchiveTopNav({
  active,
  onChange,
  profileSectionLabel = 'Club Profile',
}: Props) {
  const sections: Array<{ id: MemberArchiveSection; label: string }> = [
    { id: 'athletes', label: 'Athletes\\members' },
    { id: 'pending', label: 'Members in pending' },
    { id: 'not-members', label: 'Athletes not members' },
    { id: 'parents', label: 'Parents & Tutors' },
    { id: 'staff', label: 'Club Staff' },
    { id: 'club-profile', label: profileSectionLabel },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <nav
      className="mb-3 grid w-full grid-cols-2 gap-px overflow-hidden rounded-md bg-[#1e293b] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7"
      aria-label="Archive of Members sections"
    >
      {sections.map((section) => {
        const isActive = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(section.id)}
            className={`min-h-[3rem] px-3 py-3 text-center text-sm font-bold tracking-wide sm:text-base ${
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

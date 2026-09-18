'use client';

import { useMemo } from 'react';

export type MemberArchiveSection =
  | 'athletes'
  | 'pending'
  | 'archived'
  | 'not-members'
  | 'parents'
  | 'staff'
  | 'club-profile'
  | 'settings';

/** Archive top-nav audience: Club Admin (ID8) / Team Admin (ID7) vs Coach (ID6). */
export type MemberArchiveNavRole = 'club-or-team' | 'coach';

type Props = {
  active: MemberArchiveSection;
  onChange: (section: MemberArchiveSection) => void;
  /** Club Profile / Team Profile / Coach Profile / Group Profile */
  profileSectionLabel?: string;
  /** Controls which black-menu voices are shown. */
  navRole?: MemberArchiveNavRole;
};

/**
 * Top section switcher on Archive of Users (Club / Team / Coach).
 * ID7 Team Admin & ID8 Club Admin share one page layout; Coach (ID6) gets a shorter menu.
 */
export default function MemberArchiveTopNav({
  active,
  onChange,
  profileSectionLabel = 'Club Profile',
  navRole = 'club-or-team',
}: Props) {
  const sections = useMemo(() => {
    if (navRole === 'coach') {
      return [
        { id: 'athletes' as const, label: 'Members' },
        { id: 'pending' as const, label: 'In pending' },
        { id: 'archived' as const, label: 'Archived' },
        { id: 'parents' as const, label: 'Parents & Tutors' },
        { id: 'club-profile' as const, label: profileSectionLabel || 'Coach profile' },
        { id: 'settings' as const, label: 'Settings' },
      ];
    }

    return [
      { id: 'athletes' as const, label: 'Members' },
      { id: 'pending' as const, label: 'In pending' },
      { id: 'archived' as const, label: 'Archived' },
      { id: 'not-members' as const, label: 'Not members' },
      { id: 'parents' as const, label: 'Parents & Tutors' },
      { id: 'staff' as const, label: 'Our Staff' },
      { id: 'club-profile' as const, label: profileSectionLabel },
      { id: 'settings' as const, label: 'Settings' },
    ];
  }, [navRole, profileSectionLabel]);

  const colClass =
    navRole === 'coach'
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8';

  return (
    <nav
      className={`mb-3 grid w-full gap-px overflow-hidden rounded-md bg-[#1e293b] ${colClass}`}
      aria-label="Archive of Users sections"
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

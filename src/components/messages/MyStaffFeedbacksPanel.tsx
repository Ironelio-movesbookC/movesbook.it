'use client';

import StaffMessagesExperience from '@/components/messages/StaffMessagesExperience';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  /** Optional close control for dashboards that return to a previous section */
  onClose?: () => void;
  initialCategory?: string;
};

/** Your Supports feed for the main center column (keeps existing left/right sidebars). */
export default function MyStaffFeedbacksPanel({ onClose, initialCategory = 'feedback' }: Props) {
  const { user } = useAuth();
  const legacyUserId = user?.id != null ? String(user.id) : undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {onClose ? (
        <div className="flex justify-end mb-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      ) : null}
      <StaffMessagesExperience
        variant="page"
        initialMainTab="support"
        initialCategory={initialCategory}
        initialScope="mine"
        hideMainTabs
        legacyMode
        legacyUserId={legacyUserId}
      />
    </div>
  );
}

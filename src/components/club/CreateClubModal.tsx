'use client';

import { X } from 'lucide-react';
import ClubProfileEditor, {
  type ClubProfileSavePayload,
} from '@/components/club/ClubProfileEditor';

export type CreateClubFormPayload = ClubProfileSavePayload;

export { CLUB_CATEGORY_OPTIONS } from '@/components/club/ClubProfileEditor';

type CreateClubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  adminUsername?: string;
  onSave: (payload: CreateClubFormPayload) => Promise<void>;
  saving?: boolean;
};

export default function CreateClubModal({
  isOpen,
  onClose,
  adminUsername = 'username',
  onSave,
  saving = false,
}: CreateClubModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-club-modal-title"
    >
      <div className="relative my-auto w-full max-w-4xl border border-gray-400 bg-[#f3f3f3] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded p-1 text-white/90 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div id="create-club-modal-title" className="sr-only">
          Create club
        </div>

        <ClubProfileEditor
          mode="create"
          adminUsername={adminUsername}
          onSave={onSave}
          saving={saving}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

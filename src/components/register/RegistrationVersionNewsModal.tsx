'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getInfoVersionHtmlForRegistration } from '@/lib/admin/subscriptionSlogan';
import { getSubscriptionEditData } from '@/lib/admin/subscriptionSettingsMock';
import type { SubscriptionEditData } from '@/types/adminSubscriptionSettings';

type RegistrationVersionNewsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  versionId: number | null;
  versionName?: string;
  lang: string;
  editData?: SubscriptionEditData | null;
};

/** Modal opened by "News about version" — shows Info version content from subscription admin. */
export default function RegistrationVersionNewsModal({
  isOpen,
  onClose,
  versionId,
  versionName,
  lang,
  editData: editDataProp,
}: RegistrationVersionNewsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const editData =
    editDataProp ?? (versionId ? getSubscriptionEditData(versionId, false) : null);
  const infoHtml = getInfoVersionHtmlForRegistration(editData, lang);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#7a1f2e] px-4 py-3 text-white">
          <h3 className="font-bold text-sm uppercase">
            Info version{versionName ? ` — ${versionName}` : ''}
          </h3>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {infoHtml ? (
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: infoHtml }}
            />
          ) : (
            <p className="text-sm text-gray-600">
              Info version content for this plan will be available soon.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

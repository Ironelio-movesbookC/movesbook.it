'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, User, X } from 'lucide-react';
import { COUNTRIES_WITH_CODES } from '@/lib/news/countries';
import { clubSearchResultsPath } from '@/lib/searchresultsPaths';

export interface ClubUserPanelData {
  modalTitle: string;
  fullName: string;
  username: string;
  officialName: string;
  clubname: string;
  country: string;
  city: string;
  sport: string;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  paid: number;
  adminImageUrl: string | null;
  clubId: string | null;
  typeBadge: string;
  /** `/searchresults/search/[club name]` — public visitor wall */
  visitPagePath: string | null;
  /** Personal website from profile (opens in new tab) */
  websiteUrl: string | null;
}

interface AdminClubUserPanelModalProps {
  isOpen: boolean;
  loading: boolean;
  error: string;
  data: ClubUserPanelData | null;
  onClose: () => void;
  onControlPanel?: () => void;
}

const isDataUrl = (src?: string | null) => typeof src === 'string' && src.startsWith('data:image/');

function flagEmojiFromCode(code: string): string {
  const cc = (code || '').trim().toUpperCase();
  if (cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
}

function countryCodeFromName(name: string): string {
  if (!name.trim()) return '';
  return COUNTRIES_WITH_CODES.find((c) => c.name === name.trim())?.id ?? '';
}

function PanelRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-sm">
      <span className="font-bold text-gray-900">{label}</span>
      <span className={valueClassName ?? 'text-gray-900'}>{value || '—'}</span>
    </div>
  );
}

const FOOTER_ACTIONS = [
  { id: 'control', label: 'Control Panel' },
  { id: 'visit', label: 'Visit user page' },
  { id: 'website', label: 'Website' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'payments', label: 'Payments' },
  { id: 'account', label: 'Account' },
] as const;

export default function AdminClubUserPanelModal({
  isOpen,
  loading,
  error,
  data,
  onClose,
  onControlPanel,
}: AdminClubUserPanelModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const countryCode = data ? countryCodeFromName(data.country) : '';
  const flag = countryCode ? flagEmojiFromCode(countryCode) : '';
  const isClubPanel =
    Boolean(data?.modalTitle?.toLowerCase().includes('club')) ||
    data?.typeBadge?.toLowerCase() === 'club' ||
    data?.version?.toLowerCase().includes('club');
  const visitPath =
    data?.visitPagePath?.trim() ||
    (isClubPanel && data?.officialName
      ? clubSearchResultsPath(data.officialName)
      : null) ||
    (data?.username?.trim()
      ? `/searchresults/search/${encodeURIComponent(data.username.trim())}`
      : null);
  const websiteUrl = data?.websiteUrl?.trim() || null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-user-panel-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-300 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 bg-red-600 shrink-0" aria-hidden />
            <h2 id="club-user-panel-title" className="text-base font-bold text-gray-900 truncate">
              {data?.modalTitle ?? 'online_old_Club'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center text-gray-600 text-sm">Loading user panel…</div>
        )}

        {!loading && error && (
          <div className="px-6 py-8 text-center text-red-700 text-sm">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            <div className="px-4 py-4 flex items-start justify-between gap-3 border-b border-gray-100">
              <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {data.adminImageUrl ? (
                  isDataUrl(data.adminImageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.adminImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image src={data.adminImageUrl} alt="" width={56} height={56} className="object-cover w-full h-full" />
                  )
                ) : (
                  <User className="w-7 h-7 text-gray-400" />
                )}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center min-h-[4.5rem] px-2">
                <Camera className="w-8 h-8 text-green-600 mb-1" />
                <span className="text-xs text-gray-500 text-center">No Photo Available</span>
              </div>

              <div className="flex flex-col items-center shrink-0 w-16">
                <span className="text-2xl leading-none" title={data.country}>
                  {flag || '🏳️'}
                </span>
                <span className="text-xs font-semibold text-gray-800 mt-1">{data.typeBadge}</span>
                <span className="w-full h-2 bg-red-600 mt-1 rounded-sm" />
              </div>
            </div>

            <div className="px-5 py-3 space-y-0.5">
              <PanelRow label="Full Name:" value={data.fullName} />
              <PanelRow label="Username:" value={data.username} />
              <PanelRow label="Official:" value={data.officialName} />
              <PanelRow label="Clubname:" value={data.clubname} />
              <PanelRow label="Country:" value={data.country} />
              <PanelRow label="City:" value={data.city} />
              <PanelRow label="Sport:" value={data.sport} />
              <PanelRow label="Data Start:" value={data.dateStart} />
              <PanelRow label="Data End:" value={data.dateEnd ?? '—'} />
              <PanelRow label="Version:" value={data.version} />
              <PanelRow
                label="Paid:"
                value={String(data.paid)}
                valueClassName="text-red-600 font-semibold"
              />
            </div>

            <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-2">
              {FOOTER_ACTIONS.map((action) => {
                const isVisit = action.id === 'visit';
                const isWebsite = action.id === 'website';
                const visitDisabled = isVisit && !visitPath;
                const websiteDisabled = isWebsite && !websiteUrl;
                const disabled = visitDisabled || websiteDisabled;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={disabled}
                    title={
                      visitDisabled
                        ? 'No official club name — visitor page unavailable'
                        : websiteDisabled
                          ? 'No personal website set in profile'
                          : isVisit && visitPath
                            ? visitPath
                            : isWebsite && websiteUrl
                              ? websiteUrl
                              : undefined
                    }
                    className={`px-2 py-2.5 text-xs sm:text-sm font-medium text-gray-900 bg-[#e8e8e8] border border-gray-300 rounded transition ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#dcdcdc]'
                    }`}
                    onClick={() => {
                      if (action.id === 'control') {
                        onControlPanel?.();
                        return;
                      }
                      if (action.id === 'visit' && visitPath) {
                        onClose();
                        router.push(visitPath);
                        return;
                      }
                      if (action.id === 'website' && websiteUrl) {
                        window.open(websiteUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

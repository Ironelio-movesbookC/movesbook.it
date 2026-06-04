'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { flagEmojiFromCountryName } from '@/lib/admin/countryFlag';
import type { PcuPanelPayload } from '@/lib/admin/userPcuPanel';
import type { PcuSettings } from '@/lib/admin/userPcuSettings';
import { parseAlertMessagePreview } from '@/lib/admin/userPcuAlertMsg';

const isDataUrl = (src?: string | null) => typeof src === 'string' && src.startsWith('data:image/');

type AlertMsgLang = 'en' | 'it';

function toDateInputValue(iso: string | undefined): string {
  if (!iso?.trim()) return '';
  const s = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Parse "lat, lng" (comma or whitespace separated). */
function parseLatLng(coords: string | null | undefined): { lat: number; lng: number } | null {
  if (!coords?.trim()) return null;
  const parts = coords.trim().split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

function DetailRow({
  label,
  value,
  editHref,
  children,
}: {
  label: string;
  value: string;
  editHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[10.5rem_1fr] gap-x-3 gap-y-0.5 py-1.5 text-sm">
      <span className="font-bold text-gray-900">{label}</span>
      <div>
        <span className="text-gray-900">{value || '—'}</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          {editHref ? (
            <Link href={editHref} className="text-[#0066cc] text-sm hover:underline w-fit">
              Edit
            </Link>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export type AdminPcuUserOverviewProps = {
  user: PcuPanelPayload;
  pcuSettings: PcuSettings | null;
  backHref: string;
  profileEditHref: string;
  adminSettingsHref: string;
  purchasesHref: string;
  alertEditHref: string;
  onOpenUserProfile: () => void;
};

export default function AdminPcuUserOverview({
  user,
  pcuSettings,
  backHref,
  profileEditHref,
  adminSettingsHref,
  purchasesHref,
  alertEditHref,
  onOpenUserProfile,
}: AdminPcuUserOverviewProps) {
  const [alertLang, setAlertLang] = useState<AlertMsgLang>('en');

  const alertMsg = pcuSettings?.alertMsg;
  const alertHtml = useMemo(() => {
    const byLang = alertMsg?.htmlByLang;
    if (!byLang) return '';
    return (byLang[alertLang] || byLang.en || byLang.it || '').trim();
  }, [alertMsg?.htmlByLang, alertLang]);

  const messagePreview = useMemo(() => parseAlertMessagePreview(alertHtml), [alertHtml]);

  const countryOwnerDisplay = [user.country, user.locality || user.cityClubTeam]
    .filter((s) => s?.trim())
    .join(' ')
    .trim();
  const countryFlag = flagEmojiFromCountryName(user.country);

  const enableFromValue = toDateInputValue(alertMsg?.enableFrom);
  const enableToValue = toDateInputValue(alertMsg?.enableTo);
  const mapLatLng = parseLatLng(user.mapCoordinates);
  const mapHref = mapLatLng ? googleMapsUrl(mapLatLng.lat, mapLatLng.lng) : null;

  return (
    <div className="min-h-full bg-[#e8e8e8] py-6 px-3 sm:px-6">
      <div className="w-full max-w-3xl mx-auto space-y-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </Link>

        {/* Card 1 — User details */}
        <section className="bg-[#d4dce4] border border-[#b8c4ce] rounded-md shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex flex-wrap items-center gap-4">
            <div className="w-[72px] h-[72px] bg-[#c5cdd6] border border-[#9aa8b5] flex items-center justify-center overflow-hidden shrink-0">
              {user.imageUrl ? (
                isDataUrl(user.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image src={user.imageUrl} alt="" width={72} height={72} className="object-cover w-full h-full" />
                )
              ) : (
                <User className="w-10 h-10 text-gray-500" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-xl font-bold text-gray-900 mr-1">{user.username}</span>
              <Link
                href={adminSettingsHref}
                className="px-4 py-2 bg-[#4a4a4a] text-white text-sm font-medium border border-[#333] hover:bg-[#333]"
              >
                Admin&apos;s setting
              </Link>
              <button
                type="button"
                onClick={onOpenUserProfile}
                className="px-4 py-2 bg-[#4a4a4a] text-white text-sm font-medium border border-[#333] hover:bg-[#333]"
              >
                Open user profile
              </button>
            </div>
          </div>

          <div className="px-5 pb-5 pt-1">
            <DetailRow label="Fullname:" value={user.fullname} />
            <DetailRow
              label="Country of the owner:"
              value={
                countryOwnerDisplay ? `${countryOwnerDisplay}${countryFlag ? ` ${countryFlag}` : ''}` : '—'
              }
            />
            <DetailRow
              label="City of the club/team:"
              value={user.cityClubTeam || user.locality}
              editHref={profileEditHref}
            />
            <DetailRow label="Map coordinates:" value={user.mapCoordinates || '—'} editHref={profileEditHref}>
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0066cc] text-sm hover:underline w-fit"
                >
                  Open map
                </a>
              ) : null}
            </DetailRow>
            <DetailRow label="Type of user:" value={user.typeOfUser} />
            <DetailRow label="Version:" value={user.version} />
            <DetailRow label="Start Subscription:" value={user.startSubscription} />
            <DetailRow label="End Subscription:" value={user.endSubscription} editHref={purchasesHref} />
            <DetailRow label="Logs:" value={String(user.logs ?? 0)} />
          </div>
        </section>

        {/* Card 2 — Alert box settings (read-only) */}
        <section className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
          <div className="bg-[#5b7a9d] text-white font-semibold px-4 py-2.5 flex items-center justify-between text-sm">
            <span>Alert box to display to the user</span>
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => setAlertLang('it')}
                className={`px-3 py-1 border border-white font-semibold text-sm min-w-[2.5rem] ${
                  alertLang === 'it' ? 'bg-white text-[#5b7a9d]' : 'bg-transparent text-white'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => setAlertLang('en')}
                className={`px-3 py-1 border border-white border-l-0 font-semibold text-sm min-w-[2.5rem] ${
                  alertLang === 'en' ? 'bg-white text-[#5b7a9d]' : 'bg-transparent text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="px-4 py-4 text-sm bg-[#eef1f4] border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-800">Enable From</span>
                <input
                  type="date"
                  readOnly
                  value={enableFromValue}
                  className="px-2 py-1 border border-gray-400 bg-white text-sm w-[9.5rem]"
                />
                <span
                  className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center text-base"
                  aria-hidden
                >
                  📅
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-800">To</span>
                <input
                  type="date"
                  readOnly
                  value={enableToValue}
                  className="px-2 py-1 border border-gray-400 bg-white text-sm w-[9.5rem]"
                />
                <span
                  className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center text-base"
                  aria-hidden
                >
                  📅
                </span>
              </div>
              <div className="ml-auto text-sm text-gray-800">Read on 13th November 2025</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-gray-900">
              <span>Show the message at the</span>
              <label className="inline-flex items-center gap-2 font-semibold cursor-default">
                <input
                  type="checkbox"
                  checked={alertMsg?.showAt?.login !== false}
                  readOnly
                  disabled
                  className="rounded border-gray-500"
                />
                Login
              </label>
              <label className="inline-flex items-center gap-2 font-semibold cursor-default">
                <input
                  type="checkbox"
                  checked={alertMsg?.showAt?.logout !== false}
                  readOnly
                  disabled
                  className="rounded border-gray-500"
                />
                Logout
              </label>
            </div>
          </div>

          <div className="px-4 py-2 text-center border-t border-gray-100">
            <Link href={alertEditHref} className="text-xs text-[#0066cc] hover:underline">
              Edit alert settings
            </Link>
          </div>
        </section>

        {/* Card 3 — Message preview (as shown to user) */}
        <section className="bg-[#e4e4e4] border border-[#c8c8c8] rounded-md shadow-sm px-5 py-5">
          {messagePreview.title ? (
            <h2 className="text-center text-red-600 font-bold text-base sm:text-lg leading-snug mb-2">
              {messagePreview.title}
            </h2>
          ) : alertHtml ? null : (
            <h2 className="text-center text-red-600 font-bold text-base mb-2 italic opacity-70">
              No alert title
            </h2>
          )}

          <p className="text-center text-sm text-gray-800 font-medium mb-4">Message to read</p>

          {messagePreview.bodyHtml || (!messagePreview.title && alertHtml) ? (
            <div
              className="text-sm text-gray-900 max-w-none ck-content [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-700 [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: messagePreview.bodyHtml || alertHtml,
              }}
            />
          ) : (
            <p className="text-sm text-gray-600 text-center italic py-6">
              No alert message configured for this language.{' '}
              <Link href={alertEditHref} className="text-[#0066cc] hover:underline not-italic">
                Add message in PCU
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

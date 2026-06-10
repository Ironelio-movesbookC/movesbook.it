'use client';

import Image from 'next/image';
import { RefObject, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  CreditCard,
  Mail,
  Square,
  User,
  X,
} from 'lucide-react';
import { flagEmojiFromCountryName, countryCodeFromName } from '@/lib/admin/countryFlag';

const isDataUrl = (src?: string | null) => typeof src === 'string' && src.startsWith('data:image/');

type ProfileSubFilterIn = 'dateStart' | 'dateEnd';
type ProfileSubOrdering = '' | 'dateStart' | 'dateEnd' | 'version';

export interface ProfileSubscriptionFilterState {
  version: string;
  filterIn: ProfileSubFilterIn;
  dateFrom: string;
  dateTo: string;
  ordering: ProfileSubOrdering;
}

export interface ClubsProfileData {
  fullName: string;
  username: string;
  email: string;
  country: string;
  location: string;
  officialClubName: string;
  sportLine: string;
  typeBadge: string;
  imageUrl: string | null;
  subscriptionRows: Array<{
    id: string;
    dateStart: string;
    dateEnd: string | null;
    version: string;
    username: string;
    companyName: string;
    e: string;
    status: string;
  }>;
}

const PROFILE_SUBSCRIPTION_VERSION_OPTIONS = [
  'Trial Base',
  'Trial for club members',
  'User- base version',
  'User- premium',
  'User- professional',
  'Coach Base PFU pay for users',
  "Coach Base don't pay for users",
  'Coach Premium PFU',
  'Coach Premium',
  'Coach Professional PFU',
  'Coach Professional',
  'Team Base PFU pay for users',
  "Team Base don't pay for user",
  'Team Premium PFU',
  'Team Premium',
  'Team Professional PFU',
  'Team Professional',
  'Group Standard Version',
  'Club Base',
] as const;

interface AdminClubsUserProfilePanelProps {
  profileData: ClubsProfileData;
  historicalSubtitle: string;
  roleTitle: string;
  filteredRows: ClubsProfileData['subscriptionRows'];
  profileRowSelected: Set<string>;
  setProfileRowSelected: (s: Set<string>) => void;
  profileSubFilterOpen: boolean;
  profileSubFilterDraft: ProfileSubscriptionFilterState;
  setProfileSubFilterDraft: React.Dispatch<React.SetStateAction<ProfileSubscriptionFilterState>>;
  profileOrdering: ProfileSubOrdering;
  setProfileOrdering: (v: ProfileSubOrdering) => void;
  profileSubFilterWrapRef: RefObject<HTMLDivElement>;
  onOpenProfileSubFilter: () => void;
  onProfileSubFilterExit: () => void;
  onProfileSubFilterOk: () => void;
  onProfileSubProceed: () => void;
  onClose: () => void;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <span className="font-medium text-gray-900 shrink-0">{label}</span>
      {children}
    </div>
  );
}

export default function AdminClubsUserProfilePanel({
  profileData,
  historicalSubtitle,
  roleTitle,
  filteredRows,
  profileRowSelected,
  setProfileRowSelected,
  profileSubFilterOpen,
  profileSubFilterDraft,
  setProfileSubFilterDraft,
  profileOrdering,
  setProfileOrdering,
  profileSubFilterWrapRef,
  onOpenProfileSubFilter,
  onProfileSubFilterExit,
  onProfileSubFilterOk,
  onProfileSubProceed,
  onClose,
}: AdminClubsUserProfilePanelProps) {
  const countryCode = countryCodeFromName(profileData.country);
  const [accessStart, setAccessStart] = useState('');
  const [accessEnd, setAccessEnd] = useState('');

  const allRowsSelected =
    filteredRows.length > 0 && filteredRows.every((r) => profileRowSelected.has(r.id));

  return (
    <>
      <div className="bg-gray-200 border-b border-gray-300 rounded-t shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300">
          <div className="text-sm font-semibold text-red-700">Panel control about the User</div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <button type="button" className="hover:underline">
              Print
            </button>
            <button type="button" className="hover:underline">
              Send Msg
            </button>
            <button type="button" className="hover:underline">
              Send mail
            </button>
            <input type="checkbox" className="rounded border-gray-500" aria-label="Panel option" />
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-300"
              title="Close"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-4 py-3">
          <div className="w-16 h-16 bg-white border border-gray-400 flex items-center justify-center overflow-hidden shrink-0">
            {profileData.imageUrl ? (
              isDataUrl(profileData.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileData.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Image src={profileData.imageUrl} alt="" width={64} height={64} className="object-cover w-full h-full" />
              )
            ) : (
              <User className="w-7 h-7 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-[#efe7b3] border border-[#c9bd7a] px-4 py-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  <strong>Name :</strong> {profileData.fullName || '—'}
                </div>
                <div>
                  <strong>Age :</strong> —
                </div>
                <div>
                  <strong>Type of User :</strong> {profileData.typeBadge}
                </div>
                <div>
                  <strong>Sport :</strong> {profileData.sportLine || '—'}
                </div>
                <div>
                  <strong>State :</strong> —
                </div>
                <div>
                  <strong>Locality :</strong> {profileData.location || '—'}
                </div>
                <div>
                  <strong>Country :</strong> {profileData.country || '—'}
                  {countryCode ? ` (${countryCode})` : ''}
                  {countryCode ? ` ${flagEmojiFromCountryName(profileData.country)}` : ''}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                <Mail className="inline w-4 h-4 mr-2" />
                Send mail
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span>Start</span>
                <input
                  type="date"
                  value={accessStart}
                  onChange={(e) => setAccessStart(e.target.value)}
                  className="px-2 py-1 border border-gray-400 bg-white w-32"
                />
                <CalendarDays className="w-5 h-5 text-gray-600" />
                <CreditCard className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>End</span>
                <input
                  type="date"
                  value={accessEnd}
                  onChange={(e) => setAccessEnd(e.target.value)}
                  className="px-2 py-1 border border-gray-400 bg-white w-32"
                />
                <CalendarDays className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Square className="w-4 h-4 text-gray-600" />
                <span className="text-red-600">Suspend access control</span>
              </div>
              <button type="button" className="px-4 py-2 bg-gray-700 text-white text-sm rounded">
                Exhaustion status
              </button>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="w-4 h-4 text-gray-600" />
                <span className="text-red-600">Suspend</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-300">
        <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-800">
          Details of subscription · {roleTitle}
        </div>

        <div className="bg-purple-700 text-white px-4 py-2 font-semibold text-sm sm:text-base">
          {historicalSubtitle}
        </div>

        <div className="border border-gray-200 border-t-0">
          <div className="bg-sky-100 px-4 py-3 flex flex-wrap items-center gap-6 text-sm">
            <div>
              <strong>Username:</strong> {profileData.username}
            </div>
            <div>
              <strong>Full Name:</strong> {profileData.fullName || '—'}
            </div>
            <div>
              <strong>Country:</strong> {profileData.country || '—'}
            </div>
            <div>
              <strong>Location:</strong> {profileData.location || '—'}
            </div>
          </div>

          <div className="px-4 py-3 flex flex-wrap items-center gap-4 border-b border-gray-200">
            <div ref={profileSubFilterWrapRef} className="relative">
              <button
                type="button"
                onClick={() => (profileSubFilterOpen ? onProfileSubFilterExit() : onOpenProfileSubFilter())}
                className="px-3 py-2 bg-gray-700 text-white text-sm rounded"
              >
                Filter
              </button>
              {profileSubFilterOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-2rem,380px)] border border-black bg-[#fff8dc] shadow-lg">
                  <div className="p-4 space-y-3 text-sm">
                    <FilterRow label="Version">
                      <select
                        value={profileSubFilterDraft.version}
                        onChange={(e) =>
                          setProfileSubFilterDraft((f) => ({ ...f, version: e.target.value }))
                        }
                        className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                      >
                        <option value="">All</option>
                        {PROFILE_SUBSCRIPTION_VERSION_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </FilterRow>
                    <FilterRow label="Filter In">
                      <select
                        value={profileSubFilterDraft.filterIn}
                        onChange={(e) =>
                          setProfileSubFilterDraft((f) => ({
                            ...f,
                            filterIn: e.target.value as ProfileSubFilterIn,
                          }))
                        }
                        className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                      >
                        <option value="dateStart">Date Start</option>
                        <option value="dateEnd">Date End</option>
                      </select>
                    </FilterRow>
                    <FilterRow label="From">
                      <input
                        type="date"
                        value={profileSubFilterDraft.dateFrom}
                        onChange={(e) =>
                          setProfileSubFilterDraft((f) => ({ ...f, dateFrom: e.target.value }))
                        }
                        className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                      />
                    </FilterRow>
                    <FilterRow label="To">
                      <input
                        type="date"
                        value={profileSubFilterDraft.dateTo}
                        onChange={(e) =>
                          setProfileSubFilterDraft((f) => ({ ...f, dateTo: e.target.value }))
                        }
                        className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                      />
                    </FilterRow>
                  </div>
                  <div className="flex justify-center gap-4 border-t border-gray-400 bg-[#f5ebc8] py-3">
                    <button
                      type="button"
                      onClick={onProfileSubFilterOk}
                      className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={onProfileSubFilterExit}
                      className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              )}
            </div>
            <select
              className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
              value={profileOrdering}
              onChange={(e) => setProfileOrdering(e.target.value as ProfileSubOrdering)}
            >
              <option value="">Ordering</option>
              <option value="version">by version</option>
              <option value="dateStart">by date start subscription</option>
              <option value="dateEnd">by date end subscription</option>
            </select>
            <button
              type="button"
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              onClick={onProfileSubProceed}
            >
              Proceed
            </button>
            <div className="ml-auto flex flex-wrap gap-4 text-sm text-gray-700">
              <button type="button" className="hover:underline">
                Print
              </button>
              <button type="button" className="hover:underline">
                Send Msg
              </button>
              <button type="button" className="hover:underline">
                Send mail
              </button>
              <button type="button" className="hover:underline text-red-700">
                Delete account
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#d9d9d9] border-b border-gray-300 px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={allRowsSelected}
                onChange={() => {
                  if (allRowsSelected) setProfileRowSelected(new Set());
                  else setProfileRowSelected(new Set(filteredRows.map((r) => r.id)));
                }}
                className="rounded border-gray-600"
              />
              Select all
            </label>
            <button
              type="button"
              onClick={() => (profileSubFilterOpen ? onProfileSubFilterExit() : onOpenProfileSubFilter())}
              className="h-9 px-3 bg-neutral-900 text-white text-sm font-medium border border-black rounded flex items-center gap-1 sm:ml-auto"
            >
              Filter <span className="text-[10px]">▾</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-teal-800 text-white">
                  <th className="w-10 px-2 py-2 text-left font-semibold" />
                  <th className="px-3 py-2 text-left font-semibold">Full name</th>
                  <th className="px-3 py-2 text-left font-semibold">Country</th>
                  <th className="px-2 py-2 text-center font-semibold w-14">Flag</th>
                  <th className="px-3 py-2 text-left font-semibold">Location</th>
                  <th className="px-3 py-2 text-left font-semibold">Date Start</th>
                  <th className="px-3 py-2 text-left font-semibold">Date End</th>
                  <th className="px-3 py-2 text-left font-semibold">Version</th>
                  <th className="px-3 py-2 text-left font-semibold">Username</th>
                  <th className="px-3 py-2 text-left font-semibold">Company name</th>
                  <th className="px-2 py-2 text-left font-semibold w-14">E</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500 bg-white">
                      No subscription rows match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                      <td className="px-2 py-2 border-t border-gray-300">
                        <input
                          type="checkbox"
                          checked={profileRowSelected.has(row.id)}
                          onChange={() => {
                            const next = new Set(profileRowSelected);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            setProfileRowSelected(next);
                          }}
                          className="rounded border-gray-500"
                        />
                      </td>
                      <td className="px-3 py-2 border-t border-gray-300 font-medium">
                        {profileData.fullName || '—'}
                      </td>
                      <td className="px-3 py-2 border-t border-gray-300">{profileData.country || '—'}</td>
                      <td className="px-2 py-2 border-t border-gray-300 text-center text-lg leading-none">
                        {flagEmojiFromCountryName(profileData.country) || '—'}
                      </td>
                      <td className="px-3 py-2 border-t border-gray-300">{profileData.location || '—'}</td>
                      <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.dateStart}</td>
                      <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{row.dateEnd ?? '—'}</td>
                      <td className="px-3 py-2 border-t border-gray-300">{row.version}</td>
                      <td className="px-3 py-2 border-t border-gray-300 font-medium">{row.username}</td>
                      <td className="px-3 py-2 border-t border-gray-300">{row.companyName || '—'}</td>
                      <td className="px-2 py-2 border-t border-gray-300 text-gray-700">{row.e}</td>
                      <td className="px-3 py-2 border-t border-gray-300">
                        <span
                          className={
                            row.status === 'Expired'
                              ? 'text-red-600 font-semibold'
                              : 'text-green-700 font-semibold'
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-gray-500 border-x border-b border-gray-300 bg-white">
        Email: {profileData.email}
      </p>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { User, X } from 'lucide-react';
import { COUNTRIES } from '@/lib/news/countries';
import { getRegionsForCountry } from '@/constants/countryRegions.constants';

export const CLUB_CATEGORY_OPTIONS = [
  'Gym',
  'Fitness',
  'Swimming',
  'Football',
  'Basketball',
  'Tennis',
  'Other',
] as const;

export type CreateClubFormPayload = {
  username: string;
  category: string;
  country: string;
  region: string;
  location: string;
  zipCode: string;
  address: string;
  geo: string;
  mail: string;
  directAccess: string;
  officialName: string;
  directRegistrationCode: string;
  clubPassword: string;
};

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
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubUsername, setClubUsername] = useState('');
  const [clubCategory, setClubCategory] = useState('Gym');
  const [clubCountry, setClubCountry] = useState('Italy');
  const [clubRegion, setClubRegion] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [clubZip, setClubZip] = useState('');
  const [clubAddress, setClubAddress] = useState('');
  const [clubGeo, setClubGeo] = useState('');
  const [clubMail, setClubMail] = useState('');
  const [clubMyPassword] = useState('****');
  const [clubNewPassword, setClubNewPassword] = useState('');
  const [clubRepeatPassword, setClubRepeatPassword] = useState('');
  const [clubDirectAccess, setClubDirectAccess] = useState('');
  const [clubOfficialName, setClubOfficialName] = useState('');
  const [clubDirectRegCode, setClubDirectRegCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clubRegionOptions = useMemo(() => {
    const country = clubCountry.trim();
    return country ? getRegionsForCountry(country) : [];
  }, [clubCountry]);

  useEffect(() => {
    if (!isOpen) return;
    setClubLogoUrl(null);
    setClubUsername('');
    setClubCategory('Gym');
    setClubCountry('Italy');
    setClubRegion('');
    setClubLocation('');
    setClubZip('');
    setClubAddress('');
    setClubGeo('');
    setClubMail('');
    setClubNewPassword('');
    setClubRepeatPassword('');
    setClubDirectAccess('');
    setClubOfficialName('');
    setClubDirectRegCode('');
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setClubLogoUrl(url);
  };

  const handleSave = async () => {
    if (!clubUsername.trim() || !clubDirectAccess.trim()) {
      setError('Club username and Direct Access are required.');
      return;
    }
    if (!clubNewPassword.trim()) {
      setError('My Club password is required.');
      return;
    }
    if (clubNewPassword !== clubRepeatPassword) {
      setError('Password and repeat password do not match.');
      return;
    }
    const name = clubOfficialName.trim() || clubUsername.trim();
    if (!name) {
      setError('Enter a club username or official club name.');
      return;
    }
    setError(null);
    try {
      await onSave({
        username: clubUsername.trim(),
        category: clubCategory,
        country: clubCountry,
        region: clubRegion,
        location: clubLocation.trim(),
        zipCode: clubZip.trim(),
        address: clubAddress.trim(),
        geo: clubGeo.trim(),
        mail: clubMail.trim(),
        directAccess: clubDirectAccess.trim(),
        officialName: clubOfficialName.trim() || clubUsername.trim(),
        directRegistrationCode: clubDirectRegCode.trim(),
        clubPassword: clubNewPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create club');
    }
  };

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

        <div
          id="create-club-modal-title"
          className="bg-[#6b1020] px-4 py-2.5 text-sm font-semibold text-white pr-10"
        >
          {`Create a new club for the Club Admin <${adminUsername}>`}
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex shrink-0 flex-col items-start gap-2">
              <div className="text-sm font-medium text-gray-800">Club Logo</div>
              <label className="relative flex h-28 w-36 cursor-pointer items-center justify-center overflow-hidden border border-gray-400 bg-white">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoPick}
                />
                {clubLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clubLogoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-gray-400" />
                )}
              </label>
              <button
                type="button"
                onClick={() => setClubLogoUrl(null)}
                className="text-sm text-blue-700 hover:underline"
              >
                [ Remove Logo ]
              </button>
            </div>

            <div className="flex-1 space-y-2 text-sm">
              {(
                [
                  ['Club username', clubUsername, setClubUsername, false],
                  ['Category', clubCategory, setClubCategory, true],
                  ['Country', clubCountry, setClubCountry, true],
                  ['Region', clubRegion, setClubRegion, true],
                  ['Location', clubLocation, setClubLocation, false],
                  ['Zip Code', clubZip, setClubZip, false],
                  ['Address', clubAddress, setClubAddress, false],
                  ['Geographic coordinate', clubGeo, setClubGeo, false],
                  ['Club mail', clubMail, setClubMail, false],
                ] as [string, string, (v: string) => void, boolean][]
              ).map(([label, value, setter, isSelect]) => (
                <div key={String(label)} className="grid grid-cols-[160px_1fr] items-center gap-2">
                  <label className="text-gray-800">{label}</label>
                  {isSelect && label === 'Category' ? (
                    <select
                      value={String(value)}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full max-w-md rounded border border-gray-400 bg-gray-100 px-2 py-1.5"
                    >
                      {CLUB_CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : isSelect && label === 'Country' ? (
                    <select
                      value={String(value)}
                      onChange={(e) => {
                        setter(e.target.value);
                        setClubRegion('');
                      }}
                      className="w-full max-w-md rounded border border-gray-400 bg-gray-100 px-2 py-1.5"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : isSelect && label === 'Region' ? (
                    <select
                      value={String(value)}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full max-w-md rounded border border-gray-400 bg-gray-100 px-2 py-1.5"
                    >
                      <option value="">Select region</option>
                      {clubRegionOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={String(value)}
                      onChange={(e) => setter(e.target.value)}
                      className="w-full max-w-md rounded border border-gray-400 bg-gray-100 px-2 py-1.5"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-red-700">My Club password</div>
            <table className="w-full max-w-lg border border-gray-300 text-sm">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="w-36 bg-gray-50 px-3 py-2">My Password</td>
                  <td className="px-3 py-2">
                    <input
                      type="password"
                      value={clubMyPassword}
                      readOnly
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1"
                    />
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="bg-gray-50 px-3 py-2">New Password</td>
                  <td className="px-3 py-2">
                    <input
                      type="password"
                      value={clubNewPassword}
                      onChange={(e) => setClubNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="bg-gray-50 px-3 py-2">Repeat Pass.</td>
                  <td className="px-3 py-2">
                    <input
                      type="password"
                      value={clubRepeatPassword}
                      onChange={(e) => setClubRepeatPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" className="mt-2 text-sm text-gray-700 hover:underline">
              Reset Password
            </button>
          </div>

          <div className="grid max-w-2xl grid-cols-[160px_1fr] items-center gap-2 text-sm">
            <label className="font-semibold text-red-700">Direct Access</label>
            <input
              value={clubDirectAccess}
              onChange={(e) => setClubDirectAccess(e.target.value)}
              className="w-full max-w-xs rounded border border-gray-400 bg-[#fff9c4] px-2 py-1.5"
            />
          </div>

          <div className="grid max-w-3xl grid-cols-[160px_1fr] items-center gap-2 text-sm">
            <label className="font-semibold text-gray-900">Official Club name</label>
            <input
              value={clubOfficialName}
              onChange={(e) => setClubOfficialName(e.target.value)}
              className="w-full rounded border border-gray-400 bg-[#fff9c4] px-2 py-1.5"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-red-700">
              Direct Registration Code
            </div>
            <div className="max-w-3xl space-y-3 border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800">
              <p>
                Password to be typed by the users who register at Movesbook by themselves to send an
                authorized request to become member of the club.
              </p>
              <div className="grid grid-cols-[180px_1fr] items-center gap-2">
                <label>Direct Registration code</label>
                <input
                  value={clubDirectRegCode}
                  onChange={(e) => setClubDirectRegCode(e.target.value)}
                  className="max-w-xs rounded border border-gray-400 bg-white px-2 py-1.5"
                  placeholder="Magiccode"
                />
              </div>
              <p className="text-xs leading-relaxed text-red-600">
                Once the request has been sent, the user will be placed on a temporary list waiting for
                the club staff to reauthorized his self-registration.
              </p>
            </div>
          </div>

          {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-center gap-6 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg border border-red-900 bg-gradient-to-b from-red-500 to-red-700 px-10 py-2.5 font-semibold text-white shadow disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-gray-900 bg-gradient-to-b from-gray-700 to-black px-10 py-2.5 font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

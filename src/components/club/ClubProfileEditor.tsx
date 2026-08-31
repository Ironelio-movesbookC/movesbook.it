'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[260px] rounded border border-gray-300 bg-white p-4 text-sm text-gray-500">
      Loading editor…
    </div>
  ),
});
import { COUNTRIES } from '@/lib/news/countries';
import { getRegionsForCountry } from '@/constants/countryRegions.constants';
import {
  clubToFormPayload,
  type ClubProfileFormPayload,
} from '@/lib/club/clubProfilePayload';
import {
  getEntityProfileLabels,
  type ManagedEntityKind,
} from '@/lib/entity/entityProfileLabels';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import {
  DEFAULT_ENTITY_SPORT,
  ENTITY_SPORT_OPTIONS,
} from '@/lib/sport/entitySportOptions';

/** @deprecated Use ENTITY_SPORT_OPTIONS from @/lib/sport/entitySportOptions */
export const CLUB_CATEGORY_OPTIONS = ENTITY_SPORT_OPTIONS;

export type { ClubProfileFormPayload };

type ClubProfileEditorProps = {
  mode: 'create' | 'edit';
  entityKind?: ManagedEntityKind;
  adminUsername?: string;
  initialClub?: {
    name: string;
    description?: string | null;
    location?: string | null;
  };
  onSave: (payload: ClubProfileFormPayload) => Promise<void>;
  saving?: boolean;
  onCancel?: () => void;
};

export default function ClubProfileEditor({
  mode,
  entityKind = 'club',
  adminUsername = 'username',
  initialClub,
  onSave,
  saving = false,
  onCancel,
}: ClubProfileEditorProps) {
  const labels = getEntityProfileLabels(entityKind);
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [clubUsername, setClubUsername] = useState('');
  const [clubSports, setClubSports] = useState<string[]>([DEFAULT_ENTITY_SPORT]);
  const [clubCountry, setClubCountry] = useState('Italy');
  const [clubRegion, setClubRegion] = useState('');
  const [clubProvince, setClubProvince] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [clubZip, setClubZip] = useState('');
  const [clubAddress, setClubAddress] = useState('');
  const [clubGeo, setClubGeo] = useState('');
  const [clubMail, setClubMail] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubWebsite, setClubWebsite] = useState('');
  const [clubMyPassword, setClubMyPassword] = useState('');
  const [clubNewPassword, setClubNewPassword] = useState('');
  const [clubRepeatPassword, setClubRepeatPassword] = useState('');
  const [clubDirectAccess, setClubDirectAccess] = useState('');
  const [clubOfficialName, setClubOfficialName] = useState('');
  const [clubDirectRegCode, setClubDirectRegCode] = useState('');
  const [clubReferencesHtml, setClubReferencesHtml] = useState('');
  const [clubReferencesLevel, setClubReferencesLevel] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const showClubReferences = entityKind === 'club';

  const profileFieldRows = useMemo(
    () =>
      [
        [labels.usernameLabel, clubUsername, setClubUsername, false],
        ['Country', clubCountry, setClubCountry, true],
        ['Region', clubRegion, setClubRegion, true],
        ['Province', clubProvince, setClubProvince, false],
        ['Location', clubLocation, setClubLocation, false],
        ['ZIP', clubZip, setClubZip, false],
        ['Address', clubAddress, setClubAddress, false],
        ['Geographic coordinate', clubGeo, setClubGeo, false],
        [labels.mailLabel, clubMail, setClubMail, false],
        ['Phone', clubPhone, setClubPhone, false],
        ['Website', clubWebsite, setClubWebsite, false],
      ] as [string, string, (v: string) => void, boolean][],
    [
      labels.usernameLabel,
      labels.mailLabel,
      clubUsername,
      clubCountry,
      clubRegion,
      clubProvince,
      clubLocation,
      clubZip,
      clubAddress,
      clubGeo,
      clubMail,
      clubPhone,
      clubWebsite,
    ],
  );

  const clubRegionOptions = useMemo(() => {
    const country = clubCountry.trim();
    return country ? getRegionsForCountry(country) : [];
  }, [clubCountry]);

  const hasStoredEntityPassword = useMemo(() => {
    if (!initialClub?.description) return false;
    return Boolean(parseClubDescriptionMeta(initialClub.description).clubPasswordHash);
  }, [initialClub?.description]);

  useEffect(() => {
    if (mode === 'create') {
      setClubLogoUrl(null);
      setClubUsername('');
      setClubSports([DEFAULT_ENTITY_SPORT]);
      setClubCountry('Italy');
      setClubRegion('');
      setClubProvince('');
      setClubLocation('');
      setClubZip('');
      setClubAddress('');
      setClubGeo('');
      setClubMail('');
      setClubPhone('');
      setClubWebsite('');
      setClubMyPassword('');
      setClubNewPassword('');
      setClubRepeatPassword('');
      setClubDirectAccess('');
      setClubOfficialName('');
      setClubDirectRegCode('');
      setClubReferencesHtml('');
      setClubReferencesLevel('1');
      setError(null);
      setHydrated(true);
      return;
    }

    if (mode === 'edit' && initialClub) {
      const payload = clubToFormPayload(initialClub);
      setClubUsername(payload.username);
      setClubSports(payload.sports.length ? payload.sports : [DEFAULT_ENTITY_SPORT]);
      setClubCountry(payload.country || 'Italy');
      setClubRegion(payload.region);
      setClubProvince(payload.province);
      setClubLocation(payload.location);
      setClubZip(payload.zipCode);
      setClubAddress(payload.address);
      setClubGeo(payload.geo);
      setClubMail(payload.mail);
      setClubPhone(payload.phone);
      setClubWebsite(payload.website);
      setClubLogoUrl(payload.logoUrl || null);
      setClubDirectAccess(payload.directAccess);
      setClubOfficialName(payload.officialName);
      setClubDirectRegCode(payload.directRegistrationCode);
      setClubReferencesHtml(payload.referencesHtml);
      setClubReferencesLevel(payload.referencesLevel);
      setClubNewPassword('');
      setClubRepeatPassword('');
      setError(null);
      setHydrated(true);
    }
  }, [mode, initialClub]);

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setClubLogoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!clubUsername.trim() || !clubDirectAccess.trim()) {
      setError(labels.directAccessRequiredError);
      return;
    }
    if (mode === 'create') {
      if (!clubMyPassword.trim()) {
        setError(labels.passwordRequiredError);
        return;
      }
      if (clubMyPassword !== clubRepeatPassword) {
        setError('My Password and Repeat Pass. do not match.');
        return;
      }
    } else if (clubNewPassword || clubRepeatPassword) {
      if (clubNewPassword !== clubRepeatPassword) {
        setError('New Password and Repeat Pass. do not match.');
        return;
      }
    }
    const name = clubOfficialName.trim() || clubUsername.trim();
    if (!name) {
      setError(labels.nameRequiredError);
      return;
    }
    setError(null);
    try {
      const sports = clubSports.length ? clubSports : [DEFAULT_ENTITY_SPORT];
      await onSave({
        username: clubUsername.trim(),
        category: sports[0],
        sports,
        country: clubCountry,
        region: clubRegion,
        province: clubProvince.trim(),
        location: clubLocation.trim(),
        zipCode: clubZip.trim(),
        address: clubAddress.trim(),
        geo: clubGeo.trim(),
        mail: clubMail.trim(),
        phone: clubPhone.trim(),
        website: clubWebsite.trim(),
        logoUrl: clubLogoUrl || '',
        directAccess: clubDirectAccess.trim(),
        officialName: clubOfficialName.trim() || clubUsername.trim(),
        directRegistrationCode: clubDirectRegCode.trim(),
        clubPassword:
          mode === 'create' ? clubMyPassword.trim() : clubNewPassword.trim(),
        referencesHtml: showClubReferences ? clubReferencesHtml : '',
        referencesLevel: showClubReferences ? clubReferencesLevel : '1',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.saveError);
    }
  };

  if (mode === 'edit' && !hydrated) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">Loading club profile…</p>
    );
  }

  const title =
    mode === 'create'
      ? labels.createTitle(adminUsername)
      : `Edit ${entityKind === 'club' ? 'club' : entityKind === 'team' ? 'team' : 'group'} profile`;

  return (
    <div className="space-y-4">
      <div className="bg-[#6b1020] px-4 py-2.5 text-sm font-semibold text-white rounded-t-lg">
        {title}
      </div>

      <div className="space-y-4 p-4 border border-t-0 border-gray-300 bg-[#f3f3f3] rounded-b-lg">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-start gap-2">
            <div className="text-sm font-medium text-gray-800">{labels.logoLabel}</div>
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
            <div className="grid grid-cols-[160px_1fr] items-start gap-2">
              <label className="pt-1 text-gray-800">Sports</label>
              <div className="flex max-w-xl flex-wrap gap-x-4 gap-y-2 rounded border border-gray-400 bg-gray-100 px-2 py-2">
                {ENTITY_SPORT_OPTIONS.map((sport) => {
                  const checked = clubSports.includes(sport);
                  return (
                    <label key={sport} className="inline-flex items-center gap-1.5 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setClubSports((prev) => {
                            if (prev.includes(sport)) {
                              const next = prev.filter((s) => s !== sport);
                              return next.length ? next : [DEFAULT_ENTITY_SPORT];
                            }
                            return [...prev, sport];
                          })
                        }
                      />
                      {sport}
                    </label>
                  );
                })}
              </div>
            </div>
            {profileFieldRows.map(([label, value, setter, isSelect]) => (
              <div key={String(label)} className="grid grid-cols-[160px_1fr] items-center gap-2">
                <label className="text-gray-800">{label}</label>
                {isSelect && label === 'Country' ? (
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
          <div className="mb-2 text-sm font-semibold text-red-700">{labels.passwordSectionTitle}</div>
          <p className="text-xs text-gray-600 mb-2">
            {mode === 'edit'
              ? 'Leave blank to keep the current company login password.'
              : labels.passwordHintCreate}
          </p>
          <table className="w-full max-w-lg border border-gray-300 text-sm">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="w-36 bg-gray-50 px-3 py-2">My Password</td>
                <td className="px-3 py-2">
                  <input
                    type="password"
                    value={mode === 'create' ? clubMyPassword : hasStoredEntityPassword ? '••••••••' : ''}
                    onChange={(e) => {
                      if (mode === 'create') setClubMyPassword(e.target.value);
                    }}
                    readOnly={mode === 'edit'}
                    disabled={mode === 'edit' && !hasStoredEntityPassword}
                    autoComplete={mode === 'create' ? 'new-password' : 'off'}
                    placeholder={mode === 'create' ? 'Direct login password' : 'Not set yet'}
                    className={`w-full rounded border border-gray-300 px-2 py-1 ${
                      mode === 'edit' ? 'bg-gray-100 text-gray-600' : 'bg-white'
                    }`}
                  />
                </td>
              </tr>
              {mode === 'edit' ? (
                <>
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
                </>
              ) : (
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
              )}
            </tbody>
          </table>
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
          <label className="font-semibold text-gray-900">{labels.officialNameLabel}</label>
          <input
            value={clubOfficialName}
            onChange={(e) => setClubOfficialName(e.target.value)}
            className="w-full rounded border border-gray-400 bg-[#fff9c4] px-2 py-1.5"
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-red-700">Direct Registration Code</div>
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
          </div>
        </div>

        {showClubReferences ? (
          <div>
            <div className="mb-2 border border-[#c9bd7a] bg-[#efe7b3] px-4 py-2 text-sm font-semibold text-gray-900">
              References of the club
            </div>
            <p className="mb-2 text-xs text-gray-600">
              These references belong to the club itself, not to the club admin personal account.
            </p>
            <div className="border border-gray-300 bg-white p-3">
              <CKEditorComponent
                value={clubReferencesHtml}
                onChange={(html) => setClubReferencesHtml(html)}
                minHeightPx={260}
                placeholder=""
              />
              <div className="mt-3 grid max-w-md grid-cols-[160px_1fr] items-center gap-2 text-sm">
                <label className="text-gray-800">References level</label>
                <select
                  value={clubReferencesLevel}
                  onChange={(e) => setClubReferencesLevel(e.target.value)}
                  className="w-24 rounded border border-gray-400 bg-gray-100 px-2 py-1.5"
                >
                  {['1', '2', '3', '4', '5', '6'].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

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
          {onCancel ? (
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="rounded-lg border border-gray-900 bg-gradient-to-b from-gray-700 to-black px-10 py-2.5 font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { calcAge, isMemberUnderage, normalizeContacts } from '@/lib/club/memberProfileDefaults';
import {
  KINSHIP_OPTIONS,
  MAIN_SPORTS,
  PARENTS_TAB_LABEL,
  THEME_OPTIONS,
  type MemberProfileBundle,
} from '@/lib/club/memberProfileTypes';
import {
  CheckRow,
  Field,
  Row2,
  SectionCard,
  TextArea,
  TextInput,
  TextSelect,
} from '@/components/club/memberProfile/FormBits';
import SignaturePad, {
  type SignaturePadHandle,
} from '@/components/club/memberProfile/SignaturePad';
import NewsCategoryMultiSelect from '@/components/club/memberProfile/NewsCategoryMultiSelect';
import MemberProfileSettingsTab from '@/components/club/memberProfile/MemberProfileSettingsTab';
import CoachNotesPanel from '@/components/club/memberProfile/CoachNotesPanel';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import { renewMembershipDates } from '@/lib/club/memberMembershipDates';

const CKEditor = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

export type ProfileTabId =
  | 'owner-profile'
  | 'contacts'
  | 'activities'
  | 'references'
  | 'pay-for'
  | 'other-details'
  | 'parents'
  | 'settings'
  | 'messages-staff'
  | 'notes-coach'
  | 'presences';

type Props = {
  data: MemberProfileBundle;
  activeTab: ProfileTabId;
  mode: 'view' | 'edit';
  onChange: (next: MemberProfileBundle) => void;
  onReload: () => void;
  /** When set, shared sections save/load via /api/user/member-profile (no club). */
  profileSource?: 'club' | 'self';
};

export default function ClubMemberProfileEditor({
  data,
  activeTab,
  mode,
  onChange,
  onReload,
  profileSource = 'club',
}: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '' });
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const readOnlyOwner = mode === 'view' || !data.viewer.canEditOwner;
  const readOnlyMemberTabs =
    mode === 'view' || !data.viewer.canEditContactsActivitiesReferences;
  const readOnlyClub = mode === 'view' || !data.viewer.canEditClubScoped;
  const canEditSignature =
    mode !== 'view' &&
    Boolean(
      data.viewer.canEditClubScoped ||
        data.viewer.canEditMemberSignature ||
        data.viewer.isSelf,
    );
  const readOnlyMemberSignature = !canEditSignature;
  const canSaveClubSection = data.viewer.canEditClubScoped
    ? !readOnlyClub
    : canEditSignature;

  const clubRef = useRef(data.club);
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  clubRef.current = data.club;

  const underage = useMemo(() => {
    const age = calcAge(data.owner.personal.dateOfBirth);
    return age != null && age < 18;
  }, [data.owner.personal.dateOfBirth]);

  const saveClubSection = (signatureField?: 'parents' | 'otherDetails') => {
    let clubToSave = clubRef.current;
    const sig = signaturePadRef.current?.getValue();
    if (sig !== undefined && signatureField) {
      if (signatureField === 'parents') {
        clubToSave = {
          ...clubToSave,
          parents: { ...clubToSave.parents, signatureDataUrl: sig },
        };
      } else {
        clubToSave = {
          ...clubToSave,
          otherDetails: { ...clubToSave.otherDetails, signatureDataUrl: sig },
        };
      }
      clubRef.current = clubToSave;
    }
    void saveSection('club', { club: clubToSave });
  };

  const patchOwner = (path: (o: MemberProfileBundle['owner']) => MemberProfileBundle['owner']) => {
    onChange({ ...data, owner: path(data.owner) });
  };

  const saveSection = async (
    section: 'owner' | 'contacts' | 'activities' | 'references' | 'club',
    override?: Partial<{
      owner: MemberProfileBundle['owner'];
      contacts: MemberProfileBundle['contacts'];
      activities: MemberProfileBundle['activities'];
      referencesHtml: string;
      club: MemberProfileBundle['club'];
    }>,
  ): Promise<boolean> => {
    setSaving(true);
    setMessage('');
    try {
      const body: Record<string, unknown> = {};
      if (section === 'owner') body.owner = override?.owner ?? data.owner;
      if (section === 'contacts') body.contacts = override?.contacts ?? data.contacts;
      if (section === 'activities') body.activities = override?.activities ?? data.activities;
      if (section === 'references') {
        body.referencesHtml = override?.referencesHtml ?? data.referencesHtml;
      }
      if (section === 'club') body.club = override?.club ?? clubRef.current;

      const sharedOnly = section !== 'club';
      const useSelfApi = profileSource === 'self' && sharedOnly;

      const url = useSelfApi
        ? '/api/user/member-profile'
        : withSelectedClubId(
            `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/profile`,
          );

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setMessage('Saved.');
      onReload();
      return true;
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadOwnerFile = async (kind: 'image' | 'pdf' | 'photo', file: File) => {
    setSaving(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);

      const url =
        profileSource === 'self' || !data.clubId
          ? '/api/user/member-profile/medical-upload'
          : withSelectedClubId(
              `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/profile/medical-upload`,
            );

      // Do not use getAuthHeaders() here — it forces Content-Type: application/json
      // and breaks multipart FormData (browser must set the boundary).
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      const path = String(json.path || '');
      if (!path) throw new Error('Upload did not return a file path');

      // Build next owner synchronously — React state is stale until next render,
      // so the follow-up PATCH must use this object (not data.owner).
      const nextOwner: MemberProfileBundle['owner'] = {
        ...data.owner,
        ...(kind === 'photo'
          ? { photoUrl: path }
          : {
              medical: {
                ...data.owner.medical,
                ...(kind === 'image' ? { imageUrl: path } : { pdfUrl: path }),
              },
            }),
      };
      onChange({ ...data, owner: nextOwner });
      const saved = await saveSection('owner', { owner: nextOwner });
      if (saved) {
        setMessage('Uploaded and saved.');
      } else {
        setMessage((prev) =>
          prev ? `${prev} (file uploaded — click Save to keep the link)` : 'Upload saved failed',
        );
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const refreshMembershipFromArchive = async () => {
    if (!data.clubId) {
      setMessage('Select a club first.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(
        withSelectedClubId(
          `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/profile/membership-dates`,
        ),
        { headers: getAuthHeaders() },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load membership dates');
      const dates = json.dates as { from?: string; to?: string } | null;
      if (!dates) {
        setMessage('No membership archive record found.');
        return;
      }
      onChange({
        ...data,
        club: {
          ...data.club,
          otherDetails: {
            ...data.club.otherDetails,
            membershipFrom: dates.from || data.club.otherDetails.membershipFrom,
            membershipTo: dates.to || data.club.otherDetails.membershipTo,
          },
        },
      });
      setMessage('Loaded from archive. Click Save to persist.');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setSaving(false);
    }
  };

  const handleRenewMembership = async () => {
    const od = data.club.otherDetails;
    const next = renewMembershipDates(od.membershipFrom, od.membershipTo);
    const nextData: MemberProfileBundle = {
      ...data,
      club: {
        ...data.club,
        otherDetails: {
          ...od,
          membershipFrom: next.from,
          membershipTo: next.to,
        },
      },
    };
    onChange(nextData);
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(
        withSelectedClubId(
          `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/profile`,
        ),
        {
          method: 'PATCH',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ club: nextData.club }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Renew failed');
      setMessage('Membership renewed (+1 year).');
      onReload();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Renew failed');
    } finally {
      setSaving(false);
    }
  };

  const postNote = async (kind: 'staff' | 'coach', parentId?: string) => {
    const body = parentId ? replyDrafts[parentId] || '' : noteDraft.body;
    const title = parentId ? '' : noteDraft.title;
    if (!body.trim()) {
      setMessage('Enter a message.');
      return;
    }
    setSaving(true);
    try {
      if (kind === 'staff' && !parentId && data.viewer.canEditClubScoped) {
        const saveRes = await fetch(
          withSelectedClubId(
            `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/profile`,
          ),
          {
            method: 'PATCH',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ club: data.club }),
          },
        );
        if (!saveRes.ok) {
          const j = await saveRes.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to save staff document');
        }
      }

      const res = await fetch(
        withSelectedClubId(
          `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/notes`,
        ),
        {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            title,
            body,
            parentId,
            visibleToMember:
              kind === 'coach'
                ? data.club.visibility.notesCoach
                : data.club.visibility.messagesStaff,
            commentsEnabled: data.club.visibility.notesCoachComments,
            enableFrom: data.club.staffMessage.enableFrom || null,
            enableTo: data.club.staffMessage.enableTo || null,
            showAtLogin: data.club.staffMessage.showAtLogin,
            showAtLogout: data.club.staffMessage.showAtLogout,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to post');
      setNoteDraft({ title: '', body: '' });
      if (parentId) setReplyDrafts((d) => ({ ...d, [parentId]: '' }));
      setMessage('Posted.');
      onReload();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setSaving(false);
    }
  };

  const resetNotes = async (kind: 'staff' | 'coach') => {
    if (!window.confirm(`Reset all ${kind} documents and replies?`)) return;
    setSaving(true);
    try {
      const res = await fetch(
        withSelectedClubId(
          `/api/clubs/${encodeURIComponent(data.clubId)}/members/${encodeURIComponent(data.memberId)}/notes?resetKind=${kind}`,
        ),
        { method: 'DELETE', headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error('Reset failed');
      setMessage('Reset done.');
      onReload();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const SaveBar = ({
    onSave,
    canSave,
  }: {
    onSave: () => void;
    canSave: boolean;
  }) =>
    canSave ? (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {message ? <span className="text-sm text-gray-700">{message}</span> : null}
      </div>
    ) : (
      <p className="mt-3 text-xs text-gray-500">View only for your role on this section.</p>
    );

  if (activeTab === 'owner-profile') {
    const o = data.owner;
    return (
      <div>
        <SectionCard title="Private settings" tone="red">
          <CheckRow
            label="Disallow the Club Admins to modify my data in the personal profile"
            checked={o.privateSettings.disallowClubAdmins}
            disabled={mode === 'view' || !data.viewer.isSelf}
            onChange={(v) =>
              patchOwner((prev) => ({
                ...prev,
                privateSettings: { disallowClubAdmins: v },
              }))
            }
          />
          <p className="text-xs text-gray-500">
            Only the member can change this flag. When checked, club admins cannot edit Owner
            profile fields.
          </p>
        </SectionCard>

        <SectionCard title="Photo and QR code">
          <Row2>
            <Field label="Personal photo">
              <TextInput
                disabled={readOnlyOwner}
                value={o.photoUrl}
                onChange={(e) => patchOwner((p) => ({ ...p, photoUrl: e.target.value }))}
                placeholder="/uploads/..."
              />
              {!readOnlyOwner ? (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-red-700 underline">
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadOwnerFile('photo', f);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
              {o.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.photoUrl} alt="" className="mt-2 h-28 w-28 object-cover border" />
              ) : null}
            </Field>
            <Field label="QR code URL">
              <TextInput
                disabled={readOnlyOwner}
                value={o.qrCodeUrl}
                onChange={(e) => patchOwner((p) => ({ ...p, qrCodeUrl: e.target.value }))}
              />
            </Field>
          </Row2>
        </SectionCard>

        <SectionCard title="Data for Login">
          <Row2>
            <Field label="Username">
              <TextInput disabled value={o.login.username} />
            </Field>
            <Field label="Mail address">
              <TextInput
                disabled={readOnlyOwner}
                type="email"
                value={o.login.email}
                onChange={(e) =>
                  patchOwner((p) => ({ ...p, login: { ...p.login, email: e.target.value } }))
                }
              />
            </Field>
            <Field label="First name">
              <TextInput
                disabled={readOnlyOwner}
                value={o.login.firstName}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    login: { ...p.login, firstName: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Last name">
              <TextInput
                disabled={readOnlyOwner}
                value={o.login.lastName}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    login: { ...p.login, lastName: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="New password">
              <TextInput
                disabled={readOnlyOwner}
                type="password"
                value={o.login.newPassword}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    login: { ...p.login, newPassword: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Repeat password">
              <TextInput
                disabled={readOnlyOwner}
                type="password"
                value={o.login.repeatPassword}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    login: { ...p.login, repeatPassword: e.target.value },
                  }))
                }
              />
            </Field>
          </Row2>
          <p className="text-xs text-gray-500">
            Reset password (send old one to mail) — use the standard account recovery flow for
            now.
          </p>
        </SectionCard>

        <SectionCard title="Address & contacts">
          <Row2>
            {(
              [
                ['country', 'Country'],
                ['region', 'Region'],
                ['province', 'Province'],
                ['city', 'City of residence'],
                ['zipCode', 'ZIP code'],
                ['address', 'Address'],
                ['geoCoordinates', 'Geographical coordinates'],
                ['alternativeMail', 'Alternative mail'],
                ['whatsappGroupName', 'Whatsapp group name'],
                ['telegramGroupName', 'Telegram group name'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput
                  disabled={readOnlyOwner}
                  value={o.address[key]}
                  onChange={(e) =>
                    patchOwner((p) => ({
                      ...p,
                      address: { ...p.address, [key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
          </Row2>
          {(
            [
              ['phone', 'Phone', 'phoneWhatsapp', 'phoneTelegram'],
              ['mobile1', 'Mobile 1', 'mobile1Whatsapp', 'mobile1Telegram'],
              ['mobile2', 'Mobile 2', 'mobile2Whatsapp', 'mobile2Telegram'],
            ] as const
          ).map(([numKey, label, waKey, tgKey]) => (
            <div key={numKey} className="rounded border border-gray-200 p-2">
              <Field label={label}>
                <TextInput
                  disabled={readOnlyOwner}
                  value={o.address[numKey]}
                  onChange={(e) =>
                    patchOwner((p) => ({
                      ...p,
                      address: { ...p.address, [numKey]: e.target.value },
                    }))
                  }
                />
              </Field>
              <div className="mt-2 flex flex-wrap gap-4">
                <CheckRow
                  label="WhatsApp"
                  disabled={readOnlyOwner}
                  checked={o.address[waKey]}
                  onChange={(v) =>
                    patchOwner((p) => ({
                      ...p,
                      address: { ...p.address, [waKey]: v },
                    }))
                  }
                />
                <CheckRow
                  label="Telegram"
                  disabled={readOnlyOwner}
                  checked={o.address[tgKey]}
                  onChange={(v) =>
                    patchOwner((p) => ({
                      ...p,
                      address: { ...p.address, [tgKey]: v },
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Personal Data">
          <Row2>
            <Field label="Gender">
              <TextSelect
                disabled={readOnlyOwner}
                value={o.personal.gender}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, gender: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </TextSelect>
            </Field>
            <Field label="Date of birth">
              <TextInput
                disabled={readOnlyOwner}
                type="date"
                value={o.personal.dateOfBirth}
                onChange={(e) => {
                  const dateOfBirth = e.target.value;
                  const age = calcAge(dateOfBirth);
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, dateOfBirth, age },
                  }));
                }}
              />
            </Field>
            <Field label="Age (auto)">
              <TextInput disabled value={o.personal.age ?? ''} />
            </Field>
            <Field label="Location of birth">
              <TextInput
                disabled={readOnlyOwner}
                value={o.personal.locationOfBirth}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, locationOfBirth: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Province">
              <TextInput
                disabled={readOnlyOwner}
                value={o.personal.provinceOfBirth}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, provinceOfBirth: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Name day (day-month)" hint="e.g. 03-15">
              <TextInput
                disabled={readOnlyOwner}
                value={o.personal.nameDay}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, nameDay: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Occupation">
              <TextInput
                disabled={readOnlyOwner}
                value={o.personal.occupation}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, occupation: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Since date">
              <TextInput
                disabled={readOnlyOwner}
                type="date"
                value={o.personal.sinceDate}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, sinceDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Main sport (1 only)">
              <TextSelect
                disabled={readOnlyOwner}
                value={o.personal.mainSport}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    personal: { ...p.personal, mainSport: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                {MAIN_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </TextSelect>
            </Field>
          </Row2>
          <Field label="Other sports (multi)">
            <div className="flex flex-wrap gap-3">
              {MAIN_SPORTS.map((s) => (
                <CheckRow
                  key={s}
                  label={s}
                  disabled={readOnlyOwner}
                  checked={o.personal.otherSports.includes(s)}
                  onChange={(v) =>
                    patchOwner((p) => ({
                      ...p,
                      personal: {
                        ...p.personal,
                        otherSports: v
                          ? [...p.personal.otherSports, s]
                          : p.personal.otherSports.filter((x) => x !== s),
                      },
                    }))
                  }
                />
              ))}
            </div>
          </Field>
        </SectionCard>

        <SectionCard title="Administrative data">
          <Row2>
            {(
              [
                ['fiscalCode', 'Fiscal code'],
                ['documentId', 'Document ID'],
                ['citizenship', 'Citizenship'],
                ['carDrivingLicense', 'Car driving license'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput
                  disabled={readOnlyOwner}
                  value={o.administrative[key]}
                  onChange={(e) =>
                    patchOwner((p) => ({
                      ...p,
                      administrative: { ...p.administrative, [key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
          </Row2>
        </SectionCard>

        <SectionCard title="Medical Info">
          <Row2>
            <Field label="Blood group">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.bloodGroup}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, bloodGroup: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Medical examination">
              <TextSelect
                disabled={readOnlyOwner}
                value={o.medical.medicalExamination}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, medicalExamination: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                <option value="Competitive">Competitive</option>
                <option value="Non-competitive">Non-competitive</option>
                <option value="Not required">Not required</option>
              </TextSelect>
            </Field>
            <Field label="Release date">
              <TextInput
                type="date"
                disabled={readOnlyOwner}
                value={o.medical.releaseDate}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, releaseDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Expiration date">
              <TextInput
                type="date"
                disabled={readOnlyOwner}
                value={o.medical.expirationDate}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, expirationDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Outcome">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.outcome}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, outcome: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Doctor who issued">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.doctorWhoIssued}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, doctorWhoIssued: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Emergency contact phone">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.emergencyContactPhone}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, emergencyContactPhone: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Emergency contact name">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.emergencyContactName}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, emergencyContactName: e.target.value },
                  }))
                }
              />
            </Field>
          </Row2>
          <CheckRow
            label="Alert -30gg"
            disabled={readOnlyOwner}
            checked={o.medical.alert30gg}
            onChange={(v) =>
              patchOwner((p) => ({ ...p, medical: { ...p.medical, alert30gg: v } }))
            }
          />
          <Field label="Allergies and intolerances">
            <TextArea
              disabled={readOnlyOwner}
              rows={3}
              value={o.medical.allergies}
              onChange={(e) =>
                patchOwner((p) => ({
                  ...p,
                  medical: { ...p.medical, allergies: e.target.value },
                }))
              }
            />
          </Field>
          <Row2>
            <Field label="Medical image">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.imageUrl}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, imageUrl: e.target.value },
                  }))
                }
              />
              {!readOnlyOwner ? (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-red-700 underline">
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadOwnerFile('image', f);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
              {o.medical.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.medical.imageUrl} alt="" className="mt-2 max-h-40 rounded border" />
              ) : null}
            </Field>
            <Field label="Medical PDF">
              <TextInput
                disabled={readOnlyOwner}
                value={o.medical.pdfUrl}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    medical: { ...p.medical, pdfUrl: e.target.value },
                  }))
                }
              />
              {!readOnlyOwner ? (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-red-700 underline">
                  Upload PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadOwnerFile('pdf', f);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
              {o.medical.pdfUrl ? (
                <a
                  href={o.medical.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-sm text-blue-700 underline"
                >
                  View PDF
                </a>
              ) : null}
            </Field>
          </Row2>
        </SectionCard>

        <SectionCard title="Other references">
          <Row2>
            <Field label="Language">
              <TextInput
                disabled={readOnlyOwner}
                value={o.otherReferences.language}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    otherReferences: { ...p.otherReferences, language: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Timezone">
              <TextInput
                disabled={readOnlyOwner}
                value={o.otherReferences.timezone}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    otherReferences: { ...p.otherReferences, timezone: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Unit of measure">
              <TextSelect
                disabled={readOnlyOwner}
                value={o.otherReferences.unitOfMeasure}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    otherReferences: { ...p.otherReferences, unitOfMeasure: e.target.value },
                  }))
                }
              >
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </TextSelect>
            </Field>
            <Field label="Theme">
              <TextSelect
                disabled={readOnlyOwner}
                value={o.otherReferences.theme}
                onChange={(e) =>
                  patchOwner((p) => ({
                    ...p,
                    otherReferences: { ...p.otherReferences, theme: e.target.value },
                  }))
                }
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.color})
                  </option>
                ))}
              </TextSelect>
            </Field>
          </Row2>
          <Field label="Notes about the user">
            <TextArea
              disabled={readOnlyOwner}
              rows={3}
              value={o.otherReferences.notes}
              onChange={(e) =>
                patchOwner((p) => ({
                  ...p,
                  otherReferences: { ...p.otherReferences, notes: e.target.value },
                }))
              }
            />
          </Field>
        </SectionCard>

        <SaveBar canSave={!readOnlyOwner} onSave={() => void saveSection('owner')} />
      </div>
    );
  }

  if (activeTab === 'contacts') {
    const c = normalizeContacts(data.contacts);
    const socialPlatforms = [
      'Facebook',
      'Twitter',
      'Instagram',
      'LinkedIn',
      'YouTube',
      'WhatsApp',
      'TikTok',
      'Other',
    ];
    const publicLinkFields: {
      key: keyof Pick<
        typeof c,
        | 'myWebsite'
        | 'whatsapp'
        | 'instagram'
        | 'youtube'
        | 'linkedin'
        | 'blogSite'
        | 'googleMap'
      >;
      label: string;
    }[] = [
      { key: 'myWebsite', label: 'My Website' },
      { key: 'whatsapp', label: 'Whatsapp' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'youtube', label: 'You tube' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'blogSite', label: 'My blog site' },
      { key: 'googleMap', label: 'Google map' },
    ];

    const patchContacts = (next: typeof c) => {
      onChange({ ...data, contacts: next });
    };

    return (
      <div>
        <SectionCard
          title="MY CONTACTS (managed only by the user/member)"
          tone="blue"
        >
          <Field label="Alternate Email">
            <TextInput
              disabled={readOnlyMemberTabs}
              type="email"
              value={c.alternateEmail}
              onChange={(e) =>
                patchContacts({ ...c, alternateEmail: e.target.value })
              }
            />
          </Field>

          <Field label="Phone">
            <div className="flex max-w-md gap-2">
              <TextInput
                disabled={readOnlyMemberTabs}
                value={c.phonePrefix}
                onChange={(e) =>
                  patchContacts({ ...c, phonePrefix: e.target.value })
                }
                placeholder="+39"
                className="w-24 shrink-0"
              />
              <TextInput
                disabled={readOnlyMemberTabs}
                value={c.phoneNumber}
                onChange={(e) =>
                  patchContacts({ ...c, phoneNumber: e.target.value })
                }
              />
            </div>
          </Field>

          {c.socialSites.map((site, index) => (
            <Field key={index} label="Social Site">
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextSelect
                  disabled={readOnlyMemberTabs}
                  value={site.platform}
                  onChange={(e) => {
                    const socialSites = [...c.socialSites] as typeof c.socialSites;
                    socialSites[index] = {
                      ...socialSites[index],
                      platform: e.target.value,
                    };
                    patchContacts({ ...c, socialSites });
                  }}
                  className="sm:w-36 shrink-0"
                >
                  {socialPlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </TextSelect>
                <TextInput
                  disabled={readOnlyMemberTabs}
                  value={site.url}
                  onChange={(e) => {
                    const socialSites = [...c.socialSites] as typeof c.socialSites;
                    socialSites[index] = {
                      ...socialSites[index],
                      url: e.target.value,
                    };
                    patchContacts({ ...c, socialSites });
                  }}
                />
              </div>
            </Field>
          ))}

          {publicLinkFields.map(({ key, label }) => (
            <Field key={key} label={label}>
              <div className="space-y-2">
                <TextInput
                  disabled={readOnlyMemberTabs}
                  value={c[key].url}
                  onChange={(e) =>
                    patchContacts({
                      ...c,
                      [key]: { ...c[key], url: e.target.value },
                    })
                  }
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={readOnlyMemberTabs}
                    checked={c[key].showInPublicInfo}
                    onChange={(e) =>
                      patchContacts({
                        ...c,
                        [key]: {
                          ...c[key],
                          showInPublicInfo: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-gray-400"
                  />
                  Show in public info
                </label>
              </div>
            </Field>
          ))}

          <Field label="About Me">
            <TextArea
              disabled={readOnlyMemberTabs}
              rows={5}
              value={c.aboutMe}
              onChange={(e) => patchContacts({ ...c, aboutMe: e.target.value })}
            />
          </Field>
        </SectionCard>
        <SaveBar
          canSave={!readOnlyMemberTabs}
          onSave={() => void saveSection('contacts', { contacts: c })}
        />
      </div>
    );
  }

  if (activeTab === 'activities') {
    const a = data.activities;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div>
        <SectionCard title="My Activities" tone="blue">
          <Field label="Preferred days">
            <div className="flex flex-wrap gap-3">
              {days.map((d) => (
                <CheckRow
                  key={d}
                  label={d}
                  disabled={readOnlyMemberTabs}
                  checked={a.preferredDays.includes(d)}
                  onChange={(v) =>
                    onChange({
                      ...data,
                      activities: {
                        ...a,
                        preferredDays: v
                          ? [...a.preferredDays, d]
                          : a.preferredDays.filter((x) => x !== d),
                      },
                    })
                  }
                />
              ))}
            </div>
          </Field>
          <Field label="Preferred time">
            <TextInput
              disabled={readOnlyMemberTabs}
              value={a.preferredTime}
              onChange={(e) =>
                onChange({
                  ...data,
                  activities: { ...a, preferredTime: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Notes">
            <TextArea
              disabled={readOnlyMemberTabs}
              rows={4}
              value={a.notes}
              onChange={(e) =>
                onChange({ ...data, activities: { ...a, notes: e.target.value } })
              }
            />
          </Field>
        </SectionCard>
        <SaveBar
          canSave={!readOnlyMemberTabs}
          onSave={() => void saveSection('activities')}
        />
      </div>
    );
  }

  if (activeTab === 'references') {
    return (
      <div>
        <SectionCard title="References" tone="blue">
          {readOnlyMemberTabs ? (
            <div
              className="prose max-w-none text-sm"
              dangerouslySetInnerHTML={{
                __html: data.referencesHtml || '<p class="text-gray-500">No references.</p>',
              }}
            />
          ) : (
            <CKEditor
              value={data.referencesHtml}
              onChange={(html) => onChange({ ...data, referencesHtml: html })}
              placeholder="Write references…"
              minHeightPx={280}
            />
          )}
        </SectionCard>
        <SaveBar
          canSave={!readOnlyMemberTabs}
          onSave={() => void saveSection('references')}
        />
      </div>
    );
  }

  // Club-scoped tabs below
  const club = data.club;
  const setClub = (
    next: typeof club | ((prev: typeof club) => typeof club),
  ) => {
    const resolved = typeof next === 'function' ? next(clubRef.current) : next;
    clubRef.current = resolved;
    onChange({ ...data, club: resolved });
  };

  if (activeTab === 'pay-for') {
    return (
      <div>
        {data.viewer.isClubAdmin ? (
          <SectionCard title="Member visibility" tone="purple">
            <CheckRow
              label="Allow member to see Pay for… section"
              checked={club.visibility.payFor}
              disabled={readOnlyClub}
              onChange={(v) =>
                setClub({
                  ...club,
                  visibility: { ...club.visibility, payFor: v },
                })
              }
            />
          </SectionCard>
        ) : null}
        <SectionCard title="Pay for others (managed by the Admin of the club selected)">
          <p className="mb-2 text-sm text-gray-600">
            Here you can select other members to add to the list of members paid by the current
            member.
          </p>
          <div className="space-y-2">
            {data.clubMembersForPayFor.length === 0 ? (
              <p className="text-sm text-gray-500">No other members in this club.</p>
            ) : (
              data.clubMembersForPayFor.map((m) => (
                <CheckRow
                  key={m.id}
                  label={m.label}
                  disabled={readOnlyClub}
                  checked={club.payForMemberIds.includes(m.id)}
                  onChange={(v) =>
                    setClub({
                      ...club,
                      payForMemberIds: v
                        ? [...club.payForMemberIds, m.id]
                        : club.payForMemberIds.filter((id) => id !== m.id),
                    })
                  }
                />
              ))
            )}
          </div>
        </SectionCard>
        <SaveBar canSave={!readOnlyClub} onSave={() => void saveSection('club')} />
      </div>
    );
  }

  if (activeTab === 'other-details') {
    const od = club.otherDetails;
    return (
      <div>
        {data.viewer.isClubAdmin ? (
          <SectionCard title="Member visibility" tone="purple">
            <CheckRow
              label="Allow member to read Other member's details"
              checked={club.visibility.otherDetails}
              disabled={readOnlyClub}
              onChange={(v) =>
                setClub({
                  ...club,
                  visibility: { ...club.visibility, otherDetails: v },
                })
              }
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Last Membership to the Club">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-blue-800">
            <span>Edit dates below</span>
            <div className="flex flex-wrap gap-2">
              {!readOnlyClub ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void refreshMembershipFromArchive()}
                  className="rounded border border-blue-700 px-2 py-1 text-xs font-semibold hover:bg-blue-50"
                >
                  Load from archive
                </button>
              ) : null}
              {!readOnlyClub ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleRenewMembership()}
                  className="rounded bg-blue-800 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-900"
                >
                  Renew (+1 year)
                </button>
              ) : (
                <span>Renew</span>
              )}
            </div>
          </div>
          <Row2>
            <Field label="Membership from">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={od.membershipFrom}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, membershipFrom: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Membership to (expiration)">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={od.membershipTo}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, membershipTo: e.target.value },
                  }))
                }
              />
            </Field>
          </Row2>
          <p className="mt-2 text-xs text-red-700">
            Last membership can also be loaded from the Archive of Memberships. Editing these
            dates may update membership archive data. Renew updates these dates.
          </p>
        </SectionCard>

        <SectionCard title="Privacy">
          <CheckRow
            label="User authorizes data treatments"
            disabled={readOnlyClub}
            checked={od.privacyDataTreatments}
            onChange={(v) =>
              setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, privacyDataTreatments: v } }))
            }
          />
          <CheckRow
            label="User authorizes Club's admin to furnish personal data to third party firms"
            disabled={readOnlyClub}
            checked={od.privacyThirdParty}
            onChange={(v) =>
              setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, privacyThirdParty: v } }))
            }
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CheckRow
              label="User underage — Yes"
              checked={underage || od.userUnderage}
              disabled
              onChange={() => undefined}
            />
            <TextInput
              disabled={readOnlyClub || !(underage || od.userUnderage)}
              value={od.underageCode}
              placeholder="Code / notes"
              onChange={(e) =>
                setClub((c) => ({
                  ...c,
                  otherDetails: { ...c.otherDetails, underageCode: e.target.value },
                }))
              }
              className="max-w-xs"
            />
          </div>
          <p className="text-xs text-gray-500">
            Underage is set automatically from date of birth (&lt; 18) and is not manually
            editable.
          </p>
        </SectionCard>

        <SectionCard title="Club / Team tutors and External tutors">
          <div className="grid grid-cols-1 border border-gray-200 sm:grid-cols-[9rem_1fr]">
            <div className="bg-gray-50 px-3 py-3 text-sm font-bold text-gray-800 sm:flex sm:items-start sm:justify-end">
              Vendors
            </div>
            <div className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    disabled={readOnlyClub}
                    checked={od.vendorsEnabled}
                    onChange={(e) =>
                      setClub((c) => ({
                        ...c,
                        otherDetails: { ...c.otherDetails, vendorsEnabled: e.target.checked },
                      }))
                    }
                    className="rounded border-gray-400"
                  />
                  Yes
                </label>
                <TextSelect
                  disabled={readOnlyClub || !od.vendorsEnabled}
                  value={od.vendors[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setClub((c) => ({
                      ...c,
                      otherDetails: {
                        ...c.otherDetails,
                        vendors: value
                          ? [value, ...c.otherDetails.vendors.slice(1)].slice(0, 3)
                          : [],
                      },
                    }));
                  }}
                  className="min-w-[12rem] max-w-sm flex-1"
                >
                  <option value="">Select</option>
                  {(data.vendorCoachOptions || []).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </TextSelect>
                <span className="text-xs text-gray-500">Max 3</span>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  disabled={readOnlyClub || !od.vendorsEnabled}
                  checked={od.enableCommission}
                  onChange={(e) =>
                    setClub((c) => ({
                      ...c,
                      otherDetails: { ...c.otherDetails, enableCommission: e.target.checked },
                    }))
                  }
                  className="rounded border-gray-400"
                />
                Enable Commission
              </label>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 border border-gray-200 sm:grid-cols-[9rem_1fr]">
            <div className="bg-gray-50 px-3 py-3 text-sm font-bold text-gray-800 sm:flex sm:items-start sm:justify-end">
              Coach
            </div>
            <div className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    disabled={readOnlyClub}
                    checked={od.coachEnabled}
                    onChange={(e) =>
                      setClub((c) => ({
                        ...c,
                        otherDetails: { ...c.otherDetails, coachEnabled: e.target.checked },
                      }))
                    }
                    className="rounded border-gray-400"
                  />
                  Yes
                </label>
                <TextSelect
                  disabled={readOnlyClub || !od.coachEnabled}
                  value={od.coachName}
                  onChange={(e) =>
                    setClub((c) => ({
                      ...c,
                      otherDetails: { ...c.otherDetails, coachName: e.target.value },
                    }))
                  }
                  className="min-w-[12rem] max-w-sm flex-1"
                >
                  <option value="">Select</option>
                  {(data.vendorCoachOptions || []).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </TextSelect>
                <span className="text-xs text-gray-500">Max 1</span>
              </div>
            </div>
          </div>

          <Row2>
            <Field label="Insurance Company">
              <TextInput
                disabled={readOnlyClub}
                value={od.insuranceCompany}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, insuranceCompany: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Insurance deadline">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={od.insuranceDeadline}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, insuranceDeadline: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Type of Badge Federation">
              <TextInput
                disabled={readOnlyClub}
                value={od.badgeFederationType}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, badgeFederationType: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Sport Season (year)">
              <TextInput
                disabled={readOnlyClub}
                value={od.sportSeason}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, sportSeason: e.target.value },
                  }))
                }
              />
            </Field>
          </Row2>
          {od.badges.map((b, idx) => (
            <Row2 key={idx}>
              <Field label={`Badges Federation ${idx + 1}`}>
                <TextInput
                  disabled={readOnlyClub}
                  value={b.name}
                  onChange={(e) => {
                    const badges = od.badges.map((x, i) =>
                      i === idx ? { ...x, name: e.target.value } : x,
                    );
                    setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, badges } }));
                  }}
                />
              </Field>
              <Field label="Deadline">
                <TextInput
                  type="date"
                  disabled={readOnlyClub}
                  value={b.deadline}
                  onChange={(e) => {
                    const badges = od.badges.map((x, i) =>
                      i === idx ? { ...x, deadline: e.target.value } : x,
                    );
                    setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, badges } }));
                  }}
                />
              </Field>
            </Row2>
          ))}
        </SectionCard>

        {!underage ? (
          <SectionCard title="Signatures (overage member)">
            <CheckRow
              label="Acceptance of the rules of the club/team"
              disabled={readOnlyMemberSignature}
              checked={od.acceptanceRules}
              onChange={(v) =>
                setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, acceptanceRules: v } }))
              }
            />
            <CheckRow
              label="I have read Privacy policy"
              disabled={readOnlyMemberSignature}
              checked={od.privacyPolicyRead}
              onChange={(v) =>
                setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, privacyPolicyRead: v } }))
              }
            />
            <Field label="Signature">
              <SignaturePad
                ref={signaturePadRef}
                disabled={readOnlyMemberSignature}
                value={od.signatureDataUrl}
                onChange={(v) =>
                  setClub((c) => ({
                    ...c,
                    otherDetails: { ...c.otherDetails, signatureDataUrl: v },
                  }))
                }
              />
            </Field>
          </SectionCard>
        ) : null}

        <SectionCard title="Section News">
          <div className="grid grid-cols-1 border border-gray-200 sm:grid-cols-[11rem_1fr]">
            <div className="bg-gray-50 px-3 py-3 text-sm font-bold text-gray-800 sm:flex sm:items-start sm:justify-end">
              Enable the reading of news
            </div>
            <div className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    disabled={readOnlyClub}
                    checked={od.newsReadEnabled}
                    onChange={(e) =>
                      setClub((c) => ({
                        ...c,
                        otherDetails: { ...c.otherDetails, newsReadEnabled: e.target.checked },
                      }))
                    }
                    className="rounded border-gray-400"
                  />
                  Yes
                </label>
                <NewsCategoryMultiSelect
                  disabled={readOnlyClub || !od.newsReadEnabled}
                  value={od.newsReadCategories}
                  onChange={(ids) =>
                    setClub((c) => ({
                      ...c,
                      otherDetails: { ...c.otherDetails, newsReadCategories: ids },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 border border-gray-200 sm:grid-cols-[11rem_1fr]">
            <div className="bg-gray-50 px-3 py-3 text-sm font-bold text-gray-800 sm:flex sm:items-start sm:justify-end">
              Enable the member to post news
            </div>
            <div className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    disabled={readOnlyClub}
                    checked={od.newsPostEnabled}
                    onChange={(e) =>
                      setClub((c) => ({
                        ...c,
                        otherDetails: { ...c.otherDetails, newsPostEnabled: e.target.checked },
                      }))
                    }
                    className="rounded border-gray-400"
                  />
                  Yes
                </label>
                <NewsCategoryMultiSelect
                  disabled={readOnlyClub || !od.newsPostEnabled}
                  value={od.newsPostCategories}
                  onChange={(ids) =>
                    setClub((c) => ({
                      ...c,
                      otherDetails: { ...c.otherDetails, newsPostCategories: ids },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Section Messages">
          <CheckRow
            label="Generic automatic messages — Yes"
            disabled={readOnlyClub}
            checked={od.genericAutoMessages}
            onChange={(v) =>
              setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, genericAutoMessages: v } }))
            }
          />
          <CheckRow
            label="Specific alert messages — Yes"
            disabled={readOnlyClub}
            checked={od.specificAlertMessages}
            onChange={(v) =>
              setClub((c) => ({ ...c, otherDetails: { ...c.otherDetails, specificAlertMessages: v } }))
            }
          />
        </SectionCard>

        <SaveBar canSave={canSaveClubSection} onSave={() => saveClubSection('otherDetails')} />
      </div>
    );
  }

  if (activeTab === 'parents') {
    const pr = club.parents;
    const memberDob = data.owner.personal.dateOfBirth || data.user.birthdate || '';
    const parentsEnabled = isMemberUnderage(memberDob);

    const renderOtherChildrenPicker = (key: 'parent1' | 'parent2') => {
      const p = pr[key];
      return (
        <Field label="Other children at the sports facility">
          <p className="mb-2 text-xs text-gray-500">
            Tag the names of other members; once saved, this parent&apos;s data will be copied
            into the profile of each tagged member.
          </p>
          <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
            {data.clubMembersForPayFor.length === 0 ? (
              <p className="text-sm text-gray-500">No other members in this club.</p>
            ) : (
              data.clubMembersForPayFor.map((m) => (
                <CheckRow
                  key={m.id}
                  label={m.label}
                  disabled={readOnlyClub}
                  checked={p.otherChildrenMemberIds.includes(m.id)}
                  onChange={(v) =>
                    setClub((c) => ({
                      ...c,
                      parents: {
                        ...c.parents,
                        [key]: {
                          ...c.parents[key],
                          otherChildrenMemberIds: v
                            ? [...c.parents[key].otherChildrenMemberIds, m.id]
                            : c.parents[key].otherChildrenMemberIds.filter((id) => id !== m.id),
                        },
                      },
                    }))
                  }
                />
              ))
            )}
          </div>
        </Field>
      );
    };

    const renderParent = (key: 'parent1' | 'parent2', title: string) => {
      const p = pr[key];
      return (
        <SectionCard title={title}>
          <Row2>
            <Field label="Name">
              <TextInput
                disabled={readOnlyClub}
                value={p.name}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], name: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Surname">
              <TextInput
                disabled={readOnlyClub}
                value={p.surname}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], surname: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Fiscal code">
              <TextInput
                disabled={readOnlyClub}
                value={p.fiscalCode}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], fiscalCode: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Degree of kinship">
              <TextSelect
                disabled={readOnlyClub}
                value={p.kinship}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], kinship: e.target.value },
                    },
                  }))
                }
              >
                <option value="">—</option>
                {KINSHIP_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Birth date">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={p.birthDate}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], birthDate: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Location">
              <TextInput
                disabled={readOnlyClub}
                value={p.location}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], location: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Phone contact 1">
              <TextInput
                disabled={readOnlyClub}
                value={p.phone1}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], phone1: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Phone contact 2">
              <TextInput
                disabled={readOnlyClub}
                value={p.phone2}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], phone2: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Main email">
              <TextInput
                disabled={readOnlyClub}
                value={p.mainEmail}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], mainEmail: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Alternative mail">
              <TextInput
                disabled={readOnlyClub}
                value={p.alternativeMail}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], alternativeMail: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Residential address">
              <TextInput
                disabled={readOnlyClub}
                value={p.residentialAddress}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      [key]: { ...c.parents[key], residentialAddress: e.target.value },
                    },
                  }))
                }
              />
            </Field>
          </Row2>
          <CheckRow
            label="Present in the group Whatsapp of the team"
            disabled={readOnlyClub}
            checked={p.whatsappGroup}
            onChange={(v) =>
              setClub((c) => ({
                ...c,
                parents: { ...c.parents, [key]: { ...c.parents[key], whatsappGroup: v } },
              }))
            }
          />
          <CheckRow
            label="Present in the group Telegram of the team"
            disabled={readOnlyClub}
            checked={p.telegramGroup}
            onChange={(v) =>
              setClub((c) => ({
                ...c,
                parents: { ...c.parents, [key]: { ...c.parents[key], telegramGroup: v } },
              }))
            }
          />
          {renderOtherChildrenPicker(key)}
        </SectionCard>
      );
    };

    if (!parentsEnabled) {
      return (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{PARENTS_TAB_LABEL}</p>
          <p className="mt-1">
            This section is available only when the member is underage (under 18). Set the
            member&apos;s date of birth in Owner profile to enable it.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-4 border-b border-gray-200 pb-3">
          <p className="text-sm font-semibold text-gray-900">{PARENTS_TAB_LABEL}</p>
          <p className="mt-1 text-xs text-gray-600">
            * managed only by the admin of the club selected
          </p>
        </div>

        {renderParent('parent1', 'PARENT 1')}
        {renderParent('parent2', 'PARENT 2')}

        <SectionCard title="Administrative data">
          <p className="mb-3 text-sm font-semibold text-gray-800">Invoice address</p>
          <Row2>
            <Field label="Full name">
              <TextInput
                disabled={readOnlyClub}
                value={pr.invoice.fullName}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      invoice: { ...c.parents.invoice, fullName: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Fiscal code">
              <TextInput
                disabled={readOnlyClub}
                value={pr.invoice.fiscalCode}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      invoice: { ...c.parents.invoice, fiscalCode: e.target.value },
                    },
                  }))
                }
              />
            </Field>
            <Field label="Address">
              <TextInput
                disabled={readOnlyClub}
                value={pr.invoice.address}
                onChange={(e) =>
                  setClub((c) => ({
                    ...c,
                    parents: {
                      ...c.parents,
                      invoice: { ...c.parents.invoice, address: e.target.value },
                    },
                  }))
                }
              />
            </Field>
          </Row2>
        </SectionCard>

        <SectionCard title="Data for % deduction">
          <label className="mb-3 inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              disabled={readOnlyClub}
              checked={pr.deduction.enabled}
              onChange={(e) =>
                setClub((c) => ({
                  ...c,
                  parents: {
                    ...c.parents,
                    deduction: { ...c.parents.deduction, enabled: e.target.checked },
                  },
                }))
              }
              className="rounded border-gray-400"
            />
          </label>
          <Field label="Select year">
            <TextInput
              disabled={readOnlyClub || !pr.deduction.enabled}
              value={pr.deduction.year}
              onChange={(e) =>
                setClub((c) => ({
                  ...c,
                  parents: {
                    ...c.parents,
                    deduction: { ...c.parents.deduction, year: e.target.value },
                  },
                }))
              }
            />
          </Field>
        </SectionCard>

        <SectionCard title="Signatures">
          <CheckRow
            label="Acceptance of the rules of the club/team"
            disabled={readOnlyClub}
            checked={pr.acceptanceRules}
            onChange={(v) =>
              setClub((c) => ({ ...c, parents: { ...c.parents, acceptanceRules: v } }))
            }
          />
          <CheckRow
            label="I have readed 'Privacy policy'"
            disabled={readOnlyClub}
            checked={pr.privacyPolicyRead}
            onChange={(v) =>
              setClub((c) => ({ ...c, parents: { ...c.parents, privacyPolicyRead: v } }))
            }
          />
          <Field label="Signature">
            <SignaturePad
              ref={signaturePadRef}
              disabled={readOnlyClub}
              value={pr.signatureDataUrl}
              onChange={(v) =>
                setClub((c) => ({ ...c, parents: { ...c.parents, signatureDataUrl: v } }))
              }
            />
          </Field>
        </SectionCard>

        <SaveBar canSave={!readOnlyClub} onSave={() => saveClubSection('parents')} />
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <MemberProfileSettingsTab
        club={club}
        setClub={setClub}
        readOnlyClub={readOnlyClub}
        showVisibility={data.viewer.isClubAdmin}
        saving={saving}
        message={message}
        onSave={() => void saveSection('club')}
      />
    );
  }

  if (activeTab === 'messages-staff') {
    return (
      <div>
        {data.viewer.isClubAdmin ? (
          <SectionCard title="Member visibility" tone="purple">
            <CheckRow
              label="Allow member to read Messages from the Staff"
              checked={club.visibility.messagesStaff}
              disabled={readOnlyClub}
              onChange={(v) =>
                setClub({
                  ...club,
                  visibility: { ...club.visibility, messagesStaff: v },
                })
              }
            />
            <button
              type="button"
              className="mt-2 text-sm text-red-700 underline"
              disabled={saving}
              onClick={() => void resetNotes('staff')}
            >
              Reset Document and replies
            </button>
          </SectionCard>
        ) : null}

        <SectionCard title="Current message posted by the Club staff" tone="blue">
          <Row2>
            <Field label="Enable From">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={club.staffMessage.enableFrom}
                onChange={(e) =>
                  setClub({
                    ...club,
                    staffMessage: {
                      ...club.staffMessage,
                      enableFrom: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={club.staffMessage.enableTo}
                onChange={(e) =>
                  setClub({
                    ...club,
                    staffMessage: {
                      ...club.staffMessage,
                      enableTo: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </Row2>
          <div className="flex flex-wrap gap-4">
            <CheckRow
              label="Show at Login"
              disabled={readOnlyClub}
              checked={club.staffMessage.showAtLogin}
              onChange={(v) =>
                setClub({
                  ...club,
                  staffMessage: { ...club.staffMessage, showAtLogin: v },
                })
              }
            />
            <CheckRow
              label="Show at Logout"
              disabled={readOnlyClub}
              checked={club.staffMessage.showAtLogout}
              onChange={(v) =>
                setClub({
                  ...club,
                  staffMessage: { ...club.staffMessage, showAtLogout: v },
                })
              }
            />
          </div>
          {data.viewer.isClubAdmin && !readOnlyClub ? (
            <div className="mt-3 rounded border-2 border-red-600 p-2">
              <p className="mb-2 text-xs font-semibold text-red-700">Document editor</p>
              <CKEditor
                value={club.staffMessage.html}
                onChange={(html) =>
                  setClub({
                    ...club,
                    staffMessage: { ...club.staffMessage, html },
                  })
                }
                minHeightPx={220}
              />
              <div className="mt-3 space-y-2">
                <TextInput
                  placeholder="Title"
                  value={noteDraft.title}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, title: e.target.value }))}
                />
                <TextArea
                  rows={3}
                  placeholder="Or post a short staff note…"
                  value={noteDraft.body}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, body: e.target.value }))}
                />
                <button
                  type="button"
                  disabled={saving}
                  className="rounded bg-red-700 px-3 py-1.5 text-sm text-white"
                  onClick={() => void postNote('staff')}
                >
                  Post staff message
                </button>
              </div>
            </div>
          ) : (
            <div
              className="mt-3 prose max-w-none text-sm"
              dangerouslySetInnerHTML={{
                __html: club.staffMessage.html || '<p>No document.</p>',
              }}
            />
          )}
        </SectionCard>

        <SectionCard title="Comments">
          {data.staffNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No comments found.</p>
          ) : (
            <ul className="space-y-3">
              {data.staffNotes.map((n) => (
                <li key={n.id} className="rounded border border-gray-200 p-3 text-sm">
                  <p className="font-semibold">{n.title || 'Staff message'}</p>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {n.authorLabel} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                  {n.replies.map((r) => (
                    <div key={r.id} className="mt-2 ml-4 border-l pl-3 text-gray-700">
                      <p className="whitespace-pre-wrap">{r.body}</p>
                      <p className="text-xs text-gray-500">
                        {r.authorLabel} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {data.viewer.isSelf && data.club.visibility.messagesStaff ? (
                    <div className="mt-2">
                      <TextArea
                        rows={2}
                        placeholder="Your comment…"
                        value={replyDrafts[n.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((d) => ({ ...d, [n.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="mt-1 text-sm text-blue-800 underline"
                        disabled={saving}
                        onClick={() => void postNote('staff', n.id)}
                      >
                        Reply
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SaveBar canSave={!readOnlyClub} onSave={() => void saveSection('club')} />
      </div>
    );
  }

  if (activeTab === 'notes-coach') {
    return (
      <CoachNotesPanel
        data={data}
        club={club}
        setClub={setClub}
        readOnlyClub={readOnlyClub}
        saving={saving}
        message={message}
        setMessage={setMessage}
        onReload={onReload}
        onSaveVisibility={() => void saveSection('club')}
      />
    );
  }

  if (activeTab === 'presences') {
    return (
      <div>
        {data.viewer.isClubAdmin ? (
          <SectionCard title="Member visibility" tone="purple">
            <CheckRow
              label="Allow member to read Graphs of the presences"
              checked={club.visibility.presences}
              disabled={readOnlyClub}
              onChange={(v) =>
                setClub((c) => ({
                  ...c,
                  visibility: { ...c.visibility, presences: v },
                }))
              }
            />
            <SaveBar canSave={!readOnlyClub} onSave={() => void saveSection('club')} />
          </SectionCard>
        ) : null}

        <div className="mb-4 border-b border-gray-200 pb-3">
          <p className="text-sm font-semibold text-gray-900">Graphs of the presences</p>
        </div>
      </div>
    );
  }

  return null;
}

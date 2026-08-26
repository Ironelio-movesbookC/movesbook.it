'use client';

import { useEffect, useState } from 'react';
import {
  CheckRow,
  Field,
  Row2,
  SectionCard,
  TextInput,
  TextSelect,
} from '@/components/club/memberProfile/FormBits';
import type { ClubMemberScopedData } from '@/lib/club/memberProfileTypes';
import {
  ATHLETIC_LEVEL_OPTIONS,
  FOLLOW_UP_NOTIFICATION_OPTIONS,
  MAIN_SPORTS,
  SHARING_DEFAULT_OPTIONS,
} from '@/lib/club/memberProfileTypes';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';

type MemberTypeOption = {
  id: string;
  name: string;
  discountSubscription: string;
  discountServices: string;
  discountRest: string;
  discountSupplement: string;
  discountClothing: string;
  discountOutfit: string;
};

type Props = {
  club: ClubMemberScopedData;
  setClub: (
    next: ClubMemberScopedData | ((prev: ClubMemberScopedData) => ClubMemberScopedData),
  ) => void;
  readOnlyClub: boolean;
  showVisibility: boolean;
  saving: boolean;
  message: string;
  onSave: () => void;
};

export default function MemberProfileSettingsTab({
  club,
  setClub,
  readOnlyClub,
  showVisibility,
  saving,
  message,
  onSave,
}: Props) {
  const s = club.settings;
  const ac = s.accessControl;
  const ss = s.secondaryScreen;
  const [memberTypes, setMemberTypes] = useState<MemberTypeOption[]>([]);
  const [memberTypesLoading, setMemberTypesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadMemberTypes() {
      setMemberTypesLoading(true);
      try {
        const res = await fetch(
          withSelectedClubId('/api/club/settings/tables/member-types?scope=profile'),
          {
            headers: getAuthHeaders(),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const items = Array.isArray(json.items) ? json.items : [];
        setMemberTypes(
          items.map(
            (row: {
              id?: string;
              name?: string;
              discountSubscription?: string;
              discountServices?: string;
              discountRest?: string;
              discountSupplement?: string;
              discountClothing?: string;
              discountOutfit?: string;
            }) => ({
              id: String(row.id || ''),
              name: String(row.name || '').trim(),
              discountSubscription: String(row.discountSubscription || ''),
              discountServices: String(row.discountServices || ''),
              discountRest: String(row.discountRest || ''),
              discountSupplement: String(row.discountSupplement || ''),
              discountClothing: String(row.discountClothing || ''),
              discountOutfit: String(row.discountOutfit || ''),
            }),
          ).filter((row: MemberTypeOption) => row.id && row.name),
        );
      } catch {
        if (!cancelled) setMemberTypes([]);
      } finally {
        if (!cancelled) setMemberTypesLoading(false);
      }
    }
    void loadMemberTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSettings = (
    patch: (prev: ClubMemberScopedData['settings']) => ClubMemberScopedData['settings'],
  ) => {
    setClub((c) => ({ ...c, settings: patch(c.settings) }));
  };

  const sportMode =
    s.sportMode ?? (s.teamFootballEnabled && !s.clubGymEnabled ? 'TEAM-FOOTBALL' : 'CLUB-GYM');
  const isClubGymMode = sportMode !== 'TEAM-FOOTBALL';

  const applyMemberType = (memberTypeId: string) => {
    const selected = memberTypes.find((item) => item.id === memberTypeId);
    patchSettings((prev) => ({
      ...prev,
      memberTypeId,
      discounts: selected
        ? {
            subscript: selected.discountSubscription,
            service: selected.discountServices,
            barRest: selected.discountRest,
            supply: selected.discountSupplement,
            clothing: selected.discountClothing,
            outfit: selected.discountOutfit,
          }
        : prev.discounts,
    }));
  };

  return (
    <div>
      {showVisibility ? (
        <SectionCard title="Member visibility" tone="purple">
          <CheckRow
            label="Allow member to read Settings"
            checked={club.visibility.settings}
            disabled={readOnlyClub}
            onChange={(v) =>
              setClub((c) => ({
                ...c,
                visibility: { ...c.visibility, settings: v },
              }))
            }
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Preferences">
            <p className="mb-3 text-sm font-semibold text-gray-800">Default assigned</p>
            <Field label="Member type">
              <TextSelect
                disabled={readOnlyClub || memberTypesLoading}
                value={s.memberTypeId}
                onChange={(e) => applyMemberType(e.target.value)}
              >
                <option value="">{memberTypesLoading ? 'Loading…' : 'Select'}</option>
                {memberTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                {s.memberTypeId &&
                !memberTypes.some((item) => item.id === s.memberTypeId) ? (
                  <option value={s.memberTypeId}>Saved type #{s.memberTypeId}</option>
                ) : null}
              </TextSelect>
            </Field>
            <p className="mb-2 mt-3 text-sm font-semibold text-gray-800">Discount %</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    {(
                      [
                        ['subscript', 'Subscript'],
                        ['service', 'Service'],
                        ['barRest', 'Bar/Rest'],
                        ['supply', 'Supply'],
                        ['clothing', 'Clothing'],
                        ['outfit', 'Outfit'],
                      ] as const
                    ).map(([, label]) => (
                      <th key={label} className="border border-gray-300 px-2 py-1.5 text-left">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {(
                      [
                        'subscript',
                        'service',
                        'barRest',
                        'supply',
                        'clothing',
                        'outfit',
                      ] as const
                    ).map((key) => (
                      <td key={key} className="border border-gray-300 p-1">
                        <TextInput
                          disabled={readOnlyClub}
                          value={s.discounts[key]}
                          maxLength={2}
                          onChange={(e) =>
                            patchSettings((prev) => ({
                              ...prev,
                              discounts: { ...prev.discounts, [key]: e.target.value },
                            }))
                          }
                          className="bg-[#fffde7]"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Maximum permitted total debt at the time of the purchases">
            <Field label="Debt purchases">
              <TextInput
                disabled={readOnlyClub}
                value={s.debtPurchases}
                onChange={(e) =>
                  patchSettings((prev) => ({ ...prev, debtPurchases: e.target.value }))
                }
              />
            </Field>
          </SectionCard>

          <SectionCard title="Other settings">
            <Row2>
              <Field label="Heart rate">
                <TextInput
                  disabled={readOnlyClub}
                  value={s.heartRate}
                  placeholder="heart rate min"
                  onChange={(e) =>
                    patchSettings((prev) => ({ ...prev, heartRate: e.target.value }))
                  }
                />
              </Field>
              <Field label="Athletic level">
                <TextSelect
                  disabled={readOnlyClub}
                  value={s.athleticLevel}
                  onChange={(e) =>
                    patchSettings((prev) => ({ ...prev, athleticLevel: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {ATHLETIC_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Sharing default">
                <TextSelect
                  disabled={readOnlyClub}
                  value={s.sharingDefault}
                  onChange={(e) =>
                    patchSettings((prev) => ({ ...prev, sharingDefault: e.target.value }))
                  }
                >
                  {SHARING_DEFAULT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Receive follow ups notifications and mails">
                <TextSelect
                  disabled={readOnlyClub}
                  value={s.followUpNotifications}
                  onChange={(e) =>
                    patchSettings((prev) => ({
                      ...prev,
                      followUpNotifications: e.target.value,
                    }))
                  }
                >
                  {FOLLOW_UP_NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            </Row2>
            <CheckRow
              label="Information and updates"
              disabled={readOnlyClub}
              checked={s.informationUpdates}
              onChange={(v) =>
                patchSettings((prev) => ({ ...prev, informationUpdates: v }))
              }
            />
          </SectionCard>

          {isClubGymMode ? (
            <>
          <SectionCard title="Access control about the member">
            <p className="mb-2 text-sm font-semibold text-gray-800">
              Type of control enabled on this member
            </p>
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  disabled={readOnlyClub}
                  checked={ac.activeBlockAccess === 'analyzes_all'}
                  onChange={() =>
                    patchSettings((prev) => ({
                      ...prev,
                      accessControl: {
                        ...prev.accessControl,
                        activeBlockAccess: 'analyzes_all',
                      },
                    }))
                  }
                  className="mt-1"
                />
                <span>
                  <strong>Analyzes all the parameters for the access</strong> (default status)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    disabled={readOnlyClub}
                    checked={ac.activeBlockAccess === 'free_access'}
                    onChange={() =>
                      patchSettings((prev) => ({
                        ...prev,
                        accessControl: {
                          ...prev.accessControl,
                          activeBlockAccess: 'free_access',
                        },
                      }))
                    }
                  />
                  <strong>
                    Authorized to <span className="text-green-700">free access</span> until
                  </strong>
                </label>
                <TextInput
                  type="date"
                  disabled={readOnlyClub || ac.activeBlockAccess !== 'free_access'}
                  value={ac.freeAccessDate}
                  onChange={(e) =>
                    patchSettings((prev) => ({
                      ...prev,
                      accessControl: {
                        ...prev.accessControl,
                        freeAccessDate: e.target.value,
                      },
                    }))
                  }
                  className="max-w-[11rem]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    disabled={readOnlyClub}
                    checked={ac.activeBlockAccess === 'access_from'}
                    onChange={() =>
                      patchSettings((prev) => ({
                        ...prev,
                        accessControl: {
                          ...prev.accessControl,
                          activeBlockAccess: 'access_from',
                        },
                      }))
                    }
                  />
                  <strong className="text-red-700">Active block access from</strong>
                </label>
                <TextInput
                  type="date"
                  disabled={readOnlyClub || ac.activeBlockAccess !== 'access_from'}
                  value={ac.activeBlockAccessFrom}
                  onChange={(e) =>
                    patchSettings((prev) => ({
                      ...prev,
                      accessControl: {
                        ...prev.accessControl,
                        activeBlockAccessFrom: e.target.value,
                      },
                    }))
                  }
                  className="max-w-[11rem]"
                />
                <strong className="text-red-700">to</strong>
                <TextInput
                  type="date"
                  disabled={readOnlyClub || ac.activeBlockAccess !== 'access_from'}
                  value={ac.activeBlockAccessTo}
                  onChange={(e) =>
                    patchSettings((prev) => ({
                      ...prev,
                      accessControl: {
                        ...prev.accessControl,
                        activeBlockAccessTo: e.target.value,
                      },
                    }))
                  }
                  className="max-w-[11rem]"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Maximum permitted total debt at the time of access">
            <Field label="Debt max">
              <TextInput
                disabled={readOnlyClub}
                value={ac.debtMax}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    accessControl: { ...prev.accessControl, debtMax: e.target.value },
                  }))
                }
              />
            </Field>
          </SectionCard>

          <SectionCard title="Personal setting for secondary screen">
            <CheckRow
              label="Personal setting for secondary screen"
              disabled={readOnlyClub}
              checked={ss.enabled}
              onChange={(v) =>
                patchSettings((prev) => ({
                  ...prev,
                  secondaryScreen: { ...prev.secondaryScreen, enabled: v },
                }))
              }
            />
            <p className="mb-2 text-sm text-gray-700">
              Permission to display &amp; playback in the access control
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(
                [
                  ['memberName', "Member's name"],
                  ['expSubscription', 'Expiration of subscription'],
                  ['memberPhoto', "Member's photo"],
                  ['outcomeAccess', 'Outcome of the access'],
                  ['residualDebt', 'Residual debt'],
                  ['audioMessages', "Audio messages by club's staff"],
                  ['birthDay', 'Birth day'],
                  ['otherManagementData', 'Other management data'],
                  ['msgFromOtherMember', 'Messages from other members'],
                ] as const
              ).map(([key, label]) => (
                <CheckRow
                  key={key}
                  label={label}
                  disabled={readOnlyClub || !ss.enabled}
                  checked={ss[key]}
                  onChange={(v) =>
                    patchSettings((prev) => ({
                      ...prev,
                      secondaryScreen: { ...prev.secondaryScreen, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </SectionCard>
            </>
          ) : null}

      <SectionCard title="Sport mode" tone="red">
        <Field label="Settings for">
          <TextSelect
            disabled={readOnlyClub}
            value={sportMode}
            onChange={(e) => {
              const mode = e.target.value as 'CLUB-GYM' | 'TEAM-FOOTBALL';
              patchSettings((prev) => ({
                ...prev,
                sportMode: mode,
                clubGymEnabled: mode === 'CLUB-GYM' ? true : prev.clubGymEnabled,
                teamFootballEnabled: mode === 'TEAM-FOOTBALL' ? true : prev.teamFootballEnabled,
              }));
            }}
          >
            <option value="CLUB-GYM">CLUB-GYM</option>
            <option value="TEAM-FOOTBALL">TEAM-FOOTBALL</option>
          </TextSelect>
        </Field>
        <CheckRow
          label="The settings if the member is member of a CLUB-GYM"
          disabled={readOnlyClub}
          checked={s.clubGymEnabled}
          onChange={(v) =>
            patchSettings((prev) => ({
              ...prev,
              clubGymEnabled: v,
              sportMode:
                v ? 'CLUB-GYM' : prev.teamFootballEnabled ? 'TEAM-FOOTBALL' : prev.sportMode,
            }))
          }
        />
        <CheckRow
          label="The settings if the member is member of a TEAM-FOOTBALL"
          disabled={readOnlyClub}
          checked={s.teamFootballEnabled}
          onChange={(v) =>
            patchSettings((prev) => ({
              ...prev,
              teamFootballEnabled: v,
              sportMode: v ? 'TEAM-FOOTBALL' : prev.clubGymEnabled ? 'CLUB-GYM' : prev.sportMode,
            }))
          }
        />
      </SectionCard>

      {sportMode === 'TEAM-FOOTBALL' ? (
        <SectionCard title="TEAM-FOOTBALL fields">
          <Row2>
            <Field label="Annual membership fee">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.annualMembershipFee}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, annualMembershipFee: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="First payment date">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={s.football.firstPaymentDate}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, firstPaymentDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Second payment date">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={s.football.secondPaymentDate}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, secondPaymentDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Third payment date">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={s.football.thirdPaymentDate}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, thirdPaymentDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Payment method">
              <TextSelect
                disabled={readOnlyClub}
                value={s.football.paymentMethod}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, paymentMethod: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                {['Cash', 'Bank transfer', 'POS', 'SEPA'].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Payment status">
              <TextSelect
                disabled={readOnlyClub}
                value={s.football.paymentStatus}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, paymentStatus: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                {['Paid', 'Pending', 'Not paid'].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Athlete status">
              <TextSelect
                disabled={readOnlyClub}
                value={s.football.athleteStatus}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, athleteStatus: e.target.value },
                  }))
                }
              >
                {['Active', 'Inactive', 'Injured', 'Suspended'].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Team names">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.teamNames}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, teamNames: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Previous club">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.previousClub}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, previousClub: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Release date">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={s.football.releaseDate}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, releaseDate: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Player registration">
              <TextSelect
                disabled={readOnlyClub}
                value={s.football.playerRegistration}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, playerRegistration: e.target.value },
                  }))
                }
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </TextSelect>
            </Field>
            <Field label="Category">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.category}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, category: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Sports season">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.sportsSeason}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, sportsSeason: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Position">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.position}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, position: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Foot/Hand">
              <TextSelect
                disabled={readOnlyClub}
                value={s.football.footHand}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, footHand: e.target.value },
                  }))
                }
              >
                <option value="">—</option>
                {['Right', 'Left', 'Ambidextrous'].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Jersey number">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.jerseyNumber}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, jerseyNumber: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Coach">
              <TextInput
                disabled={readOnlyClub}
                value={s.football.coach}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, coach: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Start date with this team">
              <TextInput
                type="date"
                disabled={readOnlyClub}
                value={s.football.startDateWithTeam}
                onChange={(e) =>
                  patchSettings((prev) => ({
                    ...prev,
                    football: { ...prev.football, startDateWithTeam: e.target.value },
                  }))
                }
              />
            </Field>
          </Row2>
          <div className="mt-3 flex flex-wrap gap-4">
            <CheckRow
              label="Receipt issued"
              disabled={readOnlyClub}
              checked={s.football.receiptIssued}
              onChange={(v) =>
                patchSettings((prev) => ({
                  ...prev,
                  football: { ...prev.football, receiptIssued: v },
                }))
              }
            />
            <CheckRow
              label="Image release"
              disabled={readOnlyClub}
              checked={s.football.imageRelease}
              onChange={(v) =>
                patchSettings((prev) => ({
                  ...prev,
                  football: { ...prev.football, imageRelease: v },
                }))
              }
            />
            <CheckRow
              label="Travel authorization"
              disabled={readOnlyClub}
              checked={s.football.travelAuthorization}
              onChange={(v) =>
                patchSettings((prev) => ({
                  ...prev,
                  football: { ...prev.football, travelAuthorization: v },
                }))
              }
            />
          </div>
          <Field label="Sports played">
            <div className="flex flex-wrap gap-3">
              {MAIN_SPORTS.map((sp) => (
                <CheckRow
                  key={sp}
                  label={sp}
                  disabled={readOnlyClub}
                  checked={s.football.sportsPlayed.includes(sp)}
                  onChange={(v) =>
                    patchSettings((prev) => ({
                      ...prev,
                      football: {
                        ...prev.football,
                        sportsPlayed: v
                          ? [...prev.football.sportsPlayed, sp]
                          : prev.football.sportsPlayed.filter((x) => x !== sp),
                      },
                    }))
                  }
                />
              ))}
            </div>
          </Field>
        </SectionCard>
      ) : (
        <SectionCard title="CLUB-GYM">
          <p className="text-sm text-gray-600">
            Gym club preferences are stored in the sections above. Football-specific fields
            appear when sport mode is TEAM-FOOTBALL.
          </p>
        </SectionCard>
      )}

      {!readOnlyClub ? (
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
      )}
    </div>
  );
}

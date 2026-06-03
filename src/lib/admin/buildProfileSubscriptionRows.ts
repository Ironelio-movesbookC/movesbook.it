import {
  periodDisplayStatus,
  readNetworkSubscriptionHistory,
  type NetworkSubscriptionPeriod,
} from '@/lib/admin/networkSubscriptionHistory';

export type ProfileSubscriptionRow = {
  id: string;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  username: string;
  companyName: string;
  e: string;
  status: string;
};

function periodToProfileRow(
  period: NetworkSubscriptionPeriod,
  defaults: { username: string; companyName: string; e: string },
): ProfileSubscriptionRow {
  return {
    id: period.id,
    dateStart: period.dateStart,
    dateEnd: period.dateEnd,
    version: period.version?.trim() || '—',
    username: period.username?.trim() || defaults.username,
    companyName: period.companyName?.trim() || defaults.companyName,
    e: defaults.e,
    status: period.status ?? periodDisplayStatus(period.dateEnd),
  };
}

/** Historical + current Movesbook network memberships for the profile table. */
export function buildProfileSubscriptionRows(
  adminSettingsRaw: string | null | undefined,
  current: {
    id: string;
    dateStart: string;
    dateEnd: string | null;
    version: string;
    username: string;
    companyName: string;
    e: string;
    entityId?: string | null;
  },
): ProfileSubscriptionRow[] {
  const entityId = current.entityId ?? null;
  const history = readNetworkSubscriptionHistory(adminSettingsRaw).filter((p) => {
    const pEntity = p.entityId ?? null;
    return entityId ? pEntity === entityId : !pEntity;
  });

  const currentPeriod: NetworkSubscriptionPeriod = {
    id: current.id,
    dateStart: current.dateStart,
    dateEnd: current.dateEnd,
    version: current.version,
    username: current.username,
    companyName: current.companyName,
    entityId,
    status: periodDisplayStatus(current.dateEnd),
  };

  const sameAsCurrent = (p: NetworkSubscriptionPeriod) =>
    p.dateStart === currentPeriod.dateStart &&
    (p.dateEnd ?? '') === (currentPeriod.dateEnd ?? '');

  const merged = [...history.filter((p) => !sameAsCurrent(p)), currentPeriod].sort(
    (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime(),
  );

  const defaults = {
    username: current.username,
    companyName: current.companyName,
    e: current.e,
  };

  return merged.map((p) => periodToProfileRow(p, defaults));
}

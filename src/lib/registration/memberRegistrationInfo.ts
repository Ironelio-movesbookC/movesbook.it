import { getSubscriptionById } from '@/lib/admin/subscriptionSettingsMock';
import type { SubscriptionUserType } from '@/types/adminSubscriptionSettings';
import {
  buildSelectedEntity,
  getDefaultVersionId,
  getVersionColumnsForUserType,
  type RegistrationSelectedEntity,
  type RegistrationUserType,
  type RegistrationVersionColumn,
} from './waysToGetStarted';

export type MemberRegistrationInfoPayload = {
  subscriptionSettingId: number;
  registrationUserType: RegistrationUserType;
  entity: RegistrationSelectedEntity;
  versionColumn: RegistrationVersionColumn;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  versionCode: string | null;
};

export function prismaUserTypeToRegistrationUserType(userType: string): RegistrationUserType | null {
  switch ((userType ?? '').toUpperCase()) {
    case 'ATHLETE':
    case 'ADMIN':
      return 'athlete';
    case 'COACH':
      return 'coach';
    case 'TEAM':
    case 'TEAM_MANAGER':
      return 'team';
    case 'CLUB':
    case 'CLUB_TRAINER':
      return 'club';
    case 'GROUP':
    case 'GROUP_ADMIN':
      return 'group';
    default:
      return null;
  }
}

export function subscriptionUserTypeToRegistrationUserType(
  userType: SubscriptionUserType,
): RegistrationUserType {
  return userType;
}

export function resolvePurchasedVersion(
  subscriptionSettingId: number,
  preferredUserType: RegistrationUserType,
): {
  entity: RegistrationSelectedEntity;
  versionColumn: RegistrationVersionColumn;
  registrationUserType: RegistrationUserType;
} | null {
  const subscriptionRow = getSubscriptionById(subscriptionSettingId);
  const registrationUserType = subscriptionRow
    ? subscriptionUserTypeToRegistrationUserType(subscriptionRow.userType)
    : preferredUserType;

  const columns = getVersionColumnsForUserType(registrationUserType);
  let columnIndex = columns.findIndex((column) => column.subscriptionId === subscriptionSettingId);

  if (columnIndex < 0 && registrationUserType !== preferredUserType) {
    const preferredColumns = getVersionColumnsForUserType(preferredUserType);
    columnIndex = preferredColumns.findIndex(
      (column) => column.subscriptionId === subscriptionSettingId,
    );
    if (columnIndex >= 0) {
      const column = preferredColumns[columnIndex];
      return {
        entity: buildSelectedEntity(preferredUserType, column.key, columnIndex),
        versionColumn: column,
        registrationUserType: preferredUserType,
      };
    }
  }

  if (columnIndex < 0) return null;

  const column = columns[columnIndex];
  return {
    entity: buildSelectedEntity(registrationUserType, column.key, columnIndex),
    versionColumn: column,
    registrationUserType,
  };
}

export function resolveMemberRegistrationInfo(params: {
  subscriptionSettingId: number | null;
  registrationUserType: RegistrationUserType;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
}): MemberRegistrationInfoPayload | null {
  const subscriptionSettingId =
    params.subscriptionSettingId ?? getDefaultVersionId(params.registrationUserType);

  if (!subscriptionSettingId) return null;

  const resolved = resolvePurchasedVersion(subscriptionSettingId, params.registrationUserType);
  if (!resolved) return null;

  const subscriptionRow = getSubscriptionById(subscriptionSettingId);

  return {
    subscriptionSettingId,
    registrationUserType: resolved.registrationUserType,
    entity: resolved.entity,
    versionColumn: resolved.versionColumn,
    subscriptionStartDate: params.subscriptionStartDate ?? null,
    subscriptionEndDate: params.subscriptionEndDate ?? null,
    versionCode: subscriptionRow?.code ?? null,
  };
}

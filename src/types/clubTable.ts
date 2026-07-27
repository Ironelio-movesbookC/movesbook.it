import React from "react";

export type Member = {
  id?: string;
  /** Member/user id for same-member multi-deadline pay validation */
  userId?: string;

  // selection
  checked?: boolean;
  /** Club member user id (for same-member multi-pay validation). */
  memberId?: string;

  // member list
  surname?: string;
  name?: string;
  gender?: string;
  dateOfBirth?: Date | string;
  memberType?: string;
  Localcity?: string;
  phone?: string;
  insertDate?: Date | string;
  membershipEndDate?: Date | string;

  // membership
  image?: string;
  typology?: string;
  course?: string;
  dateStart?: Date | string;
  dateEnd?: Date | string;
  membershipEnd?: Date | string;
  installments?: number;
  value?: number;
  status?: string;
  paid?: number;

  // subscription
  localCity?: string;
  installment?: number;
  contract?: string;
  vendor?: string;
  area?: string

  // deadline
  debt?: number;
  rest?: number;
  payed?: number;
  description?: string;
  operator?: string;
  /** Parent procedure record id (cash movement drill-down). */
  procedureRecordId?: string;
  procedureType?: string;

  // credit
  cost?: number;
  residual?: number;

  // movement
  payMod?: string;
  casual?: string;
  originalDebt?: number;
  residualDebt?: number;
  number?: number;
  category?: string;

  service?: string;
  options?: React.ReactNode;
  edit?: React.ReactNode;
  delete?: React.ReactNode;

  // extended archive fields (legacy tables)
  outcome?: string;
  hour?: string;
  direction?: string;
  source?: string;
};

export type Column = {
  key: keyof Member;
  header: string | React.ReactNode;
  render?: (value: any, row: Member) => React.ReactNode; // ✅ FIXED
};
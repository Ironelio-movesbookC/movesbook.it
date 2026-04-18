import React from "react";

export type Member = {
  id?: string;

  // selection
  checked?: boolean;

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

  // credit
  cost?: number;
  residual?: number;

  // movement
  payMod?: string;
  casual?: string;
  number?: number;
  category?: string;

  service?: string;
  options?: React.ReactNode;
};

export type Column = {
  key: keyof Member;
  header: string | React.ReactNode;
  render?: (value: any, row: Member) => React.ReactNode; // ✅ FIXED
};
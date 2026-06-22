import type { ZodError } from 'zod';
import { PROCEDURE_TYPE_CODES, type AddProcedurePaymentInput, type CreateProcedureRecordInput, type ProcedureTypeCode } from '../types';
import { addProcedurePaymentSchema } from './common';
import {
  createServiceSaleRecordSchema,
  mapServiceSaleCreateToInput,
} from './serviceSale';

const KNOWN_PROCEDURE_TYPES = new Set<string>(Object.values(PROCEDURE_TYPE_CODES));

export function isKnownProcedureType(type: string): type is ProcedureTypeCode {
  return KNOWN_PROCEDURE_TYPES.has(type);
}

type FlattenedValidationError = ReturnType<ZodError['flatten']>;

type ParseSuccess<T> = { ok: true; data: T };
type ParseFailure = { ok: false; status: 400; error: string; details?: FlattenedValidationError };

export type ParseCreateRecordResult = ParseSuccess<CreateProcedureRecordInput> | ParseFailure;
export type ParseAddPaymentResult = ParseSuccess<AddProcedurePaymentInput> | ParseFailure;

export function parseCreateRecord(type: string, body: unknown): ParseCreateRecordResult {
  if (!isKnownProcedureType(type)) {
    return { ok: false, status: 400, error: `Unknown procedure type: ${type}` };
  }

  switch (type) {
    case PROCEDURE_TYPE_CODES.SERVICE_SALE: {
      const parsed = createServiceSaleRecordSchema.safeParse(body);
      if (!parsed.success) {
        return {
          ok: false,
          status: 400,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        };
      }
      return { ok: true, data: mapServiceSaleCreateToInput(parsed.data) };
    }
    default: {
      const _exhaustive: never = type;
      return { ok: false, status: 400, error: `No create validator for procedure type: ${_exhaustive}` };
    }
  }
}

function normalizePaymentBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  return {
    ...record,
    amount: record.amount ?? record.amountPaid,
  };
}

export function parseAddPayment(type: string, body: unknown): ParseAddPaymentResult {
  if (!isKnownProcedureType(type)) {
    return { ok: false, status: 400, error: `Unknown procedure type: ${type}` };
  }

  const parsed = addProcedurePaymentSchema.safeParse(normalizePaymentBody(body));
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: 'Validation failed',
      details: parsed.error.flatten(),
    };
  }

  return { ok: true, data: parsed.data };
}

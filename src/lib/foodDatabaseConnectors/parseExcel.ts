import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

export function resolvePublicDataPath(relativePath: string): string {
  return join(process.cwd(), relativePath);
}

export function assertLocalDataFile(relativePath: string): string {
  const absolute = resolvePublicDataPath(relativePath);
  if (!existsSync(absolute)) {
    throw new Error(`Local nutrition file not found: ${relativePath}`);
  }
  return absolute;
}

export function readWorkbook(relativePath: string): XLSX.WorkBook {
  const absolute = assertLocalDataFile(relativePath);
  const buffer = readFileSync(absolute);
  return XLSX.read(buffer, { type: 'buffer', cellDates: false });
}

export function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`);
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
}

/** Parse Swiss/Italian spreadsheet numbers ("<0.6", commas, trace values). */
export function excelNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'traccia') return 0;
  const normalized = raw.replace(',', '.');
  if (normalized.startsWith('<')) {
    const n = Number.parseFloat(normalized.slice(1));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function cellString(row: unknown[], index: number): string {
  const value = row[index];
  return value == null ? '' : String(value).trim();
}

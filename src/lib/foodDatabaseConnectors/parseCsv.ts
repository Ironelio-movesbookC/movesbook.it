/** Minimal RFC-style CSV line parser (handles quoted fields). */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

export function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.filter((l) => l.trim().length > 0).map(parseCsvLine);
}

export function indexCsvHeader(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((name, idx) => {
    map.set(name.trim(), idx);
  });
  return map;
}

export function csvNumber(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

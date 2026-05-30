import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { WorkEntry, WorkType } from './types';

const COLUMN_MAP: Record<keyof Omit<WorkEntry, 'id' | 'vrstaDela' | 'steviloUrOriginal'>, string[]> = {
  stranka: ['stranka', 'client', 'customer'],
  delo: ['delo', 'work', 'task'],
  datum: ['datum', 'date'],
  kontakt: ['kontakt', 'contact'],
  steviloUr: ['število ur', 'ure', 'ur', 'hours'],
  opis: ['opis', 'description'],
  opravil: ['opravil', 'done by', 'worker'],
};

function findColumn(headers: string[], keys: string[]): number {
  for (const key of keys) {
    const idx = headers.findIndex(h => h?.toLowerCase().includes(key.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseVrstaDela(value: unknown): WorkType {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'dt' || v === 'd tehnik') return 'Dt';
  if (v === 'di' || v === 'd inženir' || v === 'd inzenir') return 'Di';
  if (v === 'v' || v === 'vzdrževanje' || v === 'vzdrzevanje') return 'V';
  return null;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const str = String(value ?? '').replace(',', '.');
  return parseFloat(str) || 0;
}

function parseDate(value: unknown): Date {
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  if (typeof value === 'string') {
    // Try DD.MM.YYYY
    const parts = value.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(value);
  }
  return new Date();
}

export function parseExcel(buffer: ArrayBuffer): WorkEntry[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => String(h ?? ''));

  const colStranka = findColumn(headers, COLUMN_MAP.stranka);
  const colDelo = findColumn(headers, COLUMN_MAP.delo);
  const colDatum = findColumn(headers, COLUMN_MAP.datum);
  const colKontakt = findColumn(headers, COLUMN_MAP.kontakt);
  const colVrsta = findColumn(headers, ['vrsta']);
  const colUre = findColumn(headers, COLUMN_MAP.steviloUr);
  const colOpis = findColumn(headers, COLUMN_MAP.opis);
  const colOpravil = findColumn(headers, COLUMN_MAP.opravil);

  const entries: WorkEntry[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every(c => !c)) continue;

    const deloVal = String(row[colDelo] ?? '').trim();
    if (!deloVal || deloVal.toLowerCase().includes('skupaj za obračun')) continue;

    const steviloUr = parseNumber(colUre >= 0 ? row[colUre] : 0);

    entries.push({
      id: uuidv4(),
      stranka: colStranka >= 0 ? String(row[colStranka] ?? '') : '',
      delo: deloVal,
      datum: parseDate(colDatum >= 0 ? row[colDatum] : null),
      kontakt: colKontakt >= 0 ? String(row[colKontakt] ?? '') : '',
      vrstaDela: parseVrstaDela(colVrsta >= 0 ? row[colVrsta] : null),
      steviloUr,
      steviloUrOriginal: steviloUr,
      opis: colOpis >= 0 ? String(row[colOpis] ?? '') : '',
      opravil: colOpravil >= 0 ? String(row[colOpravil] ?? '') : '',
    });
  }

  return entries;
}

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { WorkEntry, WorkType } from './types';

function parseVrstaDela(value: unknown): WorkType {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'dt' || v === 'd tehnik') return 'Dt';
  if (v === 'di' || v === 'd inženir' || v === 'd inzenir') return 'Di';
  if (v === 'dp' || v === 'd po ponudbi' || v === 'po ponudbi') return 'Dp';
  if (v === 'v' || v === 'vzdrževanje' || v === 'vzdrzevanje') return 'V';
  if (v === 'd' || v === 'dodatno delo') return 'D';
  return null;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    return XLSX.SSF.parse_date_code(value) ? new Date((value - 25569) * 86400 * 1000) : new Date();
  }
  if (typeof value === 'string') {
    const parts = value.split('.');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    }
    return new Date(value);
  }
  return new Date();
}

function findCol(headers: string[], keywords: string[]): number {
  return headers.findIndex(h =>
    keywords.some(kw => h.toLowerCase().includes(kw))
  );
}

export function parseExcel(file: File): Promise<WorkEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) { resolve([]); return; }

        const headers = (rows[0] as unknown[]).map(h => String(h ?? ''));
        const iStranka = findCol(headers, ['stranka', 'client']);
        const iDelo = findCol(headers, ['delo', 'work']);
        const iDatum = findCol(headers, ['datum', 'date']);
        const iKontakt = findCol(headers, ['kontakt', 'contact']);
        const iVrsta = findCol(headers, ['vrsta', 'type']);
        const iUr = findCol(headers, ['število ur', 'ur', 'hours', 'število']);
        const iOpis = findCol(headers, ['opis', 'description']);
        const iOpravil = findCol(headers, ['opravil', 'done by']);
        const iSkupina = findCol(headers, ['skupina', 'group', 'univerza']);

        const entries: WorkEntry[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          const stranka = String(row[iStranka] ?? '').trim();
          if (!stranka) continue;

          const ur = parseFloat(String(row[iUr] ?? '0').replace(',', '.')) || 0;
          entries.push({
            id: uuidv4(),
            stranka,
            skupina: iSkupina >= 0 ? String(row[iSkupina] ?? '').trim() : '',
            delo: String(row[iDelo] ?? '').trim(),
            datum: parseDate(row[iDatum]),
            kontakt: String(row[iKontakt] ?? '').trim(),
            vrstaDela: parseVrstaDela(row[iVrsta]),
            steviloUr: ur,
            steviloUrOriginal: ur,
            opis: String(row[iOpis] ?? '').trim(),
            opravil: String(row[iOpravil] ?? '').trim(),
            jeVkljucena: false,
            jePodPragom: false,
          });
        }
        resolve(entries);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function getUniqueStranke(entries: WorkEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of entries) {
    const key = e.skupina || e.stranka;
    if (!seen.has(key)) { seen.add(key); result.push(key); }
  }
  return result;
}

export function getStrankeStats(entries: WorkEntry[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = e.skupina || e.stranka;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

import * as XLSX from 'xlsx';
import { ClientConfig } from './types';
import { CLIENTS } from '../data/clients';
import { DEFAULT_CENA_DT, DEFAULT_CENA_DI } from '../config/constants';

export interface RegisterEntry {
  kratica: string;
  naziv: string;
  naslov: string;
  posta: string;
  kraj: string;
  idDDV: string;
  univerza: 'UL' | 'UP' | '';
  mesecniPausal: number;
  cenaDt: number;
  cenaDi: number;
  gostovanj: number;
  jeAktivna: boolean;
}

const register = new Map<string, RegisterEntry>();

function parsePosta(value: string): { posta: string; kraj: string } {
  if (!value) return { posta: '', kraj: '' };
  const trimmed = value.replace(/^SI-/, '').trim();
  const match = trimmed.match(/^(\d{4})\s*(.+)?$/);
  if (match) {
    return { posta: match[1], kraj: (match[2] || '').trim() };
  }
  return { posta: '', kraj: trimmed };
}

export async function loadClientRegister(basePath = '/talpas'): Promise<void> {
  try {
    const res = await fetch(`${basePath}/assets/Stranke.xlsx`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    register.clear();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const kratica = String(row[0] ?? '').trim();
      if (!kratica) continue;

      const { posta, kraj } = parsePosta(String(row[3] ?? '').trim());
      const mesecniPausal = parseFloat(String(row[6] ?? '')) || 0;
      const cenaDt = parseFloat(String(row[7] ?? '')) || DEFAULT_CENA_DT;
      const cenaDi = parseFloat(String(row[8] ?? '')) || DEFAULT_CENA_DI;
      const gostovanj = parseFloat(String(row[9] ?? '')) || 0;
      const univerzaRaw = String(row[5] ?? '').trim().toUpperCase();
      const univerza: 'UL' | 'UP' | '' =
        univerzaRaw === 'UL' ? 'UL' : univerzaRaw === 'UP' ? 'UP' : '';

      const entry: RegisterEntry = {
        kratica,
        naziv: String(row[1] ?? '').trim(),
        naslov: String(row[2] ?? '').trim(),
        posta,
        kraj,
        idDDV: String(row[4] ?? '').trim(),
        univerza,
        mesecniPausal,
        cenaDt,
        cenaDi,
        gostovanj,
        jeAktivna: mesecniPausal > 0 || cenaDt > 0 || cenaDi > 0,
      };
      register.set(kratica.toLowerCase(), entry);
    }
  } catch (e) {
    console.warn('Register strank ni bil naložen:', e);
  }
}

function findInRegister(name: string): RegisterEntry | undefined {
  const lower = name.toLowerCase().trim();
  if (register.has(lower)) return register.get(lower);
  for (const [key, entry] of register.entries()) {
    if (lower.includes(key) || key.includes(lower)) return entry;
  }
  return undefined;
}

export function isInRegister(strankaName: string): boolean {
  return findInRegister(strankaName) !== undefined;
}

export function getUniverzaForStranka(name: string): 'UL' | 'UP' | '' {
  return findInRegister(name)?.univerza ?? '';
}

export function isUniStranka(name: string, uniType: 'UP' | 'UL'): boolean {
  return findInRegister(name)?.univerza === uniType;
}

export function findClientWithRegister(strankaName: string): ClientConfig | undefined {
  const regEntry = findInRegister(strankaName);
  const lower = strankaName.toLowerCase().trim();
  const hardcoded = CLIENTS.find(c =>
    c.imeZaIskanje.some(ime => lower.includes(ime) || ime.includes(lower))
  );

  if (!regEntry && !hardcoded) return undefined;
  if (!regEntry) return hardcoded;

  const base: ClientConfig = hardcoded ?? {
    id: regEntry.kratica.toLowerCase().replace(/\s+/g, '-'),
    imeZaIskanje: [regEntry.kratica.toLowerCase()],
    imeNaRacunu: regEntry.naziv,
    naslov: regEntry.naslov,
    posta: regEntry.posta,
    kraj: regEntry.kraj,
    idDDV: regEntry.idDDV,
    cenaDt: regEntry.cenaDt,
    cenaDi: regEntry.cenaDi,
    znesekVzdrzevanja: regEntry.mesecniPausal,
    opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
    billingType: 'standard',
  };

  return {
    ...base,
    imeNaRacunu: regEntry.naziv || base.imeNaRacunu,
    naslov: regEntry.naslov || base.naslov,
    posta: regEntry.posta || base.posta,
    kraj: regEntry.kraj || base.kraj,
    idDDV: regEntry.idDDV || base.idDDV,
    cenaDt: regEntry.cenaDt,
    cenaDi: regEntry.cenaDi,
    znesekVzdrzevanja: regEntry.mesecniPausal > 0 ? regEntry.mesecniPausal : base.znesekVzdrzevanja,
    gostovanj: regEntry.gostovanj,
  };
}

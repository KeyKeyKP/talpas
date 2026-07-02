import { WorkEntry, ClientConfig, InvoiceCalc, UniversityCalc } from './types';
import { DDV_STOPNJA } from '../config/constants';
import { canonUlKey } from './ulSpecifika';

export function izracunaj(
  entries: WorkEntry[],
  client: ClientConfig,
  znesekVzdrzevanja: number,
  znesekGostovanja = 0
): InvoiceCalc {
  const obracunljiviDt = entries.filter(e => e.vrstaDela === 'Dt' && !e.jeVkljucena && !e.jePodPragom);
  const obracunljiviDi = entries.filter(e => e.vrstaDela === 'Di' && !e.jeVkljucena && !e.jePodPragom);
  const obracunljiviDp = entries.filter(e => e.vrstaDela === 'Dp' && !e.jeVkljucena && !e.jePodPragom);

  const urDt = obracunljiviDt.reduce((s, e) => s + e.steviloUr, 0);
  const urDi = obracunljiviDi.reduce((s, e) => s + e.steviloUr, 0);

  const vrednostDt = urDt * client.cenaDt;
  const vrednostDi = urDi * client.cenaDi;
  const vrednostDp = obracunljiviDp.reduce((s, e) => s + (e.dpZnesek ?? 0), 0);

  const skupajBrezDDV = znesekVzdrzevanja + znesekGostovanja + vrednostDt + vrednostDi + vrednostDp;
  const ddv = skupajBrezDDV * DDV_STOPNJA;

  return {
    urDt,
    urDi,
    vrednostDt,
    vrednostDi,
    vrednostDp,
    znesekVzdrzevanja,
    znesekGostovanja,
    skupajBrezDDV,
    ddv,
    skupajZDDV: skupajBrezDDV + ddv,
    ddvVzdrzevanje: znesekVzdrzevanja * DDV_STOPNJA,
    ddvGostovanje: znesekGostovanja * DDV_STOPNJA,
    ddvDt: vrednostDt * DDV_STOPNJA,
    ddvDi: vrednostDi * DDV_STOPNJA,
    ddvDp: vrednostDp * DDV_STOPNJA,
  };
}

export function formatEur(value: number): string {
  return value.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

export function formatNum(value: number, decimals = 2): string {
  return value.toLocaleString('sl-SI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function izracunajUniverza(
  entries: WorkEntry[],
  cenaD: number,
  znesekVzdrzevanja: number
): UniversityCalc {
  const fakulteteMap = new Map<string, { urD: number; dpZnesek: number }>();

  for (const e of entries) {
    if (!fakulteteMap.has(e.stranka)) {
      fakulteteMap.set(e.stranka, { urD: 0, dpZnesek: 0 });
    }
    const f = fakulteteMap.get(e.stranka)!;
    if (e.vrstaDela === 'D') f.urD += e.steviloUr;
    if (e.vrstaDela === 'Dp') f.dpZnesek += e.dpZnesek ?? 0;
    // V entries: faculty still tracked (urD=0)
  }

  const poFakultetah = Array.from(fakulteteMap.entries())
    .map(([fakulteta, data]) => ({ fakulteta, ...data }));

  const urD = poFakultetah.reduce((s, f) => s + f.urD, 0);
  const vrednostD = urD * cenaD;
  const vrednostDp = poFakultetah.reduce((s, f) => s + f.dpZnesek, 0);

  const skupajBrezDDV = znesekVzdrzevanja + vrednostD + vrednostDp;
  const ddv = skupajBrezDDV * DDV_STOPNJA;

  return {
    urD, vrednostD, vrednostDp,
    znesekVzdrzevanja,
    skupajBrezDDV, ddv, skupajZDDV: skupajBrezDDV + ddv,
    poFakultetah,
  };
}

export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

// ── UL specifika: per-fakulteta obračun (SAMO UL) ─────────────────────────────
export interface UlFakultetaCalc {
  kratica: string;
  vzdrzevanje: number | null;          // mesečni znesek (null = brez zneska, samo postavka)
  urD: number;                         // D ure iz delovnih podatkov
  vrednostD: number;                   // urD × cena ure
  dp: Array<{ opis: string; znesek: number }>;
  dpZnesek: number;                    // seštevek Dp zneskov
}
export interface UlCalc {
  fakultete: UlFakultetaCalc[];
  vzdrzevanjeTotal: number;
  deloTotal: number;
  dpTotal: number;
  skupajBrezDDV: number;
  ddv: number;
  skupajZDDV: number;
}

// Delovni Excel ima v 'stranka' kratico (AG, BF, …) ali alias (npr. "UL" = Rektorat).
// canonUlKey normalizira in razreši aliase, da se ujema z UL_specifika kratico.

export function izracunajUL(
  entries: WorkEntry[],
  ulFakultete: Array<{ kratica: string; znesek: number | null }>,
  cenaUre: number
): UlCalc {
  const fakultete: UlFakultetaCalc[] = ulFakultete.map(f => {
    const rows = entries.filter(e => canonUlKey(e.stranka) === canonUlKey(f.kratica));
    const urD = rows.filter(e => e.vrstaDela === 'D').reduce((s, e) => s + e.steviloUr, 0);
    const dp = rows
      .filter(e => e.vrstaDela === 'Dp')
      .map(e => ({ opis: e.opis ?? '', znesek: e.dpZnesek ?? 0 }));
    const dpZnesek = dp.reduce((s, d) => s + d.znesek, 0);
    return { kratica: f.kratica, vzdrzevanje: f.znesek, urD, vrednostD: urD * cenaUre, dp, dpZnesek };
  });

  const vzdrzevanjeTotal = fakultete.reduce((s, f) => s + (f.vzdrzevanje ?? 0), 0);
  const deloTotal = fakultete.reduce((s, f) => s + f.vrednostD, 0);
  const dpTotal = fakultete.reduce((s, f) => s + f.dpZnesek, 0);
  const skupajBrezDDV = vzdrzevanjeTotal + deloTotal + dpTotal;
  const ddv = skupajBrezDDV * DDV_STOPNJA;

  return { fakultete, vzdrzevanjeTotal, deloTotal, dpTotal, skupajBrezDDV, ddv, skupajZDDV: skupajBrezDDV + ddv };
}

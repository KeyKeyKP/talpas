import { WorkEntry, ClientConfig, InvoiceCalc, UniversityCalc } from './types';
import { DDV_STOPNJA } from '../config/constants';

export function izracunaj(
  entries: WorkEntry[],
  client: ClientConfig,
  znesekVzdrzevanja: number
): InvoiceCalc {
  const obracunljiviDt = entries.filter(e => e.vrstaDela === 'Dt' && !e.jeVkljucena && !e.jePodPragom);
  const obracunljiviDi = entries.filter(e => e.vrstaDela === 'Di' && !e.jeVkljucena && !e.jePodPragom);
  const obracunljiviDp = entries.filter(e => e.vrstaDela === 'Dp' && !e.jeVkljucena && !e.jePodPragom);

  const urDt = obracunljiviDt.reduce((s, e) => s + e.steviloUr, 0);
  const urDi = obracunljiviDi.reduce((s, e) => s + e.steviloUr, 0);

  const vrednostDt = urDt * client.cenaDt;
  const vrednostDi = urDi * client.cenaDi;
  const vrednostDp = obracunljiviDp.reduce((s, e) => s + (e.dpZnesek ?? 0), 0);

  const skupajBrezDDV = znesekVzdrzevanja + vrednostDt + vrednostDi + vrednostDp;
  const ddv = skupajBrezDDV * DDV_STOPNJA;

  return {
    urDt,
    urDi,
    vrednostDt,
    vrednostDi,
    vrednostDp,
    znesekVzdrzevanja,
    skupajBrezDDV,
    ddv,
    skupajZDDV: skupajBrezDDV + ddv,
    ddvVzdrzevanje: znesekVzdrzevanja * DDV_STOPNJA,
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
  cenaDodatno: number,
  znesekVzdrzevanja: number
): UniversityCalc {
  const dEntries = entries.filter(e => e.vrstaDela === 'D');
  const dpEntries = entries.filter(e => e.vrstaDela === 'Dp');

  const urD = dEntries.reduce((s, e) => s + e.steviloUr, 0);
  const vrednostD = urD * cenaDodatno;

  const dpMap = new Map<string, number>();
  for (const e of dpEntries) {
    dpMap.set(e.stranka, (dpMap.get(e.stranka) ?? 0) + (e.dpZnesek ?? 0));
  }
  const dpPoFakultetah = Array.from(dpMap.entries())
    .map(([fakulteta, znesek]) => ({ fakulteta, znesek }))
    .filter(f => f.znesek > 0);
  const vrednostDp = dpPoFakultetah.reduce((s, f) => s + f.znesek, 0);

  const skupajBrezDDV = znesekVzdrzevanja + vrednostD + vrednostDp;
  const ddv = skupajBrezDDV * DDV_STOPNJA;

  return {
    urD, vrednostD, dpPoFakultetah, vrednostDp,
    znesekVzdrzevanja, skupajBrezDDV, ddv, skupajZDDV: skupajBrezDDV + ddv,
  };
}

export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

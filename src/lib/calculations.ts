import { WorkEntry, ClientConfig, InvoiceCalc, UniversityCalc } from './types';
import { DDV_STOPNJA } from '../config/constants';

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

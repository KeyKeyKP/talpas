import { WorkEntry, ClientConfig, InvoiceCalc } from './types';
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

export function formatDate(date: Date): string {
  return date.toLocaleDateString('sl-SI');
}

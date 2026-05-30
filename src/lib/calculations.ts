import type { WorkEntry, Calculations } from './types';
import { DEFAULT_CENA_DT, DEFAULT_CENA_DI, DDV_STOPNJA } from '../config/constants';

export function izracunaj(entries: WorkEntry[], znesekVzdrzevanja: number): Calculations {
  const dtEntries = entries.filter(e => e.vrstaDela === 'Dt');
  const diEntries = entries.filter(e => e.vrstaDela === 'Di');

  const urDt = dtEntries.reduce((s, e) => s + e.steviloUr, 0);
  const urDi = diEntries.reduce((s, e) => s + e.steviloUr, 0);

  const vrednostDt = urDt * DEFAULT_CENA_DT;
  const vrednostDi = urDi * DEFAULT_CENA_DI;

  const skupajBrezDDV = znesekVzdrzevanja + vrednostDt + vrednostDi;
  const ddv = skupajBrezDDV * DDV_STOPNJA;
  const skupajZDDV = skupajBrezDDV + ddv;

  return {
    urDt, urDi,
    vrednostDt, vrednostDi, znesekVzdrzevanja,
    skupajBrezDDV, ddv, skupajZDDV,
    ddvVzdrzevanje: znesekVzdrzevanja * DDV_STOPNJA,
    ddvDt: vrednostDt * DDV_STOPNJA,
    ddvDi: vrednostDi * DDV_STOPNJA,
  };
}

export function formatEUR(value: number): string {
  return value.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatUre(value: number): string {
  return value.toLocaleString('sl-SI', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

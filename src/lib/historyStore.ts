import { MonthlyHours } from './types';

const KEY = 'talpas_hours_history';

interface HoursHistory {
  [clientId: string]: MonthlyHours[];
}

function getHistory(): HoursHistory {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getHoursForPeriod(clientId: string, months: number): MonthlyHours[] {
  const history = getHistory();
  const records = history[clientId] ?? [];
  const now = new Date();
  const result: MonthlyHours[] = [];
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mesec = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = records.find(r => r.mesec === mesec);
    if (found) result.push(found);
  }
  return result;
}

export function saveMonthlyHours(clientId: string, mesec: string, ure: number): void {
  const history = getHistory();
  if (!history[clientId]) history[clientId] = [];
  const existing = history[clientId].findIndex(r => r.mesec === mesec);
  if (existing >= 0) {
    history[clientId][existing].skupajUr = ure;
  } else {
    history[clientId].push({ mesec, skupajUr: ure });
  }
  // Keep only last 3 months
  history[clientId].sort((a, b) => b.mesec.localeCompare(a.mesec));
  history[clientId] = history[clientId].slice(0, 3);
  localStorage.setItem(KEY, JSON.stringify(history));
}

export function getAllHistory(): HoursHistory {
  return getHistory();
}

export function setClientHistory(clientId: string, records: MonthlyHours[]): void {
  const history = getHistory();
  history[clientId] = records;
  localStorage.setItem(KEY, JSON.stringify(history));
}

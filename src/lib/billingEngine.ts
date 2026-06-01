import { WorkEntry, ClientConfig } from './types';
import { getHoursForPeriod } from './historyStore';

export function applyBillingRules(entries: WorkEntry[], client: ClientConfig): WorkEntry[] {
  const sorted = [...entries].sort((a, b) => a.datum.getTime() - b.datum.getTime());

  switch (client.billingType) {
    case 'standard':
      return sorted.map(e => ({ ...e, jeVkljucena: false, jePodPragom: false }));

    case 'included_hours':
      return applyIncludedHours(sorted, client.includedHours ?? 0);

    case 'threshold':
      return applyThreshold(sorted, client);

    case 'umbrella':
      return sorted.map(e => ({ ...e, jeVkljucena: false, jePodPragom: false }));

    default:
      return sorted;
  }
}

function applyIncludedHours(entries: WorkEntry[], limit: number): WorkEntry[] {
  const result: WorkEntry[] = [];
  let cumulative = 0;

  for (const entry of entries) {
    const ur = entry.steviloUr;
    const remaining = limit - cumulative;

    if (remaining <= 0) {
      result.push({ ...entry, jeVkljucena: false, jePodPragom: false });
    } else if (cumulative + ur <= limit) {
      cumulative += ur;
      result.push({ ...entry, jeVkljucena: true, jePodPragom: false });
    } else {
      // Split: part included, part billable
      const vkljucenDel = remaining;
      const obracunanDel = ur - vkljucenDel;
      cumulative = limit;

      result.push({
        ...entry,
        id: entry.id + '_incl',
        steviloUr: vkljucenDel,
        jeVkljucena: true,
        jePodPragom: false,
      });
      result.push({
        ...entry,
        id: entry.id + '_bill',
        steviloUr: obracunanDel,
        jeVkljucena: false,
        jePodPragom: false,
      });
    }
  }
  return result;
}

function applyThreshold(entries: WorkEntry[], client: ClientConfig): WorkEntry[] {
  const months = client.thresholdMonths ?? 3;
  const threshold = client.thresholdHours ?? 5;

  const history = getHoursForPeriod(client.id, months - 1);
  const historicHours = history.reduce((sum, h) => sum + h.skupajUr, 0);
  const currentHours = entries.reduce((sum, e) => sum + e.steviloUr, 0);
  const totalHours = historicHours + currentHours;
  const surplus = totalHours - threshold;

  if (surplus <= 0) {
    return entries.map(e => ({ ...e, jeVkljucena: false, jePodPragom: true }));
  }

  // Mark newest entries (chronological desc) as billable up to surplus
  const desc = [...entries].sort((a, b) => b.datum.getTime() - a.datum.getTime());
  const billableIds = new Set<string>();
  let billableCount = 0;

  for (const e of desc) {
    if (billableCount >= surplus) break;
    billableIds.add(e.id);
    billableCount += e.steviloUr;
  }

  return entries.map(e => ({
    ...e,
    jeVkljucena: false,
    jePodPragom: !billableIds.has(e.id),
  }));
}

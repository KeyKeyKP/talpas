import { WorkEntry, InvoiceMetadata } from './types';

type SerializedEntry = Omit<WorkEntry, 'datum'> & { datum: string };

interface PersistedState {
  fileName: string;
  importedAt: string;
  entries: SerializedEntry[];
  metadata: InvoiceMetadata;
}

function lsKey(fileName: string, strankaKey: string): string {
  return `talpas_work_${fileName}_${strankaKey}`;
}

export function saveWorkState(
  fileName: string,
  strankaKey: string,
  entries: WorkEntry[],
  metadata: InvoiceMetadata,
): void {
  try {
    const state: PersistedState = {
      fileName,
      importedAt: new Date().toISOString(),
      entries: entries.map(e => ({ ...e, datum: e.datum.toISOString() })),
      metadata,
    };
    localStorage.setItem(lsKey(fileName, strankaKey), JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

export function loadWorkState(
  fileName: string,
  strankaKey: string,
): { entries: WorkEntry[]; metadata: InvoiceMetadata } | null {
  try {
    const raw = localStorage.getItem(lsKey(fileName, strankaKey));
    if (!raw) return null;
    const state = JSON.parse(raw) as PersistedState;
    return {
      entries: state.entries.map(e => ({ ...e, datum: new Date(e.datum) })),
      metadata: state.metadata,
    };
  } catch {
    return null;
  }
}

export function deleteWorkState(fileName: string, strankaKey: string): void {
  localStorage.removeItem(lsKey(fileName, strankaKey));
}

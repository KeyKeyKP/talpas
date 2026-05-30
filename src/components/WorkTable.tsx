import type { WorkEntry } from '../lib/types';
import { WorkRow } from './WorkRow';

interface Props {
  entries: WorkEntry[];
  onChange: (id: string, changes: Partial<WorkEntry>) => void;
  onDelete: (id: string) => void;
}

export function WorkTable({ entries, onChange, onDelete }: Props) {
  const uncategorized = entries.filter(e => !e.vrstaDela).length;

  return (
    <div>
      {uncategorized > 0 && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          ⚠️ {uncategorized} {uncategorized === 1 ? 'vrstica nima' : 'vrstic nima'} izbrane vrste dela (Dt / Di / V)
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Delo</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Datum</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Kontakt</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Vrsta</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Ure</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Opis</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Opravil</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry, i) => (
              <WorkRow key={entry.id} entry={entry} index={i} onChange={onChange} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

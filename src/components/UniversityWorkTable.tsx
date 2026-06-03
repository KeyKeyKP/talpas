import { WorkEntry } from '../lib/types';
import UniversityWorkRow from './UniversityWorkRow';

interface Props {
  entries: WorkEntry[];
  onChange: (entries: WorkEntry[]) => void;
}

export default function UniversityWorkTable({ entries, onChange }: Props) {
  const updateEntry = (updated: WorkEntry) =>
    onChange(entries.map(e => e.id === updated.id ? updated : e));

  const uncategorized = entries.filter(e => e.vrstaDela === null).length;

  // Group by faculty (stranka field)
  const byFakulteta: Record<string, WorkEntry[]> = {};
  for (const e of entries) {
    if (!byFakulteta[e.stranka]) byFakulteta[e.stranka] = [];
    byFakulteta[e.stranka].push(e);
  }

  const renderFakulteta = (fakulteta: string, rows: WorkEntry[]) => {
    const dUr = rows.filter(r => r.vrstaDela === 'D').reduce((s, r) => s + r.steviloUr, 0);
    const dpCount = rows.filter(r => r.vrstaDela === 'Dp').length;

    const stats = [
      dUr > 0 && `D: ${dUr.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} ur`,
      dpCount > 0 && `Dp: ${dpCount} postavk`,
    ].filter(Boolean).join(' · ');

    return (
      <div key={fakulteta} className="mb-6">
        <div className="bg-purple-800 text-white text-sm font-semibold px-4 py-2 rounded-t-lg flex items-center justify-between">
          <span>{fakulteta}</span>
          <span className="text-purple-200 text-xs font-normal">{stats}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '43%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Delo</th>
                <th className="px-3 py-2 text-left">Datum</th>
                <th className="px-3 py-2 text-left">Kontakt</th>
                <th className="px-3 py-2 text-left">Vrsta</th>
                <th className="px-3 py-2 text-left">Ure</th>
                <th className="px-3 py-2 text-left">Opis</th>
                <th className="px-3 py-2 text-left">Opravil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(e => (
                <UniversityWorkRow key={e.id} entry={e} onChange={updateEntry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Tabela del – Univerza ({entries.length} vnosov)
        </h2>
        {uncategorized > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
            ⚠ {uncategorized} vnosov brez kategorije
          </span>
        )}
      </div>

      <div className="px-6 pb-5">
        {Object.entries(byFakulteta).map(([fak, rows]) => renderFakulteta(fak, rows))}
      </div>
    </div>
  );
}

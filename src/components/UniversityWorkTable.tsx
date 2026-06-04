import { WorkEntry } from '../lib/types';
import UniversityWorkRow from './UniversityWorkRow';

interface Props {
  entries: WorkEntry[];
  onChange: (entries: WorkEntry[]) => void;
}

const TH = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400';

export default function UniversityWorkTable({ entries, onChange }: Props) {
  const updateEntry = (updated: WorkEntry) =>
    onChange(entries.map(e => e.id === updated.id ? updated : e));

  const uncategorized = entries.filter(e => e.vrstaDela === null).length;

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
      <div key={fakulteta} className="mb-6 last:mb-0">
        <div className="bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-t-lg flex items-center justify-between">
          <span>{fakulteta}</span>
          {stats && <span className="text-slate-400 text-xs font-normal">{stats}</span>}
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
            <thead className="border-b-2 border-slate-200">
              <tr>
                <th className={TH}>Delo</th>
                <th className={TH}>Datum</th>
                <th className={TH}>Kontakt</th>
                <th className={TH}>Vrsta</th>
                <th className={TH}>Ure</th>
                <th className={TH}>Opis</th>
                <th className={TH}>Opravil</th>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Tabela del – Univerza</h2>
          <p className="text-sm text-slate-400 mt-0.5">{entries.length} vnosov</p>
        </div>
        {uncategorized > 0 && (
          <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            {uncategorized} neoznačenih
          </span>
        )}
      </div>
      <div className="px-6 py-4">
        {Object.entries(byFakulteta).map(([fak, rows]) => renderFakulteta(fak, rows))}
      </div>
    </div>
  );
}

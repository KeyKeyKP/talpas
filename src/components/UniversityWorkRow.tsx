import { WorkEntry, WorkType } from '../lib/types';
import { formatDate } from '../lib/calculations';

interface Props {
  entry: WorkEntry;
  onChange: (updated: WorkEntry) => void;
}

const TYPE_ACTIVE: Record<string, string> = {
  D:  'bg-emerald-500 text-white border-emerald-500',
  Dp: 'bg-amber-500 text-white border-amber-500',
  V:  'bg-slate-500 text-white border-slate-500',
};
const TYPE_GHOST = 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600';

const INPUT_CLS = 'w-full text-sm text-slate-700 bg-transparent border-0 border-b border-transparent focus:border-blue-400 focus:outline-none py-0.5 transition-colors placeholder:text-slate-300';

export default function UniversityWorkRow({ entry, onChange }: Props) {
  const setField = <K extends keyof WorkEntry>(key: K, val: WorkEntry[K]) =>
    onChange({ ...entry, [key]: val });

  const isUntagged = entry.vrstaDela === null;

  return (
    <tr className={`border-b border-slate-100 transition-colors duration-150 ${
      isUntagged ? 'opacity-50 bg-slate-50/60' : 'hover:bg-slate-50/70'
    }`}>
      <td className="px-3 py-2">
        <input type="text" value={entry.delo} onChange={e => setField('delo', e.target.value)} className={INPUT_CLS} />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={entry.datumStr ?? formatDate(entry.datum)} onChange={e => setField('datumStr', e.target.value)} className={INPUT_CLS + ' w-24'} />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={entry.kontakt} onChange={e => setField('kontakt', e.target.value)} className={INPUT_CLS} />
      </td>

      <td className="px-3 py-2">
        <div className="flex gap-1">
          {(['D', 'V', 'Dp'] as WorkType[]).map(t => (
            <button
              key={t}
              onClick={() => setField('vrstaDela', entry.vrstaDela === t ? null : t)}
              className={`h-7 px-2.5 text-xs rounded-full border font-medium transition-all duration-150 ${
                entry.vrstaDela === t ? (TYPE_ACTIVE[t as string] ?? '') : TYPE_GHOST
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {entry.vrstaDela === 'Dp' && (
          <input
            type="number" min="0" step="0.01" placeholder="EUR"
            value={entry.dpZnesek ?? ''}
            onChange={e => setField('dpZnesek', parseFloat(e.target.value) || undefined)}
            className="mt-1.5 w-24 text-xs border border-amber-200 bg-amber-50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        )}
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col items-start gap-0.5">
          <input
            type="number" min="0" step="0.25" value={entry.steviloUr}
            onChange={e => setField('steviloUr', parseFloat(e.target.value) || 0)}
            className="w-16 text-sm border border-slate-200 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          />
          {entry.steviloUr !== entry.steviloUrOriginal && (
            <span className="text-[11px] text-slate-400 line-through">{entry.steviloUrOriginal}</span>
          )}
        </div>
      </td>

      <td className="px-3 py-2">
        <textarea
          value={entry.opis}
          onChange={e => setField('opis', e.target.value)}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
          className="w-full text-sm text-slate-700 bg-transparent border-0 border-b border-transparent focus:border-blue-400 focus:outline-none resize-none min-h-[1.5rem] py-0.5 transition-colors"
        />
      </td>

      <td className="px-3 py-2">
        <input type="text" value={entry.opravil} onChange={e => setField('opravil', e.target.value)} className={INPUT_CLS} />
      </td>
    </tr>
  );
}

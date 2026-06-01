import { WorkEntry, WorkType } from '../lib/types';
import { formatDate } from '../lib/calculations';

interface Props {
  entry: WorkEntry;
  showStatus: boolean;
  onChange: (updated: WorkEntry) => void;
}

const TYPE_STYLES: Record<NonNullable<WorkType>, string> = {
  Dt: 'bg-green-100 text-green-800 border-green-300',
  Di: 'bg-blue-100 text-blue-800 border-blue-300',
  Dp: 'bg-orange-100 text-orange-800 border-orange-300',
  V: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function WorkRow({ entry, showStatus, onChange }: Props) {
  const setField = <K extends keyof WorkEntry>(key: K, val: WorkEntry[K]) =>
    onChange({ ...entry, [key]: val });

  return (
    <tr className={`border-b border-gray-100 ${entry.jeVkljucena || entry.jePodPragom ? 'bg-gray-50' : ''}`}>
      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{entry.delo}</td>
      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{formatDate(entry.datum)}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{entry.kontakt}</td>

      {/* Vrsta dela */}
      <td className="px-3 py-2">
        <div className="flex gap-1 flex-wrap">
          {(['Dt', 'Di', 'Dp', 'V'] as WorkType[]).map(t => (
            <button
              key={t}
              onClick={() => setField('vrstaDela', t)}
              className={`px-2 py-0.5 text-xs rounded border font-medium transition-all ${
                entry.vrstaDela === t
                  ? TYPE_STYLES[t as NonNullable<WorkType>]
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {entry.vrstaDela === 'Dp' && (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="EUR znesek"
            value={entry.dpZnesek ?? ''}
            onChange={e => setField('dpZnesek', parseFloat(e.target.value) || undefined)}
            className="mt-1 w-24 text-xs border border-orange-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        )}
      </td>

      {/* Ure */}
      <td className="px-3 py-2">
        <div className="flex flex-col items-start">
          <input
            type="number"
            min="0"
            step="0.25"
            value={entry.steviloUr}
            onChange={e => setField('steviloUr', parseFloat(e.target.value) || 0)}
            className="w-16 text-sm border border-gray-300 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {entry.steviloUr !== entry.steviloUrOriginal && (
            <span className="text-xs text-gray-400 line-through">{entry.steviloUrOriginal}</span>
          )}
        </div>
      </td>

      {/* Opis */}
      <td className="px-3 py-2 min-w-48">
        <textarea
          value={entry.opis}
          onChange={e => setField('opis', e.target.value)}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
        />
      </td>

      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{entry.opravil}</td>

      {showStatus && (
        <td className="px-3 py-2 text-center">
          {entry.jeVkljucena ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vključeno</span>
          ) : entry.jePodPragom ? (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pod pragom</span>
          ) : entry.vrstaDela && entry.vrstaDela !== 'V' ? (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Za obračun</span>
          ) : null}
        </td>
      )}
    </tr>
  );
}

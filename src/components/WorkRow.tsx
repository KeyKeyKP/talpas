import type { WorkEntry, WorkType } from '../lib/types';
import { formatUre } from '../lib/calculations';

interface Props {
  entry: WorkEntry;
  index: number;
  onChange: (id: string, changes: Partial<WorkEntry>) => void;
  onDelete: (id: string) => void;
}

const VRSTA_BUTTONS: { key: WorkType; label: string; cls: string }[] = [
  { key: 'Dt', label: 'Dt', cls: 'bg-green-500 text-white' },
  { key: 'Di', label: 'Di', cls: 'bg-blue-500 text-white' },
  { key: 'V',  label: 'V',  cls: 'bg-gray-400 text-white' },
];

export function WorkRow({ entry, index, onChange, onDelete }: Props) {
  const missing = !entry.vrstaDela;

  const formatDatum = (d: Date) => {
    try {
      return d.toLocaleDateString('sl-SI');
    } catch {
      return '';
    }
  };

  return (
    <tr className={`border-b ${missing ? 'border-l-4 border-l-red-400' : ''}`}>
      <td className="px-3 py-2 text-gray-400 text-sm">{index + 1}</td>
      <td className="px-3 py-2 font-medium text-sm">{entry.delo}</td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">{formatDatum(entry.datum)}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{entry.kontakt}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {VRSTA_BUTTONS.map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => onChange(entry.id, { vrstaDela: key })}
              className={`px-2 py-1 rounded text-xs font-bold transition-opacity ${
                entry.vrstaDela === key ? cls : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="0.25"
            value={entry.steviloUr}
            onChange={e => onChange(entry.id, { steviloUr: parseFloat(e.target.value) || 0 })}
            className="w-16 border rounded px-1 py-0.5 text-sm text-right"
          />
          {entry.steviloUr !== entry.steviloUrOriginal && (
            <span className="text-xs text-gray-400 line-through">{formatUre(entry.steviloUrOriginal)}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate" title={entry.opis}>{entry.opis}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={entry.opravil}
          onChange={e => onChange(entry.id, { opravil: e.target.value })}
          className="w-full border rounded px-1 py-0.5 text-sm"
          placeholder="Ime sodelavca"
        />
      </td>
      <td className="px-2 py-2">
        <button
          onClick={() => {
            if (confirm(`Izbriši postavko "${entry.delo}"?`)) onDelete(entry.id);
          }}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors"
          title="Izbriši postavko"
        >
          🗑️
        </button>
      </td>
    </tr>
  );
}

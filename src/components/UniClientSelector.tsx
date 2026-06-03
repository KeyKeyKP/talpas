import { getUniverzaForStranka } from '../lib/clientRegister';

interface Props {
  allStranke: Array<{ name: string; count: number }>;
  selectedType: 'UP' | 'UL';
  selected: string | null;
  onTypeChange: (type: 'UP' | 'UL') => void;
  onSelect: (stranka: string) => void;
}

export default function UniClientSelector({ allStranke, selectedType, selected, onTypeChange, onSelect }: Props) {
  const filtered = allStranke.filter(({ name }) => getUniverzaForStranka(name) === selectedType);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Izberi stranko za obračun</h2>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Univerza:</label>
        <select
          value={selectedType}
          onChange={e => onTypeChange(e.target.value as 'UP' | 'UL')}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="UP">UP – Univerza na Primorskem</option>
          <option value="UL">UL – Univerza v Ljubljani</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} {filtered.length === 1 ? 'stranka' : 'strank'}</span>
      </div>

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-sm text-center text-gray-400">
            Ni strank za {selectedType} v tem Excelu
          </div>
        ) : (
          filtered.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                selected === name
                  ? 'bg-purple-50 text-purple-800 font-medium border-l-4 border-l-purple-500'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>{name}</span>
              <span className="text-gray-400 tabular-nums">{count}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

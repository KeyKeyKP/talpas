interface Props {
  stranke: { ime: string; stevilo: number }[];
  izbrana: string | null;
  onSelect: (ime: string) => void;
}

export function StrankaSelector({ stranke, izbrana, onSelect }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Izberi stranko</h2>
      <p className="text-sm text-gray-500 mb-4">
        Excel vsebuje {stranke.length} {stranke.length === 1 ? 'stranko' : 'strank'}. Izberi za katero želiš ustvariti račun:
      </p>
      <div className="space-y-2">
        {stranke.map(s => (
          <button
            key={s.ime}
            onClick={() => onSelect(s.ime)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              izbrana === s.ime
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium text-gray-800">{s.ime}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {s.stevilo} {s.stevilo === 1 ? 'postavka' : 'postavk'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import type { WorkEntry, InvoiceMetadata } from '../lib/types';

interface Props {
  entries: WorkEntry[];
  metadata: InvoiceMetadata;
  fileNameHint?: string;
  onExport: () => void;
}

export function ExportButton({ entries, metadata, onExport }: Props) {
  const uncategorized = entries.filter(e => !e.vrstaDela).length;
  const missingNumber = !metadata.stevilkaRacuna.trim();
  const disabled = uncategorized > 0 || missingNumber || entries.length === 0;

  const reasons: string[] = [];
  if (entries.length === 0) reasons.push('ni podatkov');
  if (uncategorized > 0) reasons.push(`${uncategorized} vrstic brez vrste`);
  if (missingNumber) reasons.push('manjka številka računa');

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onExport}
        disabled={disabled}
        className={`px-6 py-3 rounded-xl font-semibold text-white transition-colors ${
          disabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
        }`}
      >
        📄 Izvozi Word dokument
      </button>
      {disabled && reasons.length > 0 && (
        <p className="text-xs text-red-500">{reasons.join(', ')}</p>
      )}
    </div>
  );
}

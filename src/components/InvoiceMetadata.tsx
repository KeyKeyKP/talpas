import { InvoiceMetadata } from '../lib/types';

interface Props {
  metadata: InvoiceMetadata;
  onChange: (m: InvoiceMetadata) => void;
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-yellow-300 bg-yellow-50 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
  );
}

export default function InvoiceMetadataForm({ metadata, onChange }: Props) {
  const set = (key: keyof InvoiceMetadata) => (val: string) =>
    onChange({ ...metadata, [key]: val });

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Metadata računa</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Številka računa" value={metadata.stevilkaRacuna} onChange={set('stevilkaRacuna')} />
        <Field label="Datum računa" value={metadata.datumRacuna} onChange={set('datumRacuna')} type="date" />
        <Field label="Rok plačila" value={metadata.rokPlacila} onChange={set('rokPlacila')} type="date" />
        <Field label="Obdobje od" value={metadata.obdobjeOd} onChange={set('obdobjeOd')} type="date" />
        <Field label="Obdobje do" value={metadata.obdobjeDo} onChange={set('obdobjeDo')} type="date" />
      </div>
    </div>
  );
}

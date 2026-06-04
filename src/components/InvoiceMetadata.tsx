import { InvoiceMetadata } from '../lib/types';

interface Props {
  metadata: InvoiceMetadata;
  onChange: (m: InvoiceMetadata) => void;
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="w-full bg-yellow-50 border-l-[3px] border-amber-400 pl-3 pr-2 py-2 text-sm text-slate-800 focus:outline-none focus:bg-amber-50 transition-colors rounded-r-md"
      />
    </div>
  );
}

export default function InvoiceMetadataForm({ metadata, onChange }: Props) {
  const set = (key: keyof InvoiceMetadata) => (val: string) =>
    onChange({ ...metadata, [key]: val });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-5">Podatki računa</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Številka računa" value={metadata.stevilkaRacuna} onChange={set('stevilkaRacuna')} placeholder="npr. 2026-001" />
        <Field label="Datum računa" value={metadata.datumRacuna} onChange={set('datumRacuna')} placeholder="dd/mm/yyyy" />
        <Field label="Rok plačila" value={metadata.rokPlacila} onChange={set('rokPlacila')} placeholder="dd/mm/yyyy" />
        <Field label="Obdobje od" value={metadata.obdobjeOd} onChange={set('obdobjeOd')} placeholder="dd/mm/yyyy" />
        <Field label="Obdobje do" value={metadata.obdobjeDo} onChange={set('obdobjeDo')} placeholder="dd/mm/yyyy" />
      </div>
    </div>
  );
}

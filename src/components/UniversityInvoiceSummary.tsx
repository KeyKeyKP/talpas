import { WorkEntry, ClientConfig, InvoiceMetadata } from '../lib/types';
import { izracunajUniverza, formatEur, formatNum } from '../lib/calculations';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
  cenaDodatno: number;
  onMetadataChange: (m: InvoiceMetadata) => void;
  onCenaDodatnoChange: (v: number) => void;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

export default function UniversityInvoiceSummary({
  entries, client, metadata, cenaDodatno, onMetadataChange, onCenaDodatnoChange,
}: Props) {
  const calc = izracunajUniverza(entries, cenaDodatno, metadata.znesekVzdrzevanja);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Povzetek – {client.imeNaRacunu}
      </h2>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Znesek vzdrževanja (brez DDV)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={metadata.znesekVzdrzevanja}
              onChange={e => onMetadataChange({ ...metadata, znesekVzdrzevanja: parseFloat(e.target.value) || 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-500">EUR</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Cena D – dodatno delo (EUR/uro)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={cenaDodatno}
              onChange={e => onCenaDodatnoChange(parseFloat(e.target.value) || 0)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-500">EUR/uro</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Opis vzdrževanja</label>
          <input
            type="text"
            value={metadata.opisVzdrzevanja}
            onChange={e => onMetadataChange({ ...metadata, opisVzdrzevanja: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 max-w-md">
        {calc.znesekVzdrzevanja > 0 && (
          <Row label="Vzdrževanje po pogodbi:" value={formatEur(calc.znesekVzdrzevanja)} />
        )}
        {calc.urD > 0 && (
          <Row
            label={`Dodatno delo: ${formatNum(calc.urD)} ur × ${cenaDodatno.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} EUR:`}
            value={formatEur(calc.vrednostD)}
          />
        )}
        {calc.dpPoFakultetah.map(({ fakulteta, znesek }) => (
          <Row key={fakulteta} label={`Dodatno delo ${fakulteta}:`} value={formatEur(znesek)} />
        ))}

        <div className="border-t border-gray-200 my-2" />
        <Row label="Osnova za DDV:" value={formatEur(calc.skupajBrezDDV)} />
        <Row label="DDV 22%:" value={formatEur(calc.ddv)} />
        <div className="border-t-2 border-gray-800 my-2" />
        <Row label="SKUPAJ ZA PLAČILO:" value={formatEur(calc.skupajZDDV)} bold />
      </div>
    </div>
  );
}

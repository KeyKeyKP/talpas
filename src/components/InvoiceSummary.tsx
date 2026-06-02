import { WorkEntry, ClientConfig, InvoiceMetadata, InvoiceCalc } from '../lib/types';
import { izracunaj, formatEur, formatNum } from '../lib/calculations';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
  onMetadataChange: (m: InvoiceMetadata) => void;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

export default function InvoiceSummary({ entries, client, metadata, onMetadataChange }: Props) {
  const calc: InvoiceCalc = izracunaj(entries, client, metadata.znesekVzdrzevanja, metadata.znesekGostovanja);
  const isIncluded = client.billingType === 'included_hours';
  const isThreshold = client.billingType === 'threshold';

  const includedHours = isIncluded ? entries.filter(e => e.jeVkljucena).reduce((s, e) => s + e.steviloUr, 0) : 0;
  const podPragomHours = isThreshold ? entries.filter(e => e.jePodPragom).reduce((s, e) => s + e.steviloUr, 0) : 0;
  const totalHours = entries.reduce((s, e) => s + e.steviloUr, 0);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Povzetek – {client.imeNaRacunu}</h2>

      {/* Vzdrževanje + Gostovanje */}
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
          <label className="text-xs text-gray-500 font-medium block mb-1">Gostovanje (brez DDV)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={metadata.znesekGostovanja}
              onChange={e => onMetadataChange({ ...metadata, znesekGostovanja: parseFloat(e.target.value) || 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-500">EUR</span>
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

      {/* Izračun */}
      <div className="border-t border-gray-100 pt-4 max-w-md">
        {isIncluded && includedHours > 0 && (
          <Row label={`Vključene ure (${formatNum(includedHours)} ur):`} value="0,00 EUR" />
        )}
        {isThreshold && (
          <>
            <Row label={`Ure v obdobju: ${formatNum(totalHours)} ur`} value="" />
            <Row label={`Prag: ${client.thresholdHours} ur`} value="" />
            <Row label={`Pod pragom: ${formatNum(podPragomHours)} ur`} value="0,00 EUR" />
          </>
        )}

        {calc.znesekVzdrzevanja > 0 && (
          <Row label="Vzdrževanje:" value={formatEur(calc.znesekVzdrzevanja)} />
        )}
        {calc.znesekGostovanja > 0 && (
          <Row label="Gostovanje:" value={formatEur(calc.znesekGostovanja)} />
        )}
        {calc.urDt > 0 && (
          <Row label={`Delo tehnik: ${formatNum(calc.urDt)} ur × ${client.cenaDt},00 EUR:`} value={formatEur(calc.vrednostDt)} />
        )}
        {calc.urDi > 0 && (
          <Row label={`Delo inženir: ${formatNum(calc.urDi)} ur × ${client.cenaDi},00 EUR:`} value={formatEur(calc.vrednostDi)} />
        )}
        {calc.vrednostDp > 0 && (
          <Row label="Delo po ponudbi:" value={formatEur(calc.vrednostDp)} />
        )}

        <div className="border-t border-gray-200 my-2" />
        <Row label="Osnova za DDV:" value={formatEur(calc.skupajBrezDDV)} />
        <Row label="DDV 22%:" value={formatEur(calc.ddv)} />
        <div className="border-t-2 border-gray-800 my-2" />
        <Row label="SKUPAJ ZA PLAČILO:" value={formatEur(calc.skupajZDDV)} bold />
      </div>
    </div>
  );
}

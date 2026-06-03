import { WorkEntry, ClientConfig, InvoiceMetadata } from '../lib/types';
import { izracunajUniverza, formatEur, formatNum } from '../lib/calculations';

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

export default function UniversityInvoiceSummary({ entries, client, metadata, onMetadataChange }: Props) {
  const calc = izracunajUniverza(
    entries,
    client.cenaDt,
    client.cenaDi,
    metadata.znesekVzdrzevanja,
    metadata.znesekGostovanja
  );

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Povzetek – {client.imeNaRacunu}
      </h2>

      {/* Input fields */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Per-faculty breakdown */}
      {calc.poFakultetah.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Po fakultetah</div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Fakulteta</th>
                  <th className="px-3 py-2 text-right font-medium">Dt (ur)</th>
                  <th className="px-3 py-2 text-right font-medium">Di (ur)</th>
                  <th className="px-3 py-2 text-right font-medium">Dp (EUR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calc.poFakultetah.map(({ fakulteta, urDt, urDi, dpZnesek }) => (
                  <tr key={fakulteta} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{fakulteta}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {urDt > 0 ? formatNum(urDt) : '–'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {urDi > 0 ? formatNum(urDi) : '–'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                      {dpZnesek > 0 ? formatNum(dpZnesek) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial summary */}
      <div className="border-t border-gray-100 pt-4 max-w-md">
        {calc.znesekVzdrzevanja > 0 && (
          <Row label="Vzdrževanje:" value={formatEur(calc.znesekVzdrzevanja)} />
        )}
        {calc.znesekGostovanja > 0 && (
          <Row label="Gostovanje:" value={formatEur(calc.znesekGostovanja)} />
        )}
        {calc.urDt > 0 && (
          <Row
            label={`Skupaj Dt: ${formatNum(calc.urDt)} ur × ${client.cenaDt.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} EUR:`}
            value={formatEur(calc.vrednostDt)}
          />
        )}
        {calc.urDi > 0 && (
          <Row
            label={`Skupaj Di: ${formatNum(calc.urDi)} ur × ${client.cenaDi.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} EUR:`}
            value={formatEur(calc.vrednostDi)}
          />
        )}
        {calc.vrednostDp > 0 && (
          <Row label="Skupaj Dp:" value={formatEur(calc.vrednostDp)} />
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

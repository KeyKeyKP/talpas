import { WorkEntry, ClientConfig, InvoiceMetadata, InvoiceCalc } from '../lib/types';
import { izracunaj, formatEur, formatNum } from '../lib/calculations';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
  onMetadataChange: (m: InvoiceMetadata) => void;
}

function DottedRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${bold ? '' : ''}`}>
      <span className={`shrink-0 ${bold ? 'text-slate-800 font-semibold text-[15px]' : 'text-slate-500 text-sm'}`}>{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-200 mb-0.5" />
      <span className={`shrink-0 tabular-nums ${bold ? 'text-slate-900 font-bold text-lg' : 'text-slate-700 text-sm'}`}>{value}</span>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-5">{client.imeNaRacunu}</h2>

      {/* Inline amount inputs */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Vzdrževanje (brez DDV)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" step="0.01"
              value={metadata.znesekVzdrzevanja}
              onChange={e => onMetadataChange({ ...metadata, znesekVzdrzevanja: parseFloat(e.target.value) || 0 })}
              className="w-28 text-sm border-b-2 border-slate-200 focus:border-blue-400 focus:outline-none py-1 px-0 bg-transparent"
            />
            <span className="text-sm text-slate-400">EUR</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Gostovanje (brez DDV)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" step="0.01"
              value={metadata.znesekGostovanja}
              onChange={e => onMetadataChange({ ...metadata, znesekGostovanja: parseFloat(e.target.value) || 0 })}
              className="w-28 text-sm border-b-2 border-slate-200 focus:border-blue-400 focus:outline-none py-1 px-0 bg-transparent"
            />
            <span className="text-sm text-slate-400">EUR</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Opis vzdrževanja</label>
          <input
            type="text"
            value={metadata.opisVzdrzevanja}
            onChange={e => onMetadataChange({ ...metadata, opisVzdrzevanja: e.target.value })}
            className="w-full text-sm border-b-2 border-slate-200 focus:border-blue-400 focus:outline-none py-1 px-0 bg-transparent"
          />
        </div>
      </div>

      {/* Calculation */}
      <div className="border-t border-slate-100 pt-4 max-w-md">
        {isIncluded && includedHours > 0 && (
          <DottedRow label={`Vključene ure (${formatNum(includedHours)} ur)`} value="0,00 EUR" />
        )}
        {isThreshold && (
          <>
            <DottedRow label={`Ure v obdobju: ${formatNum(totalHours)} ur`} value="" />
            <DottedRow label={`Prag: ${client.thresholdHours} ur`} value="" />
            <DottedRow label={`Pod pragom: ${formatNum(podPragomHours)} ur`} value="0,00 EUR" />
          </>
        )}
        {calc.znesekVzdrzevanja > 0 && <DottedRow label="Vzdrževanje" value={formatEur(calc.znesekVzdrzevanja)} />}
        {calc.znesekGostovanja > 0 && <DottedRow label="Gostovanje" value={formatEur(calc.znesekGostovanja)} />}
        {calc.urDt > 0 && <DottedRow label={`Delo tehnik: ${formatNum(calc.urDt)} ur × ${client.cenaDt},00 EUR`} value={formatEur(calc.vrednostDt)} />}
        {calc.urDi > 0 && <DottedRow label={`Delo inženir: ${formatNum(calc.urDi)} ur × ${client.cenaDi},00 EUR`} value={formatEur(calc.vrednostDi)} />}
        {calc.vrednostDp > 0 && <DottedRow label="Delo po ponudbi" value={formatEur(calc.vrednostDp)} />}

        <div className="border-t border-slate-200 my-3" />
        <DottedRow label="Osnova za DDV" value={formatEur(calc.skupajBrezDDV)} />
        <DottedRow label="DDV 22 %" value={formatEur(calc.ddv)} />
        <div className="border-t-2 border-slate-800 my-2" />
        <DottedRow label="SKUPAJ ZA PLAČILO" value={formatEur(calc.skupajZDDV)} bold />
      </div>
    </div>
  );
}

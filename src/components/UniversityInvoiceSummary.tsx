import { WorkEntry, ClientConfig, InvoiceMetadata } from '../lib/types';
import { izracunajUniverza, formatEur, formatNum } from '../lib/calculations';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
  onMetadataChange: (m: InvoiceMetadata) => void;
}

function DottedRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className={`shrink-0 ${bold ? 'text-slate-800 font-semibold text-[15px]' : 'text-slate-500 text-sm'}`}>{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-200 mb-0.5" />
      <span className={`shrink-0 tabular-nums ${bold ? 'text-slate-900 font-bold text-lg' : 'text-slate-700 text-sm'}`}>{value}</span>
    </div>
  );
}

export default function UniversityInvoiceSummary({ entries, client, metadata, onMetadataChange }: Props) {
  const calc = izracunajUniverza(entries, client.cenaDt, metadata.znesekVzdrzevanja);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-5">{client.imeNaRacunu}</h2>

      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Opis vzdrževanja</label>
          <input
            type="text"
            value={metadata.opisVzdrzevanja}
            onChange={e => onMetadataChange({ ...metadata, opisVzdrzevanja: e.target.value })}
            className="w-full text-sm border-b-2 border-slate-200 focus:border-blue-400 focus:outline-none py-1 px-0 bg-transparent"
          />
        </div>
      </div>

      {/* Per-faculty breakdown */}
      {calc.poFakultetah.length > 0 && (
        <div className="mb-5 border border-slate-100 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Po fakultetah</div>
          <div className="divide-y divide-slate-100">
            {calc.poFakultetah.map(({ fakulteta, urD, dpZnesek }) => {
              const vrednostD = urD * client.cenaDt;
              const hasOnlyV = urD === 0 && dpZnesek === 0;
              const parts: string[] = [];
              if (hasOnlyV) { parts.push('D 0 ur (samo V)'); }
              else {
                if (urD > 0) parts.push(`D ${formatNum(urD)} ur = ${formatEur(vrednostD)}`);
                if (dpZnesek > 0) parts.push(`Dp ${formatEur(dpZnesek)}`);
              }
              return (
                <div key={fakulteta} className="flex items-baseline justify-between px-4 py-2 text-sm">
                  <span className="text-slate-600 mr-4 shrink-0">{fakulteta}</span>
                  <span className="text-slate-800 tabular-nums text-right text-[13px]">{parts.join(' · ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4 max-w-md">
        {calc.znesekVzdrzevanja > 0 && <DottedRow label="Vzdrževanje" value={formatEur(calc.znesekVzdrzevanja)} />}
        {calc.urD > 0 && (
          <DottedRow
            label={`Skupaj D: ${formatNum(calc.urD)} ur × ${client.cenaDt.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} EUR`}
            value={formatEur(calc.vrednostD)}
          />
        )}
        {calc.vrednostDp > 0 && <DottedRow label="Skupaj Dp" value={formatEur(calc.vrednostDp)} />}
        <div className="border-t border-slate-200 my-3" />
        <DottedRow label="Osnova za DDV" value={formatEur(calc.skupajBrezDDV)} />
        <DottedRow label="DDV 22 %" value={formatEur(calc.ddv)} />
        <div className="border-t-2 border-slate-800 my-2" />
        <DottedRow label="SKUPAJ ZA PLAČILO" value={formatEur(calc.skupajZDDV)} bold />
      </div>
    </div>
  );
}

import { ClientConfig } from '../lib/types';
import { findClientWithRegister, isInRegister } from '../lib/clientRegister';

interface Props {
  stranke: Array<{ name: string; count: number }>;
  selected: string | null;
  onSelect: (stranka: string, client: ClientConfig | undefined) => void;
  exportedStranke?: Set<string>;
}

const BILLING_LABELS: Record<string, string> = {
  standard: 'Standard',
  included_hours: 'Vključene ure',
  threshold: 'Prag ur',
  umbrella: 'Krovna',
};

export default function ClientSelector({ stranke, selected, onSelect, exportedStranke }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">Izberi stranko za obračun</h2>
        <p className="text-sm text-slate-400 mt-0.5">{stranke.length} strank</p>
      </div>
      <div className="divide-y divide-slate-100">
        {stranke.map(({ name, count }) => {
          const client = findClientWithRegister(name);
          const inRegister = isInRegister(name);
          const isSelected = selected === name;
          const isExported = exportedStranke?.has(name) ?? false;
          return (
            <button
              key={name}
              onClick={() => onSelect(name, client)}
              className={`w-full text-left px-6 py-3 flex items-center justify-between transition-colors duration-150 ${
                isExported
                  ? 'border-l-[3px] border-red-400 bg-red-50/40 pl-[21px]'
                  : isSelected
                  ? 'bg-blue-50 border-l-[3px] border-blue-500 pl-[21px]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{name}</span>
                {inRegister && (
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">✓</span>
                )}
                {client && (
                  <span className="text-[11px] text-slate-400">{BILLING_LABELS[client.billingType]}</span>
                )}
                {!client && (
                  <span className="text-[11px] text-amber-500 font-medium">⚠ ni v registru</span>
                )}
              </span>
              <span className="text-sm text-slate-400 font-mono tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {selected && (() => {
        const client = findClientWithRegister(selected);
        if (!client) return (
          <div className="mx-6 mb-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠ Stranka <strong>{selected}</strong> ni v registru. Standardna pravila obračuna.
          </div>
        );
        return (
          <div className="mx-6 mb-4 mt-2 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <div className="font-semibold text-blue-800 mb-1.5">{client.imeNaRacunu}</div>
            <div className="text-blue-600 space-y-0.5 text-[13px]">
              <div>Tip: <strong>{BILLING_LABELS[client.billingType]}</strong></div>
              {client.billingType === 'included_hours' && (
                <div>Prvih <strong>{client.includedHours} ur/mesec</strong> vključenih v pogodbo.</div>
              )}
              {client.billingType === 'threshold' && (
                <div>Obračunajo se ure, ki presežejo <strong>{client.thresholdHours} ur</strong> v zadnjih <strong>{client.thresholdMonths} mesecih</strong>.</div>
              )}
              <div className="mt-1 text-slate-500">Dt: <strong>{client.cenaDt},00 EUR</strong> · Di: <strong>{client.cenaDi},00 EUR</strong></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

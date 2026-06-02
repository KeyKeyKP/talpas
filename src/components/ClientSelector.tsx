import { ClientConfig } from '../lib/types';
import { findClientWithRegister, isInRegister } from '../lib/clientRegister';

interface Props {
  stranke: Array<{ name: string; count: number }>;
  selected: string | null;
  onSelect: (stranka: string, client: ClientConfig | undefined) => void;
}

const BILLING_LABELS: Record<string, string> = {
  standard: 'Standard',
  included_hours: 'Vključene ure',
  threshold: 'Prag ur',
  umbrella: 'Krovna pogodba',
};

export default function ClientSelector({ stranke, selected, onSelect }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Izberi stranko za obračun</h2>
      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {stranke.map(({ name, count }) => {
          const client = findClientWithRegister(name);
          const inRegister = isInRegister(name);
          const isSelected = selected === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name, findClientWithRegister(name))}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-blue-50 text-blue-800 font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>
                {name}
                {inRegister && (
                  <span className="ml-2 text-xs text-green-600 font-normal">✓</span>
                )}
                {client && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {BILLING_LABELS[client.billingType]}
                  </span>
                )}
                {!client && (
                  <span className="ml-2 text-xs text-orange-400 font-normal">⚠ ni v registru</span>
                )}
              </span>
              <span className="text-gray-400 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {selected && (() => {
        const client = findClientWithRegister(selected);
        if (!client) return (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ⚠ Stranka <strong>{selected}</strong> ni v registru. Uporabljena bodo standardna pravila obračuna.
          </div>
        );
        return (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-semibold text-blue-800 mb-1">ℹ {client.imeNaRacunu}</div>
            <div className="text-blue-700 space-y-0.5">
              <div>Tip: <strong>{BILLING_LABELS[client.billingType]}</strong></div>
              {client.billingType === 'included_hours' && (
                <div>Prvih <strong>{client.includedHours} ur/mesec</strong> je vključenih v pogodbo. Obračunajo se samo ure nad limitom.</div>
              )}
              {client.billingType === 'threshold' && (
                <div>Obračunajo se ure, ki v zadnjih <strong>{client.thresholdMonths} mesecih</strong> presežejo <strong>{client.thresholdHours} ur</strong>.</div>
              )}
              {client.billingType === 'umbrella' && (
                <div>Krovna pogodba – en račun za vse sub-entitete, ločena specifikacija v prilogi.</div>
              )}
              <div className="mt-1">Cena Dt: <strong>{client.cenaDt},00 EUR</strong> | Cena Di: <strong>{client.cenaDi},00 EUR</strong></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

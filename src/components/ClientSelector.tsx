import React from 'react';
import { ClientConfig } from '../lib/types';
import { findClient } from '../data/clients';

interface Props {
  stranke: string[];
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
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Izberi stranko za obračun</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stranke.map(s => {
          const client = findClient(s);
          const isSelected = selected === s;
          return (
            <button
              key={s}
              onClick={() => onSelect(s, client)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{s}</div>
              {client ? (
                <div className="text-xs text-gray-500 mt-1">
                  {BILLING_LABELS[client.billingType]}
                  {client.billingType === 'included_hours' && ` · ${client.includedHours} ur/mes`}
                  {client.billingType === 'threshold' && ` · prag ${client.thresholdHours} ur / ${client.thresholdMonths} mes`}
                </div>
              ) : (
                <div className="text-xs text-orange-500 mt-1">⚠ Ni v registru – standard pravila</div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (() => {
        const client = findClient(selected);
        if (!client) return (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ⚠ Stranka <strong>{selected}</strong> ni v registru. Uporabljena bodo standardna pravila obračuna.
          </div>
        );
        return (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
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

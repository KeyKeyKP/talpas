import type { Calculations } from '../lib/types';
import { formatEUR, formatUre } from '../lib/calculations';
import { DEFAULT_CENA_DT, DEFAULT_CENA_DI } from '../config/constants';

interface Props {
  calc: Calculations;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-mono">{value} EUR</span>
    </div>
  );
}

export function InvoiceSummary({ calc }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4">Povzetek</h2>
      <div className="space-y-0.5">
        {calc.znesekVzdrzevanja > 0 && (
          <Row label={`Vzdrževanje`} value={formatEUR(calc.znesekVzdrzevanja)} />
        )}
        {calc.urDt > 0 && (
          <Row
            label={`Delo tehnik: ${formatUre(calc.urDt)} ur × ${formatEUR(DEFAULT_CENA_DT)}`}
            value={formatEUR(calc.vrednostDt)}
          />
        )}
        {calc.urDi > 0 && (
          <Row
            label={`Delo inženir: ${formatUre(calc.urDi)} ur × ${formatEUR(DEFAULT_CENA_DI)}`}
            value={formatEUR(calc.vrednostDi)}
          />
        )}
        <div className="border-t border-gray-200 my-2" />
        <Row label="Osnova za DDV" value={formatEUR(calc.skupajBrezDDV)} />
        <Row label="DDV 22%" value={formatEUR(calc.ddv)} />
        <div className="border-t-2 border-gray-800 my-2" />
        <div className="flex justify-between py-1 text-lg font-bold">
          <span>Skupaj za plačilo</span>
          <span className="font-mono text-blue-700">{formatEUR(calc.skupajZDDV)} EUR</span>
        </div>
      </div>
    </div>
  );
}

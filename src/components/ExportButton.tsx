import { useState } from 'react';
import { WorkEntry, ClientConfig, InvoiceMetadata } from '../lib/types';
import { generateDocx } from '../lib/docxGenerator';
import { saveMonthlyHours } from '../lib/historyStore';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
  strankaName?: string;
  onExported?: (name: string) => void;
}

export default function ExportButton({ entries, client, metadata, strankaName, onExported }: Props) {
  const [loading, setLoading] = useState(false);

  const uncategorized = entries.filter(e => e.vrstaDela === null);
  const missingMeta = !metadata.stevilkaRacuna || !metadata.datumRacuna || !metadata.rokPlacila;

  // Znesek pri Dp NI obvezen – polje je lahko prazno (izpolni se ročno).
  const errors: string[] = [];
  if (missingMeta) errors.push('Manjkajo podatki računa (številka, datum, rok plačila)');

  const handleExport = async () => {
    if (errors.length > 0) return;
    setLoading(true);
    try {
      await generateDocx(entries, client, metadata);
      if (strankaName) onExported?.(strankaName);
      if (client.billingType === 'threshold') {
        const now = new Date();
        const mesec = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const totalUr = entries.reduce((s, e) => s + e.steviloUr, 0);
        saveMonthlyHours(client.id, mesec, totalUr);
      }
    } catch (err) {
      alert('Napaka pri generiranju dokumenta: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Izvoz dokumenta</h2>

      <div className="space-y-2 mb-6">
        {errors.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg">
            <span>⛔</span> {e}
          </div>
        ))}
        {errors.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-lg">
            <span>✓</span> Dokument je pripravljen za izvoz.
          </div>
        )}
        {uncategorized.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-lg">
            <span>ℹ</span> {uncategorized.length} neoznačenih vnosov se ne upošteva (vidni v prilogi).
          </div>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={errors.length > 0 || loading}
        className={`flex items-center justify-center gap-2.5 w-full sm:w-72 h-12 rounded-lg font-semibold text-[15px] transition-all duration-150 ${
          errors.length > 0 || loading
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow active:scale-[0.98]'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 18 15 15"/>
        </svg>
        {loading ? 'Generiranje...' : 'Izvozi Word dokument'}
      </button>
    </div>
  );
}

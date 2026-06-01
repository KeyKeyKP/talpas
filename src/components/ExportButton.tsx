import { useState } from 'react';
import { WorkEntry, ClientConfig, InvoiceMetadata } from '../lib/types';
import { generateDocx } from '../lib/docxGenerator';
import { saveMonthlyHours } from '../lib/historyStore';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig;
  metadata: InvoiceMetadata;
}

export default function ExportButton({ entries, client, metadata }: Props) {
  const [loading, setLoading] = useState(false);

  const uncategorized = entries.filter(e => e.vrstaDela === null);
  const dpMissing = entries.filter(e => e.vrstaDela === 'Dp' && !e.dpZnesek);
  const missingMeta = !metadata.stevilkaRacuna || !metadata.datumRacuna || !metadata.rokPlacila;

  const errors: string[] = [];
  if (uncategorized.length > 0) errors.push(`${uncategorized.length} vnosov brez kategorije`);
  if (dpMissing.length > 0) errors.push(`${dpMissing.length} Dp vnosov brez zneska`);
  if (missingMeta) errors.push('Manjkajo podatki računa (številka, datum, rok plačila)');

  const handleExport = async () => {
    if (errors.length > 0) return;
    setLoading(true);
    try {
      await generateDocx(entries, client, metadata);

      // Save hours history for threshold clients
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
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Izvoz</h2>

      {errors.length > 0 ? (
        <div className="mb-4 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              <span>⛔</span> {e}
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 text-sm text-green-600 bg-green-50 px-3 py-2 rounded flex items-center gap-2">
          <span>✅</span> Vse je v redu. Pripravljen za izvoz.
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={errors.length > 0 || loading}
        className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
          errors.length > 0 || loading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        }`}
      >
        {loading ? '⏳ Generiranje...' : '📄 Izvozi Word dokument (.docx)'}
      </button>
    </div>
  );
}

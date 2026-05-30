import { useState, useCallback, useEffect, useMemo } from 'react';
import type { WorkEntry, InvoiceMetadata } from './lib/types';
import { parseExcel } from './lib/excelParser';
import { izracunaj } from './lib/calculations';
import { generateDocx } from './lib/docxGenerator';
import { FileUpload } from './components/FileUpload';
import { WorkTable } from './components/WorkTable';
import { InvoiceSummary } from './components/InvoiceSummary';
import { InvoiceMetadataForm } from './components/InvoiceMetadata';
import { ExportButton } from './components/ExportButton';
import { StrankaSelector } from './components/StrankaSelector';
import { DEFAULT_VZDRZEVANJE_OPIS, najdiStranko } from './config/constants';

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10);

const DEFAULT_METADATA: InvoiceMetadata = {
  stevilkaRacuna: '',
  datumRacuna: today,
  rokPlacila: nextMonth,
  obdobjeOd: today.slice(0, 7) + '-01',
  obdobjeDo: today,
  znesekVzdrzevanja: 580,
  opisVzdrzevanja: DEFAULT_VZDRZEVANJE_OPIS,
};

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9čćžšđČĆŽŠĐ_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export default function App() {
  const [allEntries, setAllEntries] = useState<WorkEntry[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [izbranaStranka, setIzbranaStranka] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<InvoiceMetadata>(DEFAULT_METADATA);
  const [fileName, setFileName] = useState('');
  const [logoBuffer, setLogoBuffer] = useState<ArrayBuffer | undefined>();
  const [stampBuffer, setStampBuffer] = useState<ArrayBuffer | undefined>();

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}talpas-logo.jpg`).then(r => r.arrayBuffer()).then(setLogoBuffer).catch(() => {});
    fetch(`${base}talpas-stamp.png`).then(r => r.arrayBuffer()).then(setStampBuffer).catch(() => {});
  }, []);

  const stranke = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allEntries) {
      const ime = (e.stranka || '(neznano)').trim();
      map.set(ime, (map.get(ime) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([ime, stevilo]) => ({ ime, stevilo }))
      .sort((a, b) => b.stevilo - a.stevilo);
  }, [allEntries]);

  const handleFile = useCallback((buffer: ArrayBuffer, name: string) => {
    const parsed = parseExcel(buffer);
    setAllEntries(parsed);
    setEntries([]);
    setIzbranaStranka(null);
    setFileName(name);
  }, []);

  const handleStrankaSelect = useCallback((ime: string) => {
    setIzbranaStranka(ime);
    setEntries(allEntries.filter(e => (e.stranka || '(neznano)').trim() === ime));
  }, [allEntries]);

  const handleEntryChange = useCallback((id: string, changes: Partial<WorkEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
  }, []);

  const handleEntryDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleMetaChange = useCallback((changes: Partial<InvoiceMetadata>) => {
    setMetadata(prev => ({ ...prev, ...changes }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!izbranaStranka) return;
    const calc = izracunaj(entries, metadata.znesekVzdrzevanja);
    const podatki = najdiStranko(izbranaStranka);
    await generateDocx(entries, metadata, calc, podatki, logoBuffer, stampBuffer);
  }, [entries, metadata, izbranaStranka, logoBuffer, stampBuffer]);

  const handleReset = useCallback(() => {
    setAllEntries([]);
    setEntries([]);
    setIzbranaStranka(null);
    setFileName('');
  }, []);

  const calc = izracunaj(entries, metadata.znesekVzdrzevanja);
  const strankaPodatki = izbranaStranka ? najdiStranko(izbranaStranka) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <img src={`${import.meta.env.BASE_URL}talpas-logo.jpg`} alt="TALPAS" className="h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">TALPAS – Obračun vzdrževalnih del</h1>
          {strankaPodatki && (
            <p className="text-sm text-gray-500">{strankaPodatki.ime}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {allEntries.length === 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">1. Uvoz Excel datoteke</h2>
            <FileUpload onFile={handleFile} />
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <span className="text-sm text-green-700">
                ✓ Uvožena datoteka: <strong>{fileName}</strong> ({allEntries.length} vrstic, {stranke.length} {stranke.length === 1 ? 'stranka' : 'strank'})
              </span>
              <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-500 underline">
                Zamenjaj datoteko
              </button>
            </div>

            {!izbranaStranka ? (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">2. Izberi stranko</h2>
                <StrankaSelector stranke={stranke} izbrana={izbranaStranka} onSelect={handleStrankaSelect} />
              </section>
            ) : (
              <>
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-blue-700">
                    👤 Stranka: <strong>{strankaPodatki?.ime}</strong> ({entries.length} postavk)
                  </span>
                  <button
                    onClick={() => { setIzbranaStranka(null); setEntries([]); }}
                    className="text-xs text-gray-500 hover:text-blue-700 underline"
                  >
                    Zamenjaj stranko
                  </button>
                </div>

                <section>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">3. Pregled in kategorizacija del</h2>
                  <WorkTable entries={entries} onChange={handleEntryChange} onDelete={handleEntryDelete} />
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">4. Podatki računa in povzetek</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InvoiceMetadataForm metadata={metadata} onChange={handleMetaChange} />
                    <InvoiceSummary calc={calc} />
                  </div>
                </section>

                <section className="flex justify-end">
                  <ExportButton
                    entries={entries}
                    metadata={metadata}
                    fileNameHint={sanitize(strankaPodatki?.ime ?? 'stranka')}
                    onExport={handleExport}
                  />
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

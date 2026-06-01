import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ClientSelector from './components/ClientSelector';
import WorkTable from './components/WorkTable';
import InvoiceSummary from './components/InvoiceSummary';
import InvoiceMetadataForm from './components/InvoiceMetadata';
import ExportButton from './components/ExportButton';
import { parseExcel, getUniqueStranke } from './lib/excelParser';
import { applyBillingRules } from './lib/billingEngine';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './lib/types';
import { findClient } from './data/clients';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [step, setStep] = useState(1);
  const [allEntries, setAllEntries] = useState<WorkEntry[]>([]);
  const [stranke, setStranke] = useState<string[]>([]);
  const [selectedStranka, setSelectedStranka] = useState<string | null>(null);
  const [client, setClient] = useState<ClientConfig | undefined>();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [metadata, setMetadata] = useState<InvoiceMetadata>({
    stevilkaRacuna: '',
    datumRacuna: todayStr(),
    rokPlacila: addDays(30),
    obdobjeOd: '',
    obdobjeDo: '',
    znesekVzdrzevanja: 0,
    opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
  });

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setAllEntries(parsed);
      setStranke(getUniqueStranke(parsed));
      setStep(2);
    } catch (e) {
      alert('Napaka pri branju datoteke: ' + String(e));
    }
  };

  const handleSelectStranka = (stranka: string, clientConfig: ClientConfig | undefined) => {
    setSelectedStranka(stranka);
    const cfg = clientConfig ?? {
      id: 'unknown',
      imeZaIskanje: [stranka.toLowerCase()],
      imeNaRacunu: stranka,
      naslov: '',
      posta: '',
      kraj: '',
      idDDV: '',
      cenaDt: 48,
      cenaDi: 70,
      znesekVzdrzevanja: 0,
      opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
      billingType: 'standard',
    };
    setClient(cfg);

    // Filter entries for this client
    const filtered = allEntries.filter(e => {
      if (cfg.billingType === 'umbrella') {
        return e.skupina === stranka || cfg.imeZaIskanje.some(ime =>
          e.stranka.toLowerCase().includes(ime) || e.skupina.toLowerCase().includes(ime)
        );
      }
      return cfg.imeZaIskanje.some(ime =>
        e.stranka.toLowerCase().includes(ime) || ime.includes(e.stranka.toLowerCase())
      );
    });

    const withRules = applyBillingRules(filtered, cfg);
    setEntries(withRules);
    setMetadata(m => ({
      ...m,
      znesekVzdrzevanja: cfg.znesekVzdrzevanja,
      opisVzdrzevanja: cfg.opisVzdrzevanja,
    }));
  };

  const handleEntriesChange = (updated: WorkEntry[]) => {
    // Re-apply billing rules when entries change
    if (client) {
      setEntries(applyBillingRules(updated, client));
    }
  };

  const canProceedToStep3 = selectedStranka !== null && entries.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="font-bold text-xl text-blue-700">TALPAS</div>
          <div className="text-gray-400">|</div>
          <div className="text-gray-600 text-sm">Obračun vzdrževalnih del</div>
          {selectedStranka && (
            <>
              <div className="text-gray-400">|</div>
              <div className="text-sm font-medium text-gray-700">{selectedStranka}</div>
            </>
          )}
        </div>
      </header>

      {/* Steps */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {[
            { n: 1, label: 'Uvoz Excel' },
            { n: 2, label: 'Izbira stranke' },
            { n: 3, label: 'Tabela del' },
            { n: 4, label: 'Povzetek' },
            { n: 5, label: 'Izvoz' },
          ].map(({ n, label }) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-1 ${step >= n ? 'text-blue-600 font-medium' : ''}`}>
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                  step > n ? 'bg-blue-600 text-white' : step === n ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-200 text-gray-500'
                }`}>{n}</span>
                {label}
              </div>
              {n < 5 && <div className="w-4 h-px bg-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
        {/* Step 1: File upload */}
        {step === 1 && (
          <FileUpload onFileLoaded={handleFile} />
        )}

        {/* Step 2: Client selection */}
        {step >= 2 && (
          <div>
            <ClientSelector
              stranke={stranke}
              selected={selectedStranka}
              onSelect={handleSelectStranka}
            />
            {canProceedToStep3 && step === 2 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Nadaljuj →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Work table */}
        {step >= 3 && client && (
          <div>
            <WorkTable
              entries={entries}
              client={client}
              onChange={handleEntriesChange}
            />
            {step === 3 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Nadaljuj →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Summary + Metadata */}
        {step >= 4 && client && (
          <div className="space-y-6">
            <InvoiceSummary
              entries={entries}
              client={client}
              metadata={metadata}
              onMetadataChange={setMetadata}
            />
            <InvoiceMetadataForm
              metadata={metadata}
              onChange={setMetadata}
            />
            {step === 4 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(5)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Nadaljuj →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Export */}
        {step >= 5 && client && (
          <ExportButton
            entries={entries}
            client={client}
            metadata={metadata}
          />
        )}

        {/* Reset */}
        {step > 1 && (
          <div className="flex justify-start">
            <button
              onClick={() => {
                setStep(1);
                setAllEntries([]);
                setStranke([]);
                setSelectedStranka(null);
                setClient(undefined);
                setEntries([]);
              }}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Začni znova
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

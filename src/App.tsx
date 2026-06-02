import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ClientSelector from './components/ClientSelector';
import WorkTable from './components/WorkTable';
import InvoiceSummary from './components/InvoiceSummary';
import InvoiceMetadataForm from './components/InvoiceMetadata';
import ExportButton from './components/ExportButton';
import UniversityUpload from './components/UniversityUpload';
import UniversityWorkTable from './components/UniversityWorkTable';
import UniversityInvoiceSummary from './components/UniversityInvoiceSummary';
import UniversityExportButton from './components/UniversityExportButton';
import { parseExcel, getStrankeStats } from './lib/excelParser';
import { applyBillingRules } from './lib/billingEngine';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './lib/types';
import { CLIENTS } from './data/clients';
import { loadClientRegister } from './lib/clientRegister';
import { DEFAULT_CENA_DT } from './config/constants';

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function todayStr() { return fmtDate(new Date()); }
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

const EMPTY_METADATA: InvoiceMetadata = {
  stevilkaRacuna: '',
  datumRacuna: todayStr(),
  rokPlacila: addDays(30),
  obdobjeOd: '',
  obdobjeDo: '',
  znesekVzdrzevanja: 0,
  opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
};

export default function App() {
  const [step, setStep] = useState(1);

  // Standard flow
  const [allEntries, setAllEntries] = useState<WorkEntry[]>([]);
  const [stranke, setStranke] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedStranka, setSelectedStranka] = useState<string | null>(null);
  const [client, setClient] = useState<ClientConfig | undefined>();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [metadata, setMetadata] = useState<InvoiceMetadata>({ ...EMPTY_METADATA });

  // University flow
  const [uniMode, setUniMode] = useState(false);
  const [uniEntries, setUniEntries] = useState<WorkEntry[]>([]);
  const [uniClient, setUniClient] = useState<ClientConfig | undefined>();
  const [uniMetadata, setUniMetadata] = useState<InvoiceMetadata>({
    ...EMPTY_METADATA,
    opisVzdrzevanja: 'Vzdrževanje po pogodbi',
  });
  const [cenaDodatno, setCenaDodatno] = useState(DEFAULT_CENA_DT);

  useEffect(() => { loadClientRegister('/talpas'); }, []);

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setAllEntries(parsed);
      setStranke(getStrankeStats(parsed));
      setStep(2);
    } catch (e) {
      alert('Napaka pri branju datoteke: ' + String(e));
    }
  };

  const handleUniversityFile = async (file: File, uniType: 'UP' | 'UL') => {
    try {
      const parsed = await parseExcel(file);
      setUniEntries(parsed);

      const clientId = uniType === 'UP' ? 'up' : 'ul';
      const foundClient = CLIENTS.find(c => c.id === clientId);
      setUniClient(foundClient);

      const validDates = parsed.map(e => e.datum).filter(d => !isNaN(d.getTime()));
      let obdobjeOd = '';
      let obdobjeDo = '';
      if (validDates.length) {
        const anyDate = validDates[0];
        const year = anyDate.getFullYear();
        const month = anyDate.getMonth();
        obdobjeOd = fmtDate(new Date(year, month, 1));
        obdobjeDo = fmtDate(new Date(year, month + 1, 0));
      }
      setUniMetadata(m => ({
        ...m,
        znesekVzdrzevanja: foundClient?.znesekVzdrzevanja ?? 0,
        obdobjeOd,
        obdobjeDo,
      }));

      setUniMode(true);
      setStep(3);
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

    const validDates = filtered.map(e => e.datum).filter(d => !isNaN(d.getTime()));
    let obdobjeOd = '';
    let obdobjeDo = '';
    if (validDates.length) {
      const anyDate = validDates[0];
      const year = anyDate.getFullYear();
      const month = anyDate.getMonth();
      obdobjeOd = fmtDate(new Date(year, month, 1));
      obdobjeDo = fmtDate(new Date(year, month + 1, 0));
    }

    setMetadata(m => ({
      ...m,
      znesekVzdrzevanja: cfg.znesekVzdrzevanja,
      opisVzdrzevanja: cfg.opisVzdrzevanja,
      obdobjeOd,
      obdobjeDo,
    }));
  };

  const handleEntriesChange = (updated: WorkEntry[]) => {
    if (client) {
      setEntries(applyBillingRules(updated, client));
    }
  };

  const canProceedToStep3 = selectedStranka !== null && entries.length > 0;

  const handleReset = () => {
    setStep(1);
    // Standard
    setAllEntries([]);
    setStranke([]);
    setSelectedStranka(null);
    setClient(undefined);
    setEntries([]);
    setMetadata({ ...EMPTY_METADATA });
    // University
    setUniMode(false);
    setUniEntries([]);
    setUniClient(undefined);
    setUniMetadata({ ...EMPTY_METADATA, opisVzdrzevanja: 'Vzdrževanje po pogodbi' });
    setCenaDodatno(DEFAULT_CENA_DT);
  };

  const steps = uniMode
    ? [
        { n: 1, label: 'Uvoz Excel' },
        { n: 3, label: 'Tabela del' },
        { n: 4, label: 'Povzetek' },
        { n: 5, label: 'Izvoz' },
      ]
    : [
        { n: 1, label: 'Uvoz Excel' },
        { n: 2, label: 'Izbira stranke' },
        { n: 3, label: 'Tabela del' },
        { n: 4, label: 'Povzetek' },
        { n: 5, label: 'Izvoz' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="font-bold text-xl text-blue-700">TALPAS</div>
          <div className="text-gray-400">|</div>
          <div className="text-gray-600 text-sm">Obračun vzdrževalnih del</div>
          {uniMode && uniClient && (
            <>
              <div className="text-gray-400">|</div>
              <div className="text-sm font-medium text-purple-700">{uniClient.imeNaRacunu}</div>
            </>
          )}
          {!uniMode && selectedStranka && (
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
          {steps.map(({ n, label }, idx) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-1 ${step >= n ? 'text-blue-600 font-medium' : ''}`}>
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                  step > n ? 'bg-blue-600 text-white' : step === n ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-200 text-gray-500'
                }`}>{idx + 1}</span>
                {label}
              </div>
              {idx < steps.length - 1 && <div className="w-4 h-px bg-gray-300" />}
            </React.Fragment>
          ))}
          {uniMode && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Univerza
            </span>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-12 space-y-6">

        {/* Step 1: File uploads */}
        {step === 1 && (
          <div className="space-y-6">
            <FileUpload onFileLoaded={handleFile} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-3 text-xs text-gray-400 uppercase tracking-wide">ali</span>
              </div>
            </div>
            <UniversityUpload onFileLoaded={handleUniversityFile} />
          </div>
        )}

        {/* Step 2: Client selection (standard only) */}
        {step >= 2 && !uniMode && (
          <div>
            <ClientSelector
              stranke={stranke}
              selected={selectedStranka}
              onSelect={(name, cfg) => handleSelectStranka(name, cfg)}
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
        {step >= 3 && (
          <div>
            {uniMode ? (
              <UniversityWorkTable entries={uniEntries} onChange={setUniEntries} />
            ) : (
              client && (
                <WorkTable
                  entries={entries}
                  client={client}
                  onChange={handleEntriesChange}
                />
              )
            )}
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
        {step >= 4 && (
          <div className="space-y-6">
            {uniMode ? (
              uniClient && (
                <UniversityInvoiceSummary
                  entries={uniEntries}
                  client={uniClient}
                  metadata={uniMetadata}
                  cenaDodatno={cenaDodatno}
                  onMetadataChange={setUniMetadata}
                  onCenaDodatnoChange={setCenaDodatno}
                />
              )
            ) : (
              client && (
                <InvoiceSummary
                  entries={entries}
                  client={client}
                  metadata={metadata}
                  onMetadataChange={setMetadata}
                />
              )
            )}
            <InvoiceMetadataForm
              metadata={uniMode ? uniMetadata : metadata}
              onChange={uniMode ? setUniMetadata : setMetadata}
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
        {step >= 5 && (
          uniMode ? (
            uniClient && (
              <UniversityExportButton
                entries={uniEntries}
                client={uniClient}
                metadata={uniMetadata}
                cenaDodatno={cenaDodatno}
              />
            )
          ) : (
            client && (
              <ExportButton
                entries={entries}
                client={client}
                metadata={metadata}
              />
            )
          )
        )}

        {/* Reset */}
        {step > 1 && (
          <div className="flex justify-start">
            <button
              onClick={handleReset}
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

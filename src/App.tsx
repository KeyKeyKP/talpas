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
import { loadClientRegister, findClientWithRegister, getUniverzaForStranka, isUniStranka } from './lib/clientRegister';
import { saveWorkState, loadWorkState, deleteWorkState } from './lib/workStateStore';

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
  znesekGostovanja: 0,
  opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
};

type RestoreDialogState = {
  displayName: string;
  fileName: string;
  strankaKey: string;
  savedEntries: WorkEntry[];
  savedMetadata: InvoiceMetadata;
  isUni: boolean;
} | null;

export default function App() {
  const [step, setStep] = useState(1);

  // Standard flow
  const [allEntries, setAllEntries] = useState<WorkEntry[]>([]);
  const [stranke, setStranke] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedStranka, setSelectedStranka] = useState<string | null>(null);
  const [client, setClient] = useState<ClientConfig | undefined>();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [metadata, setMetadata] = useState<InvoiceMetadata>({ ...EMPTY_METADATA });
  const [excelFileName, setExcelFileName] = useState('');

  // University flow
  const [uniMode, setUniMode] = useState(false);
  const [uniAllEntries, setUniAllEntries] = useState<WorkEntry[]>([]);
  const [uniSelectedType, setUniSelectedType] = useState<'UP' | 'UL'>('UP');
  const [uniEntries, setUniEntries] = useState<WorkEntry[]>([]);
  const [uniClient, setUniClient] = useState<ClientConfig | undefined>();
  const [uniMetadata, setUniMetadata] = useState<InvoiceMetadata>({
    ...EMPTY_METADATA,
    opisVzdrzevanja: 'Vzdrževanje po pogodbi',
  });
  const [uniExcelFileName, setUniExcelFileName] = useState('');
  const [exportedStranke, setExportedStranke] = useState<Set<string>>(new Set());

  // Restore dialog
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialogState>(null);

  useEffect(() => { loadClientRegister('/talpas'); }, []);

  // Auto-save standard flow (debounced 1s)
  useEffect(() => {
    if (!excelFileName || !selectedStranka || entries.length === 0 || restoreDialog !== null) return;
    const timer = setTimeout(() => {
      saveWorkState(excelFileName, selectedStranka, entries, metadata);
    }, 1000);
    return () => clearTimeout(timer);
  }, [entries, metadata, excelFileName, selectedStranka, restoreDialog]);

  // Auto-save uni flow (debounced 1s)
  useEffect(() => {
    if (!uniExcelFileName || uniEntries.length === 0 || restoreDialog !== null) return;
    const strankaKey = `UNI_${uniSelectedType}`;
    const timer = setTimeout(() => {
      saveWorkState(uniExcelFileName, strankaKey, uniEntries, uniMetadata);
    }, 1000);
    return () => clearTimeout(timer);
  }, [uniEntries, uniMetadata, uniExcelFileName, uniSelectedType, restoreDialog]);

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setAllEntries(parsed);
      const allStats = getStrankeStats(parsed);
      // Exclude stranke that belong to UL or UP universities
      const filtered = allStats.filter(({ name }) => getUniverzaForStranka(name) === '');
      setStranke(filtered);
      setExcelFileName(file.name);
      setExportedStranke(new Set());
      setStep(2);
    } catch (e) {
      alert('Napaka pri branju datoteke: ' + String(e));
    }
  };

  const filterForUniType = (allEntries: WorkEntry[], uniType: 'UP' | 'UL'): WorkEntry[] => {
    return allEntries.filter(e => {
      if (isUniStranka(e.stranka, uniType)) return true;
      // Fallback: skupina field (handles register not yet loaded)
      if (e.skupina) {
        const grp = e.skupina.toLowerCase();
        if (uniType === 'UP' && grp.includes('primorsk')) return true;
        if (uniType === 'UL' && grp.includes('ljubljan')) return true;
      }
      return false;
    });
  };

  const applyUniType = (allEntries: WorkEntry[], uniType: 'UP' | 'UL') => {
    const clientId = uniType === 'UP' ? 'up' : 'ul';
    const foundClient = CLIENTS.find(c => c.id === clientId);
    const filtered = filterForUniType(allEntries, uniType);

    setUniSelectedType(uniType);
    setUniClient(foundClient);
    setUniEntries(filtered);

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
    setUniMetadata(m => ({
      ...m,
      znesekVzdrzevanja: foundClient?.znesekVzdrzevanja ?? 0,
      obdobjeOd,
      obdobjeDo,
    }));
  };

  const handleUniversityFile = async (file: File, uniType: 'UP' | 'UL') => {
    try {
      const parsed = await parseExcel(file);
      setUniAllEntries(parsed);
      setUniMode(true);
      applyUniType(parsed, uniType);
      setUniExcelFileName(file.name);
      setStep(3);

      const strankaKey = `UNI_${uniType}`;
      const saved = loadWorkState(file.name, strankaKey);
      if (saved) {
        setRestoreDialog({
          displayName: uniType === 'UP' ? 'UP – Univerza na Primorskem' : 'UL – Univerza v Ljubljani',
          fileName: file.name,
          strankaKey,
          savedEntries: saved.entries,
          savedMetadata: saved.metadata,
          isUni: true,
        });
      }
    } catch (e) {
      alert('Napaka pri branju datoteke: ' + String(e));
    }
  };

  const handleUniTypeChange = (uniType: 'UP' | 'UL') => {
    applyUniType(uniAllEntries, uniType);

    if (uniExcelFileName) {
      const strankaKey = `UNI_${uniType}`;
      const saved = loadWorkState(uniExcelFileName, strankaKey);
      if (saved) {
        setRestoreDialog({
          displayName: uniType === 'UP' ? 'UP – Univerza na Primorskem' : 'UL – Univerza v Ljubljani',
          fileName: uniExcelFileName,
          strankaKey,
          savedEntries: saved.entries,
          savedMetadata: saved.metadata,
          isUni: true,
        });
      }
    }
  };

  const handleSelectStranka = (stranka: string, _passedConfig: ClientConfig | undefined) => {
    setSelectedStranka(stranka);
    // Always do a fresh register lookup here – guarantees we get the loaded register data
    const cfg = findClientWithRegister(stranka) ?? {
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
      znesekGostovanja: cfg.gostovanj ?? 0,
      opisVzdrzevanja: cfg.opisVzdrzevanja,
      obdobjeOd,
      obdobjeDo,
    }));

    if (excelFileName) {
      const saved = loadWorkState(excelFileName, stranka);
      if (saved) {
        setRestoreDialog({
          displayName: stranka,
          fileName: excelFileName,
          strankaKey: stranka,
          savedEntries: saved.entries,
          savedMetadata: saved.metadata,
          isUni: false,
        });
      }
    }
  };

  const handleRestoreConfirm = () => {
    if (!restoreDialog) return;
    if (restoreDialog.isUni) {
      setUniEntries(restoreDialog.savedEntries);
      setUniMetadata(restoreDialog.savedMetadata);
    } else {
      setEntries(restoreDialog.savedEntries);
      setMetadata(restoreDialog.savedMetadata);
    }
    setRestoreDialog(null);
  };

  const handleRestoreDiscard = () => {
    if (!restoreDialog) return;
    deleteWorkState(restoreDialog.fileName, restoreDialog.strankaKey);
    setRestoreDialog(null);
  };

  const handleExported = (name: string) => {
    setExportedStranke(prev => new Set([...prev, name]));
    if (excelFileName && window.confirm(`Račun za "${name}" izvožen. Želite pobrisati shranjeno delo za to stranko?`)) {
      deleteWorkState(excelFileName, name);
    }
  };

  const handleUniExported = () => {
    const strankaKey = `UNI_${uniSelectedType}`;
    if (uniExcelFileName && window.confirm('Račun za univerzo izvožen. Želite pobrisati shranjeno delo?')) {
      deleteWorkState(uniExcelFileName, strankaKey);
    }
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
    setExcelFileName('');
    // University
    setUniMode(false);
    setUniAllEntries([]);
    setUniSelectedType('UP');
    setUniEntries([]);
    setUniClient(undefined);
    setUniMetadata({ ...EMPTY_METADATA, opisVzdrzevanja: 'Vzdrževanje po pogodbi' });
    setUniExcelFileName('');
    setExportedStranke(new Set());
    setRestoreDialog(null);
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

        {/* Step 2: Client selection (standard) */}
        {step >= 2 && !uniMode && (
          <div>
            <ClientSelector
              stranke={stranke}
              selected={selectedStranka}
              onSelect={(name, cfg) => handleSelectStranka(name, cfg)}
              exportedStranke={exportedStranke}
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
              <div className="space-y-3">
                {/* UP/UL dropdown above the work table */}
                <div className="bg-white rounded-xl shadow px-6 py-4 flex items-center gap-6">
                  <span className="text-sm font-medium text-gray-600">Univerza:</span>
                  {(['UP', 'UL'] as const).map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="uniTypeFilter"
                        value={t}
                        checked={uniSelectedType === t}
                        onChange={() => handleUniTypeChange(t)}
                        className="accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t === 'UP' ? 'UP – Univerza na Primorskem' : 'UL – Univerza v Ljubljani'}
                      </span>
                    </label>
                  ))}
                  <span className="text-xs text-gray-400 ml-auto">{uniEntries.length} vnosov</span>
                </div>
                <UniversityWorkTable entries={uniEntries} onChange={setUniEntries} />
              </div>
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
                  onMetadataChange={setUniMetadata}
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
                onExported={handleUniExported}
              />
            )
          ) : (
            client && (
              <ExportButton
                entries={entries}
                client={client}
                metadata={metadata}
                strankaName={selectedStranka ?? ''}
                onExported={handleExported}
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

      {/* Restore dialog */}
      {restoreDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-2xl mb-3">💾</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Najdeno shranjeno delo</h3>
            <p className="text-gray-600 mb-6">
              Najdeno shranjeno delo za{' '}
              <strong className="text-gray-800">{restoreDialog.displayName}</strong>.
              Želite nadaljevati?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRestoreDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Začni znova
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Nadaljuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

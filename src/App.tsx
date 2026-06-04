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
import VisExportButton from './components/VisExportButton';
import { parseExcel, getStrankeStats } from './lib/excelParser';
import { applyBillingRules } from './lib/billingEngine';
import { WorkEntry, ClientConfig, InvoiceMetadata } from './lib/types';
import { CLIENTS } from './data/clients';
import { loadClientRegister, findClientWithRegister, getUniverzaForStranka, isUniStranka, isVisStranka } from './lib/clientRegister';
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
  target: 'standard' | 'uni' | 'vis';
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

  // VIS flow
  const [visMode, setVisMode] = useState(false);
  const [visAllEntries, setVisAllEntries] = useState<WorkEntry[]>([]);
  const [visFakultete, setVisFakultete] = useState<Array<{ name: string; count: number }>>([]);
  const [visSelectedFakulteta, setVisSelectedFakulteta] = useState<string | null>(null);
  const [visClient, setVisClient] = useState<ClientConfig | undefined>();
  const [visEntries, setVisEntries] = useState<WorkEntry[]>([]);
  const [visMetadata, setVisMetadata] = useState<InvoiceMetadata>({ ...EMPTY_METADATA });
  const [visExcelFileName, setVisExcelFileName] = useState('');
  const [visExportedFakultete, setVisExportedFakultete] = useState<Set<string>>(new Set());

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

  // Auto-save VIS flow (debounced 1s)
  useEffect(() => {
    if (!visExcelFileName || !visSelectedFakulteta || visEntries.length === 0 || restoreDialog !== null) return;
    const strankaKey = `VIS_${visSelectedFakulteta}`;
    const timer = setTimeout(() => {
      saveWorkState(visExcelFileName, strankaKey, visEntries, visMetadata);
    }, 1000);
    return () => clearTimeout(timer);
  }, [visEntries, visMetadata, visExcelFileName, visSelectedFakulteta, restoreDialog]);

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setAllEntries(parsed);
      const allStats = getStrankeStats(parsed);
      // Exclude UP, UL, VIS entries from standard client list
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

  const handleUniversityFile = async (file: File, uniType: 'UP' | 'UL' | 'VIS') => {
    if (uniType === 'VIS') {
      try {
        const parsed = await parseExcel(file);
        const visFiltered = parsed.filter(e =>
          e.skupina?.toLowerCase() === 'vis' || isVisStranka(e.stranka)
        );
        const stats = getStrankeStats(visFiltered);
        setVisAllEntries(visFiltered);
        setVisFakultete(stats);
        setVisMode(true);
        setUniMode(false);
        setVisExcelFileName(file.name);
        setStep(2);
      } catch (e) {
        alert('Napaka pri branju datoteke: ' + String(e));
      }
      return;
    }

    try {
      const parsed = await parseExcel(file);
      setUniAllEntries(parsed);
      setUniMode(true);
      setVisMode(false);
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
          target: 'uni',
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
          target: 'uni',
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
          target: 'standard',
        });
      }
    }
  };

  const handleVisSelectFakulteta = (fakulteta: string, _cfg: ClientConfig | undefined) => {
    setVisSelectedFakulteta(fakulteta);
    const cfg = findClientWithRegister(fakulteta) ?? {
      id: fakulteta.toLowerCase().replace(/\s+/g, '-'),
      imeZaIskanje: [fakulteta.toLowerCase()],
      imeNaRacunu: fakulteta,
      naslov: '', posta: '', kraj: '', idDDV: '',
      cenaDt: 48, cenaDi: 70,
      znesekVzdrzevanja: 0,
      opisVzdrzevanja: 'Vzdrževanje po Pogodbi o vzdrževanju IT opreme',
      billingType: 'standard' as const,
    };
    setVisClient(cfg);

    const filtered = visAllEntries.filter(e => e.stranka === fakulteta);
    setVisEntries(filtered);

    const validDates = filtered.map(e => e.datum).filter(d => !isNaN(d.getTime()));
    let obdobjeOd = '', obdobjeDo = '';
    if (validDates.length) {
      const year = validDates[0].getFullYear();
      const month = validDates[0].getMonth();
      obdobjeOd = fmtDate(new Date(year, month, 1));
      obdobjeDo = fmtDate(new Date(year, month + 1, 0));
    }
    setVisMetadata(m => ({
      ...m,
      znesekVzdrzevanja: cfg.znesekVzdrzevanja,
      znesekGostovanja: cfg.gostovanj ?? 0,
      opisVzdrzevanja: cfg.opisVzdrzevanja,
      obdobjeOd,
      obdobjeDo,
    }));

    if (visExcelFileName) {
      const strankaKey = `VIS_${fakulteta}`;
      const saved = loadWorkState(visExcelFileName, strankaKey);
      if (saved) {
        setRestoreDialog({
          displayName: fakulteta,
          fileName: visExcelFileName,
          strankaKey,
          savedEntries: saved.entries,
          savedMetadata: saved.metadata,
          target: 'vis',
        });
      }
    }
  };

  const handleVisExported = (name: string) => {
    setVisExportedFakultete(prev => new Set([...prev, name]));
    if (visExcelFileName && window.confirm(`Račun za "${name}" izvožen. Želite pobrisati shranjeno delo?`)) {
      deleteWorkState(visExcelFileName, `VIS_${name}`);
    }
  };

  const handleRestoreConfirm = () => {
    if (!restoreDialog) return;
    if (restoreDialog.target === 'uni') {
      setUniEntries(restoreDialog.savedEntries);
      setUniMetadata(restoreDialog.savedMetadata);
    } else if (restoreDialog.target === 'vis') {
      setVisEntries(restoreDialog.savedEntries);
      setVisMetadata(restoreDialog.savedMetadata);
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

  const canProceedToStep3 =
    (!uniMode && !visMode && selectedStranka !== null && entries.length > 0) ||
    (visMode && visSelectedFakulteta !== null && visEntries.length > 0);

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
    // VIS
    setVisMode(false);
    setVisAllEntries([]);
    setVisFakultete([]);
    setVisSelectedFakulteta(null);
    setVisClient(undefined);
    setVisEntries([]);
    setVisMetadata({ ...EMPTY_METADATA });
    setVisExcelFileName('');
    setVisExportedFakultete(new Set());
    setRestoreDialog(null);
  };

  const steps = visMode
    ? [
        { n: 1, label: 'Uvoz Excel' },
        { n: 2, label: 'Izbira fakultete' },
        { n: 3, label: 'Tabela del' },
        { n: 4, label: 'Povzetek' },
        { n: 5, label: 'Izvoz' },
      ]
    : uniMode
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
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-[#1e293b] h-14 flex items-center">
        <div className="max-w-[1400px] mx-auto px-8 w-full flex items-center gap-4">
          <div className="font-bold text-lg text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>TALPAS</div>
          <div className="h-4 w-px bg-slate-600" />
          {uniMode && uniClient && (
            <span className="text-sm font-medium text-violet-300">{uniClient.imeNaRacunu}</span>
          )}
          {visMode && visSelectedFakulteta && (
            <span className="text-sm font-medium text-orange-300">{visSelectedFakulteta}</span>
          )}
          {!uniMode && !visMode && selectedStranka && (
            <span className="text-sm font-medium text-slate-300">{selectedStranka}</span>
          )}
          <div className="flex-1" />
          <div className="text-slate-400 text-sm">Obračun vzdrževalnih del</div>
        </div>
      </header>

      {/* Steps */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-3 flex items-center gap-1">
          {steps.map(({ n, label }, idx) => {
            const done = step > n;
            const active = step === n;
            return (
              <React.Fragment key={n}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-semibold shrink-0 ${
                    done ? 'bg-emerald-100 text-emerald-600' :
                    active ? 'bg-blue-600 text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? '✓' : idx + 1}
                  </span>
                  <span className={`text-sm ${
                    active ? 'font-semibold text-slate-800' :
                    done ? 'text-slate-500' :
                    'text-slate-400'
                  }`}>{label}</span>
                </div>
                {idx < steps.length - 1 && <div className="w-6 h-px bg-slate-200 mx-1" />}
              </React.Fragment>
            );
          })}
          {uniMode && (
            <span className="ml-3 text-[11px] font-semibold bg-violet-100 text-violet-600 px-2.5 py-0.5 rounded-full">Univerza</span>
          )}
          {visMode && (
            <span className="ml-3 text-[11px] font-semibold bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full">VIS</span>
          )}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-8 pb-16 pt-6 space-y-5">

        {/* Step 1: File uploads */}
        {step === 1 && (
          <div className="space-y-5 max-w-2xl">
            <FileUpload onFileLoaded={handleFile} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#f8fafc] px-4 text-xs text-slate-400 uppercase tracking-widest font-medium">ali</span>
              </div>
            </div>
            <UniversityUpload onFileLoaded={handleUniversityFile} />
          </div>
        )}

        {/* Step 2: Client/Faculty selection */}
        {step >= 2 && !uniMode && !visMode && (
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
                  className="h-10 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-150 shadow-sm"
                >
                  Nadaljuj →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: VIS faculty selection */}
        {step >= 2 && visMode && (
          <div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">Izberi fakulteto za obračun</h2>
                <p className="text-sm text-slate-400 mt-0.5">{visFakultete.length} fakultet · VIS</p>
              </div>
              <div className="divide-y divide-slate-100">
                {visFakultete.map(({ name, count }) => {
                  const isSelected = visSelectedFakulteta === name;
                  const isExported = visExportedFakultete.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => handleVisSelectFakulteta(name, undefined)}
                      className={`w-full text-left px-6 py-3 flex items-center justify-between transition-colors duration-150 ${
                        isExported ? 'border-l-[3px] border-red-400 bg-red-50/40 pl-[21px]'
                        : isSelected ? 'bg-orange-50 border-l-[3px] border-orange-500 pl-[21px]'
                        : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-orange-800' : 'text-slate-700'}`}>{name}</span>
                      <span className="text-sm text-slate-400 font-mono tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {canProceedToStep3 && step === 2 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep(3)}
                  className="h-10 px-6 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm transition-colors duration-150 shadow-sm"
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
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-3.5 flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">Univerza:</span>
                  {(['UP', 'UL'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleUniTypeChange(t)}
                      className={`h-8 px-4 rounded-full text-sm font-medium transition-all duration-150 ${
                        uniSelectedType === t
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t === 'UP' ? 'UP – Primorska' : 'UL – Ljubljana'}
                    </button>
                  ))}
                  <span className="text-sm text-slate-400 ml-auto">{uniEntries.length} vnosov</span>
                </div>
                <UniversityWorkTable entries={uniEntries} onChange={setUniEntries} />
              </div>
            ) : visMode ? (
              <UniversityWorkTable entries={visEntries} onChange={setVisEntries} />
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
                  className="h-10 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-150 shadow-sm"
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
            ) : visMode ? (
              visClient && (
                <UniversityInvoiceSummary
                  entries={visEntries}
                  client={visClient}
                  metadata={visMetadata}
                  onMetadataChange={setVisMetadata}
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
              metadata={visMode ? visMetadata : uniMode ? uniMetadata : metadata}
              onChange={visMode ? setVisMetadata : uniMode ? setUniMetadata : setMetadata}
            />
            {step === 4 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(5)}
                  className="h-10 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-150 shadow-sm"
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
          ) : visMode ? (
            visClient && (
              <VisExportButton
                entries={visEntries}
                client={visClient}
                metadata={visMetadata}
                fakultetaName={visSelectedFakulteta ?? ''}
                onExported={handleVisExported}
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
          <div className="flex justify-start pt-2">
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150"
            >
              ← Začni znova
            </button>
          </div>
        )}
      </main>

      {/* Restore dialog */}
      {restoreDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Najdeno shranjeno delo</h3>
            <p className="text-slate-500 text-sm mb-6">
              Za <strong className="text-slate-700">{restoreDialog.displayName}</strong> obstaja shranjeno stanje. Želite nadaljevati od tam?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRestoreDiscard}
                className="h-9 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Začni znova
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="h-9 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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

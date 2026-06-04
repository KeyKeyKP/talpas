import { WorkEntry, ClientConfig } from '../lib/types';
import WorkRow from './WorkRow';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig | undefined;
  onChange: (entries: WorkEntry[]) => void;
}

const TH = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400';

export default function WorkTable({ entries, client, onChange }: Props) {
  const showStatus = client?.billingType === 'included_hours' || client?.billingType === 'threshold';
  const isUmbrella = client?.billingType === 'umbrella';

  const updateEntry = (updated: WorkEntry) =>
    onChange(entries.map(e => e.id === updated.id ? updated : e));

  const uncategorized = entries.filter(e => e.vrstaDela === null).length;

  const renderTable = (rows: WorkEntry[], title?: string) => (
    <div className="mb-6 last:mb-0">
      {title && (
        <div className="bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-t-lg flex items-center">
          <span>{title}</span>
          <span className="ml-2 text-slate-400 text-xs font-normal">({rows.length})</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: showStatus ? '16%' : '18%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: showStatus ? '35%' : '42%' }} />
            <col style={{ width: '9%' }} />
            {showStatus && <col style={{ width: '10%' }} />}
          </colgroup>
          <thead className="border-b-2 border-slate-200">
            <tr>
              <th className={TH}>Delo</th>
              <th className={TH}>Datum</th>
              <th className={TH}>Kontakt</th>
              <th className={TH}>Vrsta</th>
              <th className={TH}>Ure</th>
              <th className={TH}>Opis</th>
              <th className={TH}>Opravil</th>
              {showStatus && <th className={TH + ' text-center'}>Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(e => (
              <WorkRow key={e.id} entry={e} showStatus={showStatus} onChange={updateEntry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Tabela del</h2>
          <p className="text-sm text-slate-400 mt-0.5">{entries.length} vnosov</p>
        </div>
        {uncategorized > 0 && (
          <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            {uncategorized} neoznačenih
          </span>
        )}
      </div>

      <div className="px-6 py-4">
        {isUmbrella ? (
          (() => {
            const byStranka: Record<string, WorkEntry[]> = {};
            for (const e of entries) {
              if (!byStranka[e.stranka]) byStranka[e.stranka] = [];
              byStranka[e.stranka].push(e);
            }
            return Object.entries(byStranka).map(([stranka, rows]) =>
              renderTable(rows, stranka)
            );
          })()
        ) : (
          renderTable(entries)
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { WorkEntry, ClientConfig } from '../lib/types';
import WorkRow from './WorkRow';

interface Props {
  entries: WorkEntry[];
  client: ClientConfig | undefined;
  onChange: (entries: WorkEntry[]) => void;
}

export default function WorkTable({ entries, client, onChange }: Props) {
  const showStatus = client?.billingType === 'included_hours' || client?.billingType === 'threshold';
  const isUmbrella = client?.billingType === 'umbrella';

  const updateEntry = (updated: WorkEntry) =>
    onChange(entries.map(e => e.id === updated.id ? updated : e));

  const uncategorized = entries.filter(e => e.vrstaDela === null).length;

  const renderTable = (rows: WorkEntry[], title?: string) => (
    <div className="mb-6">
      {title && (
        <div className="bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-t-lg">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Delo</th>
              <th className="px-3 py-2 text-left">Datum</th>
              <th className="px-3 py-2 text-left">Kontakt</th>
              <th className="px-3 py-2 text-left">Vrsta</th>
              <th className="px-3 py-2 text-left">Ure</th>
              <th className="px-3 py-2 text-left">Opis</th>
              <th className="px-3 py-2 text-left">Opravil</th>
              {showStatus && <th className="px-3 py-2 text-center">Status</th>}
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
    <div className="bg-white rounded-xl shadow">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Tabela del ({entries.length} vnosov)</h2>
        {uncategorized > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
            ⚠ {uncategorized} vnosov brez kategorije
          </span>
        )}
      </div>

      <div className="px-6 pb-5">
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

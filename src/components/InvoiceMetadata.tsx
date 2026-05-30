import React from 'react';
import type { InvoiceMetadata } from '../lib/types';
import { DEFAULT_VZDRZEVANJE_OPIS } from '../config/constants';

interface Props {
  metadata: InvoiceMetadata;
  onChange: (changes: Partial<InvoiceMetadata>) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-yellow-300 bg-yellow-50 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400";

export function InvoiceMetadataForm({ metadata, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4">Podatki računa</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Številka računa">
          <input
            className={inputCls}
            value={metadata.stevilkaRacuna}
            onChange={e => onChange({ stevilkaRacuna: e.target.value })}
            placeholder="npr. 202600534"
          />
        </Field>
        <Field label="Datum računa">
          <input
            type="date"
            className={inputCls}
            value={metadata.datumRacuna}
            onChange={e => onChange({ datumRacuna: e.target.value })}
          />
        </Field>
        <Field label="Rok plačila (valuta)">
          <input
            type="date"
            className={inputCls}
            value={metadata.rokPlacila}
            onChange={e => onChange({ rokPlacila: e.target.value })}
          />
        </Field>
        <div className="flex gap-2">
          <Field label="Obdobje od">
            <input
              type="date"
              className={inputCls}
              value={metadata.obdobjeOd}
              onChange={e => onChange({ obdobjeOd: e.target.value })}
            />
          </Field>
          <Field label="do">
            <input
              type="date"
              className={inputCls}
              value={metadata.obdobjeDo}
              onChange={e => onChange({ obdobjeDo: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Znesek vzdrževanja (EUR brez DDV)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={metadata.znesekVzdrzevanja || ''}
            onChange={e => onChange({ znesekVzdrzevanja: parseFloat(e.target.value) || 0 })}
            placeholder="580.00"
          />
        </Field>
        <Field label="Opis vzdrževanja">
          <input
            className={inputCls + " col-span-2"}
            value={metadata.opisVzdrzevanja}
            onChange={e => onChange({ opisVzdrzevanja: e.target.value })}
            placeholder={DEFAULT_VZDRZEVANJE_OPIS}
          />
        </Field>
      </div>
    </div>
  );
}

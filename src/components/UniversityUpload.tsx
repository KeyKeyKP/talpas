import { useRef, useState } from 'react';

interface Props {
  onFileLoaded: (file: File, uniType: 'UP' | 'UL' | 'VIS') => void;
}

const TYPE_LABELS: Record<'UP' | 'UL' | 'VIS', string> = {
  UP: 'UP – Primorska',
  UL: 'UL – Ljubljana',
  VIS: 'VIS',
};

export default function UniversityUpload({ onFileLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uniType, setUniType] = useState<'UP' | 'UL' | 'VIS'>('UP');

  const handle = (file: File) => {
    if (file.name.match(/\.xlsx?$/i)) onFileLoaded(file, uniType);
    else alert('Prosim naloži Excel datoteko (.xlsx ali .xls).');
  };

  return (
    <div className="space-y-4">
      {/* Type pills */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Tip:</span>
        {(['UP', 'UL', 'VIS'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setUniType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
              uniType === t
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragging ? 'border-violet-400 bg-violet-50' : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-slate-50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
      >
        <div className="flex justify-center mb-3">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="text-slate-300">
            <path d="M24 8v20M16 16l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 32v4a4 4 0 004 4h24a4 4 0 004-4v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">
          Uvozi Excel – {uniType === 'VIS' ? 'VIS – Samostojne fakultete' : `Univerza (${uniType})`}
        </p>
        <p className="text-sm text-slate-400">Stolpec STRANKA = naziv fakultete · drag & drop ali klik</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handle(e.target.files[0]); }}
        />
      </div>
    </div>
  );
}

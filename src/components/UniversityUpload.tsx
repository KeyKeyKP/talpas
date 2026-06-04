import { useRef, useState } from 'react';

interface Props {
  onFileLoaded: (file: File, uniType: 'UP' | 'UL' | 'VIS') => void;
}

export default function UniversityUpload({ onFileLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uniType, setUniType] = useState<'UP' | 'UL' | 'VIS'>('UP');

  const handle = (file: File) => {
    if (file.name.match(/\.xlsx?$/i)) onFileLoaded(file, uniType);
    else alert('Prosim naloži Excel datoteko (.xlsx ali .xls).');
  };

  return (
    <div className="space-y-3">
      {/* UP/UL radio */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-gray-600">Univerza:</span>
        {(['UP', 'UL', 'VIS'] as const).map(t => (
          <label key={t} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="uniType"
              value={t}
              checked={uniType === t}
              onChange={() => setUniType(t)}
              className="accent-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">
              {t === 'UP' ? 'UP – Univerza na Primorskem' : t === 'UL' ? 'UL – Univerza v Ljubljani' : 'VIS – Samostojne fakultete'}
            </span>
          </label>
        ))}
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-purple-500 bg-purple-50' : 'border-purple-300 bg-white hover:border-purple-400'
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
        <div className="text-3xl mb-2">🏫</div>
        <p className="text-base font-medium text-purple-700">
          Uvozi Excel – {uniType === 'VIS' ? 'VIS' : `Univerza (${uniType})`}
        </p>
        <p className="text-xs text-gray-500 mt-1">Stolpec STRANKA = naziv fakultete · drag & drop ali klik</p>
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

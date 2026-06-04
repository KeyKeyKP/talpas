import { useRef, useState } from 'react';

interface Props {
  onFileLoaded: (file: File) => void;
}

export default function FileUpload({ onFileLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File) => {
    if (file.name.match(/\.xlsx?$/i)) onFileLoaded(file);
    else alert('Prosim naloži Excel datoteko (.xlsx ali .xls).');
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
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
      <div className="flex justify-center mb-4">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-slate-300">
          <rect x="8" y="4" width="24" height="32" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M32 4l8 8v28a3 3 0 01-3 3H11a3 3 0 01-3-3V7a3 3 0 013-3h21z" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M32 4v8h8" stroke="currentColor" strokeWidth="2"/>
          <path d="M18 22h12M18 28h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1">Standardni uvoz Excel</p>
      <p className="text-sm text-slate-400">Povleci datoteko sem ali klikni za izbiro (.xlsx)</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handle(e.target.files[0]); }}
      />
    </div>
  );
}

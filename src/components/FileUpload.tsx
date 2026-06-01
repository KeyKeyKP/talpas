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
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
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
      <div className="text-4xl mb-3">📂</div>
      <p className="text-lg font-medium text-gray-700">Povleci Excel datoteko sem</p>
      <p className="text-sm text-gray-500 mt-1">ali klikni za izbiro datoteke (.xlsx)</p>
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

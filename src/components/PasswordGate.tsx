import { useState, useEffect, type ReactNode } from 'react';

const APP_PASSWORD = 'Testiramo2026';
const STORAGE_KEY = 'talpas_authed';

interface Props {
  children: ReactNode;
}

export function PasswordGate({ children }: Props) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') setAuthed(true);
  }, []);

  if (authed) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === APP_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setPw('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <img src={`${import.meta.env.BASE_URL}talpas-logo.jpg`} alt="TALPAS" className="h-12 mb-3 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-xl font-bold text-gray-800">TALPAS – Obračun</h1>
          <p className="text-sm text-gray-500 mt-1">Vnesi dostopno geslo</p>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          placeholder="Geslo"
          autoFocus
          className={`w-full border-2 rounded-lg px-4 py-2 mb-3 focus:outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'
          }`}
        />
        {error && <p className="text-sm text-red-500 mb-3">Napačno geslo</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          Vstopi
        </button>
      </form>
    </div>
  );
}

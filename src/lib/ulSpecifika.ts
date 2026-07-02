import * as XLSX from 'xlsx';

// Mesečni zneski osnovnega vzdrževanja za posamezne UL fakultete (iz public/assets/UL_specifika.xlsx).
// Stolpec A = "Osnovno vzdrževanje in podpora {kratica}", stolpec B = mesečni znesek (EUR).
// SAMO za UL workflow – UP in standardne stranke tega ne uporabljajo.

export interface UlFakulteta {
  kratica: string;
  znesek: number | null; // null = brez mesečnega zneska (samo postavka, izpolni se ročno)
}

const ulFakultete: UlFakulteta[] = [];

const OSNOVNO_PREFIX = 'osnovno vzdrževanje in podpora';

function extractKratica(postavka: string): string {
  const s = (postavka ?? '').trim();
  if (s.toLowerCase().startsWith(OSNOVNO_PREFIX)) {
    // Odstrani predpono + morebiten vodilni pomišljaj/vezaj ("– Rektorat" → "Rektorat").
    // ‐-― = tipografski pomišljaji (vključno z en-dash –), plus navaden ASCII -.
    return s.slice(OSNOVNO_PREFIX.length).replace(/^[\s‐-―-]+/, '').trim();
  }
  // Brez predpone (npr. "UL VO", "UL STAT", "UL BM") → cela vrednost je kratica.
  return s;
}

// Normalizacija kratice za ujemanje (delovni Excel vs UL_specifika):
// trim, uppercase, brez presledkov IN pomišljajev ("UL VO" = "UL-VO" = "ULVO").
export function normKratica(s: string): string {
  return (s ?? '').trim().toUpperCase().replace(/[\s‐-―-]/g, '');
}

// Znane tipkarske napake v UL_specifika.xlsx – kratica se drugod (Stranke.xlsx, delovni Excel)
// piše pravilno, zato jo ob nalaganju popravimo, da se povsod ujema in pravilno izpiše.
const KRATICA_TYPO: Record<string, string> = {
  AGRTF: 'AGRFT', // v UL_specifika zamenjana T/F
};

// Delovni Excel poimenuje Rektorat kot "UL" ali "Univerza v Ljubljani".
// Preslikava normaliziranega delovnega imena → kanonična UL_specifika kratica (normalizirana).
const DELOVNI_ALIAS: Record<string, string> = {
  UL: 'REKTORAT',
  UNIVERZAVLJUBLJANI: 'REKTORAT',
};

// Kanonični ključ za ujemanje UL fakultet (delovni Excel ↔ UL_specifika ↔ register).
// Enak za "UL", "Univerza v Ljubljani" in "Rektorat" → vsi so ista fakulteta.
export function canonUlKey(name: string): string {
  const n = normKratica(name);
  return DELOVNI_ALIAS[n] ?? n;
}

// Fiksni vrstni red UL fakultet: Rektorat, UL Biomedicina, UL Statistika, UL Varstvo okolja,
// nato vse ostale po abecedi. Uporabljeno na računu, v prilogi in v povzetku.
const ORDER_FIXED = ['REKTORAT', 'ULBM', 'ULSTAT', 'ULVO'];
export function ulOrderRank(name: string): number {
  const i = ORDER_FIXED.indexOf(canonUlKey(name));
  return i === -1 ? ORDER_FIXED.length : i;
}

export async function loadUlSpecifika(basePath = '/talpas'): Promise<void> {
  try {
    // Cache-bust: podatkovna datoteka se spreminja – vedno naloži svežo (brskalnik/CDN cache).
    const res = await fetch(`${basePath}/assets/UL_specifika.xlsx?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    ulFakultete.length = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const postavka = String(row?.[0] ?? '').trim();
      if (!postavka) continue;
      const rawZnesek = row?.[1];
      const znesek = (rawZnesek === undefined || rawZnesek === null || String(rawZnesek).trim() === '')
        ? null // brez mesečnega zneska
        : (parseFloat(String(rawZnesek).replace(',', '.')) || 0);
      const extracted = extractKratica(postavka);
      if (!extracted) continue;
      const kratica = KRATICA_TYPO[extracted] ?? extracted;
      ulFakultete.push({ kratica, znesek });
    }
    // Vrstni red: Rektorat, UL Biomedicina, UL Statistika, UL Varstvo okolja, nato po abecedi.
    ulFakultete.sort((a, b) => {
      const ra = ulOrderRank(a.kratica), rb = ulOrderRank(b.kratica);
      if (ra !== rb) return ra - rb;
      return a.kratica.localeCompare(b.kratica, 'sl');
    });
  } catch (e) {
    console.warn('UL specifika ni bila naložena:', e);
  }
}

export function getUlFakultete(): UlFakulteta[] {
  return [...ulFakultete];
}

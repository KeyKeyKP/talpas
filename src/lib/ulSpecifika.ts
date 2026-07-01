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

export async function loadUlSpecifika(basePath = '/talpas'): Promise<void> {
  try {
    const res = await fetch(`${basePath}/assets/UL_specifika.xlsx`);
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
      const kratica = extractKratica(postavka);
      if (!kratica) continue;
      ulFakultete.push({ kratica, znesek });
    }
    // Rektorat prvi, ostale abecedno po kratici.
    const jeRektorat = (k: string) => /rektorat/i.test(k);
    ulFakultete.sort((a, b) => {
      const ar = jeRektorat(a.kratica), br = jeRektorat(b.kratica);
      if (ar !== br) return ar ? -1 : 1;
      return a.kratica.localeCompare(b.kratica, 'sl');
    });
  } catch (e) {
    console.warn('UL specifika ni bila naložena:', e);
  }
}

export function getUlFakultete(): UlFakulteta[] {
  return [...ulFakultete];
}

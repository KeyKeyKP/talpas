import * as XLSX from 'xlsx';

// Mesečni zneski osnovnega vzdrževanja za posamezne UL fakultete (iz public/assets/UL_specifika.xlsx).
// Stolpec A = "Osnovno vzdrževanje in podpora {kratica}", stolpec B = mesečni znesek (EUR).
// SAMO za UL workflow – UP in standardne stranke tega ne uporabljajo.

export interface UlFakulteta {
  kratica: string;      // kratica iz UL_specifika (izpisana na računu): "FA", "ALUO", "Rektorat" …
  naziv: string;        // polni naziv (povzetek, priloga, ujemanje in razvrščanje po abecedi)
  znesek: number | null; // null = brez mesečnega zneska (samo postavka, izpolni se ročno)
}

// Metapodatki UL fakultet: normalizirana kratica (UL_specifika) → polni naziv + prioriteta + dodatni aliasi.
// UL_specifika uporablja kratice (FA, FF, MF …), delovni Excel pa v 'stranka' pogosto POLNI naziv
// (npr. "Akademija za likovno umetnost in oblikovanje"). Naziv zato omogoča pravilno ujemanje.
// Naziv-i so povzeti iz Stranke.xlsx (stolpec B) za vsako UL-fakulteto.
interface UlMeta { naziv: string; priority?: number; aliases?: string[] }
const UL_META: Record<string, UlMeta> = {
  // Fiksni vrstni red (priority 0–3): Rektorat, UL Biomedicina, UL Statistika, UL Varstvo okolja.
  REKTORAT: { naziv: 'Rektorat', priority: 0, aliases: ['UL', 'Univerza v Ljubljani'] },
  ULBM:     { naziv: 'UL Biomedicina', priority: 1, aliases: ['UL-BM'] },
  ULSTAT:   { naziv: 'UL Statistika', priority: 2, aliases: ['UL-STAT'] },
  ULVO:     { naziv: 'UL Varstvo okolja', priority: 3, aliases: ['UL-VO'] },
  // Ostale po abecedi (naziv), aliasi kjer se delovno ime razlikuje od kratice.
  AG:    { naziv: 'Akademija za glasbo' },
  AGRFT: { naziv: 'Akademija za gledališče, radio, film in televizijo', aliases: ['AGRTF'] },
  ALUO:  { naziv: 'Akademija za likovno umetnost in oblikovanje' },
  BF:    { naziv: 'Biotehniška fakulteta' },
  FA:    { naziv: 'Fakulteta za arhitekturo' },
  FDV:   { naziv: 'Fakulteta za družbene vede' },
  FF:    { naziv: 'Filozofska fakulteta' },
  FFA:   { naziv: 'Fakulteta za farmacijo' },
  FGG:   { naziv: 'Fakulteta za gradbeništvo in geodezijo' },
  FMF:   { naziv: 'Fakulteta za matematiko in fiziko' },
  FPP:   { naziv: 'Fakulteta za pomorstvo in promet' },
  FS:    { naziv: 'Fakulteta za strojništvo' },
  FSD:   { naziv: 'Fakulteta za socialno delo' },
  'FŠ':  { naziv: 'Fakulteta za šport' },
  MF:    { naziv: 'Medicinska fakulteta' },
  NTF:   { naziv: 'Naravoslovnotehniška fakulteta' },
  PEF:   { naziv: 'Pedagoška fakulteta UL' },
  PF:    { naziv: 'Pravna fakulteta' },
  TEOF:  { naziv: 'Teološka fakulteta' },
  VF:    { naziv: 'Veterinarska fakulteta' },
  ZF:    { naziv: 'Zdravstvena fakulteta' },
};

// Znane tipkarske napake v UL_specifika.xlsx – kratica se drugod (Stranke.xlsx, delovni Excel)
// piše pravilno, zato jo ob nalaganju popravimo, da se povsod ujema in pravilno izpiše.
const KRATICA_TYPO: Record<string, string> = {
  AGRTF: 'AGRFT', // v UL_specifika zamenjana T/F
};

const ulFakultete: UlFakulteta[] = [];
// Indeks za ujemanje: normaliziran alias (kratica / naziv / dodatni alias) → kratica (UL_specifika).
const aliasIndex = new Map<string, string>();

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

// Normalizacija kratice/naziva za ujemanje: trim, uppercase, brez presledkov IN pomišljajev
// ("UL VO" = "UL-VO" = "ULVO").
export function normKratica(s: string): string {
  return (s ?? '').trim().toUpperCase().replace(/[\s‐-―-]/g, '');
}

function priorityOf(kratica: string): number {
  return UL_META[normKratica(kratica)]?.priority ?? 100;
}

// Kanonična UL_specifika kratica za poljubno ime stranke (kratica ALI polni naziv), sicer null.
// Ujema OBOJE: kratico in polni naziv (case-insensitive, brez presledkov/pomišljajev).
export function resolveUlKratica(stranka: string): string | null {
  return aliasIndex.get(normKratica(stranka)) ?? null;
}

// Polni naziv fakultete za prikaz (iz ujemanja); če ni ujemanja, vrne vhodno ime nespremenjeno.
export function ulNazivZaPrikaz(stranka: string): string {
  const k = resolveUlKratica(stranka);
  if (!k) return stranka;
  return UL_META[normKratica(k)]?.naziv ?? k;
}

// Rank za razvrščanje (po imenu stranke ali kratici): Rektorat=0, UL-BM=1, UL-STAT=2, UL-VO=3, ostalo=100.
export function ulOrderRank(stranka: string): number {
  const k = resolveUlKratica(stranka);
  return k ? priorityOf(k) : 100;
}

function rebuildAliasIndex(): void {
  aliasIndex.clear();
  for (const f of ulFakultete) {
    const add = (s: string) => { const n = normKratica(s); if (n) aliasIndex.set(n, f.kratica); };
    add(f.kratica);
    add(f.naziv);
    UL_META[normKratica(f.kratica)]?.aliases?.forEach(add);
  }
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
      const naziv = UL_META[normKratica(kratica)]?.naziv ?? kratica;
      ulFakultete.push({ kratica, naziv, znesek });
    }
    // Vrstni red: Rektorat, UL Biomedicina, UL Statistika, UL Varstvo okolja, nato po nazivu (abecedno).
    ulFakultete.sort((a, b) => {
      const pa = priorityOf(a.kratica), pb = priorityOf(b.kratica);
      if (pa !== pb) return pa - pb;
      return a.naziv.localeCompare(b.naziv, 'sl');
    });
    rebuildAliasIndex();
  } catch (e) {
    console.warn('UL specifika ni bila naložena:', e);
  }
}

export function getUlFakultete(): UlFakulteta[] {
  return [...ulFakultete];
}

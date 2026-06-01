# TALPAS – Aplikacija za obračun vzdrževalnih del (v2)

## 1. Povzetek projekta

Spletna aplikacija za podjetje TALPAS d.o.o. (Izola), ki omogoča:
1. **Uvoz** Excel datoteke z mesečnim seznamom opravljenih del (vse stranke skupaj)
2. **Izbiro stranke** za obračun iz registra strank
3. **Pregled in kategorizacijo** vsake postavke (Dt / Di / Dp / V)
4. **Prilagajanje** števila ur in opisov del
5. **Avtomatsko upoštevanje pogodbenih pravil** (vključene ure, pragovi, grupiranje fakultet)
6. **Izvoz** Word dokumenta (.docx) – račun s prilogo

### Pogodbena pravila strank (anomalije)

App podpira 4 tipe obračuna:

| Tip | Primer | Logika |
|-----|--------|--------|
| **Standard** | Hotel Delfin | Vse Dt/Di/Dp ure se obračunajo, V se ne |
| **Vključene ure** | Boxline | Prvih N ur/mesec je vključenih (brezplačnih). Samo ure NAD N se obračunajo. Odštevanje kronološko (najzgodnejše ure se odštejejo prve). |
| **Prag v obdobju** | Hit Alpinea, Terme Čatež | Obračunajo se samo ure ki v zadnjih X mesecih PRESEŽEJO količino Y. App hrani zgodovino ur za zadnje 3 mesece. |
| **Krovna pogodba** | Univerza na Primorskem, Univerza v Ljubljani | Več sub-entitet (fakultet) pod enim računom. Račun = en dokument s skupnim seštevkom. Priloga = ločena specifikacija po fakultetah. |

---

## 2. Tehnični stack

| Komponenta | Tehnologija |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Excel parsing | SheetJS (xlsx) – client-side |
| Word generacija | `docx` npm paket (client-side) |
| Persistenca | localStorage (zgodovina ur za threshold stranke) |
| Deployment | GitHub Pages → SharePoint Embed Web Part (iframe) |
| Repo | GitHub |

---

## 3. Struktura projekta

```
talpas-invoice/
├── public/
│   └── assets/
│       ├── talpas-logo.jpg
│       ├── talpas-stamp.png
│       └── talpas-footer.jpg
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx            # Drag & drop Excel
│   │   ├── ClientSelector.tsx        # Izbira stranke za obračun
│   │   ├── WorkTable.tsx             # Tabela del s kategorizacijo
│   │   ├── WorkRow.tsx               # Posamezna vrstica
│   │   ├── InvoiceSummary.tsx        # Povzetek (seštevek, znesek vzdrževanja)
│   │   ├── InvoiceMetadata.tsx       # Št. računa, datum, valuta
│   │   ├── BillingRulesInfo.tsx      # Prikaz aktivnih pravil za stranko
│   │   └── ExportButton.tsx          # Izvoz v Word
│   ├── lib/
│   │   ├── excelParser.ts            # Parsiranje Excel datoteke
│   │   ├── docxGenerator.ts          # Generiranje Word dokumenta
│   │   ├── billingEngine.ts          # Pogodbena pravila (threshold, included, umbrella)
│   │   ├── calculations.ts           # Izračuni (DDV, seštevki)
│   │   ├── historyStore.ts           # localStorage za zgodovino ur (threshold stranke)
│   │   └── types.ts                  # TypeScript tipi
│   ├── config/
│   │   └── constants.ts              # Podatki izdajatelja, privzete cene
│   ├── data/
│   │   └── clients.ts                # Register strank (iz Excel-a, hardcoded za start)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 4. Podatkovni model

### 4.1 Vhodna Excel datoteka – DELA (mesečni seznam)

| Stolpec | Tip | Opis |
|---|---|---|
| STRANKA | string | Ime stranke ali sub-entitete (npr. "UP FHŠ", "AB PRODUKT d.o.o.") |
| Delo | string | Kratek opis dela |
| Datum | date | Datum opravljenega dela |
| Kontakt | string | Kontaktna oseba |
| Vrsta dela | string | D/V iz Excela – app nadgradi v Dt/Di/Dp/V |
| Število ur | number | Število ur (decimalno) |
| Opis | string | Podroben opis dela – EDITABILEN v app! |
| Opravil | string | Ime tehnika/inženirja |
| Skupina | string | **OPCIJSKO** – za univerze: "Univerza na Primorskem" ali "Univerza v Ljubljani". Prazno za navadne stranke. |

### 4.2 Vhodna Excel datoteka – REGISTER STRANK (ločen sheet ali datoteka)

| Stolpec | Tip | Opis |
|---|---|---|
| Ime stranke | string | Ime za iskanje v stolpcu STRANKA (matching) |
| Ime na računu | string | Polno ime za račun |
| Naslov | string | Ulica |
| Pošta | string | Poštna številka |
| Kraj | string | Kraj |
| ID za DDV | string | SI + 8 cifer |
| Cena Dt | number | EUR/ura brez DDV (privzeto 48) |
| Cena Di | number | EUR/ura brez DDV (privzeto 70) |
| Znesek vzdrževanja | number | Privzeti mesečni znesek (uporabnik lahko spremeni) |
| Opis vzdrževanja | string | Tekst za na račun |
| Tip obračuna | string | "standard" / "included_hours" / "threshold" / "umbrella" |
| Vključene ure | number | Za tip "included_hours" – koliko ur je vključenih (npr. 10) |
| Prag ur | number | Za tip "threshold" – prag ur (npr. 5 ali 6) |
| Prag mesecev | number | Za tip "threshold" – koliko mesecev nazaj (npr. 2 ali 3) |
| Krovna stranka | string | Za tip "umbrella" – ime krovne organizacije |

### 4.3 TypeScript tipi

```typescript
// === VRSTA DELA ===
type WorkType = 'Dt' | 'Di' | 'Dp' | 'V' | null;
// Dt = delo tehnika (48 EUR/ura)
// Di = delo inženirja (70 EUR/ura)
// Dp = delo po ponudbi (uporabnik vpiše znesek ročno)
// V  = vzdrževanje (ne obračuna se dodatno)

// === POGODBENA PRAVILA ===
type BillingType = 'standard' | 'included_hours' | 'threshold' | 'umbrella';

interface ClientConfig {
  id: string;
  imeZaIskanje: string;       // za matching s stolpcem STRANKA v Excelu
  imeNaRacunu: string;        // polno ime za na račun
  naslov: string;
  posta: string;
  kraj: string;
  idDDV: string;
  cenaDt: number;             // privzeto 48
  cenaDi: number;             // privzeto 70
  znesekVzdrzevanja: number;  // privzeti mesečni znesek
  opisVzdrzevanja: string;    // tekst za na račun
  
  // Pogodbena pravila
  billingType: BillingType;
  includedHours?: number;     // za 'included_hours' (npr. 10)
  thresholdHours?: number;    // za 'threshold' (npr. 5 ali 6)
  thresholdMonths?: number;   // za 'threshold' (npr. 2 ali 3)
  krovnaStranka?: string;     // za 'umbrella' (npr. "Univerza na Primorskem")
}

// === VNOS DELA ===
interface WorkEntry {
  id: string;
  stranka: string;            // iz Excel
  skupina: string;            // za umbrella: ime krovne organizacije
  delo: string;               // kratek opis
  datum: Date;
  kontakt: string;
  vrstaDela: WorkType;        // uporabnik izbere
  steviloUr: number;          // prilagodljivo
  steviloUrOriginal: number;  // originalno iz Excela
  opis: string;               // podroben opis – EDITABILEN
  opravil: string;
  
  // Izračunani atributi (po billing engine)
  jeVkljucena: boolean;       // true = ta ura je vključena v pavšal (included_hours)
  jePodPragom: boolean;       // true = ta ura je pod pragom (threshold)
  dpZnesek?: number;          // za Dp: ročno vpisan znesek
}

// === METADATA RAČUNA ===
interface InvoiceMetadata {
  stevilkaRacuna: string;
  datumRacuna: string;
  rokPlacila: string;
  obdobjeOd: string;
  obdobjeDo: string;
  znesekVzdrzevanja: number;   // uporabnik vpiše/prilagodi
  opisVzdrzevanja: string;     // uporabnik lahko prilagodi
}

// === ZGODOVINA UR (za threshold stranke) ===
interface MonthlyHours {
  clientId: string;
  mesec: string;               // "2026-04"
  skupajUr: number;            // seštevek vseh ur za ta mesec
}
```

---

## 5. Konfiguracija (constants.ts)

```typescript
// PRIVZETE CENE (overridable per stranka)
export const DEFAULT_CENA_DT = 48.00;
export const DEFAULT_CENA_DI = 70.00;
export const DDV_STOPNJA = 0.22;

// PODATKI IZDAJATELJA
export const IZDAJATELJ = {
  ime: "TALPAS d.o.o.",
  naslov: "Ob progi 16, SI-6310 Izola",
  drzava: "Slovenija",
  idDDV: "SI58077324",
  iban: "SI56 6100 0001 2624 509",
  swift: "HDELSI22",
  maticnaSt: "1886703",
  srg: "1/0770/00 pri Okrožnem sodišču v Kopru",
  osnovniKapital: "15.000 EUR",
  email: "info@talpas.si",
  web: "www.talpas.si",
  izdala: "Mojca Zornada",
};
```

---

## 6. Billing Engine (billingEngine.ts) – KLJUČNA LOGIKA

### 6.1 Standard

Preprosto: vse Dt/Di/Dp ure se obračunajo, V ure se ne.

### 6.2 Included Hours (Boxline)

```
Primer: Boxline ima 10 ur vključenih v mesec.
Mesečni vnosi (kronološko):
  01.04 – 2 ure (V)   → vključeno (kumulativa: 2)
  05.04 – 1 ura (V)   → vključeno (kumulativa: 3)
  10.04 – 3 ure (V)   → vključeno (kumulativa: 6)
  15.04 – 2 ure (V)   → vključeno (kumulativa: 8)
  20.04 – 3 ure (Dt)  → 2 uri vključeni, 1 ura ZA OBRAČUN (kumulativa: 11)
  25.04 – 2 ure (Di)  → obe ZA OBRAČUN (kumulativa: 13)

Rezultat: obračuna se 1 ura Dt + 2 uri Di = 48 + 140 = 188 EUR
```

**Algoritem:**
1. Sortiraj vnose po datumu (naraščajoče)
2. Kumulativno seštevaj ure
3. Za vsak vnos: če kumulativa ≤ vključene ure → `jeVkljucena = true`
4. Če kumulativa preseže vključene ure na sredini vnosa → razdelitev:
   - Del ur je vključen (do limita)
   - Ostanek ur se obračuna po kategoriji (Dt/Di/Dp)
   - V tem primeru se vnos razdeli na dva (vključen + obračunan)

### 6.3 Threshold v obdobju (Hit Alpinea, Terme Čatež)

```
Primer: Hit Alpinea – prag 5 ur v zadnjih 3 mesecih

Zgodovina (iz localStorage):
  Februar 2026: 3 ure
  Marec 2026: 4 ure
  
Trenutni mesec (April 2026): 6 ur

Skupaj zadnji 3 meseci: 3 + 4 + 6 = 13 ur
Prag: 5 ur
Za obračun: 13 - 5 = 8 ur

POZOR: od teh 8 ur se obračunajo samo tiste ki so Dt/Di/Dp!
Vrstice označene V so vzdrževanje in se NE obračunajo.
```

**Algoritem:**
1. Preberi zgodovino ur iz localStorage za zadnjih X mesecev
2. Seštej skupne ure (vsi meseci + trenutni)
3. Izračunaj presežek = skupaj - prag
4. Če presežek ≤ 0 → nič za obračun
5. Če presežek > 0 → kronološko označi zadnjih `presežek` ur (najnovejše ure se obračunajo)
6. Samo ure ki so Dt/Di/Dp se dejansko obračunajo

**Ob izvozu:** shrani količino ur tekočega meseca v localStorage.

### 6.4 Umbrella / Krovna pogodba (Univerze)

```
Primer: Univerza na Primorskem

V Excelu so vnosi:
  STRANKA: "UP FHŠ"     | Skupina: "Univerza na Primorskem"
  STRANKA: "UP FAMNIT"  | Skupina: "Univerza na Primorskem"
  STRANKA: "UP PEF"     | Skupina: "Univerza na Primorskem"
  STRANKA: "UP Rektorat" | Skupina: "Univerza na Primorskem"

Račun:
  Stran 1: ENO skupni račun za "Univerza na Primorskem"
           Seštevek VSEH fakultet skupaj (Dt ure, Di ure, vzdrževanje)
  
  Priloga:
           Naslov: "UP FHŠ"
           [tabela del za UP FHŠ]
           
           Naslov: "UP FAMNIT"
           [tabela del za UP FAMNIT]
           
           ... itd.
```

**Algoritem:**
1. Iz stolpca "Skupina" prepoznaj krovne stranke
2. Grupiraj vnose po sub-entiteti (stolpec STRANKA)
3. Na računu: seštej vse skupaj
4. V prilogi: ločene sekcije za vsako sub-entiteto

---

## 7. Uporabniški vmesnik (UI)

### 7.1 Workflow

```
[1. UVOZ EXCELA]
      ↓
[2. IZBERI STRANKO]  →  prikaz pogodbenih pravil
      ↓
[3. TABELA DEL]  →  kategorizacija (Dt/Di/Dp/V), ure, opisi
      ↓
[4. POVZETEK + METADATA]  →  znesek vzdrževanja, metadata računa
      ↓
[5. IZVOZ WORD]
```

### 7.2 Korak 1: Uvoz Excel datoteke

- Drag & drop ali gumb "Izberi datoteko"
- Parsira vse vrstice iz Excela

### 7.3 Korak 2: Izbira stranke

Po uvozu app prikaže seznam UNIKATNIH strank iz Excela.
Uporabnik izbere stranko za obračun.

- Če stranka obstaja v registru → naloži pogodbena pravila
- Če stranka NE obstaja → uporabi "standard" pravila, opozorilo
- Za umbrella stranke: prikaže se krovna organizacija, pod njo vse sub-entitete

**Info box** prikaže aktivna pravila:
```
┌──────────────────────────────────────────────────┐
│ ℹ️ Boxline d.o.o.                                │
│ Tip: Vključene ure                               │
│ Prvih 10 ur/mesec je vključenih v pogodbo.       │
│ Obračunajo se samo ure nad 10.                   │
│ Cena Dt: 48,00 EUR | Cena Di: 70,00 EUR         │
└──────────────────────────────────────────────────┘
```

### 7.4 Korak 3: Tabela del

Tabela prikaže SAMO vnose za izbrano stranko.

| # | Delo | Datum | Kontakt | Vrsta | Ure | Opis | Opravil | Status |
|---|------|-------|---------|-------|-----|------|---------|--------|

Za vsako vrstico:

**Vrsta dela** – 4 gumbi (radio):
- `Dt` (zelen) – delo tehnika, 48 EUR/ura
- `Di` (moder) – delo inženirja, 70 EUR/ura
- `Dp` (oranžen) – delo po ponudbi + **input polje za znesek** (EUR)
- `V` (siv) – vzdrževanje, brezplačno

**Ure** – editabilno number polje. Če spremenjeno, originalna vrednost prečrtana.

**Opis** – **EDITABILNO textarea polje!** Prikazano CELOTNO besedilo (brez skrajšanja). Klik na celico odpre textarea za urejanje. V tabeli se prikaže celoten tekst (word-wrap), ne samo prvih 100 znakov.

**Status** (za included_hours in threshold stranke):
- 🟢 "Vključeno" – ura je pod limitom/pragom
- 🔴 "Za obračun" – ura presega limit
- Za navadne stranke: brez stolpca Status

### 7.5 Korak 4: Povzetek in metadata

```
╔══════════════════════════════════════════════════════════════╗
║  POVZETEK – Hotel Delfin                                    ║
║                                                             ║
║  Znesek vzdrževanja (brez DDV): [____580,00____] EUR        ║ ← INPUT
║  Opis vzdrževanja: [________________________________]       ║ ← INPUT
║                                                             ║
║  Delo tehnik:       7,50 ur × 48,00 =    360,00 EUR         ║
║  Delo inženir:      2,00 ur × 70,00 =    140,00 EUR         ║
║  Delo po ponudbi:                         85,00 EUR         ║ ← seštevek Dp
║  ────────────────────────────────────────────────             ║
║  Osnova za DDV:                        1.165,00 EUR         ║
║  DDV 22%:                                256,30 EUR         ║
║  ════════════════════════════════════════════════             ║
║  SKUPAJ ZA PLAČILO:                    1.421,30 EUR         ║
╚══════════════════════════════════════════════════════════════╝
```

Za **Boxline** tip:
```
║  Vključene ure:    10,00 ur (ni obračuna)                   ║
║  Delo tehnik:       2,00 ur × 48,00 =     96,00 EUR         ║ ← samo presežek
║  Delo inženir:      1,00 ur × 70,00 =     70,00 EUR         ║ ← samo presežek
```

Za **threshold** tip:
```
║  Ure v obdobju:    13,00 ur (zadnji 3 meseci)               ║
║  Prag:              5,00 ur                                  ║
║  Presežek:          8,00 ur                                  ║
║  Delo tehnik:       5,00 ur × 48,00 =    240,00 EUR         ║
║  Delo inženir:      3,00 ur × 70,00 =    210,00 EUR         ║
```

**Metadata računa** (polja z rumeno podlago):
- Številka računa
- Datum računa
- Rok plačila (valuta)
- Obdobje od–do

### 7.6 Korak 5: Izvoz

- Preveri da so VSE postavke kategorizirane
- Preveri da imajo VSE Dp postavke vpisan znesek
- Generira .docx in sproži download
- Za threshold stranke: ob izvozu SHRANI količino ur v localStorage

---

## 8. Struktura Word dokumenta (.docx)

### 8.1 Stran 1: Račun

Enaka struktura kot obstoječi vzorec (TALPAS logo, podatki stranke, tabela).

Postavke na računu:

| Opis | Kol. | Enota | Vrednost/enoto | Vrednost brez DDV | St. DDV | DDV | Vrednost z DDV |
|------|------|-------|----------------|---------------------|---------|-----|----------------|
| Vzdrževanje po Pogodbi... | 1 | kos | 580,00 | 580,00 | 22 | 127,60 | 707,60 |
| Delo tehnik | 7,5 | ura | 48,00 | 360,00 | 22 | 79,20 | 439,20 |
| Delo inženir | 2 | ura | 70,00 | 140,00 | 22 | 30,80 | 170,80 |
| Delo po ponudbi | 1 | kos | 85,00 | 85,00 | 22 | 18,70 | 103,70 |

**Dp (delo po ponudbi)**: seštevek vseh Dp zneskov, prikazano kot 1 × kos × skupni znesek.

**Rumena podlaga** na: številka računa, datum računa, rok plačila.

### 8.2 Stran 2+: Priloga

**Za navadne stranke:**

Naslov: "Priloga računa št. {ŠTEVILKA}"

Tabela z vsemi postavkami (sortirano po datumu padajoče):
| Delo | Datum | Kontakt | Vrsta dela | Število ur | Opis | Opravil |

Na koncu: SKUPAJ za obračun – seštevek ur po kategoriji.

**Za umbrella stranke (univerze):**

Naslov: "Priloga računa št. {ŠTEVILKA}"

Za vsako sub-entiteto (fakulteto) ločena sekcija:

```
═══ UP FHŠ ═══
[tabela del za UP FHŠ]
Skupaj UP FHŠ: Dt 3,5 ur | Di 1 ura

═══ UP FAMNIT ═══
[tabela del za UP FAMNIT]
Skupaj UP FAMNIT: Dt 2 uri | Di 0,5 ure

═══ SKUPAJ za obračun ═══
D tehnik:  5,5 ur
D inženir: 1,5 ur
```

### 8.3 Za included_hours stranke (Boxline)

V prilogi se pri vrsticah ki so bile vključene označi:
- Vrsta dela: "V (vklj.)" namesto "Dt" ali "Di"
- Jasno je vidno katere ure so bile vključene in katere obračunane

---

## 9. Zgodovina ur – localStorage (historyStore.ts)

Za threshold stranke (Hit Alpinea, Terme Čatež) app hrani zgodovino ur.

```typescript
interface HoursHistory {
  [clientId: string]: MonthlyHours[];
}

interface MonthlyHours {
  mesec: string;     // "2026-04"
  skupajUr: number;  // seštevek vseh ur za ta mesec
}

// Shrani ob izvozu računa
function saveMonthlyHours(clientId: string, mesec: string, ure: number): void {
  const history = getHistory();
  // Dodaj ali posodobi
  // Ohrani samo zadnje 3 mesece
  localStorage.setItem('talpas_hours_history', JSON.stringify(history));
}

// Preberi za izračun
function getHoursForPeriod(clientId: string, months: number): number {
  // Vrne skupno količino ur za zadnjih X mesecev
}
```

**Struktura v localStorage:**
```json
{
  "talpas_hours_history": {
    "hit-alpinea": [
      { "mesec": "2026-02", "skupajUr": 3.0 },
      { "mesec": "2026-03", "skupajUr": 4.0 }
    ],
    "terme-catez": [
      { "mesec": "2026-03", "skupajUr": 2.5 }
    ]
  }
}
```

**Pomembno:**
- Ob izvozu računa se avtomatsko shrani količina ur tekočega meseca
- Uporabnik lahko ročno pregleda/popravi zgodovino (settings sekcija)
- Hrani se samo zadnje 3 mesece (najdaljši prag)

---

## 10. Izračuni (calculations.ts)

```typescript
function izracunaj(
  entries: WorkEntry[],
  client: ClientConfig,
  znesekVzdrzevanja: number
) {
  // Filtriraj samo obračunljive vnose
  const obracunljiviDt = entries.filter(e => 
    e.vrstaDela === 'Dt' && !e.jeVkljucena && !e.jePodPragom
  );
  const obracunljiviDi = entries.filter(e => 
    e.vrstaDela === 'Di' && !e.jeVkljucena && !e.jePodPragom
  );
  const obracunljiviDp = entries.filter(e => 
    e.vrstaDela === 'Dp' && !e.jeVkljucena && !e.jePodPragom
  );
  
  const urDt = sum(obracunljiviDt.map(e => e.steviloUr));
  const urDi = sum(obracunljiviDi.map(e => e.steviloUr));
  
  const vrednostDt = urDt * client.cenaDt;
  const vrednostDi = urDi * client.cenaDi;
  const vrednostDp = sum(obracunljiviDp.map(e => e.dpZnesek ?? 0));
  
  const skupajBrezDDV = znesekVzdrzevanja + vrednostDt + vrednostDi + vrednostDp;
  const ddv = skupajBrezDDV * DDV_STOPNJA;
  const skupajZDDV = skupajBrezDDV + ddv;
  
  return {
    urDt, urDi,
    vrednostDt, vrednostDi, vrednostDp, znesekVzdrzevanja,
    skupajBrezDDV, ddv, skupajZDDV,
    ddvVzdrzevanje: znesekVzdrzevanja * DDV_STOPNJA,
    ddvDt: vrednostDt * DDV_STOPNJA,
    ddvDi: vrednostDi * DDV_STOPNJA,
    ddvDp: vrednostDp * DDV_STOPNJA,
  };
}
```

---

## 11. Parsiranje Excel datoteke (excelParser.ts)

```typescript
// Prepoznava stolpcev po ključnih besedah v header-ju
const COLUMN_MAP = {
  stranka: ['stranka', 'client'],
  delo: ['delo', 'work'],
  datum: ['datum', 'date'],
  kontakt: ['kontakt', 'contact'],
  vrstaDela: ['vrsta', 'type'],
  steviloUr: ['število', 'ur', 'hours'],
  opis: ['opis', 'description'],
  opravil: ['opravil', 'done by'],
  skupina: ['skupina', 'group', 'univerza'],  // NOVO
};

// Parsira "Vrsta dela" iz Excela
function parseVrstaDela(value: string): WorkType {
  const v = value?.trim().toLowerCase();
  if (v === 'dt' || v === 'd tehnik') return 'Dt';
  if (v === 'di' || v === 'd inženir') return 'Di';
  if (v === 'dp' || v === 'd po ponudbi' || v === 'po ponudbi') return 'Dp';
  if (v === 'v' || v === 'vzdrževanje') return 'V';
  if (v === 'd') return null; // uporabnik mora izbrati
  return null;
}
```

---

## 12. Robni primeri in validacija

- **Ni Dt/Di/Dp postavk**: na računu samo vzdrževanje
- **Vse postavke so V**: račun vsebuje samo vzdrževalno postavko
- **Znesek vzdrževanja = 0**: vzdrževalna postavka se izpusti iz računa
- **Dp brez vpisanega zneska**: izvoz onemogočen, opozorilo
- **Uporabnik ni kategoriziral vseh vrstic**: izvoz onemogočen
- **Stranka ni v registru**: opozorilo, standard pravila
- **Threshold stranka brez zgodovine**: app vpraša za ure preteklih mesecev
- **Boxline točno 10 ur**: vse vključene, nič za obračun (razen vzdrževanja)
- **Boxline 10,5 ur z zadnjo uro V**: 0,5 ur je nad limitom, a ker je V, se ne obračuna
- **Umbrella brez sub-entitet**: obravnava kot navadno stranko
- **Editiran opis**: v Word gre editirana verzija, ne originalna

---

## 13. Faze razvoja

### Faza 1: Osnova (MVP) – Standard stranke
1. Inicializacija React + Vite + Tailwind projekta
2. Upload in parsiranje Excel datoteke
3. Seznam strank → izbira stranke
4. Tabela del: Dt/Di/Dp/V radio gumbi
5. Editabilne ure (number input)
6. **Editabilen opis (textarea, celotno besedilo vidno)**
7. Dp: input polje za ročni znesek
8. Povzetek izračunov
9. Polja za metadata (št. računa, datum, rok) + znesek vzdrževanja

### Faza 2: Word izvoz
10. Generiranje .docx z npm `docx` paketom
11. Stran 1: račun po šabloni (s Dt, Di, Dp, V postavkami)
12. Stran 2+: priloga s tabelo del
13. Rumena podlaga za ključna polja
14. Vgrajen TALPAS logo, žig, footer

### Faza 3: Pogodbena pravila
15. Register strank (hardcoded ali iz Excel-a)
16. Billing engine: included_hours (Boxline)
17. Billing engine: threshold (Hit Alpinea, Terme Čatež)
18. Billing engine: umbrella (Univerze)
19. localStorage za zgodovino ur
20. Prikaz statusa vključenosti/praga v tabeli

### Faza 4: Poliranje
21. Validacija pred izvozom
22. Persistenca stanja (localStorage) – da se ob refreshu ne izgubijo podatki
23. Settings: pregled/urejanje zgodovine ur
24. Lepši UI, responzivnost
25. SharePoint Embed integracija

### Faza 5: Nadgradnje (prihodnost)
26. Register strank iz Excel datoteke (ne hardcoded)
27. Avtomatsko generiranje številke računa
28. Zgodovina računov
29. PDF izvoz poleg Word-a

---

## 14. Primer Excel vhoda (za testiranje)

### Sheet 1: Dela

| STRANKA | Delo | Datum | Kontakt | Vrsta dela | Število ur | Opis | Opravil | Skupina |
|---|---|---|---|---|---|---|---|---|
| Delfin Hotel | Težave pošta | 30.04.2026 | Tjaša Lazar | Dt | 1,25 | Release blokirane pošte | Marko Brezec | |
| Delfin Hotel | Priklop opreme | 28.04.2026 | Sašo Dominko | Dt | 2 | | Marko Brezec | |
| Delfin Hotel | Ne deluje pošta | 24.04.2026 | Miran | Di | 2 | Preverjanje spam-a | Marko Brezec | |
| Delfin Hotel | Pregled backupov | 23.04.2026 | | V | 0,25 | | Davor Vivoda | |
| Boxline | Nastavitev VPN | 28.04.2026 | Janez | V | 3 | VPN konfiguracija | Marko Brezec | |
| Boxline | Migracija mailov | 25.04.2026 | Ana | V | 5 | | Marko Brezec | |
| Boxline | Strežnik restart | 20.04.2026 | Janez | V | 2 | Restart po updatu | Marko Brezec | |
| Boxline | Nova namestitev | 29.04.2026 | Janez | Dt | 3 | Nova delovna postaja | Marko Brezec | |
| UP FHŠ | Tiskalnik popravilo | 30.04.2026 | Helena | Dt | 1 | Zamenjava tonerja | Klemen Kladnik | Univerza na Primorskem |
| UP FAMNIT | Server backup | 28.04.2026 | Matej | V | 0,5 | | Marko Brezec | Univerza na Primorskem |

---

## 15. Navodila za Claude Code

### Inicializacija projekta
```bash
npm create vite@latest talpas-invoice -- --template react-ts
cd talpas-invoice
npm install
npm install xlsx docx file-saver uuid
npm install -D @types/file-saver @types/uuid tailwindcss @tailwindcss/vite
```

### Ključne odvisnosti
| Paket | Namen |
|---|---|
| `xlsx` (SheetJS) | Parsiranje Excel datotek |
| `docx` | Generiranje Word dokumentov |
| `file-saver` | Prenos datotek v brskalniku |
| `uuid` | Generiranje unikatnih ID-jev |
| `tailwindcss` | Styling |

### Zagon
```bash
npm run dev
```

### Slike za Word dokument
Kopiraj v `public/assets/`:
- `talpas-logo.jpg` – header logo
- `talpas-stamp.png` – žig s podpisom
- `talpas-footer.jpg` – footer pas

---

## 16. Potrjeno z naročnikom

1. **Cene**: Dt=48, Di=70 EUR/ura brez DDV – privzeto, nastavljivo per stranka
2. **Dp**: delo po ponudbi – uporabnik vpiše znesek ročno za vsako postavko
3. **Vzdrževanje**: variabilno – uporabnik vpiše znesek v formi
4. **Izdajateljica**: vedno "Mojca Zornada"
5. **Opis del**: editabilen v app, celotno besedilo vidno
6. **Boxline**: 10 ur/mesec vključenih, presežek se obračuna kronološko
7. **Hit Alpinea**: prag 5 ur v zadnjih 3 mesecih
8. **Terme Čatež**: prag 6 ur v zadnjih 2 mesecih
9. **Univerze**: krovna pogodba, grupiranje po fakultetah, en račun, ločene priloge
10. **Logo, žig, footer**: ekstrahirani iz vzorca ✓

### Še za razjasniti (low priority):
11. **Sklic na računu**: ali se generira iz številke računa (SI 00 + zadnjih 7 cifer)?
12. **Koda namena**: ali je vedno "SCVE"?

---

## 17. SharePoint integracija

Priporočena opcija: **Embed Web Part (iframe)**.

1. Deploy app na GitHub Pages: `npm run build` → push v `gh-pages` branch
2. V SharePoint Admin centru dodaj `talpas.github.io` na allowlist (HTML Field Security)
3. Na SharePoint site dodaj novo stran
4. Vstavi Embed Web Part z URL-jem: `https://talpas.github.io/talpas-invoice/`
5. Objavi stran

Posodobitve: push na GitHub → avtomatsko vidno v SharePointu.

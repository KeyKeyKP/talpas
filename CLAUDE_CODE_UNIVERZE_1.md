# NAVODILA ZA CLAUDE CODE – Univerze (UL/UP)

Zaženi z: `claude --yes`

Kopiraj spodnje navodilo v Claude Code:

---

Preberi REFERENCE_TALPAS.md za kontekst. Vse obstoječe funkcionalnosti morajo ostati NEDOTAKNJENE. Dodaj novo funkcionalnost za univerze.

## Kaj dodati

### 1. Drugo polje za uvoz Excel datoteke

Na začetni strani (uvoz) dodaj DRUGO upload polje pod obstoječim:
- Obstoječe polje: "Uvozi Excel" (ostane kot je)
- Novo polje: "Uvozi Excel – Univerza (UP/UL)"

Novo polje deluje enako kot obstoječe (drag & drop, parsira xlsx), ampak:
- Podatki gredo v ločen workflow za univerze
- Excel ima enake stolpce kot obstoječi (STRANKA, Delo, Datum, Kontakt, Vrsta dela, Število ur, Opis, Opravil)
- Stolpec STRANKA vsebuje imena FAKULTET (npr. "Fakulteta za šport", "Fakulteta za socialno delo", "FRI", "PEF")
- Uporabnik izbere ali je to UP (Univerza na Primorskem) ali UL (Univerza v Ljubljani) — radio button ob uploadu

### 2. Kategorije del za univerze

Pri univerzah obstajajo 3 kategorije (ne 4 kot pri standardnih strankah):
- **D** = dodatno delo (obračuna se po uri, enako kot Dt pri standardnih strankah, cena nastavljiva)
- **V** = vzdrževanje (ne obračuna se dodatno)
- **Dp** = dodatno po ponudbi (uporabnik vpiše znesek ročno za vsako postavko)

V tabeli del za univerze prikaži 3 gumbe: D, V, Dp (namesto Dt, Di, Dp, V)

### 3. Tabela del za univerze

Enaka kot obstoječa tabela, samo:
- 3 kategorije: D, V, Dp
- Dp: uporabnik vpiše znesek za vsako postavko
- Podatki so grupirani po FAKULTETI (stolpec STRANKA iz Excela)
- Vsaka fakulteta ima svoj razdelek v tabeli (naslov fakultete, pod njim vrstice)

### 4. Word račun za univerze

Uporabi ISTI template (template_racun.docx). Razlika je v postavkah na računu.

Stran 1 (račun) – postavke:

```
Opis                                    | Kol | Enota | Vrednost/enoto | Vrednost brez DDV | ...
Vzdrževanje po pogodbi...              | 1   | kos   | {znesek}       | {znesek}          | ...
Dodatno delo                           | {ur}| ura   | {cena}         | {ur × cena}       | ...
Dodatno delo Fakulteta za šport       | 1   | kos   | 300,00         | 300,00            | ...
Dodatno delo Fakulteta za soc. delo   | 1   | kos   | 400,00         | 400,00            | ...
```

Pravila:
- "Vzdrževanje" = znesek ki ga uporabnik vpiše (enako kot doslej)
- "Dodatno delo" = seštevek VSEH ur ki so označene D, pomnoženo s ceno na uro
- "Dodatno delo {ime fakultete}" = za vsako fakulteto ki ima Dp postavke, seštevek VSEH Dp zneskov te fakultete v ENO vrstico
- Če ima fakulteta 3× Dp v enem mesecu (npr. 100 + 200 + 300), se na računu prikaže ENA vrstica: "Dodatno delo Fakulteta X" = 600 EUR
- Stopnja DDV, Skupaj vrstice na koncu kot doslej

Stran 2+ (priloga) – za vsako fakulteto ločena sekcija:

```
═══ Fakulteta za šport ═══
[tabela del za to fakulteto – vse vrstice, sortirane po datumu padajoče]
Skupaj Fakulteta za šport: D {ur} ur

═══ Fakulteta za socialno delo ═══
[tabela del za to fakulteto]
Skupaj Fakulteta za socialno delo: D {ur} ur

═══ SKUPAJ za obračun ═══
D (dodatno delo): {skupaj ur}
Dodatno po ponudbi: {skupaj znesek vseh Dp}
```

### 5. Stranka na računu

- Če je UP: ime stranke = "Univerza na Primorskem" (ali kar je v registru strank)
- Če je UL: ime stranke = "Univerza v Ljubljani" (ali kar je v registru strank)
- Naslov, DDV in ostali podatki iz registra strank

### 6. Česa NE spreminjaj

- Obstoječ upload za standardne stranke – NEDOTAKNJEN
- Obstoječa tabela del za standardne stranke – NEDOTAKNJENA
- Obstoječ Word izvoz za standardne stranke – NEDOTAKNJEN
- Template datoteka (template_racun.docx) – NE SPREMINJAJ
- UI stil (seznam strank, auto-resize opis, obdobje) – ostane enak

## Implementacija

1. Dodaj novo komponento `UniversityUpload.tsx` za drugi upload
2. Dodaj novo komponento `UniversityWorkTable.tsx` za tabelo del univerze
3. Razširi `docxGenerator.ts` z novo funkcijo `generateUniversityInvoice()` ki uporabi isti template
4. V `calculations.ts` dodaj `izracunajUniverza()` ki sešteje D ure in grupira Dp po fakultetah
5. V `App.tsx` dodaj routing: če uporabnik naloži standardni Excel → obstoječ flow, če naloži univerzitetni Excel → nov flow

## Po končanih spremembah

Poženi `npm run build` in popravi morebitne TypeScript napake.
Poženi `npm run deploy` za deploy na GitHub Pages.
Commitaj z: `git add . && git commit -m "feat: university invoice (UP/UL)" && git push origin main`
